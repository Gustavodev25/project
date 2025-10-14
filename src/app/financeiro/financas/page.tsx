import Financas from "../../components/views/Financas";
import ProtectedRoute from '@/components/ProtectedRoute';

export default function FinancasPage() {
  return (
    <ProtectedRoute>
      <Financas />
    </ProtectedRoute>
  );
}
