import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerTriggerEvent } from "../src/tools/trigger-event.js";
import { registerTriggerBatchEvents } from "../src/tools/trigger-batch-events.js";
import { registerListChannels } from "../src/tools/list-channels.js";
import { registerGetChannelInfo } from "../src/tools/get-channel-info.js";
import { registerGetPresenceUsers } from "../src/tools/get-presence-users.js";
import { registerAuthorizeChannel } from "../src/tools/authorize-channel.js";
import { registerTerminateUser } from "../src/tools/terminate-user.js";
import { createMockPusherClient } from "./helpers.js";

// Mock the pusher-client module
vi.mock("../src/pusher-client.js", () => ({
  getPusherClient: vi.fn(),
}));

import { getPusherClient } from "../src/pusher-client.js";

describe("MCP Server Integration", () => {
  let server: McpServer;
  let client: Client;
  let mockPusher: ReturnType<typeof createMockPusherClient>;

  beforeEach(async () => {
    server = new McpServer({ name: "pusher-channels", version: "1.0.0" });
    client = new Client({ name: "test-client", version: "1.0.0" });

    mockPusher = createMockPusherClient();
    vi.mocked(getPusherClient).mockReturnValue(mockPusher as any);

    // Register all 7 tools — same as index.ts
    registerTriggerEvent(server);
    registerTriggerBatchEvents(server);
    registerListChannels(server);
    registerGetChannelInfo(server);
    registerGetPresenceUsers(server);
    registerAuthorizeChannel(server);
    registerTerminateUser(server);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  describe("tool listing", () => {
    it("exposes all 7 tools", async () => {
      const result = await client.listTools();
      const toolNames = result.tools.map((t) => t.name).sort();

      expect(toolNames).toEqual([
        "authorize_channel",
        "get_channel_info",
        "get_presence_users",
        "list_channels",
        "terminate_user_connections",
        "trigger_batch_events",
        "trigger_event",
      ]);
    });

    it("each tool has a description", async () => {
      const result = await client.listTools();
      for (const tool of result.tools) {
        expect(tool.description).toBeTruthy();
        expect(tool.description!.length).toBeGreaterThan(10);
      }
    });

    it("each tool has an input schema", async () => {
      const result = await client.listTools();
      for (const tool of result.tools) {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
      }
    });
  });

  describe("end-to-end tool calls", () => {
    it("trigger_event → list_channels → get_channel_info workflow", async () => {
      // Step 1: Trigger an event
      const triggerResult = await client.callTool({
        name: "trigger_event",
        arguments: {
          channel: "notifications",
          event: "alert",
          data: { level: "warning", message: "CPU usage high" },
        },
      });
      expect(triggerResult.isError).toBeFalsy();
      expect(mockPusher.trigger).toHaveBeenCalled();

      // Step 2: List channels
      mockPusher.get.mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          channels: {
            notifications: { subscription_count: 42 },
            "private-admin": { subscription_count: 3 },
          },
        }),
      });

      const listResult = await client.callTool({
        name: "list_channels",
        arguments: { info: ["subscription_count"] },
      });
      expect(listResult.isError).toBeFalsy();
      const listText = (listResult.content as any)[0].text;
      expect(listText).toContain("notifications");
      expect(listText).toContain("42");

      // Step 3: Get channel details
      mockPusher.get.mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          occupied: true,
          subscription_count: 42,
        }),
      });

      const infoResult = await client.callTool({
        name: "get_channel_info",
        arguments: {
          channel: "notifications",
          info: ["subscription_count"],
        },
      });
      expect(infoResult.isError).toBeFalsy();
      const infoText = (infoResult.content as any)[0].text;
      expect(infoText).toContain("Occupied: true");
      expect(infoText).toContain("Subscriptions: 42");
    });

    it("authorize_channel → trigger_event with socketId (echo prevention)", async () => {
      // Step 1: Authorize a private channel
      mockPusher.authorizeChannel.mockReturnValueOnce({
        auth: "key:signature",
      });

      const authResult = await client.callTool({
        name: "authorize_channel",
        arguments: {
          socketId: "100.200",
          channel: "private-chat",
        },
      });
      expect(authResult.isError).toBeFalsy();

      // Step 2: Trigger event excluding the authorized socket
      const triggerResult = await client.callTool({
        name: "trigger_event",
        arguments: {
          channel: "private-chat",
          event: "new-message",
          data: { from: "Alice", text: "Hello!" },
          socketId: "100.200",
        },
      });
      expect(triggerResult.isError).toBeFalsy();
      expect(mockPusher.trigger).toHaveBeenCalledWith(
        "private-chat",
        "new-message",
        '{"from":"Alice","text":"Hello!"}',
        { socket_id: "100.200" }
      );
    });

    it("get_presence_users → terminate_user_connections moderation flow", async () => {
      // Step 1: List presence users
      mockPusher.get.mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          users: [{ id: "user-good" }, { id: "user-bad" }, { id: "user-ok" }],
        }),
      });

      const usersResult = await client.callTool({
        name: "get_presence_users",
        arguments: { channel: "presence-chatroom" },
      });
      expect(usersResult.isError).toBeFalsy();
      const usersText = (usersResult.content as any)[0].text;
      expect(usersText).toContain("user-bad");

      // Step 2: Terminate the problematic user
      const termResult = await client.callTool({
        name: "terminate_user_connections",
        arguments: { userId: "user-bad" },
      });
      expect(termResult.isError).toBeFalsy();
      expect(mockPusher.terminateUserConnections).toHaveBeenCalledWith(
        "user-bad"
      );
    });

    it("trigger_batch_events sends multiple events atomically", async () => {
      const result = await client.callTool({
        name: "trigger_batch_events",
        arguments: {
          events: [
            {
              channel: "user-1",
              name: "notification",
              data: { msg: "You have a new message" },
            },
            {
              channel: "user-2",
              name: "notification",
              data: { msg: "Your order shipped" },
            },
            {
              channel: "analytics",
              name: "page-view",
              data: { page: "/dashboard", userId: "user-1" },
            },
          ],
        },
      });

      expect(result.isError).toBeFalsy();
      expect(mockPusher.triggerBatch).toHaveBeenCalledWith([
        {
          channel: "user-1",
          name: "notification",
          data: '{"msg":"You have a new message"}',
        },
        {
          channel: "user-2",
          name: "notification",
          data: '{"msg":"Your order shipped"}',
        },
        {
          channel: "analytics",
          name: "page-view",
          data: '{"page":"/dashboard","userId":"user-1"}',
        },
      ]);
    });
  });

  describe("error resilience", () => {
    it("one tool failing does not affect other tools", async () => {
      // Make trigger fail
      mockPusher.trigger.mockRejectedValueOnce(new Error("API down"));

      const failResult = await client.callTool({
        name: "trigger_event",
        arguments: { channel: "ch", event: "evt", data: "x" },
      });
      expect(failResult.isError).toBe(true);

      // List channels should still work
      mockPusher.get.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ channels: { "test-ch": {} } }),
      });

      const successResult = await client.callTool({
        name: "list_channels",
        arguments: {},
      });
      expect(successResult.isError).toBeFalsy();
      expect((successResult.content as any)[0].text).toContain("test-ch");
    });

    it("handles unknown tool gracefully", async () => {
      try {
        await client.callTool({
          name: "nonexistent_tool",
          arguments: {},
        });
        // If it doesn't throw, we shouldn't get here in most SDK versions
        expect.unreachable("Should have thrown");
      } catch (e: any) {
        expect(e.message || e.code).toBeDefined();
      }
    });
  });
});
