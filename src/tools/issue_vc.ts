import crypto from "node:crypto";
import { z } from "zod";
import { b64urlEncode, b64urlDecode, parseExpiresIn } from "../utils/format.js";

export const IssueVCInputSchema = z.object({
  agentId: z
    .string()
    .min(1)
    .describe("The agent identifier (e.g. 'trading-agent-v2')"),
  issuedTo: z
    .string()
    .min(1)
    .describe("Recipient or context (e.g. 'production' or a user ID)"),
  permissions: z
    .array(z.string().min(1))
    .min(1)
    .describe("Permission scopes the credential grants"),
  expiresIn: z
    .string()
    .regex(/^\d+(m|h|d)$/)
    .describe('Expiry duration, e.g. "1h", "24h", "7d"'),
  privateKey: z
    .string()
    .min(1)
    .describe("Base64url PKCS8 Ed25519 private key from cord_keygen"),
  issuerDID: z
    .string()
    .optional()
    .default("did:web:cordprotocol.dev")
    .describe("Issuer DID (default: did:web:cordprotocol.dev)"),
  domain: z
    .string()
    .optional()
    .default("cordprotocol.dev")
    .describe("Domain used to construct the agent DID (default: cordprotocol.dev)"),
});

export type IssueVCInput = z.infer<typeof IssueVCInputSchema>;

export interface IssueVCResult {
  verifiableCredential: object;
  agentDID: string;
  format: string;
  compatible: string[];
  formatted: string;
}

export function issueVerifiableCredential(input: IssueVCInput): IssueVCResult {
  const { agentId, issuedTo, permissions, expiresIn, privateKey, issuerDID, domain } = input;

  const now = Math.floor(Date.now() / 1000);
  const expirySeconds = parseExpiresIn(expiresIn);
  const expiresAt = now + expirySeconds;

  const agentDID = `did:web:${domain}:agents:${agentId}`;
  const issuanceDate = new Date(now * 1000).toISOString();
  const expirationDate = new Date(expiresAt * 1000).toISOString();

  // Derive public key from private key for offline verification
  const privateKeyDer = b64urlDecode(privateKey);
  const privKeyObj = crypto.createPrivateKey({
    key: privateKeyDer,
    format: "der",
    type: "pkcs8",
  });
  const pubKeyObj = crypto.createPublicKey(privKeyObj);
  const publicKeySpki = pubKeyObj.export({ type: "spki", format: "der" }) as Buffer;
  const cordPublicKey = publicKeySpki.toString("base64");

  const vcWithoutProof = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://cordprotocol.dev/contexts/v1",
    ],
    type: ["VerifiableCredential", "CordAgentCredential"],
    issuer: issuerDID,
    issuanceDate,
    expirationDate,
    credentialSubject: {
      id: agentDID,
      agentId,
      issuedTo,
      permissions,
    },
  };

  // Sign the serialized VC (without proof) with a Cord-prefixed signing input
  const vcJson = JSON.stringify(vcWithoutProof);
  const signingInput = `cord_vc_v1.${b64urlEncode(Buffer.from(vcJson))}`;
  const signature = crypto.sign(null, Buffer.from(signingInput), privKeyObj);
  const proofValue = b64urlEncode(signature);

  const verifiableCredential = {
    ...vcWithoutProof,
    proof: {
      type: "CordEd25519Proof2025",
      created: issuanceDate,
      verificationMethod: `${issuerDID}#key-1`,
      proofPurpose: "assertionMethod",
      proofValue,
      // Non-standard extension: embeds the public key so cord_verify can work offline
      cordPublicKey,
    },
  };

  const compatible = [
    "W3C Verifiable Credentials Data Model 1.1",
    "DIF Universal Resolver (with did:web support)",
    "Veramo",
    "SpruceID DIDKit",
    "any DID-aware identity system",
  ];

  const formatted = [
    "╔══════════════════════════════════════════════════════════════╗",
    "║      CORD PROTOCOL — W3C VERIFIABLE CREDENTIAL               ║",
    "╚══════════════════════════════════════════════════════════════╝",
    "",
    `  Agent DID:     ${agentDID}`,
    `  Issuer DID:    ${issuerDID}`,
    `  Permissions:   ${permissions.join(", ")}`,
    `  Issued At:     ${issuanceDate}`,
    `  Expires At:    ${expirationDate}`,
    "",
    "  ── Verifiable Credential ─────────────────────────────────────",
    ...JSON.stringify(verifiableCredential, null, 2)
      .split("\n")
      .map((l) => `  ${l}`),
    "",
    `  Format:        W3C Verifiable Credential`,
    `  Compatible:    ${compatible.join(", ")}`,
    "",
    "  Verify this credential with cord_verify (pass the JSON above).",
  ].join("\n");

  return {
    verifiableCredential,
    agentDID,
    format: "W3C Verifiable Credential",
    compatible,
    formatted,
  };
}
