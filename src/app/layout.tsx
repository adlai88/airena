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
  title: "Airena – AI for Are.na",
  description: "Chat with your channels, generate content, and discover patterns across everything you've saved.",
  icons: [
    { rel: "icon", url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    { rel: "icon", url: "/favicon.png", type: "image/png", sizes: "any" },
    // { rel: "icon", url: "/favicon.ico", sizes: "any" }, // deprioritized
    // { rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }, // deprioritized
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
          avatarBox: "!rounded-full !bg-gray-200 !text-gray-800 !border-0",
          userButtonAvatarBox: "!rounded-full !bg-gray-200 !border-0 hover:!bg-gray-300",
          userButtonAvatarImage: "!rounded-full",
          userPreviewAvatarBox: "!rounded-full !bg-gray-200 !text-gray-800",
          userButtonTrigger: "!rounded-full hover:!rounded-full focus:!rounded-full",
          userButtonBox: "!rounded-full",
          profileSectionPrimaryButton: "bg-primary hover:bg-primary/90"
        },
        variables: {
          colorPrimary: "#5E6DEE", // Your blue theme color
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
