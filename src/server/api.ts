import type { IncomingMessage, ServerResponse } from 'node:http';
import { getRuntimeStatus } from './config.ts';
import { getCircleAgentWalletStatus } from './circleWallet.ts';
import { createX402Publication, getArtifact, listArtifacts, publishArtifact } from './artifactStore.ts';
import { AgentArtifactSchema } from './schema.ts';
import { hashArtifact } from './crypto.ts';
import { methodNotAllowed, readJson, sendError, sendJson } from './http.ts';
import { handleDemoUnlock, handleProtectedArtifact } from './x402.ts';

export async function handleRuntimeStatusRequest(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'GET') {
    methodNotAllowed(request, response, 'runtime-status', 'GET');
    return;
  }

  const [runtime, circleWallet] = await Promise.all([
    getRuntimeStatus(),
    getCircleAgentWalletStatus(),
  ]);

  sendJson(response, runtime.status === 'ready' ? 200 : 503, {
    ...runtime,
    circleAgentWallet: circleWallet,
  });
}

export async function handleArtifactPublishRequest(request: IncomingMessage, response: ServerResponse) {
  if (!isArtifactRoot(request.url)) return;

  if (request.method === 'GET') {
    sendJson(response, 200, {
      artifacts: listArtifacts().map((artifact) => ({
        ...artifact,
        artifactHash: hashArtifact(artifact),
        x402: createX402Publication(artifact.id),
      })),
    });
    return;
  }

  if (request.method !== 'POST') {
    methodNotAllowed(request, response, 'artifact-publish', 'GET or POST');
    return;
  }

  const body = await readJson(request);
  const parsed = AgentArtifactSchema.safeParse(body);

  if (!parsed.success) {
    sendError(response, 400, 'Invalid AgentArtifact.', 'artifact-publish', 'The artifact must match the generic starter schema.', parsed.error.issues.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`));
    return;
  }

  try {
    const published = await publishArtifact(parsed.data);
    sendJson(response, 200, published);
  } catch (error) {
    sendError(response, 502, 'Artifact publication failed.', 'artifact-publish', error instanceof Error ? error.message : 'Arc trace commit or x402 publication failed.');
  }
}

export async function handleArtifactRequest(request: IncomingMessage, response: ServerResponse) {
  if (isArtifactRoot(request.url)) {
    await handleArtifactPublishRequest(request, response);
    return;
  }

  if (matchProtectedPath(request.url)) {
    await handleArtifactProtectedRequest(request, response);
    return;
  }

  sendError(response, 404, 'Artifact API route not found.', 'artifact-api', 'Expected /api/artifacts or /api/artifacts/:id/protected.');
}

export async function handleArtifactProtectedRequest(request: IncomingMessage, response: ServerResponse) {
  const match = matchProtectedPath(request.url);
  if (!match) return;

  if (request.method !== 'GET') {
    methodNotAllowed(request, response, 'x402-protected-artifact', 'GET');
    return;
  }

  await handleProtectedArtifact(request, response, match.artifactId);
}

export async function handleArtifactUnlockRequest(request: IncomingMessage, response: ServerResponse) {
  const artifactId = matchUnlockPath(request.url);
  if (!artifactId) return;

  if (request.method !== 'POST') {
    methodNotAllowed(request, response, 'demo-unlock', 'POST');
    return;
  }

  await handleDemoUnlock(request, response, artifactId);
}

export async function handleSampleArtifactRequest(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'GET') {
    methodNotAllowed(request, response, 'sample-artifact', 'GET');
    return;
  }

  const artifact = getArtifact('sample-agent-brief');
  sendJson(response, 200, {
    artifact,
    artifactHash: artifact ? hashArtifact(artifact) : null,
    x402: artifact ? createX402Publication(artifact.id) : null,
  });
}

function isArtifactRoot(url: string | undefined) {
  const pathname = new URL(url ?? '/', 'http://localhost').pathname;
  return pathname === '/' || pathname === '/api/artifacts' || pathname === '/api/artifacts/';
}

function matchProtectedPath(url: string | undefined) {
  const pathname = new URL(url ?? '/', 'http://localhost').pathname;
  const match = pathname.match(/^(?:\/api\/artifacts)?\/([^/]+)\/protected\/?$/);
  return match ? { artifactId: decodeURIComponent(match[1]) } : null;
}

function matchUnlockPath(url: string | undefined) {
  const pathname = new URL(url ?? '/', 'http://localhost').pathname;
  const match = pathname.match(/^(?:\/api\/unlock)?\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}
