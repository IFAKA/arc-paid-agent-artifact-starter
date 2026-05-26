import type { AgentArtifact, ArcTraceCommit } from './schema.ts';
import { getRuntimeConfig } from './config.ts';
import { hashArtifact, normalizeBytes32Hash } from './crypto.ts';
import { traceRegistryAbi } from './traceRegistryAbi.ts';

export async function commitArcTrace(artifact: AgentArtifact): Promise<ArcTraceCommit> {
  const config = getRuntimeConfig();

  if (!config.traceRegistryAddress || !config.committerPrivateKey) {
    throw new Error('Arc trace commit failed: ARC_TRACE_REGISTRY_ADDRESS and ARC_COMMITTER_PRIVATE_KEY are required.');
  }

  const viem = await import('viem');
  const accounts = await import('viem/accounts');
  const account = accounts.privateKeyToAccount(normalizePrivateKey(config.committerPrivateKey));
  const chain = {
    id: 5042002,
    name: 'Arc Testnet',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
    rpcUrls: { default: { http: [config.arcRpcUrl] } },
  } as const;
  const client = viem.createWalletClient({
    account,
    chain,
    transport: viem.http(config.arcRpcUrl),
  });
  const publicClient = viem.createPublicClient({
    chain,
    transport: viem.http(config.arcRpcUrl),
  });
  const artifactHash = hashArtifact(artifact);
  const sourceHash = normalizeBytes32Hash(artifact.sourceHash);
  const transactionHash = await client.writeContract({
    address: config.traceRegistryAddress as `0x${string}`,
    abi: traceRegistryAbi,
    functionName: 'commitTrace',
    args: [artifactHash, sourceHash, artifact.id],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });

  if (!receipt || receipt.status !== 'success') {
    throw new Error('Arc trace commit failed: transaction receipt was missing or reverted.');
  }

  return {
    status: 'committed',
    artifactHash,
    sourceHash,
    transactionHash,
    chainId: 5042002,
    network: 'Arc Testnet',
    explorerUrl: `https://testnet.arcscan.app/tx/${transactionHash}`,
    committedAt: new Date().toISOString(),
  };
}

function normalizePrivateKey(value: string) {
  return (value.startsWith('0x') ? value : `0x${value}`) as `0x${string}`;
}

