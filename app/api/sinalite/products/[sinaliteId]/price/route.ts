import { NextResponse } from "next/server";
import { fetchSinalitePrice } from "@/lib/sinalite";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sinaliteId: string }> }
) {
  const { sinaliteId } = await params;
  const body = (await req.json()) as { optionIds?: unknown };
  const optionIds = Array.isArray(body.optionIds)
    ? body.optionIds.filter((n): n is number => typeof n === "number")
    : [];

  if (optionIds.length === 0) {
    return NextResponse.json({ error: "optionIds is required" }, { status: 400 });
  }

  try {
    const result = await fetchSinalitePrice(sinaliteId, optionIds);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch price" },
      { status: 502 }
    );
  }
}
