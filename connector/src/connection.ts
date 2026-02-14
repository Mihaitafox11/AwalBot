import { io, type Socket } from "socket.io-client";
import type { PrivateKeyAccount } from "viem/accounts";
import {
  AUTH_CHALLENGE,
  AUTH_RESPONSE,
  AUTH_SUCCESS,
  AUTH_ERROR,
  AGENT_HEARTBEAT,
  CHAT_MESSAGE,
  CHAT_RESPONSE,
  SESSION_STARTED,
  SESSION_ENDED,
  SESSION_EXPIRED,
  buildAuthMessage,
} from "@awalbot/shared";
import type { AgentBridge } from "./bridge.js";

export function connectToRelay(
  relayUrl: string,
  account: PrivateKeyAccount,
  bridge: AgentBridge
): Socket {
  const socket = io(relayUrl);
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  socket.on("connect", () => {
    console.log("[connector] Connected to relay:", relayUrl);
  });

  socket.on(AUTH_CHALLENGE, async ({ nonce }: { nonce: string }) => {
    console.log("[connector] Auth challenge received, signing...");
    const message = buildAuthMessage("agent", account.address, nonce);
    const signature = await account.signMessage({ message });

    socket.emit(AUTH_RESPONSE, {
      role: "agent",
      wallet: account.address,
      nonce,
      signature,
    });
  });

  socket.on(AUTH_SUCCESS, ({ wallet }: { wallet: string }) => {
    console.log(`[connector] Authenticated as agent ${wallet}`);

    // Start heartbeat
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      socket.emit(AGENT_HEARTBEAT);
    }, 15_000);
  });

  socket.on(AUTH_ERROR, ({ message }: { message: string }) => {
    console.error("[connector] Auth error:", message);
    process.exit(1);
  });

  socket.on(
    CHAT_MESSAGE,
    async ({ sessionId, content }: { sessionId: string; content: string }) => {
      console.log(`[connector] Message in session ${sessionId}: ${content}`);
      const response = await bridge.handleMessage(sessionId, content);
      socket.emit(CHAT_RESPONSE, { sessionId, content: response });
    }
  );

  socket.on(SESSION_STARTED, ({ sessionId }: { sessionId: string }) => {
    console.log(`[connector] Session started: ${sessionId}`);
  });

  socket.on(SESSION_ENDED, ({ sessionId }: { sessionId: string }) => {
    console.log(`[connector] Session ended: ${sessionId}`);
  });

  socket.on(SESSION_EXPIRED, ({ sessionId }: { sessionId: string }) => {
    console.log(`[connector] Session expired: ${sessionId}`);
  });

  socket.on("disconnect", (reason) => {
    console.log("[connector] Disconnected:", reason);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  });

  return socket;
}
