import type { Evidence, EventSource, PrivateEvent } from "./eventSource.js";
import { nowSeconds } from "../util/time.js";
import { readFile, writeFile } from "node:fs/promises";

export class GithubPrivateSource implements EventSource {
  constructor(
    private readonly cfg: {
      token: string;
      owner: string;
      repo: string;
    },
    private readonly consumedPath: string = "./data/github-consumed.json",
  ) {}

  private async loadConsumed(): Promise<Set<number>> {
    try {
      const raw = await readFile(this.consumedPath, "utf8");
      const parsed = JSON.parse(raw) as { consumedIssueNumbers?: number[] };
      return new Set(parsed.consumedIssueNumbers ?? []);
    } catch {
      return new Set<number>();
    }
  }

  private async saveConsumed(set: Set<number>): Promise<void> {
    await writeFile(
      this.consumedPath,
      JSON.stringify({ consumedIssueNumbers: Array.from(set.values()) }, null, 2),
      "utf8",
    );
  }

  async nextEvent(): Promise<PrivateEvent | null> {
    // Minimal “monitoring” for hackathon: we turn the latest open issue into a market.
    // This uses a private repo token: the issue list is the private data source.
    const url = `https://api.github.com/repos/${this.cfg.owner}/${this.cfg.repo}/issues?state=open&per_page=1`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.cfg.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        Accept: "application/vnd.github+json",
      },
    });
    if (!res.ok) {
      throw new Error(`GitHub issues fetch failed: ${res.status} ${await res.text()}`);
    }
    const issues = (await res.json()) as Array<{ number: number; title: string; pull_request?: unknown }>;
    const first = issues.find((i) => !i.pull_request);
    if (!first) return null;

    const consumed = await this.loadConsumed();
    if (consumed.has(first.number)) return null;

    const endTimeSeconds = nowSeconds() + 60 * 30; // 30 min demo window
    const question = `Will issue #${first.number} (“${first.title}”) be CLOSED before the deadline?`;

    consumed.add(first.number);
    await this.saveConsumed(consumed);

    return {
      kind: "githubIssueWillClose",
      id: `github:${this.cfg.owner}/${this.cfg.repo}#${first.number}@${endTimeSeconds}`,
      owner: this.cfg.owner,
      repo: this.cfg.repo,
      issueNumber: first.number,
      yesMeansClosed: true,
      question,
      endTimeSeconds,
    };
  }

  async collectEvidence(event: PrivateEvent): Promise<Evidence> {
    if (event.kind !== "githubIssueWillClose") {
      return {
        eventId: event.id,
        collectedAtSeconds: nowSeconds(),
        payload: { error: "GithubPrivateSource cannot collect evidence for this event kind" },
      };
    }

    const url = `https://api.github.com/repos/${event.owner}/${event.repo}/issues/${event.issueNumber}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.cfg.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        Accept: "application/vnd.github+json",
      },
    });
    if (!res.ok) {
      throw new Error(`GitHub issue fetch failed: ${res.status} ${await res.text()}`);
    }
    const issue = (await res.json()) as { state: "open" | "closed"; closed_at?: string | null; updated_at?: string };

    return {
      eventId: event.id,
      collectedAtSeconds: nowSeconds(),
      payload: {
        kind: event.kind,
        state: issue.state,
        closed_at: issue.closed_at ?? null,
        updated_at: issue.updated_at ?? null,
      },
    };
  }
}

