import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleArtifactRequest, handleArtifactUnlockRequest, handleRuntimeStatusRequest } from './src/server/api.ts';

function starterApi() {
  return {
    name: 'arc-paid-agent-artifact-api',
    configureServer(server) {
      type Handler = (request: IncomingMessage, response: ServerResponse) => Promise<void>;
      const wrap = (handler: Handler, stage: string) => (request: IncomingMessage, response: ServerResponse) => {
        Promise.resolve(handler(request, response)).catch((error) => {
          server.config.logger.error(error);
          if (response.writableEnded) return;
          response.statusCode = 500;
          response.setHeader('Content-Type', 'application/json;charset=utf-8');
          response.end(JSON.stringify({
            error: error instanceof Error ? error.message : 'Starter API failed.',
            stage,
            likelyCause: 'The Vite middleware raised before returning a structured response.',
          }));
        });
      };

      server.middlewares.use('/api/runtime-status', wrap(handleRuntimeStatusRequest, 'runtime-status'));
      server.middlewares.use('/api/artifacts', wrap(handleArtifactRequest, 'artifact-api'));
      server.middlewares.use('/api/unlock', wrap(handleArtifactUnlockRequest, 'demo-unlock'));
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value;
  }

  return {
    plugins: [starterApi(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  };
});
