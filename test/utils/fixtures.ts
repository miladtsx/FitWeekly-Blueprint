import { plansSchema } from "../../src/schemas/output";
import type { PlanRequest } from "../../src/types/types";
import type { z } from "zod";

export const sampleDietDay: { when: string; what: string; why: string }[] = [
  { when: "07:30-08:00", what: "اوت میل با شیر کم‌چرب", why: "انرژی صبح" },
  {
    when: "13:00-13:30",
    what: "برنج قهوه‌ای و مرغ",
    why: "پروتئین و کربوهیدرات",
  },
  { when: "20:00-20:30", what: "سالاد و ماست", why: "فیبر و ریکاوری" },
]

export type SamplePlans = z.infer<typeof plansSchema>;

export const samplePlans: SamplePlans = {
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

export const validPayload: PlanRequest = {
  heightCm: 180,
  weightKg: 78,
  age: 32,
  sex: "male",
  goal: "build_muscle",
  activity: "medium",
};
