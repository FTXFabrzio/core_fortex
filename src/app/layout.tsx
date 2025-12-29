import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "CORE2",
  description: "CORE2 app",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@200..700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
