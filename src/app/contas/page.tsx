import type { Metadata } from "next";
import Contas from '../components/views/Contas';
import ProtectedRoute from '@/components/ProtectedRoute';

export const metadata: Metadata = {
  title: "Contas - Sistema de Gestão",
  description: "Gestão de contas conectadas",
};

export default function ContasPage() {
  return (
    <ProtectedRoute>
      <Contas />
    </ProtectedRoute>
  );
}
