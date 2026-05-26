import type { IncomingMessage, ServerResponse } from 'node:http';
import { GatewayClient } from '@circle-fin/x402-batching/client';
import { createGatewayMiddleware, type PaymentRequest } from '@circle-fin/x402-batching/server';
import { getRuntimeConfig } from './config.ts';
import { getArtifact } from './artifactStore.ts';
import { readJson, sendError, sendJson } from './http.ts';
import { AgentArtifactSchema, type AgentArtifact } from './schema.ts';

const arcTestnetNetwork = 'eip155:5042002';
const arcTestnetGatewayChain = 'arcTestnet';
const demoUnlockResourceHeader = 'x-arc-starter-x402-resource';

type X402Receipt = {
  payer: string;
  seller: string;
  priceUsdcMicro: number;
  formattedPrice: string;
  network: string;
  settlementTransaction: string | null;
};

export async function handleProtectedArtifact(request: IncomingMessage, response: ServerResponse, artifactId: string) {
  const config = getRuntimeConfig();

  if (!config.x402Enabled) {
    sendError(response, 503, 'x402 is disabled for this deployment.', 'x402-protected-artifact', 'Set X402_ENABLED=true to require paid access.');
    return;
  }

  const artifact = getArtifact(artifactId);
  if (!artifact) {
    sendError(response, 404, 'Artifact not found.', 'x402-protected-artifact', 'The requested artifact is not present in the in-memory starter store.');
    return;
  }

  await requireGatewayPayment(request, response, artifactId, () => {
    sendJson(response, 200, {
      artifact,
      x402Receipt: createReceipt((request as PaymentRequest).payment),
    });
  });
}

export async function handleDemoUnlock(request: IncomingMessage, response: ServerResponse, artifactId: string) {
  const config = getRuntimeConfig();

  if (!config.x402Enabled) {
    sendError(response, 503, 'x402 is disabled for this deployment.', 'demo-unlock', 'Set X402_ENABLED=true to run the demo buyer unlock flow.');
    return;
  }

  const artifact = getArtifact(artifactId) ?? await readArtifactFromBody(request, artifactId);
  if (!artifact) {
    sendError(response, 404, 'Artifact not found.', 'demo-unlock', 'The requested artifact is not present in the in-memory starter store.');
    return;
  }

  if (request.headers[demoUnlockResourceHeader] === '1') {
    await requireGatewayPayment(request, response, artifactId, () => {
      sendJson(response, 200, {
        artifact,
        x402Receipt: createReceipt((request as PaymentRequest).payment),
      });
    });
    return;
  }

  if (!config.x402BuyerPrivateKey) {
    sendError(response, 503, 'x402 buyer agent is not configured.', 'demo-unlock', 'Set X402_BUYER_PRIVATE_KEY or ARC_COMMITTER_PRIVATE_KEY.');
    return;
  }

  try {
    const buyer = new GatewayClient({
      chain: arcTestnetGatewayChain,
      privateKey: normalizePrivateKey(config.x402BuyerPrivateKey),
      rpcUrl: config.arcRpcUrl,
    });
    const price = BigInt(config.x402PriceUsdcMicro);
    const deposit = await depositIfNeeded(buyer, price);
    const paid = await buyer.pay<{ artifact: AgentArtifact; x402Receipt?: X402Receipt }>(
      createAbsoluteUrl(request, `/api/unlock/${encodeURIComponent(artifactId)}`),
      {
        method: 'POST',
        headers: { [demoUnlockResourceHeader]: '1' },
        body: { artifact },
      },
    );
    const receipt = paid.data.x402Receipt ?? {
      payer: buyer.address,
      seller: config.x402PayToAddress,
      priceUsdcMicro: Number(paid.amount || price),
      formattedPrice: paid.formattedAmount || formatUsdcMicro(price),
      network: 'Arc Testnet',
      settlementTransaction: paid.transaction || null,
    };

    sendJson(response, 200, {
      status: 'unlocked',
      artifactId,
      buyer: buyer.address,
      deposit,
      receipt,
      artifact: paid.data.artifact,
    });
  } catch (error) {
    sendError(response, 502, 'Demo buyer-agent x402 unlock failed.', 'demo-unlock', error instanceof Error ? error.message : 'Circle Gateway buyer payment failed.');
  }
}

