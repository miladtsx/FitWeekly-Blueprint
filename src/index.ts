import { planInputSchema } from "./schemas/input";
import {
  outputJsonSchema,
  outputModelSchema,
  OutputModel,
} from "./schemas/output";
import type { Env } from "../worker-configuration";
import type { ExecutionContext } from "@cloudflare/workers-types";
import {
  buildUserPayload,
  corsHeaders,
  formatParseIssue,
  hasMedicalCondition,
  json,
} from "./utils";
import { SYSTEM_PROMPT } from "./prompt";

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
      return new Response("OK", { status: 200, headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json(
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
      return json(
        { status: "rejected", reason: formatParseIssue(parsed.error) },
        400,
      );
    }

    const input = parsed.data;

    if (hasMedicalCondition(input.medicalCondition)) {
      return json(
        {
          status: "rejected",
          reason: "لطفا با یک انسان متخصص مشورت کنید.",
        },
        200,
      );
    }

    const payload = buildUserPayload(input);

    // Keep a conservative generation cap to avoid exceeding the model's
    // context window (24k tokens for this model). The output is a small JSON
    // plan, so we don't need a large max_tokens value.
    const MAX_OUTPUT_TOKENS = 2000;

    let rawResult;
    try {
      const inferencePromise = env.AI.run("@cf/qwen/qwen3-30b-a3b-fp8", {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(payload, null, 2) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: outputJsonSchema,
        },
        temperature: 0.1,
        max_tokens: MAX_OUTPUT_TOKENS,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), INFERENCE_TIMEOUT_MS),
      );

      rawResult = await Promise.race([inferencePromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message === "timeout") {
        return json(
          {
            status: "error",
            reason: "Model request timed out. Please try again.",
          },
          504,
        );
      }

      return json(
        {
          status: "error",
          reason: "Model request failed. Please try again later.",
        },
        502,
      );
    }

    const result = outputModelSchema.parse(rawResult) as OutputModel;

    return json(result, 200);
  },
};
