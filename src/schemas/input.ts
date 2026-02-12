import { z } from "zod";
import type { PlanRequest } from "../types/types";

const sexValues = ["male", "female"] as const;
const goalValues = [
  "build_muscle",
  "lose_weight",
  "get_fit",
  "maintain_weight",
] as const;
const activityValues = ["low", "medium", "high"] as const;
const practicePlaceValues = ["home", "gym", "both"] as const;
const languageValues = ["fa", "en", "ar", "tr", "zh", "es", "fr", "de"] as const;

const rawPlanInputSchema = z.object({
  heightCm: z.coerce.number().min(120).max(230),
  weightKg: z.coerce.number().min(30).max(250),
  age: z.coerce.number().int().min(12).max(80),
  sex: z.enum(sexValues),
  goal: z.enum(goalValues),
  activity: z.enum(activityValues),
  medicalCondition: z.coerce.string().trim().optional(),
  practicePlace: z.enum(practicePlaceValues).optional(),
  language: z.enum(languageValues).default("fa"),
});

export const planInputSchema = rawPlanInputSchema.transform(
  (value): PlanRequest => ({
    heightCm: value.heightCm,
    weightKg: value.weightKg,
    age: value.age,
    sex: value.sex,
    goal: value.goal,
    activity: value.activity,
    medicalCondition: value.medicalCondition || undefined,
    practicePlace: value.practicePlace || undefined,
    language: value.language || undefined,
  }),
);

export type PlanInput = z.input<typeof rawPlanInputSchema>;
export type RawPlanRequest = z.input<typeof rawPlanInputSchema>;