async function readArtifactFromBody(request: IncomingMessage, artifactId: string): Promise<AgentArtifact | null> {
  const body = await readJson(request).catch(() => null);
  const artifact = body && typeof body === 'object' && 'artifact' in body
    ? (body as { artifact?: unknown }).artifact
    : null;
  const parsed = AgentArtifactSchema.safeParse(artifact);

  if (!parsed.success || parsed.data.id !== artifactId) return null;
  return parsed.data;
}

async function requireGatewayPayment(request: IncomingMessage, response: ServerResponse, artifactId: string, next: () => void) {
  const config = getRuntimeConfig();
  const gateway = createGatewayMiddleware({
    sellerAddress: config.x402PayToAddress,
    networks: arcTestnetNetwork,
    facilitatorUrl: config.x402FacilitatorUrl,
    description: 'Arc paid agent artifact',
  });
  const middleware = gateway.require(`$${formatUsdcMicro(config.x402PriceUsdcMicro)}`);

  response.setHeader('X-402-Price-USDC-Micro', String(config.x402PriceUsdcMicro));
  response.setHeader('X-402-Pay-To', config.x402PayToAddress);
  response.setHeader('X-402-Network', 'ARC-TESTNET');
  response.setHeader('X-402-Gateway', config.x402FacilitatorUrl);

  const originalEnd = response.end.bind(response);
  response.end = ((chunk?: unknown, encoding?: BufferEncoding | (() => void), callback?: () => void) => {
    if (response.statusCode === 402 && response.hasHeader('PAYMENT-REQUIRED')) {
      const body = JSON.stringify({
        error: 'Payment Required',
        stage: 'x402-protected-artifact',
        artifactId,
        priceUsdcMicro: config.x402PriceUsdcMicro,
        formattedPrice: formatUsdcMicro(config.x402PriceUsdcMicro),
        payToAddress: config.x402PayToAddress,
        network: 'ARC-TESTNET',
        gatewayUrl: config.x402FacilitatorUrl,
        paymentRequiredHeader: response.getHeader('PAYMENT-REQUIRED'),
      });

      response.setHeader('Content-Type', 'application/json;charset=utf-8');
      return originalEnd(body, typeof encoding === 'function' ? encoding : callback);
    }

    return originalEnd(chunk as never, encoding as never, callback);
  }) as ServerResponse['end'];

  await middleware(request as PaymentRequest, response, (error?: unknown) => {
    if (error) throw error;
    next();
  });
}

async function depositIfNeeded(client: GatewayClient, requiredAmount: bigint) {
  const balances = await client.getBalances();
  if (balances.gateway.available >= requiredAmount) return null;

  const deficit = requiredAmount - balances.gateway.available;
  const deposit = await client.deposit(formatUsdcMicro(deficit));

  return {
    status: 'submitted',
    amountUsdc: deposit.formattedAmount,
    depositTxHash: deposit.depositTxHash,
    approvalTxHash: deposit.approvalTxHash,
  };
}

function createReceipt(payment: PaymentRequest['payment'] | undefined): X402Receipt {
  const config = getRuntimeConfig();

  return {
    payer: payment?.payer ?? '',
    seller: config.x402PayToAddress,
    priceUsdcMicro: config.x402PriceUsdcMicro,
    formattedPrice: formatUsdcMicro(config.x402PriceUsdcMicro),
    network: payment?.network === arcTestnetNetwork ? 'Arc Testnet' : payment?.network ?? 'Arc Testnet',
    settlementTransaction: payment?.transaction ?? null,
  };
}

function createAbsoluteUrl(request: IncomingMessage, path: string) {
  const forwardedProto = request.headers['x-forwarded-proto'];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const protocol = proto ?? 'http';
  const host = request.headers.host ?? '127.0.0.1:5173';
  return `${protocol}://${host}${path}`;
}

function normalizePrivateKey(value: string) {
  return (value.startsWith('0x') ? value : `0x${value}`) as `0x${string}`;
}

function formatUsdcMicro(value: bigint | number) {
  const atomic = typeof value === 'bigint' ? value : BigInt(value);
  const whole = atomic / 1_000_000n;
  const fraction = (atomic % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

