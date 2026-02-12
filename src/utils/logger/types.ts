/**
 * Logger types and interfaces for the observability abstraction layer.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  data?: Record<string, unknown>;
}

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

export type LoggerBackend =
  | "console"
  | "grafana"
  | "datadog"
  | "analytics_engine";

export interface LoggerConfig {
  backend: LoggerBackend;
  level?: LogLevel;
  // Grafana/Datadog config
  endpoint?: string;
  apiKey?: string;
  // Analytics Engine config
  datasetName?: string;
}

export interface LoggerFactory {
  create(config: LoggerConfig): Logger;
  withRequestId(requestId: string): Logger;
}
