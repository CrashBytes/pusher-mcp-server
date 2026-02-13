import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to test getPusherClient which reads env vars and creates a singleton.
// We'll dynamically import it after setting env vars to test different scenarios.

describe("pusher-client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset module cache so singleton resets between tests
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws when all env vars are missing", async () => {
    delete process.env.PUSHER_APP_ID;
    delete process.env.PUSHER_KEY;
    delete process.env.PUSHER_SECRET;
    delete process.env.PUSHER_CLUSTER;

    const { getPusherClient } = await import("../src/pusher-client.js");
    expect(() => getPusherClient()).toThrow("Missing required environment variables");
    expect(() => getPusherClient()).toThrow("PUSHER_APP_ID");
    expect(() => getPusherClient()).toThrow("PUSHER_KEY");
    expect(() => getPusherClient()).toThrow("PUSHER_SECRET");
    expect(() => getPusherClient()).toThrow("PUSHER_CLUSTER");
  });

  it("throws when only PUSHER_APP_ID is missing", async () => {
    delete process.env.PUSHER_APP_ID;
    process.env.PUSHER_KEY = "test-key";
    process.env.PUSHER_SECRET = "test-secret";
    process.env.PUSHER_CLUSTER = "us2";

    const { getPusherClient } = await import("../src/pusher-client.js");
    expect(() => getPusherClient()).toThrow("PUSHER_APP_ID");
  });

  it("throws when only PUSHER_SECRET is missing", async () => {
    process.env.PUSHER_APP_ID = "123456";
    process.env.PUSHER_KEY = "test-key";
    delete process.env.PUSHER_SECRET;
    process.env.PUSHER_CLUSTER = "us2";

    const { getPusherClient } = await import("../src/pusher-client.js");
    expect(() => getPusherClient()).toThrow("PUSHER_SECRET");
  });

  it("creates a Pusher client when all env vars are set", async () => {
    process.env.PUSHER_APP_ID = "123456";
    process.env.PUSHER_KEY = "test-key";
    process.env.PUSHER_SECRET = "test-secret";
    process.env.PUSHER_CLUSTER = "us2";

    const { getPusherClient } = await import("../src/pusher-client.js");
    const client = getPusherClient();
    expect(client).toBeDefined();
    expect(client.config).toBeDefined();
    expect(client.config.appId).toBe("123456");
    expect((client.config as any).token.key).toBe("test-key");
    expect(client.config.scheme).toBe("https");
  });

  it("returns the same singleton on subsequent calls", async () => {
    process.env.PUSHER_APP_ID = "123456";
    process.env.PUSHER_KEY = "test-key";
    process.env.PUSHER_SECRET = "test-secret";
    process.env.PUSHER_CLUSTER = "us2";

    const { getPusherClient } = await import("../src/pusher-client.js");
    const client1 = getPusherClient();
    const client2 = getPusherClient();
    expect(client1).toBe(client2);
  });

  it("lists all missing vars in error message", async () => {
    delete process.env.PUSHER_APP_ID;
    process.env.PUSHER_KEY = "test-key";
    delete process.env.PUSHER_SECRET;
    process.env.PUSHER_CLUSTER = "us2";

    const { getPusherClient } = await import("../src/pusher-client.js");
    expect(() => getPusherClient()).toThrow("PUSHER_APP_ID, PUSHER_SECRET");
  });
});
