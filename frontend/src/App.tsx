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
import { Leads } from './pages/Leads';
import { Calendar } from './pages/Calendar';
import { Expenses } from './pages/Expenses';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';
import { Products } from './pages/Products';
import { Activites } from './pages/Activites';
import { Organizations } from './pages/Organizations';
import { Landing } from './pages/Landing';
import { LandingSales } from './pages/LandingSales';
import { Legal } from './pages/Legal';
import { Onboarding } from './pages/Onboarding';
import { Pricing } from './pages/Pricing';
import { EmailTemplates } from './pages/EmailTemplates';
import { AIAssistant } from './pages/AIAssistant';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuth((s) => s.accessToken);
  return accessToken ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const fetchMe = useAuth((s) => s.fetchMe);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/sales" element={<LandingSales />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/legal/:type" element={<Legal />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/pricing" element={<Pricing />} />
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
                <Route path="/leads" element={<Leads />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/organizations" element={<Organizations />} />
                <Route path="/users" element={<Users />} />
                <Route path="/products" element={<Products />} />
                <Route path="/activites" element={<Activites />} />
                <Route path="/email-templates" element={<EmailTemplates />} />
                <Route path="/ai-assistant" element={<AIAssistant />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
