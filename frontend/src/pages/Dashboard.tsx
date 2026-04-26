import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Plus, DollarSign, Target, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { fmtDT, MOIS_S } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { KPIs, Affaire } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';

export function Dashboard() {
  const { data: kpis } = useQuery<KPIs>({
    queryKey: ['kpis', 2026],
    queryFn: () => api.get('/kpis?annee=2026').then((r) => r.data),
  });
  const { data: affaires } = useQuery<Affaire[]>({
    queryKey: ['affaires', 'recent'],
    queryFn: () => api.get('/affaires?annee=2026').then((r) => r.data),
  });

  if (!kpis || !affaires) {
    return <div className="text-center py-20 text-muted-foreground">Chargement...</div>;
  }

  // Calculate metrics by business type
  const bilans = affaires.filter(a => a.type === 'BILAN_CARBONE');
  const formations = affaires.filter(a => a.type === 'FORMATION');

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

  const bilanMetrics = calculateMetrics(bilans);
  const formationMetrics = calculateMetrics(formations);

  // Prepare chart data
  const monthlyData = Object.entries(kpis.parMois).map(([month, data]) => ({
    month: MOIS_S[parseInt(month)],
    realise: Number(data.realise),
    pipeline: Number(data.pipeline),
    prospect: Number(data.prospect),
    total: Number(data.realise) + Number(data.pipeline) + Number(data.prospect),
  }));

  const typeDistributionData = [
    { name: 'Bilan Carbone', value: bilanMetrics.caRealise + bilanMetrics.caPipeline + bilanMetrics.caProspection, color: '#22c55e' },
    { name: 'Formation', value: formationMetrics.caRealise + formationMetrics.caPipeline + formationMetrics.caProspection, color: '#f59e0b' },
  ];

  const statusDistributionData = [
    { name: 'Réalisé', value: kpis.caRealise, color: '#22c55e' },
    { name: 'Pipeline', value: kpis.caPipeline, color: '#0ea5e9' },
    { name: 'Prospection', value: kpis.caProspection, color: '#f59e0b' },
  ];

  const winRate = kpis.counts.realise + kpis.counts.perdu > 0 
    ? Math.round((kpis.counts.realise / (kpis.counts.realise + kpis.counts.perdu)) * 100) 
    : 0;

  return (
    <div className="space-y-6 px-2 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble — 2026</p>
        </div>
        <Link to="/affaires" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto"><Plus size={16} />Nouvelle affaire</Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProfessionalKpiCard
          title="Chiffre d'affaires réalisé"
          value={fmtDT(kpis.caRealise)}
          subtitle={`${kpis.counts.realise} affaires gagnées`}
          icon={<DollarSign className="w-5 h-5" />}
          trend="+12%"
          trendUp={true}
          color="emerald"
        />
        <ProfessionalKpiCard
          title="Prévision intelligente"
          value={fmtDT(kpis.smartForecast?.forecast || 0)}
          subtitle={`Confiance: ${kpis.smartForecast?.confidenceScore || 0}%`}
          icon={<Target className="w-5 h-5" />}
          trend="+8%"
          trendUp={true}
          color="blue"
        />
        <ProfessionalKpiCard
          title="Taux de conversion"
          value={`${kpis.smartForecast?.conversionRates?.overall || winRate}%`}
          subtitle={`Pipeline: ${kpis.smartForecast?.conversionRates?.pipelineToRealise || 0}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="+5%"
          trendUp={true}
          color="violet"
        />
        <ProfessionalKpiCard
          title="Revenu net après commissions"
          value={fmtDT(kpis.netRealise)}
          subtitle="Commissions partenaires déduites"
          icon={<Wallet className="w-5 h-5" />}
          trend="+15%"
          trendUp={true}
          color="amber"
        />
      </div>

      {/* Business Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-2 border-emerald-100">
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              Bilan Carbone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">CA Total</p>
                <p className="text-xl md:text-2xl font-bold text-emerald-600">{fmtDT(bilanMetrics.caRealise + bilanMetrics.caPipeline + bilanMetrics.caProspection)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nombre d'affaires</p>
                <p className="text-xl md:text-2xl font-bold">{bilanMetrics.count}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Panier moyen</p>
                <p className="text-lg md:text-xl font-semibold">{fmtDT(bilanMetrics.avgMontant)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taux de réussite</p>
                <p className="text-lg md:text-xl font-semibold text-emerald-600">
                  {bilanMetrics.countRealise + bilanMetrics.countPerdu > 0 
                    ? Math.round((bilanMetrics.countRealise / (bilanMetrics.countRealise + bilanMetrics.countPerdu || 1)) * 100) 
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-100">
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              Formations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">CA Total</p>
                <p className="text-xl md:text-2xl font-bold text-amber-600">{fmtDT(formationMetrics.caRealise + formationMetrics.caPipeline + formationMetrics.caProspection)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nombre d'affaires</p>
                <p className="text-xl md:text-2xl font-bold">{formationMetrics.count}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Panier moyen</p>
                <p className="text-lg md:text-xl font-semibold">{fmtDT(formationMetrics.avgMontant)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taux de réussite</p>
                <p className="text-lg md:text-xl font-semibold text-amber-600">
                  {formationMetrics.countRealise + formationMetrics.countPerdu > 0 
                    ? Math.round((formationMetrics.countRealise / (formationMetrics.countRealise + formationMetrics.countPerdu || 1)) * 100) 
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm md:text-base">Évolution mensuelle du CA</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={10} />
                <YAxis stroke="#6b7280" fontSize={10} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip 
                  formatter={(value: number) => [fmtDT(value), '']}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="realise" stroke="#22c55e" strokeWidth={2} name="Réalisé" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="pipeline" stroke="#0ea5e9" strokeWidth={2} name="Pipeline" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="prospect" stroke="#f59e0b" strokeWidth={2} name="Prospection" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm md:text-base">Répartition par type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPieChart>
                <Pie
                  data={typeDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeDistributionData.map((entry, index) => (
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
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={statusDistributionData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" tickFormatter={(value) => `${value / 1000}k`} />
              <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={10} width={60} />
              <Tooltip formatter={(value: number) => [fmtDT(value), '']} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {statusDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
