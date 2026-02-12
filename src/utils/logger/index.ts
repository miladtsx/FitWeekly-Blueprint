/**
 * Logger factory and utilities.
 *
 * Usage:
 *   import { createLogger, withRequestId } from './utils/logger';
 *
 * Backend selection (via env vars):
 *   - Default: console logging
 *   - GRAFANA_ENDPOINT set: Grafana Loki backend
 */

import type { Logger, LoggerConfig, LogLevel } from './types';
import { createConsoleLogger } from './console';
import { createGrafanaLoggerFromEnv } from './grafana';

export type { Logger, LogLevel, LoggerConfig };

/**
 * Create a logger instance based on configuration.
 *
 * @param config - Logger configuration
 * @returns Logger instance
 */
export function createLogger(config: LoggerConfig): Logger {
  switch (config.backend) {
    case 'grafana':
    case 'datadog':
      // For now, Grafana handles both via endpoint config
      // @dev Datadog would need its own implementation
      if (config.endpoint) {
        return createGrafanaLoggerFromEnv(
          {
            GRAFANA_ENDPOINT: config.endpoint,
            GRAFANA_API_KEY: config.apiKey,
          },
          config.level,
        ) ?? createConsoleLogger(config.level);
      }
      return createConsoleLogger(config.level);

    case 'console':
    default:
      return createConsoleLogger(config.level);
  }
}

/**
 * Create logger from environment variables.
 * Supports GRAFANA_ENDPOINT for Grafana Loki integration.
 *
 * @param env - Environment variables (from Cloudflare worker context)
 * @param defaultLevel - Default log level if not specified in env
 * @returns Logger instance
 */
export function createLoggerFromEnv(
  env: Record<string, string | undefined>,
  defaultLevel?: LogLevel,
): Logger {
  // Try Grafana first
  const grafanaLogger = createGrafanaLoggerFromEnv(env, defaultLevel);
  if (grafanaLogger) {
    return grafanaLogger;
  }

  // Fallback to console
  const level = (env.LOG_LEVEL as LogLevel) ?? defaultLevel ?? 'info';
  return createConsoleLogger(level);
}

/**
 * Wrap a logger to include requestId in all log entries.
 *
 * @param requestId - The request ID to include
 * @param logger - Base logger instance
 * @returns Logger that automatically includes requestId
 */
export function withRequestId(requestId: string, logger: Logger): Logger {
  return {
    debug(message: string, data?: Record<string, unknown>) {
      logger.debug(message, { requestId, ...data });
    },

    info(message: string, data?: Record<string, unknown>) {
      logger.info(message, { requestId, ...data });
    },

    warn(message: string, data?: Record<string, unknown>) {
      logger.warn(message, { requestId, ...data });
    },

    error(message: string, data?: Record<string, unknown>) {
      logger.error(message, { requestId, ...data });
    },
  };
}

/**
 * Generate a new request ID.
 * Uses crypto.randomUUID() for cryptographically secure IDs.
 */
export function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
