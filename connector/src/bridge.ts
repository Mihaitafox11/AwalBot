import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";

export interface AgentBridge {
  handleMessage(sessionId: string, content: string): Promise<string>;
}

export function createHttpBridge(endpoint: string): AgentBridge {
  return {
    async handleMessage(sessionId: string, content: string): Promise<string> {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content, sessionId }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = (await res.json()) as { response: string };
        return data.response;
      } catch (err) {
        console.error("[bridge] HTTP error:", err);
        return "Agent error: unable to process message";
      }
    },
  };
}

export function createStdioBridge(command: string): AgentBridge {
  const parts = command.split(" ");
  const proc: ChildProcess = spawn(parts[0], parts.slice(1), {
    stdio: ["pipe", "pipe", "inherit"],
  });

  const rl = createInterface({ input: proc.stdout! });
  const pending: Array<(line: string) => void> = [];

  rl.on("line", (line) => {
    const resolve = pending.shift();
    if (resolve) resolve(line);
  });

  proc.on("exit", (code) => {
    console.error(`[bridge] Stdio process exited with code ${code}`);
  });

  return {
    async handleMessage(sessionId: string, content: string): Promise<string> {
      try {
        const request = JSON.stringify({ message: content, sessionId });
        proc.stdin!.write(request + "\n");

        const line = await new Promise<string>((resolve, reject) => {
          pending.push(resolve);
          setTimeout(() => reject(new Error("Stdio timeout")), 30_000);
        });

        const data = JSON.parse(line) as { response: string };
        return data.response;
      } catch (err) {
        console.error("[bridge] Stdio error:", err);
        return "Agent error: unable to process message";
      }
    },
  };
}
