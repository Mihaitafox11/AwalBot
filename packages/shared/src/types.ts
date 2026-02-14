export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  gatewayUrl: string; // e.g. http://localhost:18789 or https://my-openclaw.example.com
  gatewayToken: string; // OpenClaw gateway auth token
  agentId: string; // OpenClaw agent ID (default: "main")
  createdAt: number;
}

export interface AgentPublic {
  id: string;
  name: string;
  description: string;
  online: boolean;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: "user" | "agent";
  content: string;
  timestamp: number;
}
