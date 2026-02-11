import { ZodError } from "zod";
import { Activity, Goal, PlanRequest, Sex } from "./types/types";
import { DeterministicNumbers, UserPayload } from "./types/types";

export const corsHeaders = {
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Origin": "*",
};

export function json<T>(data: T, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders,
    },
  });
}

export function normalizeText(s?: string) {
  return (s ?? "").toLowerCase().replace(/\s+/g, "");
}

export function hasMedicalCondition(medicalText?: string) {
  return normalizeText(medicalText).length > 0;
}

export function computeDeterministic(input: PlanRequest): DeterministicNumbers {
  const bmi = _round(_calcBMI(input.weightKg, input.heightCm), 1);
  const bmr = Math.round(
    _calcBMR(input.sex, input.weightKg, input.heightCm, input.age),
  );
  const tdee = Math.round(bmr * _activityFactor(input.activity));
  const dailyCalories = _targetCalories(tdee, input.goal);
  const macro_distribution_percent = _macroPercent(input.goal);
  return { bmi, bmr, tDee: tdee, dailyCalories, macro_distribution_percent };
}

export function buildUserPayload(input: PlanRequest): UserPayload {
  return {
    request: input,
    computedNumbers: computeDeterministic(input),
  };
}

export function formatParseIssue(error: unknown) {
  if (!(error instanceof ZodError)) return "Invalid payload.";
  const issue = error.issues[0];
  if (!issue) return "Payload validation failed.";
  const path =
    issue.path && issue.path.length
      ? `Field "${issue.path.join(".")}"`
      : "Field";
  return `${path}: ${issue.message}`;
}

// --- PRIVATE FUNCTIONS

function _calcBMI(weightKg: number, heightCm: number) {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

function _calcBMR(sex: Sex, weightKg: number, heightCm: number, age: number) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

function _activityFactor(activity: Activity) {
  if (activity === "low") return 1.2;
  if (activity === "medium") return 1.55;
  return 1.725;
}

function _round(n: number, decimals = 1) {
  const power = 10 ** decimals;
  return Math.round(n * power) / power;
}

function _targetCalories(tdee: number, goal: Goal) {
  if (goal === "lose_weight") return Math.round(tdee * 0.85);
  if (goal === "build_muscle") return Math.round(tdee * 1.1);
  if (goal === "get_fit") return Math.round(tdee * 0.95);
  return Math.round(tdee);
}

function _macroPercent(goal: Goal) {
  if (goal === "build_muscle") return { protein: 30, fat: 25, carbs: 45 };
  if (goal === "lose_weight") return { protein: 35, fat: 30, carbs: 35 };
  if (goal === "get_fit") return { protein: 30, fat: 30, carbs: 40 };
  return { protein: 25, fat: 30, carbs: 45 };
}
