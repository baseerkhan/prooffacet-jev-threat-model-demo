import { performance } from "node:perf_hooks";
import { APIError, TypeSafeClient } from "@typesafe-ai/sdk";
import { threatCatalog } from "../threat-catalog.js";
import type {
  ThreatDecision,
  ThreatDecisionProvider,
  ThreatDecisionResult,
  ThreatEvaluationState,
  ThreatQuestionSet,
} from "../types.js";

export class JevUnavailableError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "JevUnavailableError";
    if (status !== undefined) this.status = status;
  }
}

export class JevThreatProvider implements ThreatDecisionProvider {
  readonly #client: TypeSafeClient;
  readonly #model: string;

  constructor() {
    const apiKey = process.env.TYPESAFE_API_KEY;
    if (!apiKey?.trim()) {
      throw new JevUnavailableError("TYPESAFE_API_KEY is not configured on the server.");
    }
    this.#model = process.env.TYPESAFE_MODEL?.trim() || "jev-latest";
    this.#client = new TypeSafeClient({
      apiKey,
      defaultModel: this.#model,
      logLevel: "off",
      timeout: 12_000,
      retry: { maxRetries: 1 },
    });
  }

  async evaluate(
    state: ThreatEvaluationState,
    questions: ThreatQuestionSet,
  ): Promise<ThreatDecisionResult> {
    const started = performance.now();
    try {
      const { data, requestId } = await this.#client
        .systemOne({ state, questions, model: this.#model }, { timeout: 12_000 })
        .withResponse();

      const decisions: ThreatDecision[] = threatCatalog.map((threat) => {
        const answer = data.answers[threat.id];
        if (!answer || answer.type !== "noul") {
          throw new JevUnavailableError("Jev returned an incomplete typed result.");
        }
        const probability = Number(answer.noul.toFixed(4));
        const disposition = probability >= 0.65
          ? "likely-applicable"
          : probability <= 0.35
            ? "unlikely-applicable"
            : "uncertain";
        return {
          threatId: threat.id,
          threatName: threat.name,
          disposition,
          probability,
          evidenceFactIds: state.softwareTwin.relevantFacts.map((fact) => fact.id),
          rationale: disposition === "uncertain"
            ? "The Noul probability is inside the experiment's 0.35–0.65 human-review band."
            : "Jev judged applicability from the versioned flow facts and bounded pattern criteria.",
          requiresHumanReview: disposition !== "unlikely-applicable",
        };
      });

      return {
        provider: "jev",
        providerVersion: data.model,
        durationMs: Number((performance.now() - started).toFixed(2)),
        decisions,
        ...(requestId ? { requestId } : {}),
        usage: {
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens,
        },
      };
    } catch (error) {
      if (error instanceof JevUnavailableError) throw error;
      if (error instanceof APIError) {
        throw new JevUnavailableError("The Jev service rejected the evaluation request.", error.status);
      }
      throw new JevUnavailableError("The Jev service could not complete the evaluation.");
    }
  }
}
