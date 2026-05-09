import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { deleteProduct, getProductBySlug, updateProduct } from "@/lib/data";
import type { ColorVariant } from "@/lib/types";

function parseSpecs(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const specs = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const label = typeof record.label === "string" ? record.label.trim() : "";
      const specValue = typeof record.value === "string" ? record.value.trim() : "";

      if (!label || !specValue) {
        return null;
      }

      return { label, value: specValue };
    })
    .filter((item): item is { label: string; value: string } => item !== null);

  return specs.length > 0 ? specs : [];
}

function readString(body: Record<string, unknown>, key: string) {
  const value = body[key];

  return typeof value === "string" ? value.trim() : "";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const name = readString(body, "name");
    const category = readString(body, "category");
    const image = readString(body, "image");
    const description = readString(body, "description");
    const startingPrice = readString(body, "startingPrice");
    const specs = parseSpecs(body.specs);

    if (!name || !category || !image || !description || !startingPrice || !specs || specs.length === 0) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const rawColors = body.colors;
    const colors = Array.isArray(rawColors)
      ? rawColors.filter((c): c is string => typeof c === "string" && c.startsWith("#"))
      : undefined;

    const rawVariants = body.colorVariants;
    const colorVariants: ColorVariant[] | undefined = Array.isArray(rawVariants)
      ? rawVariants.filter((v): v is ColorVariant =>
          v && typeof v === "object" &&
          typeof v.hex === "string" && v.hex.startsWith("#") &&
          typeof v.name === "string" &&
          typeof v.frontImage === "string"
        )
      : undefined;

    const product = updateProduct(slug, {
      slug: readString(body, "slug"),
      name,
      category,
      image,
      description,
      startingPrice,
      colors,
      colorVariants,
      specs
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/admin");
    revalidatePath("/admin/templates");

    return NextResponse.json({ product });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update product.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const deleted = deleteProduct(slug);

  if (!deleted) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin");

  return NextResponse.json({ ok: true });
}
