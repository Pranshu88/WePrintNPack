import { notFound } from "next/navigation";
import { getShirtBySlug } from "@/lib/shirt-data";
import ShirtOrderClient from "@/components/shirt-order-client";

export const dynamic = "force-dynamic";

export default async function ShirtDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ gallery?: string }>;
}) {
  const { slug } = await params;
  const { gallery } = await searchParams;
  let shirt = getShirtBySlug(slug);

  if (!shirt) notFound();

  return <ShirtOrderClient shirt={shirt} galleryId={gallery ?? null} />;
}
