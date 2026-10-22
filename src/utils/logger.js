/**
 * Minimal logger. Debug output is silent unless enabled with `setDebug(true)`.
 */

let debugEnabled = false;

export function setDebug(enabled) {
  debugEnabled = Boolean(enabled);
}

export const logger = {
  debug: (...args) => { if (debugEnabled) console.log(...args); },
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args)
};
