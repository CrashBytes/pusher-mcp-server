import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerTriggerBatchEvents } from "../../src/tools/trigger-batch-events.js";
import { createMockPusherClient } from "../helpers.js";

vi.mock("../../src/pusher-client.js", () => ({
  getPusherClient: vi.fn(),
}));

import { getPusherClient } from "../../src/pusher-client.js";

describe("trigger_batch_events", () => {
  let server: McpServer;
  let client: Client;
  let mockPusher: ReturnType<typeof createMockPusherClient>;

  beforeEach(async () => {
    server = new McpServer({ name: "test", version: "1.0.0" });
    client = new Client({ name: "test-client", version: "1.0.0" });

    mockPusher = createMockPusherClient();
    vi.mocked(getPusherClient).mockReturnValue(mockPusher as any);

    registerTriggerBatchEvents(server);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  it("sends a batch of events", async () => {
    const result = await client.callTool({
      name: "trigger_batch_events",
      arguments: {
        events: [
          { channel: "ch-1", name: "evt-a", data: { msg: "hello" } },
          { channel: "ch-2", name: "evt-b", data: "string payload" },
        ],
      },
    });

    expect(mockPusher.triggerBatch).toHaveBeenCalledWith([
      { channel: "ch-1", name: "evt-a", data: '{"msg":"hello"}' },
      { channel: "ch-2", name: "evt-b", data: "string payload" },
    ]);
    expect(result.content).toEqual([
      {
        type: "text",
        text: 'Batch of 2 event(s) triggered:\n  "evt-a" → ch-1\n  "evt-b" → ch-2',
      },
    ]);
    expect(result.isError).toBeFalsy();
  });

  it("includes socketId when provided", async () => {
    await client.callTool({
      name: "trigger_batch_events",
      arguments: {
        events: [
          {
            channel: "ch",
            name: "evt",
            data: "x",
            socketId: "111.222",
          },
        ],
      },
    });

    expect(mockPusher.triggerBatch).toHaveBeenCalledWith([
      { channel: "ch", name: "evt", data: "x", socket_id: "111.222" },
    ]);
  });

  it("handles a single event batch", async () => {
    const result = await client.callTool({
      name: "trigger_batch_events",
      arguments: {
        events: [{ channel: "solo", name: "ping", data: "pong" }],
      },
    });

    expect(result.content).toEqual([
      {
        type: "text",
        text: 'Batch of 1 event(s) triggered:\n  "ping" → solo',
      },
    ]);
  });

  it("returns error on Pusher API failure", async () => {
    mockPusher.triggerBatch.mockRejectedValueOnce(
      new Error("Batch too large")
    );

    const result = await client.callTool({
      name: "trigger_batch_events",
      arguments: {
        events: [{ channel: "ch", name: "evt", data: "x" }],
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Failed to trigger batch events: Batch too large",
      },
    ]);
  });
});
