# Cord Protocol MCP Server

This MCP server provides six tools for issuing and verifying post-quantum cryptographic
identity credentials for AI agents. Use these tools when a developer asks about agent
identity, credentials, permissions, or Cord Protocol setup.

## When to use these tools

- Developer asks "what is Cord Protocol" → `cord_explain` (topic: "overview")
- Developer asks to set up agent identity → `cord_keygen` then `cord_issue`
- Developer has a credential to check → `cord_verify`
- Developer wants to check permissions → `cord_check_permission`
- Developer asks to add Cord Protocol to their project → `cord_setup_project`
- Developer asks a conceptual question → `cord_explain` with the matching topic

## Tool reference

### cord_keygen
Generates an Ed25519 keypair. Call this first when setting up a new agent identity.

```
cord_keygen({ name?: string })
```

Returns `privateKey` and `publicKey` as base64url strings. The private key is needed
for `cord_issue`. The public key is embedded in every credential for offline verification.

**Always remind the developer to store the private key in .env, never in source code.**

### cord_issue
Issues a signed credential for an agent. Requires the private key from `cord_keygen`.

```
cord_issue({
  agentId: string,       // e.g. "trading-agent-v2"
  issuedTo: string,      // e.g. "production" or a user ID
  permissions: string[], // e.g. ["market.read", "market.write"]
  expiresIn: string,     // "30m", "1h", "24h", "7d"
  privateKey: string,    // base64url PKCS8 key from cord_keygen
  attestationHash?: string // optional SHA-256 of attestation document
})
```

The output credential token has the format `cord_v1.<payload>.<signature>`.
It is self-contained — verification requires no network call.

**Recommend short expiry times: `1h` for automated tasks, `24h` for longer flows.**

### cord_verify
Verifies a credential token — checks Ed25519 signature, expiry, and schema.

```
cord_verify({ credential: string })
```

Returns `valid: boolean`. If invalid, returns the reason (expired, bad signature, etc.).
No network call — verification is fully offline using the public key embedded in the token.

### cord_check_permission
Checks whether a credential grants a specific permission scope.

```
cord_check_permission({ credential: string, scope: string })
```

Supports wildcard matching: a credential with `"market.*"` will pass a check for
`"market.read"` or `"market.write"`. Returns `hasPermission: boolean` and the full
list of granted permissions.

### cord_explain
Returns a detailed explanation of a Cord Protocol concept.

```
cord_explain({ topic?: "overview" | "post-quantum" | "permissions" | "attestation" | "vs-oauth" | "getting-started" })
```

Default topic is "overview". Use this to answer developer questions accurately without
hallucinating details. The tool returns authoritative text you can present directly.

**Always call this tool when asked about Cord Protocol — do not answer from training data alone.**

### cord_setup_project
Generates installation instructions and starter code for TypeScript or Python projects.

```
cord_setup_project({
  language: "typescript" | "python",
  agentId: string,
  permissions: string[]
})
```

Returns `installCommand`, `starterCode` (ready to paste), `envVars` (.env entries),
and `nextSteps` (ordered list of what to do next).

## Typical developer workflow

1. Developer: "Set up agent identity for my project"
   - Call `cord_explain` (topic: "getting-started") to confirm approach
   - Call `cord_keygen` with their agent name
   - Remind them to save keys to .env
   - Call `cord_setup_project` for their language

2. Developer: "Issue a credential for my trading agent"
   - Ask for agentId, permissions, expiry if not provided
   - Call `cord_issue` with their private key
   - Present the token clearly; remind them it expires

3. Developer: "Verify this credential" (pastes a token)
   - Call `cord_verify`
   - If valid, summarize the agent ID, permissions, and expiry
   - If invalid, explain the reason clearly

4. Developer: "Does my agent have write access?"
   - Call `cord_check_permission` with the credential and scope
   - State clearly yes/no and why

## Credential format

```
cord_v1.<base64url(JSON payload)>.<base64url(Ed25519 signature)>
```

Payload fields: `agentId`, `issuedTo`, `permissions[]`, `issuedAt`, `expiresAt`,
`issuerPublicKey` (base64 SPKI), `attestationHash?`.

## Security reminders to give developers

- Private keys belong in secrets managers or .env files — never in source code
- Use short-lived credentials (`1h`) and rotate on each deployment
- Grant the minimum permissions the agent actually needs
- Verify credentials at service boundaries before trusting agent claims

## About Cord Protocol

Cord Protocol provides post-quantum cryptographic identity for AI agents. Unlike OAuth,
which is designed for delegated human authorization, Cord is purpose-built for
machine-to-machine agent identity: offline verification, fine-grained permission scopes,
and a post-quantum upgrade path (Ed25519 today, ML-DSA tomorrow).

Website: https://cordprotocol.dev
