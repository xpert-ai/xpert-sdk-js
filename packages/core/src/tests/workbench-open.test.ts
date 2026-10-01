import { describe, expect, it } from 'vitest';
import { parseWorkbenchViewOpenEvent, WORKBENCH_VIEW_OPEN_EVENT } from '../index.js';

function event(overrides: Record<string, unknown> = {}) {
  return {
    type: WORKBENCH_VIEW_OPEN_EVENT,
    viewKey: 'pipeline-board',
    projectId: 'project-1',
    ...overrides,
  };
}

describe('workbench view open events', () => {
  it('parses a minimal live request scoped to a project', () => {
    expect(parseWorkbenchViewOpenEvent(event())).toEqual({
      type: WORKBENCH_VIEW_OPEN_EVENT,
      viewKey: 'pipeline-board',
      projectId: 'project-1',
    });
  });

  it('keeps the conversation scope, selection and scalar parameters', () => {
    expect(
      parseWorkbenchViewOpenEvent(
        event({
          conversationId: 'conversation-1',
          selectionId: 'selection-1',
          parameters: {
            stage: 'bid',
            pinned: true,
            ratio: 0.35,
            missing: null,
            bidders: ['acme', 'globex'],
            empty: [],
          },
        })
      )
    ).toEqual({
      type: WORKBENCH_VIEW_OPEN_EVENT,
      viewKey: 'pipeline-board',
      projectId: 'project-1',
      conversationId: 'conversation-1',
      selectionId: 'selection-1',
      parameters: {
        stage: 'bid',
        pinned: true,
        ratio: 0.35,
        missing: null,
        bidders: ['acme', 'globex'],
        empty: [],
      },
    });
  });

  it('drops unknown fields so arbitrary log payloads cannot smuggle state', () => {
    expect(
      parseWorkbenchViewOpenEvent(event({ extra: 'ignored', nested: { deep: true } }))
    ).toEqual({
      type: WORKBENCH_VIEW_OPEN_EVENT,
      viewKey: 'pipeline-board',
      projectId: 'project-1',
    });
  });

  it('rejects non-object payloads, other event types and missing scope', () => {
    for (const value of [
      null,
      undefined,
      'workbench.view.open',
      42,
      [event()],
      event({ type: 'assistant.citation.open' }),
      { viewKey: 'pipeline-board', projectId: 'project-1' },
      event({ viewKey: '' }),
      event({ viewKey: '   ' }),
      event({ projectId: '' }),
      event({ projectId: '   ' }),
    ]) {
      expect(parseWorkbenchViewOpenEvent(value)).toBeNull();
    }
  });

  it('rejects mistyped optional identifiers and parameter containers', () => {
    for (const value of [
      event({ conversationId: 7 }),
      event({ selectionId: {} }),
      event({ parameters: null }),
      event({ parameters: ['bid'] }),
      event({ parameters: 'bid' }),
    ]) {
      expect(parseWorkbenchViewOpenEvent(value)).toBeNull();
    }
  });

  it('rejects parameter values that are not scalars or arrays of scalars', () => {
    expect(
      parseWorkbenchViewOpenEvent(event({ parameters: { filter: { stage: 'bid' } } }))
    ).toBeNull();
    expect(
      parseWorkbenchViewOpenEvent(event({ parameters: { bidders: ['acme', 3, true] } }))
    ).toEqual({
      type: WORKBENCH_VIEW_OPEN_EVENT,
      viewKey: 'pipeline-board',
      projectId: 'project-1',
      parameters: { bidders: ['acme', 3, true] },
    });
    expect(
      parseWorkbenchViewOpenEvent(event({ parameters: { bidders: ['acme', {}] } }))
    ).toBeNull();
    expect(parseWorkbenchViewOpenEvent(event({ parameters: { ratio: Number.NaN } }))).toBeNull();
    expect(
      parseWorkbenchViewOpenEvent(event({ parameters: { ratio: Number.POSITIVE_INFINITY } }))
    ).toBeNull();
  });

  it('accepts empty optional identifiers as-is (current behavior)', () => {
    expect(parseWorkbenchViewOpenEvent(event({ conversationId: '', selectionId: '' }))).toEqual({
      type: WORKBENCH_VIEW_OPEN_EVENT,
      viewKey: 'pipeline-board',
      projectId: 'project-1',
      conversationId: '',
      selectionId: '',
    });
  });
});
