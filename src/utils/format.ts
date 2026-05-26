import crypto from "node:crypto";

export interface CordPayload {
  agentId: string;
  issuedTo: string;
  permissions: string[];
  issuedAt: number;
  expiresAt: number;
  issuerPublicKey: string;
  attestationHash?: string;
}

export interface CordCredential {
  token: string;
  payload: CordPayload;
}

export function b64urlEncode(data: Buffer): string {
  return data
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function b64urlDecode(str: string): Buffer {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(
    padded.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  );
}

export function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)(m|h|d)$/);
  if (!match) {
    throw new Error(
      `Invalid expiresIn format "${expiresIn}". Use "30m", "1h", "24h", "7d".`
    );
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { m: 60, h: 3600, d: 86400 };
  return value * multipliers[unit];
}

export function signPayload(payload: CordPayload, privateKeyDer: Buffer): string {
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = b64urlEncode(Buffer.from(payloadJson));
  const signingInput = `cord_v1.${payloadB64}`;

  const privateKey = crypto.createPrivateKey({
    key: privateKeyDer,
    format: "der",
    type: "pkcs8",
  });

  const signature = crypto.sign(null, Buffer.from(signingInput), privateKey);
  return `cord_v1.${payloadB64}.${b64urlEncode(signature)}`;
}

export function parseCredentialToken(token: string): {
  payload: CordPayload;
  signingInput: string;
  signature: Buffer;
} {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "cord_v1") {
    throw new Error(
      'Invalid credential format. Expected "cord_v1.<payload>.<signature>".'
    );
  }

  const [prefix, payloadB64, sigB64] = parts;
  const signingInput = `${prefix}.${payloadB64}`;
  const payload = JSON.parse(b64urlDecode(payloadB64).toString()) as CordPayload;
  const signature = b64urlDecode(sigB64);

  return { payload, signingInput, signature };
}

export function formatCredentialDisplay(cred: CordCredential): string {
  const { payload, token } = cred;
  const issuedAt = new Date(payload.issuedAt * 1000).toISOString();
  const expiresAt = new Date(payload.expiresAt * 1000).toISOString();
  const keyPreview = payload.issuerPublicKey.substring(0, 20) + "...";
  const attest = payload.attestationHash
    ? `\n  Attestation:   ${payload.attestationHash.substring(0, 20)}...`
    : "";

  const tokenLines = token.match(/.{1,72}/g)?.join("\n  ") ?? token;

  return [
    "╔══════════════════════════════════════════════════════════════╗",
    "║           CORD PROTOCOL AGENT CREDENTIAL                     ║",
    "╚══════════════════════════════════════════════════════════════╝",
    "",
    `  Agent ID:      ${payload.agentId}`,
    `  Issued To:     ${payload.issuedTo}`,
    `  Permissions:   ${payload.permissions.join(", ")}`,
    `  Issued At:     ${issuedAt}`,
    `  Expires At:    ${expiresAt}`,
    `  Issuer Key:    ${keyPreview}`,
    ...(attest ? [attest] : []),
    "",
    "  ── Credential Token ──────────────────────────────────────────",
    `  ${tokenLines}`,
    "",
    "  Store this token securely. Never commit it to version control.",
  ].join("\n");
}

export function formatVerificationResult(
  valid: boolean,
  payload?: CordPayload,
  reason?: string
): string {
  if (!valid) {
    return [
      "╔══════════════════════════════════════════════════════════════╗",
      "║  VERIFICATION FAILED                                         ║",
      "╚══════════════════════════════════════════════════════════════╝",
      "",
      `  Reason: ${reason ?? "Unknown error"}`,
    ].join("\n");
  }

  const expiresAt = new Date((payload!.expiresAt) * 1000).toISOString();

  return [
    "╔══════════════════════════════════════════════════════════════╗",
    "║  VERIFICATION PASSED ✓                                       ║",
    "╚══════════════════════════════════════════════════════════════╝",
    "",
    `  Agent ID:     ${payload!.agentId}`,
    `  Issued To:    ${payload!.issuedTo}`,
    `  Permissions:  ${payload!.permissions.join(", ")}`,
    `  Expires At:   ${expiresAt}`,
    "",
    "  Signature:    Valid Ed25519",
    "  Expiry:       Not expired",
    "  Schema:       cord_v1 compliant",
  ].join("\n");
}
