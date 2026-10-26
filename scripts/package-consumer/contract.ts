// This file is compiled in a fresh consumer with no paths aliases and skipLibCheck=false.
import {
  Client,
  HTTPError,
  isThreadControlView,
  mergeThreadControlView,
  type ThreadControlView,
  type ThreadCapabilities,
  type ReadRequestOptions,
} from '@xpert-ai/xpert-sdk';
const client = new Client({ apiUrl: 'http://127.0.0.1:1/api/ai' });
const options: ReadRequestOptions = { signal: new AbortController().signal };
const view: Promise<ThreadControlView> = client.threads.getControlView('thread', options);
const capabilities: Promise<ThreadCapabilities> = client.threads.getCapabilities('thread');
void [view, capabilities, HTTPError, isThreadControlView, mergeThreadControlView];
client.threads.get('thread', options);
client.runs.get('thread', 'run', options);
client.conversations.get('conversation', options);
client.conversations.listThreads('conversation', options);

// Every streaming mode carries the optional SSE cursor, including tuple/custom events.
async function readAllStreamCursors() {
  for (const subgraphs of [false, true] as const) {
    for await (const event of client.runs.stream('thread', 'assistant', {
      streamMode: ['values', 'updates', 'custom', 'debug', 'messages', 'messages-tuple', 'tasks', 'checkpoints', 'events'],
      streamSubgraphs: subgraphs,
    })) {
      const cursor: string | undefined = event.id;
      void cursor;
    }
  }
}
void readAllStreamCursors;
