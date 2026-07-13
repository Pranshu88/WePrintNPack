"use client";

import { useRouter, usePathname } from "next/navigation";
import PackagingBoxEditor from "@/components/packaging-box-editor";
import PizzaBoxEditor from "@/components/pizza-box-editor";
import ShippingBoxEditor from "@/components/shipping-box-editor";
import type { Product } from "@/lib/types";

export default function PackagingBoxEditorWrapper({ product }: { product: Product }) {
  const router = useRouter();
  const pathname = usePathname();
  const isShipping = pathname?.includes("shipping-boxes");
  const isSquare   = pathname?.includes("square-shipping-boxes");
  const isPizzaBox = pathname?.includes("pizza-boxes");

  if (isShipping) {
    return <ShippingBoxEditor product={product} hideFlaps={isSquare} onClose={() => router.back()} />;
  }

  if (isPizzaBox) {
    return <PizzaBoxEditor product={product} onClose={() => router.back()} />;
  }

  return <PackagingBoxEditor product={product} onClose={() => router.back()} />;
}
