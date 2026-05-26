import type { AgentArtifact, PublishedArtifact, X402PublicationStatus } from './schema.ts';
import { getRuntimeConfig } from './config.ts';
import { hashArtifact } from './crypto.ts';
import { commitArcTrace } from './arcTrace.ts';
import { sampleArtifact } from './sampleArtifact.ts';

const artifacts = new Map<string, AgentArtifact>([[sampleArtifact.id, sampleArtifact]]);

export function getArtifact(id: string): AgentArtifact | null {
  return artifacts.get(id) ?? null;
}

export function listArtifacts() {
  return [...artifacts.values()];
}

export async function publishArtifact(artifact: AgentArtifact): Promise<PublishedArtifact> {
  artifacts.set(artifact.id, artifact);
  const config = getRuntimeConfig();
  const arcTrace = config.traceRegistryAddress && config.committerPrivateKey
    ? await commitArcTrace(artifact)
    : null;

  return {
    artifact,
    artifactHash: hashArtifact(artifact),
    arcTrace,
    x402: createX402Publication(artifact.id),
  };
}

export function createX402Publication(artifactId: string): X402PublicationStatus {
  const config = getRuntimeConfig();

  return {
    status: config.x402Enabled ? 'required' : 'disabled',
    artifactId,
    priceUsdcMicro: config.x402Enabled ? config.x402PriceUsdcMicro : null,
    payToAddress: config.x402Enabled ? config.x402PayToAddress : null,
    facilitatorUrl: config.x402Enabled ? config.x402FacilitatorUrl : null,
    gatewayUrl: config.x402Enabled ? config.x402FacilitatorUrl : null,
    network: config.x402Enabled ? 'Arc Testnet' : null,
    protectedUrl: `/api/artifacts/${encodeURIComponent(artifactId)}/protected`,
    demoUnlockUrl: config.x402Enabled ? `/api/unlock/${encodeURIComponent(artifactId)}` : null,
  };
}

