import { CdpEvmWalletProvider } from "@coinbase/agentkit";
import { createPublicClient, http, encodeFunctionData, parseUnits } from "viem";
import { baseSepolia } from "viem/chains";
import { AGENT_REGISTRY_ABI, CONTRACTS } from "@awalbot/shared";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const RPC_URL = "https://sepolia.base.org";
const WALLET_FILE = join(dirname(fileURLToPath(import.meta.url)), "..", ".agent-wallet.json");

export interface AgentWallet {
  address: string;
  signMessage: (message: string) => Promise<`0x${string}`>;
  provider: CdpEvmWalletProvider;
}

export async function createAgentWallet(): Promise<AgentWallet> {
  console.log("[wallet] Initializing CDP wallet via AgentKit...");

  // Check for saved wallet address
  let savedAddress: string | undefined;
  if (existsSync(WALLET_FILE)) {
    try {
      const data = JSON.parse(readFileSync(WALLET_FILE, "utf-8"));
      savedAddress = data.address;
      console.log(`[wallet] Found saved wallet: ${savedAddress}`);
    } catch {}
  }

  const wallet = await CdpEvmWalletProvider.configureWithWallet({
    networkId: "base-sepolia",
    ...(savedAddress ? { address: savedAddress as `0x${string}` } : {}),
  });

  const address = wallet.getAddress();
  console.log(`[wallet] Agent wallet address: ${address}`);

  // Save wallet address for next run
  if (!savedAddress || savedAddress !== address) {
    writeFileSync(WALLET_FILE, JSON.stringify({ address }, null, 2));
    console.log("[wallet] Wallet address saved to .agent-wallet.json");
  }

  return {
    address,
    provider: wallet,
    signMessage: async (message: string) => {
      return wallet.signMessage(message);
    },
  };
}

export async function ensureRegistered(
  wallet: AgentWallet,
  agentName: string,
  agentDescription: string,
  agentSkills: string,
  hourlyRate: string
): Promise<void> {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const registryAddress = CONTRACTS.AGENT_REGISTRY;
  if (!registryAddress || registryAddress === "0x0000000000000000000000000000000000000000") {
    console.log("[wallet] No AgentRegistry address configured, skipping registration check");
    return;
  }

  const isRegistered = await publicClient.readContract({
    address: registryAddress,
    abi: AGENT_REGISTRY_ABI,
    functionName: "isRegistered",
    args: [wallet.address as `0x${string}`],
  });

  if (isRegistered) {
    console.log("[wallet] Agent already registered on-chain");
    return;
  }

  console.log("[wallet] Agent not registered, registering on-chain...");
  console.log(`[wallet]   Name: ${agentName}`);
  console.log(`[wallet]   Skills: ${agentSkills}`);
  console.log(`[wallet]   Rate: ${hourlyRate} USDC/hr`);

  const rateAtomic = parseUnits(hourlyRate, 6);

  const data = encodeFunctionData({
    abi: AGENT_REGISTRY_ABI,
    functionName: "register",
    args: [agentName, agentDescription, agentSkills, rateAtomic],
  });

  const txHash = await wallet.provider.sendTransaction({
    to: registryAddress,
    data,
  });

  console.log(`[wallet] Registration tx: ${txHash}`);
  await wallet.provider.waitForTransactionReceipt(txHash);
  console.log("[wallet] Agent registered on-chain!");
}
