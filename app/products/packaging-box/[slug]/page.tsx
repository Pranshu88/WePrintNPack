import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/products";
import PackagingBoxEditorWrapper from "./editor-wrapper";

export const dynamic = "force-dynamic";

const SUB_NAMES: Record<string, string> = {
  "pizza-boxes":           "Pizza Box",
  "mailer-boxes":          "Pizza Box",
  "shipping-boxes":        "Shipping Box",
  "square-shipping-boxes": "Square Shipping Box",
};

export default async function PackagingBoxSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = SUB_NAMES[slug];
  if (!name) notFound();

  const parent = await getProductBySlug("packaging-box");
  if (!parent) notFound();

  return <PackagingBoxEditorWrapper product={{ ...parent, name }} />;
}
