/**
 * End-to-end test: Simulates a user connecting via socket, starting a session,
 * and exchanging messages with the test echo agent.
 */
import { io } from "socket.io-client";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const RELAY_URL = "http://localhost:3001";
// Use a different key for the "user" wallet
const USER_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

async function main() {
  const account = privateKeyToAccount(USER_KEY as `0x${string}`);
  console.log(`[user] Wallet: ${account.address}`);

  // First, get list of agents
  const agentsRes = await fetch(`${RELAY_URL}/agents`);
  const agents = await agentsRes.json();
  console.log(`[user] Found ${agents.length} agents:`, agents.map((a: any) => `${a.name} (${a.online ? 'online' : 'offline'})`));

  const onlineAgent = agents.find((a: any) => a.online);
  if (!onlineAgent) {
    console.error("[user] No online agents found!");
    process.exit(1);
  }

  console.log(`[user] Connecting as user to chat with "${onlineAgent.name}"...`);

  const socket = io(RELAY_URL, { transports: ["websocket"] });

  socket.on("connect", () => {
    console.log("[user] Connected to relay");
  });

  socket.on("auth:challenge", async ({ nonce }: { nonce: string }) => {
    console.log("[user] Got auth challenge, signing...");
    const message = `AwalBot Marketplace Auth\nRole: user\nWallet: ${account.address}\nNonce: ${nonce}`;
    const signature = await account.signMessage({ message });
    socket.emit("auth:response", {
      role: "user",
      wallet: account.address,
      nonce,
      signature,
    });
  });

  socket.on("auth:success", () => {
    console.log("[user] Authenticated!");

    // Start a session
    const sessionId = crypto.randomUUID();
    console.log(`[user] Starting session ${sessionId} with agent ${onlineAgent.wallet}...`);
    socket.emit("session:start", {
      agentWallet: onlineAgent.wallet,
      sessionId,
      durationSeconds: 300,
    });
  });

  socket.on("session:started", ({ sessionId }: { sessionId: string }) => {
    console.log(`[user] Session started: ${sessionId}`);
    console.log("[user] Sending test message...");
    socket.emit("chat:message", { sessionId, content: "Hello from the user!" });
  });

  socket.on("session:error", ({ message }: { message: string }) => {
    console.error(`[user] Session error: ${message}`);
  });

  socket.on("chat:message", ({ content, sender }: { content: string; sender: string }) => {
    console.log(`[user] Got response from ${sender}: "${content}"`);
    console.log("\n✅ END-TO-END CHAT WORKS! Message round-trip successful.");

    // Clean up
    setTimeout(() => {
      socket.disconnect();
      process.exit(0);
    }, 1000);
  });

  socket.on("auth:error", ({ message }: { message: string }) => {
    console.error(`[user] Auth failed: ${message}`);
    process.exit(1);
  });

  // Timeout
  setTimeout(() => {
    console.error("[user] Test timed out after 10s");
    process.exit(1);
  }, 10_000);
}

main().catch(console.error);
