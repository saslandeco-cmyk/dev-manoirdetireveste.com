import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.manoirdetireveste.com"),
  title: { default: "Manoir de Tireveste | Chambres d'hôtes et gîtes dans les Landes", template: "%s | Manoir de Tireveste" },
  description: "Séjournez au Manoir de Tireveste à Lesperon : chambres d'hôtes, gîtes, piscine et parc arboré dans les Landes.",
  openGraph: { type: "website", locale: "fr_FR", siteName: "Manoir de Tireveste" }
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="fr"><body>{children}</body></html>;
}
