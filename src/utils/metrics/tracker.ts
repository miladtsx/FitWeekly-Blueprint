/**
 * Metrics tracker - Centralized observability tracking.
 *
 * Modular design - each metric category can be enabled/disabled.
 * Import and use in worker for consistent, clean metric tracking.
 */

import type { Metrics } from './types';

export interface MetricsTrackerOptions {
  enabled: boolean;
  metrics: Metrics;
}

export class MetricsTracker {
  private metrics: Metrics;
  private enabled: boolean;

  constructor(options: MetricsTrackerOptions) {
    this.metrics = options.metrics;
    this.enabled = options.enabled;
  }

  // --- Request Metrics ---

  trackRequest(method: string) {
    if (!this.enabled) return;
    this.metrics.counter('requests_total', 1, { method });
  }

  trackRequestStatus(status: 'success' | 'error' | 'rejected', reason?: string) {
    if (!this.enabled) return;
    this.metrics.counter('requests_total', 1, { status, ...(reason && { reason }) });
  }

  trackLanguage(language: string) {
    if (!this.enabled) return;
    this.metrics.counter('language_total', 1, { language });
  }

  // --- Goal & User Metrics ---

  trackGoal(goal: string) {
    if (!this.enabled) return;
    this.metrics.counter('goals_total', 1, { goal });
  }

  trackActivityLevel(level: string) {
    if (!this.enabled) return;
    this.metrics.counter('activity_levels_total', 1, { level });
  }

  trackDemographics(sex: string, age: number) {
    if (!this.enabled) return;
    const ageGroup = this.getAgeGroup(age);
    this.metrics.counter('demographics_total', 1, { sex, age_group: ageGroup });
  }

  // --- Performance Metrics ---

  trackDuration(phase: 'total' | 'guidance' | 'plan', durationMs: number) {
    if (!this.enabled) return;
    this.metrics.histogram(`${phase}_duration_ms`, durationMs);
  }

  // --- AI Model Metrics ---

  trackTokens(phase: 'guidance' | 'plan', promptTokens: number, completionTokens: number) {
    if (!this.enabled) return;
    this.metrics.histogram(`prompt_tokens_${phase}`, promptTokens);
    this.metrics.histogram(`completion_tokens_${phase}`, completionTokens);
    this.metrics.gauge(`total_tokens_${phase}`, promptTokens + completionTokens);
  }

  trackModelRetry(phase: 'guidance' | 'plan') {
    if (!this.enabled) return;
    this.metrics.counter('model_retries_total', 1, { phase });
  }

  trackModelError(phase: 'guidance' | 'plan', errorType: string) {
    if (!this.enabled) return;
    this.metrics.counter('model_errors_total', 1, { phase, error_type: errorType });
  }

  // --- Helper Methods ---

  private getAgeGroup(age: number): string {
    if (age < 18) return 'under_18';
    if (age < 25) return '18-24';
    if (age < 40) return '25-39';
    if (age < 60) return '40-59';
    return '60+';
  }
}

/**
 * Create metrics tracker from environment configuration.
 */
export function createMetricsTracker(
  metrics: Metrics,
  env: Record<string, unknown>,
): MetricsTracker {
  const enabled = env.METRICS_ENABLED === true || env.METRICS_ENABLED === 'true';
  return new MetricsTracker({ enabled, metrics });
}
