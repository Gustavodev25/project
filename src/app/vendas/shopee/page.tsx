import VendasShopee from "../../components/views/VendasShopee";
import ProtectedRoute from '@/components/ProtectedRoute';

export default function VendasShopeePage() {
  return (
    <ProtectedRoute>
      <VendasShopee />
    </ProtectedRoute>
  );
}

