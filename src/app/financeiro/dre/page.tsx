import ProtectedRoute from '@/components/ProtectedRoute';
import DREView from '@/app/components/views/DRE';

export default function DREPage() {
  return (
    <ProtectedRoute>
      <DREView />
    </ProtectedRoute>
  );
}

