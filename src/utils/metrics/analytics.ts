/**
 * Cloudflare Analytics Engine backend for metrics.
 *
 * Configure in wrangler.toml:
 * [[analytics_engine_datasets]]
 * binding = "ANALYTICS_ENGINE"
 * database_name = "analytics"
 *
 * Add to wrangler.toml vars:
 * ANALYTICS_ENABLED = true
 */

import type { Metrics } from './types';

export interface AnalyticsEngineBinding {
  write: (data: {
    localHour: number;
    [key: string]: unknown;
  }) => Promise<void>;
}

export interface AnalyticsConfig {
  binding?: AnalyticsEngineBinding;
  datasetName?: string;
}

/**
 * Create a no-op metrics implementation when Analytics Engine is disabled.
 */
export function createNoopMetrics(): Metrics {
  return {
    counter() {},
    gauge() {},
    histogram() {},
  };
}

/**
 * Create Analytics Engine metrics backend.
 *
 * Writes metrics as Analytics Engine events with tags as dimensions.
 */
export function createAnalyticsMetrics(
  config: AnalyticsConfig,
): Metrics {
  const dataset = config.datasetName ?? 'metrics';

  return {
    counter(name: string, value = 1, tags?: Record<string, string>) {
      writeMetric(name, value, 'counter', tags ?? {});
    },

    gauge(name: string, value: number, tags?: Record<string, string>) {
      writeMetric(name, value, 'gauge', tags ?? {});
    },

    histogram(name: string, value: number, tags?: Record<string, string>) {
      writeMetric(name, value, 'histogram', tags ?? {});
    },
  };

  function writeMetric(
    name: string,
    value: number,
    type: string,
    tags: Record<string, string>,
  ) {
    if (!config.binding) {
      // Analytics Engine not bound, silently skip
      return;
    }

    const localHour = Math.floor(Date.now() / 1000 / 60 / 60) % 24;

    config.binding.write({
      localHour,
      metric_name: name,
      metric_type: type,
      metric_value: value,
      dataset: dataset,
      ...tags,
    }).catch(() => {
      // Silently fail - don't impact request handling
    });
  }
}

/**
 * Create metrics from environment variables.
 * Enable with ANALYTICS_ENABLED = true in wrangler.toml vars.
 */
export function createMetricsFromEnv(
  env: Record<string, unknown>,
  binding?: AnalyticsEngineBinding,
): Metrics {
  const enabled = env.ANALYTICS_ENABLED === true ||
    env.ANALYTICS_ENABLED === 'true';

  if (!enabled || !binding) {
    return createNoopMetrics();
  }

  return createAnalyticsMetrics({
    binding,
    datasetName: 'fitness_bot_metrics',
  });
}
