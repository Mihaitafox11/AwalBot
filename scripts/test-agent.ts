import { io } from "socket.io-client";

const TOKEN = process.argv[2] || process.env.AGENT_TOKEN;
const RELAY_URL = "http://localhost:3001";

if (!TOKEN) {
  console.error("Usage: npx tsx scripts/test-agent.ts <token>");
  process.exit(1);
}

const socket = io(RELAY_URL, { transports: ["websocket"] });

socket.on("connect", () => {
  console.log("[agent] Connected to relay");
});

socket.on("auth:challenge", () => {
  console.log("[agent] Got auth challenge, sending token...");
  socket.emit("auth:token", { token: TOKEN });
});

socket.on("auth:success", ({ wallet }: { wallet: string }) => {
  console.log(`[agent] Authenticated! Wallet: ${wallet}`);
  console.log("[agent] Agent is ONLINE and waiting for messages...\n");

  // Heartbeat
  setInterval(() => socket.emit("presence:heartbeat"), 15_000);
});

socket.on("auth:error", ({ message }: { message: string }) => {
  console.error(`[agent] Auth failed: ${message}`);
  process.exit(1);
});

// Handle incoming chat messages
socket.on("chat:message", ({ sessionId, content }: { sessionId: string; content: string }) => {
  console.log(`[agent] Message from user: "${content}" (session: ${sessionId})`);

  // Echo the message back
  const response = `Echo: ${content}`;
  console.log(`[agent] Responding: "${response}"`);
  socket.emit("chat:response", { sessionId, content: response });
});

socket.on("session:started", ({ sessionId }: { sessionId: string }) => {
  console.log(`[agent] Session started: ${sessionId}`);
});

socket.on("session:ended", ({ sessionId }: { sessionId: string }) => {
  console.log(`[agent] Session ended: ${sessionId}`);
});

socket.on("disconnect", (reason) => {
  console.log(`[agent] Disconnected: ${reason}`);
});
