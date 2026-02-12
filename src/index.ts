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

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx?: ExecutionContext,
  ): Promise<Response> {
    void _ctx;

    // Bail out before Cloudflare's ~60s request timeout to avoid client socket hang ups.
    const INFERENCE_TIMEOUT_MS = 55_000;

    if (request.method === "OPTIONS") {
      return new Response("OK", { status: 200, headers: UTILS.corsHeaders });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: UTILS.corsHeaders,
      });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
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
      return UTILS.json(
        { status: "rejected", reason: UTILS.formatParseIssue(parsed.error) },
        400,
      );
    }

    const input = parsed.data;

    if (UTILS.hasMedicalCondition(input.medicalCondition)) {
      return UTILS.json(
        {
          status: "rejected",
          reason: "لطفا با یک انسان متخصص مشورت کنید.",
        },
        200,
      );
    }

    const payload = UTILS.buildUserPayload(input);

    // Keep conservative generation caps to avoid exceeding context window.
    const GUIDANCE_TOKENS = 1000;
    const PLAN_TOKENS = 10000;

    try {
      // 1) Get critical guidance (concise constraints) with retry on bad JSON.
      const parsedGuidance = await generateGuidanceWithRetry(
        payload,
        env,
        GUIDANCE_TOKENS,
        INFERENCE_TIMEOUT_MS,
        {
          guidancePrompt: PROMPT.GUIDANCE_PROMPT,
          guidanceJsonSchema: OUTPUT.guidanceJsonSchema,
          guidanceSchema: OUTPUT.guidanceSchema,
          formatParseIssue: UTILS.formatParseIssue,
        },
      );

      if (parsedGuidance.status === "error") {
        return UTILS.json(
          {
            status: "error",
            reason: parsedGuidance.reason,
          },
          502,
        );
      }

      // 2) Build the full weekly plan, conditioning on guidance if available.
      const planInputPayload = {
        ...payload,
        guidance: parsedGuidance.guidance ?? undefined,
      };

      const planResult = await runWithTimeout(
        () =>
          env.AI.run("@cf/qwen/qwen3-30b-a3b-fp8", {
            messages: [
              { role: "system", content: PROMPT.PLAN_PROMPT },
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

      // Guard: if the model stopped because of token limit, surface a clearer error.
      if (
        isChatCompletion(planResult) &&
        planResult.choices?.[0]?.finish_reason === "length"
      ) {
        console.error("Plan generation truncated by token limit", {
          finish_reason: planResult.choices?.[0]?.finish_reason,
          completion_tokens: planResult.usage?.completion_tokens,
          total_tokens: planResult.usage?.total_tokens,
          max_tokens: PLAN_TOKENS,
        });
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
        console.error("Plan generation validation failed", {
          issues: parsedPlans.error.issues,
          formatted: UTILS.formatParseIssue(parsedPlans.error),
          rawPlanResult: planResult,
          extractedPayload: planPayload,
          normalizedPayload: normalizedPlanPayload,
        });
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
        console.error("Final output validation failed", parsedFinal.error);
        const fallback: OUTPUT.OutputModel = {
          status: "rejected",
          reason: `Final output missing required fields: ${UTILS.formatParseIssue(parsedFinal.error)}`,
        };
        return UTILS.json(fallback, 200);
      }

      return UTILS.json(parsedFinal.data as OUTPUT.OutputModel, 200);
    } catch (error) {
      if (error instanceof Error && error.message === "timeout") {
        return UTILS.json(
          {
            status: "error",
            reason: "Model request timed out. Please try again.",
          },
          504,
        );
      }

      console.error("Model request failed", error);
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
