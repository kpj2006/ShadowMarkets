export type OracleDecision = {
  yesWinner: boolean;
  confidence: number; // 0..1
  reasoning: string;
};

export interface LlmOracle {
  decideYesNo(input: {
    question: string;
    evidence: unknown;
    yesDefinition: string;
    noDefinition: string;
  }): Promise<OracleDecision>;
}

