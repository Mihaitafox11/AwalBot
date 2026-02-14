import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { v4 as uuidv4 } from "uuid";

// Use the deployer key for registration (owner wallet)
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const RELAY_URL = "http://localhost:3001";

async function main() {
  const account = privateKeyToAccount(DEPLOYER_KEY as `0x${string}`);
  const nonce = uuidv4();
  const name = "Echo Agent";
  const message = `AwalBot Register Agent\nOwner: ${account.address}\nName: ${name}\nNonce: ${nonce}`;

  const signature = await account.signMessage({ message });

  const res = await fetch(`${RELAY_URL}/agents/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ownerWallet: account.address,
      signature,
      nonce,
      name,
      description: "A test echo agent that repeats what you say",
      skills: "echo,testing",
      hourlyRate: "1",
    }),
  });

  const data = await res.json();
  console.log("Registration result:", data);
  console.log("\nToken:", data.token);
}

main().catch(console.error);
