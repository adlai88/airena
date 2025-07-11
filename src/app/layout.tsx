import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Airena – Turn your are.na channels into a personal intelligence agent",
  description: "Airena transforms your Are.na channels into a personal intelligence agent. Generate insights, chat with your research, and create content powered by your unique curation.",
  icons: [
    { rel: "icon", url: "/favicon.ico", sizes: "any" },
    { rel: "icon", url: "/favicon.png", type: "image/png", sizes: "32x32" },
    { rel: "icon", url: "/favicon.svg", type: "image/svg+xml" },
  ],
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  }
};

export const viewport = {
  width: 'device-width',
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
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        elements: {
          formButtonPrimary: "bg-primary hover:bg-primary/90",
          footerActionLink: "text-primary hover:text-primary/90",
          avatarBox: "!rounded-sm !bg-gray-100 !text-gray-800 !border-0",
          userButtonAvatarBox: "!rounded-sm !bg-gray-100 !border-0 hover:!bg-gray-200",
          userButtonAvatarImage: "!rounded-sm",
          userPreviewAvatarBox: "!rounded-sm !bg-gray-100 !text-gray-800",
          userButtonTrigger: "!rounded-sm hover:!rounded-sm focus:!rounded-sm",
          userButtonBox: "!rounded-sm",
          profileSectionPrimaryButton: "bg-primary hover:bg-primary/90"
        },
        variables: {
          colorPrimary: "#ee8144", // Your orange theme color
          colorBackground: "#0a0a0a", // Dark background
          colorInputBackground: "#1a1a1a", // Dark input background
          colorInputText: "#ffffff" // White input text
        }
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* Favicon links handled by metadata */}
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
