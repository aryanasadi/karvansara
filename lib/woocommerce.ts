import "server-only";

export type WooCredentials = {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
};

export type WooProduct = {
  id: number;
  name: string;
  sku: string;
  price: string;
  regular_price: string;
  stock_quantity: number | null;
  manage_stock: boolean;
  stock_status: string;
  images: { src: string }[];
  categories: { name: string }[];
};

export function normalizeSiteUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/+$/, "");
}

async function wooApi<T>(
  creds: WooCredentials,
  path: string,
  opts: { method?: string; body?: unknown; params?: Record<string, string> } = {}
): Promise<T> {
  const base = normalizeSiteUrl(creds.siteUrl);
  const url = new URL(`/wp-json/wc/v3${path}`, base);
  url.searchParams.set("consumer_key", creds.consumerKey);
  url.searchParams.set("consumer_secret", creds.consumerSecret);
  for (const [k, v] of Object.entries(opts.params ?? {})) url.searchParams.set(k, v);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url.toString(), {
      method: opts.method ?? "GET",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        throw new Error("کلیدهای API معتبر نیستند یا دسترسی کافی ندارند.");
      }
      if (res.status === 404) {
        throw new Error("ووکامرس روی این سایت یافت نشد. نشانی سایت را بررسی کنید.");
      }
      throw new Error(`خطای ووکامرس (${res.status}): ${text.slice(0, 160)}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("پاسخی از سایت وردپرسی دریافت نشد (مهلت اتصال تمام شد).");
    }
    if (err instanceof TypeError) {
      throw new Error("امکان اتصال به سایت وجود ندارد. نشانی و در دسترس بودن سایت را بررسی کنید.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Pull all products (up to 300) from the WooCommerce store. */
export async function listWooProducts(creds: WooCredentials): Promise<WooProduct[]> {
  const all: WooProduct[] = [];
  for (let page = 1; page <= 3; page++) {
    const batch = await wooApi<WooProduct[]>(creds, "/products", {
      params: { per_page: "100", page: String(page), status: "publish" },
    });
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

/** Push a new stock quantity back to a WooCommerce product. */
export async function updateWooStock(
  creds: WooCredentials,
  wooProductId: number,
  stock: number
): Promise<void> {
  await wooApi(creds, `/products/${wooProductId}`, {
    method: "PUT",
    body: { manage_stock: true, stock_quantity: Math.max(0, stock) },
  });
}

/** Lightweight connectivity check. */
export async function testWooConnection(creds: WooCredentials): Promise<number> {
  const batch = await wooApi<WooProduct[]>(creds, "/products", {
    params: { per_page: "5", page: "1" },
  });
  return batch.length;
}
