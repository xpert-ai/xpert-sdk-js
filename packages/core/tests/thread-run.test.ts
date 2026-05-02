import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Client, ChatSendRequest } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..', '..');
config({ path: path.resolve(rootDir, '.env') });

type EnvConfig = {
  XPERT_API_URL?: string;
  XPERT_API_KEY?: string;
  XPERT_ASSISTANT_ID?: string;
  XPERT_ORGANIZATION_ID?: string;
};

function getEnv(): Required<EnvConfig> {
  const env = process.env as EnvConfig;
  const apiUrl = env.XPERT_API_URL;
  const apiKey = env.XPERT_API_KEY;
  const assistantId = env.XPERT_ASSISTANT_ID;
  const organizationId = env.XPERT_ORGANIZATION_ID;

  if (!apiUrl || !apiKey || !assistantId || !organizationId) {
    throw new Error(
      'Missing env vars. Set XPERT_API_URL, XPERT_API_KEY, XPERT_ASSISTANT_ID, and XPERT_ORGANIZATION_ID in the root .env file.'
    );
  }
  return { XPERT_API_URL: apiUrl, XPERT_API_KEY: apiKey, XPERT_ASSISTANT_ID: assistantId, XPERT_ORGANIZATION_ID: organizationId };
}

function hasThreadRunIntegrationEnv(): boolean {
  const env = process.env as EnvConfig;
  return Boolean(
    env.XPERT_API_URL &&
      env.XPERT_API_KEY &&
      env.XPERT_ASSISTANT_ID &&
      env.XPERT_ORGANIZATION_ID
  );
}

describe('Thread & Run Client', () => {
  const runWithThreadRunEnv = hasThreadRunIntegrationEnv() ? it : it.skip;

  runWithThreadRunEnv('should create a thread and stream a run', async () => {
    const env = getEnv();

    const client = new Client({
      apiUrl: env.XPERT_API_URL,
      apiKey: env.XPERT_API_KEY,
      defaultHeaders: {
        'organization-id': env.XPERT_ORGANIZATION_ID,
        'x-principal-user-id': process.env['X-PRINCIPAL-USER-ID'] || '',
      },
    });

    // 1. Create a thread
    const thread = await client.threads.create();
    expect(thread).toBeDefined();
    expect(thread.thread_id).toBeTruthy();
    console.log('Created thread:', thread.thread_id);

    let threadId = thread.thread_id;

    try {
      // 2. Stream a run on the thread
      const events: Array<{ event: string; data: unknown }> = [];
      const sendInput: ChatSendRequest = {
        action: 'send',
        message: {
          input: { input: 'Hello, who are you?' },
        },
      };
      const stream = client.runs.stream(threadId, env.XPERT_ASSISTANT_ID, {
        input: sendInput,
        streamMode: 'values',
      });

      for await (const chunk of stream) {
        events.push({ event: chunk.event, data: chunk.data });
        console.log(`[${chunk.event}]`, typeof chunk.data === 'string' ? chunk.data : JSON.stringify(chunk.data).slice(0, 200));
      }

      expect(events.length).toBeGreaterThan(0);
      console.log(`Received ${events.length} stream events`);

      // 3. Get thread state after the run
      const state = await client.threads.getState(threadId);
      expect(state).toBeDefined();
      console.log('Thread state values:', JSON.stringify(state.values).slice(0, 300));

      // 4. List runs for this thread
      const runs = await client.runs.list(threadId);
      expect(runs.length).toBeGreaterThan(0);
      console.log(`Found ${runs.length} run(s) for thread`);

      const lastRun = runs[0];
      expect(lastRun.status).toBe('success');
    } finally {
      // 5. Cleanup: delete the thread
      await client.threads.delete(threadId);
      console.log('Deleted thread:', threadId);
    }
  }, 120_000);

  runWithThreadRunEnv('should create a run and wait for result', async () => {
    const env = getEnv();

    const client = new Client({
      apiUrl: env.XPERT_API_URL,
      apiKey: env.XPERT_API_KEY,
      defaultHeaders: {
        'organization-id': env.XPERT_ORGANIZATION_ID,
      },
    });

    const thread = await client.threads.create();
    const threadId = thread.thread_id;
    console.log('Created thread:', threadId);

    try {
      const sendInput: ChatSendRequest = {
        action: 'send',
        message: {
          input: { input: 'What is 2+2?' },
        },
      };
      const result = await client.runs.wait(threadId, env.XPERT_ASSISTANT_ID, {
        input: sendInput,
      });

      expect(result).toBeDefined();
      console.log('Run wait result:', JSON.stringify(result).slice(0, 500));
    } finally {
      await client.threads.delete(threadId);
      console.log('Deleted thread:', threadId);
    }
  }, 120_000);

  runWithThreadRunEnv('should create a run, then get and cancel it', async () => {
    const env = getEnv();

    const client = new Client({
      apiUrl: env.XPERT_API_URL,
      apiKey: env.XPERT_API_KEY,
      defaultHeaders: {
        'organization-id': env.XPERT_ORGANIZATION_ID,
      },
    });

    const thread = await client.threads.create();
    const threadId = thread.thread_id;

    try {
      // Create a background run (don't await completion)
      const sendInput: ChatSendRequest = {
        action: 'send',
        message: {
          input: { input: 'Write a very long story about dragons.' },
        },
      };
      const run = await client.runs.create(threadId, env.XPERT_ASSISTANT_ID, {
        input: sendInput,
      });

      expect(run).toBeDefined();
      expect(run.run_id).toBeTruthy();
      console.log('Created run:', run.run_id, 'status:', run.status);

      // Get the run
      const fetched = await client.runs.get(threadId, run.run_id);
      expect(fetched.run_id).toBe(run.run_id);
      console.log('Fetched run status:', fetched.status);

      // Cancel the run if still running
      if (fetched.status === 'pending' || fetched.status === 'running') {
        await client.runs.cancel(threadId, run.run_id, true);
        console.log('Cancelled run:', run.run_id);
      }
    } finally {
      await client.threads.delete(threadId);
      console.log('Deleted thread:', threadId);
    }
  }, 120_000);
});
