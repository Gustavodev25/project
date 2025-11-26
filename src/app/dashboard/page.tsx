import type { Metadata } from "next";
import Dashboard from '../components/views/Dashboard';
import ProtectedRoute from '@/components/ProtectedRoute';

export const metadata: Metadata = {
  title: "Dashboard - Sistema de Gestão",
  description: "Dashboard com análise de vendas e KPIs",
};

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}

