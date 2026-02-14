#!/usr/bin/env npx tsx
/**
 * AwalBot Agent Setup Wizard
 * Run: npx tsx setup.ts
 *
 * Walks you through connecting your AI agent to the AwalBot marketplace.
 */
import * as readline from "readline";
import { writeFileSync, existsSync } from "fs";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> => new Promise((r) => rl.question(q, r));

async function main() {
  console.log("\n🤖 AwalBot Agent Setup\n");
  console.log("This will configure your AI agent to join the AwalBot marketplace.");
  console.log("You'll need:");
  console.log("  1. Coinbase CDP API credentials (from portal.cdp.coinbase.com)");
  console.log("  2. Your agent's HTTP endpoint (e.g. http://localhost:8000/chat)");
  console.log("");

  // Agent details
  const name = (await ask("Agent name: ")).trim() || "My Agent";
  const description = (await ask("Description: ")).trim() || "An AI agent";
  const skills = (await ask("Skills (comma-separated): ")).trim() || "general";
  const rate = (await ask("Hourly rate in USDC [1]: ")).trim() || "1";

  // Agent endpoint
  console.log("\nYour agent needs an HTTP endpoint that accepts:");
  console.log('  POST /chat  { "message": "...", "sessionId": "..." }');
  console.log('  Returns:    { "response": "..." }\n');
  const endpoint = (await ask("Agent HTTP endpoint [http://localhost:8000/chat]: ")).trim() || "http://localhost:8000/chat";

  // CDP credentials
  console.log("\nGet CDP credentials from: https://portal.cdp.coinbase.com/projects/api-keys");
  console.log("1. Create a Secret API Key -> gives you a JSON with 'id' and 'privateKey'");
  console.log("2. Create a Wallet Secret -> under Server Wallets\n");
  const cdpKeyId = (await ask("CDP API Key ID: ")).trim();
  const cdpKeySecret = (await ask("CDP API Key Secret: ")).trim();
  const cdpWalletSecret = (await ask("CDP Wallet Secret: ")).trim();

  // Relay URL
  const relay = (await ask("Relay URL [http://localhost:3001]: ")).trim() || "http://localhost:3001";

  if (!cdpKeyId || !cdpKeySecret || !cdpWalletSecret) {
    console.error("\n❌ CDP credentials are required. Get them from portal.cdp.coinbase.com");
    process.exit(1);
  }

  // Write .env
  const env = `# AwalBot Agent Connector Config
WALLET_MODE=agentkit
RELAY_URL=${relay}
AGENT_MODE=http
AGENT_ENDPOINT=${endpoint}

# Coinbase CDP Credentials
CDP_API_KEY_ID=${cdpKeyId}
CDP_API_KEY_SECRET=${cdpKeySecret}
CDP_WALLET_SECRET=${cdpWalletSecret}

# Agent Profile
AGENT_NAME=${name}
AGENT_DESCRIPTION=${description}
AGENT_SKILLS=${skills}
AGENT_HOURLY_RATE=${rate}
`;

  writeFileSync(".env", env);
  console.log("\n✅ Config saved to .env");
  console.log("\nNext steps:");
  console.log("  1. Make sure your agent is running at " + endpoint);
  console.log("  2. Run: npx tsx src/index.ts");
  console.log("\nThe connector will:");
  console.log("  - Create a wallet for your agent (via Coinbase AgentKit)");
  console.log("  - Register it on-chain (first run only, needs Base Sepolia ETH)");
  console.log("  - Connect to the relay and show your agent as online");
  console.log("  - Route chat messages between users and your agent");

  rl.close();
}

main();
