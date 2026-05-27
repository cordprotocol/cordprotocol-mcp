#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { generateKeypair, formatKeygenResult, KeygenInputSchema } from "./tools/keygen.js";
import { issueCredential, formatIssueResult, IssueInputSchema } from "./tools/issue.js";
import { verifyCredential, VerifyInputSchema } from "./tools/verify.js";
import { checkPermission, CheckPermissionInputSchema } from "./tools/permissions.js";
import { explain, ExplainInputSchema } from "./tools/explain.js";
import { setupProject, SetupProjectInputSchema } from "./tools/setup.js";
import { generateDID, DIDGenerateInputSchema } from "./tools/did.js";
import { issueVerifiableCredential, IssueVCInputSchema } from "./tools/issue_vc.js";
import { explainDID, ExplainDIDInputSchema } from "./tools/explain_did.js";

const server = new McpServer({
  name: "cordprotocol",
  version: "0.2.0",
});

// ── cord_keygen ────────────────────────────────────────────────────────────

server.tool(
  "cord_keygen",
  "Generate a new Ed25519 keypair for a Cord Protocol agent identity",
  KeygenInputSchema.shape,
  async (input) => {
    try {
      const result = generateKeypair(input);
      return {
        content: [
          {
            type: "text",
            text: formatKeygenResult(result),
          },
          {
            type: "text",
            text: JSON.stringify({
              name: result.name,
              privateKey: result.privateKey,
              publicKey: result.publicKey,
              algorithm: result.algorithm,
              warning: result.warning,
            }),
          },
        ],
      };
    } catch (err) {
      return errorResponse("cord_keygen", err);
    }
  }
);

// ── cord_issue ─────────────────────────────────────────────────────────────

server.tool(
  "cord_issue",
  "Issue a cryptographic identity credential for an AI agent",
  IssueInputSchema.shape,
  async (input) => {
    try {
      const cred = issueCredential(input);
      return {
        content: [
          {
            type: "text",
            text: formatIssueResult(cred),
          },
          {
            type: "text",
            text: JSON.stringify({
              token: cred.token,
              agentId: cred.payload.agentId,
              issuedTo: cred.payload.issuedTo,
              permissions: cred.payload.permissions,
              issuedAt: new Date(cred.payload.issuedAt * 1000).toISOString(),
              expiresAt: new Date(cred.payload.expiresAt * 1000).toISOString(),
            }),
          },
        ],
      };
    } catch (err) {
      return errorResponse("cord_issue", err);
    }
  }
);

// ── cord_verify ────────────────────────────────────────────────────────────

server.tool(
  "cord_verify",
  "Verify a Cord Protocol agent credential — checks signature, expiry, and schema",
  VerifyInputSchema.shape,
  async (input) => {
    try {
      const result = verifyCredential(input);
      return {
        content: [
          {
            type: "text",
            text: result.formatted,
          },
          {
            type: "text",
            text: JSON.stringify({
              valid: result.valid,
              agentId: result.agentId,
              issuedTo: result.issuedTo,
              permissions: result.permissions,
              expiresAt: result.expiresAt,
              reason: result.reason,
            }),
          },
        ],
      };
    } catch (err) {
      return errorResponse("cord_verify", err);
    }
  }
);

// ── cord_check_permission ──────────────────────────────────────────────────

server.tool(
  "cord_check_permission",
  'Check if an agent credential has a specific permission scope (supports wildcards like "market.*")',
  CheckPermissionInputSchema.shape,
  async (input) => {
    try {
      const result = checkPermission(input);
      return {
        content: [
          {
            type: "text",
            text: result.formatted,
          },
          {
            type: "text",
            text: JSON.stringify({
              hasPermission: result.hasPermission,
              agentId: result.agentId,
              scope: result.scope,
              allPermissions: result.allPermissions,
            }),
          },
        ],
      };
    } catch (err) {
      return errorResponse("cord_check_permission", err);
    }
  }
);

// ── cord_explain ───────────────────────────────────────────────────────────

server.tool(
  "cord_explain",
  'Explain what Cord Protocol is and when to use it. Topics: "overview", "post-quantum", "permissions", "attestation", "vs-oauth", "getting-started", "did", "whats-new"',
  ExplainInputSchema.shape,
  async (input) => {
    try {
      const text = explain(input);
      return {
        content: [{ type: "text", text }],
      };
    } catch (err) {
      return errorResponse("cord_explain", err);
    }
  }
);

// ── cord_setup_project ─────────────────────────────────────────────────────

server.tool(
  "cord_setup_project",
  "Set up Cord Protocol in a project — generates install command, starter code, and .env entries",
  SetupProjectInputSchema.shape,
  async (input) => {
    try {
      const result = setupProject(input);
      return {
        content: [
          {
            type: "text",
            text: result.formatted,
          },
          {
            type: "text",
            text: JSON.stringify({
              installCommand: result.installCommand,
              starterCode: result.starterCode,
              envVars: result.envVars,
              nextSteps: result.nextSteps,
            }),
          },
        ],
      };
    } catch (err) {
      return errorResponse("cord_setup_project", err);
    }
  }
);

// ── cord_did_generate ──────────────────────────────────────────────────────

server.tool(
  "cord_did_generate",
  "Generate a W3C DID (Decentralized Identifier) for an AI agent using Cord Protocol",
  DIDGenerateInputSchema.shape,
  async (input) => {
    try {
      const result = generateDID(input);
      return {
        content: [
          {
            type: "text",
            text: result.formatted,
          },
          {
            type: "text",
            text: JSON.stringify({
              did: result.did,
              didDocument: result.didDocument,
              resolveUrl: result.resolveUrl,
              explanation: result.explanation,
            }),
          },
        ],
      };
    } catch (err) {
      return errorResponse("cord_did_generate", err);
    }
  }
);

// ── cord_issue_vc ──────────────────────────────────────────────────────────

server.tool(
  "cord_issue_vc",
  "Issue a W3C Verifiable Credential for an AI agent — interoperable with any DID-aware system",
  IssueVCInputSchema.shape,
  async (input) => {
    try {
      const result = issueVerifiableCredential(input);
      return {
        content: [
          {
            type: "text",
            text: result.formatted,
          },
          {
            type: "text",
            text: JSON.stringify({
              verifiableCredential: result.verifiableCredential,
              agentDID: result.agentDID,
              format: result.format,
              compatible: result.compatible,
            }),
          },
        ],
      };
    } catch (err) {
      return errorResponse("cord_issue_vc", err);
    }
  }
);

// ── cord_explain_did ───────────────────────────────────────────────────────

server.tool(
  "cord_explain_did",
  'Explain W3C DIDs and Verifiable Credentials for AI agents. Topics: "overview", "did-document", "did-vs-cord", "verifiable-credentials", "resolution", "getting-started"',
  ExplainDIDInputSchema.shape,
  async (input) => {
    try {
      const text = explainDID(input);
      return {
        content: [{ type: "text", text }],
      };
    } catch (err) {
      return errorResponse("cord_explain_did", err);
    }
  }
);

// ── helpers ────────────────────────────────────────────────────────────────

function errorResponse(tool: string, err: unknown) {
  const message =
    err instanceof z.ZodError
      ? "Invalid input:\n" +
        err.errors.map((e) => `  ${e.path.join(".")}: ${e.message}`).join("\n")
      : err instanceof Error
      ? err.message
      : String(err);

  return {
    content: [
      {
        type: "text" as const,
        text: `${tool} error: ${message}`,
      },
    ],
    isError: true,
  };
}

// ── start ──────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // MCP servers communicate over stdio — do not write to stdout
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
