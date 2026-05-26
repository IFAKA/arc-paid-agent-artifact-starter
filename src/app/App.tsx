import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { AlertTriangle, CheckCircle2, CircleDollarSign, Copy, ExternalLink, FileJson2, GitFork, KeyRound, LockKeyhole, RadioTower, ShieldCheck } from 'lucide-react';
import type { ArtifactResponse, RuntimeStatus } from './types.ts';

type LoadState = 'loading' | 'ready' | 'failed';

export function App() {
  const [artifactState, setArtifactState] = useState<LoadState>('loading');
  const [runtimeState, setRuntimeState] = useState<LoadState>('loading');
  const [artifacts, setArtifacts] = useState<ArtifactResponse['artifacts']>([]);
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [unlockState, setUnlockState] = useState('idle');
  const sample = artifacts[0];
  const payloadText = useMemo(() => JSON.stringify(sample?.payload ?? {}, null, 2), [sample]);

  useEffect(() => {
    fetch('/api/artifacts')
      .then((response) => response.json())
      .then((payload: ArtifactResponse) => {
        setArtifacts(payload.artifacts);
        setArtifactState('ready');
      })
      .catch(() => setArtifactState('failed'));

    fetch('/api/runtime-status')
      .then((response) => response.json())
      .then((payload: RuntimeStatus) => {
        setRuntime(payload);
        setRuntimeState('ready');
      })
      .catch(() => setRuntimeState('failed'));
  }, []);

  async function probeProtectedAccess() {
    if (!sample) return;
    setUnlockState('checking');
    const response = await fetch(sample.x402.protectedUrl);
    const payload = await response.json().catch(() => null);
    setUnlockState(`${response.status} ${payload?.error ?? payload?.artifact?.title ?? 'response'}`);
  }

  return (
    <main className="min-h-screen bg-[#f5f3ed] text-[#17140f]">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-8 px-5 py-6 md:grid-cols-[0.9fr_1.1fr] md:px-8 lg:px-10">
        <div className="flex flex-col justify-between gap-10 border-r-0 border-[#17140f]/15 md:border-r md:pr-8">
          <div className="space-y-8">
            <nav className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em]">
                <RadioTower size={18} />
                Arc OSS
              </div>
              <a className="inline-flex items-center gap-2 text-sm font-semibold" href="https://github.com/IFAKA/AgoraBabel-SaaS" target="_blank" rel="noreferrer">
                AgoraBabel <ExternalLink size={15} />
              </a>
            </nav>

            <div className="space-y-5">
              <p className="w-fit border border-[#17140f] px-2 py-1 text-xs font-bold uppercase tracking-[0.16em]">Forkable starter kit</p>
              <h1 className="max-w-3xl text-5xl font-black leading-[0.94] tracking-normal md:text-6xl lg:text-7xl">
                Paid, verifiable Arc-native agent artifacts.
              </h1>
              <p className="max-w-xl text-lg leading-7 text-[#5c5548]">
                Minimal infrastructure for builders who need deterministic hashes, Arc Testnet trace commits, Circle wallet readiness, and x402 protected artifact unlocks.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
            <Signal icon={<FileJson2 size={19} />} label="Schema" value="AgentArtifact" />
            <Signal icon={<ShieldCheck size={19} />} label="Trace" value="Arc Testnet" />
            <Signal icon={<CircleDollarSign size={19} />} label="Payment" value={sample?.x402.status === 'required' ? 'x402 on' : 'x402 off'} />
          </div>
        </div>

        <div className="grid content-start gap-5">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="border border-[#17140f] bg-[#fffaf0] p-5 shadow-[8px_8px_0_#17140f]">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7a3f16]">Sample artifact</p>
                  <h2 className="mt-2 text-2xl font-black">{artifactState === 'loading' ? 'Loading artifact' : sample?.title}</h2>
                </div>
                <button className="inline-grid h-10 w-10 place-items-center border border-[#17140f] bg-[#e8ff63]" onClick={() => navigator.clipboard?.writeText(sample?.artifactHash ?? '')} title="Copy artifact hash">
                  <Copy size={18} />
                </button>
              </div>
              <p className="mb-5 leading-7 text-[#5c5548]">{sample?.summary ?? 'The starter API returns the included sample artifact without an LLM.'}</p>
              <pre className="max-h-[340px] overflow-auto border border-[#17140f]/20 bg-[#17140f] p-4 text-xs leading-5 text-[#f7f0dd]">{payloadText}</pre>
            </section>

            <section className="grid gap-3">
              <StatusPanel runtime={runtime} runtimeState={runtimeState} />
              <PaymentPanel sample={sample} unlockState={unlockState} onProbe={probeProtectedAccess} />
            </section>
          </div>

          <section className="grid gap-3 border border-[#17140f] bg-[#d8f3ff] p-5 md:grid-cols-2">
            <HashRow label="Artifact hash" value={sample?.artifactHash ?? 'pending'} />
            <HashRow label="Source hash" value={sample?.sourceHash ?? 'pending'} />
            <HashRow label="Trace transaction" value="configure env, then POST /api/artifacts" />
            <HashRow label="Price" value={sample?.x402.priceUsdcMicro ? `${sample.x402.priceUsdcMicro} micro USDC` : 'x402 disabled'} />
          </section>
        </div>
      </section>
    </main>
  );
}

