import "./globals.css";
import type { Metadata } from "next";
import { ReactQueryProvider } from "@/lib/utils/react-query-provider";

export const metadata: Metadata = {
  title: "ConsMas FieldTool Admin",
  description: "Admin dashboard for ConsMas FieldTool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  );
}
