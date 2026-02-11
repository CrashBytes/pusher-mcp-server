// src/pusher-client.ts
import Pusher from "pusher";

let client: Pusher | null = null;

export function getPusherClient(): Pusher {
  if (client) return client;

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  const missing: string[] = [];
  if (!appId) missing.push("PUSHER_APP_ID");
  if (!key) missing.push("PUSHER_KEY");
  if (!secret) missing.push("PUSHER_SECRET");
  if (!cluster) missing.push("PUSHER_CLUSTER");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Set these in your MCP server configuration or .env file."
    );
  }

  client = new Pusher({
    appId: appId!,
    key: key!,
    secret: secret!,
    cluster: cluster!,
    useTLS: true,
  });

  return client;
}
