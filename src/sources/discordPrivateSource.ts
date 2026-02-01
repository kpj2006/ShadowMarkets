import type { Evidence, EventSource, PrivateEvent } from "./eventSource.js";
import { nowSeconds } from "../util/time.js";
import { readFile, writeFile } from "node:fs/promises";

export class DiscordPrivateSource implements EventSource {
  constructor(
    private readonly cfg: {
      channelId: string;
      guildId: string;
    },
    private readonly consumedPath: string = "./data/discord-consumed.json",
  ) { }

  private async loadConsumed(): Promise<Set<string>> {
    try {
      const raw = await readFile(this.consumedPath, "utf8");
      const parsed = JSON.parse(raw) as { consumedMessageIds?: string[] };
      return new Set(parsed.consumedMessageIds ?? []);
    } catch {
      return new Set<string>();
    }
  }

  private async saveConsumed(set: Set<string>): Promise<void> {
    await writeFile(
      this.consumedPath,
      JSON.stringify({ consumedMessageIds: Array.from(set.values()) }, null, 2),
      "utf8",
    );
  }

  async nextEvent(): Promise<PrivateEvent | null> {
    // This will be called by the Discord bot when a new message is detected
    // The bot will store pending messages in a file that we can read
    try {
      const raw = await readFile("./data/discord-pending.json", "utf8");
      const pending = JSON.parse(raw) as Array<{
        messageId: string;
        content: string;
        author: string;
        timestamp: number;
      }>;

      if (pending.length === 0) return null;

      const consumed = await this.loadConsumed();
      
      // Get the first unconsumed message
      const message = pending.find((msg) => !consumed.has(msg.messageId));
      if (!message) return null;

      // Mark as consumed
      consumed.add(message.messageId);
      await this.saveConsumed(consumed);

      // Remove from pending
      const updatedPending = pending.filter((m) => m.messageId !== message.messageId);
      await writeFile(
        "./data/discord-pending.json",
        JSON.stringify(updatedPending, null, 2),
        "utf8"
      );

      const endTimeSeconds = nowSeconds() + 3600; // 1 hour for Discord predictions
      const question = `Will the following statement be true: "${message.content}"?`;

      return {
        kind: "discordPrediction",
        id: `discord:${this.cfg.guildId}:${this.cfg.channelId}:${message.messageId}@${endTimeSeconds}`,
        guildId: this.cfg.guildId,
        channelId: this.cfg.channelId,
        messageId: message.messageId,
        messageContent: message.content,
        author: message.author,
        question,
        endTimeSeconds,
      };
    } catch (err) {
      // No pending messages file yet
      return null;
    }
  }

  async collectEvidence(event: PrivateEvent): Promise<Evidence> {
    if (event.kind !== "discordPrediction") {
      return {
        eventId: event.id,
        collectedAtSeconds: nowSeconds(),
        payload: { error: "DiscordPrivateSource cannot collect evidence for this event kind" },
      };
    }

    // For Discord, we can check if reactions or community sentiment indicates outcome
    // For now, this is a placeholder - you can enhance with sentiment analysis or voting
    return {
      eventId: event.id,
      collectedAtSeconds: nowSeconds(),
      payload: {
        kind: event.kind,
        messageId: event.messageId,
        content: event.messageContent,
        // Add sentiment analysis or manual resolution logic here
        resolved: false,
      },
    };
  }
}
