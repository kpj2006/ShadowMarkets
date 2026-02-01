import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { Providers } from "@/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "PNP SDK Demo",
  description: "Demo app for PNP Protocol TypeScript SDK",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen font-mono-tech text-phantom bg-void selection:bg-signal-win selection:text-black">
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "rgba(10, 10, 10, 0.8)",
                backdropFilter: "blur(12px)",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                fontFamily: "monospace",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
