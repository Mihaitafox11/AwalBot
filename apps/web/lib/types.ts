export interface Agent {
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
