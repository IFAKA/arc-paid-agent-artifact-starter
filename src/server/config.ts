export type ServiceStatus = {
  status: 'configured' | 'unconfigured';
  details: string;
};

export type RuntimeStatus = {
  status: 'ready' | 'not-ready';
  checkedAt: string;
  arcChainId: 5042002;
  services: {
    arcRpc: ServiceStatus;
    traceRegistry: ServiceStatus;
    committer: ServiceStatus;
    circleWallet: ServiceStatus;
    x402: ServiceStatus;
  };
  missing: string[];
};

export function getRuntimeConfig() {
  return {
    arcRpcUrl: process.env.ARC_TESTNET_RPC_URL ?? 'https://rpc.testnet.arc.network',
    arcChainId: Number(process.env.ARC_CHAIN_ID ?? '5042002'),
    traceRegistryAddress: process.env.ARC_TRACE_REGISTRY_ADDRESS ?? '',
    committerPrivateKey: process.env.ARC_COMMITTER_PRIVATE_KEY ?? '',
    circleApiKey: process.env.CIRCLE_API_KEY ?? '',
    circleWalletSetId: process.env.CIRCLE_WALLET_SET_ID ?? '',
    circleAgentWalletId: process.env.CIRCLE_AGENT_WALLET_ID ?? '',
    circleAgentWalletAddress: process.env.CIRCLE_AGENT_WALLET_ADDRESS ?? '',
    x402Enabled: (process.env.X402_ENABLED ?? 'false').toLowerCase() === 'true',
    x402PriceUsdcMicro: Number(process.env.X402_PRICE_USDC_MICRO ?? '0'),
    x402PayToAddress: process.env.X402_PAY_TO_ADDRESS ?? '',
    x402FacilitatorUrl: process.env.X402_FACILITATOR_URL ?? 'https://gateway-api-testnet.circle.com',
    x402BuyerPrivateKey: process.env.X402_BUYER_PRIVATE_KEY || process.env.ARC_COMMITTER_PRIVATE_KEY || '',
  } as const;
}

export function getMissingConfig(): string[] {
  const config = getRuntimeConfig();
  const missing: string[] = [];

  if (config.arcChainId !== 5042002) missing.push('ARC_CHAIN_ID=5042002');
  if (!config.arcRpcUrl) missing.push('ARC_TESTNET_RPC_URL');
  if (!config.traceRegistryAddress) missing.push('ARC_TRACE_REGISTRY_ADDRESS');
  if (!config.committerPrivateKey) missing.push('ARC_COMMITTER_PRIVATE_KEY');
  if (!config.circleApiKey) missing.push('CIRCLE_API_KEY');
  if (!config.circleWalletSetId) missing.push('CIRCLE_WALLET_SET_ID');
  if (!config.circleAgentWalletId) missing.push('CIRCLE_AGENT_WALLET_ID');
  if (!config.circleAgentWalletAddress) missing.push('CIRCLE_AGENT_WALLET_ADDRESS');

  if (config.x402Enabled) {
    if (!config.x402PriceUsdcMicro || config.x402PriceUsdcMicro <= 0) missing.push('X402_PRICE_USDC_MICRO');
    if (!config.x402PayToAddress) missing.push('X402_PAY_TO_ADDRESS');
    if (!config.x402BuyerPrivateKey) missing.push('X402_BUYER_PRIVATE_KEY or ARC_COMMITTER_PRIVATE_KEY');
  }

  return missing;
}

export async function getRuntimeStatus(): Promise<RuntimeStatus> {
  const config = getRuntimeConfig();
  const missing = getMissingConfig();

  return {
    status: missing.length === 0 ? 'ready' : 'not-ready',
    checkedAt: new Date().toISOString(),
    arcChainId: 5042002,
    services: {
      arcRpc: {
        status: config.arcRpcUrl ? 'configured' : 'unconfigured',
        details: config.arcRpcUrl || 'ARC_TESTNET_RPC_URL missing',
      },
      traceRegistry: {
        status: config.traceRegistryAddress ? 'configured' : 'unconfigured',
        details: config.traceRegistryAddress || 'ARC_TRACE_REGISTRY_ADDRESS missing',
      },
      committer: {
        status: config.committerPrivateKey ? 'configured' : 'unconfigured',
        details: config.committerPrivateKey ? 'ARC_COMMITTER_PRIVATE_KEY present' : 'ARC_COMMITTER_PRIVATE_KEY missing',
      },
      circleWallet: {
        status: config.circleApiKey && config.circleWalletSetId && config.circleAgentWalletId && config.circleAgentWalletAddress ? 'configured' : 'unconfigured',
        details: config.circleAgentWalletAddress || 'Circle ARC-TESTNET wallet config missing',
      },
      x402: {
        status: config.x402Enabled && config.x402PayToAddress && config.x402PriceUsdcMicro > 0 ? 'configured' : 'unconfigured',
        details: config.x402Enabled ? 'x402 payment protection enabled' : 'X402_ENABLED=false',
      },
    },
    missing: [...new Set(missing)],
  };
}

