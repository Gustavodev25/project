import type { Metadata } from "next";
import ProtectedRoute from "@/components/ProtectedRoute";
import Cupom from "@/app/components/views/Cupom";

export const metadata: Metadata = {
  title: "Cupons - Sistema de Gestão",
  description: "Gerenciamento de cupons para créditos",
};

export const dynamic = "force-dynamic";

export default function CupomPage() {
  return (
    <ProtectedRoute>
      <Cupom />
    </ProtectedRoute>
  );
}