function Signal({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-[#17140f] bg-[#fffaf0] p-4">
      <div className="mb-3 text-[#7a3f16]">{icon}</div>
      <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#5c5548]">{label}</div>
      <div className="mt-1 font-black">{value}</div>
    </div>
  );
}

function StatusPanel({ runtime, runtimeState }: { runtime: RuntimeStatus | null; runtimeState: LoadState }) {
  const ready = runtime?.status === 'ready';

  return (
    <section className="border border-[#17140f] bg-[#fffaf0] p-5">
      <div className="mb-4 flex items-center gap-2">
        {ready ? <CheckCircle2 className="text-[#167044]" size={20} /> : <AlertTriangle className="text-[#b04818]" size={20} />}
        <h2 className="text-lg font-black">Runtime status</h2>
      </div>
      <p className="text-sm leading-6 text-[#5c5548]">
        {runtimeState === 'loading' ? 'Checking local API...' : ready ? 'All required Arc, Circle, and x402 values are configured.' : 'Missing config is reported explicitly for local setup.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(runtime?.missing ?? ['runtime pending']).slice(0, 6).map((item) => (
          <span key={item} className="border border-[#17140f]/20 bg-white px-2 py-1 text-xs font-bold">{item}</span>
        ))}
      </div>
    </section>
  );
}

function PaymentPanel({ sample, unlockState, onProbe }: { sample: ArtifactResponse['artifacts'][number] | undefined; unlockState: string; onProbe: () => void }) {
  return (
    <section className="border border-[#17140f] bg-[#fffaf0] p-5">
      <div className="mb-4 flex items-center gap-2">
        <LockKeyhole size={20} />
        <h2 className="text-lg font-black">Protected unlock</h2>
      </div>
      <p className="text-sm leading-6 text-[#5c5548]">
        Publication state: <strong>{sample?.x402.status ?? 'pending'}</strong>. Disabled mode keeps the artifact visible and marks paid access unavailable.
      </p>
      <button className="mt-4 inline-flex min-h-11 items-center gap-2 border border-[#17140f] bg-[#ffb84d] px-4 text-sm font-black" onClick={onProbe} disabled={!sample}>
        <KeyRound size={16} />
        Probe protected API
      </button>
      <p className="mt-3 min-h-6 text-sm font-semibold">{unlockState}</p>
    </section>
  );
}

function HashRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[#31515f]">{label}</div>
      <div className="break-all font-mono text-sm">{value}</div>
    </div>
  );
}
