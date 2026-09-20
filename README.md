# ProofFacet × Jev threat-triage experiment

This public experiment asks whether TypeSafe AI's Jev can make bounded threat-applicability triage more transparent than a small deterministic baseline. It does **not** ask Jev to generate a threat model. Code owns the versioned SoftwareTwin™, the 18-pattern catalog, thresholds, human authority, persistence, and EvidencePack™ export.

## Secret-safe local setup

Set the credential in your shell. Do not paste it into source, browser storage, screenshots, logs, issue text, or an EvidencePack.

```sh
export TYPESAFE_API_KEY='PASTE_KEY_LOCALLY'
export TYPESAFE_MODEL='jev-latest'
```

Then install, test, build, and run:

```sh
npm install
npm test
npm start
```

The server listens on `127.0.0.1:8787` by default. Override `HOST`, `PORT`, or `PROOFFACET_DATA_DIR` in the server environment when deploying behind a reverse proxy.

## Decision paths

1. **Deterministic** — exact evidence-ID rules over the selected flow.
2. **Jev** — one server-side `systemOne` request with 18 independent Noul questions using `jev-latest`.
3. **Human** — approve, reject, or override with a recorded reason.

Noul values from `0.35` through `0.65` are displayed as uncertain. This is an experiment policy, not a universal TypeSafe threshold. Material results require human review regardless of concentration.

## API surface

- `GET /api/health`
- `GET /api/context`
- `POST /api/evaluations`
- `GET /api/evaluations/:id`
- `POST /api/evaluations/:id/review`
- `GET /api/evaluations/:id/evidence-pack`

Evaluation artifacts are written atomically below `data/evaluations/` and are excluded from Git. Only one Jev evaluation runs at a time; up to five requests may wait in memory.

## Claim boundary

The UI reports observed durations for the current run only. The conventional generative-LLM path is deliberately excluded, so the experiment makes no empirical speed claim about conventional LLMs. Applicability triage is not vulnerability confirmation or exploitability testing.
