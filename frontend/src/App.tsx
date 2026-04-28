import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Affaires } from './pages/Affaires';
import { AffaireDetail } from './pages/AffaireDetail';
import { Clients } from './pages/Clients';
import { Previsionnel } from './pages/Previsionnel';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';
import { Products } from './pages/Products';
import { Activites } from './pages/Activites';
import { Organizations } from './pages/Organizations';
import { Landing } from './pages/Landing';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const fetchMe = useAuth((s) => s.fetchMe);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/affaires" element={<Affaires />} />
                <Route path="/affaires/:id" element={<AffaireDetail />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/previsionnel" element={<Previsionnel />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/organizations" element={<Organizations />} />
                <Route path="/users" element={<Users />} />
                <Route path="/products" element={<Products />} />
                <Route path="/activites" element={<Activites />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
