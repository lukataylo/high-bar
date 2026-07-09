import { InMemoryQuestionService } from "./service.js";
import { connectStdio, createMcpServer } from "./mcp.js";

/**
 * Dev entrypoint: serve the four core tools over stdio backed by the in-memory
 * fake. A production deployment injects a DB/payments-backed QuestionService.
 */
const service = new InMemoryQuestionService();
const server = createMcpServer(service);
await connectStdio(server);
