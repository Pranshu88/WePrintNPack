import type { Client } from "@libsql/client";
import type { ColorVariant, Product } from "@/lib/types";
import { getDb } from "@/lib/db";
import {
  categories,
  getCatalogGroupForCategory,
  initialProducts,
  LISTING_ALLOWED_CATEGORIES,
  LISTING_EXCLUDED_SLUGS,
  slugifyLabel,
} from "@/lib/data";

function rowToProduct(row: Record<string, unknown>): Product {
  return {
    slug: row.slug as string,
    name: row.name as string,
    category: row.category as string,
    categoryName: row.category_name as string,
    image: row.image as string,
    description: row.description as string,
    startingPrice: row.starting_price as string,
    colors: row.colors_json ? JSON.parse(row.colors_json as string) : undefined,
    colorVariants: row.color_variants_json ? JSON.parse(row.color_variants_json as string) : undefined,
    subProducts: row.sub_products_json ? JSON.parse(row.sub_products_json as string) : undefined,
    specs: JSON.parse(row.specs_json as string),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

async function insertProductRow(client: Client, product: Product, ignoreExisting: boolean) {
  await client.execute({
    sql: `INSERT ${ignoreExisting ? "OR IGNORE " : ""}INTO products
      (slug, name, category, category_name, image, description, starting_price,
       colors_json, color_variants_json, sub_products_json, specs_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      product.slug,
      product.name,
      product.category,
      product.categoryName,
      product.image,
      product.description,
      product.startingPrice,
      product.colors ? JSON.stringify(product.colors) : null,
      product.colorVariants ? JSON.stringify(product.colorVariants) : null,
      product.subProducts ? JSON.stringify(product.subProducts) : null,
      JSON.stringify(product.specs),
      product.createdAt ?? new Date().toISOString(),
      product.updatedAt ?? new Date().toISOString(),
    ],
  });
}

let _seedPromise: Promise<void> | null = null;

async function ensureProductsSeeded(client: Client) {
  if (!_seedPromise) {
    _seedPromise = (async () => {
      for (const product of initialProducts) {
        await insertProductRow(client, product, true);
      }
    })();
  }
  await _seedPromise;
}

function slugify(value: string) {
  return slugifyLabel(value);
}

function cloneProduct(product: Product): Product {
  return {
    ...product,
    specs: product.specs.map((spec) => ({ ...spec })),
    colorVariants: product.colorVariants?.map((v) => ({ ...v })),
  };
}

function ensureCategoryName(category: string) {
  const categoryMatch = categories.find((item) => item.slug === category);
  return categoryMatch?.name ?? category;
}

function parseSpecs(specs: Array<{ label: string; value: string }> | undefined) {
  if (!specs || specs.length === 0) {
    return [];
  }

  return specs
    .map((spec) => ({
      label: spec.label.trim(),
      value: spec.value.trim()
    }))
    .filter((spec) => spec.label.length > 0 && spec.value.length > 0);
}

function createUniqueSlug(existing: Product[], baseSlug: string, ignoreSlug?: string) {
  const rootSlug = baseSlug || "product";
  let candidate = rootSlug;
  let suffix = 1;

  while (existing.some((product) => product.slug === candidate && product.slug !== ignoreSlug)) {
    candidate = `${rootSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

// Short-lived cache — the remote Turso DB round-trip is the dominant cost on every
// products list request, and this list changes rarely, so a brief TTL avoids
// re-querying on every page view without risking stale data for long.
const PRODUCTS_CACHE_TTL_MS = 30_000;
const productsCache = new Map<string, { at: number; products: Product[] }>();

export async function getProducts(category?: string): Promise<Product[]> {
  const cacheKey = category ?? "__all__";
  const cached = productsCache.get(cacheKey);
  if (cached && Date.now() - cached.at < PRODUCTS_CACHE_TTL_MS) {
    return cached.products.map(cloneProduct);
  }

  const client = await getDb();
  await ensureProductsSeeded(client);

  const result = category
    ? await client.execute({ sql: "SELECT * FROM products WHERE category = ?", args: [category] })
    : await client.execute("SELECT * FROM products");

  const products = result.rows.map((row) => rowToProduct(row as unknown as Record<string, unknown>));
  productsCache.set(cacheKey, { at: Date.now(), products });
  return products.map(cloneProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const client = await getDb();
  await ensureProductsSeeded(client);

  const result = await client.execute({ sql: "SELECT * FROM products WHERE slug = ?", args: [slug] });
  const row = result.rows[0];

  return row ? cloneProduct(rowToProduct(row as unknown as Record<string, unknown>)) : undefined;
}

export async function createProduct(input: {
  slug?: string;
  name: string;
  category: string;
  image: string;
  description: string;
  startingPrice: string;
  colors?: string[];
  colorVariants?: ColorVariant[];
  subProducts?: string[];
  specs: Array<{ label: string; value: string }>;
}) {
  const client = await getDb();
  await ensureProductsSeeded(client);

  const existing = await getProducts();
  const categoryName = ensureCategoryName(input.category);
  const baseSlug = slugify(input.slug || input.name);
  const slug = createUniqueSlug(existing, baseSlug);
  const timestamp = new Date().toISOString();
  const product: Product = {
    slug,
    name: input.name.trim(),
    category: input.category,
    categoryName,
    image: input.image.trim(),
    description: input.description.trim(),
    startingPrice: input.startingPrice.trim(),
    colors: input.colors?.length ? input.colors : undefined,
    colorVariants: input.colorVariants?.length ? input.colorVariants : undefined,
    subProducts: input.subProducts?.length ? input.subProducts : undefined,
    specs: parseSpecs(input.specs),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await insertProductRow(client, product, false);
  productsCache.clear();

  return cloneProduct(product);
}

export async function updateProduct(
  slug: string,
  input: Partial<{
    slug: string;
    name: string;
    category: string;
    image: string;
    description: string;
    startingPrice: string;
    colors: string[];
    colorVariants: ColorVariant[];
    subProducts: string[];
    specs: Array<{ label: string; value: string }>;
  }>
) {
  const client = await getDb();
  await ensureProductsSeeded(client);

  const current = await getProductBySlug(slug);
  if (!current) {
    return undefined;
  }

  const nextCategory = input.category ? ensureCategoryName(input.category) : current.categoryName;
  const requestedSlug = input.slug?.trim() ? slugify(input.slug) : slug;

  if (requestedSlug !== slug) {
    const clash = await getProductBySlug(requestedSlug);
    if (clash) {
      throw new Error("Slug already exists.");
    }
  }

  const updated: Product = {
    ...current,
    slug: requestedSlug,
    name: input.name?.trim() || current.name,
    category: input.category || current.category,
    categoryName: nextCategory,
    image: input.image?.trim() || current.image,
    description: input.description?.trim() || current.description,
    startingPrice: input.startingPrice?.trim() || current.startingPrice,
    colors: input.colors !== undefined ? (input.colors.length ? input.colors : undefined) : current.colors,
    colorVariants: input.colorVariants !== undefined ? (input.colorVariants.length ? input.colorVariants : undefined) : current.colorVariants,
    subProducts: input.subProducts !== undefined ? (input.subProducts.length ? input.subProducts : undefined) : current.subProducts,
    specs: input.specs ? parseSpecs(input.specs) : current.specs.map((spec) => ({ ...spec })),
    updatedAt: new Date().toISOString()
  };

  if (requestedSlug !== slug) {
    await client.execute({ sql: "DELETE FROM products WHERE slug = ?", args: [slug] });
    await insertProductRow(client, updated, false);
  } else {
    await client.execute({
      sql: `UPDATE products SET
        name = ?, category = ?, category_name = ?, image = ?, description = ?, starting_price = ?,
        colors_json = ?, color_variants_json = ?, sub_products_json = ?, specs_json = ?, updated_at = ?
        WHERE slug = ?`,
      args: [
        updated.name,
        updated.category,
        updated.categoryName,
        updated.image,
        updated.description,
        updated.startingPrice,
        updated.colors ? JSON.stringify(updated.colors) : null,
        updated.colorVariants ? JSON.stringify(updated.colorVariants) : null,
        updated.subProducts ? JSON.stringify(updated.subProducts) : null,
        JSON.stringify(updated.specs),
        updated.updatedAt ?? new Date().toISOString(),
        slug,
      ],
    });
  }

  productsCache.clear();
  return cloneProduct(updated);
}

export async function deleteProduct(slug: string) {
  const client = await getDb();
  await ensureProductsSeeded(client);

  const existing = await getProductBySlug(slug);
  if (!existing) {
    return false;
  }

  await client.execute({ sql: "DELETE FROM products WHERE slug = ?", args: [slug] });
  productsCache.clear();

  return true;
}

export async function getAdminProductStats() {
  const products = await getProducts();

  const latestUpdatedAt = products
    .map((product) => product.updatedAt || product.createdAt || "")
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    productCount: products.length,
    categoryCount: new Set(products.map((product) => getCatalogGroupForCategory(product.category)?.slug).filter(Boolean)).size,
    latestUpdatedAt: latestUpdatedAt || null
  };
}

export async function getListingProducts(category?: string) {
  const products = await getProducts(category);
  return products.filter(
    (p) => LISTING_ALLOWED_CATEGORIES.has(p.category) && !LISTING_EXCLUDED_SLUGS.has(p.slug)
  );
}

export const featuredProducts = async () => (await getProducts()).slice(0, 3);
