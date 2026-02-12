/**
 * Type guard functions for validation
 */

import { type ChatCompletion, type DietItem, DAYS } from "../types/types";

export { type ChatCompletion, type DietItem, DAYS };

export function isChatCompletion(raw: unknown): raw is ChatCompletion {
  return (
    typeof raw === "object" &&
    raw !== null &&
    "choices" in raw &&
    Array.isArray((raw as { choices: unknown }).choices)
  );
}

export function isTruncatedByTokens(raw: unknown): boolean {
  return isChatCompletion(raw) && raw.choices?.[0]?.finish_reason === "length";
}

export function isDietItem(item: unknown): item is DietItem {
  if (!item || typeof item !== "object") return false;
  const maybe = item as Record<string, unknown>;
  return (
    typeof maybe.when === "string" &&
    typeof maybe.what === "string" &&
    typeof maybe.why === "string"
  );
}
