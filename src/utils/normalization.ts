/**
 * Data normalization utilities
 */

import {
  type DietArrayItem,
  type DietItem,
  type ExerciseArrayItem,
  type DayKey,
} from "../types/types";
import { isChatCompletion, isDietItem, DAYS } from "./validation";

export type { DayKey };
export { DAYS };

export function extractModelPayload(raw: unknown): unknown {
  if (isChatCompletion(raw)) {
    const content = raw.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      try {
        return JSON.parse(content);
      } catch (err) {
        console.error("Failed to parse model content as JSON", {
          error: err instanceof Error ? err.message : String(err),
          snippet: content.slice(0, 2000),
        });
        return content;
      }
    }
    return content ?? raw;
  }

  return raw;
}

export function normalizeDay(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const lower = value.toLowerCase();
  const validDays = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
  const day = lower.slice(0, 3);
  return validDays.includes(day) ? day : undefined;
}

export function normalizePlansPayload(payload: unknown): unknown {
  let data = payload;
  if (data && typeof data === "object" && "weeklyPlan" in data) {
    data = (data as { weeklyPlan: unknown }).weeklyPlan;
  }

  if (!data || typeof data !== "object") return payload;
  const typed = data as Record<string, unknown>;

  const diet: Partial<Record<DayKey, DietItem[]>> | undefined =
    typed.diet && Array.isArray(typed.diet)
      ? spreadDietAcrossWeek(typed.diet as DietArrayItem[])
      : normalizeDietObject(typed.diet);

  const exercise = Array.isArray(typed.exercise)
    ? (typed.exercise as ExerciseArrayItem[])
        .map(normalizeExerciseItem)
        .filter(Boolean)
    : undefined;

  return {
    diet,
    exercise,
  };
}

export function spreadDietAcrossWeek(items: DietArrayItem[]) {
  const normalized = items.map(normalizeDietItem).filter(isDietItem);

  const dietPerDay = DAYS.reduce<Record<DayKey, DietItem[]>>(
    (acc, day) => {
      acc[day] = normalized.slice(0, 3);
      return acc;
    },
    {} as Record<DayKey, DietItem[]>,
  );

  return dietPerDay;
}

export function normalizeDietObject(value: unknown) {
  if (!value || typeof value !== "object") return undefined;

  const dietObj: Partial<Record<DayKey, DietItem[]>> = {};

  for (const day of DAYS) {
    const items = (value as Record<string, unknown>)[day];
    if (Array.isArray(items)) {
      dietObj[day] = items
        .map(normalizeDietItem)
        .filter(isDietItem)
        .slice(0, 3);
    }
  }
  return dietObj;
}

export function normalizeDietItem(item: DietArrayItem) {
  if (!item || typeof item !== "object") return undefined;
  const when =
    typeof item.when === "string"
      ? item.when
      : typeof item.meal === "string"
        ? item.meal
        : undefined;
  const what = typeof item.what === "string" ? item.what : undefined;
  const why = typeof item.why === "string" ? item.why : undefined;
  if (!when || !what || !why) return undefined;
  return { when, what, why };
}

export function normalizeExerciseItem(item: ExerciseArrayItem) {
  if (!item || typeof item !== "object") return undefined;
  const day = normalizeDay(item.day);
  const when = typeof item.when === "string" ? item.when : undefined;
  const goal = typeof item.goal === "string" ? item.goal : undefined;
  const what = typeof item.what === "string" ? item.what : undefined;
  const duration =
    typeof item.duration_minutes === "number"
      ? item.duration_minutes
      : typeof item.duration_minutes === "string"
        ? Number(item.duration_minutes)
        : undefined;
  const intensity =
    typeof item.intensity_or_rest === "string"
      ? item.intensity_or_rest
      : undefined;
  if (!day || !goal || !when || !what || !duration || !intensity)
    return undefined;
  return {
    day,
    when,
    goal,
    what,
    duration_minutes: duration,
    intensity_or_rest: intensity,
  };
}
