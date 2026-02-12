/**
 * Metrics factory and utilities.
 *
 * Usage:
 *   import { createMetrics, createMetricsTracker } from './utils/metrics';
 *
 * Backend selection (via env vars):
 *   - Default: no-op (disabled)
 *   - ANALYTICS_ENABLED + ANALYTICS binding: Analytics Engine
 */

export type { Metrics, MetricsConfig, MetricsBackend } from './types';

export {
  createNoopMetrics,
  createAnalyticsMetrics,
  createMetricsFromEnv,
} from './analytics';

export type { AnalyticsEngineBinding } from './analytics';

export {
  MetricsTracker,
  createMetricsTracker,
} from './tracker';
