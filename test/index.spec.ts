import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";
import worker from "../src/index";
import type { Env } from "../worker-configuration";

const sampleDietDay = [
  { when: "07:30-08:00", what: "اوت میل با شیر کم‌چرب", why: "انرژی صبح" },
  {
    when: "13:00-13:30",
    what: "برنج قهوه‌ای و مرغ",
    why: "پروتئین و کربوهیدرات",
  },
  { when: "20:00-20:30", what: "سالاد و ماست", why: "فیبر و ریکاوری" },
];

const samplePlans = {
  diet: {
    sat: sampleDietDay,
    sun: sampleDietDay,
    mon: sampleDietDay,
    tue: sampleDietDay,
    wed: sampleDietDay,
    thu: sampleDietDay,
    fri: sampleDietDay,
  },
  exercise: [
    {
      day: "sat",
      goal: "قدرت کلی",
      when: "صبح",
      what: "پیاده‌روی ۳۰ دقیقه",
      duration_minutes: 30,
      intensity_or_rest: "کم",
    },
  ],
};

const validPayload = {
  heightCm: 180,
  weightKg: 78,
  age: 32,
  sex: "male",
  goal: "build_muscle",
  activity: "medium",
};

describe("plan generator worker", () => {
  it("rejects invalid JSON", async () => {
    const request = new Request("http://example.com", {
      method: "POST",
      body: "not-json",
    });
    const ctx = createExecutionContext();

    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    const body = await response.json();

    expect(body.status).toBe("rejected");
    expect(body.reason).toMatch(/valid JSON/i);
  });

  it("returns structured plan when AI succeeds", async () => {
    const aiSpy = vi
      .fn<Env["AI"]["run"]>()
      .mockResolvedValue({ status: "success", plans: samplePlans });

    const testEnv = env as Env;
    testEnv.AI = { run: aiSpy } as unknown as Env["AI"];

    const request = new Request("http://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });
    const ctx = createExecutionContext();

    const response = await worker.fetch(request, testEnv, ctx);
    await waitOnExecutionContext(ctx);
    const body = await response.json();

    expect(body).toEqual({ status: "success", plans: samplePlans });
    expect(aiSpy).toHaveBeenCalledOnce();
  });
});
