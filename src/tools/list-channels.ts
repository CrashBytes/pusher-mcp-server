// src/tools/list-channels.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getPusherClient } from "../pusher-client.js";

export function registerListChannels(server: McpServer) {
  server.tool(
    "list_channels",
    "List all active channels in your Pusher app. Optionally filter by prefix (e.g. 'presence-' or 'private-') and request subscription or user counts.",
    {
      prefix: z
        .string()
        .optional()
        .describe(
          "Filter channels by prefix (e.g. 'presence-', 'private-chat-')"
        ),
      info: z
        .array(z.enum(["user_count", "subscription_count"]))
        .optional()
        .describe("Additional attributes to include for each channel"),
    },
    async ({ prefix, info }) => {
      try {
        const pusher = getPusherClient();

        const params: Record<string, string> = {};
        if (prefix) params.filter_by_prefix = prefix;
        if (info && info.length > 0) params.info = info.join(",");

        const response = await pusher.get({
          path: "/channels",
          params,
        });

        if (response.status !== 200) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Pusher API returned status ${response.status}`,
              },
            ],
            isError: true,
          };
        }

        const body = (await response.json()) as {
          channels: Record<
            string,
            { user_count?: number; subscription_count?: number }
          >;
        };
        const channels = body.channels || {};
        const names = Object.keys(channels);

        if (names.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: prefix
                  ? `No active channels matching prefix "${prefix}"`
                  : "No active channels",
              },
            ],
          };
        }

        const lines = names.map((name) => {
          const ch = channels[name];
          const parts = [name];
          if (ch.subscription_count !== undefined)
            parts.push(`subscriptions: ${ch.subscription_count}`);
          if (ch.user_count !== undefined)
            parts.push(`users: ${ch.user_count}`);
          return parts.join(" — ");
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Active channels (${names.length}):\n${lines.join("\n")}`,
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
              text: `Failed to list channels: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
