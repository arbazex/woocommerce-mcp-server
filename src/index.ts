#!/usr/bin/env node
// ============================================================
// WooCommerce MCP Server — Entry Point
// Connects via stdio (Claude Desktop, MCP Inspector, etc.)
// ============================================================

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  // Validate required environment variables early
  const required = [
    "WOOCOMMERCE_URL",
    "WOOCOMMERCE_CONSUMER_KEY",
    "WOOCOMMERCE_CONSUMER_SECRET",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    process.stderr.write(
      `[woocommerce-mcp-server] Missing required environment variables: ${missing.join(", ")}\n` +
      `Please set them in your MCP client config. See README.md for details.\n`
    );
    process.exit(1);
  }

  const server = createServer();
  const transport = new StdioServerTransport();

  // Log to stderr (stdout is reserved for MCP JSON-RPC messages)
  process.stderr.write(
    `[woocommerce-mcp-server] Starting...\n` +
    `[woocommerce-mcp-server] Store URL: ${process.env.WOOCOMMERCE_URL}\n`
  );

  await server.connect(transport);

  process.stderr.write(`[woocommerce-mcp-server] Ready ✅\n`);
}

main().catch((err: Error) => {
  process.stderr.write(`[woocommerce-mcp-server] Fatal error: ${err.message}\n`);
  process.exit(1);
});