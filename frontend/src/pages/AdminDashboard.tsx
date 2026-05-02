import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Building2, CreditCard, Activity, CheckCircle, Clock, AlertTriangle, LogOut, LayoutDashboard, Receipt, Shield, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'organizations', label: 'Entreprises', icon: Building2 },
  { id: 'subscriptions', label: 'Abonnements', icon: CreditCard },
  { id: 'payments', label: 'Paiements', icon: Receipt },
  { id: 'users', label: 'Utilisateurs', icon: Users },
];

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();
  const logout = useAuth((s) => s.logout);
  const queryClient = useQueryClient();

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Shield className="text-leaf" size={24} />
              <span className="text-xl font-bold">SuperAdmin</span>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
              <LogOut size={16} /> Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-leaf text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'organizations' && <OrganizationsTab />}
        {activeTab === 'subscriptions' && <SubscriptionsTab />}
        {activeTab === 'payments' && <PaymentsTab queryClient={queryClient} />}
        {activeTab === 'users' && <UsersTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.get('/admin/stats').then(r => r.data) });
  const { data: activity } = useQuery({ queryKey: ['admin-activity'], queryFn: () => api.get('/admin/activity').then(r => r.data) });

  const cards = [
    { label: 'Entreprises inscrites', value: stats?.totalOrganizations || 0, icon: Building2, color: 'text-blue-600' },
    { label: 'Abonnements actifs', value: stats?.activeSubscriptions || 0, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Paiements en attente', value: stats?.pendingPayments || 0, icon: Clock, color: 'text-yellow-600' },
    { label: 'Validés ce mois', value: stats?.paidThisMonth || 0, icon: Receipt, color: 'text-emerald-600' },
    { label: 'Abonnements expirés', value: stats?.expiredSubscriptions || 0, icon: AlertTriangle, color: 'text-red-600' },
    { label: 'CA encaissé ce mois', value: `${stats?.caThisMonth || 0} DT`, icon: DollarSign, color: 'text-purple-600' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <card.icon className={`${card.color} flex-shrink-0`} size={28} />
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-lg">Infos système</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Utilisateurs : <strong>{stats?.totalUsers || 0}</strong></p>
            <p>Clients : <strong>{stats?.totalClients || 0}</strong></p>
            <p>Opportunités : <strong>{stats?.totalAffaires || 0}</strong></p>
            <p>Base de données : <strong>{stats?.databaseSize || 'N/A'}</strong></p>
            <p>Uptime : <strong>{stats?.systemUptime || 'N/A'}</strong></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Activité récente</CardTitle></CardHeader>
          <CardContent>
            {activity?.length > 0 ? (
              <div className="space-y-3">
                {activity.map((a: any, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <Activity className="text-muted-foreground mt-0.5 flex-shrink-0" size={14} />
                    <div>
                      <p className="text-sm">{a.action}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleString('fr-FR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">Aucune activité</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OrganizationsTab() {
  const { data: orgs } = useQuery({ queryKey: ['admin-organizations'], queryFn: () => api.get('/admin/organizations').then(r => r.data) });
  const statusBadge = (status: string) => {
    const colors: any = { actif: 'bg-green-100 text-green-700', en_attente: 'bg-yellow-100 text-yellow-700', expiré: 'bg-red-100 text-red-700', aucun: 'bg-gray-100 text-gray-600' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.aucun}`}>{status}</span>;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Entreprises</h2>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium">Entreprise</th>
                  <th className="text-left p-4 font-medium">Responsable</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">Plan</th>
                  <th className="text-left p-4 font-medium">Statut</th>
                  <th className="text-left p-4 font-medium">Inscription</th>
                  <th className="text-left p-4 font-medium">Stats</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orgs?.map((org: any) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium">{org.name}</td>
                    <td className="p-4">{org.responsable}</td>
                    <td className="p-4">{org.emailResponsable}</td>
                    <td className="p-4">{org.plan}</td>
                    <td className="p-4">{statusBadge(org.status)}</td>
                    <td className="p-4">{new Date(org.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td className="p-4 text-xs text-muted-foreground">{org.usersCount} users · {org.clientsCount} clients · {org.affairesCount} affaires</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SubscriptionsTab() {
  const { data: subs } = useQuery({ queryKey: ['admin-subscriptions'], queryFn: () => api.get('/admin/subscriptions').then(r => r.data) });
  const statusBadge = (status: string) => {
    const colors: any = { actif: 'bg-green-100 text-green-700', en_attente: 'bg-yellow-100 text-yellow-700', expiré: 'bg-red-100 text-red-700', refusé: 'bg-red-100 text-red-700' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Abonnements</h2>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium">Entreprise</th>
                  <th className="text-left p-4 font-medium">Plan</th>
                  <th className="text-left p-4 font-medium">Montant</th>
                  <th className="text-left p-4 font-medium">Début</th>
                  <th className="text-left p-4 font-medium">Fin</th>
                  <th className="text-left p-4 font-medium">Statut</th>
                  <th className="text-left p-4 font-medium">Paiement</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subs?.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium">{s.organizationName}</td>
                    <td className="p-4">{s.plan}</td>
                    <td className="p-4">{s.price} DT</td>
                    <td className="p-4">{new Date(s.startDate).toLocaleDateString('fr-FR')}</td>
                    <td className="p-4">{new Date(s.endDate).toLocaleDateString('fr-FR')}</td>
                    <td className="p-4">{statusBadge(s.status)}</td>
                    <td className="p-4">{s.paymentMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentsTab({ queryClient }: { queryClient: any }) {
  const { data: payments } = useQuery({ queryKey: ['admin-payments'], queryFn: () => api.get('/admin/payments').then(r => r.data) });

  const validateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/payments/${id}/validate`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-payments'] }); queryClient.invalidateQueries({ queryKey: ['admin-stats'] }); },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/payments/${id}/reject`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-payments'] }); queryClient.invalidateQueries({ queryKey: ['admin-stats'] }); },
  });

  const statusBadge = (status: string) => {
    const colors: any = { PAID: 'bg-green-100 text-green-700', PENDING: 'bg-yellow-100 text-yellow-700', REFUSED: 'bg-red-100 text-red-700' };
    const labels: any = { PAID: 'Validé', PENDING: 'En attente', REFUSED: 'Refusé' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{labels[status] || status}</span>;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Paiements</h2>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium">Entreprise</th>
                  <th className="text-left p-4 font-medium">Plan</th>
                  <th className="text-left p-4 font-medium">Montant</th>
                  <th className="text-left p-4 font-medium">Mode</th>
                  <th className="text-left p-4 font-medium">Statut</th>
                  <th className="text-left p-4 font-medium">Date demande</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments?.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium">{p.organizationName}</td>
                    <td className="p-4">{p.plan}</td>
                    <td className="p-4">{p.price} DT</td>
                    <td className="p-4">{p.paymentMethod}</td>
                    <td className="p-4">{statusBadge(p.paymentStatus)}</td>
                    <td className="p-4">{new Date(p.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td className="p-4 flex gap-2">
                      {p.paymentStatus === 'PENDING' && (
                        <>
                          <Button size="sm" onClick={() => validateMutation.mutate(p.id)} disabled={validateMutation.isPending}>
                            <CheckCircle size={14} className="mr-1" /> Valider
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate(p.id)} disabled={rejectMutation.isPending}>
                            <AlertTriangle size={14} className="mr-1" /> Refuser
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsersTab() {
  const { data: users } = useQuery({ queryKey: ['admin-users'], queryFn: () => api.get('/admin/users').then(r => r.data) });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Utilisateurs</h2>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium">Nom</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">Entreprise</th>
                  <th className="text-left p-4 font-medium">Rôle</th>
                  <th className="text-left p-4 font-medium">Inscription</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium">{u.name}</td>
                    <td className="p-4">{u.email}</td>
                    <td className="p-4">{u.organizationName}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'OWNER' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span></td>
                    <td className="p-4">{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
