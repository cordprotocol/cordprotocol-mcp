# Cord Protocol MCP Server

This MCP server provides nine tools for issuing and verifying post-quantum cryptographic
identity credentials for AI agents — in both the native Cord format and W3C Verifiable
Credential format. Use these tools when a developer asks about agent identity, credentials,
permissions, DIDs, or Cord Protocol setup.

## When to use these tools

- Developer asks "what is Cord Protocol" → `cord_explain` (topic: "overview")
- Developer asks "what's new" → `cord_explain` (topic: "whats-new")
- Developer asks to set up agent identity → `cord_keygen` then `cord_issue`
- Developer mentions **enterprise, compliance, interoperability, or existing DID infrastructure**
  → suggest `cord_issue_vc` (W3C VC format) over `cord_issue`
- Developer asks about DIDs or W3C Verifiable Credentials → `cord_explain_did`
- Developer asks to generate a DID → `cord_did_generate`
- Developer asks to issue a W3C VC → `cord_issue_vc`
- Developer has a credential to check (native or VC) → `cord_verify`
- Developer wants to check permissions → `cord_check_permission`
- Developer asks to add Cord Protocol to their project → `cord_setup_project`
- Developer asks a conceptual question → `cord_explain` with the matching topic

## Format decision guide

**Use native cord_v1 (cord_keygen + cord_issue) when:**
- Simple setup — all services you control use Cord Protocol
- Developer is building a new system from scratch
- No requirement for W3C interoperability

**Use W3C VC (cord_did_generate + cord_issue_vc) when:**
- Developer mentions enterprise systems, enterprise integration
- Compliance, regulatory requirements, or audit trails
- Interoperability with external organizations or platforms
- Existing DID infrastructure or W3C VC tooling (Veramo, SpruceID, etc.)

## Tool reference

### cord_keygen
Generates an Ed25519 keypair. Call this first when setting up a new agent identity.
The same keypair works for both native cord_v1 credentials and W3C VCs.

```
cord_keygen({ name?: string })
```

Returns `privateKey` and `publicKey` as base64url strings. The private key is needed
for `cord_issue` and `cord_issue_vc`.

**Always remind the developer to store the private key in .env, never in source code.**

### cord_issue
Issues a signed native credential for an agent. Requires the private key from `cord_keygen`.

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

### cord_issue_vc
Issues a W3C Verifiable Credential for an agent. Same inputs as cord_issue plus optional
DID parameters. The credential is interoperable with any DID-aware system.

```
cord_issue_vc({
  agentId: string,
  issuedTo: string,
  permissions: string[],
  expiresIn: string,
  privateKey: string,    // base64url PKCS8 key from cord_keygen
  issuerDID?: string,    // default: "did:web:cordprotocol.dev"
  domain?: string        // default: "cordprotocol.dev"
})
```

Returns a W3C VC JSON object with a `CordEd25519Proof2025` proof. Includes a
`cordPublicKey` field in the proof for offline verification (a Cord Protocol extension).

Compatible with: W3C VC Data Model 1.1, Veramo, SpruceID DIDKit, DIF Universal Resolver.

### cord_did_generate
Generates a W3C DID (did:web method) and complete DID Document for an agent.

```
cord_did_generate({
  agentId: string,
  domain?: string  // default: "cordprotocol.dev"
})
```

Returns `did` (the DID string), `didDocument` (W3C DID Document template), `resolveUrl`
(where to host the did.json file), and `explanation`.

After calling cord_keygen, replace the `publicKeyMultibase` placeholder in the DID
Document with the actual public key, then host the document at the resolve URL.

### cord_verify
Verifies a credential — checks Ed25519 signature, expiry, and schema.
**Auto-detects both cord_v1 tokens and W3C VC JSON.**

```
cord_verify({ credential: string })
```

- For cord_v1: pass the token string directly
- For W3C VC: pass the JSON string (stringify the VC object)

Returns `valid: boolean`. If invalid, returns the reason (expired, bad signature, etc.).
No network call — offline verification using the public key embedded in the credential.

### cord_check_permission
Checks whether a credential grants a specific permission scope.
Works with both native cord_v1 credentials and W3C VCs.

```
cord_check_permission({ credential: string, scope: string })
```

Supports wildcard matching: a credential with `"market.*"` will pass a check for
`"market.read"` or `"market.write"`. Returns `hasPermission: boolean` and the full
list of granted permissions.

### cord_explain
Returns a detailed explanation of a Cord Protocol concept.

