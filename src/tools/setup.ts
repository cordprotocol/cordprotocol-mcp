import { z } from "zod";

export const SetupProjectInputSchema = z.object({
  language: z
    .enum(["typescript", "python"])
    .describe("Project language"),
  agentId: z
    .string()
    .min(1)
    .describe("The agent identifier (e.g. 'my-trading-agent')"),
  permissions: z
    .array(z.string().min(1))
    .min(1)
    .describe("Permission scopes the agent needs (e.g. ['market.read', 'files.write'])"),
});

export type SetupProjectInput = z.infer<typeof SetupProjectInputSchema>;

export interface SetupProjectResult {
  installCommand: string;
  starterCode: string;
  envVars: string;
  nextSteps: string[];
  formatted: string;
}

const TS_STARTER = (agentId: string, permissions: string[]) => `
import crypto from "node:crypto";

// Load from environment — never hard-code keys
const CORD_PRIVATE_KEY = process.env.CORD_PRIVATE_KEY!;
const CORD_PUBLIC_KEY = process.env.CORD_PUBLIC_KEY!;

// Issue a credential for this agent session
async function getAgentCredential(): Promise<string> {
  const response = await fetch("https://api.cordprotocol.dev/v1/issue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId: "${agentId}",
      issuedTo: process.env.ENVIRONMENT ?? "development",
      permissions: ${JSON.stringify(permissions)},
      expiresIn: "1h",
      privateKey: CORD_PRIVATE_KEY,
    }),
  });
  const { token } = await response.json();
  return token;
}

// Verify a credential received from another agent
async function verifyAgentCredential(token: string): Promise<boolean> {
  const response = await fetch("https://api.cordprotocol.dev/v1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: token }),
  });
  const result = await response.json();
  return result.valid;
}

export { getAgentCredential, verifyAgentCredential };
`.trim();

const PY_STARTER = (agentId: string, permissions: string[]) => `
import os
import requests

CORD_PRIVATE_KEY = os.environ["CORD_PRIVATE_KEY"]
CORD_PUBLIC_KEY = os.environ["CORD_PUBLIC_KEY"]


def get_agent_credential() -> str:
    """Issue a Cord Protocol credential for this agent session."""
    response = requests.post(
        "https://api.cordprotocol.dev/v1/issue",
        json={
            "agentId": "${agentId}",
            "issuedTo": os.environ.get("ENVIRONMENT", "development"),
            "permissions": ${JSON.stringify(permissions)},
            "expiresIn": "1h",
            "privateKey": CORD_PRIVATE_KEY,
        },
    )
    response.raise_for_status()
    return response.json()["token"]


def verify_agent_credential(token: str) -> bool:
    """Verify a Cord Protocol credential received from another agent."""
    response = requests.post(
        "https://api.cordprotocol.dev/v1/verify",
        json={"credential": token},
    )
    response.raise_for_status()
    return response.json()["valid"]
`.trim();

// Replace ${...} template literals in the starter strings above
// The strings above use template literal syntax but need to be actual strings
function buildTsStarter(agentId: string, permissions: string[]): string {
  return `import crypto from "node:crypto";

// Load from environment — never hard-code keys
const CORD_PRIVATE_KEY = process.env.CORD_PRIVATE_KEY!;
const CORD_PUBLIC_KEY = process.env.CORD_PUBLIC_KEY!;

// Issue a credential for this agent session
async function getAgentCredential(): Promise<string> {
  const response = await fetch("https://api.cordprotocol.dev/v1/issue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId: "${agentId}",
      issuedTo: process.env.ENVIRONMENT ?? "development",
      permissions: ${JSON.stringify(permissions)},
      expiresIn: "1h",
      privateKey: CORD_PRIVATE_KEY,
    }),
  });
  const { token } = await response.json() as { token: string };
  return token;
}

// Verify a credential received from another agent
async function verifyAgentCredential(token: string): Promise<boolean> {
  const response = await fetch("https://api.cordprotocol.dev/v1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: token }),
  });
  const result = await response.json() as { valid: boolean };
  return result.valid;
}

export { getAgentCredential, verifyAgentCredential };`;
}

function buildPyStarter(agentId: string, permissions: string[]): string {
  const permsStr = JSON.stringify(permissions);
  return `import os
import requests

CORD_PRIVATE_KEY = os.environ["CORD_PRIVATE_KEY"]
CORD_PUBLIC_KEY = os.environ["CORD_PUBLIC_KEY"]


def get_agent_credential() -> str:
    """Issue a Cord Protocol credential for this agent session."""
    response = requests.post(
        "https://api.cordprotocol.dev/v1/issue",
        json={
            "agentId": "${agentId}",
            "issuedTo": os.environ.get("ENVIRONMENT", "development"),
            "permissions": ${permsStr},
            "expiresIn": "1h",
            "privateKey": CORD_PRIVATE_KEY,
        },
    )
    response.raise_for_status()
    return response.json()["token"]


def verify_agent_credential(token: str) -> bool:
    """Verify a Cord Protocol credential received from another agent."""
    response = requests.post(
        "https://api.cordprotocol.dev/v1/verify",
        json={"credential": token},
    )
    response.raise_for_status()
    return response.json()["valid"]`;
}

export function setupProject(input: SetupProjectInput): SetupProjectResult {
  const { language, agentId, permissions } = input;

  const isTs = language === "typescript";

  const installCommand = isTs
    ? "npm install @cordprotocol/sdk"
    : "pip install cordprotocol";

  const starterCode = isTs
    ? buildTsStarter(agentId, permissions)
    : buildPyStarter(agentId, permissions);

  const envVars = [
    "# Cord Protocol — add to your .env file",
    "# Generate with cord_keygen (never commit these)",
    "CORD_PRIVATE_KEY=<your-private-key>",
    "CORD_PUBLIC_KEY=<your-public-key>",
    "ENVIRONMENT=development",
  ].join("\n");

  const nextSteps = [
    `Run cord_keygen with name="${agentId}" to generate your keypair`,
    "Add the private and public keys to your .env file (never commit them)",
    `Run cord_issue to create a credential with permissions: ${permissions.join(", ")}`,
    "Add the credential verification logic to your service's request handler",
    "Set short expiry times ('1h') for automated tasks; rotate on each deployment",
    "Visit https://cordprotocol.dev for full SDK documentation",
  ];

  const formatted = [
    "╔══════════════════════════════════════════════════════════════╗",
    `║  CORD PROTOCOL SETUP — ${language.toUpperCase().padEnd(38)}║`,
    "╚══════════════════════════════════════════════════════════════╝",
    "",
    "  ── Install ───────────────────────────────────────────────────",
    `  ${installCommand}`,
    "",
    "  ── .env entries ──────────────────────────────────────────────",
    ...envVars.split("\n").map((l) => `  ${l}`),
    "",
    "  ── Starter Code ──────────────────────────────────────────────",
    ...starterCode.split("\n").map((l) => `  ${l}`),
    "",
    "  ── Next Steps ────────────────────────────────────────────────",
    ...nextSteps.map((s, i) => `  ${i + 1}. ${s}`),
  ].join("\n");

  return { installCommand, starterCode, envVars, nextSteps, formatted };
}
