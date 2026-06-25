import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListDomainsInput,
  ListDomainsOutput,
  PricingInput,
  PricingOutput,
  SubmitQuestionInput,
  SubmitQuestionOutput,
  QuestionStatusInput,
  QuestionStatusOutput,
} from "@high-bar/core/contracts";
import type { QuestionService } from "./service.js";

const SERVER_NAME = "high-bar-expert-network";
const SERVER_VERSION = "0.0.0";

/** Render a structured tool result as both text content and structuredContent. */
function toResult(payload: Record<string, unknown>): {
  content: { type: "text"; text: string }[];
  structuredContent: Record<string, unknown>;
} {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    structuredContent: payload,
  };
}

/**
 * Build an MCP server exposing the four core tools, delegating to the injected
 * {@link QuestionService}. Every input and output is validated against the exact
 * core contract schemas, so the MCP surface cannot drift from the REST surface.
 */
export function createMcpServer(service: QuestionService): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  server.registerTool(
    "list_domains",
    {
      title: "List domains",
      description: "List the expert domains questions can be routed into.",
      inputSchema: ListDomainsInput.shape,
      outputSchema: ListDomainsOutput.shape,
    },
    async () => {
      const result = ListDomainsOutput.parse(await service.listDomains());
      return toResult(result);
    },
  );

  server.registerTool(
    "pricing",
    {
      title: "Pricing",
      description: "Get the price and SLA for a vetted answer in a given domain.",
      inputSchema: PricingInput.shape,
      outputSchema: PricingOutput.shape,
    },
    async (args) => {
      const { domain } = PricingInput.parse(args);
      const result = PricingOutput.parse(await service.getPricing(domain));
      return toResult(result);
    },
  );

  server.registerTool(
    "submit_question",
    {
      title: "Submit question",
      description:
        "Submit a question for a vetted expert answer. You can attach up to 5 code examples via `codeExamples` " +
        "(each with a `language`, optional `filename`, and the `code` itself up to 6000 chars) — include the failing " +
        "snippet, stack trace, or the exact code in question so the expert answers with full context instead of a " +
        "paraphrase. Returns a payment client secret when an escrow hold is required.",
      inputSchema: SubmitQuestionInput.shape,
      outputSchema: SubmitQuestionOutput.shape,
    },
    async (args) => {
      const input = SubmitQuestionInput.parse(args);
      const result = SubmitQuestionOutput.parse(await service.submitQuestion(input));
      return toResult(result);
    },
  );

  server.registerTool(
    "question_status",
    {
      title: "Question status",
      description: "Check the status of a submitted question and retrieve the answer once available.",
      inputSchema: QuestionStatusInput.shape,
      outputSchema: QuestionStatusOutput.shape,
    },
    async (args) => {
      const { questionId } = QuestionStatusInput.parse(args);
      const result = QuestionStatusOutput.parse(await service.getQuestionStatus(questionId));
      return toResult(result);
    },
  );

  return server;
}

/** Connect a server to stdio (the standard MCP transport for CLI agents). */
export async function connectStdio(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
