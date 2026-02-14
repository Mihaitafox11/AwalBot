import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
import { connectToRelay } from "./connection.js";
import { createHttpBridge, createStdioBridge } from "./bridge.js";
import { createAgentWallet, ensureRegistered } from "./wallet.js";

const RELAY_URL = process.env.RELAY_URL;
const AGENT_MODE = process.env.AGENT_MODE || "http";
const AGENT_ENDPOINT = process.env.AGENT_ENDPOINT;

// Wallet mode: "agentkit" uses Coinbase AgentKit (agent gets its own wallet)
//              "privatekey" uses a raw private key (legacy)
const WALLET_MODE = process.env.WALLET_MODE || "agentkit";

// Agent profile (used for auto-registration with AgentKit)
const AGENT_NAME = process.env.AGENT_NAME || "My Agent";
const AGENT_DESCRIPTION = process.env.AGENT_DESCRIPTION || "An AI agent on AwalBot";
const AGENT_SKILLS = process.env.AGENT_SKILLS || "general";
const AGENT_HOURLY_RATE = process.env.AGENT_HOURLY_RATE || "1";

if (!RELAY_URL) {
  console.error("Missing RELAY_URL");
  process.exit(1);
}

if (!AGENT_ENDPOINT) {
  console.error("Missing AGENT_ENDPOINT");
  process.exit(1);
}

if (AGENT_MODE !== "http" && AGENT_MODE !== "stdio") {
  console.error("AGENT_MODE must be 'http' or 'stdio'");
  process.exit(1);
}

async function main() {
  let account: { address: string; signMessage: (args: { message: string }) => Promise<`0x${string}`> };

  if (WALLET_MODE === "agentkit") {
    console.log("[connector] Using Coinbase AgentKit wallet");
    const agentWallet = await createAgentWallet();

    // Auto-register on-chain if not already
    await ensureRegistered(
      agentWallet,
      AGENT_NAME,
      AGENT_DESCRIPTION,
      AGENT_SKILLS,
      AGENT_HOURLY_RATE
    );

    // Wrap to match the interface connectToRelay expects
    account = {
      address: agentWallet.address,
      signMessage: async ({ message }: { message: string }) => agentWallet.signMessage(message),
    };
  } else {
    const privateKey = process.env.AGENT_PRIVATE_KEY;
    if (!privateKey) {
      console.error("Missing AGENT_PRIVATE_KEY (required when WALLET_MODE=privatekey)");
      process.exit(1);
    }
    console.log("[connector] Using private key wallet");
    account = privateKeyToAccount(privateKey as `0x${string}`);
  }

  console.log(`[connector] Agent wallet: ${account.address}`);
  console.log(`[connector] Mode: ${AGENT_MODE}`);
  console.log(`[connector] Endpoint: ${AGENT_ENDPOINT}`);

  const bridge =
    AGENT_MODE === "http"
      ? createHttpBridge(AGENT_ENDPOINT!)
      : createStdioBridge(AGENT_ENDPOINT!);

  connectToRelay(RELAY_URL!, account as any, bridge);
}

main().catch((err) => {
  console.error("[connector] Fatal error:", err);
  process.exit(1);
});
