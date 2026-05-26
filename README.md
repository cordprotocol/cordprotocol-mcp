# @cordprotocol/mcp

MCP server for [Cord Protocol](https://cordprotocol.dev) — post-quantum cryptographic identity for AI agents.

Connect this server to Claude Code or Cursor and Claude gains native ability to generate agent keypairs, issue credentials, verify them, and check permissions — all cryptographically, without any network dependency.

---

## What this MCP server does

Cord Protocol gives AI agents tamper-proof identity. Each agent gets a signed credential that encodes:

- **Who the agent is** (agentId)
- **What it's allowed to do** (permission scopes like `market.read`, `files.write`)
- **When it expires** (short-lived — `1h`, `24h`, `7d`)

Credentials are Ed25519-signed and verifiable offline. No auth server. No network call. Just cryptography.

---

## Installation

### Claude Code

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cordprotocol": {
      "command": "npx",
      "args": ["-y", "@cordprotocol/mcp"]
    }
  }
}
```

Restart Claude Code. The six `cord_*` tools will be available immediately.

### Cursor

Add to `.cursor/mcp.json` in your project (or the global Cursor MCP config):

```json
{
  "mcpServers": {
    "cordprotocol": {
      "command": "npx",
      "args": ["-y", "@cordprotocol/mcp"]
    }
  }
}
```

### Manual / self-hosted

```bash
npm install -g @cordprotocol/mcp
cordprotocol-mcp
```

---

## Tools

### `cord_keygen` — Generate a keypair

Generates a new Ed25519 keypair for an agent identity.

**Example prompts:**
- *"Generate a Cord Protocol keypair for my trading agent"*
- *"Set up agent identity for my LangChain project"*
- *"Create a keypair called analytics-bot"*

**Input:**
```json
{ "name": "trading-agent" }
```

**Output:** Public key, private key (base64url), and `.env` entries ready to paste. The private key signs credentials; the public key is embedded in credentials for offline verification.

---

### `cord_issue` — Issue a credential

Signs and issues a cryptographic identity credential for an agent.

**Example prompts:**
- *"Issue a credential for my trading agent"*
- *"Give my analytics bot read permissions for 24 hours"*
- *"Create a Cord credential with market.read and market.write scopes"*

**Input:**
```json
{
  "agentId": "trading-agent-v2",
  "issuedTo": "production",
  "permissions": ["market.read", "market.write"],
  "expiresIn": "24h",
  "privateKey": "<from cord_keygen>"
}
```

**Output:** Formatted credential display + the `cord_v1.<payload>.<signature>` token string.

---

### `cord_verify` — Verify a credential

Checks an agent credential's Ed25519 signature, expiry, and schema validity — no network call needed.

**Example prompts:**
- *"Verify this agent credential"*
- *"Is this Cord token still valid?"*
- *"Check if this credential has expired"*

**Input:**
```json
{ "credential": "cord_v1.eyJhZ..." }
```

**Output:** Pass/fail with agentId, permissions, expiry, and the failure reason if invalid.

---

### `cord_check_permission` — Check a permission scope

Checks whether a credential grants a specific permission scope. Supports wildcards (`market.*`).

**Example prompts:**
- *"Does this agent have permission to write?"*
- *"Can this credential access market.write?"*
- *"Check if my trading agent has the files.read scope"*

**Input:**
```json
{
  "credential": "cord_v1.eyJhZ...",
  "scope": "market.write"
}
```

**Output:** `hasPermission: true/false`, the agent ID, and all granted permissions.

---

### `cord_explain` — Learn about Cord Protocol

Returns a detailed explanation of Cord Protocol concepts. Claude uses this to answer developer questions accurately.

**Example prompts:**
- *"What is Cord Protocol?"*
- *"Do I need this for my project?"*
- *"How does Cord Protocol compare to OAuth?"*
- *"Explain the post-quantum part"*

**Topics:** `overview`, `post-quantum`, `permissions`, `attestation`, `vs-oauth`, `getting-started`

**Input:**
```json
{ "topic": "vs-oauth" }
```

---

### `cord_setup_project` — Set up Cord Protocol in a project

Generates install commands, starter code, and `.env` entries for TypeScript or Python projects.

**Example prompts:**
- *"Set up Cord Protocol in my TypeScript project"*
- *"Add agent identity to my Python LangChain app"*
- *"Generate starter code for a trading agent with market.read permissions"*

**Input:**
```json
{
  "language": "typescript",
  "agentId": "trading-agent",
  "permissions": ["market.read", "market.write"]
}
```

**Output:** Install command, ready-to-paste starter code, `.env` entries, and next steps.

---

## Credential format

Cord Protocol credentials are self-contained tokens:

```
cord_v1.<base64url(payload)>.<base64url(Ed25519-signature)>
```

The payload is a JSON object:
```json
{
  "agentId": "trading-agent-v2",
  "issuedTo": "production",
  "permissions": ["market.read", "market.write"],
  "issuedAt": 1748000000,
  "expiresAt": 1748086400,
  "issuerPublicKey": "<base64-SPKI>",
  "attestationHash": "<optional SHA-256>"
}
```

The signature covers `cord_v1.<base64url(payload)>`. Verification requires only the issuer's public key — no network call, no auth server.

---

## Security notes

- **Never commit private keys.** Store them in a secrets manager, CI secrets, or `.env` (gitignored).
- **Use short expiry times.** `1h` for automated tasks; `24h` for longer workflows.
- **Rotate credentials on each deployment.**
- **Principle of least privilege.** Grant only the scopes an agent needs. Prefer `market.read` over `market.*`.

---

## Links

- [Cord Protocol Documentation](https://cordprotocol.dev)
- [GitHub](https://github.com/cordprotocol/mcp)
- [npm](https://www.npmjs.com/package/@cordprotocol/mcp)
