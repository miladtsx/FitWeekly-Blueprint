import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const weekdays = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"] as const;

// --- Shared building blocks -------------------------------------------------

export const dietItemSchema = z.object({
  when: z.string(),
  what: z.string(),
  why: z.string(),
});

export const dietDaySchema = z.array(dietItemSchema).min(3).max(3);

export const exerciseItemSchema = z.object({
  day: z.enum(weekdays),
  goal: z.string(),
  when: z.string(),
  what: z.string(),
  duration_minutes: z.number(),
  intensity_or_rest: z.string(),
});

export const exerciseSchema = z.array(exerciseItemSchema).min(1).max(7);

export const plansSchema = z.object({
  diet: z.object({
    sat: dietDaySchema,
    sun: dietDaySchema,
    mon: dietDaySchema,
    tue: dietDaySchema,
    wed: dietDaySchema,
    thu: dietDaySchema,
    fri: dietDaySchema,
  }),
  exercise: exerciseSchema,
});

export const guidanceSchema = z.object({
  diet_rules: z.array(z.string()).min(2).max(6),
  exercise_rules: z.array(z.string()).min(2).max(6),
});

export const guidanceJsonSchema = {
  name: "diet_exercise_guidance",
  strict: true,
  schema: zodToJsonSchema(guidanceSchema, { $refStrategy: "none" }),
};

export const plansJsonSchema = {
  name: "diet_exercise_plan_only",
  strict: true,
  schema: zodToJsonSchema(plansSchema, { $refStrategy: "none" }),
};

// --- Output model ----------------------------------------------------------

const successSchema = z.object({
  status: z.literal("success"),
  plans: plansSchema,
  guidance: guidanceSchema.optional(),
  // Model shouldn't provide a reason on success, but we tolerate explicit
  // undefined to keep the JSON schema simple.
  reason: z.undefined().optional(),
});

const rejectedSchema = z.object({
  status: z.literal("rejected"),
  reason: z.string(),
  // When rejected there must not be any plans.
  plans: z.undefined().optional(),
});

export const outputModelSchema = z.discriminatedUnion("status", [
  successSchema,
  rejectedSchema,
]);

export type OutputModel = z.infer<typeof outputModelSchema>;

export const outputJsonSchema = {
  name: "diet_exercise_weekly_output",
  strict: true,
  schema: zodToJsonSchema(outputModelSchema, {
    $refStrategy: "none",
  }),
};

export type GuidanceResult =
  | { status: "ok"; guidance?: z.infer<typeof guidanceSchema> }
  | { status: "error"; reason: string };
