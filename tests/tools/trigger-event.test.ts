import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerTriggerEvent } from "../../src/tools/trigger-event.js";
import { createMockPusherClient } from "../helpers.js";

// Mock the pusher-client module
vi.mock("../../src/pusher-client.js", () => ({
  getPusherClient: vi.fn(),
}));

import { getPusherClient } from "../../src/pusher-client.js";

describe("trigger_event", () => {
  let server: McpServer;
  let client: Client;
  let mockPusher: ReturnType<typeof createMockPusherClient>;

  beforeEach(async () => {
    server = new McpServer({ name: "test", version: "1.0.0" });
    client = new Client({ name: "test-client", version: "1.0.0" });

    mockPusher = createMockPusherClient();
    vi.mocked(getPusherClient).mockReturnValue(mockPusher as any);

    registerTriggerEvent(server);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  it("triggers an event on a single channel", async () => {
    const result = await client.callTool({
      name: "trigger_event",
      arguments: {
        channel: "my-channel",
        event: "new-message",
        data: { text: "hello" },
      },
    });

    expect(mockPusher.trigger).toHaveBeenCalledWith(
      "my-channel",
      "new-message",
      '{"text":"hello"}',
      undefined
    );
    expect(result.content).toEqual([
      {
        type: "text",
        text: 'Event "new-message" triggered on 1 channel(s): my-channel',
      },
    ]);
    expect(result.isError).toBeFalsy();
  });

  it("triggers an event on multiple channels", async () => {
    const result = await client.callTool({
      name: "trigger_event",
      arguments: {
        channel: ["channel-1", "channel-2", "channel-3"],
        event: "update",
        data: "plain string payload",
      },
    });

    expect(mockPusher.trigger).toHaveBeenCalledWith(
      ["channel-1", "channel-2", "channel-3"],
      "update",
      "plain string payload",
      undefined
    );
    expect(result.content).toEqual([
      {
        type: "text",
        text: 'Event "update" triggered on 3 channel(s): channel-1, channel-2, channel-3',
      },
    ]);
  });

  it("passes socketId to exclude sender", async () => {
    await client.callTool({
      name: "trigger_event",
      arguments: {
        channel: "chat",
        event: "msg",
        data: "hi",
        socketId: "123.456",
      },
    });

    expect(mockPusher.trigger).toHaveBeenCalledWith("chat", "msg", "hi", {
      socket_id: "123.456",
    });
  });

  it("handles string data without double-stringifying", async () => {
    await client.callTool({
      name: "trigger_event",
      arguments: {
        channel: "test",
        event: "evt",
        data: "raw string data",
      },
    });

    // String data should be passed as-is, not JSON.stringify'd
    expect(mockPusher.trigger).toHaveBeenCalledWith(
      "test",
      "evt",
      "raw string data",
      undefined
    );
  });

  it("returns error when Pusher API fails", async () => {
    mockPusher.trigger.mockRejectedValueOnce(new Error("Rate limit exceeded"));

    const result = await client.callTool({
      name: "trigger_event",
      arguments: {
        channel: "test",
        event: "evt",
        data: "payload",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Failed to trigger event: Rate limit exceeded",
      },
    ]);
  });

  it("handles non-Error exceptions", async () => {
    mockPusher.trigger.mockRejectedValueOnce("string error");

    const result = await client.callTool({
      name: "trigger_event",
      arguments: {
        channel: "test",
        event: "evt",
        data: "payload",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Failed to trigger event: Unknown error",
      },
    ]);
  });
});
