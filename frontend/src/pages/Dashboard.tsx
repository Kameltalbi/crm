import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Plus, DollarSign, Target, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { fmtDT, MOIS_S } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form-controls';
import type { KPIs, Affaire } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';

function KpiCard({ title, subtitle, value, icon, color }: {
  title: string;
  subtitle: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  const colorClasses: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', iconBg: 'bg-emerald-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', iconBg: 'bg-blue-100' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', iconBg: 'bg-violet-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', iconBg: 'bg-amber-100' },
  };
  const colors = colorClasses[color] || colorClasses.emerald;
  return (
    <Card className={`border ${colors.border} hover:shadow-lg transition-all duration-200 hover:-translate-y-1`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className={`p-3 rounded-xl ${colors.iconBg} ${colors.text}`}>{icon}</div>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-sm font-semibold text-gray-700 mt-1">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { data: kpis } = useQuery<KPIs>({
    queryKey: ['kpis'],
    queryFn: () => api.get('/kpis').then((r) => r.data),
  });
  const { data: affairesData } = useQuery<{ data: Affaire[], pagination: any }>({
    queryKey: ['affaires'],
    queryFn: () => api.get('/affaires').then((r) => r.data),
  });
  const affaires = affairesData?.data || [];
  const { data: productsData } = useQuery<{ data: any[], pagination: any }>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data),
  });
  const products = productsData?.data || [];

  if (!kpis || !affaires) {
    return <div className="text-center py-20 text-muted-foreground">Chargement...</div>;
  }

  const calculateMetrics = (affairesList: Affaire[]) => {
    const realise = affairesList.filter(a => a.statut === 'REALISE');
    const pipeline = affairesList.filter(a => a.statut === 'PIPELINE');
    const prospection = affairesList.filter(a => a.statut === 'PROSPECTION');
    const perdu = affairesList.filter(a => a.statut === 'PERDU');
    
    return {
      count: affairesList.length,
      caRealise: realise.reduce((sum, a) => sum + Number(a.montantHT), 0),
      caPipeline: pipeline.reduce((sum, a) => sum + Number(a.montantHT), 0),
      caProspection: prospection.reduce((sum, a) => sum + Number(a.montantHT), 0),
      countRealise: realise.length,
      countPipeline: pipeline.length,
      countProspection: prospection.length,
      countPerdu: perdu.length,
      avgMontant: affairesList.length > 0 ? affairesList.reduce((sum, a) => sum + Number(a.montantHT), 0) / affairesList.length : 0,
    };
  };

  // Prepare chart data
  const monthlyData = Object.entries(kpis.parMois).map(([month, data]) => ({
    month: MOIS_S[parseInt(month)],
    realise: Number(data.realise),
    pipeline: Number(data.pipeline),
    prospect: Number(data.prospect),
    total: Number(data.realise) + Number(data.pipeline) + Number(data.prospect),
  }));

  // Status distribution for pie chart
  const statusDistributionData = [
    { name: 'Réalisé', value: kpis.caRealise, color: '#22c55e' },
    { name: 'Pipeline', value: kpis.caPipeline, color: '#0ea5e9' },
    { name: 'Prospection', value: kpis.caProspection, color: '#f59e0b' },
  ];

  const winRate = kpis.counts.realise + kpis.counts.perdu > 0
    ? Math.round((kpis.counts.realise / (kpis.counts.realise + kpis.counts.perdu)) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-1">Vue d'ensemble de vos activités</p>
        </div>
        <Link to="/affaires" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto shadow-lg"><Plus size={16} className="mr-2" />Nouvelle affaire</Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <KpiCard
          title="CA Total"
          subtitle="Réalisé + Pipeline + Prospection"
          value={fmtDT(kpis.caTotal)}
          icon={<DollarSign className="w-6 h-6" />}
          color="emerald"
        />
        <KpiCard
          title="CA Pipeline"
          subtitle="Pipeline + Prospection"
          value={fmtDT(kpis.caPipeline + kpis.caProspection)}
          icon={<Target className="w-6 h-6" />}
          color="blue"
        />
        <KpiCard
          title="CA Gagné"
          subtitle="Réalisé"
          value={fmtDT(kpis.caRealise)}
          icon={<Wallet className="w-6 h-6" />}
          color="emerald"
        />
        <KpiCard
          title="Affaires en cours"
          subtitle="Activité"
          value={`${kpis.counts.pipeline + kpis.counts.prospect}`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="amber"
        />
        <KpiCard
          title="Affaires gagnées"
          subtitle="Résultat"
          value={`${kpis.counts.realise}`}
          icon={<Wallet className="w-6 h-6" />}
          color="emerald"
        />
        <KpiCard
          title="Conversion"
          subtitle="Efficacité"
          value={`${winRate}%`}
          icon={<Target className="w-6 h-6" />}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Évolution mensuelle du CA</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip
                  formatter={(value: number) => [fmtDT(value), '']}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="realise" stroke="#22c55e" strokeWidth={3} name="Réalisé" dot={{ r: 5 }} />
                <Line type="monotone" dataKey="pipeline" stroke="#0ea5e9" strokeWidth={3} name="Pipeline" dot={{ r: 5 }} />
                <Line type="monotone" dataKey="prospect" stroke="#f59e0b" strokeWidth={3} name="Prospection" dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPieChart>
                <Pie
                  data={statusDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusDistributionData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [fmtDT(value), '']} />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Status Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm md:text-base">État du pipeline par statut</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Réalisé</span>
              <span className="font-semibold text-emerald-600">{fmtDT(kpis.caRealise)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pipeline</span>
              <span className="font-semibold text-blue-600">{fmtDT(kpis.caPipeline)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Prospection</span>
              <span className="font-semibold text-amber-600">{fmtDT(kpis.caProspection)}</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusDistributionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => [fmtDT(value), '']} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {statusDistributionData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Affaires */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm md:text-base">Affaires récentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {affaires.slice(0, 5).map((a) => (
              <div key={a.id} className="flex justify-between items-center p-2 rounded bg-muted/50">
                <div>
                  <div className="font-medium text-sm">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.client?.name || 'N/A'}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">{fmtDT(Number(a.montantHT))}</div>
                  <div className="text-xs text-muted-foreground">{MOIS_S[a.moisPrevu]}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfessionalKpiCard({ title, value, subtitle, icon, trend, trendUp, color }: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend: string;
  trendUp: boolean;
  color: string;
}) {
  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  };

  const colors = colorClasses[color] || colorClasses.emerald;

  return (
    <Card className={`border-2 ${colors.border} hover:shadow-md transition-shadow`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-lg ${colors.bg} ${colors.text}`}>{icon}</div>
          <div className={`flex items-center text-xs font-semibold ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm font-medium text-gray-600 mt-1">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    REALISE: { cls: 'bg-sage text-leaf', label: '✅ Réalisé' },
    PIPELINE: { cls: 'bg-sky-light text-sky', label: '🔵 Pipeline' },
    PROSPECTION: { cls: 'bg-gold-light text-gold', label: '🟡 Prospection' },
    PERDU: { cls: 'bg-coral-light text-coral', label: '❌ Perdu' },
  };
  const { cls, label } = map[statut] || map.PROSPECTION;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{label}</span>;
}
