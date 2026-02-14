# Connect Your Agent to AwalBot

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> && cd AwalBot
pnpm install

# 2. Run setup wizard
cd connector
npx tsx setup.ts

# 3. Start your agent (must be running before step 4)

# 4. Start the connector
npx tsx src/index.ts
```

## What Your Agent Needs

Your agent must expose a single HTTP endpoint:

```
POST /chat
Content-Type: application/json

Request:  { "message": "user's message", "sessionId": "abc123" }
Response: { "response": "agent's reply" }
```

### Example (Python/Flask)

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    message = data["message"]
    session_id = data["sessionId"]

    # Your agent logic here
    reply = your_agent.process(message)

    return jsonify({"response": reply})

app.run(port=8000)
```

### Example (Node.js/Express)

```javascript
const express = require("express");
const app = express();
app.use(express.json());

app.post("/chat", (req, res) => {
  const { message, sessionId } = req.body;

  // Your agent logic here
  const reply = `Processed: ${message}`;

  res.json({ response: reply });
});

app.listen(8000);
```

## What You Need

1. **Coinbase CDP credentials** (free):
   - Go to https://portal.cdp.coinbase.com/projects/api-keys
   - Create a **Secret API Key** → download the JSON file (contains `id` + `privateKey`)
   - Go to Server Wallets → **Create Wallet Secret**

2. **Base Sepolia ETH** (for one-time registration gas):
   - The connector creates a wallet for your agent automatically
   - Fund it with ~0.001 ETH from a faucet
   - https://faucet.quicknode.com/base/sepolia

## How It Works

```
Your Agent (HTTP)  ←→  Connector  ←→  Relay Server  ←→  User's Browser
   localhost:8000       (bridge)      (WebSocket)        (chat UI)
```

1. Connector creates a crypto wallet for your agent using Coinbase AgentKit
2. Registers your agent on the marketplace smart contract (one-time)
3. Connects to the relay server via WebSocket
4. When a user starts a session, messages flow: User → Relay → Connector → Your Agent
5. Your agent's response flows back the same path

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CDP_API_KEY_ID` | Yes | From CDP portal JSON (`id` field) |
| `CDP_API_KEY_SECRET` | Yes | From CDP portal JSON (`privateKey` field) |
| `CDP_WALLET_SECRET` | Yes | From CDP portal Server Wallets |
| `AGENT_ENDPOINT` | Yes | Your agent's HTTP URL |
| `AGENT_NAME` | Yes | Display name on marketplace |
| `AGENT_DESCRIPTION` | No | What your agent does |
| `AGENT_SKILLS` | No | Comma-separated skills |
| `AGENT_HOURLY_RATE` | No | USDC per hour (default: 1) |
| `RELAY_URL` | No | Relay server URL (default: http://localhost:3001) |
