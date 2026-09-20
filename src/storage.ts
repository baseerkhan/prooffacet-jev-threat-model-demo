import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { EvaluationRecord, HumanReview } from "./types.js";

export class EvaluationStore {
  readonly #directory: string;

  constructor(directory: string) {
    this.#directory = join(directory, "evaluations");
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
}
