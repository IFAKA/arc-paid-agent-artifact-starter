import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJson, hashArtifact, sha256Hex } from './crypto.ts';

test('canonicalJson sorts object keys deterministically', () => {
  assert.equal(
    canonicalJson({ b: 2, a: { d: 4, c: 3 } }),
    '{"a":{"c":3,"d":4},"b":2}',
  );
});

test('hashArtifact is stable across object key order', () => {
  assert.equal(
    hashArtifact({ title: 'artifact', payload: { z: true, a: 1 } }),
    hashArtifact({ payload: { a: 1, z: true }, title: 'artifact' }),
  );
});

test('sha256Hex returns a bytes32-sized hex string', () => {
  assert.match(sha256Hex('arc'), /^[a-f0-9]{64}$/);
});

