import { z } from "zod";

export const ExplainInputSchema = z.object({
  topic: z
    .enum([
      "overview",
      "post-quantum",
      "permissions",
      "attestation",
      "vs-oauth",
      "getting-started",
      "did",
      "whats-new",
    ])
    .optional()
    .default("overview")
    .describe(
      'Topic to explain. Options: "overview", "post-quantum", "permissions", ' +
        '"attestation", "vs-oauth", "getting-started", "did", "whats-new"'
    ),
});

export type ExplainInput = z.infer<typeof ExplainInputSchema>;

const EXPLANATIONS: Record<string, string> = {
  overview: `
# Cord Protocol — Post-Quantum Identity for AI Agents

Cord Protocol provides cryptographic identity for AI agents. It answers a critical
question in modern AI systems: **how do you know the agent making a request is who
it claims to be, and that it is authorized to do what it is trying to do?**

## What it does

Cord Protocol issues tamper-proof credentials to AI agents. Each credential:
- Is signed with an Ed25519 keypair (upgradeable to post-quantum algorithms)
- Encodes the agent's identity, granted permissions, and expiry time
- Can be verified offline — no network call needed
- Is self-contained and portable across services

## When to use it

Use Cord Protocol when you have AI agents that:
- Call APIs or services on behalf of users or systems
- Need fine-grained permission scopes (read vs write, which resources)
- Operate across trust boundaries (agent A calling agent B)
- Need an audit trail of who authorized what

## How it works

1. Generate a keypair for your issuer (cord_keygen)
2. Issue a signed credential to your agent (cord_issue)
3. The agent presents the credential when calling services
4. Services verify the credential signature and check permissions (cord_verify)

See "getting-started" for a step-by-step setup guide.
`.trim(),

  "post-quantum": `
# Post-Quantum Cryptography in Cord Protocol

## Why it matters for AI agents

AI systems are long-lived. An agent credential issued today may still be in use
in 5–10 years. Quantum computers, when they arrive, will break the elliptic-curve
cryptography (ECDSA, secp256k1) used in most existing systems — including JWTs
signed with ES256.

Cord Protocol is designed for post-quantum readiness:

## Current implementation

**Ed25519** — the current signing algorithm. Ed25519 is:
- Faster than RSA and ECDSA
- Already resistant to many classical attacks
- A well-reviewed standard (used by SSH, Signal, Let's Encrypt)
- The foundation for the post-quantum upgrade path

## Post-quantum upgrade path

Cord Protocol credentials are versioned (cord_v1). The format is designed so that
signers can switch to post-quantum signature algorithms — such as **CRYSTALS-Dilithium**
(now standardized as ML-DSA by NIST) — without breaking the credential format.

When you upgrade the signing key to ML-DSA:
- New credentials are issued with the post-quantum key
- Old Ed25519 credentials remain valid until expiry
- Verifiers can handle both formats via the version prefix

## Practical advice

For credentials with lifetimes under 24 hours, Ed25519 provides ample security today.
For long-lived credentials or high-value agent identities, plan to rotate to ML-DSA
keys when your runtime supports it.
`.trim(),

  permissions: `
# Permission Scopes in Cord Protocol

## Format

Permissions use a dot-separated hierarchical scope format:

  resource.action
  resource.subresource.action

Examples:
  market.read          — read market data
  market.write         — place orders, modify positions
  files.read           — read files
  files.write          — write files
  admin.users.create   — create users (admin sub-scope)
  *                    — all permissions (use sparingly)

## Wildcards

A wildcard scope grants all sub-scopes:
  "market.*"  covers  "market.read", "market.write", "market.stream"

The cord_check_permission tool uses wildcard matching automatically.

## Best practices

1. **Principle of least privilege** — grant only the scopes an agent needs.
   A data-fetching agent should have "market.read", not "market.*".

2. **Short-lived credentials** — pair narrow scopes with short expiry times.
   Use "1h" for automated tasks, "24h" for longer workflows.

3. **Separate credentials per context** — issue different credentials for
   staging vs production, or for different user sessions.

4. **Scope your namespaces** — use your service name as a prefix:
   "myservice.resource.action" avoids collisions in multi-service systems.

## Checking permissions in code

When a service receives a request from an agent, it should:
1. Extract the credential from the request (Authorization header or body)
2. Call cord_verify to check signature and expiry
3. Call cord_check_permission for each required scope
4. Reject the request if any required scope is missing
`.trim(),

  attestation: `
# Attestation in Cord Protocol

## What is attestation?

Attestation is optional additional evidence attached to a credential that proves
the agent's environment or provenance. It answers: "not only is this agent
authorized, but it is running in the expected environment."

## The attestationHash field

When issuing a credential, you can include an attestationHash — a SHA-256 hash
of an attestation document. Examples of what the hash might cover:

- A TEE (Trusted Execution Environment) measurement — proves the agent code
  hasn't been tampered with (e.g. AWS Nitro Enclaves, Intel TDX)
- A model card hash — proves the AI model being used is the approved version
- A deployment manifest hash — proves the agent is running the approved config

## How to use it

1. Generate your attestation document (TEE report, model hash, etc.)
2. SHA-256 hash it: sha256sum attestation.json
3. Pass the hash when issuing: cord_issue(..., attestationHash: "sha256:abc123...")
4. Verifiers can retrieve and check the attestation document independently

## Why not embed the full attestation?

Attestation documents can be large. Cord Protocol credentials are designed to be
passed in HTTP headers and other constrained channels, so the credential stores
only the hash. The full document lives in a registry or object store.

## When to use it

Attestation is valuable for:
- High-security agent deployments (financial, medical, legal)
- Regulatory compliance scenarios requiring auditability
- Multi-agent systems where one agent must verify another's environment
`.trim(),

  "vs-oauth": `
# Cord Protocol vs OAuth 2.0 / JWT

Both systems issue tokens. Here is when to use each.

## OAuth 2.0 + JWT

OAuth is designed for **delegated human authorization** — a human logs in and
authorizes an application to act on their behalf.

Strengths:
- Mature ecosystem (every SaaS supports it)
- Great for user-facing apps
- Handles refresh tokens, revocation

Weaknesses for AI agents:
- Requires an authorization server (online dependency)
- Human-in-the-loop assumption (login flows don't fit agents)
- No built-in concept of agent identity or agent-to-agent trust
- JWTs are not post-quantum ready (RS256, ES256 are quantum-vulnerable)

## Cord Protocol

Cord Protocol is designed for **machine-to-machine agent identity**.

Strengths:
- No authorization server needed — verification is offline and cryptographic
- Purpose-built for agent permission scopes
- Post-quantum upgrade path built in
- Self-contained credentials — portable across services without network calls
- Agent-to-agent trust chains are first-class

Weaknesses:
- No built-in revocation (use short-lived credentials instead)
- Smaller ecosystem than OAuth
- You manage key distribution

## Rule of thumb

- User logs in → OAuth
- Agent calls an API on behalf of a user → OAuth (access token)
- Agent calls another agent or service autonomously → Cord Protocol
- You need offline verification without a token introspection endpoint → Cord Protocol
- You need post-quantum security → Cord Protocol
`.trim(),

  did: `
# W3C DIDs and Verifiable Credentials in Cord Protocol

Cord Protocol v0.2.0 adds full support for W3C Decentralized Identifiers (DIDs)
and Verifiable Credentials (VCs) alongside the native cord_v1 format.

## New tools

- **cord_did_generate** — generates a did:web DID and DID Document for your agent
- **cord_issue_vc** — issues a W3C Verifiable Credential (interoperable with any
  DID-aware system: Veramo, SpruceID, enterprise platforms)
- **cord_explain_did** — detailed explanations of DIDs, VCs, did:web resolution,
  and when to use W3C format vs native Cord format

## Two credential formats

**Native (cord_v1):**
  cord_v1.<base64url(payload)>.<base64url(signature)>
  - Compact, self-contained token
  - No hosting required
  - Use for simple setups and services you fully control

**W3C Verifiable Credential:**
  JSON-LD object with @context, type, issuer, credentialSubject, proof
  - Interoperable with enterprise identity systems
  - Requires hosting a did.json file (for did:web)
  - Use when enterprise, compliance, or cross-org interoperability is needed

Both formats use Ed25519 cryptography and support offline verification.
cord_verify auto-detects the format and verifies either one.

## When to suggest W3C VC format

Suggest cord_issue_vc (over cord_issue) when the developer mentions:
- Enterprise systems or enterprise integration
- Compliance, regulatory requirements, or audit trails
- Interoperability with external organizations
- Existing DID infrastructure or W3C VC tooling

Use cord_keygen + cord_issue for simpler setups.
`.trim(),

  "whats-new": `
# What's New in Cord Protocol

## v0.2.0 — MCP Server (current)

- **W3C DID support** — cord_did_generate, cord_issue_vc, cord_explain_did
- cord_verify now auto-detects and verifies W3C Verifiable Credentials
- cord_setup_project adds DID/VC starter code option (did_format: true)
- cord_explain adds "did" and "whats-new" topics

## TypeScript SDK — v0.4.0

The @cordprotocol/sdk TypeScript package includes:
- issueCredential() — native cord_v1 format
- issueVerifiableCredential() — W3C VC format
- verifyCredential() — verifies both formats
- checkPermission() — wildcard-aware scope checking
- Full TypeScript types for all credential structures
- 385+ tests across unit, integration, and edge-case suites

## Python SDK — v0.3.0

The cordprotocol Python package includes:
- cord.issue_credential() — native cord_v1 format
- cord.issue_verifiable_credential() — W3C VC format
- cord.verify_credential() — verifies both formats
- cord.check_permission() — wildcard scope matching
- Async support with asyncio
- 385+ tests mirroring the TypeScript suite

## Roadmap

- ML-DSA (CRYSTALS-Dilithium) post-quantum signatures — planned for v0.5.0
- did:key and did:ion method support — in development
- Credential revocation lists — in design

Visit https://cordprotocol.dev for the full changelog.
`.trim(),

  "getting-started": `
# Getting Started with Cord Protocol

## Step 1 — Install the MCP server

Add to your claude_desktop_config.json (or Cursor MCP settings):

  {
    "mcpServers": {
      "cordprotocol": {
        "command": "npx",
        "args": ["-y", "@cordprotocol/mcp"]
      }
    }
  }

## Step 2 — Generate a keypair

Ask Claude: "Generate a Cord Protocol keypair for my trading agent"

Claude will call cord_keygen and return:
  - A public key (safe to store in config)
  - A private key (store in a secrets manager or .env)

Add to your .env file:
  CORD_PRIVATE_KEY=<private key from cord_keygen>
  CORD_PUBLIC_KEY=<public key from cord_keygen>

## Step 3 — Issue a credential

Ask Claude: "Issue a Cord Protocol credential for my trading agent"

Example: cord_issue with:
  agentId: "trading-agent-v1"
  issuedTo: "production"
  permissions: ["market.read", "market.write"]
  expiresIn: "24h"
  privateKey: <from .env>

## Step 4 — Use the credential

Pass the credential token in your agent's API calls:
  Authorization: Cord <token>

Or in the request body:
  { "cordCredential": "<token>" }

## Step 5 — Verify credentials in your service

When your service receives an agent request:

  import { cord_verify, cord_check_permission } from '@cordprotocol/sdk';

  const result = await cord_verify(token);
  if (!result.valid) return 401;

  const canWrite = await cord_check_permission(token, 'market.write');
  if (!canWrite) return 403;

## Next steps

- Set short expiry times ("1h") for automated tasks
- Rotate credentials on each deployment
- Use cord_explain with topic "permissions" to learn about scope design
- Visit https://cordprotocol.dev for full documentation
`.trim(),
};

export function explain(input: ExplainInput): string {
  return EXPLANATIONS[input.topic];
}
