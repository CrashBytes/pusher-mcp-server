// src/tools/trigger-batch-events.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getPusherClient } from "../pusher-client.js";

export function registerTriggerBatchEvents(server: McpServer) {
  server.tool(
    "trigger_batch_events",
    "Send up to 10 events in a single API call. More efficient than triggering events individually when you need to notify multiple channels.",
    {
      events: z
        .array(
          z.object({
            channel: z
              .string()
              .min(1)
              .max(200)
              .describe("Target channel name"),
            name: z.string().min(1).max(200).describe("Event name"),
            data: z
              .union([z.string(), z.record(z.unknown())])
              .describe("Event payload"),
            socketId: z.string().optional().describe("Socket ID to exclude"),
          })
        )
        .min(1)
        .max(10)
        .describe("Array of events to send (max 10)"),
    },
    async ({ events }) => {
      try {
        const pusher = getPusherClient();

        const batch = events.map((e) => ({
          channel: e.channel,
          name: e.name,
          data: typeof e.data === "string" ? e.data : JSON.stringify(e.data),
          ...(e.socketId ? { socket_id: e.socketId } : {}),
        }));

        await pusher.triggerBatch(batch);

        const summary = events
          .map((e) => `  "${e.name}" → ${e.channel}`)
          .join("\n");

        return {
          content: [
            {
              type: "text" as const,
              text: `Batch of ${events.length} event(s) triggered:\n${summary}`,
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
              text: `Failed to trigger batch events: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
