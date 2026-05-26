# Arc Paid Agent Artifact Starter

Fork this to build paid, verifiable Arc-native agent artifacts.

This is a small starter kit for Arc builders who want reusable infrastructure, not a full product clone. It was extracted from the AgoraBabel SaaS demo and keeps only the primitives needed to publish an agent artifact with deterministic proof hashes, an Arc Testnet trace commit, Circle wallet readiness, and x402 protected access.

## What It Exposes

- `AgentArtifact` schema: `id`, `title`, `summary`, `sourceHash`, `payload`, `createdAt`
- Canonical JSON hashing for deterministic artifact hashes
- Arc Testnet trace commit helper using `TraceRegistry.commitTrace`
- Minimal `contracts/TraceRegistry.sol`
- Circle ARC-TESTNET wallet readiness check
- x402 protected artifact API with structured `402 Payment Required` responses
- Demo buyer unlock endpoint using Circle Gateway x402 batching
- React proof panel showing wallet/config status, hashes, price, and unlock state
- Sample artifact so the starter runs without an LLM or product pipeline

## How This Differs From AgoraBabel

AgoraBabel is the originating hackathon product demo for turning news into prediction-market intelligence. This starter removes that domain layer. There are no market schemas, resolver checks, LLM prompts, or AgoraBabel-specific screens here. The repo is forkable infrastructure for any builder whose agent emits a paid artifact.

## Quick Start

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Open the local Vite URL. With the default `.env.example`, the sample artifact renders, runtime status calls out missing config, and x402 publication is disabled.

## Flow

```text
agent artifact
  -> canonical JSON
  -> artifact hash + source hash
  -> TraceRegistry.commitTrace on Arc Testnet
  -> x402 protected artifact URL
  -> buyer-agent paid unlock
```

## Environment

Only Arc, Circle, and x402 variables are required.

```bash
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
ARC_TRACE_REGISTRY_ADDRESS=
ARC_COMMITTER_PRIVATE_KEY=
CIRCLE_API_KEY=
CIRCLE_WALLET_SET_ID=
CIRCLE_AGENT_WALLET_ID=
CIRCLE_AGENT_WALLET_ADDRESS=
X402_ENABLED=false
X402_PRICE_USDC_MICRO=100000
X402_PAY_TO_ADDRESS=
X402_FACILITATOR_URL=https://gateway-api-testnet.circle.com
X402_BUYER_PRIVATE_KEY=
```

Do not expose private keys through client-side `VITE_` variables.

## API Examples

Publish an artifact:

```bash
curl -s http://localhost:5173/api/artifacts \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "builder-demo-001",
    "title": "Demo paid agent artifact",
    "summary": "A generic artifact produced by my agent.",
    "sourceHash": "0x1111111111111111111111111111111111111111111111111111111111111111",
    "payload": { "recommendation": "ship", "confidence": 0.91 },
    "createdAt": "2026-05-26T00:00:00.000Z"
  }'
```

When `ARC_TRACE_REGISTRY_ADDRESS` and `ARC_COMMITTER_PRIVATE_KEY` are set, publishing commits the trace to Arc Testnet. When `X402_ENABLED=true`, the response includes paid access URLs.

Read the sample list:

```bash
curl -s http://localhost:5173/api/artifacts
```

Probe protected access without payment proof:

```bash
curl -i http://localhost:5173/api/artifacts/sample-agent-brief/protected
```

With x402 enabled and no valid payment proof, the endpoint returns a structured `402 Payment Required` JSON response with price, seller, network, gateway, and the `PAYMENT-REQUIRED` header payload.

Run the demo buyer unlock:

```bash
curl -s -X POST http://localhost:5173/api/unlock/sample-agent-brief
```

This requires `X402_ENABLED=true` plus a funded `X402_BUYER_PRIVATE_KEY` or `ARC_COMMITTER_PRIVATE_KEY`.

## Deploying To Vercel

1. Import the repo in Vercel.
2. Use `pnpm build` as the build command and `dist` as output.
3. Add the same variables from `.env.example` to the Vercel project settings.
4. Keep all private keys server-side. None of the required variables should use a `VITE_` prefix.
5. Use Preview deployments to test x402 and Circle Gateway configuration before production.

The included `vercel.json` keeps the Vite app static and runs the `/api/*` routes as Node.js functions.

## Origin

This starter was extracted from [AgoraBabel](https://github.com/IFAKA/AgoraBabel-SaaS), the originating Arc hackathon product demo.