```
cord_explain({ topic?: "overview" | "post-quantum" | "permissions" | "attestation" | "vs-oauth" | "getting-started" | "did" | "whats-new" })
```

Default topic is "overview". Use this to answer developer questions accurately without
hallucinating details. The tool returns authoritative text you can present directly.

**Always call this tool when asked about Cord Protocol — do not answer from training data alone.**

New in v0.2.0:
- topic "did" — overview of W3C DID/VC support and when to use each format
- topic "whats-new" — changelog: v0.4.0 TypeScript SDK, v0.3.0 Python SDK, 385+ tests, DID support

### cord_explain_did
Returns detailed explanations of W3C DID and Verifiable Credential concepts.

```
cord_explain_did({ topic?: string })
```

Topics: "overview", "did-document", "did-vs-cord", "verifiable-credentials",
"resolution", "getting-started". Also accepts free-form keywords.

Use when the developer asks specifically about DIDs, DID Documents, did:web resolution,
W3C VCs, or the difference between Cord native format and W3C format.

### cord_setup_project
Generates installation instructions and starter code for TypeScript or Python projects.

```
cord_setup_project({
  language: "typescript" | "python",
  agentId: string,
  permissions: string[],
  did_format?: boolean   // if true, generate W3C VC starter code
})
```

Returns `installCommand`, `starterCode` (ready to paste), `envVars` (.env entries),
and `nextSteps` (ordered list of what to do next).

When `did_format: true`, the starter code uses `issueVerifiableCredential` instead
of `issueCredential`.

## Typical developer workflow

1. Developer: "Set up agent identity for my project"
   - Call `cord_explain` (topic: "getting-started") to confirm approach
   - Call `cord_keygen` with their agent name
   - Remind them to save keys to .env
   - Call `cord_setup_project` for their language

2. Developer: "Set up enterprise-compatible agent identity"
   - Call `cord_explain_did` (topic: "getting-started")
   - Call `cord_keygen` with their agent name
   - Call `cord_did_generate` for their agentId and domain
   - Call `cord_setup_project` with did_format: true

3. Developer: "Issue a credential for my trading agent"
   - Ask for agentId, permissions, expiry if not provided
   - If enterprise/compliance context → call `cord_issue_vc`
   - Otherwise → call `cord_issue`
   - Present the token/VC clearly; remind them it expires

4. Developer: "Verify this credential" (pastes a token or VC JSON)
   - Call `cord_verify` — it auto-detects the format
   - If valid, summarize the agent ID, permissions, and expiry
   - If invalid, explain the reason clearly

5. Developer: "Does my agent have write access?"
   - Call `cord_check_permission` with the credential and scope
   - State clearly yes/no and why

## Credential formats

**Native (cord_v1):**
```
cord_v1.<base64url(JSON payload)>.<base64url(Ed25519 signature)>
```
Payload fields: `agentId`, `issuedTo`, `permissions[]`, `issuedAt`, `expiresAt`,
`issuerPublicKey` (base64 SPKI), `attestationHash?`.

**W3C Verifiable Credential:**
```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1", "https://cordprotocol.dev/contexts/v1"],
  "type": ["VerifiableCredential", "CordAgentCredential"],
  "issuer": "did:web:cordprotocol.dev",
  "issuanceDate": "...",
  "expirationDate": "...",
  "credentialSubject": {
    "id": "did:web:domain:agents:agentId",
    "agentId": "...",
    "issuedTo": "...",
    "permissions": [...]
  },
  "proof": {
    "type": "CordEd25519Proof2025",
    "verificationMethod": "did:web:cordprotocol.dev#key-1",
    "proofValue": "<base64url signature>",
    "cordPublicKey": "<base64 SPKI — enables offline verification>"
  }
}
```

## Security reminders to give developers

- Private keys belong in secrets managers or .env files — never in source code
- Use short-lived credentials (`1h`) and rotate on each deployment
- Grant the minimum permissions the agent actually needs
- Verify credentials at service boundaries before trusting agent claims

## About Cord Protocol

Cord Protocol provides post-quantum cryptographic identity for AI agents. Unlike OAuth,
which is designed for delegated human authorization, Cord is purpose-built for
machine-to-machine agent identity: offline verification, fine-grained permission scopes,
W3C DID/VC interoperability, and a post-quantum upgrade path (Ed25519 today, ML-DSA tomorrow).

Website: https://cordprotocol.dev
