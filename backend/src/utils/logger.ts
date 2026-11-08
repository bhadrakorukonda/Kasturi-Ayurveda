// Structured logger, no dependency.
//
//   production: one JSON object per line -> {"time","level","msg",...fields}
//               (Render's log search can filter on these fields)
//   development: readable "12:00:01 INFO  msg key=value"
//   test: silent unless LOG_LEVEL is set
//
// Reads process.env directly (not config/env.ts) so env.ts itself can log.
//
// Rule: never pass patient data or secrets. As a safety net, fields whose
// key looks sensitive are replaced with "[redacted]" at any depth.

type Level = 'debug' | 'info' | 'warn' | 'error';
type Fields = Record<string, unknown>;

const LEVELS: Record<Level | 'silent', number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

const nodeEnv = process.env.NODE_ENV ?? 'development';
const configured = process.env.LOG_LEVEL as Level | 'silent' | undefined;
const threshold = LEVELS[configured && configured in LEVELS ? configured : nodeEnv === 'test' ? 'silent' : 'info'];
const json = nodeEnv !== 'development';

const SENSITIVE_KEY =
  /^(authorization|cookie|set-cookie|password|newpassword|currentpassword|token|accesstoken|refreshtoken|.*secret|.*apikey|api-key|email|phone|symptoms|age|name|patient)$/i;

const MAX_DEPTH = 5;

const sanitize = (value: unknown, depth = 0): unknown => {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (value === null || typeof value !== 'object') return value;
  if (depth >= MAX_DEPTH) return '[truncated]';
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));
  if (value instanceof Date) return value.toISOString();

  const out: Fields = {};
  for (const [key, v] of Object.entries(value as Fields)) {
    out[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : sanitize(v, depth + 1);
  }
  return out;
};

const pretty = (level: Level, msg: string, fields: Fields): string => {
  const time = new Date().toISOString().slice(11, 19);
  const extras = Object.entries(fields)
    .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(' ');
  return `${time} ${level.toUpperCase().padEnd(5)} ${msg}${extras ? `  ${extras}` : ''}`;
};

const write = (level: Level, msg: string, fields: Fields = {}): void => {
  if (LEVELS[level] < threshold) return;
  const safe = sanitize(fields) as Fields;
  const line = json ? JSON.stringify({ time: new Date().toISOString(), level, msg, ...safe }) : pretty(level, msg, safe);
  if (level === 'error' || level === 'warn') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
};

export interface Logger {
  debug: (msg: string, fields?: Fields) => void;
  info: (msg: string, fields?: Fields) => void;
  warn: (msg: string, fields?: Fields) => void;
  error: (msg: string, fields?: Fields) => void;
  child: (bindings: Fields) => Logger;
}

const make = (bindings: Fields): Logger => ({
  debug: (msg, fields) => write('debug', msg, { ...bindings, ...fields }),
  info: (msg, fields) => write('info', msg, { ...bindings, ...fields }),
  warn: (msg, fields) => write('warn', msg, { ...bindings, ...fields }),
  error: (msg, fields) => write('error', msg, { ...bindings, ...fields }),
  child: (more) => make({ ...bindings, ...more }),
});

export const logger = make({});

// Exported for tests.
export const sanitizeForLog = sanitize;
