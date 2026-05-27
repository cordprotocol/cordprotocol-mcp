import { z } from "zod";

export const DIDGenerateInputSchema = z.object({
  agentId: z
    .string()
    .min(1)
    .describe("The agent identifier (e.g. 'trading-agent-v2')"),
  domain: z
    .string()
    .optional()
    .default("cordprotocol.dev")
    .describe("Domain for the DID (default: cordprotocol.dev)"),
});

export type DIDGenerateInput = z.infer<typeof DIDGenerateInputSchema>;

export interface DIDGenerateResult {
  did: string;
  didDocument: object;
  resolveUrl: string;
  explanation: string;
  formatted: string;
}

export function generateDID(input: DIDGenerateInput): DIDGenerateResult {
  const { agentId, domain } = input;
  const did = `did:web:${domain}:agents:${agentId}`;
  const resolveUrl = `https://${domain}/agents/${agentId}/did.json`;

  const didDocument = {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
    ],
    id: did,
    controller: did,
    verificationMethod: [
      {
        id: `${did}#key-1`,
        type: "Ed25519VerificationKey2020",
        controller: did,
        publicKeyMultibase:
          "<run cord_keygen and paste your publicKey here (base64url-encoded)>",
      },
    ],
    authentication: [`${did}#key-1`],
    assertionMethod: [`${did}#key-1`],
    service: [
      {
        id: `${did}#cord-credentials`,
        type: "CordCredentialService",
        serviceEndpoint: `https://${domain}/agents/${agentId}/credentials`,
      },
    ],
  };

  const explanation =
    `This DID identifies agent "${agentId}" using the did:web method. ` +
    `It is globally resolvable at ${resolveUrl} — host a did.json file there ` +
    `containing this DID Document. Any DID-aware system can resolve this identifier ` +
    `to discover the agent's public key and verify credentials it presents. ` +
    `Once you have a keypair from cord_keygen, replace the publicKeyMultibase ` +
    `placeholder with your actual base64url-encoded public key.`;

  const formatted = [
    "╔══════════════════════════════════════════════════════════════╗",
    "║         CORD PROTOCOL — W3C DID GENERATED                   ║",
    "╚══════════════════════════════════════════════════════════════╝",
    "",
    `  DID:           ${did}`,
    `  Resolve URL:   ${resolveUrl}`,
    "",
    "  ── DID Document ──────────────────────────────────────────────",
    ...JSON.stringify(didDocument, null, 2)
      .split("\n")
      .map((l) => `  ${l}`),
    "",
    "  ── What this means ───────────────────────────────────────────",
    `  ${explanation}`,
    "",
    "  Next: Run cord_keygen, then replace publicKeyMultibase above.",
    "  Host did.json at the Resolve URL to make the DID resolvable.",
  ].join("\n");

  return { did, didDocument, resolveUrl, explanation, formatted };
}
