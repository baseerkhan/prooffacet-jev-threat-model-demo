import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { EvaluationStore } from "../storage.js";
import type { EvaluationRecord } from "../types.js";

const record: EvaluationRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  createdAt: "2026-09-19T12:00:00.000Z",
  stateHash: "a".repeat(64),
  catalogVersion: "test",
  selectedFlowId: "streamlit-to-mcp",
  deterministic: { provider: "deterministic", providerVersion: "test", durationMs: 1, decisions: [] },
  jev: { provider: "jev", providerVersion: "jev-latest", durationMs: 100, decisions: [] },
};

test("evaluation storage persists records and human review", async () => {
  const directory = await mkdtemp(join(tmpdir(), "prooffacet-jev-test-"));
  try {
    const store = new EvaluationStore(directory);
    await store.save(record);
    assert.deepEqual(await store.get(record.id), record);
    const reviewed = await store.review(record.id, {
      action: "approved",
      reason: "Evidence checked against the versioned source.",
      reviewer: "Test reviewer",
      reviewedAt: "2026-09-19T12:01:00.000Z",
    });
    assert.equal(reviewed?.humanReview?.action, "approved");
    assert.equal((await store.get(record.id))?.humanReview?.reviewer, "Test reviewer");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("evaluation storage caps retained demo records", async () => {
  const directory = await mkdtemp(join(tmpdir(), "prooffacet-jev-cap-test-"));
  try {
    const store = new EvaluationStore(directory, 2);
    for (const prefix of ["1", "2", "3"]) {
      await store.save({
        ...record,
        id: `${prefix.repeat(8)}-${prefix.repeat(4)}-4${prefix.repeat(3)}-8${prefix.repeat(3)}-${prefix.repeat(12)}`,
      });
    }
    const files = (await readdir(join(directory, "evaluations"))).filter((name) => name.endsWith(".json"));
    assert.equal(files.length, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
