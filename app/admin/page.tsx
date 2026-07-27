import { AdminProductManager } from "@/components/admin-product-manager";
import { getProducts } from "@/lib/products";

export default async function AdminPage() {
  const products = await getProducts();
  return <AdminProductManager initialProducts={products} />;
}
