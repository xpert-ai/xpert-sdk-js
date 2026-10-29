import { describe, it, expect, vi } from 'vitest'
import { Client } from '../client.js'

describe('compact run status', () => {
  it('uses the lifecycle endpoint without changing full get()', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => new Response(JSON.stringify({ run_id: 'run', status: 'running' }), { headers: { 'Content-Type': 'application/json' } }))
    const client = new Client({ apiUrl: 'https://example.test/api/ai', callerOptions: { fetch } })
    expect((await client.runs.getStatus('thread', 'run')).status).toBe('running')
    await client.runs.get('thread', 'run')
    expect(String(fetch.mock.calls[0][0])).toContain('/threads/thread/runs/run/status')
    expect(String(fetch.mock.calls[1][0])).toMatch(/\/threads\/thread\/runs\/run$/)
  })
})
