import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Handshake, Calendar, Wallet, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { fmtDT, MOIS_S } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/form-controls';
import { Button } from '@/components/ui/button';
import type { KPIs, Affaire } from '@/types';

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

  const maxMonth = Math.max(
    ...Object.values(kpis.parMois).map((m) => m.realise + m.pipeline + m.prospect),
    1
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble — 2026</p>
        </div>
        <Link to="/affaires">
          <Button><Plus size={16} />Nouvelle affaire</Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3">
        <KpiCard
          label="CA Réalisé 2026"
          value={fmtDT(kpis.caRealise)}
          sub={`${kpis.counts.realise} affaire${kpis.counts.realise > 1 ? 's' : ''}`}
          color="leaf"
          icon={<TrendingUp size={18} />}
        />
        <KpiCard
          label="Pipeline confirmé"
          value={fmtDT(kpis.caPipeline)}
          sub={`${kpis.counts.pipeline} affaire${kpis.counts.pipeline > 1 ? 's' : ''}`}
          color="sky"
          icon={<Calendar size={18} />}
        />
        <KpiCard
          label="Total projeté"
          value={fmtDT(kpis.caTotal)}
          sub="Réalisé + Pipeline + Pros."
          color="amber"
          icon={<TrendingUp size={18} />}
        />
        <KpiCard
          label="Commissions dues"
          value={fmtDT(kpis.commissionPartenaireDue)}
          sub="40% partenaire"
          color="purple"
          icon={<Handshake size={18} />}
        />
        <KpiCard
          label="Mon net (après comm.)"
          value={fmtDT(kpis.netRealise)}
          sub="Sur affaires réalisées"
          color="coral"
          icon={<Wallet size={18} />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: '✅ Réalisé',    value: kpis.caRealise,    color: 'bg-leaf' },
              { label: '🔵 Pipeline',   value: kpis.caPipeline,   color: 'bg-sky' },
              { label: '🟡 Prospection',value: kpis.caProspection,color: 'bg-amber' },
            ].map((row) => {
              const total = kpis.caRealise + kpis.caPipeline + kpis.caProspection || 1;
              const pct = Math.round((row.value / total) * 100);
              return (
                <div key={row.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{row.label}</span>
                    <span className="font-mono">{fmtDT(row.value)} ({pct}%)</span>
                  </div>
                  <div className="bg-sage-deep rounded h-1.5 overflow-hidden">
                    <div className={`${row.color} h-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">CA mensuel 2026</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-20">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((mi) => {
                const d = kpis.parMois[mi] || { realise: 0, pipeline: 0, prospect: 0 };
                const h = (v: number) => Math.max(Math.round((v / maxMonth) * 70), 0);
                return (
                  <div key={mi} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex flex-col w-full justify-end" style={{ height: 70 }}>
                      {d.prospect > 0 && <div className="bg-amber rounded-t-sm" style={{ height: h(d.prospect) }} />}
                      {d.pipeline > 0 && <div className="bg-sky" style={{ height: h(d.pipeline) }} />}
                      {d.realise > 0 && <div className="bg-leaf-light rounded-t-sm" style={{ height: h(d.realise) }} />}
                    </div>
                    <div className="text-[9px] text-muted-foreground">{MOIS_S[mi]}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground mt-2">
              <span>🟢 Réalisé</span><span>🔵 Pipeline</span><span>🟡 Prospection</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Récentes affaires */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Dernières affaires</CardTitle>
          <Link to="/affaires">
            <Button variant="outline" size="sm">Tout voir</Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-sage">
                <th className="text-left p-3 text-xs uppercase tracking-wider text-leaf font-semibold">Client</th>
                <th className="text-left p-3 text-xs uppercase tracking-wider text-leaf font-semibold">Type</th>
                <th className="text-right p-3 text-xs uppercase tracking-wider text-leaf font-semibold">HT</th>
                <th className="text-left p-3 text-xs uppercase tracking-wider text-leaf font-semibold">Statut</th>
                <th className="text-left p-3 text-xs uppercase tracking-wider text-leaf font-semibold">Partenaire</th>
                <th className="text-left p-3 text-xs uppercase tracking-wider text-leaf font-semibold">Mois</th>
              </tr>
            </thead>
            <tbody>
              {affaires.slice(0, 8).map((a) => (
                <tr key={a.id} className={`border-b hover:bg-sage/50 ${a.viaPartenaire ? 'bg-purple-light/30' : ''}`}>
                  <td className="p-3"><strong>{a.client.name}</strong></td>
                  <td className="p-3">{a.type === 'BILAN_CARBONE' ? <Badge variant="secondary">🌍 Bilan</Badge> : <Badge className="bg-gold text-white">📚 Formation</Badge>}</td>
                  <td className="p-3 text-right font-mono">{fmtDT(a.montantHT)}</td>
                  <td className="p-3"><StatutBadge statut={a.statut} /></td>
                  <td className="p-3">{a.viaPartenaire ? <Badge className="bg-purple text-white">🤝 Partenaire</Badge> : <span className="text-xs text-muted-foreground">Direct</span>}</td>
                  <td className="p-3 text-xs text-muted-foreground">{MOIS_S[a.moisPrevu]} {a.anneePrevue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: string; icon: React.ReactNode }) {
  const borderColors: Record<string, string> = {
    leaf: 'border-l-leaf',
    sky: 'border-l-sky',
    amber: 'border-l-amber',
    purple: 'border-l-purple',
    coral: 'border-l-coral',
  };
  return (
    <Card className={`border-l-4 ${borderColors[color]}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className="text-muted-foreground/40">{icon}</div>
        </div>
        <div className="font-mono text-xl font-medium">{value}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
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
