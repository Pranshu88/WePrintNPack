"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <div className="site-shell">
      {!isAdmin && <Header />}
      <main>{children}</main>
      {!isAdmin && <Footer />}
    </div>
  );
}
