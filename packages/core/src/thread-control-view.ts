/** Public hints only. The host revalidates every action against its durable execution state. */
export type ThreadControlActions = {
  canPause: boolean;
  canResume: boolean;
  canTerminate: boolean;
  canSend: boolean;
  canQueue: boolean;
  canRetry: boolean;
  canRespond: boolean;
};
export type ThreadControlView = {
  version: 1;
  threadId: string;
  runId: string | null;
  /** Decimal durable clock; do not compare revisions as strings or timestamps. */
  revision: string;
  state:
    | 'idle'
    | 'running'
    | 'pausing'
    | 'paused'
    | 'stopping'
    | 'settling'
    | 'input_required'
    | 'confirming'
    | 'completed'
    | 'stopped'
    | 'failed';
  actions: ThreadControlActions;
  pauseId?: string;
};
const states: readonly string[] = [
  'idle',
  'running',
  'pausing',
  'paused',
  'stopping',
  'settling',
  'input_required',
  'confirming',
  'completed',
  'stopped',
  'failed',
];

export function isThreadControlView(value: unknown): value is ThreadControlView {
  if (
    !value ||
    typeof value !== 'object' ||
    !('version' in value) ||
    value.version !== 1 ||
    !('threadId' in value) ||
    typeof value.threadId !== 'string' ||
    !value.threadId ||
    !('runId' in value) ||
    !(value.runId === null || (typeof value.runId === 'string' && value.runId.length > 0)) ||
    !('revision' in value) ||
    typeof value.revision !== 'string' ||
    !/^[1-9][0-9]*$/.test(value.revision) ||
    !('state' in value) ||
    typeof value.state !== 'string' ||
    !states.includes(value.state) ||
    ('pauseId' in value && typeof value.pauseId !== 'string') ||
    !('actions' in value) ||
    !value.actions ||
    typeof value.actions !== 'object'
  )
    return false;
  const actions = value.actions;
  return (
    'canPause' in actions &&
    typeof actions.canPause === 'boolean' &&
    'canResume' in actions &&
    typeof actions.canResume === 'boolean' &&
    'canTerminate' in actions &&
    typeof actions.canTerminate === 'boolean' &&
    'canSend' in actions &&
    typeof actions.canSend === 'boolean' &&
    'canQueue' in actions &&
    typeof actions.canQueue === 'boolean' &&
    'canRetry' in actions &&
    typeof actions.canRetry === 'boolean' &&
    'canRespond' in actions &&
    typeof actions.canRespond === 'boolean'
  );
}

/** Revisions order the whole thread, including replacement runs. Never let an old response restore controls. */
export function mergeThreadControlView(
  previous: ThreadControlView | undefined,
  incoming: ThreadControlView
): ThreadControlView {
  if (!previous || previous.threadId !== incoming.threadId) return incoming;
  return BigInt(incoming.revision) < BigInt(previous.revision) ? previous : incoming;
}
