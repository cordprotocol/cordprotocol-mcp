import crypto from "node:crypto";
import { z } from "zod";
import {
  formatVerificationResult,
  parseCredentialToken,
  b64urlEncode,
  b64urlDecode,
  CordPayload,
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

function verifyW3CVC(raw: string): VerifyResult {
  let vc: Record<string, unknown>;
  try {
    vc = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const reason = "Invalid JSON — could not parse as W3C Verifiable Credential";
    return { valid: false, reason, formatted: formatVerificationResult(false, undefined, reason) };
  }

  const context = vc["@context"];
  if (
    !Array.isArray(context) ||
    !context.includes("https://www.w3.org/2018/credentials/v1")
  ) {
    const reason =
      'Not a W3C Verifiable Credential — @context must include "https://www.w3.org/2018/credentials/v1"';
    return { valid: false, reason, formatted: formatVerificationResult(false, undefined, reason) };
  }

  const proof = vc["proof"] as Record<string, string> | undefined;
  if (!proof || typeof proof !== "object") {
    const reason = "W3C VC is missing a proof — cannot verify";
    return { valid: false, reason, formatted: formatVerificationResult(false, undefined, reason) };
  }

  const { proofValue, cordPublicKey } = proof;
  if (!proofValue || !cordPublicKey) {
    const reason =
      "W3C VC proof is missing proofValue or cordPublicKey — offline verification not possible";
    return { valid: false, reason, formatted: formatVerificationResult(false, undefined, reason) };
  }

  // Check expiration
  const expirationDate = vc["expirationDate"] as string | undefined;
  const credentialSubject = vc["credentialSubject"] as Record<string, unknown> | undefined;
  const agentId = credentialSubject?.["agentId"] as string | undefined;
  const issuedTo = credentialSubject?.["issuedTo"] as string | undefined;
  const permissions = credentialSubject?.["permissions"] as string[] | undefined;

  if (expirationDate) {
    const expiry = new Date(expirationDate).getTime();
    if (expiry <= Date.now()) {
      const reason = `W3C VC expired at ${expirationDate}`;
      return {
        valid: false,
        agentId,
        issuedTo,
        permissions,
        expiresAt: expirationDate,
        reason,
        formatted: formatVerificationResult(false, undefined, reason),
      };
    }
  }

  // Reconstruct the VC without proof and verify signature
  const vcWithoutProof: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(vc)) {
    if (k !== "proof") vcWithoutProof[k] = v;
  }
  const vcJson = JSON.stringify(vcWithoutProof);
  const signingInput = `cord_vc_v1.${b64urlEncode(Buffer.from(vcJson))}`;

  let signatureValid = false;
  try {
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(cordPublicKey, "base64"),
      format: "der",
      type: "spki",
    });
    signatureValid = crypto.verify(
      null,
      Buffer.from(signingInput),
      publicKey,
      b64urlDecode(proofValue)
    );
  } catch {
    const reason =
      "Failed to verify W3C VC signature — cordPublicKey in proof may be malformed";
    return { valid: false, reason, formatted: formatVerificationResult(false, undefined, reason) };
  }

  if (!signatureValid) {
    const reason =
      "Invalid W3C VC signature — credential may have been tampered with";
    return {
      valid: false,
      agentId,
      reason,
      formatted: formatVerificationResult(false, undefined, reason),
    };
  }

  if (!agentId || !issuedTo || !Array.isArray(permissions)) {
    const reason = "W3C VC credentialSubject is missing required fields (agentId, issuedTo, permissions)";
    return { valid: false, reason, formatted: formatVerificationResult(false, undefined, reason) };
  }

  const issuanceDate = vc["issuanceDate"] as string | undefined;
  const pseudoPayload: CordPayload = {
    agentId,
    issuedTo,
    permissions,
    issuedAt: issuanceDate ? Math.floor(new Date(issuanceDate).getTime() / 1000) : 0,
    expiresAt: expirationDate ? Math.floor(new Date(expirationDate).getTime() / 1000) : 0,
    issuerPublicKey: cordPublicKey,
  };

  return {
    valid: true,
    agentId,
    issuedTo,
    permissions,
    expiresAt: expirationDate,
    formatted: formatVerificationResult(true, pseudoPayload),
  };
}

export function verifyCredential(input: VerifyInput): VerifyResult {
  const raw = input.credential.trim();

  // Auto-detect W3C VC format
  if (raw.startsWith("{")) {
    return verifyW3CVC(raw);
  }

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
