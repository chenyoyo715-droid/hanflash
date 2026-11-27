import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Noto_Sans_TC } from "next/font/google";
import { PwaRegistrar } from "@/components/PwaRegistrar";
import "./globals.css";

const notoSansTc = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-tc",
  display: "swap",
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HanFlash — 韓文 3 秒開刷",
  description:
    "極致低阻力的韓文背單字 PWA：打開 3 秒即開刷、生詞／模糊／熟詞三鍵分桶、漢字詞與連音標註、Gemini AI 一鍵製卡。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HanFlash",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`${notoSansTc.variable} ${notoSansKr.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans selection:bg-indigo-200 selection:text-indigo-950 dark:selection:bg-indigo-800 dark:selection:text-indigo-100">
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
