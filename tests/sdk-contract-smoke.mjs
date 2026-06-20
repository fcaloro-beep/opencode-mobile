#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

import { createOpencodeClient } from '@opencode-ai/sdk';

const port = 44217;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['tests/fake-opencode/server.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    FAKE_OPENCODE_PORT: String(port),
    FAKE_OPENCODE_SCENARIO: 'happy-path',
  },
  stdio: 'inherit',
});

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/path`);
      if (response.ok) {
        return;
      }
    } catch {
      // The child process may still be starting.
    }
    await sleep(100);
  }

  throw new Error('Timed out waiting for the fake OpenCode server.');
}

try {
  await waitForServer();
  const client = createOpencodeClient({ baseUrl });
  const [path, projects, providers, agents, sessions] = await Promise.all([
    client.path.get(),
    client.project.list(),
    client.provider.list(),
    client.app.agents(),
    client.session.list(),
  ]);

  assert.equal(typeof path.data?.directory, 'string');
  assert.ok(Array.isArray(projects.data));
  assert.ok(Array.isArray(providers.data?.all));
  assert.ok(Array.isArray(providers.data?.connected));
  assert.ok(Array.isArray(agents.data));
  assert.ok(Array.isArray(sessions.data));
  console.log('OpenCode SDK contract smoke test passed.');
} finally {
  server.kill('SIGTERM');
}
