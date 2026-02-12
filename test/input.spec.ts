import { describe, expect, it } from "vitest";
import { planInputSchema } from "../src/schemas/input";

const basePayload = {
  heightCm: 180,
  weightKg: 78,
  age: 32,
  sex: "male",
  goal: "build_muscle",
  activity: "medium",
  language: "fa",
};

describe("planInputSchema", () => {
  it("accepts a valid payload and coerces numeric strings", () => {
    const parsed = planInputSchema.safeParse({
      ...basePayload,
      heightCm: "180",
      weightKg: "78",
      age: "32",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data).toEqual({
      ...basePayload,
      heightCm: 180,
      weightKg: 78,
      age: 32,
      medicalCondition: undefined,
      practicePlace: undefined,
    });
  });

  it("trims empty medicalCondition and removes it from the result", () => {
    const parsed = planInputSchema.safeParse({
      ...basePayload,
      medicalCondition: "   ",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.medicalCondition).toBeUndefined();
  });

  it("rejects heights outside 120-230 cm", () => {
    const parsed = planInputSchema.safeParse({
      ...basePayload,
      heightCm: 110,
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(parsed.error.issues[0].path).toEqual(["heightCm"]);
    expect(parsed.error.issues[0].message).toContain("120");
  });

  it("requires integer ages between 12 and 80", () => {
    const parsed = planInputSchema.safeParse({
      ...basePayload,
      age: 20.5,
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(parsed.error.issues[0].path).toEqual(["age"]);
    expect(parsed.error.issues[0].message.toLowerCase()).toContain("integer");
  });

  it("rejects values outside allowed enums", () => {
    const parsed = planInputSchema.safeParse({
      ...basePayload,
      sex: "other",
      goal: "gain_weight",
      activity: "extreme",
      practicePlace: "park",
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const fields = parsed.error.issues.map((issue: { path: unknown[] }) =>
      issue.path.join("."),
    );
    expect(fields).toContain("sex");
    expect(fields).toContain("goal");
    expect(fields).toContain("activity");
    expect(fields).toContain("practicePlace");
  });
});
