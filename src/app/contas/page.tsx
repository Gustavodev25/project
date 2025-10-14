import Contas from '../components/views/Contas';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ContasPage() {
  return (
    <ProtectedRoute>
      <Contas />
    </ProtectedRoute>
  );
}
