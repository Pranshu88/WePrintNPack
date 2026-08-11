import { notFound } from "next/navigation";
import type { BoxType } from "@/lib/dieline-math";
import { getProductBySlug } from "@/lib/products";
import DielineCustomEditorWrapper from "./editor-wrapper";

export const dynamic = "force-dynamic";

const VALID_BOX_TYPES: BoxType[] = [
  "pizza-boxes",
  "mailer-boxes",
  "shipping-boxes",
  "square-shipping-boxes",
];

const SUB_NAMES: Record<string, string> = {
  "pizza-boxes":           "Pizza Box",
  "mailer-boxes":          "Mailer Box",
  "shipping-boxes":        "Shipping Box",
  "square-shipping-boxes": "Square Shipping Box",
};

export default async function DielineCustomPage({
  params,
}: {
  params: Promise<{ boxType: string }>;
}) {
  const { boxType } = await params;
  if (!VALID_BOX_TYPES.includes(boxType as BoxType)) notFound();

  if (boxType === "square-shipping-boxes") {
    const parent = await getProductBySlug("packaging-box");
    if (!parent) notFound();
    return (
      <DielineCustomEditorWrapper
        boxType={boxType as BoxType}
        product={{ ...parent, name: SUB_NAMES[boxType] }}
      />
    );
  }

  return <DielineCustomEditorWrapper boxType={boxType as BoxType} />;
}
