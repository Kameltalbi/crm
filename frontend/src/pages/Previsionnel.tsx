import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fmtDT, MOIS } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { Previsionnel } from '@/types';

export function Previsionnel() {
  const [annee, setAnnee] = useState(2026);
  const { data } = useQuery<Previsionnel>({
    queryKey: ['previsionnel', annee],
    queryFn: () => api.get(`/previsionnel/${annee}`).then((r) => r.data),
  });

  if (!data) return <div className="text-center py-20 text-muted-foreground">Chargement...</div>;

  const maxV = Math.max(...data.mois.map((m) => m.caTotalPrevu), 1);
  
  // Prepare chart data with stacked bars (realized + predicted)
  const chartData = data.mois.map((m) => ({
    month: MOIS[m.mois],
    realise: m.caReelRealise,
    prevu: m.caPrevuMois || 0,
    total: (m.caReelRealise || 0) + (m.caPrevuMois || 0),
  }));

  return (
    <div className="space-y-6 px-2 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl">Prévisionnel</h1>
          <p className="text-sm text-muted-foreground">Prévisions mensuelles sur 3 ans</p>
        </div>
        <div className="flex gap-2">
          {[2026, 2027, 2028].map((y) => (
            <Button
              key={y}
              variant={annee === y ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAnnee(y)}
            >
              {y}
            </Button>
          ))}
        </div>
      </div>

      {/* Net banner */}
      <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-4 md:p-5 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        <NetItem label="CA Brut HT" value={fmtDT(data.totaux.caBrutHT)} />
        <NetItem label="Commissions partenaire" value={fmtDT(data.totaux.commissionEstimee)} sub="40% sur apports partenaire" />
        <NetItem label="TVA à reverser" value={fmtDT(data.totaux.tvaCollectee)} />
        <NetItem label="MON NET (après comm.)" value={fmtDT(data.totaux.netHT)} highlight />
      </div>

      {/* CA Prédit au 31 décembre */}
      <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 md:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-75">Atterrissage Annuel</div>
            <div className="text-2xl md:text-3xl font-mono font-bold">{fmtDT(data.totaux.caTotalAnnuel)}</div>
          </div>
          <div className="text-xs opacity-75 text-right">
            Réalisé: {fmtDT(data.totaux.caRealiseAnnuel)} + Prévu: {fmtDT(data.totaux.caPrevuAnnuel)}
          </div>
        </div>
      </div>

      {/* Stats additionnelles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg bg-sage/20 p-3">
          <div className="text-xs text-muted-foreground">Moyenne mensuelle</div>
          <div className="text-lg font-mono font-semibold">{fmtDT(data.totaux.moyenneMensuelle)}</div>
        </div>
        <div className="rounded-lg bg-sage/20 p-3">
          <div className="text-xs text-muted-foreground">CA Projeté</div>
          <div className="text-lg font-mono font-semibold">{fmtDT(data.totaux.caProjete)}</div>
        </div>
        <div className="rounded-lg bg-sage/20 p-3">
          <div className="text-xs text-muted-foreground">Mois courant</div>
          <div className="text-lg font-mono font-semibold">{MOIS[data.totaux.moisCourant]}</div>
        </div>
        <div className="rounded-lg bg-sage/20 p-3">
          <div className="text-xs text-muted-foreground">Projection</div>
          <div className="text-lg font-mono font-semibold">Auto</div>
        </div>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm md:text-base">Évolution mensuelle CA (Réalisé + Prévisionnel)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={10} />
              <YAxis stroke="#6b7280" fontSize={10} tickFormatter={(value) => `${value / 1000}k`} />
              <Tooltip 
                formatter={(value: number) => [fmtDT(value), '']}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="realise" stackId="ca" fill="#3b82f6" name="Réalisé" />
              <Bar dataKey="prevu" stackId="ca" fill="#22c55e" name="Prévisionnel" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Mois grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {data.mois.map((m) => {
          const pct = Math.round((m.caTotalPrevu / maxV) * 100);
          const chargeColor =
            m.chargeJours > 16 ? 'text-coral' :
            m.chargeJours > 12 ? 'text-amber' : 'text-leaf';
          return (
            <Card key={m.id} className={m.estEte ? 'border-coral/30 bg-coral-light/20' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm ${m.estEte ? 'text-coral' : ''}`}>
                  {m.estEte ? '🌞 ' : ''}{MOIS[m.mois]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs">
                {m.estEte ? (
                  <div className="text-coral text-center py-2">Creux estival</div>
                ) : (
                  <>
                    <Row label={`🌍 Bilans (${m.nbBilansPrevu})`} value={m.caBilansPrevu ? fmtDT(m.caBilansPrevu) : '–'} />
                    <Row label={`📚 Form. (${m.joursFormation}j)`} value={m.caFormationsPrevu ? fmtDT(m.caFormationsPrevu) : '–'} />
                    {m.caReelRealise > 0 && (
                      <Row label="✅ Réel" value={fmtDT(m.caReelRealise)} color="text-leaf font-semibold" />
                    )}
                    {m.commissionEstimee > 0 && (
                      <Row label="🤝 Commission" value={`-${fmtDT(m.commissionEstimee)}`} color="text-purple" />
                    )}
                    <div className="flex justify-between pt-1 mt-1 border-t">
                      <span className={chargeColor}>⚙️ {m.chargeJours}j</span>
                      <span className="font-mono font-semibold text-leaf">{fmtDT(m.caTotalPrevu)}</span>
                    </div>
                    <div className="bg-sage-deep rounded h-1 overflow-hidden">
                      <div className="bg-leaf-light h-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function NetItem({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider opacity-75 mb-1">{label}</div>
      <div className={`font-mono ${highlight ? 'text-[26px] text-white font-bold' : 'text-lg'}`}>{value}</div>
      {sub && <div className="text-[10px] opacity-60 mt-0.5">{sub}</div>}
    </div>
  );
}

function Row({ label, value, color = '' }: { label: string; value: string; color?: string }) {
  return (
    <div className={`flex justify-between ${color}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
