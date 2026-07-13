"use client";

import DielineGenerator from "@/components/dieline-generator";
import type { BoxType } from "@/lib/dieline-math";

export default function DielineCustomEditorWrapper({ boxType }: { boxType: BoxType }) {
  return <DielineGenerator boxType={boxType} />;
}
