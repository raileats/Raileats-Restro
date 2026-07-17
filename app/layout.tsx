// app/layout.tsx

import type {
  Metadata,
  Viewport,
} from "next";

import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import RestroShell from "@/components/restro/RestroShell";

import "./globals.css";

const geistSans =
  Geist({
    variable:
      "--font-geist-sans",

    subsets: [
      "latin",
    ],
  });

const geistMono =
  Geist_Mono({
    variable:
      "--font-geist-mono",

    subsets: [
      "latin",
    ],
  });

export const metadata:
  Metadata = {
    title:
      "RailEats Restro Panel",

    description:
      "RailEats restaurant partner panel",

    icons: {
      icon:
        "/logo.png",

      apple:
        "/logo.png",
    },
  };

export const viewport:
  Viewport = {
    width:
      "device-width",

    initialScale:
      1,

    maximumScale:
      1,

    userScalable:
      false,

    viewportFit:
      "cover",

    themeColor:
      "#ffffff",
  };

export default function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#eef2f7] text-slate-950">
        <RestroShell>
          {children}
        </RestroShell>
      </body>
    </html>
  );
}
