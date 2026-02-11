import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const weekdays = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"] as const;

export const dietItemSchema = z.object({
  when: z.string(),
  what: z.string(),
  why: z.string(),
});

export const dietDaySchema = z.array(dietItemSchema).min(3).max(6);

export const exerciseItemSchema = z.object({
  day: z.enum(weekdays),
  goal: z.string(),
  when: z.string(),
  what: z.string(),
  duration_minutes: z.number(),
  intensity_or_rest: z.string(),
});

export const exerciseSchema = z.array(exerciseItemSchema).min(1).max(7);

export const outputModelSchema = z
  .object({
    status: z.enum(["success", "rejected"]),
    reason: z.string().optional(),
    plans: z
      .object({
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
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    const isSuccess = value.status === "success";
    if (isSuccess && !value.plans) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "plans are required when status is success",
        path: ["plans"],
      });
    }
    if (isSuccess && value.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "reason must be omitted when status is success",
        path: ["reason"],
      });
    }
    if (!isSuccess && !value.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "reason is required when status is not success",
        path: ["reason"],
      });
    }
    if (!isSuccess && value.plans) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "plans must be omitted when status is not success",
        path: ["plans"],
      });
    }
  });

export type OutputModel = z.infer<typeof outputModelSchema>;

export const outputJsonSchema = {
  name: "diet_exercise_weekly_output",
  strict: true,
  schema: zodToJsonSchema(outputModelSchema, {
    $refStrategy: "none",
  }),
};
