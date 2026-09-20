import { softwareTwin } from "./software-twin.js";
import { threatCatalog, threatCatalogVersion } from "./threat-catalog.js";
import type { EvaluationRecord } from "./types.js";

export function createEvidencePack(record: EvaluationRecord) {
  const selectedFlow = softwareTwin.flows.find((flow) => flow.id === record.selectedFlowId);
  return {
    schema: "prooffacet.evidence-pack.threat-triage.v1",
    exportedAt: new Date().toISOString(),
    experiment: {
      question: "Can Jev make threat-triage decisions inside software faster and more transparently than deterministic approaches?",
      scope: "One versioned public sample application and one selected data flow.",
      comparison: "Deterministic rules and Jev were executed. A conventional generative LLM was intentionally not run.",
      limitation: "This demonstrates triage, not vulnerability confirmation, exploitability testing, or a general performance claim.",
    },
    lineage: {
      evaluationId: record.id,
      createdAt: record.createdAt,
      stateHash: record.stateHash,
      catalogVersion: threatCatalogVersion,
      repository: softwareTwin.repository,
      commit: softwareTwin.commit,
      selectedFlow,
    },
    softwareTwin,
    catalog: threatCatalog,
    decisions: {
      deterministic: record.deterministic,
      jev: record.jev,
      humanReview: record.humanReview ?? null,
    },
    authority: {
      machineRole: "Jev supplies bounded applicability probabilities; deterministic code applies fixed rules.",
      humanRole: "A qualified reviewer approves, rejects, or overrides the triage result with a reason.",
      status: record.humanReview ? "reviewed" : "review-required",
    },
  };
}
