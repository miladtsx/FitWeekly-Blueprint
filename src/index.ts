import type { ExecutionContext } from "@cloudflare/workers-types";
import type { Env } from "../worker-configuration";
import { planInputSchema } from "./schemas/input";
import * as PROMPT from "./prompt";
import * as OUTPUT from "./schemas/output";
import * as UTILS from "./utils";
import { isChatCompletion } from "./utils/validation";
import {
  extractModelPayload,
  normalizePlansPayload,
} from "./utils/normalization";
import { runWithTimeout } from "./utils/async";
import { generateGuidanceWithRetry } from "./utils/guidance";
import {
  createLoggerFromEnv,
  withRequestId,
  generateRequestId,
} from "./utils/logger";
import {
  createMetricsFromEnv,
  createMetricsTracker,
} from "./utils/metrics";

// Bail out before Cloudflare's ~60s request timeout to avoid client socket hang ups.
const INFERENCE_TIMEOUT_MS = 55_000;

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx?: ExecutionContext,
  ): Promise<Response> {
    void _ctx;

    // Initialize observability
    const requestId = generateRequestId();
    const baseLogger = createLoggerFromEnv(
      env as unknown as Record<string, string | undefined>,
    );
    const log = withRequestId(requestId, baseLogger);
    const baseMetrics = createMetricsFromEnv(
      env as unknown as Record<string, unknown>,
      env.ANALYTICS_ENGINE,
    );
    const tracker = createMetricsTracker(baseMetrics, env as unknown as Record<string, unknown>);

    const url = new URL(request.url);

    log.info("Request received", {
      method: request.method,
      url: url.pathname,
    });

    // Track request method
    tracker.trackRequest(request.method);

    if (request.method === "OPTIONS") {
      log.info("OPTIONS request handled");
      return new Response("OK", { status: 200, headers: UTILS.corsHeaders });
    }
    if (request.method !== "POST") {
      log.warn("Invalid HTTP method", { method: request.method });
      tracker.trackRequestStatus("error", "invalid_method");
      return new Response("Method Not Allowed", {
        status: 405,
        headers: UTILS.corsHeaders,
      });
    }

    let body: unknown;
    let rawBody: string | undefined;
    try {
      rawBody = await request.text();
      body = JSON.parse(rawBody);
    } catch {
      log.warn("Invalid JSON in request body", {
        raw_body_preview: rawBody?.slice(0, 500) ?? "(empty)",
      });
      tracker.trackRequestStatus("rejected", "invalid_json");
      return UTILS.json(
        {
          status: "rejected",
          reason:
            "Request body is not valid JSON. Please send a valid JSON payload.",
        },
        400,
      );
    }

    const parsed = planInputSchema.safeParse(body);
    if (!parsed.success) {
      log.warn("Input validation failed", {
        error: UTILS.formatParseIssue(parsed.error),
      });
      tracker.trackRequestStatus("rejected", "validation_failed");
      return UTILS.json(
        { status: "rejected", reason: UTILS.formatParseIssue(parsed.error) },
        400,
      );
    }

    const input = parsed.data;
    const language = input.language || "fa";

    // Track user metrics
    tracker.trackLanguage(language);
    tracker.trackGoal(input.goal);
    tracker.trackActivityLevel(input.activity);
    tracker.trackDemographics(input.sex, input.age);

    if (UTILS.hasMedicalCondition(input.medicalCondition)) {
      log.info("Request rejected due to medical condition");
      tracker.trackRequestStatus("rejected", "medical_condition");
      return UTILS.json(
        {
          status: "rejected",
          reason:
            language === "fa"
              ? "لطفا با یک انسان متخصص مشورت کنید."
              : "Please consult with a qualified healthcare professional.",
        },
        200,
      );
    }

    const payload = UTILS.buildUserPayload(input);

    // Keep conservative generation caps to avoid exceeding context window.
    const GUIDANCE_TOKENS = 1000;
    const PLAN_TOKENS = 10000;

    try {
      const guidanceStartTime = Date.now();

      // 1) Get critical guidance (concise constraints) with retry on bad JSON.
      const parsedGuidance = await generateGuidanceWithRetry(
        payload,
        env,
        GUIDANCE_TOKENS,
        INFERENCE_TIMEOUT_MS,
        {
          guidancePrompt: PROMPT.getGuidancePrompt(language),
          guidanceJsonSchema: OUTPUT.guidanceJsonSchema,
          guidanceSchema: OUTPUT.guidanceSchema,
          formatParseIssue: UTILS.formatParseIssue,
          logger: log,
        },
      );

      const guidanceDuration = Date.now() - guidanceStartTime;

      if (parsedGuidance.status === "error") {
        log.error("Guidance generation failed", {
          reason: parsedGuidance.reason,
          duration_ms: guidanceDuration,
        });
        tracker.trackRequestStatus("error", "guidance_failed");
        tracker.trackDuration("guidance", guidanceDuration);
        return UTILS.json(
          {
            status: "error",
            reason: parsedGuidance.reason,
          },
          502,
        );
      }

      log.info("Guidance generated", {
        duration_ms: guidanceDuration,
        has_guidance: !!parsedGuidance.guidance,
      });

      tracker.trackDuration("guidance", guidanceDuration);

      // 2) Build the full weekly plan, conditioning on guidance if available.
      const planInputPayload = {
        ...payload,
        guidance: parsedGuidance.guidance ?? undefined,
      };

      const planStartTime = Date.now();

      const planResult = await runWithTimeout(
        () =>
          env.AI.run("@cf/qwen/qwen3-30b-a3b-fp8", {
            messages: [
              { role: "system", content: PROMPT.getPlanPrompt(language) },
              { role: "user", content: JSON.stringify(planInputPayload) },
            ],
            response_format: {
              type: "json_schema",
              json_schema: OUTPUT.plansJsonSchema,
            },
            temperature: 0,
            max_tokens: PLAN_TOKENS,
          }),
        INFERENCE_TIMEOUT_MS,
      );

      const planDuration = Date.now() - planStartTime;

      // Track token usage
      if (isChatCompletion(planResult) && planResult.usage) {
        const usage = planResult.usage as { prompt_tokens?: number; completion_tokens?: number };
        tracker.trackTokens(
          "plan",
          usage.prompt_tokens ?? 0,
          usage.completion_tokens ?? 0,
        );
      }

      // Guard: if the model stopped because of token limit, surface a clearer error.
      if (
        isChatCompletion(planResult) &&
        planResult.choices?.[0]?.finish_reason === "length"
      ) {
        log.error("Plan generation truncated by token limit", {
          duration_ms: planDuration,
          finish_reason: planResult.choices?.[0]?.finish_reason,
          completion_tokens: planResult.usage?.completion_tokens,
          total_tokens: planResult.usage?.total_tokens,
          max_tokens: PLAN_TOKENS,
        });
        tracker.trackRequestStatus("error", "token_limit");
        tracker.trackDuration("plan", planDuration);
        return UTILS.json(
          {
            status: "error",
            reason:
              "Model response was truncated (token limit hit). Please retry.",
          },
          502,
        );
      }

      const planPayload = extractModelPayload(planResult);
      const normalizedPlanPayload = normalizePlansPayload(planPayload);
      const parsedPlans = OUTPUT.plansSchema.safeParse(normalizedPlanPayload);

      if (!parsedPlans.success) {
        log.error("Plan validation failed", {
          duration_ms: planDuration,
          issues: parsedPlans.error.issues.length,
          formatted: UTILS.formatParseIssue(parsedPlans.error),
        });
        tracker.trackRequestStatus("error", "plan_validation_failed");
        tracker.trackDuration("plan", planDuration);
        const fallback: OUTPUT.OutputModel = {
          status: "rejected",
          reason: `Plan generation failed: ${UTILS.formatParseIssue(parsedPlans.error)}`,
        };
        return UTILS.json(fallback, 200);
      }

      const finalOutput: OUTPUT.OutputModel = {
        status: "success",
        plans: parsedPlans.data,
        guidance: parsedGuidance.guidance,
      };

      const parsedFinal = OUTPUT.outputModelSchema.safeParse(finalOutput);
      if (!parsedFinal.success) {
        log.error("Final output validation failed", {
          issues: parsedFinal.error.issues.length,
        });
        tracker.trackRequestStatus("error", "output_validation_failed");
        const fallback: OUTPUT.OutputModel = {
          status: "rejected",
          reason: `Final output missing required fields: ${UTILS.formatParseIssue(parsedFinal.error)}`,
        };
        return UTILS.json(fallback, 200);
      }

      const totalDuration =
        Date.now() - guidanceStartTime - planStartTime + planDuration;

      log.info("Request completed successfully", {
        duration_ms: totalDuration,
        guidance_duration_ms: guidanceDuration,
        plan_duration_ms: planDuration,
      });

      // Track success metrics
      tracker.trackRequestStatus("success");
      tracker.trackDuration("total", totalDuration);
      tracker.trackDuration("plan", planDuration);

      return UTILS.json(parsedFinal.data as OUTPUT.OutputModel, 200);
    } catch (error) {
      if (error instanceof Error && error.message === "timeout") {
        log.error("Model request timed out");
        tracker.trackRequestStatus("error", "timeout");
        return UTILS.json(
          {
            status: "error",
            reason: "Model request timed out. Please try again.",
          },
          504,
        );
      }

      log.error("Model request failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      tracker.trackRequestStatus("error", "unknown");
      return UTILS.json(
        {
          status: "error",
          reason: "Model request failed. Please try again later.",
        },
        502,
      );
    }
  },
};
