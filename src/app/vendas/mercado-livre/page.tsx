import VendasMercadolivre from "../../components/views/VendasMercadolivre";
import ProtectedRoute from '@/components/ProtectedRoute';

export default function VendasMercadolivrePage() {
  return (
    <ProtectedRoute>
      <VendasMercadolivre />
    </ProtectedRoute>
  );
}
