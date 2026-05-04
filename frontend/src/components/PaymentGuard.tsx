import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export function PaymentGuard({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  const paymentStatus = useAuth((s) => s.paymentStatus);

  // SUPERADMIN bypasses payment check
  if (user?.role === 'SUPERADMIN') {
    return <>{children}</>;
  }

  // If payment is not approved, redirect to payment pending page
  if (paymentStatus !== 'APPROVED' && paymentStatus !== null) {
    return <Navigate to="/payment-pending" replace />;
  }

  return <>{children}</>;
}
