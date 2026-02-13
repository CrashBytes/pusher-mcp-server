import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerAuthorizeChannel } from "../../src/tools/authorize-channel.js";
import { createMockPusherClient } from "../helpers.js";

vi.mock("../../src/pusher-client.js", () => ({
  getPusherClient: vi.fn(),
}));

import { getPusherClient } from "../../src/pusher-client.js";

describe("authorize_channel", () => {
  let server: McpServer;
  let client: Client;
  let mockPusher: ReturnType<typeof createMockPusherClient>;

  beforeEach(async () => {
    server = new McpServer({ name: "test", version: "1.0.0" });
    client = new Client({ name: "test-client", version: "1.0.0" });

    mockPusher = createMockPusherClient();
    vi.mocked(getPusherClient).mockReturnValue(mockPusher as any);

    registerAuthorizeChannel(server);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  it("authorizes a private channel", async () => {
    mockPusher.authorizeChannel.mockReturnValueOnce({
      auth: "app-key:sig123",
    });

    const result = await client.callTool({
      name: "authorize_channel",
      arguments: {
        socketId: "123.456",
        channel: "private-user-42",
      },
    });

    expect(mockPusher.authorizeChannel).toHaveBeenCalledWith(
      "123.456",
      "private-user-42",
      undefined
    );
    expect(result.content).toEqual([
      {
        type: "text",
        text: 'Authorization for private-user-42:\n{\n  "auth": "app-key:sig123"\n}',
      },
    ]);
    expect(result.isError).toBeFalsy();
  });

  it("authorizes a presence channel with user data", async () => {
    mockPusher.authorizeChannel.mockReturnValueOnce({
      auth: "app-key:sig456",
      channel_data: '{"user_id":"user-99","user_info":{"name":"Alice"}}',
    });

    const result = await client.callTool({
      name: "authorize_channel",
      arguments: {
        socketId: "789.012",
        channel: "presence-room",
        presenceData: {
          user_id: "user-99",
          user_info: { name: "Alice" },
        },
      },
    });

    expect(mockPusher.authorizeChannel).toHaveBeenCalledWith(
      "789.012",
      "presence-room",
      { user_id: "user-99", user_info: { name: "Alice" } }
    );
    expect(result.isError).toBeFalsy();
  });

  it("rejects public channels (not private- or presence-)", async () => {
    const result = await client.callTool({
      name: "authorize_channel",
      arguments: {
        socketId: "123.456",
        channel: "public-channel",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: 'Channel must start with "private-" or "presence-" for authorization',
      },
    ]);
    expect(mockPusher.authorizeChannel).not.toHaveBeenCalled();
  });

  it("requires presenceData for presence channels", async () => {
    const result = await client.callTool({
      name: "authorize_channel",
      arguments: {
        socketId: "123.456",
        channel: "presence-lobby",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: "presenceData is required for presence channels",
      },
    ]);
    expect(mockPusher.authorizeChannel).not.toHaveBeenCalled();
  });

  it("handles Pusher SDK errors", async () => {
    mockPusher.authorizeChannel.mockImplementationOnce(() => {
      throw new Error("Invalid socket ID format");
    });

    const result = await client.callTool({
      name: "authorize_channel",
      arguments: {
        socketId: "bad-id",
        channel: "private-test",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Failed to authorize channel: Invalid socket ID format",
      },
    ]);
  });
});
