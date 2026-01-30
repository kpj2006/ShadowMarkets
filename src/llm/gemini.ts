import type { LlmOracle, OracleDecision } from "./llm.js";

function clamp01(x: number): number {
    if (x < 0) return 0;
    if (x > 1) return 1;
    return x;
}

/**
 * Native Google Gemini Oracle implementation.
 */
export class GeminiOracle implements LlmOracle {
    constructor(
        private readonly cfg: {
            apiKey: string;
            model: string;
        },
    ) { }

    async decideYesNo(input: {
        question: string;
        evidence: unknown;
        yesDefinition: string;
        noDefinition: string;
    }): Promise<OracleDecision> {
        const system = `You are an oracle for a binary prediction market. Output ONLY valid JSON with keys: yesWinner (boolean), confidence (0-1 number), reasoning (string).`;
        const user = JSON.stringify({
            question: input.question,
            yesDefinition: input.yesDefinition,
            noDefinition: input.noDefinition,
            evidence: input.evidence,
            instruction:
                "Decide strictly based on evidence. If evidence is missing or inconclusive, choose the most defensible outcome and set confidence <= 0.55.",
        });

        const prompt = `${system}\n\nTask:\n${user}`;

        // Use the correct Gemini API endpoint
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.cfg.model}:generateContent?key=${this.cfg.apiKey}`;

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0,
                    responseMimeType: "application/json",
                },
            }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Gemini request failed: ${res.status} ${errorText}`);
        }

        const data = (await res.json()) as any;
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) throw new Error("Gemini response missing content");

        // Robust JSON extraction: look for first { and last }
        const firstBrace = content.indexOf("{");
        const lastBrace = content.lastIndexOf("}");

        let jsonText = content;
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonText = content.substring(firstBrace, lastBrace + 1);
        }

        const parsed = JSON.parse(jsonText) as { yesWinner: boolean; confidence?: number; reasoning?: string };

        return {
            yesWinner: Boolean(parsed.yesWinner),
            confidence: clamp01(typeof parsed.confidence === "number" ? parsed.confidence : 0.6),
            reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "No reasoning provided.",
        };
    }
}
