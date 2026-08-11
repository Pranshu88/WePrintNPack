"use client";

import { useRouter } from "next/navigation";
import DielineGenerator from "@/components/dieline-generator";
import SquareShippingMockup from "@/components/square-shipping-mockup";
import type { BoxType } from "@/lib/dieline-math";
import type { Product } from "@/lib/types";

export default function DielineCustomEditorWrapper({ boxType, product }: { boxType: BoxType; product?: Product }) {
  const router = useRouter();

  if (boxType === "square-shipping-boxes" && product) {
    return <SquareShippingMockup product={product} onClose={() => router.back()} />;
  }

  return <DielineGenerator boxType={boxType} />;
}
