import { NextResponse } from "next/server";
import { fetchSinaliteProductOptions } from "@/lib/sinalite";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sinaliteId: string }> }
) {
  const { sinaliteId } = await params;
  try {
    const options = await fetchSinaliteProductOptions(sinaliteId);
    return NextResponse.json({ options });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch options" },
      { status: 502 }
    );
  }
}
