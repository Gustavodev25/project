import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Sistema de Gestão",
  description: "Faça login no sistema",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
