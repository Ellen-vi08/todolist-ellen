import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TodoLIST | Organize seu dia",
  description: "Sua lista de tarefas simples e organizada.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
