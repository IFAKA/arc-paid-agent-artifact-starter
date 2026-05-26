export const traceRegistryAbi = [
  {
    type: 'function',
    name: 'commitTrace',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'artifactHash', type: 'bytes32' },
      { name: 'sourceHash', type: 'bytes32' },
      { name: 'artifactId', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'TraceCommitted',
    inputs: [
      { name: 'artifactHash', type: 'bytes32', indexed: true },
      { name: 'sourceHash', type: 'bytes32', indexed: true },
      { name: 'artifactId', type: 'string', indexed: false },
      { name: 'committer', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
] as const;

