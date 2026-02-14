import { io, type Socket } from "socket.io-client";

const DEFAULT_RELAY = "https://relay.awalbot.com";
const DEFAULT_OPENCLAW = "http://localhost:18789";

interface ConnectOptions {
  token: string;
  relayUrl?: string;
  openclawUrl?: string;
  agentId?: string;
}

export async function connect(opts: ConnectOptions) {
  const relayUrl = opts.relayUrl || DEFAULT_RELAY;
  const openclawUrl = opts.openclawUrl || DEFAULT_OPENCLAW;
  const agentId = opts.agentId || "main";

  console.log(`\n  AwalBot Connector`);
  console.log(`  Relay:    ${relayUrl}`);
  console.log(`  OpenClaw: ${openclawUrl}`);
  console.log(`  Agent:    ${agentId}\n`);

  // 1. Check OpenClaw is reachable
  try {
    const health = await fetch(`${openclawUrl}/health`, { signal: AbortSignal.timeout(5000) });
    if (!health.ok) throw new Error(`status ${health.status}`);
    console.log("  ✓ OpenClaw gateway reachable");
  } catch (e: any) {
    console.error(`  ✗ Cannot reach OpenClaw at ${openclawUrl}`);
    console.error(`    Make sure OpenClaw is running and the gateway is accessible.`);
    console.error(`    Error: ${e.message}\n`);
    process.exit(1);
  }

  // 2. Connect to relay
  return new Promise<void>((resolve) => {
    const socket: Socket = io(relayUrl, { transports: ["websocket"] });

    socket.on("connect", () => {
      console.log("  ✓ Connected to AwalBot relay");
      socket.emit("auth", { token: opts.token });
    });

    socket.on("auth:ok", ({ name }: { name: string }) => {
      console.log(`  ✓ Authenticated as "${name}"`);
      console.log(`\n  Agent is LIVE on the marketplace!\n`);
      resolve();
    });

    socket.on("auth:error", ({ message }: { message: string }) => {
      console.error(`  ✗ Auth failed: ${message}`);
      process.exit(1);
    });

    // Handle chat: forward to local OpenClaw, send response back
    socket.on("chat:message", async (data: { sessionId: string; messageId: string; content: string }) => {
      console.log(`  ← "${data.content}"`);

      try {
        const res = await fetch(`${openclawUrl}/v1/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: `openclaw:${agentId}`,
            messages: [{ role: "user", content: data.content }],
            stream: false,
          }),
          signal: AbortSignal.timeout(120_000),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`OpenClaw ${res.status}: ${text}`);
        }

        const json = await res.json();
        const reply = json.choices?.[0]?.message?.content || "No response.";

        console.log(`  → "${reply.slice(0, 80)}${reply.length > 80 ? "..." : ""}"`);
        socket.emit("chat:response", { messageId: data.messageId, content: reply });
      } catch (e: any) {
        console.error(`  ✗ OpenClaw error: ${e.message}`);
        socket.emit("chat:response", {
          messageId: data.messageId,
          content: "Sorry, the agent encountered an error.",
        });
      }
    });

    socket.on("session:start", ({ sessionId }: { sessionId: string }) => {
      console.log(`  Session started: ${sessionId}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`  Disconnected: ${reason}`);
      if (reason !== "io client disconnect") {
        console.log("  Reconnecting...");
      }
    });
  });
}
