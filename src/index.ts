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

    const rawResult = await env.AI.run(
      "@cf/mistral/mistral-7b-instruct-v0.2-lora",
      {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(payload, null, 2) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: outputJsonSchema,
        },
        temperature: 0.1,
        max_tokens: 26000,
      },
    );

    const result = outputModelSchema.parse(rawResult) as OutputModel;

    return json(result, 200);
  },
};
