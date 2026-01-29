import { PublicKey } from "@solana/web3.js";
import type { PNPClient } from "pnp-sdk";
import type { EventSource, PrivateEvent } from "../sources/eventSource.js";
import type { LlmOracle } from "../llm/llm.js";
import { nowSeconds } from "../util/time.js";

function deterministicDecision(event: PrivateEvent, evidence: unknown): { yesWinner: boolean; reasoning: string } {
  if (event.kind === "githubIssueWillClose") {
    const ev = evidence as { payload?: { state?: string } };
    const state = (ev as any)?.payload?.state;
    const isClosed = state === "closed";
    const yesWinner = event.yesMeansClosed ? isClosed : !isClosed;
    return {
      yesWinner,
      reasoning: `Deterministic rule: issue state=${String(state)}; YES means ${
        event.yesMeansClosed ? "closed" : "open"
      } at deadline.`,
    };
  }

  if (event.kind === "localBooleanSignal") {
    const value = (evidence as any)?.payload?.value;
    const yesWinner = Boolean(value) === event.expectedYes;
    return {
      yesWinner,
      reasoning: `Deterministic rule: signal ${event.signalKey}=${String(value)}; expectedYes=${event.expectedYes}.`,
    };
  }

  return { yesWinner: false, reasoning: "Unknown event kind; defaulting to NO." };
}

export class OracleAgent {
  constructor(
    private readonly client: PNPClient,
    private readonly eventSource: EventSource,
    private readonly llm: LlmOracle | null,
  ) {}

  async settleIfReady(input: { market: string; event: PrivateEvent }): Promise<
    | { didSettle: false; reason: string }
    | { didSettle: true; signature: string; yesWinner: boolean; reasoning: string; usedLlm: boolean }
  > {
    const marketPk = new PublicKey(input.market);
    const { account } = await this.client.fetchMarket(marketPk);

    if (account.resolved) return { didSettle: false, reason: "Market already resolved on-chain." };

    const endTimeSeconds = Number(account.end_time);
    if (nowSeconds() < endTimeSeconds) {
      return { didSettle: false, reason: `Market not ended yet (end_time=${endTimeSeconds}).` };
    }

    const evidence = await this.eventSource.collectEvidence(input.event);

    const yesDefinition = "YES wins if the event condition is true at/after the market deadline.";
    const noDefinition = "NO wins otherwise.";

    let decision: { yesWinner: boolean; reasoning: string; usedLlm: boolean } = {
      ...deterministicDecision(input.event, evidence),
      usedLlm: false,
    };

    if (this.llm) {
      try {
        const llmDecision = await this.llm.decideYesNo({
          question: input.event.question,
          evidence,
          yesDefinition,
          noDefinition,
        });
        decision = {
          yesWinner: llmDecision.yesWinner,
          reasoning: `LLM decision (confidence=${llmDecision.confidence}): ${llmDecision.reasoning}`,
          usedLlm: true,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        decision.reasoning = `${decision.reasoning} | LLM failed, fallback used: ${msg}`;
      }
    }

    const res = await this.client.settleMarket({ market: marketPk, yesWinner: decision.yesWinner });
    return {
      didSettle: true,
      signature: res.signature,
      yesWinner: decision.yesWinner,
      reasoning: decision.reasoning,
      usedLlm: decision.usedLlm,
    };
  }
}

