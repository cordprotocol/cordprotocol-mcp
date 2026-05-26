import { z } from "zod";
import { parseCredentialToken } from "../utils/format.js";

export const CheckPermissionInputSchema = z.object({
  credential: z
    .string()
    .min(1)
    .describe("The cord_v1 credential token string"),
  scope: z
    .string()
    .min(1)
    .describe(
      'The permission scope to check (e.g. "market.write", "files.read")'
    ),
});

export type CheckPermissionInput = z.infer<typeof CheckPermissionInputSchema>;

export interface CheckPermissionResult {
  hasPermission: boolean;
  agentId: string;
  scope: string;
  allPermissions: string[];
  formatted: string;
}

function matchesScope(grantedScope: string, requestedScope: string): boolean {
  // Exact match
  if (grantedScope === requestedScope) return true;
  // Wildcard: "market.*" covers "market.read", "market.write"
  if (grantedScope.endsWith(".*")) {
    const prefix = grantedScope.slice(0, -2);
    return requestedScope.startsWith(prefix + ".");
  }
  // Global wildcard
  if (grantedScope === "*") return true;
  return false;
}

export function checkPermission(
  input: CheckPermissionInput
): CheckPermissionResult {
  let payload: ReturnType<typeof parseCredentialToken>["payload"];

  try {
    ({ payload } = parseCredentialToken(input.credential.trim()));
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : "Failed to parse credential"
    );
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.expiresAt <= now) {
    const expiredAt = new Date(payload.expiresAt * 1000).toISOString();
    throw new Error(
      `Credential expired at ${expiredAt}. Issue a new credential with cord_issue.`
    );
  }

  const hasPermission = payload.permissions.some((granted) =>
    matchesScope(granted, input.scope)
  );

  const icon = hasPermission ? "✓" : "✗";
  const verdict = hasPermission ? "GRANTED" : "DENIED";

  const formatted = [
    "╔══════════════════════════════════════════════════════════════╗",
    `║  PERMISSION CHECK: ${verdict.padEnd(42)}║`,
    "╚══════════════════════════════════════════════════════════════╝",
    "",
    `  ${icon}  Scope "${input.scope}" is ${hasPermission ? "granted" : "not granted"}`,
    "",
    `  Agent ID:         ${payload.agentId}`,
    `  Requested Scope:  ${input.scope}`,
    `  All Permissions:  ${payload.permissions.join(", ")}`,
  ].join("\n");

  return {
    hasPermission,
    agentId: payload.agentId,
    scope: input.scope,
    allPermissions: payload.permissions,
    formatted,
  };
}
