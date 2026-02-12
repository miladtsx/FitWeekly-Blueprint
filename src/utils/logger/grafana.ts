/**
 * Grafana Loki logger backend - sends logs to Grafana Cloud via Loki HTTP API.
 *
 * Configure via environment variables:
 * - GRAFANA_ENDPOINT: Loki HTTP URL (e.g., https://logs-prod-us-central1.grafana.net/loki/api/v1/push)
 * - GRAFANA_API_KEY: API key or Basic auth credentials (base64 encoded)
 * - GRAFANA_LOG_LEVEL: Minimum log level (debug, info, warn, error)
 */

import type { Logger, LogLevel } from './types';

export interface GrafanaConfig {
  endpoint: string;
  apiKey?: string;
  labels?: Record<string, string>;
}

export function createGrafanaLogger(
  config: GrafanaConfig,
  minLevel?: LogLevel,
): Logger {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey) {
    // Support both API key directly or Basic auth (user:password base64)
    if (config.apiKey.includes(':')) {
      headers['Authorization'] = `Basic ${config.apiKey}`;
    } else {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }
  }

  const defaultLabels = {
    app: 'fitness-bot',
    ...config.labels,
  };

  return {
    debug(message: string, data?: Record<string, unknown>) {
      if (!shouldLog(minLevel, 'debug')) return;
      sendLog('debug', message, data, { ...defaultLabels });
    },

    info(message: string, data?: Record<string, unknown>) {
      if (!shouldLog(minLevel, 'info')) return;
      sendLog('info', message, data, defaultLabels);
    },

    warn(message: string, data?: Record<string, unknown>) {
      if (!shouldLog(minLevel, 'warn')) return;
      sendLog('warn', message, data, defaultLabels);
    },

    error(message: string, data?: Record<string, unknown>) {
      if (!shouldLog(minLevel, 'error')) return;
      sendLog('error', message, data, defaultLabels);
    },
  };

  async function sendLog(
    level: LogLevel,
    message: string,
    data: Record<string, unknown> | undefined,
    labels: Record<string, string>,
  ) {
    const timestamp = Date.now() * 1_000_000; // nanoseconds
    const logLine = JSON.stringify({
      level,
      message,
      ...(data && Object.keys(data).length > 0 && { data }),
    });

    const payload = {
      streams: [
        {
          stream: labels,
          values: [[String(timestamp), logLine]],
        },
      ],
    };

    try {
      await fetch(config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // Fallback to console if Grafana is unreachable
      console.error('Failed to send log to Grafana:', err);
      console.log(logLine);
    }
  }
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(configLevel: LogLevel | undefined, messageLevel: LogLevel): boolean {
  const minLevel = configLevel ?? 'info';
  return LEVEL_ORDER[messageLevel] >= LEVEL_ORDER[minLevel];
}

/**
 * Factory function for creating Grafana logger from wrangler vars.
 * Add to wrangler.toml:
 * [vars]
 * GRAFANA_ENDPOINT = "https://..."
 * GRAFANA_API_KEY = "..."
 */
export function createGrafanaLoggerFromEnv(
  env: Record<string, string | undefined>,
  minLevel?: LogLevel,
): Logger | null {
  const endpoint = env.GRAFANA_ENDPOINT;
  if (!endpoint) {
    return null;
  }

  return createGrafanaLogger({
    endpoint,
    apiKey: env.GRAFANA_API_KEY,
  }, minLevel);
}
