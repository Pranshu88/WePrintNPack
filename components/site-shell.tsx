"use client";

import { usePathname } from "next/navigation";
import { LandingHeader } from "@/components/landing-header";
import { Footer } from "@/components/footer";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin   = pathname?.startsWith("/admin") ?? false;
  // Landing page renders its own header + footer inline
  const isLanding = pathname === "/" || pathname === "/landing";

  return (
    <div className="site-shell">
      {!isAdmin && !isLanding && <LandingHeader />}
      <main>{children}</main>
      {!isAdmin && !isLanding && <Footer />}
    </div>
  );
}
