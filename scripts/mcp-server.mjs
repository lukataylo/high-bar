#!/usr/bin/env node
// High Bar MCP server — lets an AI agent (Claude Code, etc.) ask a vetted human
// expert when it's stuck. Exposes one tool, `ask_expert`, that calls the live
// High Bar API and returns the routed question + matched experts as JSON.
//
// Add to Claude Code:
//   claude mcp add highbar -- node /absolute/path/to/scripts/mcp-server.mjs
// Then your agent can call the `ask_expert` tool. Override the target with
//   HIGHBAR_URL=https://highbar.dev  (default).

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = process.env.HIGHBAR_URL || "https://highbar.dev";

const server = new McpServer({ name: "highbar", version: "1.0.0" });

server.registerTool(
  "ask_expert",
  {
    title: "Ask a vetted human expert (High Bar)",
    description:
      "When you're stuck or facing a judgment call a repo/docs can't resolve, ask a vetted human expert via High Bar. Returns the routed question id, status, and the matched experts. Use for ambiguous requirements, domain calls (payments, security, healthcare, legal, finance), or high-stakes/irreversible decisions.",
    inputSchema: {
      question: z.string().min(8).describe("The question to ask a human expert"),
      context: z.string().optional().describe("Optional extra context (stack trace, constraints, what you already tried)"),
    },
  },
  async ({ question, context }) => {
    try {
      const res = await fetch(new URL("/api/ask", BASE), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, context, requester: "MCP agent" }),
      });
      const data = await res.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: `High Bar ask failed: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`High Bar MCP server ready — tool: ask_expert -> ${BASE}`);
