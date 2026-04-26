# woocommerce-mcp-server

> **Production-grade Model Context Protocol (MCP) server for WooCommerce** — manage orders, products, customers, inventory, and analytics using Claude AI or any MCP-compatible client.

[![npm version](https://img.shields.io/npm/v/woocommerce-mcp-server)](https://www.npmjs.com/package/woocommerce-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)

---

## 🎥 What You Can Do

Once connected, just talk to Claude naturally:

> *"Show me all processing orders from this week"*
> *"Which products are running low on stock?"*
> *"Find the product with SKU WOO-1234"*
> *"What's my revenue this month?"*
> *"Who are my newest customers?"*
> *"Mark order #501 as completed"*

No more clicking through WooCommerce dashboards. Your AI handles it.

---

## ✨ Features

- ✅ **20 production-ready tools** across Orders, Products, Customers, and Analytics
- ✅ **TypeScript** — fully typed, no runtime surprises
- ✅ **Retry logic** — automatic retries on network errors and rate limits
- ✅ **Meaningful error messages** — no raw API errors thrown at users
- ✅ **Input validation** via Zod — bad inputs rejected before they hit the API
- ✅ **Works with Claude Desktop**, MCP Inspector, and any MCP-compatible client
- ✅ **npm installable** — no cloning required

---

## 🛠️ Tools Reference

### 📦 Orders (5 tools)

| Tool | Description |
|------|-------------|
| `list_orders` | List orders with filters (status, date, customer) |
| `get_order` | Full details for a single order |
| `update_order_status` | Change order status + optional note |
| `get_order_notes` | All notes on an order |
| `add_order_note` | Add internal or customer-visible note |

### 🏷️ Products (7 tools)

| Tool | Description |
|------|-------------|
| `list_products` | Browse catalog with filters |
| `get_product` | Full details for a single product |
| `update_product` | Update price, stock, status, description |
| `get_low_stock_products` | Products at or below stock threshold |
| `get_out_of_stock_products` | All out-of-stock products |
| `search_products_by_sku` | Find product by exact SKU |
| `list_product_categories` | All categories with counts |

### 👥 Customers (4 tools)

| Tool | Description |
|------|-------------|
| `list_customers` | Browse customers with search |
| `get_customer` | Full customer profile |
| `get_customer_orders` | All orders for a customer |
| `get_recent_customers` | New customers in last N days |

### 📊 Analytics (4 tools)

| Tool | Description |
|------|-------------|
| `get_revenue_summary` | Sales, orders, avg order value by period |
| `get_sales_report` | Detailed report with tax, shipping, refunds |
| `get_top_selling_products` | Best sellers by quantity |
| `get_order_status_counts` | Order count breakdown by status |

---

## 🚀 Quick Setup

### Prerequisites

- Node.js 18+
- A WooCommerce store with REST API access
- Claude Desktop (for AI integration)

### Step 1 — Generate WooCommerce API Keys

1. Go to your WordPress dashboard
2. Navigate to **WooCommerce → Settings → Advanced → REST API**
3. Click **Add Key**
4. Set Description: `MCP Server`
5. Set Permissions: **Read/Write**
6. Click **Generate API Key**
7. Copy your **Consumer Key** and **Consumer Secret**

### Step 2 — Install via npx (Recommended)

No installation needed. Configure Claude Desktop directly:

Open your Claude Desktop config file:

- **Windows:** `C:\Users\<YourName>\AppData\Roaming\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "woocommerce": {
      "command": "npx",
      "args": ["-y", "woocommerce-mcp-server"],
      "env": {
        "WOOCOMMERCE_URL": "https://yourstore.com",
        "WOOCOMMERCE_CONSUMER_KEY": "ck_your_consumer_key_here",
        "WOOCOMMERCE_CONSUMER_SECRET": "cs_your_consumer_secret_here"
      }
    }
  }
}
```

Restart Claude Desktop. You should see a 🔌 plug icon — your WooCommerce store is now connected.

---

### Alternative — Clone and Run Locally

```bash
git clone https://github.com/arbazex/woocommerce-mcp-server.git
cd woocommerce-mcp-server
npm install
```

Create a `.env` file:

```env
WOOCOMMERCE_URL=https://yourstore.com
WOOCOMMERCE_CONSUMER_KEY=ck_your_key_here
WOOCOMMERCE_CONSUMER_SECRET=cs_your_secret_here
```

Build and run:

```bash
npm run build
node build/index.js
```

Then update your Claude Desktop config to point to your local build:

```json
{
  "mcpServers": {
    "woocommerce": {
      "command": "node",
      "args": ["C:\\path\\to\\woocommerce-mcp-server\\build\\index.js"],
      "env": {
        "WOOCOMMERCE_URL": "https://yourstore.com",
        "WOOCOMMERCE_CONSUMER_KEY": "ck_your_key_here",
        "WOOCOMMERCE_CONSUMER_SECRET": "cs_your_secret_here"
      }
    }
  }
}
```

---

## 🧪 Testing with MCP Inspector

Test your tools in the browser without Claude Desktop:

```bash
npx @modelcontextprotocol/inspector build/index.js
```

Set environment variables first:

```powershell
# Windows PowerShell
$env:WOOCOMMERCE_URL="https://yourstore.com"
$env:WOOCOMMERCE_CONSUMER_KEY="ck_your_key"
$env:WOOCOMMERCE_CONSUMER_SECRET="cs_your_secret"
```

```bash
# macOS/Linux
export WOOCOMMERCE_URL="https://yourstore.com"
export WOOCOMMERCE_CONSUMER_KEY="ck_your_key"
export WOOCOMMERCE_CONSUMER_SECRET="cs_your_secret"
```

---

## 🔑 API Key Permissions

| Feature | Required Permission |
|---------|-------------------|
| Read orders, products, customers, analytics | **Read** |
| Update order status, add notes, update products | **Read/Write** |

> ⚠️ Without Write permissions, update tools will return an authentication error. Generate a Read/Write key for full functionality.

---

## 📁 Project Structure

```
woocommerce-mcp-server/
├── src/
│   ├── index.ts          # Entry point (stdio transport)
│   ├── server.ts         # MCP server setup
│   ├── woo-client.ts     # WooCommerce API client (retry + error handling)
│   ├── types/
│   │   └── woo-types.ts  # Full TypeScript type definitions
│   └── tools/
│       ├── orders.ts     # Order management tools
│       ├── products.ts   # Product management tools
│       ├── customers.ts  # Customer management tools
│       └── analytics.ts  # Reporting and analytics tools
├── build/                # Compiled output (generated)
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 🔒 Security

- API credentials are passed via **environment variables** — never hardcoded
- All inputs are **validated with Zod** before hitting the API
- Rate limit errors are handled gracefully with **automatic retry + backoff**
- No credentials are logged to stdout (only stderr for debug messages)

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Watch mode (auto-rebuild on save)
npm run dev

# Build once
npm run build

# Open MCP Inspector
npm run inspect
```

---

## 🤝 Contributing

Contributions are welcome! If you have ideas for new tools or find a bug:

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-tool-name`
3. Make your changes
4. Open a Pull Request

---

## 📋 Roadmap

- [ ] Create order tool
- [ ] Coupon management tools
- [ ] Webhook management
- [ ] Product variation support
- [ ] Remote HTTP (Streamable HTTP) transport for hosted deployment
- [ ] Batch operations support

---

## 📄 License

MIT © [Arbaz](https://github.com/arbazex)

---

*Built with ❤️ by Arbaz*