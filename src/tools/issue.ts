import crypto from "node:crypto";
import { z } from "zod";
import {
  b64urlDecode,
  CordCredential,
  CordPayload,
  formatCredentialDisplay,
  parseExpiresIn,
  signPayload,
} from "../utils/format.js";

export const IssueInputSchema = z.object({
  agentId: z
    .string()
    .min(1)
    .describe("Unique identifier for the agent (e.g. 'trading-agent-v2')"),
  issuedTo: z
    .string()
    .min(1)
    .describe("Who or what this credential is issued to (e.g. 'production', 'alice')"),
  permissions: z
    .array(z.string().min(1))
    .min(1)
    .describe("Permission scopes granted (e.g. ['market.read', 'market.write'])"),
  expiresIn: z
    .string()
    .regex(/^\d+(m|h|d)$/, 'Must be a duration like "30m", "1h", "24h", "7d"')
    .describe('How long the credential is valid (e.g. "1h", "24h", "7d")'),
  privateKey: z
    .string()
    .min(1)
    .describe("Base64url-encoded PKCS8 Ed25519 private key (from cord_keygen)"),
  attestationHash: z
    .string()
    .optional()
    .describe("Optional SHA-256 hash of an external attestation document"),
});

export type IssueInput = z.infer<typeof IssueInputSchema>;

export function issueCredential(input: IssueInput): CordCredential {
  let privateKeyDer: Buffer;
  try {
    privateKeyDer = b64urlDecode(input.privateKey);
  } catch {
    throw new Error(
      "Invalid privateKey encoding. Expected base64url-encoded PKCS8 key from cord_keygen."
    );
  }

  // Derive the public key from the private key for embedding in the credential
  let publicKeyDer: Buffer;
  try {
    const privKeyObj = crypto.createPrivateKey({
      key: privateKeyDer,
      format: "der",
      type: "pkcs8",
    });
    const pubKeyObj = crypto.createPublicKey(privKeyObj);
    publicKeyDer = pubKeyObj.export({ type: "spki", format: "der" }) as Buffer;
  } catch {
    throw new Error(
      "Failed to parse private key. Ensure it was generated with cord_keygen."
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const ttl = parseExpiresIn(input.expiresIn);

  const payload: CordPayload = {
    agentId: input.agentId,
    issuedTo: input.issuedTo,
    permissions: input.permissions,
    issuedAt: now,
    expiresAt: now + ttl,
    issuerPublicKey: publicKeyDer.toString("base64"),
    ...(input.attestationHash ? { attestationHash: input.attestationHash } : {}),
  };

  const token = signPayload(payload, privateKeyDer);
  return { token, payload };
}

export function formatIssueResult(cred: CordCredential): string {
  return formatCredentialDisplay(cred);
}
