import { vi } from "vitest";
import type { Env } from "../../worker-configuration";

type GuidanceMock = { diet_rules: string[]; exercise_rules: string[] };

type AiMockOptions = {
  guidance?: GuidanceMock;
  plans: unknown;
};

export function createEnvWithAiMock(
  baseEnv: Env,
  options: AiMockOptions,
): { aiSpy: ReturnType<typeof vi.fn>; envWithMock: Env; guidance: GuidanceMock } {
  const defaultGuidance: GuidanceMock = {
    diet_rules: ["پرهیز از شکر افزوده", "مصرف آب کافی"],
    exercise_rules: ["گرم‌کردن قبل از تمرین", "کول‌دان پس از تمرین"],
  };

  const guidance = options.guidance ?? defaultGuidance;

  const aiSpy = vi.fn<Env["AI"]["run"]>()
    .mockResolvedValueOnce(guidance)
    .mockResolvedValueOnce(options.plans);

  const envWithMock = {
    ...baseEnv,
    AI: { run: aiSpy } as Env["AI"],
  };

  return { aiSpy, envWithMock, guidance };
}
