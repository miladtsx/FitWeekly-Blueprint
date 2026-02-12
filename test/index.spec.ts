import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../src/index";
import type { Env } from "../worker-configuration";
import { createEnvWithAiMock } from "./utils/env";
import { samplePlans, validPayload } from "./utils/fixtures";
import { createJsonRequest } from "./utils/request";

describe("plan generator worker", () => {
  it("rejects invalid JSON", async () => {
    const request = createJsonRequest("not-json");
    const ctx = createExecutionContext();

    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    const body = await response.json();

    expect(body.status).toBe("rejected");
    expect(body.reason).toMatch(/valid JSON/i);
  });

  it("returns structured plan when AI succeeds", async () => {
    const { aiSpy, envWithMock, guidance } = createEnvWithAiMock(env as Env, {
      plans: samplePlans,
    });
    const request = createJsonRequest(validPayload);
    const ctx = createExecutionContext();

    const response = await worker.fetch(request, envWithMock, ctx);
    await waitOnExecutionContext(ctx);
    const body = await response.json();

    expect(body).toEqual({
      status: "success",
      plans: samplePlans,
      guidance,
    });
    expect(aiSpy).toHaveBeenCalledTimes(2);
  });
});
