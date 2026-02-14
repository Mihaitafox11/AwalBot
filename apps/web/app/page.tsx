"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_RELAY_URL || "http://localhost:3001";

interface Agent {
  id: string;
  name: string;
  description: string;
  online: boolean;
}

export default function HomePage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Registration
  const [showRegister, setShowRegister] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [registering, setRegistering] = useState(false);
  const [result, setResult] = useState<{ token: string; command: string } | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch(`${API}/agents`);
      if (res.ok) setAgents(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAgents();
    const iv = setInterval(fetchAgents, 5000);
    return () => clearInterval(iv);
  }, [fetchAgents]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegistering(true);
    try {
      const res = await fetch(`${API}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult({ token: data.token, command: data.command });
      }
    } catch {}
    setRegistering(false);
  }

  function closeModal() {
    setShowRegister(false);
    setResult(null);
    setName("");
    setDescription("");
    fetchAgents();
  }

  async function handleChat(agent: Agent) {
    const res = await fetch(`${API}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: agent.id }),
    });
    if (res.ok) {
      const { sessionId } = await res.json();
      router.push(`/chat/${sessionId}?agent=${agent.id}&name=${encodeURIComponent(agent.name)}`);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">AwalBot</h1>
        <button
          onClick={() => setShowRegister(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Agent
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <p className="text-gray-500 text-center mt-12">Loading...</p>
        ) : agents.length === 0 ? (
          <div className="text-center mt-12">
            <p className="text-gray-400 text-lg mb-2">No agents yet</p>
            <p className="text-gray-500 mb-6">Add your OpenClaw agent to get started</p>
            <button
              onClick={() => setShowRegister(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
            >
              + Add Agent
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((a) => (
              <div key={a.id} className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{a.name}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${a.online ? "bg-green-500" : "bg-gray-500"}`} />
                    <span className="text-xs text-gray-400">{a.online ? "Online" : "Offline"}</span>
                  </div>
                </div>
                {a.description && <p className="text-gray-400 text-sm">{a.description}</p>}
                <button
                  onClick={() => handleChat(a)}
                  disabled={!a.online}
                  className="mt-auto w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                >
                  {a.online ? "Chat" : "Offline"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Agent Modal */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-lg">
            {!result ? (
              // Step 1: Name your agent
              <form onSubmit={handleRegister}>
                <h2 className="text-xl font-semibold mb-4">Add your OpenClaw agent</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Agent Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. My Coding Assistant"
                      required
                      autoFocus
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What does your agent do?"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button type="button" onClick={closeModal}
                    className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={registering || !name.trim()}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-sm font-medium transition-colors">
                    {registering ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            ) : (
              // Step 2: Show the command to run
              <div>
                <h2 className="text-xl font-semibold mb-2">Run this on your server</h2>
                <p className="text-gray-400 text-sm mb-4">
                  On the machine where OpenClaw is running, execute:
                </p>
                <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm break-all select-all border border-gray-700">
                  npx @awalbot/connect {result.token}
                </div>
                <p className="text-gray-500 text-xs mt-3">
                  This connects your local OpenClaw agent to the marketplace.
                  Keep it running to stay online.
                </p>
                <button onClick={closeModal}
                  className="w-full mt-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
