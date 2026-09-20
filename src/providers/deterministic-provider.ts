import { performance } from "node:perf_hooks";
import { threatCatalog } from "../threat-catalog.js";
import type {
  ThreatDecision,
  ThreatDecisionProvider,
  ThreatDecisionResult,
  ThreatEvaluationState,
  ThreatQuestionSet,
} from "../types.js";

type Rule = {
  likelyAny?: string[];
  unlikelyWhen?: (state: ThreatEvaluationState) => boolean;
  rationale: string;
};

const rules: Record<string, Rule> = {
  "PF-01": { likelyAny: ["auth-not-found"], rationale: "Identity verification is not present on the inspected entry point." },
  "PF-02": { likelyAny: ["store-xlsx"], rationale: "The selected flow writes mutable local persistence without a documented integrity control." },
  "PF-03": { likelyAny: ["unknown-audit-retention"], rationale: "Actor-bound, integrity-protected action history is not documented." },
  "PF-04": { likelyAny: ["asset-model-key", "asset-prompts", "asset-course-data"], rationale: "The selected flow carries an asset whose disclosure boundary requires review." },
  "PF-05": { likelyAny: ["control-rate-limit-not-found"], rationale: "The inspected request path has no documented rate, size, or concurrency bound." },
  "PF-06": { likelyAny: ["authz-not-found"], rationale: "A callable function has no documented role or capability check." },
  "PF-07": { likelyAny: ["auth-not-found"], rationale: "The inspected function is callable without an application authentication decision." },
  "PF-08": { likelyAny: ["authz-not-found"], rationale: "The inspected function has no server-side permission or ownership decision." },
  "PF-09": { rationale: "A generic rule cannot establish whether selected input reaches an unsafe interpreter." },
  "PF-10": { likelyAny: ["control-key-fragments-exposed"], rationale: "Credential fragments are rendered or logged by the baseline application." },
  "PF-11": {
    unlikelyWhen: (state) => !state.softwareTwin.selectedFlow.data.some((item) => item.toLowerCase().includes("file")),
    rationale: "The selected flow has no documented file-upload entry point.",
  },
  "PF-12": { likelyAny: ["entry-ui", "entry-tool-call"], rationale: "Untrusted input crosses the boundary and validation is only partially documented." },
  "PF-13": { likelyAny: ["control-rate-limit-not-found"], rationale: "No quota or throttle is documented on the request path." },
  "PF-14": { likelyAny: ["unknown-audit-retention"], rationale: "Security-event identity, outcome, retention, and alerting are not documented." },
  "PF-15": { likelyAny: ["external-openai"], rationale: "The flow crosses into an external API and response trust controls need review." },
  "PF-16": { likelyAny: ["control-unlocked-dependencies"], rationale: "The source dependency set is range-based and has no repository lockfile." },
  "PF-17": { likelyAny: ["unknown-audit-retention"], rationale: "The decision and action lineage cannot be reconstructed from documented events." },
  "PF-18": { likelyAny: ["control-raw-error"], rationale: "Caught exception text is copied into the client-visible HTTP response." },
};

const relevantIds = (state: ThreatEvaluationState): Set<string> =>
  new Set([
    ...state.softwareTwin.relevantFacts.map((fact) => fact.id),
    ...state.softwareTwin.knownUnknowns.map((fact) => fact.id),
  ]);

export class DeterministicThreatProvider implements ThreatDecisionProvider {
  async evaluate(
    state: ThreatEvaluationState,
    _questions: ThreatQuestionSet,
  ): Promise<ThreatDecisionResult> {
    const started = performance.now();
    const ids = relevantIds(state);
    const decisions: ThreatDecision[] = threatCatalog.map((threat) => {
      const rule = rules[threat.id];
      const matched = rule?.likelyAny?.filter((id) => ids.has(id)) ?? [];
      const explicitlyUnlikely = rule?.unlikelyWhen?.(state) ?? false;
      const disposition = matched.length > 0
        ? "likely-applicable"
        : explicitlyUnlikely
          ? "unlikely-applicable"
          : "uncertain";
      return {
        threatId: threat.id,
        threatName: threat.name,
        disposition,
        probability: null,
        evidenceFactIds: matched,
        rationale: rule?.rationale ?? "No deterministic rule is defined.",
        requiresHumanReview: disposition !== "unlikely-applicable",
      };
    });

    return {
      provider: "deterministic",
      providerVersion: "rules-2026-09-19.1",
      durationMs: Number((performance.now() - started).toFixed(2)),
      decisions,
    };
  }
}
