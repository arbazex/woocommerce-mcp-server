// ============================================================
// Product Management Tools
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient, WooCommerceError } from "../woo-client.js";

function formatError(e: unknown): string {
  if (e instanceof WooCommerceError) return `WooCommerce error (${e.code}): ${e.message}`;
  if (e instanceof Error) return e.message;
  return "Unknown error";
}

export function registerProductTools(server: McpServer): void {

  // ---- list_products ----
  server.registerTool(
    "list_products",
    {
      title: "List Products",
      description:
        "List WooCommerce products with optional filters. Use to browse catalog, check prices, filter by category or status, or find on-sale items.",
      inputSchema: z.object({
        search: z.string().optional().describe("Search products by name or SKU"),
        status: z
          .enum(["draft", "pending", "private", "publish"])
          .optional()
          .describe("Filter by product status"),
        stock_status: z
          .enum(["instock", "outofstock", "onbackorder"])
          .optional()
          .describe("Filter by stock status"),
        category: z
          .string()
          .optional()
          .describe("Filter by category ID or slug"),
        on_sale: z.boolean().optional().describe("Show only on-sale products"),
        featured: z.boolean().optional().describe("Show only featured products"),
        min_price: z.string().optional().describe("Minimum price filter (e.g. '10.00')"),
        max_price: z.string().optional().describe("Maximum price filter"),
        per_page: z.number().int().min(1).max(100).default(20).describe("Results per page"),
        page: z.number().int().min(1).default(1).describe("Page number"),
        orderby: z
          .enum(["date", "id", "title", "price", "popularity", "rating"])
          .default("date")
          .describe("Sort products by this field"),
        order: z.enum(["asc", "desc"]).default("desc").describe("Sort direction"),
      }),
    },
    async (input) => {
      try {
        const products = await getClient().listProducts({
          search: input.search,
          status: input.status,
          stock_status: input.stock_status,
          category: input.category,
          on_sale: input.on_sale,
          featured: input.featured,
          min_price: input.min_price,
          max_price: input.max_price,
          per_page: input.per_page,
          page: input.page,
          orderby: input.orderby,
          order: input.order,
        });

        if (products.length === 0) {
          return { content: [{ type: "text", text: "No products found." }] };
        }

        const lines = products.map((p) => {
          const stock =
            p.manage_stock
              ? `Stock: ${p.stock_quantity ?? "N/A"}`
              : `Stock Status: ${p.stock_status}`;
          const price = p.on_sale
            ? `${p.sale_price} (was ${p.regular_price})`
            : p.regular_price;
          return `#${p.id} | ${p.name} | SKU: ${p.sku || "N/A"} | Price: ${price} | ${stock} | Status: ${p.status}`;
        });

        return {
          content: [
            { type: "text", text: `Found ${products.length} product(s):\n\n${lines.join("\n")}` },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ---- get_product ----
  server.registerTool(
    "get_product",
    {
      title: "Get Product Details",
      description:
        "Retrieve full details for a single WooCommerce product by its ID — price, stock, description, categories, images, SKU, and more.",
      inputSchema: z.object({
        product_id: z.number().int().positive().describe("The product ID"),
      }),
    },
    async ({ product_id }) => {
      try {
        const p = await getClient().getProduct(product_id);
        const cats = p.categories.map((c) => c.name).join(", ") || "None";
        const stockInfo = p.manage_stock
          ? `Managed Stock: ${p.stock_quantity ?? 0} units (${p.stock_status})`
          : `Stock Status: ${p.stock_status}`;

        const text = [
          `=== Product #${p.id}: ${p.name} ===`,
          `SKU: ${p.sku || "N/A"}`,
          `Status: ${p.status}`,
          `Type: ${p.type}`,
          ``,
          `Price: ${p.regular_price}${p.on_sale ? ` → Sale: ${p.sale_price}` : ""}`,
          ``,
          stockInfo,
          `Backorders: ${p.backorders}`,
          ``,
          `Categories: ${cats}`,
          `Featured: ${p.featured ? "Yes" : "No"}`,
          `Total Sales: ${p.total_sales}`,
          ``,
          `Short Description: ${p.short_description || "None"}`,
          `Permalink: ${p.permalink}`,
        ].join("\n");

        return { content: [{ type: "text", text }] };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ---- update_product ----
  server.registerTool(
    "update_product",
    {
      title: "Update Product",
      description:
        "Update a WooCommerce product's price, stock quantity, status, name, or description. Only provided fields are changed.",
      inputSchema: z.object({
        product_id: z.number().int().positive().describe("The product ID to update"),
        name: z.string().optional().describe("New product name"),
        regular_price: z.string().optional().describe("Regular price (e.g. '29.99')"),
        sale_price: z.string().optional().describe("Sale price — set to empty string to remove sale"),
        stock_quantity: z.number().int().optional().describe("Stock quantity (integer)"),
        manage_stock: z.boolean().optional().describe("Enable or disable stock management"),
        stock_status: z
          .enum(["instock", "outofstock", "onbackorder"])
          .optional()
          .describe("Manual stock status (used when manage_stock is false)"),
        status: z
          .enum(["draft", "pending", "private", "publish"])
          .optional()
          .describe("Product visibility status"),
        featured: z.boolean().optional().describe("Mark as featured product"),
        description: z.string().optional().describe("Long description (HTML allowed)"),
        short_description: z.string().optional().describe("Short description"),
      }),
    },
    async (input) => {
      try {
        const { product_id, ...data } = input;
        // Remove undefined fields
        const payload = Object.fromEntries(
          Object.entries(data).filter(([, v]) => v !== undefined)
        );

        if (Object.keys(payload).length === 0) {
          return {
            content: [{ type: "text", text: "No fields to update were provided." }],
          };
        }

        const updated = await getClient().updateProduct(product_id, payload as Record<string, unknown> as Parameters<ReturnType<typeof getClient>["updateProduct"]>[1]);
        return {
          content: [
            {
              type: "text",
              text:
                `✅ Product #${updated.id} "${updated.name}" updated successfully.\n` +
                `Price: ${updated.regular_price}${updated.on_sale ? ` (Sale: ${updated.sale_price})` : ""}\n` +
                `Stock: ${updated.manage_stock ? updated.stock_quantity : updated.stock_status}\n` +
                `Status: ${updated.status}`,
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ---- get_low_stock_products ----
  server.registerTool(
    "get_low_stock_products",
    {
      title: "Get Low Stock Products",
      description:
        "Find WooCommerce products with stock levels at or below a specified threshold. Essential for inventory management and reorder planning.",
      inputSchema: z.object({
        threshold: z
          .number()
          .int()
          .min(0)
          .default(5)
          .describe("Stock quantity threshold — products at or below this are returned"),
      }),
    },
    async ({ threshold }) => {
      try {
        const products = await getClient().getLowStockProducts(threshold);

        if (products.length === 0) {
          return {
            content: [
              { type: "text", text: `✅ No products are at or below ${threshold} units in stock.` },
            ],
          };
        }

        const lines = products
          .sort((a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0))
          .map(
            (p) =>
              `⚠️  #${p.id} | ${p.name} | SKU: ${p.sku || "N/A"} | Stock: ${p.stock_quantity} | Price: ${p.regular_price}`
          );

        return {
          content: [
            {
              type: "text",
              text: `Found ${products.length} product(s) with stock ≤ ${threshold}:\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ---- list_product_categories ----
  server.registerTool(
    "list_product_categories",
    {
      title: "List Product Categories",
      description:
        "Retrieve all WooCommerce product categories with their IDs, names, slugs, and product counts.",
      inputSchema: z.object({
        hide_empty: z
          .boolean()
          .default(false)
          .describe("If true, only categories with products are returned"),
        per_page: z.number().int().min(1).max(100).default(50).describe("Results per page"),
        orderby: z
          .enum(["id", "name", "slug", "count"])
          .default("name")
          .describe("Sort categories by"),
      }),
    },
    async (input) => {
      try {
        const cats = await getClient().getProductCategories({
          hide_empty: input.hide_empty,
          per_page: input.per_page,
          orderby: input.orderby,
          order: "asc",
        });

        if (cats.length === 0) {
          return { content: [{ type: "text", text: "No categories found." }] };
        }

        const lines = cats.map(
          (c) => `ID:${c.id} | ${c.name} | Slug: ${c.slug} | Products: ${c.count}`
        );
        return {
          content: [
            {
              type: "text",
              text: `${cats.length} product categories:\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );
  // ---- search_products_by_sku ----
  server.registerTool(
    "search_products_by_sku",
    {
      title: "Search Products by SKU",
      description:
        "Find a WooCommerce product by its exact SKU. Returns full product details including price, stock, and status.",
      inputSchema: z.object({
        sku: z.string().min(1).describe("The exact SKU to search for"),
      }),
    },
    async ({ sku }) => {
      try {
        const products = await getClient().listProducts({ search: sku, per_page: 10 });
        const match = products.filter((p) => p.sku === sku);

        if (match.length === 0) {
          return { content: [{ type: "text", text: `No product found with SKU: ${sku}` }] };
        }

        const lines = match.map(
          (p) =>
            `#${p.id} | ${p.name} | SKU: ${p.sku} | Price: ${p.regular_price} | ` +
            `Stock: ${p.manage_stock ? p.stock_quantity : p.stock_status} | Status: ${p.status}`
        );

        return {
          content: [{ type: "text", text: `Found ${match.length} product(s) with SKU "${sku}":\n\n${lines.join("\n")}` }],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ---- get_out_of_stock_products ----
  server.registerTool(
    "get_out_of_stock_products",
    {
      title: "Get Out of Stock Products",
      description:
        "Retrieve all WooCommerce products that are currently out of stock. Includes both managed-stock and manually marked out-of-stock products.",
      inputSchema: z.object({
        per_page: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(50)
          .describe("Number of results to return"),
      }),
    },
    async ({ per_page }) => {
      try {
        const products = await getClient().listProducts({
          stock_status: "outofstock",
          per_page,
          status: "publish",
        });

        if (products.length === 0) {
          return { content: [{ type: "text", text: "✅ No out-of-stock products found." }] };
        }

        const lines = products.map(
          (p) =>
            `⛔ #${p.id} | ${p.name} | SKU: ${p.sku || "N/A"} | Price: ${p.regular_price} | Sales: ${p.total_sales}`
        );

        return {
          content: [
            {
              type: "text",
              text: `Found ${products.length} out-of-stock product(s):\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );
}