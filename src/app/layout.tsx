import { getAppearanceCssVariables } from "@/features/appearance/appearance";
import { getPublicSiteAppearance } from "@/features/appearance/appearance-service";
import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = { title: "Serrian Tide", description: "Enter your imagination." };

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const appearance = await getPublicSiteAppearance();
  return <html lang="en" data-appearance-preset={appearance.presetId} style={getAppearanceCssVariables(appearance) as CSSProperties} className="h-full antialiased"><body className="min-h-full flex flex-col">{children}</body></html>;
}
