// Socket event names (duplicated from @awalbot/shared to keep this package standalone)
export const AUTH_CHALLENGE = "auth:challenge";
export const AUTH_RESPONSE = "auth:response";
export const AUTH_SUCCESS = "auth:success";
export const AUTH_ERROR = "auth:error";
export const AGENT_HEARTBEAT = "presence:heartbeat";
export const CHAT_MESSAGE = "chat:message";
export const CHAT_RESPONSE = "chat:response";
export const SESSION_STARTED = "session:started";
export const SESSION_ENDED = "session:ended";
export const SESSION_EXPIRED = "session:expired";

export const AUTH_MESSAGE_PREFIX = "AwalBot Marketplace Auth";

export function buildAuthMessage(role: string, wallet: string, nonce: string): string {
  return `${AUTH_MESSAGE_PREFIX}\nRole: ${role}\nWallet: ${wallet}\nNonce: ${nonce}`;
}

// Contract addresses on Base Sepolia
export const AGENT_REGISTRY_ADDRESS = "0x3BFe274cCc52c76A65951F124648bd2aA980bC1C" as const;

export const AGENT_REGISTRY_ABI = [
  {
    type: "function",
    name: "register",
    inputs: [
      { name: "name", type: "string" },
      { name: "description", type: "string" },
      { name: "skills", type: "string" },
      { name: "hourlyRate", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isRegistered",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
] as const;
