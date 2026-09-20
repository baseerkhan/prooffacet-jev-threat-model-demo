# Experiment validation record

Validated: 2026-09-20T05:08:48.110Z

## Real Jev run

| Field | Observed value |
| --- | --- |
| Requested model alias | `jev-latest` |
| Model returned by API | `jev-1.13.0` |
| Selected flow | `streamlit-to-mcp` |
| State SHA-256 | `046a08a06bb8acf2c9a8f0546009d143d0c4baea450ee525b2036985eaf6a61b` |
| Catalog version | `2026-09-19.1` |
| Threat judgments | 18 |
| Jev duration | 309.62 ms |
| Deterministic duration | 0.08 ms |
| Jev usage | 8,902 input tokens; 346 output tokens |
| Jev distribution | 14 likely applicable; 1 uncertain; 3 unlikely applicable |
| Deterministic distribution | 12 likely applicable; 5 uncertain; 1 unlikely applicable |
| Request ID returned | Yes |

The deterministic rules were materially faster in this observed run. Jev's demonstrated contribution was a probability for every bounded semantic judgment and different coverage on questions that exact evidence-ID rules left uncertain. One run is not a general benchmark.

## Workflow checks

- Health endpoint reported ready without operational detail.
- SoftwareTwin endpoint returned four documented flows and the 18-pattern catalog.
- Human review was persisted as a separate authority record.
- EvidencePack™ export contained the twin, source register, catalog, state hash, both machine paths, and human review.
- The evaluation and review remained available after an application restart.
- The configured TypeSafe API key was absent from the stored evaluation and exported EvidencePack.
- Six automated tests passed and `npm audit --audit-level=high` reported no vulnerabilities.

## Supported conclusion

This run does **not** show that Jev is faster than fixed rules. It supports a narrower conclusion: Jev completed 18 semantic applicability judgments in one typed request in approximately 310 ms, while preserving probabilities that can drive a visible uncertainty gate and human review.

The experiment did not execute a conventional generative LLM, so it provides no direct timing or quality comparison with that class of model.
