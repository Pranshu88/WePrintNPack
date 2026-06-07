import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "We Print N Pack",
  description: "Vistaprint-style web-to-print storefront for packaging and print products.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="/site.css" />
        <link rel="stylesheet" href="/landing.css" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Abel&family=Advent+Pro:wght@400;700&family=Alegreya:wght@400;700;900&family=Alex+Brush&family=Allison&family=Alumni+Sans:wght@400;700&family=Amaranth:ital,wght@0,400;0,700&family=Antic+Slab&family=Archivo:wght@400;700&family=Archivo+Narrow:wght@400;700&family=Arimo:wght@400;700&family=Barlow+Semi+Condensed:wght@400;700&family=Bellefair&family=Bellota:wght@400;700&family=BenchNine:wght@400;700&family=Bevan&family=BioRhyme+Expanded&family=Boogaloo&family=Bowlby+One&family=Bree+Serif&family=Carrois+Gothic&family=Cinzel:wght@400;500;700&family=Comic+Neue:wght@400;700&family=Cookie&family=Corinthia&family=Cormorant+Garamond:wght@400;700&family=Cormorant+Infant:wght@400;700&family=Cormorant+SC:wght@400;700&family=Crete+Round&family=Crimson+Pro:wght@400;700&family=Ephesis&family=Euphoria+Script&family=Fanwood+Text&family=Fira+Sans:wght@400;700&family=Fira+Sans+Extra+Condensed:wght@400;700&family=Fjalla+One&family=Fondamento&family=Forum&family=Fruktur&family=Fugaz+One&family=Gelasio:wght@400;700&family=Gilda+Display&family=Gochi+Hand&family=Grand+Hotel&family=Grandstander:wght@400;700&family=Great+Vibes&family=Griffy&family=Gruppo&family=Gwendolyn:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Henny+Penny&family=Ingrid+Darling&family=Irish+Grover&family=Italiana&family=Josefin+Sans:wght@400;700&family=Jost:wght@400;700&family=Joti+One&family=Kalam:wght@400;700&family=Lato:wght@400;700&family=Lobster&family=Lobster+Two:ital,wght@0,400;0,700&family=Mallanna&family=Mea+Culpa&family=MonteCarlo&family=Montez&family=Montserrat:wght@400;700&family=Moondance&family=Mr+Dafoe&family=Mystery+Quest&family=Nunito+Sans:wght@400;700&family=Oleo+Script+Swash+Caps:wght@400;700&family=Open+Sans:wght@400;700&family=Pacifico&family=Parisienne&family=Petit+Formal+Script&family=Pinyon+Script&family=Pirata+One&family=Playfair+Display:wght@400;700;900&family=Poiret+One&family=Quattrocento:wght@400;700&family=Quicksand:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Risque&family=Roboto+Slab:wght@400;700&family=Sacramento&family=Sail&family=Sarabun:wght@400;700&family=Satisfy&family=Science+Gothic&family=Shalimar&family=Shrikhand&family=Slabo+27px&family=Smooch&family=Sofia&family=Stalemate&family=Stint+Ultra+Expanded&family=Style+Script&family=Sunshiney&family=Teko:wght@400;700&family=Trade+Winds&family=Truculenta:wght@400;700&family=Twinkle+Star&family=WindSong:wght@400;700&family=Yesteryear&family=Young+Serif&family=Zilla+Slab:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
