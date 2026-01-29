import type { LlmOracle, OracleDecision } from "./llm.js";

type OpenAIChatResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
};

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/**
 * Minimal OpenAI-compatible chat client.
 * If it fails (or no API key), callers should fall back to deterministic rules.
 */
export class OpenAiCompatibleOracle implements LlmOracle {
  constructor(
    private readonly cfg: {
      baseUrl: string;
      apiKey: string;
      model: string;
    },
  ) {}

  async decideYesNo(input: {
    question: string;
    evidence: unknown;
    yesDefinition: string;
    noDefinition: string;
  }): Promise<OracleDecision> {
    const system = `You are an oracle for a binary prediction market. Output ONLY valid JSON with keys: yesWinner (boolean), confidence (0-1 number), reasoning (string).`;
    const user = {
      question: input.question,
      yesDefinition: input.yesDefinition,
      noDefinition: input.noDefinition,
      evidence: input.evidence,
      instruction:
        "Decide strictly based on evidence. If evidence is missing or inconclusive, choose the most defensible outcome and set confidence <= 0.55.",
    };

    const res = await fetch(`${this.cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.cfg.model,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(user) },
        ],
      }),
    });
    if (!res.ok) throw new Error(`LLM request failed: ${res.status} ${await res.text()}`);

    const data = (await res.json()) as OpenAIChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM response missing content");

    const parsed = JSON.parse(content) as { yesWinner: boolean; confidence?: number; reasoning?: string };
    return {
      yesWinner: Boolean(parsed.yesWinner),
      confidence: clamp01(typeof parsed.confidence === "number" ? parsed.confidence : 0.6),
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "No reasoning provided.",
    };
  }
}

