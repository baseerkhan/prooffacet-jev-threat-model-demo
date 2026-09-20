import { createHash, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createEvidencePack } from "./evidence-pack.js";
import { buildQuestions, buildState } from "./questions.js";
import { DeterministicThreatProvider } from "./providers/deterministic-provider.js";
import { JevThreatProvider, JevUnavailableError } from "./providers/jev-provider.js";
import { softwareTwin } from "./software-twin.js";
import { EvaluationStore } from "./storage.js";
import { threatCatalog, threatCatalogVersion } from "./threat-catalog.js";
import type { EvaluationRecord, HumanReview } from "./types.js";

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const publicDirectory = join(sourceDirectory, "..", "public");
const dataDirectory = process.env.PROOFFACET_DATA_DIR || join(process.cwd(), "data");
const maxRecords = Number(process.env.PROOFFACET_MAX_RECORDS || "250");
const store = new EvaluationStore(dataDirectory, Number.isFinite(maxRecords) ? maxRecords : 250);
const deterministicProvider = new DeterministicThreatProvider();
const port = Number(process.env.PORT || "8787");
const host = process.env.HOST || "127.0.0.1";

type Task<T> = () => Promise<T>;
const queue: Array<{
  task: Task<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];
let evaluationRunning = false;

function enqueue<T>(task: Task<T>): Promise<T> {
  if (queue.length >= 5) {
    return Promise.reject(new Error("The bounded evaluation queue is full. Try again shortly."));
  }
  return new Promise<T>((resolve, reject) => {
    queue.push({
      task,
      resolve: (value) => resolve(value as T),
      reject,
    });
    void drainQueue();
  });
}

async function drainQueue(): Promise<void> {
  if (evaluationRunning) return;
  const next = queue.shift();
  if (!next) return;
  evaluationRunning = true;
  try {
    next.resolve(await next.task());
  } catch (error) {
    next.reject(error);
  } finally {
    evaluationRunning = false;
    void drainQueue();
  }
}

function securityHeaders(response: ServerResponse): void {
  response.setHeader("Content-Security-Policy", "default-src 'self'; connect-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

function json(response: ServerResponse, status: number, body: unknown): void {
  securityHeaders(response);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const contentType = request.headers["content-type"] || "";
  if (!contentType.startsWith("application/json")) throw new Error("Expected application/json.");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 32_768) throw new Error("Request body is too large.");
    chunks.push(buffer);
  }
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected a JSON object.");
  return parsed as Record<string, unknown>;
}

const windows = new Map<string, { count: number; resetAt: number }>();
const evaluationWindows = new Map<string, { count: number; resetAt: number }>();

function clientAddress(request: IncomingMessage): string {
  const forwarded = request.headers["x-real-ip"];
  if (typeof forwarded === "string" && forwarded.length <= 64) return forwarded;
  return request.socket.remoteAddress || "unknown";
}

function rateLimited(request: IncomingMessage): boolean {
  const now = Date.now();
  const key = clientAddress(request);
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 30;
}

function evaluationRateLimited(request: IncomingMessage): boolean {
  const now = Date.now();
  const key = clientAddress(request);
  const current = evaluationWindows.get(key);
  if (!current || current.resetAt <= now) {
    evaluationWindows.set(key, { count: 1, resetAt: now + 600_000 });
    return false;
  }
  current.count += 1;
  return current.count > 3;
}

async function runEvaluation(flowId: string): Promise<EvaluationRecord> {
  const state = buildState(flowId);
  const questions = buildQuestions();
  const deterministic = await deterministicProvider.evaluate(state, questions);
  const jev = await new JevThreatProvider().evaluate(state, questions);
  const createdAt = new Date().toISOString();
  const stateHash = createHash("sha256").update(JSON.stringify(state)).digest("hex");
  const record: EvaluationRecord = {
    id: randomUUID(),
    createdAt,
    stateHash,
    catalogVersion: threatCatalogVersion,
    selectedFlowId: flowId,
    deterministic,
    jev,
  };
  await store.save(record);
  return record;
}

function validReview(body: Record<string, unknown>): HumanReview | null {
  if (body.action !== "approved" && body.action !== "rejected" && body.action !== "overridden") return null;
  if (typeof body.reason !== "string" || body.reason.trim().length < 8 || body.reason.length > 500) return null;
  const reviewer = typeof body.reviewer === "string" ? body.reviewer.trim() : "Demo reviewer";
  if (reviewer.length < 2 || reviewer.length > 80) return null;
  return {
    action: body.action,
    reason: body.reason.trim(),
    reviewer,
    reviewedAt: new Date().toISOString(),
  };
}

