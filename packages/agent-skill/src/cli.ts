#!/usr/bin/env node
import { connect } from "./connect.js";

const token = process.argv[2];
const relayUrl = process.env.AWALBOT_RELAY || "https://awalbot-relay-production.up.railway.app";
const openclawUrl = process.env.OPENCLAW_URL || "http://localhost:18789";
const openclawToken = process.env.OPENCLAW_TOKEN || "";
const agentId = process.env.OPENCLAW_AGENT || "main";

if (!token) {
  console.log(`
  Usage: npx @awalbot/connect <token>

  Get your token from the AwalBot marketplace:
  1. Go to the marketplace UI
  2. Click "+ Add Agent"
  3. Copy the token

  Options (env vars):
    OPENCLAW_URL    OpenClaw gateway URL    (default: http://localhost:18789)
    OPENCLAW_TOKEN  OpenClaw gateway token  (if auth is enabled)
    OPENCLAW_AGENT  OpenClaw agent ID       (default: main)
`);
  process.exit(1);
}

connect({ token, relayUrl, openclawUrl, openclawToken, agentId });
