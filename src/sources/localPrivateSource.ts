import { readFile, writeFile } from "node:fs/promises";
import { nowSeconds } from "../util/time.js";
import type { Evidence, EventSource, PrivateEvent } from "./eventSource.js";

type PrivateEventsFile = {
  events: PrivateEvent[];
  consumedIds?: string[];
  /**
   * Private signal store for localBooleanSignal events.
   * Only the oracle/agent reads this file in this hackathon demo.
   */
  signals?: Record<string, boolean>;
};

export class LocalPrivateSource implements EventSource {
  constructor(private readonly filePath: string) {}

  private async load(): Promise<PrivateEventsFile> {
    const raw = await readFile(this.filePath, "utf8");
    const parsed = JSON.parse(raw) as PrivateEventsFile;
    parsed.consumedIds ??= [];
    parsed.signals ??= {};
    parsed.events ??= [];
    return parsed;
  }

  private async save(doc: PrivateEventsFile): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(doc, null, 2), "utf8");
  }

  async nextEvent(): Promise<PrivateEvent | null> {
    const doc = await this.load();
    const consumed = new Set(doc.consumedIds ?? []);
    const next = doc.events.find((e) => !consumed.has(e.id)) ?? null;
    if (!next) return null;

    doc.consumedIds = [...consumed, next.id];
    await this.save(doc);
    return next;
  }

  async collectEvidence(event: PrivateEvent): Promise<Evidence> {
    const doc = await this.load();

    if (event.kind === "localBooleanSignal") {
      const value = doc.signals?.[event.signalKey];
      return {
        eventId: event.id,
        collectedAtSeconds: nowSeconds(),
        payload: {
          kind: event.kind,
          signalKey: event.signalKey,
          value,
        },
      };
    }

    // For non-local events, local source can't produce evidence.
    return {
      eventId: event.id,
      collectedAtSeconds: nowSeconds(),
      payload: {
        kind: event.kind,
        error: "LocalPrivateSource cannot collect evidence for this event kind",
      },
    };
  }
}

