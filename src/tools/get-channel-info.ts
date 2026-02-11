// src/tools/get-channel-info.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getPusherClient } from "../pusher-client.js";

export function registerGetChannelInfo(server: McpServer) {
  server.tool(
    "get_channel_info",
    "Get detailed information about a specific Pusher channel, including whether it is occupied and optional subscription/user counts.",
    {
      channel: z
        .string()
        .min(1)
        .max(200)
        .describe("The channel name to query"),
      info: z
        .array(z.enum(["user_count", "subscription_count"]))
        .optional()
        .describe("Additional attributes to request"),
    },
    async ({ channel, info }) => {
      try {
        const pusher = getPusherClient();

        const params: Record<string, string> = {};
        if (info && info.length > 0) params.info = info.join(",");

        const response = await pusher.get({
          path: `/channels/${encodeURIComponent(channel)}`,
          params,
        });

        if (response.status !== 200) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Pusher API returned status ${response.status} for channel "${channel}"`,
              },
            ],
            isError: true,
          };
        }

        const body = (await response.json()) as {
          occupied?: boolean;
          user_count?: number;
          subscription_count?: number;
        };

        const lines = [`Channel: ${channel}`];
        if (body.occupied !== undefined)
          lines.push(`Occupied: ${body.occupied}`);
        if (body.subscription_count !== undefined)
          lines.push(`Subscriptions: ${body.subscription_count}`);
        if (body.user_count !== undefined)
          lines.push(`Users: ${body.user_count}`);

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to get channel info: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
