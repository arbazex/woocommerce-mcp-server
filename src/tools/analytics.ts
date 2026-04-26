// ============================================================
// Analytics & Reporting Tools
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient, WooCommerceError } from "../woo-client.js";

function formatError(e: unknown): string {
  if (e instanceof WooCommerceError) return `WooCommerce error (${e.code}): ${e.message}`;
  if (e instanceof Error) return e.message;
  return "Unknown error";
}

export function registerAnalyticsTools(server: McpServer): void {

  // ---- get_revenue_summary ----
  server.registerTool(
    "get_revenue_summary",
    {
      title: "Get Revenue Summary",
      description:
        "Get a high-level revenue summary for your WooCommerce store — total sales, number of orders, average order value, and net sales for a given period.",
      inputSchema: z.object({
        period: z
          .enum(["week", "month", "last_month", "year"])
          .default("month")
          .describe("Time period for the report"),
      }),
    },
    async ({ period }) => {
      try {
        const summary = await getClient().getRevenueSummary(period);

        const periodLabel: Record<string, string> = {
          week: "This Week",
          month: "This Month",
          last_month: "Last Month",
          year: "This Year",
        };

        const text = [
          `=== Revenue Summary: ${periodLabel[period]} ===`,
          ``,
          `💰 Total Sales:        ${summary.total_sales}`,
          `📦 Total Orders:       ${summary.total_orders}`,
          `🛍️  Total Items Sold:   ${summary.total_items}`,
          `📊 Net Sales:          ${summary.net_sales}`,
          `📈 Avg Order Value:    ${summary.average_order_value}`,
        ].join("\n");

        return { content: [{ type: "text", text }] };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ---- get_top_selling_products ----
  server.registerTool(
    "get_top_selling_products",
    {
      title: "Get Top Selling Products",
      description:
        "Retrieve the best-selling WooCommerce products by quantity sold for a given period. Great for inventory planning and marketing focus.",
      inputSchema: z.object({
        period: z
          .enum(["week", "month", "last_month", "year"])
          .default("month")
          .describe("Time period for the report"),
      }),
    },
    async ({ period }) => {
      try {
        const sellers = await getClient().getTopSellingProducts({ period });

        if (sellers.length === 0) {
          return {
            content: [{ type: "text", text: "No sales data found for this period." }],
          };
        }

        const lines = sellers.map(
          (s, i) => `${i + 1}. ${s.title} (ID: ${s.product_id}) — ${s.quantity} sold`
        );

        return {
          content: [
            {
              type: "text",
              text: `Top Selling Products (${period}):\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ---- get_order_status_counts ----
  server.registerTool(
    "get_order_status_counts",
    {
      title: "Get Order Status Counts",
      description:
        "Get a count of WooCommerce orders grouped by status — see how many are pending, processing, completed, cancelled, etc. Useful for daily operational overview.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const counts = await getClient().getOrderStatusCounts();
        const total = Object.values(counts).reduce((a, b) => a + b, 0);

        const statusEmoji: Record<string, string> = {
          pending: "🕐",
          processing: "🔄",
          "on-hold": "⏸️",
          completed: "✅",
          cancelled: "❌",
          refunded: "💸",
          failed: "⛔",
        };

        const lines = Object.entries(counts)
          .filter(([, count]) => count > 0)
          .sort(([, a], [, b]) => b - a)
          .map(([status, count]) => `${statusEmoji[status] ?? "📦"} ${status}: ${count}`);

        return {
          content: [
            {
              type: "text",
              text:
                `=== Order Status Breakdown ===\n\nTotal: ${total} orders\n\n` +
                lines.join("\n"),
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ---- get_sales_report ----
  server.registerTool(
    "get_sales_report",
    {
      title: "Get Sales Report",
      description:
        "Get a detailed WooCommerce sales report for a time period or custom date range. Returns total sales, orders, refunds, tax, and shipping broken down over time.",
      inputSchema: z.object({
        period: z
          .enum(["week", "month", "last_month", "year"])
          .optional()
          .describe("Predefined period — use this OR date_min/date_max"),
        date_min: z
          .string()
          .optional()
          .describe("Start date in YYYY-MM-DD format (used with date_max)"),
        date_max: z
          .string()
          .optional()
          .describe("End date in YYYY-MM-DD format (used with date_min)"),
      }),
    },
    async (input) => {
      try {
        const reports = await getClient().getSalesReport({
          period: input.period,
          date_min: input.date_min,
          date_max: input.date_max,
        });

        if (!reports || reports.length === 0) {
          return {
            content: [{ type: "text", text: "No report data found for the specified period." }],
          };
        }

        const r = reports[0];
        const text = [
          `=== Sales Report ===`,
          ``,
          `💰 Total Sales:     ${r.total_sales}`,
          `📊 Net Sales:       ${r.net_sales}`,
          `📈 Average Sale:    ${r.average_sales}`,
          `📦 Total Orders:    ${r.total_orders}`,
          `🛍️  Total Items:     ${r.total_items}`,
          `🏷️  Total Tax:       ${r.total_tax}`,
          `🚚 Total Shipping:  ${r.total_shipping}`,
          `💸 Total Refunds:   ${r.total_refunds}`,
          `🎟️  Total Discounts: ${r.total_discount}`,
          `👥 Total Customers: ${r.total_customers}`,
        ].join("\n");

        return { content: [{ type: "text", text }] };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );
}