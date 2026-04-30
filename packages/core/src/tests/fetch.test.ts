import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Client } from "../client.js";
import { overrideFetchImplementation } from "../singletons/fetch.js";

describe.each([["global"], ["mocked"]])(
  "Client uses %s fetch",
  (description: string) => {
    let globalFetchMock: ReturnType<typeof vi.fn>;
    let overriddenFetch: ReturnType<typeof vi.fn>;

    let expectedFetchMock: ReturnType<typeof vi.fn>;
    let unexpectedFetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      globalFetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              batch_ingest_config: {
                use_multipart_endpoint: true,
              },
            }),
          text: () => Promise.resolve(""),
          headers: new Headers({}),
        })
      );
      overriddenFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              batch_ingest_config: {
                use_multipart_endpoint: true,
              },
            }),
          text: () => Promise.resolve(""),
          headers: new Headers({}),
        })
      );
      expectedFetchMock =
        description === "mocked" ? overriddenFetch : globalFetchMock;
      unexpectedFetchMock =
        description === "mocked" ? globalFetchMock : overriddenFetch;

      if (description === "mocked") {
        overrideFetchImplementation(overriddenFetch);
      } else {
        overrideFetchImplementation(globalFetchMock);
      }
      // Mock global fetch
      (globalThis as any).fetch = globalFetchMock;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe("createRuns", () => {
      it("should create an example with the given input and generation", async () => {
        const client = new Client({ apiKey: "test-api-key" });

        const thread = await client.threads.create();
        expect(expectedFetchMock).toHaveBeenCalledTimes(1);
        expect(unexpectedFetchMock).not.toHaveBeenCalled();

        vi.clearAllMocks(); // Clear all mocks before the next operation

        // Then clear & run the function
        await client.runs.create(thread.thread_id, "somegraph", {
          input: { action: 'send', message: { input: { input: 'test' } } },
        });
        expect(expectedFetchMock).toHaveBeenCalledTimes(1);
        expect(unexpectedFetchMock).not.toHaveBeenCalled();
      });
    });

    describe("assistants runtime capabilities", () => {
      it("should fetch runtime capabilities with the expected path and signal", async () => {
        const controller = new AbortController();
        const payload = {
          skills: [
            {
              id: "skill-default",
              workspaceId: "workspace-1",
              label: "Default Skill",
              default: true,
            },
          ],
          plugins: [
            {
              nodeKey: "middleware-1",
              provider: "sandbox",
              label: "Sandbox",
              toolNames: ["run_command"],
            },
          ],
        };

        expectedFetchMock.mockImplementationOnce(async (url, init) => {
          expect(url).toBeInstanceOf(URL);
          expect((url as URL).pathname).toBe(
            "/assistants/assistant-1/runtime-capabilities"
          );
          expect(init?.signal).toBe(controller.signal);

          return {
            ok: true,
            status: 200,
            json: () => Promise.resolve(payload),
            text: () => Promise.resolve(JSON.stringify(payload)),
            headers: new Headers({}),
          } as Response;
        });

        const client = new Client({ apiKey: "test-api-key" });
        await expect(
          client.assistants.getRuntimeCapabilities("assistant-1", {
            signal: controller.signal,
          })
        ).resolves.toEqual(payload);
      });

      it("should reject 404 responses with a status field", async () => {
        expectedFetchMock.mockImplementationOnce(async () => {
          return {
            ok: false,
            status: 404,
            statusText: "Not Found",
            text: () => Promise.resolve("not found"),
            headers: new Headers({}),
          } as Response;
        });

        const client = new Client({ apiKey: "test-api-key" });
        await expect(
          client.assistants.getRuntimeCapabilities("assistant-1")
        ).rejects.toMatchObject({ status: 404 });
      });
    });

    describe("header coalescing", () => {
      it("should properly merge headers with conflicting name casing", async () => {
        const client = new Client({ apiKey: "test-api-key" });
        await (client.threads as any).fetch("/test", {
          headers: { "X-Api-Key": "custom-value" },
        });
        expect(expectedFetchMock).toHaveBeenCalledWith(
          expect.any(URL),
          expect.objectContaining({
            headers: expect.objectContaining({
              "x-api-key": "custom-value",
            }),
          })
        );
      });

      it("should properly merge headers from multiple sources", async () => {
        const client = new Client({
          apiKey: "test-api-key",
          defaultHeaders: {
            "x-default": "default-value",
            "x-override": "default-value",
          },
        });

        await (client.threads as any).fetch("/test", {
          headers: {
            "x-custom": "custom-value",
            "x-override": "custom-value",
          },
        });

        expect(expectedFetchMock).toHaveBeenCalledWith(
          expect.any(URL),
          expect.objectContaining({
            headers: expect.objectContaining({
              "x-api-key": "test-api-key",
              "x-default": "default-value",
              "x-custom": "custom-value",
              "x-override": "custom-value",
            }),
          })
        );

        vi.clearAllMocks();

        // Test with null/undefined values
        await (client.threads as any).fetch("/test", {
          headers: {
            "x-null": null,
            "x-undefined": undefined,
            "x-empty": "",
          },
        });

        expect(expectedFetchMock).toHaveBeenCalledWith(
          expect.any(URL),
          expect.objectContaining({
            headers: expect.objectContaining({
              "x-api-key": "test-api-key",
              "x-default": "default-value",
            }),
          })
        );
        expect(expectedFetchMock).not.toHaveBeenCalledWith(
          expect.any(URL),
          expect.objectContaining({
            headers: expect.objectContaining({
              "x-null": null,
              "x-undefined": undefined,
            }),
          })
        );
      });

      it("should handle Headers object input", async () => {
        const client = new Client({ apiKey: "test-api-key" });
        const headers = new Headers();
        headers.append("x-custom", "custom-value");
        headers.append("x-multi", "value1");
        headers.append("x-multi", "value2");

        await (client.threads as any).fetch("/test", { headers });

        expect(expectedFetchMock).toHaveBeenCalledWith(
          expect.any(URL),
          expect.objectContaining({
            headers: expect.objectContaining({
              "x-api-key": "test-api-key",
              "x-custom": "custom-value",
              "x-multi": "value1, value2",
            }),
          })
        );
      });

      it("should handle array of header tuples", async () => {
        const client = new Client({
          apiKey: "test-api-key",
          defaultHeaders: {
            "x-custom": "custom-value",
          },
        });
        const headers = [
          ["x-multi", "value1"],
          ["x-multi", "value2"],
        ];

        await (client.threads as any).fetch("/test", { headers });

        expect(expectedFetchMock).toHaveBeenCalledWith(
          expect.any(URL),
          expect.objectContaining({
            headers: expect.objectContaining({
              "x-api-key": "test-api-key",
              "x-custom": "custom-value",
              "x-multi": "value1, value2",
            }),
          })
        );
      });
    });
  }
);
