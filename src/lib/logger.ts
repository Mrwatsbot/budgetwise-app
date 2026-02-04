/**
 * Structured Logger for Production
 * Outputs JSON logs that integrate with Vercel's log drain
 * No external dependencies - uses console.log for Vercel's native collection
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  error?: Error | string;
  stack?: string;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  environment: string;
}

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Formats and outputs a structured log entry
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  // Skip debug logs in production
  if (level === 'debug' && isProduction) {
    return;
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.NODE_ENV || 'development',
  };

  // Add context if provided
  if (context) {
    // Extract error details if error object is provided
    if (context.error instanceof Error) {
      entry.context = {
        ...context,
        error: context.error.message,
        stack: context.error.stack,
      };
    } else {
      entry.context = context;
    }
  }

  // In development, pretty print for readability
  if (isDevelopment) {
    const color = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
    }[level];
    const reset = '\x1b[0m';
    
    console.log(`${color}[${level.toUpperCase()}]${reset} ${message}`);
    if (context) {
      console.log(JSON.stringify(context, null, 2));
    }
    return;
  }

  // In production, output JSON for log aggregation
  console.log(JSON.stringify(entry));
}

/**
 * Structured logger with level methods
 */
export const logger = {
  debug(message: string, context?: LogContext): void {
    log('debug', message, context);
  },

  info(message: string, context?: LogContext): void {
    log('info', message, context);
  },

  warn(message: string, context?: LogContext): void {
    log('warn', message, context);
  },

  error(message: string, context?: LogContext): void {
    log('error', message, context);
  },
};

/**
 * Client-safe logger (no sensitive server data)
 * Use this for client-side logging
 */
export const clientLogger = {
  info(message: string, context?: Omit<LogContext, 'userId'>): void {
    // In browser, just use console
    if (typeof window !== 'undefined') {
      console.log(`[INFO] ${message}`, context);
    }
  },

  warn(message: string, context?: Omit<LogContext, 'userId'>): void {
    if (typeof window !== 'undefined') {
      console.warn(`[WARN] ${message}`, context);
    }
  },

  error(message: string, context?: Omit<LogContext, 'userId'>): void {
    if (typeof window !== 'undefined') {
      console.error(`[ERROR] ${message}`, context);
    }
  },
};
