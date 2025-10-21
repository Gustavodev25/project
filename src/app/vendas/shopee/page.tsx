import type { Metadata } from "next";
import VendasShopee from "../../components/views/VendasShopee";
import ProtectedRoute from '@/components/ProtectedRoute';

export const metadata: Metadata = {
  title: "Vendas Shopee - Sistema de Gestão",
  description: "Gestão de vendas da Shopee",
};

export default function VendasShopeePage() {
  return (
    <ProtectedRoute>
      <VendasShopee />
    </ProtectedRoute>
  );
}

