import type { Language } from "./types/types";

const languageInstructions: Record<Language, { dietRules: string; exerciseRules: string; useLanguage: string }> = {
  fa: {
    dietRules: "diet_rules: 3-5 short Farsi bullets with calorie/macro boundaries implied by the provided computedNumbers.",
    exerciseRules: "exercise_rules: 3-5 short Farsi bullets noting split, intensity guidance, and recovery.",
    useLanguage: "Persian(Farsi)",
  },
  en: {
    dietRules: "diet_rules: 3-5 short English bullets with calorie/macro boundaries implied by the provided computedNumbers.",
    exerciseRules: "exercise_rules: 3-5 short English bullets noting split, intensity guidance, and recovery.",
    useLanguage: "English",
  },
  ar: {
    dietRules: "diet_rules: 3-5 short Arabic bullets with calorie/macro boundaries implied by the provided computedNumbers.",
    exerciseRules: "exercise_rules: 3-5 short Arabic bullets noting split, intensity guidance, and recovery.",
    useLanguage: "Arabic",
  },
  tr: {
    dietRules: "diet_rules: 3-5 short Turkish bullets with calorie/macro boundaries implied by the provided computedNumbers.",
    exerciseRules: "exercise_rules: 3-5 short Turkish bullets noting split, intensity guidance, and recovery.",
    useLanguage: "Turkish",
  },
  zh: {
    dietRules: "diet_rules: 3-5 short Chinese bullets with calorie/macro boundaries implied by the provided computedNumbers.",
    exerciseRules: "exercise_rules: 3-5 short Chinese bullets noting split, intensity guidance, and recovery.",
    useLanguage: "Chinese",
  },
  es: {
    dietRules: "diet_rules: 3-5 short Spanish bullets with calorie/macro boundaries implied by the provided computedNumbers.",
    exerciseRules: "exercise_rules: 3-5 short Spanish bullets noting split, intensity guidance, and recovery.",
    useLanguage: "Spanish",
  },
  fr: {
    dietRules: "diet_rules: 3-5 short French bullets with calorie/macro boundaries implied by the provided computedNumbers.",
    exerciseRules: "exercise_rules: 3-5 short French bullets noting split, intensity guidance, and recovery.",
    useLanguage: "French",
  },
  de: {
    dietRules: "diet_rules: 3-5 short German bullets with calorie/macro boundaries implied by the provided computedNumbers.",
    exerciseRules: "exercise_rules: 3-5 short German bullets noting split, intensity guidance, and recovery.",
    useLanguage: "German",
  },
};

export function getGuidancePrompt(language: Language = "fa"): string {
  const lang = languageInstructions[language];
  return `
You are a concise nutrition and training coach.
Return only the critical constraints the plan must follow.
Respond strictly as JSON matching the guidance schema. No prose outside JSON.
- The JSON must be syntactically complete: close every string, array, and object; no trailing commas; no ellipses.
- Keep guidance simple and practical: everyday foods, no supplements or complex recipes.
- ${lang.dietRules}
- ${lang.exerciseRules}
Each bullet <= 80 chars. Use the provided user payload; never re-compute numbers.
`.trim();
}

export function getPlanPrompt(language: Language = "fa"): string {
  const lang = languageInstructions[language];
  return `
You are writing the weekly plan that satisfies given rules.
Respond strictly as JSON per the plan schema. No extra text.
Use English for JSON keys; ${lang.useLanguage} for user-facing text ("goal", "what", "why").
Use the provided computedNumbers; do not recompute calories/macros.
Keep the plan basic and clear: simple meals (one protein + one carb + veg), common units (g, cup), no recipes, no brand names, no supplements. Reuse items across days if helpful. Exactly 3 meals per day.
Constraints:
- Diet object must contain keys sat,sun,mon,tue,wed,thu,fri. Each is an array of exactly 3 items with keys when, what, why.
- Exercise is an array (3-4) of sessions; day must be one of sat|sun|mon|tue|wed|thu|fri; include when, goal, what, duration_minutes, intensity_or_rest. Prefer bodyweight/dumbbell if practicePlace != "gym".
- Keep each "what" <= 120 chars and "why" <= 80 chars.
Example shape (values are placeholders):
{
  "diet": {
    "sat": [{"when":"breakfast","what":"...","why":"..."} , {"when":"lunch","what":"...","why":"..."} , {"when":"dinner","what":"...","why":"..."}],
    "sun": [...],
    "mon": [...],
    "tue": [...],
    "wed": [...],
    "thu": [...],
    "fri": [...]
  },
  "exercise": [
    {"day":"sat","when":"morning","goal":"...","what":"...","duration_minutes":45,"intensity_or_rest":"moderate"},
    {"day":"mon","when":"evening","goal":"...","what":"...","duration_minutes":40,"intensity_or_rest":"high"}
  ]
}
`.trim();
}

// Default exports for backward compatibility
export const GUIDANCE_PROMPT = getGuidancePrompt("fa");
export const PLAN_PROMPT = getPlanPrompt("fa");