async function serveStatic(pathname: string, response: ServerResponse): Promise<boolean> {
  const files: Record<string, string> = {
    "/": "index.html",
    "/index.html": "index.html",
    "/app.js": "app.js",
    "/styles.css": "styles.css",
    "/favicon.svg": "favicon.svg",
  };
  const file = files[pathname];
  if (!file) return false;
  const contentTypes: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml; charset=utf-8",
  };
  securityHeaders(response);
  response.statusCode = 200;
  response.setHeader("Cache-Control", file === "index.html" ? "no-cache" : "public, max-age=3600");
  response.setHeader("Content-Type", contentTypes[extname(file)] || "application/octet-stream");
  response.end(await readFile(join(publicDirectory, file)));
  return true;
}

async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (rateLimited(request)) return json(response, 429, { error: "Request limit reached. Try again shortly." });
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (request.method === "GET" && pathname === "/api/health") {
    return json(response, 200, { status: "ok", ready: Boolean(process.env.TYPESAFE_API_KEY) });
  }
  if (request.method === "GET" && pathname === "/api/context") {
    return json(response, 200, {
      softwareTwin,
      threatCatalog,
      questionPayloads: buildQuestions(),
      requestStates: Object.fromEntries(
        softwareTwin.flows.map((flow) => [flow.id, buildState(flow.id)]),
      ),
      catalogVersion: threatCatalogVersion,
      methodology: {
        jev: "18 independent Noul applicability judgments batched over one versioned flow state.",
        deterministic: "Fixed evidence-ID rules over the same state.",
        human: "Approve, reject, or override with a reason.",
        excluded: "No conventional generative LLM is executed in this experiment.",
      },
    });
  }
  if (request.method === "POST" && pathname === "/api/evaluations") {
    if (evaluationRateLimited(request)) {
      response.setHeader("Retry-After", "600");
      return json(response, 429, { error: "Evaluation limit reached. Try again in ten minutes." });
    }
    const body = await readJson(request);
    if (typeof body.flowId !== "string" || !softwareTwin.flows.some((flow) => flow.id === body.flowId)) {
      return json(response, 400, { error: "Choose a documented SoftwareTwin flow." });
    }
    const record = await enqueue(() => runEvaluation(body.flowId as string));
    return json(response, 201, record);
  }

  const evaluationMatch = pathname.match(/^\/api\/evaluations\/([a-f0-9-]{36})$/);
  if (request.method === "GET" && evaluationMatch?.[1]) {
    const record = await store.get(evaluationMatch[1]);
    return record ? json(response, 200, record) : json(response, 404, { error: "Evaluation not found." });
  }
  const reviewMatch = pathname.match(/^\/api\/evaluations\/([a-f0-9-]{36})\/review$/);
  if (request.method === "POST" && reviewMatch?.[1]) {
    const review = validReview(await readJson(request));
    if (!review) return json(response, 400, { error: "Select an action and provide a reason of 8–500 characters." });
    const record = await store.review(reviewMatch[1], review);
    return record ? json(response, 200, record) : json(response, 404, { error: "Evaluation not found." });
  }
  const packMatch = pathname.match(/^\/api\/evaluations\/([a-f0-9-]{36})\/evidence-pack$/);
  if (request.method === "GET" && packMatch?.[1]) {
    const record = await store.get(packMatch[1]);
    if (!record) return json(response, 404, { error: "Evaluation not found." });
    securityHeaders(response);
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Content-Disposition", `attachment; filename=prooffacet-evidence-pack-${record.id}.json`);
    response.end(`${JSON.stringify(createEvidencePack(record), null, 2)}\n`);
    return;
  }

  if (request.method === "GET" && await serveStatic(pathname, response)) return;
  json(response, 404, { error: "Not found." });
}

function safeError(error: unknown): { status: number; message: string } {
  if (error instanceof JevUnavailableError) {
    return { status: error.status === 429 ? 503 : 502, message: error.message };
  }
  if (error instanceof SyntaxError) return { status: 400, message: "Invalid JSON request." };
  if (error instanceof Error && (error.message.includes("queue") || error.message.includes("Expected") || error.message.includes("too large"))) {
    return { status: error.message.includes("queue") ? 503 : 400, message: error.message };
  }
  return { status: 500, message: "The request could not be completed." };
}

if (!process.env.TYPESAFE_API_KEY?.trim()) {
  throw new Error("Set TYPESAFE_API_KEY in the server environment before starting the experiment.");
}

const server = createServer((request, response) => {
  void handle(request, response).catch((error: unknown) => {
    const safe = safeError(error);
    json(response, safe.status, { error: safe.message });
  });
});
server.requestTimeout = 20_000;
server.headersTimeout = 10_000;
server.listen(port, host, () => {
  process.stdout.write(`ProofFacet experiment listening on http://${host}:${port}\n`);
});
