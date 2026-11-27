/** Immutable participant-visible tool snapshot, scoped by the server on every read. */
export interface ToolDetailReference {
  conversationId: string;
  executionId: string;
  toolCallId: string;
  phase: 'input' | 'output' | 'error';
  id: string;
  sha256: string;
}

export interface ToolDetailPage {
  content: string;
  format: 'text' | 'json';
  /** UTF-16 offsets; pages never split a surrogate pair. */
  offset: number;
  nextOffset: number | null;
  totalCharacters: number;
  byteLength: number;
}

export function isToolDetailPage(value: unknown): value is ToolDetailPage {
  if (!value || typeof value !== 'object') return false;
  if (
    !('content' in value) ||
    typeof value.content !== 'string' ||
    value.content.length > 16_384 ||
    !('format' in value) ||
    (value.format !== 'text' && value.format !== 'json') ||
    !('offset' in value) ||
    typeof value.offset !== 'number' ||
    !Number.isSafeInteger(value.offset) ||
    value.offset < 0 ||
    !('nextOffset' in value) ||
    !('totalCharacters' in value) ||
    typeof value.totalCharacters !== 'number' ||
    !Number.isSafeInteger(value.totalCharacters) ||
    !('byteLength' in value) ||
    typeof value.byteLength !== 'number' ||
    !Number.isSafeInteger(value.byteLength) ||
    value.byteLength < 0
  )
    return false;

  const end = value.offset + value.content.length;
  if (!Number.isSafeInteger(end) || end > value.totalCharacters) return false;
  // A continuation must advance and leave content for the next page.
  return value.nextOffset === null
    ? end === value.totalCharacters
    : typeof value.nextOffset === 'number' &&
        value.nextOffset === end &&
        end > value.offset &&
        end < value.totalCharacters;
}
