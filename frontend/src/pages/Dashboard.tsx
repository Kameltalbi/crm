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

export function Dashboard() {
  const [selectedYear, setSelectedYear] = useState(2026);

  const { data: kpis } = useQuery<KPIs>({
    queryKey: ['kpis', selectedYear],
    queryFn: () => api.get(`/kpis?annee=${selectedYear}`).then((r) => r.data),
  });
  const { data: affaires } = useQuery<Affaire[]>({
    queryKey: ['affaires', selectedYear],
    queryFn: () => api.get(`/affaires?annee=${selectedYear}`).then((r) => r.data),
  });
  const { data: previsionnel } = useQuery({
    queryKey: ['previsionnel', selectedYear],
    queryFn: () => api.get(`/previsionnel/${selectedYear}`).then((r) => r.data),
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

  // Calculate cumulative CA from previsionnel data
  const cumulativeData = previsionnel?.mois ? previsionnel.mois.map((m: any, index: number) => {
    const cumulative = previsionnel.mois.slice(0, index + 1).reduce((sum: number, month: any) => sum + month.caTotalPrevu, 0);
    return {
      month: MOIS_S[m.mois],
      cumulative: cumulative,
      monthly: m.caTotalPrevu,
    };
  }) : [];

  // Total cumulative CA for the year
  const totalCumulativeCA = cumulativeData.length > 0 ? cumulativeData[cumulativeData.length - 1].cumulative : 0;

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
          <p className="text-sm text-muted-foreground">Vue d'ensemble — {selectedYear}</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
              <SelectItem value="2028">2028</SelectItem>
            </SelectContent>
          </Select>
          <Link to="/affaires" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto"><Plus size={16} />Nouvelle affaire</Button>
          </Link>
        </div>
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
          title="CA prévisionnel cumulé"
          value={fmtDT(totalCumulativeCA)}
          subtitle={`Année ${selectedYear}`}
          icon={<Wallet className="w-5 h-5" />}
          trend="+15%"
          trendUp={true}
          color="blue"
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
          color="purple"
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
              <Bar dataKey="value" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cumulative CA Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm md:text-base">CA prévisionnel cumulé ({selectedYear})</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => [fmtDT(value), '']} />
              <Legend />
              <Line type="monotone" dataKey="cumulative" stroke="#22c55e" strokeWidth={2} name="Cumulé" />
              <Line type="monotone" dataKey="monthly" stroke="#0ea5e9" strokeWidth={2} name="Mensuel" />
            </LineChart>
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
