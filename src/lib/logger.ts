/**
 * Structured JSON logger for production observability.
 * Outputs to stdout — Vercel captures these automatically.
 * Each log line is a JSON object with consistent fields.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, fields?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: "sanction-shield",
    ...fields,
  };

  const output = JSON.stringify(entry);

  switch (level) {
    case "error":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

export const logger = {
  info: (message: string, fields?: Record<string, unknown>) => emit("info", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => emit("warn", message, fields),
  error: (message: string, fields?: Record<string, unknown>) => emit("error", message, fields),
  debug: (message: string, fields?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") emit("debug", message, fields);
  },

  /** Log an API request with standard fields */
  request: (params: {
    method: string;
    path: string;
    status: number;
    latencyMs: number;
    orgId?: string;
    userId?: string;
    requestId?: string;
    error?: string;
  }) => {
    const level: LogLevel = params.status >= 500 ? "error" : params.status >= 400 ? "warn" : "info";
    emit(level, `${params.method} ${params.path} ${params.status}`, {
      http_method: params.method,
      http_path: params.path,
      http_status: params.status,
      latency_ms: params.latencyMs,
      org_id: params.orgId,
      user_id: params.userId,
      request_id: params.requestId,
      error: params.error,
    });
  },

  /** Log a screening event */
  screening: (params: {
    type: "single" | "batch";
    orgId: string;
    inputName?: string;
    matchesFound: number;
    latencyMs: number;
    requestId: string;
    decision?: string;
  }) => {
    emit("info", `screening.${params.type}`, {
      screening_type: params.type,
      org_id: params.orgId,
      input_name: params.inputName,
      matches_found: params.matchesFound,
      latency_ms: params.latencyMs,
      request_id: params.requestId,
      decision: params.decision,
    });
  },

  /** Log a cron/system event */
  system: (event: string, details?: Record<string, unknown>) => {
    emit("info", `system.${event}`, { event_type: event, ...details });
  },
};
