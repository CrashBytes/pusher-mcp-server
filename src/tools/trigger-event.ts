// src/tools/trigger-event.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getPusherClient } from "../pusher-client.js";

export function registerTriggerEvent(server: McpServer) {
  server.tool(
    "trigger_event",
    "Send an event to one or more Pusher channels. Use this to push realtime messages to connected clients.",
    {
      channel: z
        .union([
          z.string().min(1).max(200),
          z.array(z.string().min(1).max(200)).min(1).max(100),
        ])
        .describe("Channel name or array of channel names (max 100)"),
      event: z
        .string()
        .min(1)
        .max(200)
        .describe("Event name to trigger (e.g. 'new-message', 'update')"),
      data: z
        .union([z.string(), z.record(z.unknown())])
        .describe("Event payload — string or JSON object (max 10KB)"),
      socketId: z
        .string()
        .optional()
        .describe(
          "Optional socket ID to exclude from receiving the event (prevents echo)"
        ),
    },
    async ({ channel, event, data, socketId }) => {
      try {
        const pusher = getPusherClient();
        const payload = typeof data === "string" ? data : JSON.stringify(data);
        const params = socketId ? { socket_id: socketId } : undefined;

        await pusher.trigger(channel, event, payload, params);

        const channels = Array.isArray(channel) ? channel : [channel];
        return {
          content: [
            {
              type: "text" as const,
              text: `Event "${event}" triggered on ${channels.length} channel(s): ${channels.join(", ")}`,
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to trigger event: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
