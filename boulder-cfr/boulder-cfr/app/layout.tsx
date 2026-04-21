import type { Metadata } from "next";
import "./globals.css";
import { RoleProvider } from "@/components/role-context";
import { RoleSwitcher } from "@/components/role-switcher";
import { getUsers } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Boulder — CFR & Draw Management",
  description: "Construction cost-to-finish and AIA draw management for Boulder Construction.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const users = await getUsers();
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root {
            --font-sans: "Inter", system-ui, sans-serif;
            --font-display: "Space Grotesk", system-ui, sans-serif;
            --font-mono: "JetBrains Mono", ui-monospace, monospace;
          }
        `}</style>
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <RoleProvider users={users}>
          {children}
          <RoleSwitcher />
        </RoleProvider>
      </body>
    </html>
  );
}
