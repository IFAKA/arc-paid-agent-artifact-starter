import { z } from 'zod';

export const AgentArtifactSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  sourceHash: z.string().regex(/^(0x)?[a-fA-F0-9]{64}$/),
  payload: z.record(z.unknown()),
  createdAt: z.string().datetime(),
});

export type AgentArtifact = z.infer<typeof AgentArtifactSchema>;

export type ArcTraceCommit = {
  status: 'committed';
  artifactHash: `0x${string}`;
  sourceHash: `0x${string}`;
  transactionHash: `0x${string}`;
  chainId: 5042002;
  network: 'Arc Testnet';
  explorerUrl: string;
  committedAt: string;
};

export type CircleAgentWalletStatus = {
  status: 'ready' | 'unconfigured' | 'failed';
  walletId: string | null;
  walletSetId: string | null;
  address: string | null;
  blockchain: 'ARC-TESTNET';
  checkedAt: string;
  error: string | null;
};

export type X402PublicationStatus = {
  status: 'required' | 'disabled';
  artifactId: string;
  priceUsdcMicro: number | null;
  payToAddress: string | null;
  facilitatorUrl: string | null;
  gatewayUrl: string | null;
  network: 'Arc Testnet' | null;
  protectedUrl: string;
  demoUnlockUrl: string | null;
};

export type PublishedArtifact = {
  artifact: AgentArtifact;
  artifactHash: `0x${string}`;
  arcTrace: ArcTraceCommit | null;
  x402: X402PublicationStatus;
};

