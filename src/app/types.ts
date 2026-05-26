export type AgentArtifact = {
  id: string;
  title: string;
  summary: string;
  sourceHash: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type X402PublicationStatus = {
  status: 'required' | 'disabled';
  artifactId: string;
  priceUsdcMicro: number | null;
  payToAddress: string | null;
  gatewayUrl: string | null;
  protectedUrl: string;
  demoUnlockUrl: string | null;
};

export type ArtifactResponse = {
  artifacts: Array<AgentArtifact & {
    artifactHash: string;
    x402: X402PublicationStatus;
  }>;
};

export type RuntimeStatus = {
  status: 'ready' | 'not-ready';
  checkedAt: string;
  services: Record<string, { status: string; details: string }>;
  missing: string[];
  circleAgentWallet: {
    status: string;
    address: string | null;
    error: string | null;
  };
};

