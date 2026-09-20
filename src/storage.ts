import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { EvaluationRecord, HumanReview } from "./types.js";

export class EvaluationStore {
  readonly #directory: string;
  readonly #maxRecords: number;

  constructor(directory: string, maxRecords = 250) {
    this.#directory = join(directory, "evaluations");
    this.#maxRecords = Math.max(1, Math.min(maxRecords, 2_000));
  }

  async save(record: EvaluationRecord): Promise<void> {
    await mkdir(this.#directory, { recursive: true, mode: 0o750 });
    const destination = this.#path(record.id);
    const temporary = `${destination}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o640,
    });
    await rename(temporary, destination);
    await this.#removeOldestRecords();
  }

  async get(id: string): Promise<EvaluationRecord | null> {
    if (!/^[a-f0-9-]{36}$/.test(id)) return null;
    try {
      return JSON.parse(await readFile(this.#path(id), "utf8")) as EvaluationRecord;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async review(id: string, review: HumanReview): Promise<EvaluationRecord | null> {
    const record = await this.get(id);
    if (!record) return null;
    const reviewed = { ...record, humanReview: review };
    await this.save(reviewed);
    return reviewed;
  }

  #path(id: string): string {
    return join(this.#directory, `${id}.json`);
  }

  async #removeOldestRecords(): Promise<void> {
    const entries = (await readdir(this.#directory))
      .filter((name) => /^[a-f0-9-]{36}\.json$/.test(name));
    if (entries.length <= this.#maxRecords) return;
    const dated = await Promise.all(entries.map(async (name) => ({
      name,
      modifiedAt: (await stat(join(this.#directory, name))).mtimeMs,
    })));
    dated.sort((left, right) => left.modifiedAt - right.modifiedAt);
    for (const entry of dated.slice(0, dated.length - this.#maxRecords)) {
      await unlink(join(this.#directory, entry.name));
    }
  }
}
