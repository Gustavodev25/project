import DashboardFinanceiro from "../components/views/DashboardFinanceiro";
import ProtectedRoute from '@/components/ProtectedRoute';

export default function FinanceiroDashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardFinanceiro />
    </ProtectedRoute>
  );
}

