/**
 * Configuration shared by every tool.
 */
export const API_BASE_URL = process.env.CLASSSPHERE_API_URL ?? "http://127.0.0.1:8000/api/v1";

/** Keeps any single tool result readable inside a model context window. */
export const CHARACTER_LIMIT = 25_000;

export const DEFAULT_INSTITUTION_CODE = process.env.CLASSSPHERE_INSTITUTION_CODE ?? "INST-DEMO";

/** Request timeout for upstream calls, in milliseconds. */
export const REQUEST_TIMEOUT_MS = 30_000;

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}
