import { NextRequest, NextResponse } from "next/server";
import { fetchSinaliteShippingEstimate, type SinaliteShippingItem } from "@/lib/sinalite";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    items?: SinaliteShippingItem[];
    state?: string;
    zip?: string;
    country?: string;
  };
  const { items, state, zip, country } = body;

  console.log("[sinalite/shipping-estimate] request body:", JSON.stringify(body, null, 2));

  if (!items?.length || !state || !zip || !country) {
    return NextResponse.json({ error: "Missing items or shipping info" }, { status: 400 });
  }

  try {
    const options = await fetchSinaliteShippingEstimate(items, { state, zip, country });
    return NextResponse.json({ options });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch shipping estimate" },
      { status: 502 }
    );
  }
}
