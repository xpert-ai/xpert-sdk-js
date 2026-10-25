import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import {
  Client,
  HTTPError,
  isThreadControlView,
  mergeThreadControlView,
} from '@xpert-ai/xpert-sdk';
const view = {
  version: 1,
  threadId: 'thread/id',
  runId: 'run',
  revision: '9007199254740993',
  state: 'stopping',
  actions: {
    canPause: false,
    canResume: false,
    canTerminate: false,
    canSend: false,
    canQueue: false,
    canRetry: false,
    canRespond: false,
  },
};
let requests = 0;
let status = 200;
let payload = view;
let blocked;
const server = createServer((req, res) => {
  requests++;
  assert.equal(req.method, 'GET');
  assert.equal(req.url, '/api/ai/threads/thread%2Fid/control-view');
  if (blocked) {
    blocked();
    return;
  }
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
try {
  const client = new Client({
    apiUrl: `http://127.0.0.1:${server.address().port}/api/ai`,
    callerOptions: { maxRetries: 0 },
  });
  assert.deepEqual(await client.threads.getControlView(view.threadId), view);
  assert.equal(isThreadControlView(view), true);
  const newer = { ...view, revision: '9007199254740994', runId: 'new' };
  assert.equal(mergeThreadControlView(newer, view), newer);
  status = 404;
  await assert.rejects(
    client.threads.getControlView(view.threadId),
    (error) => error instanceof HTTPError && error.status === 404
  );
  status = 200;
  payload = { ...view, threadId: 'other' };
  await assert.rejects(client.threads.getControlView(view.threadId), /Invalid thread control view/);
  const arrived = new Promise((resolve) => {
    blocked = resolve;
  });
  const controller = new AbortController();
  const pending = client.threads.getControlView(view.threadId, { signal: controller.signal });
  const rejected = assert.rejects(pending, (error) => error.name === 'AbortError');
  await arrived;
  controller.abort();
  await rejected;
  assert.equal(
    requests,
    4,
    'Reads and cancellation must not replay business input or retry implicitly'
  );
  console.log(
    'Installed package: HTTP reads, abort, conservative old API, revision ordering passed'
  );
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
