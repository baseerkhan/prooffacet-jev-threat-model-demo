import { noul } from "@typesafe-ai/sdk";
import { factById, softwareTwin } from "./software-twin.js";
import { threatCatalog } from "./threat-catalog.js";
import type { ThreatEvaluationState, ThreatQuestionSet } from "./types.js";

export function buildState(flowId: string): ThreatEvaluationState {
  const selectedFlow = softwareTwin.flows.find((flow) => flow.id === flowId);
  if (!selectedFlow) {
    throw new Error("Unknown flow.");
  }

  const relevantIds = new Set([...selectedFlow.factIds, ...selectedFlow.boundaryIds]);
  const relevantFacts = [...relevantIds]
    .map((id) => factById.get(id))
    .filter((fact) => fact !== undefined);
  const knownUnknowns = softwareTwin.facts.filter((fact) => fact.kind === "unknown");

  return {
    softwareTwin: {
      name: softwareTwin.name,
      repository: softwareTwin.repository,
      commit: softwareTwin.commit,
      selectedFlow,
      relevantFacts,
      knownUnknowns,
    },
    threatCatalog: threatCatalog.map(({ id, name, definition, indicators }) => ({
      id,
      name,
      definition,
      indicators,
    })),
    decisionPolicy: {
      purpose: "Triage material threat applicability for one documented software flow; do not assert exploitability or invent controls.",
      trueMeaning: "Explicit facts create a plausible attack or abuse path matching the pattern.",
      falseMeaning: "The flow lacks the required entry point, asset, capability, or trust relationship, or an explicit control makes the pattern inapplicable.",
      uncertaintyRule: "When material evidence is missing or contradictory, keep the probability near 0.5 so the application can require human review.",
    },
  };
}

export function buildQuestions(): ThreatQuestionSet {
  return Object.fromEntries(
    threatCatalog.map((threat) => [
      threat.id,
      noul(
        {
          task: `Judge whether ${threat.id} ${threat.name} is materially applicable to \`softwareTwin.selectedFlow\`.`,
          pattern_definition: threat.definition,
          indicators: threat.indicators,
          instructions: [
            "Use only explicit facts and known unknowns in the supplied state.",
            "Judge applicability, not proof of exploitation and not generic industry prevalence.",
            "Do not treat a missing control as present.",
            "A pattern without the required entry point, asset, capability, or trust relationship is not applicable.",
          ],
        },
        {
          true: "The documented flow contains a plausible attack or abuse path that matches this pattern.",
          false: "The documented flow does not contain the required path, or an explicit control makes this pattern inapplicable.",
        },
      ),
    ]),
  );
}
