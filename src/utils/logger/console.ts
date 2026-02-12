/**
 * Console logger backend - outputs logs to stdout/stderr.
 */

import type { Logger, LogLevel } from './types';

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

export function createConsoleLogger(
  level?: LogLevel,
): Logger {
  return {
    debug(message: string, data?: Record<string, unknown>) {
      if (!shouldLog(level, 'debug')) return;
      console.debug(formatLog('debug', message, data));
    },

    info(message: string, data?: Record<string, unknown>) {
      if (!shouldLog(level, 'info')) return;
      console.info(formatLog('info', message, data));
    },

    warn(message: string, data?: Record<string, unknown>) {
      if (!shouldLog(level, 'warn')) return;
      console.warn(formatLog('warn', message, data));
    },

    error(message: string, data?: Record<string, unknown>) {
      if (!shouldLog(level, 'error')) return;
      console.error(formatLog('error', message, data));
    },
  };
}

function formatLog(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>,
): string {
  const entry: Record<string, unknown> = {
    level,
    message,
  };

  if (data && Object.keys(data).length > 0) {
    entry.data = data;
  }

  return JSON.stringify(entry);
}
