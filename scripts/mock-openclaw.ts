/**
 * Mock OpenClaw gateway for testing.
 * Implements the OpenAI-compatible /v1/chat/completions and /health endpoints.
 */
import express from "express";

const PORT = 18789;
const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "mock-openclaw" });
});

app.post("/v1/chat/completions", (req, res) => {
  const { messages } = req.body;
  const lastMessage = messages?.[messages.length - 1]?.content || "";

  console.log(`[openclaw] Received: "${lastMessage}"`);

  const response = `I'm your OpenClaw agent! You said: "${lastMessage}"`;
  console.log(`[openclaw] Responding: "${response}"`);

  res.json({
    id: "mock-" + Date.now(),
    object: "chat.completion",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: response },
        finish_reason: "stop",
      },
    ],
  });
});

app.listen(PORT, () => {
  console.log(`Mock OpenClaw gateway listening on port ${PORT}`);
});
