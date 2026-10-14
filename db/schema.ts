import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/* ---------------------------------- Auth ---------------------------------- */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"), // user | admin
  businessName: text("business_name").notNull().default(""),
  logoUrl: text("logo_url").notNull().default(""),
  address: text("address").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    code: text("code").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumed: boolean("consumed").notNull().default(false),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("otp_phone_idx").on(t.phone)]
);

/* --------------------------------- Uploads -------------------------------- */

export const uploads = pgTable(
  "uploads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    data: text("data").notNull(), // base64 payload (PaaS-friendly: no volume needed)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("uploads_user_idx").on(t.userId)]
);

/* ------------------------------ Subscription ------------------------------ */

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  durationDays: integer("duration_days").notNull(),
  price: integer("price").notNull(), // Toman
  isTrial: boolean("is_trial").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    status: text("status").notNull().default("active"), // active | expired | canceled | replaced
    source: text("source").notNull().default("purchase"), // purchase | trial | admin
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("subs_user_idx").on(t.userId)]
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    amount: integer("amount").notNull(), // Toman (after discount)
    originalAmount: integer("original_amount").notNull().default(0),
    discountCode: text("discount_code").notNull().default(""),
    gateway: text("gateway").notNull(), // zarinpal | zibal | variza | manual_card
    // pending | paid | failed | canceled | review (manual receipt awaiting admin)
    status: text("status").notNull().default("pending"),
    authority: text("authority"),
    refId: text("ref_id"),
    receiptUrl: text("receipt_url").notNull().default(""), // uploaded card-to-card receipt
    payerName: text("payer_name").notNull().default(""),
    payerCard: text("payer_card").notNull().default(""),
    paidAt: text("paid_at").notNull().default(""), // user-declared transfer time
    reviewNote: text("review_note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_user_idx").on(t.userId), index("payments_authority_idx").on(t.authority)]
);

export const gatewaySettings = pgTable("gateway_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  gateway: text("gateway").notNull().unique(), // zarinpal | zibal | variza | manual_card
  merchantId: text("merchant_id").notNull().default(""), // merchant id / API key
  webhookSecret: text("webhook_secret").notNull().default(""), // variza HMAC secret
  cardNumber: text("card_number").notNull().default(""), // manual card-to-card
  cardHolder: text("card_holder").notNull().default(""),
  bankName: text("bank_name").notNull().default(""),
  isActive: boolean("is_active").notNull().default(false),
  isSandbox: boolean("is_sandbox").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const discountCodes = pgTable(
  "discount_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    percent: integer("percent").notNull().default(0), // 0..100
    amountOff: integer("amount_off").notNull().default(0), // Toman
    maxUses: integer("max_uses").notNull().default(0), // 0 = unlimited
    usedCount: integer("used_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("discount_code_idx").on(t.code)]
);

/* ------------------------------ SMS settings ------------------------------- */

export const smsSettings = pgTable("sms_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull().default("kavenegar"), // kavenegar | smsir | melipayamak | ghasedak
  apiKey: text("api_key").notNull().default(""),
  sender: text("sender").notNull().default(""),
  templateName: text("template_name").notNull().default(""),
  isActive: boolean("is_active").notNull().default(false),
  loginEnabled: boolean("login_enabled").notNull().default(false),
  testMode: boolean("test_mode").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------- Inventory ------------------------------- */

export const wooConnections = pgTable(
  "woo_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    siteUrl: text("site_url").notNull(),
    consumerKey: text("consumer_key").notNull(),
    consumerSecret: text("consumer_secret").notNull(),
    autoPush: boolean("auto_push").notNull().default(true),
    status: text("status").notNull().default("active"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastSyncMessage: text("last_sync_message").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("woo_user_idx").on(t.userId)]
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sku: text("sku").notNull().default(""),
    price: integer("price").notNull().default(0),
    buyPrice: integer("buy_price").notNull().default(0),
    stock: integer("stock").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    category: text("category").notNull().default(""),
    imageUrl: text("image_url").notNull().default(""),
    source: text("source").notNull().default("manual"),
    wooId: integer("woo_id"),
    wooConnectionId: uuid("woo_connection_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("products_user_idx").on(t.userId)]
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    quantity: integer("quantity").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("movements_product_idx").on(t.productId)]
);

/* -------------------------------- Customers -------------------------------- */

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    address: text("address").notNull().default(""),
    type: text("type").notNull().default("customer"), // customer | supplier
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("customers_user_idx").on(t.userId)]
);

/* --------------------------------- Invoices -------------------------------- */

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    type: text("type").notNull().default("sale"), // sale | purchase
    customerId: uuid("customer_id"),
    customerName: text("customer_name").notNull().default(""),
    customerPhone: text("customer_phone").notNull().default(""),
    customerAddress: text("customer_address").notNull().default(""),
    issueDate: timestamp("issue_date", { withTimezone: true }).notNull().defaultNow(),
    dueDate: timestamp("due_date", { withTimezone: true }),
    status: text("status").notNull().default("issued"), // issued | paid | canceled
    subtotal: integer("subtotal").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    tax: integer("tax").notNull().default(0),
    total: integer("total").notNull().default(0),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("invoices_user_idx").on(t.userId)]
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    productId: uuid("product_id"),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: integer("unit_price").notNull().default(0),
    total: integer("total").notNull().default(0),
  },
  (t) => [index("invoice_items_idx").on(t.invoiceId)]
);

