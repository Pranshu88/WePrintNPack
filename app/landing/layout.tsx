import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "We Print N Pack – Custom Printing & Packaging",
  description: "Fast, affordable, and reliable custom printing and packaging. Business cards, flyers, banners, stickers, yard signs, and packaging.",
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
