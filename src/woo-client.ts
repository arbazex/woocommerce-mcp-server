// ============================================================
// WooCommerce REST API Client
// Production-grade: retry logic, error handling, rate limiting
// ============================================================

import axios, { AxiosInstance, AxiosError } from "axios";
import axiosRetry from "axios-retry";
import type {
  WooOrder,
  WooOrderNote,
  WooProduct,
  WooCategory,
  WooCustomer,
  WooSalesReport,
  WooTopSellerReport,
  WooApiError,
  OrderStatus,
  ProductStatus,
  StockStatus,
} from "./types/woo-types.js";

// ---- Configuration ----

export interface WooConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  timeout?: number;
}

// ---- Error class ----

export class WooCommerceError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = "WooCommerceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

// ---- Client ----

export class WooCommerceClient {
  private readonly http: AxiosInstance;

  constructor(config: WooConfig) {
    const baseURL = `${config.url.replace(/\/$/, "")}/wp-json/wc/v3`;

    this.http = axios.create({
      baseURL,
      timeout: config.timeout ?? 30_000,
      auth: {
        username: config.consumerKey,
        password: config.consumerSecret,
      },
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "woocommerce-mcp-server/1.0.0",
      },
    });

    // Retry on network errors and 429 / 5xx responses
    axiosRetry(this.http, {
      retries: 3,
      retryDelay: (retryCount, error) => {
        // Respect Retry-After header if present
        const retryAfter = (error.response?.headers?.["retry-after"] as string) ?? null;
        if (retryAfter) {
          return parseInt(retryAfter, 10) * 1000;
        }
        return axiosRetry.exponentialDelay(retryCount);
      },
      retryCondition: (error: AxiosError) => {
        return (
          axiosRetry.isNetworkError(error) ||
          axiosRetry.isRetryableError(error) ||
          error.response?.status === 429 ||
          (error.response?.status !== undefined && error.response.status >= 500)
        );
      },
    });
  }

  // ---- Error handler ----

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosErr = error as AxiosError<WooApiError>;
      const status = axiosErr.response?.status ?? 0;
      const data = axiosErr.response?.data;

      if (data && typeof data === "object" && "message" in data) {
        throw new WooCommerceError(
          data.message as string,
          (data as WooApiError).code ?? "UNKNOWN",
          status
        );
      }

      if (status === 401) {
        throw new WooCommerceError(
          "Authentication failed — check your Consumer Key and Consumer Secret",
          "woocommerce_rest_cannot_view",
          401
        );
      }

      if (status === 404) {
        throw new WooCommerceError(
          "Resource not found — check the ID or endpoint",
          "woocommerce_rest_not_found",
          404
        );
      }

      if (status === 429) {
        throw new WooCommerceError(
          "Rate limit exceeded — too many requests, please slow down",
          "rate_limit_exceeded",
          429
        );
      }

      throw new WooCommerceError(
        axiosErr.message ?? "Unknown API error",
        "api_error",
        status
      );
    }

    throw new WooCommerceError(
      error instanceof Error ? error.message : "Unexpected error",
      "unknown_error",
      0
    );
  }

  // ================================================================
  // ORDERS
  // ================================================================

  async listOrders(params?: {
    status?: OrderStatus;
    after?: string;
    before?: string;
    customer?: number;
    product?: number;
    per_page?: number;
    page?: number;
    search?: string;
    orderby?: "date" | "id" | "total";
    order?: "asc" | "desc";
  }): Promise<WooOrder[]> {
    try {
      const res = await this.http.get<WooOrder[]>("/orders", { params });
      return res.data;
    } catch (e) {
      return this.handleError(e);
    }
  }

  async getOrder(id: number): Promise<WooOrder> {
    try {
      const res = await this.http.get<WooOrder>(`/orders/${id}`);
      return res.data;
    } catch (e) {
      return this.handleError(e);
    }
  }

  async updateOrderStatus(
    id: number,
    status: OrderStatus,
    note?: string
  ): Promise<WooOrder> {
    try {
      const payload: { status: OrderStatus; customer_note?: string } = { status };
      if (note) payload.customer_note = note;
      const res = await this.http.put<WooOrder>(`/orders/${id}`, payload);
      return res.data;
    } catch (e) {
      return this.handleError(e);
    }
  }

  async getOrderNotes(orderId: number): Promise<WooOrderNote[]> {
    try {
      const res = await this.http.get<WooOrderNote[]>(`/orders/${orderId}/notes`);
      return res.data;
    } catch (e) {
      return this.handleError(e);
    }
  }

  async createOrderNote(
    orderId: number,
    note: string,
    customerNote: boolean = false
  ): Promise<WooOrderNote> {
    try {
      const res = await this.http.post<WooOrderNote>(`/orders/${orderId}/notes`, {
        note,
        customer_note: customerNote,
      });
      return res.data;
    } catch (e) {
      return this.handleError(e);
    }
  }

  // ================================================================
  // PRODUCTS
  // ================================================================

  async listProducts(params?: {
    status?: ProductStatus;
    stock_status?: StockStatus;
    category?: string;
    search?: string;
    per_page?: number;
    page?: number;
    featured?: boolean;
    on_sale?: boolean;
    orderby?: "date" | "id" | "title" | "price" | "popularity" | "rating";
    order?: "asc" | "desc";
    min_price?: string;
    max_price?: string;
  }): Promise<WooProduct[]> {
    try {
      const res = await this.http.get<WooProduct[]>("/products", { params });
      return res.data;
    } catch (e) {
      return this.handleError(e);
    }
  }

  async getProduct(id: number): Promise<WooProduct> {
    try {
      const res = await this.http.get<WooProduct>(`/products/${id}`);
      return res.data;
    } catch (e) {
      return this.handleError(e);
    }
  }

  async updateProduct(
    id: number,
    data: Partial<{
      name: string;
      status: ProductStatus;
      regular_price: string;
      sale_price: string;
      stock_quantity: number;
      manage_stock: boolean;
      stock_status: StockStatus;
      description: string;
      short_description: string;
      featured: boolean;
    }>
  ): Promise<WooProduct> {
    try {
      const res = await this.http.put<WooProduct>(`/products/${id}`, data);
      return res.data;
    } catch (e) {
      return this.handleError(e);
    }
  }

  async getLowStockProducts(threshold: number = 5): Promise<WooProduct[]> {
    try {
      // Fetch all products with stock management enabled
      const res = await this.http.get<WooProduct[]>("/products", {
        params: {
          per_page: 100,
          manage_stock: true,
          stock_status: "instock",
        },
      });
      return res.data.filter(
        (p) => p.stock_quantity !== null && p.stock_quantity <= threshold
      );
    } catch (e) {
      return this.handleError(e);
    }
  }

  async getProductCategories(params?: {
    per_page?: number;
    page?: number;
    hide_empty?: boolean;
    orderby?: "id" | "name" | "slug" | "count";
    order?: "asc" | "desc";
  }): Promise<WooCategory[]> {
    try {
      const res = await this.http.get<WooCategory[]>("/products/categories", {
        params,
      });
      return res.data;
    } catch (e) {
      return this.handleError(e);
    }
  }

  // ================================================================
  // CUSTOMERS
  // ================================================================

  async listCustomers(params?: {
    per_page?: number;
    page?: number;
    search?: string;
    email?: string;
    orderby?: "id" | "include" | "name" | "registered_date";
    order?: "asc" | "desc";
    role?: string;
  }): Promise<WooCustomer[]> {
    try {
      const res = await this.http.get<WooCustomer[]>("/customers", { params });
      return res.data;
    } catch (e) {
      return this.handleError(e);
    }
  }

  async getCustomer(id: number): Promise<WooCustomer> {
    try {
      const res = await this.http.get<WooCustomer>(`/customers/${id}`);
      return res.data;
    } catch (e) {
      return this.handleError(e);
    }
  }

  async getCustomerOrders(
    customerId: number,
    params?: { per_page?: number; status?: OrderStatus }
  ): Promise<WooOrder[]> {
    try {
      const res = await this.http.get<WooOrder[]>("/orders", {
        params: { customer: customerId, ...params },
      });
      return res.data;
    } catch (e) {
      return this.handleError(e);
    }
  }

  // ================================================================
  // ANALYTICS / REPORTS
  // ================================================================

  async getSalesReport(params?: {
    period?: "week" | "month" | "last_month" | "year";
    date_min?: string;
    date_max?: string;
  }): Promise<WooSalesReport[]> {
    try {
      const res = await this.http.get<WooSalesReport[]>("/reports/sales", {
        params,
      });
      return res.data;
    } catch (e) {
      return this.handleError(e);
    }
  }

  async getTopSellingProducts(params?: {
    period?: "week" | "month" | "last_month" | "year";
    date_min?: string;
    date_max?: string;
  }): Promise<WooTopSellerReport[]> {
    try {
      const res = await this.http.get<WooTopSellerReport[]>(
        "/reports/top_sellers",
        { params }
      );
      return res.data;
    } catch (e) {
      return this.handleError(e);
    }
  }

  async getOrderStatusCounts(): Promise<Record<string, number>> {
    try {
      const statuses: OrderStatus[] = [
        "pending",
        "processing",
        "on-hold",
        "completed",
        "cancelled",
        "refunded",
        "failed",
      ];

      const counts: Record<string, number> = {};

      await Promise.all(
        statuses.map(async (status) => {
          const res = await this.http.get<WooOrder[]>("/orders", {
            params: { status, per_page: 1 },
          });
          // WooCommerce returns total in X-WP-Total header
          const total = parseInt(
            res.headers?.["x-wp-total"] as string ?? "0",
            10
          );
          counts[status] = total;
        })
      );

      return counts;
    } catch (e) {
      return this.handleError(e);
    }
  }

  async getRevenueSummary(period: "week" | "month" | "last_month" | "year" = "month"): Promise<{
    total_sales: string;
    total_orders: number;
    total_items: number;
    net_sales: string;
    average_order_value: string;
    period: string;
  }> {
    try {
      const [report] = await this.getSalesReport({ period });
      if (!report) {
        return {
          total_sales: "0",
          total_orders: 0,
          total_items: 0,
          net_sales: "0",
          average_order_value: "0",
          period,
        };
      }

      const avg =
        report.total_orders > 0
          ? (parseFloat(report.total_sales) / report.total_orders).toFixed(2)
          : "0";

      return {
        total_sales: report.total_sales,
        total_orders: report.total_orders,
        total_items: report.total_items,
        net_sales: report.net_sales,
        average_order_value: avg,
        period,
      };
    } catch (e) {
      return this.handleError(e);
    }
  }
}

// ---- Singleton factory ----

let _client: WooCommerceClient | null = null;

export function getClient(): WooCommerceClient {
  if (!_client) {
    const url = process.env.WOOCOMMERCE_URL;
    const key = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const secret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!url || !key || !secret) {
      throw new Error(
        "Missing WooCommerce credentials. Set WOOCOMMERCE_URL, " +
          "WOOCOMMERCE_CONSUMER_KEY, and WOOCOMMERCE_CONSUMER_SECRET " +
          "environment variables."
      );
    }

    _client = new WooCommerceClient({ url, consumerKey: key, consumerSecret: secret });
  }
  return _client;
}