/* ------------------------------- Accounting -------------------------------- */

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    category: text("category").notNull().default(""),
    amount: integer("amount").notNull(),
    description: text("description").notNull().default(""),
    invoiceId: uuid("invoice_id"),
    date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tx_user_idx").on(t.userId)]
);

/* -------------------------------- Reminders -------------------------------- */

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: text("type").notNull().default("other"), // check | debt | receivable | payment | meeting | other
    amount: integer("amount").notNull().default(0),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    isDone: boolean("is_done").notNull().default(false),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reminders_user_idx").on(t.userId)]
);

/* ---------------------------- Tasks and visions ----------------------------- */

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("todo"),
    priority: text("priority").notNull().default("medium"),
    progress: integer("progress").notNull().default(0),
    dueDate: timestamp("due_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tasks_user_idx").on(t.userId)]
);

export const visions = pgTable(
  "visions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    targetDate: timestamp("target_date", { withTimezone: true }),
    progress: integer("progress").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("visions_user_idx").on(t.userId)]
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("note"),
    title: text("title").notNull().default(""),
    content: text("content").notNull(),
    color: text("color").notNull().default("gold"),
    isPinned: boolean("is_pinned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notes_user_idx").on(t.userId)]
);

/* -------------------------------- Portfolio -------------------------------- */

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull().default("other"),
    quantity: integer("quantity").notNull().default(1),
    unitPurchasePrice: integer("unit_purchase_price").notNull().default(0),
    unitCurrentValue: integer("unit_current_value").notNull().default(0),
    purchaseDate: timestamp("purchase_date", { withTimezone: true }),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("assets_user_idx").on(t.userId)]
);

/* ----------------------------------- Blog ----------------------------------- */

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    content: text("content").notNull().default(""),
    coverUrl: text("cover_url").notNull().default(""),
    category: text("category").notNull().default(""),
    tags: text("tags").notNull().default(""), // comma separated
    status: text("status").notNull().default("draft"), // draft | published
    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
    readMinutes: integer("read_minutes").notNull().default(3),
    views: integer("views").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("posts_slug_idx").on(t.slug), index("posts_status_idx").on(t.status)]
);

/* -------------------------------- Receipts --------------------------------- */

export const receiptSettings = pgTable("receipt_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  paperWidth: text("paper_width").notNull().default("80"), // 80 | 58 (mm)
  headerText: text("header_text").notNull().default(""),
  footerText: text("footer_text").notNull().default("از خرید شما سپاسگزاریم 🌹"),
  showLogo: boolean("show_logo").notNull().default(true),
  taxPercent: integer("tax_percent").notNull().default(0),
  servicePercent: integer("service_percent").notNull().default(0),
  currencyLabel: text("currency_label").notNull().default("تومان"),
});

export const receipts = pgTable(
  "receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    orderType: text("order_type").notNull().default("dine_in"), // dine_in | takeaway | delivery | counter
    tableNumber: text("table_number").notNull().default(""),
    customerName: text("customer_name").notNull().default(""),
    customerPhone: text("customer_phone").notNull().default(""),
    items: text("items").notNull().default("[]"), // JSON snapshot
    subtotal: integer("subtotal").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    tax: integer("tax").notNull().default(0),
    service: integer("service").notNull().default(0),
    total: integer("total").notNull().default(0),
    paymentMethod: text("payment_method").notNull().default("cash"), // cash | card | online | credit
    paidAmount: integer("paid_amount").notNull().default(0),
    changeAmount: integer("change_amount").notNull().default(0),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("receipts_user_idx").on(t.userId)]
);

/* -------------------------------- Tracking --------------------------------- */

export const parcels = pgTable(
  "parcels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    code: text("code").notNull(), // barcode / tracking code
    customerName: text("customer_name").notNull().default(""),
    customerPhone: text("customer_phone").notNull().default(""),
    carrier: text("carrier").notNull().default("post"), // post | tipax | mahex | chapar | snapbox | other
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("parcels_user_idx").on(t.userId)]
);

/* ------------------------------- Bio / Links ------------------------------- */

export const bioPages = pgTable(
  "bio_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull().default(""),
    bio: text("bio").notNull().default(""),
    theme: text("theme").notNull().default("dark"), // dark | light | brand | gold
    showLogo: boolean("show_logo").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bio_slug_idx").on(t.slug)]
);

export const bioLinks = pgTable(
  "bio_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bioId: uuid("bio_id")
      .notNull()
      .references(() => bioPages.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    url: text("url").notNull(),
    icon: text("icon").notNull().default("link"), // link | instagram | telegram | whatsapp | phone | email | website | shop
    sortOrder: integer("sort_order").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
  },
  (t) => [index("bio_links_bio_idx").on(t.bioId)]
);

/* --------------------------------- Tickets --------------------------------- */

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    department: text("department").notNull().default("support"), // support | billing | technical
    priority: text("priority").notNull().default("medium"),
    status: text("status").notNull().default("open"), // open | answered | user_reply | closed
    lastReplyAt: timestamp("last_reply_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tickets_user_idx").on(t.userId)]
);

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isAdmin: boolean("is_admin").notNull().default(false),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ticket_messages_idx").on(t.ticketId)]
);
