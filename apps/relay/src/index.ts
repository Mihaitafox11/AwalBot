import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import type { ChatMessage } from "@awalbot/shared";

const PORT = parseInt(process.env.PORT || "3001", 10);

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// ──── State ────

interface Agent {
  id: string;
  token: string;
  name: string;
  description: string;
  socketId: string | null; // null = offline
}

const agents = new Map<string, Agent>();      // id -> Agent
const tokenToId = new Map<string, string>();   // token -> agent id
const sessions = new Map<string, { agentId: string; messages: ChatMessage[] }>();

function genToken() {
  return "agt_" + uuidv4().replace(/-/g, "").slice(0, 24);
}

// ──── REST: Registration (from UI) ────

// Step 1: User registers an agent from the UI → gets a token + command
app.post("/agents", (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const id = uuidv4().slice(0, 8);
  const token = genToken();

  const agent: Agent = {
    id,
    token,
    name,
    description: description || "",
    socketId: null,
  };

  agents.set(id, agent);
  tokenToId.set(token, id);

  console.log(`[relay] Agent registered: "${name}" (${id})`);

  res.json({
    id,
    token,
    command: `npx @awalbot/connect ${token}`,
  });
});

// List agents (public info only)
app.get("/agents", (_req, res) => {
  const list = Array.from(agents.values()).map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    online: a.socketId !== null,
  }));
  res.json(list);
});

// Delete agent
app.delete("/agents/:id", (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) { res.status(404).json({ error: "Not found" }); return; }
  tokenToId.delete(agent.token);
  agents.delete(agent.id);
  // Kick the socket if connected
  if (agent.socketId) io.to(agent.socketId).disconnectSockets();
  res.json({ ok: true });
});

// ──── REST: Chat (from UI) ────

app.post("/sessions", (req, res) => {
  const { agentId } = req.body;
  const agent = agents.get(agentId);
  if (!agent || !agent.socketId) {
    res.status(400).json({ error: "Agent not found or offline" });
    return;
  }
  const sessionId = uuidv4();
  sessions.set(sessionId, { agentId, messages: [] });

  // Notify agent a session started
  io.to(agent.socketId).emit("session:start", { sessionId });

  res.json({ sessionId, agentId, agentName: agent.name });
});

app.post("/sessions/:sessionId/messages", async (req, res) => {
  const { sessionId } = req.params;
  const { content } = req.body;
  const session = sessions.get(sessionId);
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  if (!content) { res.status(400).json({ error: "content required" }); return; }

  const agent = agents.get(session.agentId);
  if (!agent || !agent.socketId) {
    res.status(502).json({ error: "Agent is offline" });
    return;
  }

  // Store user message
  const userMsg: ChatMessage = {
    id: uuidv4(), sessionId, sender: "user", content, timestamp: Date.now(),
  };
  session.messages.push(userMsg);

  // Send to agent via WebSocket and wait for response
  const responsePromise = new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Agent did not respond within 120s")), 120_000);

    // Listen for agent's reply to this specific message
    const handler = (data: { messageId: string; content: string }) => {
      if (data.messageId === userMsg.id) {
        clearTimeout(timeout);
        io.sockets.sockets.get(agent.socketId!)?.off("chat:response", handler);
        resolve(data.content);
      }
    };

    io.sockets.sockets.get(agent.socketId!)?.on("chat:response", handler);
  });

  // Forward message to agent
  io.to(agent.socketId).emit("chat:message", {
    sessionId,
    messageId: userMsg.id,
    content,
  });

  try {
    const responseContent = await responsePromise;
    const agentMsg: ChatMessage = {
      id: uuidv4(), sessionId, sender: "agent", content: responseContent, timestamp: Date.now(),
    };
    session.messages.push(agentMsg);
    res.json({ userMessage: userMsg, agentMessage: agentMsg });
  } catch (err: any) {
    res.status(504).json({ error: err.message });
  }
});

app.get("/sessions/:sessionId/messages", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  res.json(session?.messages || []);
});

// ──── WebSocket: Agent connections (from connector) ────

io.on("connection", (socket) => {
  let agentId: string | null = null;

  // Agent authenticates with its token
  socket.on("auth", (data: { token: string }) => {
    const id = tokenToId.get(data.token);
    if (!id) {
      socket.emit("auth:error", { message: "Invalid token" });
      socket.disconnect();
      return;
    }

    const agent = agents.get(id)!;
    agent.socketId = socket.id;
    agentId = id;

    socket.emit("auth:ok", { agentId: id, name: agent.name });
    console.log(`[relay] Agent online: "${agent.name}" (${id})`);
  });

  socket.on("disconnect", () => {
    if (agentId) {
      const agent = agents.get(agentId);
      if (agent && agent.socketId === socket.id) {
        agent.socketId = null;
        console.log(`[relay] Agent offline: "${agent.name}" (${agentId})`);
      }
    }
  });
});

// ──── Start ────

httpServer.listen(PORT, () => {
  console.log(`AwalBot relay listening on port ${PORT}`);
});
