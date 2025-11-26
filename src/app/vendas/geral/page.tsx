import type { Metadata } from "next";
import VendasGeral from "../../components/views/VendasGeral";
import ProtectedRoute from '@/components/ProtectedRoute';

export const metadata: Metadata = {
  title: "Vendas Geral - Sistema de Gestão",
  description: "Visão geral de todas as vendas",
};

export default function VendasGeralPage() {
  return (
    <ProtectedRoute>
      <VendasGeral />
    </ProtectedRoute>
  );
}
