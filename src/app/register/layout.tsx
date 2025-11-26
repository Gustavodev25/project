import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cadastro - Sistema de Gestão",
  description: "Crie sua conta no sistema",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
