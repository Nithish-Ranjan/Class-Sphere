#!/usr/bin/env node
/**
 * classsphere-mcp-server
 *
 * MCP server for the ClassSphere campus operations API. Serves stdio so any MCP
 * host (Claude Desktop, Inspector, an agent runtime) can sign in with a campus
 * account and work across the student, faculty and HOD consoles.
 */
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { API_BASE_URL } from "./constants.js";
import { registerReadTools } from "./tools/read.js";
import { registerSessionTools } from "./tools/session.js";
import { registerWriteTools } from "./tools/write.js";

export function createServer(): McpServer {
  const server = new McpServer({ name: "classsphere-mcp-server", version: "1.0.0" });

  registerSessionTools(server);
  registerReadTools(server);
  registerWriteTools(server);

  return server;
}

serveStdio(createServer);
console.error(`classsphere-mcp-server running on stdio (API: ${API_BASE_URL})`);
