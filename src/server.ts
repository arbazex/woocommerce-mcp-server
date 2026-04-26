// ============================================================
// WooCommerce MCP Server — Main Setup
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerOrderTools } from "./tools/orders.js";
import { registerProductTools } from "./tools/products.js";
import { registerCustomerTools } from "./tools/customers.js";
import { registerAnalyticsTools } from "./tools/analytics.js";

export function createServer(): McpServer {
  const server = new McpServer(
    {
      name: "woocommerce-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register all tool groups
  registerOrderTools(server);
  registerProductTools(server);
  registerCustomerTools(server);
  registerAnalyticsTools(server);

  return server;
}