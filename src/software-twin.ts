import type { Provenance, SoftwareTwin } from "./types.js";

const commit = "eae8fd801fc142f29e675fa36dc8c89a899ea18d";
const root = `https://github.com/baseerkhan/nr-lesson-final/blob/${commit}`;
const retrievedAt = "2026-09-19";

const code = (id: string, label: string, path: string): Provenance => ({
  id,
  label,
  url: `${root}/${path}`,
  retrievedAt,
});

export const softwareTwin: SoftwareTwin = {
  name: "AI Leadership Course Application",
  repository: "baseerkhan/nr-lesson-final",
  commit,
  capturedAt: "2026-09-19T00:00:00-07:00",
  facts: [
    {
      id: "actor-learner",
      kind: "actor",
      statement: "A learner interacts with the Streamlit pages and supplies prompts and tool inputs.",
      provenance: code("src-home-input", "Home.py, browser configuration input", "Home.py#L132-L139"),
    },
    {
      id: "actor-api-client",
      kind: "actor",
      statement: "An HTTP client can discover and invoke registered tool endpoints exposed by the FastAPI service.",
      provenance: code("src-mcp-routes", "mcpserver/main.py, tool routes", "mcpserver/main.py#L137-L185"),
    },
    {
      id: "actor-operator",
      kind: "actor",
      statement: "An operator starts the Streamlit application and local MCP service and supplies environment configuration.",
      provenance: code("src-readme-run", "README.md, setup and run steps", "README.md#L16-L31"),
    },
    {
      id: "component-browser",
      kind: "component",
      statement: "The presentation tier is a multi-page Streamlit web interface.",
      provenance: code("src-home-ui", "Home.py, Streamlit page", "Home.py#L19-L25"),
    },
    {
      id: "component-streamlit",
      kind: "component",
      statement: "The Streamlit process coordinates UI state, model access, persistence, and MCP health checks.",
      provenance: code("src-home-main", "Home.py, main application", "Home.py#L27-L43"),
    },
    {
      id: "component-mcp",
      kind: "component",
      statement: "A FastAPI service exposes tool discovery and invocation endpoints.",
      provenance: code("src-mcp-api", "mcpserver/main.py, FastAPI service", "mcpserver/main.py#L18-L23"),
    },
    {
      id: "asset-model-key",
      kind: "asset",
      statement: "An OpenAI API key is accepted from session state or the server environment and is used by model clients.",
      provenance: code("src-key-resolution", "utils/config.py, key resolution", "utils/config.py#L28-L50"),
    },
    {
      id: "asset-prompts",
      kind: "asset",
      statement: "Learner prompts and model responses cross the application-to-model-provider boundary.",
      provenance: code("src-tool-call", "pages/4_ToolCalling.py, model tool-call flow", "pages/4_ToolCalling.py#L151-L175"),
    },
    {
      id: "asset-course-data",
      kind: "asset",
      statement: "Course knowledge and conversation memory are persisted in local XLSX files.",
      provenance: code("src-data-files", "Repository data directory", "data"),
    },
    {
      id: "entry-ui",
      kind: "entry-point",
      statement: "Streamlit text inputs accept learner-controlled strings.",
      provenance: code("src-ui-input", "pages/4_ToolCalling.py, user input", "pages/4_ToolCalling.py#L169-L175"),
    },
    {
      id: "entry-tool-call",
      kind: "entry-point",
      statement: "POST /tools/{tool_name}/call accepts a tool name in the path and parameters in a JSON request body.",
      provenance: code("src-tool-endpoint", "mcpserver/main.py, tool invocation endpoint", "mcpserver/main.py#L170-L185"),
    },
    {
      id: "auth-not-found",
      kind: "authentication",
      statement: "No application authentication check is present on the inspected Streamlit or FastAPI entry points; deployment-layer authentication is unknown.",
      provenance: code("src-tool-no-auth", "mcpserver/main.py, public route declarations", "mcpserver/main.py#L137-L185"),
    },
    {
      id: "authz-not-found",
      kind: "authorization",
      statement: "No role, ownership, or per-tool authorization decision is present in the inspected tool route.",
      provenance: code("src-tool-no-authz", "mcpserver/main.py, tool lookup and call", "mcpserver/main.py#L170-L185"),
    },
    {
      id: "store-xlsx",
      kind: "store",
      statement: "The application reads and writes its knowledge base under data/knowledge_base.xlsx.",
      provenance: code("src-data-store", "utils/data_loader.py, workbook persistence", "utils/data_loader.py#L87-L125"),
    },
    {
      id: "external-openai",
      kind: "external-service",
      statement: "The application initializes an OpenAI client and makes model requests from the Streamlit process.",
      provenance: code("src-openai-client", "pages/4_ToolCalling.py, external model client", "pages/4_ToolCalling.py#L151-L175"),
    },
    {
      id: "boundary-browser-app",
      kind: "boundary",
      statement: "Trust boundary B1 separates an untrusted browser session from the Streamlit server process.",
      provenance: code("src-b1", "Home.py, Streamlit UI boundary", "Home.py#L132-L157"),
    },
    {
      id: "boundary-app-mcp",
      kind: "boundary",
      statement: "Trust boundary B2 separates the Streamlit process from the FastAPI tool service over loopback HTTP by default.",
      provenance: code("src-b2", "utils/config.py, MCP service URL", "utils/config.py#L16-L18"),
    },
    {
      id: "boundary-app-provider",
      kind: "boundary",
      statement: "Trust boundary B3 separates the application process from an external model provider.",
      provenance: code("src-b3", "pages/4_ToolCalling.py, provider call", "pages/4_ToolCalling.py#L151-L175"),
    },
    {
      id: "boundary-app-files",
      kind: "boundary",
      statement: "Trust boundary B4 separates the application process from local workbook persistence.",
      provenance: code("src-b4", "utils/data_loader.py, local file access", "utils/data_loader.py#L87-L125"),
    },
    {
      id: "control-schema",
      kind: "control",
      statement: "FastAPI/Pydantic request models validate the outer shape of tool-call parameters.",
      provenance: code("src-schema-control", "mcpserver/main.py, typed request model", "mcpserver/main.py#L170-L182"),
    },
    {
      id: "control-tool-allowlist",
      kind: "control",
      statement: "Tool execution is restricted to names registered in an in-process allowlist.",
      provenance: code("src-tool-control", "mcpserver/main.py, tool registry lookup", "mcpserver/main.py#L170-L181"),
    },
    {
      id: "control-health-timeout",
      kind: "control",
      statement: "The Streamlit process uses a two-second timeout for MCP health checks.",
      provenance: code("src-timeout-control", "utils/config.py, health timeout", "utils/config.py#L63-L70"),
    },
    {
      id: "control-key-fragments-exposed",
      kind: "control",
      statement: "The baseline UI and debug logging expose fragments of the model-provider API key rather than keeping the credential fully opaque.",
      provenance: code("src-key-fragment", "utils/config.py, key fragment logging", "utils/config.py#L28-L58"),
    },
    {
      id: "control-rate-limit-not-found",
      kind: "unknown",
      statement: "No request-size, rate, concurrency, or per-caller quota is present on the inspected tool invocation route.",
      provenance: code("src-no-rate-limit", "mcpserver/main.py, tool invocation route", "mcpserver/main.py#L170-L185"),
    },
    {
      id: "control-raw-error",
      kind: "control",
      statement: "The tool route returns the caught exception text in its HTTP error detail.",
      provenance: code("src-error-detail", "mcpserver/main.py, exception response", "mcpserver/main.py#L179-L185"),
    },
    {
      id: "control-unlocked-dependencies",
      kind: "unknown",
      statement: "Python dependencies use lower-bound version ranges and the repository has no Python lockfile.",
      provenance: code("src-dependency-ranges", "requirements.txt, dependency ranges", "requirements.txt"),
    },
    {
      id: "unknown-deployment-auth",
      kind: "unknown",
      statement: "Whether a production reverse proxy adds authentication, TLS, origin checks, or network restrictions is not documented in the repository.",
      provenance: code("src-unknown-deploy", "README.md, documented deployment scope", "README.md#L16-L31"),
    },
    {
      id: "unknown-audit-retention",
      kind: "unknown",
      statement: "Audit-event identity, retention, integrity protection, and alerting are not documented.",
      provenance: code("src-unknown-audit", "mcpserver/main.py, logging configuration", "mcpserver/main.py#L25-L41"),
    },
    {
      id: "unknown-file-permissions",
      kind: "unknown",
      statement: "Runtime filesystem permissions and workbook backup controls are not documented.",
      provenance: code("src-unknown-files", "utils/data_loader.py, file operations", "utils/data_loader.py#L87-L125"),
    },
  ],
  flows: [
    {
      id: "browser-to-streamlit",
      label: "Learner input → Streamlit",
      from: "Learner browser",
      to: "Streamlit application",
      data: ["prompt text", "configuration input", "session state"],
      boundaryIds: ["boundary-browser-app"],
      factIds: ["actor-learner", "component-browser", "component-streamlit", "entry-ui", "auth-not-found", "asset-model-key", "control-key-fragments-exposed"],
    },
    {
      id: "streamlit-to-mcp",
      label: "Streamlit → tool API",
      from: "Streamlit application",
      to: "FastAPI tool service",
      data: ["tool name", "tool parameters", "tool result"],
      boundaryIds: ["boundary-app-mcp"],
      factIds: ["component-streamlit", "component-mcp", "entry-tool-call", "auth-not-found", "authz-not-found", "control-schema", "control-tool-allowlist", "control-rate-limit-not-found", "control-raw-error", "control-unlocked-dependencies", "unknown-audit-retention"],
    },
    {
      id: "streamlit-to-provider",
      label: "Streamlit → model provider",
      from: "Streamlit application",
      to: "External model API",
      data: ["API credential", "learner prompt", "tool result", "model response"],
      boundaryIds: ["boundary-app-provider"],
      factIds: ["component-streamlit", "external-openai", "asset-model-key", "asset-prompts", "control-key-fragments-exposed"],
    },
    {
      id: "application-to-workbook",
      label: "Application → workbook store",
      from: "Application process",
      to: "Local XLSX files",
      data: ["course knowledge", "embeddings", "conversation memory"],
      boundaryIds: ["boundary-app-files"],
      factIds: ["component-streamlit", "store-xlsx", "asset-course-data", "unknown-file-permissions", "unknown-audit-retention"],
    },
  ],
};

export const factById = new Map(softwareTwin.facts.map((fact) => [fact.id, fact]));
