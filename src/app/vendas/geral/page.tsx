import VendasGeral from "../../components/views/VendasGeral";
import ProtectedRoute from '@/components/ProtectedRoute';

export default function VendasGeralPage() {
  return (
    <ProtectedRoute>
      <VendasGeral />
    </ProtectedRoute>
  );
}
