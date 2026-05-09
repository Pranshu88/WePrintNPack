import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createProduct, getProducts } from "@/lib/data";

function parseSpecs(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
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
}

function readString(body: Record<string, unknown>, key: string) {
  const value = body[key];

  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;

  return NextResponse.json({
    products: getProducts(category)
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = readString(body, "name");
    const category = readString(body, "category");
    const image = readString(body, "image");
    const description = readString(body, "description");
    const startingPrice = readString(body, "startingPrice");
    const slug = readString(body, "slug");
    const specs = parseSpecs(body.specs);

    if (!name || !category || !image || !description || !startingPrice || specs.length === 0) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const product = createProduct({
      slug,
      name,
      category,
      image,
      description,
      startingPrice,
      specs
    });

    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/admin");
    revalidatePath("/admin/templates");

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create product.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
