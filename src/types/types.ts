export type Sex = "male" | "female";
export type Goal =
  | "build_muscle"
  | "lose_weight"
  | "get_fit"
  | "maintain_weight";
export type Activity = "low" | "medium" | "high";
export type PracticePlace = "home" | "gym" | "both";

export interface PlanRequest {
  heightCm: number;
  weightKg: number;
  age: number;
  sex: Sex;
  goal: Goal;
  activity: Activity;
  medicalCondition?: string;
  practicePlace?: PracticePlace;
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
