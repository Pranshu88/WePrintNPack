import type { Metadata } from "next";
import DielineGenerator from "@/components/dieline-generator";
import type { BoxType } from "@/lib/dieline-math";

const BOX_LABELS: Record<string, string> = {
  "mailer-boxes":          "Mailer Box Dieline Generator",
  "pizza-boxes":           "Pizza Box Dieline Generator",
  "shipping-boxes":        "Shipping Box Dieline Generator",
  "square-shipping-boxes": "Square Shipping Box Dieline Generator",
};

const VALID: BoxType[] = ["mailer-boxes", "pizza-boxes", "shipping-boxes", "square-shipping-boxes"];

export async function generateMetadata({ params }: { params: Promise<{ boxType: string }> }): Promise<Metadata> {
  const { boxType } = await params;
  const title = BOX_LABELS[boxType] ?? "Dieline Generator";
  return { title, description: `Generate a custom ${title} dieline with bleed, trim and crease lines. Download as PDF, SVG, AI or DXF.` };
}

export default async function DielinePage({ params }: { params: Promise<{ boxType: string }> }) {
  const { boxType } = await params;
  if (!VALID.includes(boxType as BoxType)) {
    return <div style={{ padding: 40, textAlign: "center", fontSize: 16, color: "#6b7280" }}>Unknown box type.</div>;
  }
  return <DielineGenerator boxType={boxType as BoxType} />;
}
