import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Users, Building2, CreditCard, Activity, CheckCircle, Clock, AlertTriangle, LogOut, LayoutDashboard, Receipt, Shield, DollarSign, TrendingUp, TrendingDown, Eye, EyeOff, Settings as SettingsIcon, Key, UserCheck, UserX, Plus, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'organizations', label: 'Entreprises', icon: Building2 },
  { id: 'subscriptions', label: 'Abonnements', icon: CreditCard },
  { id: 'payments', label: 'Paiements', icon: Receipt },
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'settings', label: 'Paramètres', icon: SettingsIcon },
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
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: stats } = useQuery({ queryKey: ['superadmin-stats'], queryFn: () => api.get('/superadmin/stats').then(r => r.data) });

  // Dummy data for charts
  const revenueData = [
    { month: 'Jan', revenue: 12000 },
    { month: 'Fév', revenue: 19000 },
    { month: 'Mar', revenue: 15000 },
    { month: 'Avr', revenue: 22000 },
    { month: 'Mai', revenue: 28000 },
    { month: 'Juin', revenue: 32000 },
  ];

  const clientsData = [
    { month: 'Jan', clients: 5 },
    { month: 'Fév', clients: 8 },
    { month: 'Mar', clients: 12 },
    { month: 'Avr', clients: 15 },
    { month: 'Mai', clients: 20 },
    { month: 'Juin', clients: 25 },
  ];

  const kpiCards = [
    { label: 'MRR Mensuel', value: `${stats?.mrr || 32000} DT`, icon: DollarSign, color: 'text-purple-600', trend: '+12%', trendUp: true },
    { label: 'Clients Actifs', value: stats?.organizations?.approved || 25, icon: Building2, color: 'text-blue-600', trend: '+5', trendUp: true },
    { label: 'Nouveaux Clients', value: stats?.newClientsThisMonth || 5, icon: Users, color: 'text-green-600', trend: '+2', trendUp: true },
    { label: 'Taux de Churn', value: `${stats?.churnRate || 2.5}%`, icon: TrendingDown, color: 'text-red-600', trend: '-0.5%', trendUp: true },
    { label: 'Paiements en attente', value: stats?.organizations?.pending || 3, icon: Clock, color: 'text-yellow-600', trend: '+1', trendUp: false },
    { label: 'Utilisateurs Actifs (30j)', value: stats?.activeUsers || 45, icon: Activity, color: 'text-emerald-600', trend: '+8', trendUp: true },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      
      {/* KPI Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {kpiCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <card.icon className={`${card.color} flex-shrink-0`} size={28} />
              <div className="flex-1">
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </div>
              <div className={`flex items-center gap-1 text-xs ${card.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                {card.trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {card.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Évolution du Revenu (MRR)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Croissance des Nouveaux Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={clientsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="clients" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* System Info */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Informations Système</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Utilisateurs</p>
            <p className="text-lg font-bold">{stats?.users || 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Clients</p>
            <p className="text-lg font-bold">{stats?.clients || 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Opportunités</p>
            <p className="text-lg font-bold">{stats?.affaires || 0}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OrganizationsTab() {
  const { data: orgs } = useQuery({ queryKey: ['admin-organizations'], queryFn: () => api.get('/superadmin/organizations').then(r => r.data) });
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, paymentStatus }: { id: string; paymentStatus: 'PENDING' | 'APPROVED' | 'REJECTED' }) =>
      api.put(`/superadmin/organizations/${id}/payment-status`, { paymentStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/superadmin/organizations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const toggleSuspendMutation = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      api.put(`/superadmin/organizations/${id}/suspend`, { suspended: !suspended }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: (userId: string) => api.post('/superadmin/impersonate', { userId }),
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('impersonating', 'true');
      localStorage.setItem('originalToken', localStorage.getItem('originalToken') || data.data.originalToken);
      window.location.href = '/';
    },
  });

  const paymentStatusBadge = (status: string) => {
    const colors: any = { PENDING: 'bg-yellow-100 text-yellow-700', APPROVED: 'bg-green-100 text-green-700', REJECTED: 'bg-red-100 text-red-700' };
    const labels: any = { PENDING: 'En attente', APPROVED: 'Approuvé', REJECTED: 'Refusé' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{labels[status] || status}</span>;
  };

  const suspendedBadge = (suspended: boolean) => {
    if (suspended) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Suspendu</span>;
    }
    return null;
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
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">Téléphone</th>
                  <th className="text-left p-4 font-medium">Plan</th>
                  <th className="text-left p-4 font-medium">Statut paiement</th>
                  <th className="text-left p-4 font-medium">Statut</th>
                  <th className="text-center p-4 font-medium">Utilisateurs</th>
                  <th className="text-center p-4 font-medium">Clients</th>
                  <th className="text-center p-4 font-medium">Affaires</th>
                  <th className="text-left p-4 font-medium">Dernière activité</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orgs?.map((org: any) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium">{org.name}</td>
                    <td className="p-4">{org.email || '-'}</td>
                    <td className="p-4">{org.phone || '-'}</td>
                    <td className="p-4">{org.plan || 'Basic'}</td>
                    <td className="p-4">{paymentStatusBadge(org.paymentStatus)}</td>
                    <td className="p-4">{suspendedBadge(org.suspended)}</td>
                    <td className="p-4 text-center">{org._count.users}</td>
                    <td className="p-4 text-center">{org._count.clients}</td>
                    <td className="p-4 text-center">{org._count.affaires}</td>
                    <td className="p-4 text-muted-foreground">{new Date(org.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td className="p-4 flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="sm">
                            <svg width="4" height="16" viewBox="0 0 4 16" fill="currentColor">
                              <circle cx="2" cy="2" r="2" />
                              <circle cx="2" cy="8" r="2" />
                              <circle cx="2" cy="14" r="2" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {org._count.users > 0 && (
                            <DropdownMenuItem onClick={() => impersonateMutation.mutate(org.id)}>
                              <UserCheck size={14} className="mr-2" /> Se connecter
                            </DropdownMenuItem>
                          )}
                          {org.paymentStatus !== 'APPROVED' && (
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: org.id, paymentStatus: 'APPROVED' })} disabled={updateStatusMutation.isPending}>
                              <CheckCircle size={14} className="mr-2" /> Approuver
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => toggleSuspendMutation.mutate({ id: org.id, suspended: org.suspended })} disabled={toggleSuspendMutation.isPending}>
                            {org.suspended ? <UserCheck size={14} className="mr-2" /> : <UserX size={14} className="mr-2" />}
                            {org.suspended ? 'Réactiver' : 'Suspendre'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteMutation.mutate(org.id)} disabled={deleteMutation.isPending} className="text-red-600">
                            <Trash2 size={14} className="mr-2" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

function SubscriptionsTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<any>(null);
  const [formData, setFormData] = useState({ organizationId: '', plan: 'STARTER', price: '', paymentMethod: 'VIREMENT', startDate: '', endDate: '' });
  const queryClient = useQueryClient();
  const { data: orgs } = useQuery({ queryKey: ['admin-organizations'], queryFn: () => api.get('/superadmin/organizations').then(r => r.data) });
  const { data: subs } = useQuery({ queryKey: ['superadmin-subscriptions'], queryFn: () => api.get('/superadmin/subscriptions').then(r => r.data) });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/superadmin/subscriptions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-subscriptions'] });
      setIsDialogOpen(false);
      setFormData({ organizationId: '', plan: 'STARTER', price: '', paymentMethod: 'VIREMENT', startDate: '', endDate: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/superadmin/subscriptions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-subscriptions'] });
      setIsDialogOpen(false);
      setEditingSubscription(null);
    },
  });

  const statusBadge = (status: string) => {
    const colors: any = { actif: 'bg-green-100 text-green-700', en_attente: 'bg-yellow-100 text-yellow-700', expiré: 'bg-red-100 text-red-700', refusé: 'bg-red-100 text-red-700' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
  };

  const handleSubmit = () => {
    if (editingSubscription) {
      updateMutation.mutate({ id: editingSubscription.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openDialog = (sub?: any) => {
    if (sub) {
      setEditingSubscription(sub);
      setFormData({
        organizationId: sub.organizationId,
        plan: sub.plan,
        price: sub.price,
        paymentMethod: sub.paymentMethod,
        startDate: sub.startDate?.split('T')[0] || '',
        endDate: sub.endDate?.split('T')[0] || '',
      });
    } else {
      setEditingSubscription(null);
      setFormData({ organizationId: '', plan: 'STARTER', price: '', paymentMethod: 'VIREMENT', startDate: '', endDate: '' });
    }
    setIsDialogOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Abonnements</h2>
        <Button onClick={() => openDialog()}>
          <Plus size={16} className="mr-2" /> Nouvel Abonnement
        </Button>
      </div>
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
                  <th className="text-left p-4 font-medium">Mode paiement</th>
                  <th className="text-right p-4 font-medium">Actions</th>
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
                    <td className="p-4 flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => openDialog(s)}>
                        <Edit size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubscription ? 'Modifier l\'Abonnement' : 'Nouvel Abonnement'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Entreprise</Label>
              <Select value={formData.organizationId} onValueChange={(v) => setFormData({ ...formData, organizationId: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une entreprise" /></SelectTrigger>
                <SelectContent>
                  {orgs?.map((org: any) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plan</Label>
              <Select value={formData.plan} onValueChange={(v) => setFormData({ ...formData, plan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STARTER">STARTER</SelectItem>
                  <SelectItem value="PRO">PRO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prix (DT)</Label>
              <Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
            </div>
            <div>
              <Label>Mode de paiement</Label>
              <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIREMENT">Virement</SelectItem>
                  <SelectItem value="ESPECES">Espèces</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date de début</Label>
              <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
            </div>
            <div>
              <Label>Date de fin</Label>
              <Input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit}>{editingSubscription ? 'Modifier' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const { data: users } = useQuery({ queryKey: ['admin-users'], queryFn: () => api.get('/superadmin/users').then(r => r.data) });
  const queryClient = useQueryClient();

  const blockMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/superadmin/users/${userId}/block`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const unblockMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/superadmin/users/${userId}/unblock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Utilisateurs Globaux</h2>
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
                  <th className="text-left p-4 font-medium">Statut</th>
                  <th className="text-left p-4 font-medium">Dernière connexion</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium">{u.name}</td>
                    <td className="p-4">{u.email}</td>
                    <td className="p-4">{u.organizationName}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'OWNER' ? 'bg-purple-100 text-purple-700' : u.role === 'SUPERADMIN' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span></td>
                    <td className="p-4">
                      {u.blocked ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Bloqué</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Actif</span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('fr-FR') : 'Jamais'}</td>
                    <td className="p-4 flex gap-2 justify-end">
                      {u.blocked ? (
                        <Button size="sm" variant="outline" onClick={() => unblockMutation.mutate(u.id)}>
                          <UserCheck size={14} className="mr-1" /> Débloquer
                        </Button>
                      ) : (
                        <Button size="sm" variant="destructive" onClick={() => blockMutation.mutate(u.id)}>
                          <UserX size={14} className="mr-1" /> Bloquer
                        </Button>
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

function SettingsTab() {
  const [formData, setFormData] = useState({
    currency: 'TND',
    language: 'fr',
    vatRate: '19',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
  });
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({ queryKey: ['admin-settings'], queryFn: () => api.get('/superadmin/settings').then(r => r.data) });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put('/superadmin/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
  });

  const handleSubmit = () => {
    updateMutation.mutate(formData);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Paramètres Système</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Paramètres Généraux</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Devise par défaut</Label>
              <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TND">TND (Dinar Tunisien)</SelectItem>
                  <SelectItem value="EUR">EUR (Euro)</SelectItem>
                  <SelectItem value="USD">USD (Dollar US)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Langue par défaut</Label>
              <Select value={formData.language} onValueChange={(v) => setFormData({ ...formData, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Taux TVA (%)</Label>
              <Input type="number" value={formData.vatRate} onChange={(e) => setFormData({ ...formData, vatRate: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuration SMTP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Hôte SMTP</Label>
              <Input value={formData.smtpHost} onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })} placeholder="smtp.gmail.com" />
            </div>
            <div>
              <Label>Port SMTP</Label>
              <Input type="number" value={formData.smtpPort} onChange={(e) => setFormData({ ...formData, smtpPort: e.target.value })} />
            </div>
            <div>
              <Label>Utilisateur SMTP</Label>
              <Input value={formData.smtpUser} onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })} />
            </div>
            <div>
              <Label>Mot de passe SMTP</Label>
              <Input type="password" value={formData.smtpPassword} onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Configuration des Primes Commerciales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CommissionConfigSection />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSubmit}>
          <SettingsIcon size={16} className="mr-2" /> Sauvegarder
        </Button>
      </div>
    </div>
  );
}

function CommissionConfigSection() {
  const [config, setConfig] = useState({
    calculationType: 'SIMPLE',
    periodicity: 'MONTHLY',
    simpleRate: 0,
    minThreshold: 0,
    maxCap: '',
    includeNewClients: true,
    includeRenewals: true,
    includeRecurring: true,
    paymentDelay: 30,
  });
  const [previewData, setPreviewData] = useState({ salesAmount: 0, userId: '', year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [previewResult, setPreviewResult] = useState<any>(null);

  const { data: currentConfig } = useQuery({
    queryKey: ['commission-config'],
    queryFn: () => api.get('/commissions/config').then(r => r.data),
  });

  useEffect(() => {
    if (currentConfig && currentConfig.calculationType) {
      setConfig({
        calculationType: currentConfig.calculationType,
        periodicity: currentConfig.periodicity,
        simpleRate: currentConfig.simpleRate || 0,
        minThreshold: currentConfig.minThreshold || 0,
        maxCap: currentConfig.maxCap || '',
        includeNewClients: currentConfig.includeNewClients ?? true,
        includeRenewals: currentConfig.includeRenewals ?? true,
        includeRecurring: currentConfig.includeRecurring ?? true,
        paymentDelay: currentConfig.paymentDelay || 30,
      });
    }
  }, [currentConfig]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.post('/commissions/config', data),
    onSuccess: () => {
      alert('Configuration sauvegardée avec succès');
    },
  });

  const previewMutation = useMutation({
    mutationFn: (data: any) => api.post('/commissions/preview', data).then(r => r.data),
    onSuccess: (data) => {
      setPreviewResult(data);
    },
  });

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  const handlePreview = () => {
    previewMutation.mutate(previewData);
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Type de calcul</Label>
          <Select value={config.calculationType} onValueChange={(v) => setConfig({ ...config, calculationType: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SIMPLE">Simple (pourcentage fixe)</SelectItem>
              <SelectItem value="TIERS">Par paliers (seuils)</SelectItem>
              <SelectItem value="PROGRESSIVE">Progressif (linéaire)</SelectItem>
              <SelectItem value="CUSTOM">Personnalisé (formule)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Périodicité</Label>
          <Select value={config.periodicity} onValueChange={(v) => setConfig({ ...config, periodicity: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">Mensuel</SelectItem>
              <SelectItem value="QUARTERLY">Trimestriel</SelectItem>
              <SelectItem value="SEMI_ANNUAL">Semestriel</SelectItem>
              <SelectItem value="ANNUAL">Annuel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {config.calculationType === 'SIMPLE' && (
        <div>
          <Label>Taux de commission (%)</Label>
          <Input type="number" value={config.simpleRate} onChange={(e) => setConfig({ ...config, simpleRate: Number(e.target.value) })} placeholder="Ex: 5" />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Seuil minimum (DT)</Label>
          <Input type="number" value={config.minThreshold} onChange={(e) => setConfig({ ...config, minThreshold: Number(e.target.value) })} placeholder="0" />
        </div>
        <div>
          <Label>Plafond maximum (DT)</Label>
          <Input type="number" value={config.maxCap} onChange={(e) => setConfig({ ...config, maxCap: e.target.value })} placeholder="Laisser vide pour illimité" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Délai de paiement client (jours)</Label>
          <Input type="number" value={config.paymentDelay} onChange={(e) => setConfig({ ...config, paymentDelay: Number(e.target.value) })} placeholder="30" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Types de ventes inclus</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={config.includeNewClients} onChange={(e) => setConfig({ ...config, includeNewClients: e.target.checked })} />
            Nouveaux clients
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={config.includeRenewals} onChange={(e) => setConfig({ ...config, includeRenewals: e.target.checked })} />
            Renouvellements
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={config.includeRecurring} onChange={(e) => setConfig({ ...config, includeRecurring: e.target.checked })} />
            Récurrent
          </label>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
      </Button>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Prévisualisation de prime</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Montant des ventes (DT)</Label>
            <Input type="number" value={previewData.salesAmount} onChange={(e) => setPreviewData({ ...previewData, salesAmount: Number(e.target.value) })} placeholder="Ex: 50000" />
          </div>
          <div className="flex items-end">
            <Button onClick={handlePreview} disabled={previewMutation.isPending} className="w-full">
              {previewMutation.isPending ? 'Calcul...' : 'Calculer la prime'}
            </Button>
          </div>
        </div>

        {previewResult && (
          <Card className="mt-4 bg-emerald-50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Taux d'atteinte</p>
                  <p className="text-2xl font-bold">{previewResult.achievementRate}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Prime estimée</p>
                  <p className="text-2xl font-bold text-emerald-600">{previewResult.commission} DT</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{previewResult.calculationDetails}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
