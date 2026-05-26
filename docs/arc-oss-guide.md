# Arc OSS Adaptation Guide

Use this starter when your agent produces an artifact that should be traceable, paid, and unlockable on Arc.

1. Replace `sampleArtifact` with your own `AgentArtifact` producer.
2. Keep `sourceHash` tied to the source material your agent used, not to the final payload.
3. Keep `payload` domain-specific, but preserve the top-level schema fields so downstream buyers can rely on stable metadata.
4. Deploy `contracts/TraceRegistry.sol` or point `ARC_TRACE_REGISTRY_ADDRESS` at an existing compatible registry.
5. Configure Circle ARC-TESTNET wallet variables and x402 variables in local `.env` and Vercel project settings.
6. POST your artifact to `/api/artifacts`; the starter computes the canonical artifact hash, commits the trace when Arc config is present, and returns protected x402 URLs.

The in-memory artifact store is intentionally small. For production, replace it with durable storage keyed by `artifact.id`, and store the returned `artifactHash`, trace transaction, price, and unlock receipts.
