# Repository selection record

Date: 2026-09-19 (America/Los_Angeles)

The authenticated GitHub inventory was limited to public repositories in the personal account and repositories in the `GenAI-AI` organization. Private, customer-named, and potentially confidential repositories were excluded before content inspection.

| Candidate | Useful application surface | Missing or limiting factors | Decision |
| --- | --- | --- | --- |
| `baseerkhan/nr-lesson-final` | Streamlit UI, FastAPI tool endpoint, XLSX persistence, model/API boundary, multiple trust boundaries | Legacy dependency set; existing UI accepts an OpenAI key | Selected. It is the smallest public app that supports a factual, non-trivial SoftwareTwin and a useful threat-triage comparison. The ProofFacet experiment is isolated in a new server-only Node application and does not reuse the legacy browser-key pattern. |
| `baseerkhan/nanogpt` | Public Python model-training code and local datasets | No product UI, request endpoint, application data store, or representative interactive trust boundary | Rejected for this experiment. |
| `baseerkhan/trace-of-thought-distillation` | Small public model experiment | One Python script; no UI, endpoint, persistence layer, or external service workflow to model | Rejected for this experiment. |

## Selected baseline

- Repository: `baseerkhan/nr-lesson-final`
- Baseline branch: `main`
- Baseline commit: `eae8fd801fc142f29e675fa36dc8c89a899ea18d`
- Experiment branch: `experiment/jev-threat-triage`
- Working tree at selection: clean
- Baseline executable check: `python3 -m compileall -q .` passed
- Baseline automated test discovery: unavailable because `pytest` is not declared in `requirements.txt` and was not installed in the baseline environment

The source application is used only as a public, illustrative subject. No production traffic, private customer data, or credentials are used by the experiment.

## Clean experiment repository

The subject repository's history scan found an old `.env` in commit `3efda3d5383319411b81602ecbb71909a8fec328`. The value was not displayed or copied. Work stopped, the credential was reported for rotation, and no experiment commit was created in that history.

The implementation therefore lives in the clean public repository `baseerkhan/prooffacet-jev-threat-model-demo`. Its default `main` branch contains only the GitHub initialization commit. All experiment work is isolated on `experiment/jev-threat-triage`.
