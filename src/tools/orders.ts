// ============================================================
// Order Management Tools
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient, WooCommerceError } from "../woo-client.js";

function formatError(e: unknown): string {
  if (e instanceof WooCommerceError) return `WooCommerce error (${e.code}): ${e.message}`;
  if (e instanceof Error) return e.message;
  return "Unknown error";
}

export function registerOrderTools(server: McpServer): void {

  // ---- list_orders ----
  server.registerTool(
    "list_orders",
    {
      title: "List Orders",
      description:
        "Retrieve a list of WooCommerce orders. Filter by status, date range, customer, or product. Returns order IDs, statuses, totals, and customer details.",
      inputSchema: z.object({
        status: z
          .enum(["pending", "processing", "on-hold", "completed", "cancelled", "refunded", "failed", "trash"])
          .optional()
          .describe("Filter by order status"),
        after: z
          .string()
          .optional()
          .describe("ISO 8601 date — only orders created after this date (e.g. 2024-01-01)"),
        before: z
          .string()
          .optional()
          .describe("ISO 8601 date — only orders created before this date"),
        customer_id: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Filter orders by customer ID"),
        per_page: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe("Number of orders to return (max 100)"),
        page: z
          .number()
          .int()
          .min(1)
          .default(1)
          .describe("Page number for pagination"),
        orderby: z
          .enum(["date", "id", "total"])
          .default("date")
          .describe("Sort orders by this field"),
        order: z
          .enum(["asc", "desc"])
          .default("desc")
          .describe("Sort direction"),
      }),
    },
    async (input) => {
      try {
        const client = getClient();
        const orders = await client.listOrders({
          status: input.status,
          after: input.after,
          before: input.before,
          customer: input.customer_id,
          per_page: input.per_page,
          page: input.page,
          orderby: input.orderby,
          order: input.order,
        });

        if (orders.length === 0) {
          return {
            content: [{ type: "text", text: "No orders found matching your filters." }],
          };
        }

        const lines = orders.map((o) => {
          const name = `${o.billing.first_name} ${o.billing.last_name}`.trim();
          const items = o.line_items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
          return (
            `#${o.id} | ${o.status.toUpperCase()} | ${o.currency} ${o.total} | ` +
            `${name} (${o.billing.email}) | ${o.date_created.split("T")[0]} | ${items}`
          );
        });

        return {
          content: [
            {
              type: "text",
              text: `Found ${orders.length} order(s):\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ---- get_order ----
  server.registerTool(
    "get_order",
    {
      title: "Get Order Details",
      description:
        "Retrieve full details for a single WooCommerce order by ID, including line items, customer info, billing/shipping address, payment method, and totals.",
      inputSchema: z.object({
        order_id: z
          .number()
          .int()
          .positive()
          .describe("The WooCommerce order ID"),
      }),
    },
    async ({ order_id }) => {
      try {
        const order = await getClient().getOrder(order_id);
        const name = `${order.billing.first_name} ${order.billing.last_name}`.trim();
        const addr = [
          order.billing.address_1,
          order.billing.city,
          order.billing.country,
        ]
          .filter(Boolean)
          .join(", ");

        const items = order.line_items
          .map((i) => `  - ${i.quantity}x ${i.name} (SKU: ${i.sku || "N/A"}) @ ${order.currency} ${i.price}`)
          .join("\n");

        const text = [
          `=== Order #${order.id} ===`,
          `Status: ${order.status.toUpperCase()}`,
          `Date: ${order.date_created.split("T")[0]}`,
          ``,
          `Customer: ${name}`,
          `Email: ${order.billing.email}`,
          `Phone: ${order.billing.phone}`,
          `Address: ${addr}`,
          ``,
          `Items:\n${items}`,
          ``,
          `Subtotal: ${order.currency} ${(parseFloat(order.total) - parseFloat(order.shipping_total) - parseFloat(order.total_tax)).toFixed(2)}`,
          `Shipping: ${order.currency} ${order.shipping_total}`,
          `Tax: ${order.currency} ${order.total_tax}`,
          `Discount: ${order.currency} ${order.discount_total}`,
          `TOTAL: ${order.currency} ${order.total}`,
          ``,
          `Payment: ${order.payment_method_title}`,
          `Note: ${order.customer_note || "None"}`,
        ].join("\n");

        return { content: [{ type: "text", text }] };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ---- update_order_status ----
  server.registerTool(
    "update_order_status",
    {
      title: "Update Order Status",
      description:
        "Change the status of a WooCommerce order (e.g. mark as completed, cancel, put on hold). Optionally add a customer note.",
      inputSchema: z.object({
        order_id: z
          .number()
          .int()
          .positive()
          .describe("The order ID to update"),
        status: z
          .enum(["pending", "processing", "on-hold", "completed", "cancelled", "refunded", "failed"])
          .describe("New order status"),
        note: z
          .string()
          .optional()
          .describe("Optional customer-facing note to attach"),
      }),
    },
    async ({ order_id, status, note }) => {
      try {
        const updated = await getClient().updateOrderStatus(order_id, status, note);
        return {
          content: [
            {
              type: "text",
              text: `✅ Order #${updated.id} status updated to "${updated.status}"` +
                (note ? `\n📝 Note added: "${note}"` : ""),
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ---- get_order_notes ----
  server.registerTool(
    "get_order_notes",
    {
      title: "Get Order Notes",
      description:
        "Retrieve all notes for a WooCommerce order, including internal staff notes and customer-visible notes.",
      inputSchema: z.object({
        order_id: z
          .number()
          .int()
          .positive()
          .describe("The order ID"),
      }),
    },
    async ({ order_id }) => {
      try {
        const notes = await getClient().getOrderNotes(order_id);
        if (notes.length === 0) {
          return { content: [{ type: "text", text: `No notes for order #${order_id}.` }] };
        }
        const lines = notes.map((n) => {
          const type = n.customer_note ? "[Customer]" : "[Internal]";
          return `${type} ${n.date_created.split("T")[0]} — ${n.author}: ${n.note}`;
        });
        return {
          content: [{ type: "text", text: `Notes for Order #${order_id}:\n\n${lines.join("\n\n")}` }],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ---- add_order_note ----
  server.registerTool(
    "add_order_note",
    {
      title: "Add Order Note",
      description:
        "Add a note to a WooCommerce order. Can be internal (staff only) or visible to the customer.",
      inputSchema: z.object({
        order_id: z
          .number()
          .int()
          .positive()
          .describe("The order ID"),
        note: z
          .string()
          .min(1)
          .describe("The note content"),
        customer_note: z
          .boolean()
          .default(false)
          .describe("If true, the customer will see this note in their account"),
      }),
    },
    async ({ order_id, note, customer_note }) => {
      try {
        const created = await getClient().createOrderNote(order_id, note, customer_note);
        return {
          content: [
            {
              type: "text",
              text: `✅ Note added to Order #${order_id}\n` +
                `Type: ${customer_note ? "Customer-visible" : "Internal"}\n` +
                `Note: "${created.note}"`,
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );
}