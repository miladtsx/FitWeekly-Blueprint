/**
 * Metrics types and interfaces for observability.
 */

export interface Metrics {
  /**
   * Increment a counter metric.
   */
  counter(name: string, value?: number, tags?: Record<string, string>): void;

  /**
   * Set a gauge value.
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void;

  /**
   * Record a histogram value (for latency, sizes, etc.).
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void;
}

export type MetricsBackend = 'analytics_engine' | 'prometheus' | 'cloudflare_monitoring';

export interface MetricsConfig {
  backend: MetricsBackend;
  // Analytics Engine config
  datasetName?: string;
}

export interface MetricsFactory {
  create(config: MetricsConfig): Metrics;
}
