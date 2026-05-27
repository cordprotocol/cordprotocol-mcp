import { z } from "zod";

export const ExplainDIDInputSchema = z.object({
  topic: z
    .string()
    .optional()
    .default("overview")
    .describe(
      'DID topic to explain. Try: "overview", "did-document", "did-vs-cord", ' +
        '"verifiable-credentials", "resolution", "getting-started"'
    ),
});

export type ExplainDIDInput = z.infer<typeof ExplainDIDInputSchema>;

const DID_EXPLANATIONS: Record<string, string> = {
  overview: `
# W3C DIDs and Verifiable Credentials for AI Agents

## What is a DID?

A Decentralized Identifier (DID) is a W3C standard for globally unique, cryptographically
verifiable identifiers — like a URL but for identity. DIDs are:

- **Self-sovereign** — the DID controller owns and manages their identifier without
  relying on a central authority
- **Resolvable** — any DID resolves to a DID Document containing public keys and
  service endpoints
- **Interoperable** — the W3C DID standard is supported by hundreds of systems

A Cord Protocol DID looks like:
  did:web:cordprotocol.dev:agents:trading-agent-v2

It resolves to a DID Document hosted at:
  https://cordprotocol.dev/agents/trading-agent-v2/did.json

## What is a Verifiable Credential?

A Verifiable Credential (VC) is a W3C standard for tamper-evident claims. Cord Protocol
can issue credentials in VC format — same cryptographic guarantees, but with W3C
interoperability.

A Cord VC looks like standard JSON-LD and is compatible with any DID-aware system:
Veramo, SpruceID DIDKit, DIF Universal Resolver, and enterprise identity platforms.

## When to use DIDs and VCs

Use the W3C format when:
- Your system must integrate with existing DID infrastructure
- Enterprise or compliance requirements mandate W3C VC format
- You are building for broad interoperability across organizations

Use the native Cord format (cord_v1) when:
- You want the simplest possible setup (no DID hosting required)
- All your services use Cord Protocol natively
- You want maximum portability in a single token string

Both formats use Ed25519 cryptography and offline verification.
`.trim(),

  "did-document": `
# DID Documents

A DID Document is the machine-readable identity record that a DID resolves to.
For a did:web DID, it is a JSON-LD file hosted at a well-known URL.

## Structure

\`\`\`json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1"
  ],
  "id": "did:web:cordprotocol.dev:agents:trading-agent",
  "controller": "did:web:cordprotocol.dev:agents:trading-agent",
  "verificationMethod": [{
    "id": "did:web:cordprotocol.dev:agents:trading-agent#key-1",
    "type": "Ed25519VerificationKey2020",
    "controller": "did:web:cordprotocol.dev:agents:trading-agent",
    "publicKeyMultibase": "<base64url public key from cord_keygen>"
  }],
  "authentication": ["did:web:cordprotocol.dev:agents:trading-agent#key-1"],
  "assertionMethod": ["did:web:cordprotocol.dev:agents:trading-agent#key-1"],
  "service": [{
    "id": "did:web:cordprotocol.dev:agents:trading-agent#cord-credentials",
    "type": "CordCredentialService",
    "serviceEndpoint": "https://cordprotocol.dev/agents/trading-agent/credentials"
  }]
}
\`\`\`

## Hosting requirements

For did:web, host the DID Document at:
  https://your-domain.com/agents/<agentId>/did.json

Or at the path expected by the DID resolver:
  https://your-domain.com/.well-known/did.json  (for root-level DIDs)

## How cord_did_generate helps

cord_did_generate creates a complete DID Document template with the correct
@context, structure, and service endpoints. You only need to:
1. Fill in the publicKeyMultibase value from cord_keygen
2. Host the JSON file at the resolve URL
`.trim(),

  "did-vs-cord": `
# W3C DID/VC Format vs Cord Native Format

Both formats provide the same cryptographic guarantees. The choice is about
ecosystem compatibility and setup complexity.

## Native Cord format (cord_v1)

Token format: cord_v1.<base64url(payload)>.<base64url(signature)>

Advantages:
- Single opaque token string — easy to pass in headers, store in env vars
- No hosting required — completely self-contained
- Simpler setup: cord_keygen + cord_issue, done
- Faster to integrate in services that only use Cord Protocol

Disadvantages:
- Not recognized by W3C VC-aware systems out of the box
- Custom format requires custom parser in every service

## W3C Verifiable Credential format

Format: JSON-LD object with @context, type, issuer, credentialSubject, proof

Advantages:
- Recognized by any W3C VC-aware system without custom code
- Works with DIF Universal Resolver, Veramo, SpruceID, enterprise platforms
- Supports standard VC verification libraries
- Better for cross-organization trust scenarios

Disadvantages:
- Requires hosting a DID Document (for did:web)
- Larger payload (JSON vs compact token)
- More complex setup

## Decision guide

Use cord_issue (native) when:
  - All services you control use Cord Protocol
  - You want the simplest setup
  - You are building a new system from scratch

Use cord_issue_vc (W3C VC) when:
  - Integrating with enterprise systems that expect W3C VCs
  - Compliance or regulatory requirements mandate W3C format
  - You are building across organizational boundaries
  - You have existing DID infrastructure
`.trim(),

  "verifiable-credentials": `
# W3C Verifiable Credentials

A Verifiable Credential (VC) is a W3C standard for expressing tamper-evident credentials.
Cord Protocol implements the VC Data Model 1.1.

## Structure

A Cord VC contains:

**@context** — JSON-LD context, establishes vocabulary
  ["https://www.w3.org/2018/credentials/v1", "https://cordprotocol.dev/contexts/v1"]

**type** — credential types
  ["VerifiableCredential", "CordAgentCredential"]

**issuer** — DID of the issuing party
  "did:web:cordprotocol.dev"

**issuanceDate / expirationDate** — ISO 8601 timestamps

**credentialSubject** — the claims about the agent
  {
    "id": "did:web:cordprotocol.dev:agents:trading-agent",
    "agentId": "trading-agent-v2",
    "issuedTo": "production",
    "permissions": ["market.read", "market.write"]
  }

**proof** — Ed25519 digital signature
  {
    "type": "CordEd25519Proof2025",
    "verificationMethod": "did:web:cordprotocol.dev#key-1",
    "proofValue": "<base64url signature>"
  }

## Issuing a VC

Use cord_issue_vc with your private key. The same key from cord_keygen works for both
native and VC formats.

## Verifying a VC

Pass the JSON to cord_verify — it auto-detects the VC format and verifies the
CordEd25519Proof2025 signature offline, without any network call.
`.trim(),

  resolution: `
# DID Resolution

DID resolution is the process of turning a DID string into its DID Document.

## did:web resolution

For the did:web method (used by Cord Protocol), resolution works by:

1. Parse the DID: did:web:example.com:agents:my-agent
2. Build the URL:  https://example.com/agents/my-agent/did.json
3. Fetch the JSON file at that URL
4. Validate that the DID Document id matches the resolved DID

## Hosting your DID Document

After calling cord_did_generate:
1. Copy the didDocument output
2. Fill in your publicKeyMultibase from cord_keygen
3. Upload the file to the resolveUrl path on your server

Example nginx config to serve did.json:
  location /agents/<agentId>/did.json {
    default_type application/json;
    alias /var/www/dids/<agentId>.json;
  }

## Offline resolution (Cord Protocol)

When cord_verify verifies a W3C VC, it does NOT fetch the DID Document from the
network. Instead, it uses the cordPublicKey field embedded in the proof — a Cord
Protocol extension that makes offline verification possible without a DID resolver.

This means Cord VCs can be verified in air-gapped environments, just like native
Cord credentials.

## DIF Universal Resolver

For standard DID resolution, the DIF Universal Resolver at
https://resolver.identity.foundation can resolve did:web DIDs automatically once
you host your DID Document.
`.trim(),

  "getting-started": `
# Getting Started with W3C DIDs and VCs

## Step 1 — Generate a DID

Ask: "Generate a DID for my trading agent"
Claude will call cord_did_generate and return:
- The DID string (did:web:...)
- A complete DID Document template
- The resolve URL where you need to host it

## Step 2 — Generate a keypair

Ask: "Generate a keypair for my trading agent"
Claude will call cord_keygen and return:
- privateKey (base64url) — add to your .env as CORD_PRIVATE_KEY
- publicKey (base64url) — paste into your DID Document's publicKeyMultibase

## Step 3 — Host your DID Document

Upload the DID Document (with your real public key) to the resolve URL:
  https://<your-domain>/agents/<agentId>/did.json

## Step 4 — Issue a Verifiable Credential

Ask: "Issue a W3C VC for my trading agent with market.read permissions"
Claude will call cord_issue_vc and return a complete W3C VC JSON.

## Step 5 — Verify the VC

Pass the VC JSON to cord_verify. It will:
- Auto-detect the W3C VC format
- Verify the signature offline using the embedded cordPublicKey
- Check expiry and required fields
- Return valid: true with the agent's identity and permissions

## Step 6 — Use in your service

When your service receives a request with a Cord VC:
1. Extract the VC from the Authorization header or request body
2. Call cord_verify — check valid: true
3. Call cord_check_permission for each required scope
4. The service can trust the agent's identity and permissions

Visit https://cordprotocol.dev for full documentation.
`.trim(),
};

export function explainDID(input: ExplainDIDInput): string {
  const topic = input.topic.toLowerCase().trim();

  // Direct match
  if (DID_EXPLANATIONS[topic]) return DID_EXPLANATIONS[topic];

  // Fuzzy matches
  if (topic.includes("document") || topic.includes("doc")) return DID_EXPLANATIONS["did-document"];
  if (topic.includes("vs") || topic.includes("compare") || topic.includes("difference") || topic.includes("native")) return DID_EXPLANATIONS["did-vs-cord"];
  if (topic.includes("credential") || topic.includes("vc")) return DID_EXPLANATIONS["verifiable-credentials"];
  if (topic.includes("resolv") || topic.includes("host")) return DID_EXPLANATIONS["resolution"];
  if (topic.includes("start") || topic.includes("setup") || topic.includes("begin")) return DID_EXPLANATIONS["getting-started"];

  // Fallback to overview
  return DID_EXPLANATIONS["overview"];
}
