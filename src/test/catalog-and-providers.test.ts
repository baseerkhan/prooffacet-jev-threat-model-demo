import assert from "node:assert/strict";
import test from "node:test";
import { createEvidencePack } from "../evidence-pack.js";
import { buildQuestions, buildState } from "../questions.js";
import { DeterministicThreatProvider } from "../providers/deterministic-provider.js";
import { softwareTwin } from "../software-twin.js";
import { threatCatalog, threatCatalogVersion } from "../threat-catalog.js";
import type { EvaluationRecord, ThreatDecisionResult } from "../types.js";

test("catalog contains 18 sourced, unique patterns", () => {
  assert.equal(threatCatalog.length, 18);
  assert.equal(new Set(threatCatalog.map((threat) => threat.id)).size, 18);
  for (const threat of threatCatalog) {
    assert.match(threat.source.url, /^https:\/\//);
    assert.ok(threat.definition.length > 20);
    assert.ok(threat.indicators.length >= 2);
  }
});

test("question set has one bounded Noul judgment per catalog pattern", () => {
  const questions = buildQuestions();
  assert.deepEqual(Object.keys(questions), threatCatalog.map((threat) => threat.id));
  for (const question of Object.values(questions)) {
    assert.equal(question.type, "noul");
    assert.ok(question.criteria?.true);
    assert.ok(question.criteria?.false);
  }
});

test("state selects one flow and preserves source-backed facts and unknowns", () => {
  const state = buildState("streamlit-to-mcp");
  assert.equal(state.softwareTwin.selectedFlow.id, "streamlit-to-mcp");
  assert.equal(state.softwareTwin.commit, softwareTwin.commit);
  assert.ok(state.softwareTwin.relevantFacts.some((fact) => fact.id === "auth-not-found"));
  assert.ok(state.softwareTwin.knownUnknowns.length > 0);
  assert.throws(() => buildState("invented-flow"), /Unknown flow/);
});

test("deterministic provider uses the same catalog and evidence IDs", async () => {
  const state = buildState("streamlit-to-mcp");
  const result = await new DeterministicThreatProvider().evaluate(state, buildQuestions());
  assert.equal(result.provider, "deterministic");
  assert.equal(result.decisions.length, 18);
  assert.equal(result.decisions.find((item) => item.threatId === "PF-07")?.disposition, "likely-applicable");
  assert.equal(result.decisions.find((item) => item.threatId === "PF-11")?.disposition, "unlikely-applicable");
});

test("EvidencePack keeps lineage, both machine paths, and human authority separate", async () => {
  const deterministic = await new DeterministicThreatProvider().evaluate(
    buildState("streamlit-to-mcp"),
    buildQuestions(),
  );
  const jev: ThreatDecisionResult = {
    provider: "jev",
    providerVersion: "jev-latest",
    durationMs: 125,
    decisions: deterministic.decisions.map((decision) => ({
      ...decision,
      probability: decision.disposition === "likely-applicable" ? 0.8 : 0.2,
    })),
    usage: { inputTokens: 100, outputTokens: 18 },
  };
  const record: EvaluationRecord = {
    id: "11111111-1111-4111-8111-111111111111",
    createdAt: "2026-09-19T12:00:00.000Z",
    stateHash: "a".repeat(64),
    catalogVersion: threatCatalogVersion,
    selectedFlowId: "streamlit-to-mcp",
    deterministic,
    jev,
  };
  const pack = createEvidencePack(record);
  assert.equal(pack.lineage.commit, softwareTwin.commit);
  assert.equal(pack.decisions.humanReview, null);
  assert.equal(pack.authority.status, "review-required");
  assert.match(JSON.stringify(pack), /conventional generative LLM was intentionally not run/);
});
