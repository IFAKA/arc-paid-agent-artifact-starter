import type { AgentArtifact } from './schema.ts';
import { sha256Hex } from './crypto.ts';

const source = 'Synthetic starter source: a demo agent generated a concise due-diligence brief for an Arc builder.';

export const sampleArtifact: AgentArtifact = {
  id: 'sample-agent-brief',
  title: 'Sample agent artifact',
  summary: 'A minimal verifiable payload builders can replace with their own agent output.',
  sourceHash: `0x${sha256Hex(source)}`,
  payload: {
    agent: 'starter-demo-agent',
    claim: 'This payload is deterministic, hashable, and ready for Arc trace publication.',
    confidence: 0.87,
    evidence: [
      { label: 'source', value: source },
      { label: 'schema', value: 'AgentArtifact v1' },
    ],
  },
  createdAt: '2026-05-26T00:00:00.000Z',
};

