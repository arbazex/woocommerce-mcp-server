// ============================================================
// Customer Management Tools
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient, WooCommerceError } from "../woo-client.js";

function formatError(e: unknown): string {
  if (e instanceof WooCommerceError) return `WooCommerce error (${e.code}): ${e.message}`;
  if (e instanceof Error) return e.message;
  return "Unknown error";
}

export function registerCustomerTools(server: McpServer): void {

  // ---- list_customers ----
  server.registerTool(
    "list_customers",
    {
      title: "List Customers",
      description:
        "Retrieve a list of WooCommerce customers. Filter by email or search by name. Returns customer IDs, names, emails, order counts, and total spent.",
      inputSchema: z.object({
        search: z
          .string()
          .optional()
          .describe("Search customers by name, username, or email"),
        email: z
          .string()
          .email()
          .optional()
          .describe("Filter by exact email address"),
        per_page: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe("Number of customers to return"),
        page: z.number().int().min(1).default(1).describe("Page number"),
        orderby: z
          .enum(["id", "name", "registered_date"])
          .default("registered_date")
          .describe("Sort customers by"),
        order: z.enum(["asc", "desc"]).default("desc").describe("Sort direction"),
      }),
    },
    async (input) => {
      try {
        const customers = await getClient().listCustomers({
          search: input.search,
          email: input.email,
          per_page: input.per_page,
          page: input.page,
          orderby: input.orderby,
          order: input.order,
        });

        if (customers.length === 0) {
          return { content: [{ type: "text", text: "No customers found." }] };
        }

        const lines = customers.map((c) => {
          const name = `${c.first_name} ${c.last_name}`.trim() || c.username;
          return (
            `#${c.id} | ${name} | ${c.email} | Orders: ${c.orders_count} | ` +
            `Total Spent: ${c.total_spent} | Joined: ${c.date_created.split("T")[0]}`
          );
        });

        return {
          content: [
            {
              type: "text",
              text: `Found ${customers.length} customer(s):\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ---- get_customer ----
  server.registerTool(
    "get_customer",
    {
      title: "Get Customer Details",
      description:
        "Retrieve full profile for a WooCommerce customer by their ID, including billing/shipping address, total orders, and total spend.",
      inputSchema: z.object({
        customer_id: z.number().int().positive().describe("The customer ID"),
      }),
    },
    async ({ customer_id }) => {
      try {
        const c = await getClient().getCustomer(customer_id);
        const name = `${c.first_name} ${c.last_name}`.trim() || c.username;
        const billing = [
          c.billing.address_1,
          c.billing.address_2,
          c.billing.city,
          c.billing.state,
          c.billing.postcode,
          c.billing.country,
        ]
          .filter(Boolean)
          .join(", ");

        const text = [
          `=== Customer #${c.id}: ${name} ===`,
          `Email: ${c.email}`,
          `Username: ${c.username}`,
          `Role: ${c.role}`,
          `Registered: ${c.date_created.split("T")[0]}`,
          ``,
          `Billing Address: ${billing || "Not set"}`,
          `Billing Phone: ${c.billing.phone || "Not set"}`,
          ``,
          `Total Orders: ${c.orders_count}`,
          `Total Spent: ${c.total_spent}`,
          `Paying Customer: ${c.is_paying_customer ? "Yes" : "No"}`,
        ].join("\n");

        return { content: [{ type: "text", text }] };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ---- get_customer_orders ----
  server.registerTool(
    "get_customer_orders",
    {
      title: "Get Customer Orders",
      description:
        "Retrieve all orders for a specific WooCommerce customer by their ID. Optionally filter by order status.",
      inputSchema: z.object({
        customer_id: z.number().int().positive().describe("The customer ID"),
        status: z
          .enum(["pending", "processing", "on-hold", "completed", "cancelled", "refunded", "failed"])
          .optional()
          .describe("Filter by order status"),
        per_page: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe("Number of orders to return"),
      }),
    },
    async ({ customer_id, status, per_page }) => {
      try {
        const orders = await getClient().getCustomerOrders(customer_id, {
          per_page,
          status,
        });

        if (orders.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No orders found for customer #${customer_id}${status ? ` with status "${status}"` : ""}.`,
              },
            ],
          };
        }

        const lines = orders.map((o) => {
          const items = o.line_items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
          return `#${o.id} | ${o.status.toUpperCase()} | ${o.currency} ${o.total} | ${o.date_created.split("T")[0]} | ${items}`;
        });

        const totalSpent = orders
          .reduce((sum, o) => sum + parseFloat(o.total), 0)
          .toFixed(2);

        return {
          content: [
            {
              type: "text",
              text:
                `Orders for Customer #${customer_id} (${orders.length} total, spent ${totalSpent}):\n\n` +
                lines.join("\n"),
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );
  // ---- get_recent_customers ----
  server.registerTool(
    "get_recent_customers",
    {
      title: "Get Recent Customers",
      description:
        "Retrieve customers who registered in the last 30 days. Useful for tracking new customer acquisition and onboarding follow-ups.",
      inputSchema: z.object({
        days: z
          .number()
          .int()
          .min(1)
          .max(90)
          .default(30)
          .describe("How many days back to look (default: 30, max: 90)"),
        per_page: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe("Number of customers to return"),
      }),
    },
    async ({ days, per_page }) => {
      try {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const afterDate = since.toISOString();

        const customers = await getClient().listCustomers({
          per_page,
          orderby: "registered_date",
          order: "desc",
        });

        // Filter client-side since WooCommerce customer endpoint doesn't support 'after'
        const recent = customers.filter(
          (c) => new Date(c.date_created) >= new Date(afterDate)
        );

        if (recent.length === 0) {
          return {
            content: [{ type: "text", text: `No new customers in the last ${days} days.` }],
          };
        }

        const lines = recent.map((c) => {
          const name = `${c.first_name} ${c.last_name}`.trim() || c.username;
          return `#${c.id} | ${name} | ${c.email} | Joined: ${c.date_created.split("T")[0]} | Orders: ${c.orders_count}`;
        });

        return {
          content: [
            {
              type: "text",
              text: `${recent.length} new customer(s) in the last ${days} days:\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );
}