import { notFound } from "next/navigation";
import type { BoxType } from "@/lib/dieline-math";
import DielineCustomEditorWrapper from "./editor-wrapper";

export const dynamic = "force-dynamic";

const VALID_BOX_TYPES: BoxType[] = [
  "pizza-boxes",
  "mailer-boxes",
  "shipping-boxes",
  "square-shipping-boxes",
];

export default async function DielineCustomPage({
  params,
}: {
  params: Promise<{ boxType: string }>;
}) {
  const { boxType } = await params;
  if (!VALID_BOX_TYPES.includes(boxType as BoxType)) notFound();

  return <DielineCustomEditorWrapper boxType={boxType as BoxType} />;
}
