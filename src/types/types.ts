// --- Core domain types -------------------------------------------------------

export type Sex = "male" | "female";
export type Goal =
  | "build_muscle"
  | "lose_weight"
  | "get_fit"
  | "maintain_weight";
export type Activity = "low" | "medium" | "high";
export type PracticePlace = "home" | "gym" | "both";
export type Language = "fa" | "en" | "ar" | "tr" | "zh" | "es" | "fr" | "de";

export interface PlanRequest {
  heightCm: number;
  weightKg: number;
  age: number;
  sex: Sex;
  goal: Goal;
  activity: Activity;
  medicalCondition?: string;
  practicePlace?: PracticePlace;
  language?: Language;
}

export interface DeterministicNumbers {
  bmi: number;
  bmr: number;
  tDee: number;
  dailyCalories: number;
  macro_distribution_percent: { protein: number; fat: number; carbs: number };
}

export type UserPayload = {
  goal: Goal;
  activity: Activity;
  sex: Sex;
  age: number;
  practicePlace?: PracticePlace;
  computedNumbers: DeterministicNumbers;
};

// --- Shared types for AI model responses ------------------------------------

export type ChatMessage = { content?: unknown };
export type ChatChoice = { message?: ChatMessage; finish_reason?: string };
export type ChatCompletion = {
  choices: ChatChoice[];
  usage?: { completion_tokens?: number; total_tokens?: number };
};

export type DietItem = { when: string; what: string; why: string };

export const DAYS = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"] as const;
export type DayKey = (typeof DAYS)[number];

// --- Input/Output array items ------------------------------------------------

export type DietArrayItem = {
  when?: unknown;
  meal?: unknown;
  what?: unknown;
  why?: unknown;
};

export type ExerciseArrayItem = {
  day?: unknown;
  when?: unknown;
  goal?: unknown;
  what?: unknown;
  duration_minutes?: unknown;
  intensity_or_rest?: unknown;
};

export type DietDay = DietItem[];
