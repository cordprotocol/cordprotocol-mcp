import crypto from "node:crypto";
import { z } from "zod";
import {
  formatVerificationResult,
  parseCredentialToken,
} from "../utils/format.js";

export const VerifyInputSchema = z.object({
  credential: z
    .string()
    .min(1)
    .describe("The cord_v1 credential token string to verify"),
});

export type VerifyInput = z.infer<typeof VerifyInputSchema>;

export interface VerifyResult {
  valid: boolean;
  agentId?: string;
  issuedTo?: string;
  permissions?: string[];
  expiresAt?: string;
  reason?: string;
  formatted: string;
}

export function verifyCredential(input: VerifyInput): VerifyResult {
  let parsed: ReturnType<typeof parseCredentialToken>;

  try {
    parsed = parseCredentialToken(input.credential.trim());
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Failed to parse credential";
    return {
      valid: false,
      reason,
      formatted: formatVerificationResult(false, undefined, reason),
    };
  }

  const { payload, signingInput, signature } = parsed;

  // Check expiry before signature to give a useful error message first
  const now = Math.floor(Date.now() / 1000);
  if (payload.expiresAt <= now) {
    const expiredAt = new Date(payload.expiresAt * 1000).toISOString();
    const reason = `Credential expired at ${expiredAt}`;
    return {
      valid: false,
      agentId: payload.agentId,
      issuedTo: payload.issuedTo,
      permissions: payload.permissions,
      expiresAt: expiredAt,
      reason,
      formatted: formatVerificationResult(false, payload, reason),
    };
  }

  // Verify Ed25519 signature
  let signatureValid = false;
  try {
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(payload.issuerPublicKey, "base64"),
      format: "der",
      type: "spki",
    });
    signatureValid = crypto.verify(
      null,
      Buffer.from(signingInput),
      publicKey,
      signature
    );
  } catch {
    const reason = "Failed to verify signature — issuerPublicKey may be malformed";
    return {
      valid: false,
      reason,
      formatted: formatVerificationResult(false, payload, reason),
    };
  }

  if (!signatureValid) {
    const reason = "Invalid signature — credential may have been tampered with";
    return {
      valid: false,
      agentId: payload.agentId,
      reason,
      formatted: formatVerificationResult(false, payload, reason),
    };
  }

  // Validate required payload fields
  if (!payload.agentId || !payload.issuedTo || !Array.isArray(payload.permissions)) {
    const reason = "Credential payload is missing required fields";
    return {
      valid: false,
      reason,
      formatted: formatVerificationResult(false, payload, reason),
    };
  }

  const expiresAt = new Date(payload.expiresAt * 1000).toISOString();
  return {
    valid: true,
    agentId: payload.agentId,
    issuedTo: payload.issuedTo,
    permissions: payload.permissions,
    expiresAt,
    formatted: formatVerificationResult(true, payload),
  };
}
