import { AdminProductManager } from "@/components/admin-product-manager";
import { getProducts } from "@/lib/data";

export default function AdminPage() {
  return <AdminProductManager initialProducts={getProducts()} />;
}
