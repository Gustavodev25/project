import type { Metadata } from "next";
import DashboardFinanceiro from "../components/views/DashboardFinanceiro";
import ProtectedRoute from '@/components/ProtectedRoute';

export const metadata: Metadata = {
  title: "Financeiro - Sistema de Gestão",
  description: "Gestão financeira e DRE",
};

export default function FinanceiroDashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardFinanceiro />
    </ProtectedRoute>
  );
}

