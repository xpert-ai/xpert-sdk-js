// in this case don't quite match.
type IterableReadableStreamInterface<T> = ReadableStream<T> & AsyncIterable<T>;

/*
 * Support async iterator syntax for ReadableStreams in all environments.
 * Source: https://github.com/MattiasBuelens/web-streams-polyfill/pull/122#issuecomment-1627354490
 */
export class IterableReadableStream<T>
  extends ReadableStream<T>
  implements IterableReadableStreamInterface<T>
{
  private reader: ReadableStreamDefaultReader<T> | null = null;

  private ensureReader(): ReadableStreamDefaultReader<T> {
    if (!this.reader) {
      this.reader = this.getReader();
    }
    return this.reader;
  }

  async next(): Promise<IteratorResult<T>> {
    const reader = this.ensureReader();
    try {
      const result = await reader.read();
      if (result.done) {
        reader.releaseLock(); // release lock when stream becomes closed
        this.reader = null;
        return {
          done: true,
          value: undefined,
        };
      } else {
        return {
          done: false,
          value: result.value,
        };
      }
    } catch (e) {
      reader.releaseLock(); // release lock when stream becomes errored
      this.reader = null;
      throw e;
    }
  }

  async return(): Promise<IteratorResult<T>> {
    const reader = this.ensureReader();
    // If wrapped in a Node stream, cancel is already called.
    if (this.locked) {
      const cancelPromise = reader.cancel(); // cancel first, but don't await yet
      reader.releaseLock(); // release lock first
      await cancelPromise; // now await it
    }
    this.reader = null;
    return { done: true, value: undefined };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async throw(e: any): Promise<IteratorResult<T>> {
    const reader = this.ensureReader();
    if (this.locked) {
      const cancelPromise = reader.cancel(); // cancel first, but don't await yet
      reader.releaseLock(); // release lock first
      await cancelPromise; // now await it
    }
    this.reader = null;
    throw e;
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore Not present in Node 18 types, required in latest Node 22
  async [Symbol.asyncDispose]() {
    await this.return();
  }

  [Symbol.asyncIterator]() {
    return this;
  }

  static fromReadableStream<T>(stream: ReadableStream<T>) {
    // From https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams#reading_the_stream
    const reader = stream.getReader();
    return new IterableReadableStream<T>({
      start(controller) {
        return pump();
        function pump(): Promise<T | undefined> {
          return reader.read().then(({ done, value }) => {
            // When no more data needs to be consumed, close the stream
            if (done) {
              controller.close();
              return;
            }
            // Enqueue the next data chunk into our target stream
            controller.enqueue(value);
            return pump();
          });
        }
      },
      cancel() {
        reader.releaseLock();
      },
    });
  }

  static fromAsyncGenerator<T>(generator: AsyncGenerator<T>) {
    return new IterableReadableStream<T>({
      async pull(controller) {
        const { value, done } = await generator.next();
        // When no more data needs to be consumed, close the stream
        if (done) {
          controller.close();
        }
        // Fix: `else if (value)` will hang the streaming when nullish value (e.g. empty string) is pulled
        controller.enqueue(value);
      },
      async cancel(reason) {
        await generator.return(reason);
      },
    });
  }
}
