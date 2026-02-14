import { createServer } from "node:http";

const PORT = 8000;

const server = createServer((req, res) => {
  if (req.method === "POST" && req.url === "/chat") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { message, sessionId } = JSON.parse(body) as {
          message: string;
          sessionId: string;
        };
        console.log(`[mock-agent] Session ${sessionId}: ${message}`);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ response: `Echo: ${message}` }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid request" }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`[mock-agent] Listening on http://localhost:${PORT}/chat`);
});
