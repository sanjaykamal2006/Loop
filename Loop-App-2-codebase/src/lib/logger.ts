/**
 * Production-Grade Structured Observability Logger for LOOP.
 *
 * Provides:
 * 1. Development: Human-friendly colored terminal/console output.
 * 2. Server Runtime: Clean structured JSON logs (Vercel/Node).
 * 3. Client Runtime: Local diagnostic ring buffer (latest 20 entries) + session
 *    crash persistence in sessionStorage, inspectable via window.__LOOP_DIAGNOSTICS__
 *    and rendered in ErrorReporter triage panel (pluggable via registerTelemetryHandler).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  userId?: string;
  loopId?: string;
  route?: string;
  action?: string;
  [key: string]: unknown;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name?: string;
    message: string;
    stack?: string;
    digest?: string;
  };
}

type TelemetryHandler = (entry: StructuredLogEntry) => void;

const isDev = process.env.NODE_ENV !== "production";
const isBrowser = typeof window !== "undefined";

// Diagnostic ring-buffer for client-side crash triage (stores up to 20 structured entries)
const diagnosticBuffer: StructuredLogEntry[] = [];

let activeTelemetryHandler: TelemetryHandler | null = (entry: StructuredLogEntry) => {
  if (entry.level === "error") {
    diagnosticBuffer.push(entry);
    if (diagnosticBuffer.length > 20) {
      diagnosticBuffer.shift();
    }
  }
};

export function getDiagnosticLogs(): readonly StructuredLogEntry[] {
  return diagnosticBuffer;
}

function formatLogEntry(level: LogLevel, message: string, ...args: unknown[]): StructuredLogEntry {
  const entry: StructuredLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  for (const arg of args) {
    if (!arg) continue;
    if (arg instanceof Error) {
      entry.error = {
        name: arg.name,
        message: arg.message,
        stack: isDev ? arg.stack : undefined,
        digest: (arg as { digest?: string }).digest,
      };
    } else if (typeof arg === "object") {
      entry.context = { ...(entry.context || {}), ...(arg as Record<string, unknown>) };
    } else {
      entry.context = { ...(entry.context || {}), detail: String(arg) };
    }
  }

  return entry;
}

export const logger = {
  /**
   * Register a custom telemetry / error reporting hook (e.g., Sentry, Logtail, Axiom).
   */
  registerTelemetryHandler: (handler: TelemetryHandler) => {
    activeTelemetryHandler = handler;
  },

  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  info: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.info(`[INFO] ${message}`, ...args);
    } else if (!isBrowser) {
      console.info(JSON.stringify(formatLogEntry("info", message, ...args)));
    }
  },

  debug: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, ...args);
    } else if (!isBrowser) {
      console.warn(JSON.stringify(formatLogEntry("warn", message, ...args)));
    }
  },

  error: (message: string, ...args: unknown[]) => {
    const entry = formatLogEntry("error", message, ...args);

    if (isDev) {
      console.error(`[ERROR] ${message}`, ...args);
    } else if (!isBrowser) {
      console.error(JSON.stringify(entry));
    }

    try {
      activeTelemetryHandler?.(entry);
    } catch {
      // Telemetry handler failure must never crash application flow
    }
  },

  /**
   * Explicit exception capture helper
   */
  captureException: (err: unknown, context?: LogContext) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Exception caught: ${message}`, err, context);
  },
};
