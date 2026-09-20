const state = {
  context: null,
  evaluation: null,
};

const $ = (selector) => document.querySelector(selector);
const apiUrl = (path) => new URL(`api/${path}`, document.baseURI).toString();
const dispositionLabel = {
  "likely-applicable": "Likely applicable",
  "uncertain": "Uncertain",
  "unlikely-applicable": "Unlikely",
};
const dispositionRank = {
  "likely-applicable": 0,
  "uncertain": 1,
  "unlikely-applicable": 2,
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setStatus(message, kind = "") {
  const status = $("#run-status");
  status.textContent = message;
  status.className = `run-status ${kind}`.trim();
}

async function request(path, options) {
  const response = await fetch(apiUrl(path), options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "The request could not be completed.");
  return body;
}

function renderContext(context) {
  $("#short-sha").textContent = context.softwareTwin.commit.slice(0, 12);
  const select = $("#flow-select");
  select.replaceChildren();
  for (const flow of context.softwareTwin.flows) {
    const option = element("option", "", flow.label);
    option.value = flow.id;
    select.append(option);
  }
  updateFlowDescription();

  const facts = context.softwareTwin.facts.filter((fact) =>
    ["authentication", "control", "unknown"].includes(fact.kind),
  ).slice(0, 3);
  const factRow = $("#fact-row");
  factRow.replaceChildren();
  for (const fact of facts) {
    const item = element("div", "fact");
    item.append(element("span", "", fact.kind));
    const link = element("a", "", fact.statement);
    link.href = fact.provenance.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    item.append(link);
    factRow.append(item);
  }

  const sources = new Map();
  for (const threat of context.threatCatalog) sources.set(threat.source.id, threat.source);
  for (const fact of context.softwareTwin.facts) sources.set(fact.provenance.id, fact.provenance);
  const sourceList = $("#sources");
  sourceList.replaceChildren();
  for (const source of [...sources.values()].slice(0, 15)) {
    const link = element("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.append(element("span", "", source.label), element("span", "", "↗"));
    sourceList.append(link);
  }
}

function updateFlowDescription() {
  if (!state.context) return;
  const flow = state.context.softwareTwin.flows.find((item) => item.id === $("#flow-select").value);
  $("#flow-description").textContent = flow
    ? `${flow.from} → ${flow.to} · ${flow.data.join(" · ")}`
    : "Choose a documented flow.";
}

function decisionCell(decision, showProbability = false) {
  const wrapper = element("div");
  const pill = element(
    "span",
    `pill pill-${decision.disposition.replace("-applicable", "")}`,
    dispositionLabel[decision.disposition],
  );
  wrapper.append(pill);
  if (showProbability && decision.probability !== null) {
    wrapper.append(element("span", "probability", `${Math.round(decision.probability * 100)}% probability of yes`));
  }
  return wrapper;
}

function renderEvaluation(record) {
  state.evaluation = record;
  $("#results").hidden = false;
  $("#rules-time").textContent = record.deterministic.durationMs.toLocaleString();
  $("#jev-time").textContent = record.jev.durationMs.toLocaleString();
  const reviewCount = record.jev.decisions.filter((decision) => decision.requiresHumanReview).length;
  $("#review-count").textContent = String(reviewCount);
  const ratio = record.deterministic.durationMs > 0
    ? Math.round(record.jev.durationMs / record.deterministic.durationMs).toLocaleString()
    : "not meaningful";
  $("#result-note").textContent = `Observed only: Jev took ${ratio}× the local rule time in this run. Jev added semantic probabilities; rules remained faster. Request ${record.jev.requestId || "ID unavailable"}.`;

  const rules = new Map(record.deterministic.decisions.map((decision) => [decision.threatId, decision]));
  const rows = $("#decision-rows");
  rows.replaceChildren();
  const ordered = [...record.jev.decisions].sort((a, b) => {
    const byDisposition = dispositionRank[a.disposition] - dispositionRank[b.disposition];
    if (byDisposition) return byDisposition;
    return (b.probability || 0) - (a.probability || 0);
  });
  for (const jev of ordered) {
    const rule = rules.get(jev.threatId);
    const row = element("tr");
    const name = element("td");
    name.append(element("span", "pattern-id", jev.threatId), document.createTextNode(jev.threatName));
    const ruleCell = element("td");
    ruleCell.append(decisionCell(rule));
    const jevCell = element("td");
    jevCell.append(decisionCell(jev, true));
    const evidence = element("td");
    evidence.append(element("span", "", rule.evidenceFactIds.length
      ? `${rule.evidenceFactIds.length} rule fact${rule.evidenceFactIds.length === 1 ? "" : "s"} · versioned state`
      : "No exact rule match · human review"));
    row.append(name, ruleCell, jevCell, evidence);
    rows.append(row);
  }
  $("#download-pack").href = apiUrl(`evaluations/${record.id}/evidence-pack`);
  if (record.humanReview) {
    $("#review-status").textContent = `${record.humanReview.action} by ${record.humanReview.reviewer}: ${record.humanReview.reason}`;
  }
  $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function evaluate() {
  const button = $("#evaluate-button");
  button.disabled = true;
  setStatus("Running fixed rules, then one server-side Jev request…", "busy");
  try {
    const record = await request("evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flowId: $("#flow-select").value }),
    });
    renderEvaluation(record);
    setStatus("Evaluation preserved. Human review is still required.");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

async function review(event) {
  event.preventDefault();
  if (!state.evaluation) return;
  const status = $("#review-status");
  status.textContent = "Recording review…";
  try {
    const record = await request(`evaluations/${state.evaluation.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: $("#review-action").value,
        reason: $("#review-reason").value,
        reviewer: "Public demo reviewer",
      }),
    });
    state.evaluation = record;
    status.textContent = `${record.humanReview.action} · ${record.humanReview.reason}`;
  } catch (error) {
    status.textContent = error.message;
  }
}

async function init() {
  try {
    state.context = await request("context");
    renderContext(state.context);
  } catch (error) {
    setStatus(`The experiment context could not load: ${error.message}`, "error");
  }
}

$("#flow-select").addEventListener("change", updateFlowDescription);
$("#evaluate-button").addEventListener("click", evaluate);
$("#review-form").addEventListener("submit", review);
void init();
