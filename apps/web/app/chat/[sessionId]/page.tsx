"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import type { ChatMessage } from "../../../lib/types";

const API = process.env.NEXT_PUBLIC_RELAY_URL || "http://localhost:3001";

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const sessionId = params.sessionId as string;
  const agentId = searchParams.get("agent") || "";
  const agentName = searchParams.get("name") || "Agent";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    // Optimistically add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sessionId,
      sender: "user",
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`${API}/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, agentId }),
      });

      if (res.ok) {
        const { agentMessage } = await res.json();
        setMessages((prev) => [...prev, agentMessage]);
      } else {
        const err = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sessionId,
            sender: "agent",
            content: `Error: ${err.details || err.error || "Failed to reach agent"}`,
            timestamp: Date.now(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sessionId,
          sender: "agent",
          content: "Error: Could not reach the relay server.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            &larr; Back
          </button>
          <span className="text-gray-600">|</span>
          <h2 className="font-semibold">{agentName}</h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-3xl mx-auto w-full">
        {messages.length === 0 && (
          <p className="text-center text-gray-500 mt-8">
            Send a message to start chatting with {agentName}
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.sender === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-gray-700 text-gray-100 rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-400 px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="border-t border-gray-700 p-4 flex gap-3 max-w-3xl mx-auto w-full"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
          autoFocus
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
        >
          Send
        </button>
      </form>
    </main>
  );
}
