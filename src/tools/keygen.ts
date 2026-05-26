import crypto from "node:crypto";
import { z } from "zod";
import { b64urlEncode } from "../utils/format.js";

export const KeygenInputSchema = z.object({
  name: z
    .string()
    .optional()
    .describe("Optional label for this keypair (e.g. the agent name)"),
});

export type KeygenInput = z.infer<typeof KeygenInputSchema>;

export interface KeygenResult {
  name: string;
  privateKey: string;
  publicKey: string;
  algorithm: string;
  warning: string;
}

export function generateKeypair(input: KeygenInput): KeygenResult {
  const { privateKey: privKeyObj, publicKey: pubKeyObj } =
    crypto.generateKeyPairSync("ed25519", {
      privateKeyEncoding: { type: "pkcs8", format: "der" },
      publicKeyEncoding: { type: "spki", format: "der" },
    });

  const privateKey = b64urlEncode(privKeyObj as unknown as Buffer);
  const publicKey = b64urlEncode(pubKeyObj as unknown as Buffer);

  return {
    name: input.name ?? "unnamed-agent",
    privateKey,
    publicKey,
    algorithm: "Ed25519",
    warning:
      "Store the private key securely (e.g. in a secrets manager or .env file). " +
      "Never commit it to version control.",
  };
}

export function formatKeygenResult(result: KeygenResult): string {
  return [
    "╔══════════════════════════════════════════════════════════════╗",
    "║           CORD PROTOCOL KEYPAIR GENERATED                    ║",
    "╚══════════════════════════════════════════════════════════════╝",
    "",
    `  Agent Name:  ${result.name}`,
    `  Algorithm:   ${result.algorithm}`,
    "",
    "  ── Public Key (share freely) ─────────────────────────────────",
    `  ${result.publicKey}`,
    "",
    "  ── Private Key (keep secret) ────────────────────────────────",
    `  ${result.privateKey}`,
    "",
    "  ⚠  WARNING",
    `  ${result.warning}`,
    "",
    "  Suggested .env entry:",
    `  CORD_PRIVATE_KEY=${result.privateKey}`,
    `  CORD_PUBLIC_KEY=${result.publicKey}`,
  ].join("\n");
}
