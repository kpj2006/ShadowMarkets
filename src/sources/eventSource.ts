export type PrivateEvent =
  | {
      kind: "githubIssueWillClose";
      id: string;
      owner: string;
      repo: string;
      issueNumber: number;
      /**
       * If true: market resolves YES when issue is closed by endTime.
       * If false: market resolves YES when issue is still open by endTime.
       */
      yesMeansClosed: boolean;
      question: string;
      endTimeSeconds: number;
    }
  | {
      kind: "localBooleanSignal";
      id: string;
      /**
       * A private key/value signal (simulated). Evidence comes from local file only.
       */
      signalKey: string;
      expectedYes: boolean;
      question: string;
      endTimeSeconds: number;
    };

export type Evidence = {
  eventId: string;
  collectedAtSeconds: number;
  payload: unknown;
};

export interface EventSource {
  /** Return the next unseen event to market-ize, or null if none. */
  nextEvent(): Promise<PrivateEvent | null>;
  /** Collect resolvability evidence for a previously emitted event. */
  collectEvidence(event: PrivateEvent): Promise<Evidence>;
}

