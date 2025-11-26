import type { Metadata } from "next";
import VendasMercadolivre from "../../components/views/VendasMercadolivre";
import ProtectedRoute from '@/components/ProtectedRoute';

export const metadata: Metadata = {
  title: "Vendas Mercado Livre - Sistema de Gestão",
  description: "Gestão de vendas do Mercado Livre",
};

export default function VendasMercadolivrePage() {
  return (
    <ProtectedRoute>
      <VendasMercadolivre />
    </ProtectedRoute>
  );
}
