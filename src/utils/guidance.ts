/**
 * Guidance generation utilities
 */

import type { Env } from "../../worker-configuration";
import type { GuidanceResult } from "../schemas/output";
import type { ZodType } from "zod";
import { isTruncatedByTokens } from "./validation";
import { extractModelPayload } from "./normalization";
import { runWithTimeout } from "./async";

interface GuidanceDependencies {
  guidancePrompt: string;
  guidanceJsonSchema: unknown;
  guidanceSchema: ZodType;
  formatParseIssue: (error: unknown) => string;
}

/**
 * Generates guidance with retry logic
 */
export async function generateGuidanceWithRetry(
  payload: unknown,
  env: Env,
  maxTokens: number,
  timeoutMs: number,
  deps: GuidanceDependencies,
  retries = 2,
): Promise<GuidanceResult> {
  let lastReason = "";

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await runWithTimeout(
        () =>
          env.AI.run("@cf/qwen/qwen3-30b-a3b-fp8", {
            messages: [
              { role: "system", content: deps.guidancePrompt },
              { role: "user", content: JSON.stringify(payload) },
            ],
            response_format: {
              type: "json_schema",
              json_schema: deps.guidanceJsonSchema,
            },
            temperature: 0,
            max_tokens: maxTokens,
          }),
        timeoutMs,
      );

      if (isTruncatedByTokens(result)) {
        return {
          status: "error",
          reason:
            "Guidance response was truncated (token limit hit). Please retry.",
        };
      }

      const parsed = deps.guidanceSchema.safeParse(extractModelPayload(result));

      if (parsed.success) {
        return { status: "ok", guidance: parsed.data };
      }

      lastReason = deps.formatParseIssue(parsed.error);
      console.warn("Guidance parse failed", {
        attempt,
        issues: parsed.error.issues,
        formatted: lastReason,
      });
    } catch (err) {
      lastReason = err instanceof Error ? err.message : String(err);
      console.error("Guidance generation error", {
        attempt,
        error: lastReason,
      });
    }
  }

  return {
    status: "error",
    reason: `Guidance generation failed after retries: ${lastReason || "unknown error"}`,
  };
}
