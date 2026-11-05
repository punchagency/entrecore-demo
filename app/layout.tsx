import "./globals.css";
import localFont from "next/font/local";
import { Geist, Geist_Mono } from "next/font/google";

import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const eudoxusSans = localFont({
  src: [
    {
      path: "../public/fonts/eudoxus-sans-font-family-1742274690-0/EudoxusSans-Regular-BF659b6cb1d4714.ttf",
      weight: "400",
    },
    {
      path: "../public/fonts/eudoxus-sans-font-family-1742274690-0/EudoxusSans-Medium-BF659b6cb1c14cb.ttf",
      weight: "500",
    },
    {
      path: "../public/fonts/eudoxus-sans-font-family-1742274690-0/EudoxusSans-Bold-BF659b6cb1408e5.ttf",
      weight: "700",
    },
  ],
  variable: "--font-eudoxus-sans",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${eudoxusSans.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers toasterClassName={eudoxusSans.className}>{children}</Providers>
      </body>
    </html>
  );
}
