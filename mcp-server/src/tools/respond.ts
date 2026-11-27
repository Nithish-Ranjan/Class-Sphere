/**
 * Shared tool response helper: markdown for humans/models, JSON for programs.
 */
import type { CallToolResult } from "@modelcontextprotocol/server";

import { CHARACTER_LIMIT, ResponseFormat } from "../constants.js";
import { truncate } from "../format.js";

export function respond(data: unknown, markdown: string, format: ResponseFormat): CallToolResult {
  if (format === ResponseFormat.JSON) {
    const text = JSON.stringify(data, null, 2);
    const structured: Record<string, unknown> =
      typeof data === "object" && data !== null && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : { items: data };
    return {
      content: [{ type: "text", text: truncate(text, CHARACTER_LIMIT) }],
      structuredContent: structured
    };
  }
  return { content: [{ type: "text", text: markdown }] };
}
