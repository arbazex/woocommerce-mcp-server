// ============================================================
// WooCommerce REST API v3 — TypeScript Types
// ============================================================

// ---------- SHARED ----------

export interface WooMeta {
  id: number;
  key: string;
  value: string;
}

export interface WooLink {
  href: string;
}

// ---------- ORDERS ----------

export type OrderStatus =
  | "pending"
  | "processing"
  | "on-hold"
  | "completed"
  | "cancelled"
  | "refunded"
  | "failed"
  | "trash";

export interface WooOrderLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  tax_class: string;
  subtotal: string;
  subtotal_tax: string;
  total: string;
  total_tax: string;
  sku: string;
  price: number;
}

export interface WooBillingAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email: string;
  phone: string;
}

export interface WooShippingAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface WooOrder {
  id: number;
  parent_id: number;
  status: OrderStatus;
  currency: string;
  version: string;
  prices_include_tax: boolean;
  date_created: string;
  date_modified: string;
  date_completed: string | null;
  date_paid: string | null;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  customer_id: number;
  order_key: string;
  billing: WooBillingAddress;
  shipping: WooShippingAddress;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  customer_ip_address: string;
  customer_user_agent: string;
  customer_note: string;
  line_items: WooOrderLineItem[];
  meta_data: WooMeta[];
  number: string;
}

export interface WooOrderNote {
  id: number;
  author: string;
  date_created: string;
  note: string;
  customer_note: boolean;
  added_by_user: boolean;
}

// ---------- PRODUCTS ----------

export type ProductStatus = "draft" | "pending" | "private" | "publish";
export type StockStatus = "instock" | "outofstock" | "onbackorder";
export type ProductType = "simple" | "grouped" | "external" | "variable";

export interface WooProductCategory {
  id: number;
  name: string;
  slug: string;
}

export interface WooProductImage {
  id: number;
  date_created: string;
  src: string;
  name: string;
  alt: string;
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_modified: string;
  type: ProductType;
  status: ProductStatus;
  featured: boolean;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: StockStatus;
  backorders: "no" | "notify" | "yes";
  backorders_allowed: boolean;
  backordered: boolean;
  weight: string;
  categories: WooProductCategory[];
  images: WooProductImage[];
  meta_data: WooMeta[];
  low_stock_amount: number | null;
}

export interface WooCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  count: number;
}

// ---------- CUSTOMERS ----------

export interface WooCustomer {
  id: number;
  date_created: string;
  date_modified: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  username: string;
  billing: WooBillingAddress;
  shipping: WooShippingAddress;
  is_paying_customer: boolean;
  avatar_url: string;
  orders_count: number;
  total_spent: string;
  meta_data: WooMeta[];
}

// ---------- ANALYTICS / REPORTS ----------

export interface WooSalesReport {
  total_sales: string;
  net_sales: string;
  average_sales: string;
  total_orders: number;
  total_items: number;
  total_tax: string;
  total_shipping: string;
  total_refunds: number;
  total_discount: string;
  totals_grouped_by: string;
  totals: Record<string, {
    sales: string;
    orders: number;
    items: number;
    tax: string;
    shipping: string;
    discount: string;
    customers: number;
  }>;
  total_customers: number;
}

export interface WooTopSellerReport {
  title: string;
  product_id: number;
  quantity: number;
}

// ---------- API ERROR ----------

export interface WooApiError {
  code: string;
  message: string;
  data: {
    status: number;
  };
}