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
  
  // Prepare chart data
  const chartData = data.mois.map((m) => ({
    month: MOIS[m.mois],
    prevu: Number(m.caTotalPrevu),
    reel: Number(m.caReelRealise),
    bilans: Number(m.caBilansPrevu),
    formations: Number(m.caFormationsPrevu),
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

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm md:text-base">Évolution mensuelle CA (Prévu vs Réalisé)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={10} />
              <YAxis stroke="#6b7280" fontSize={10} tickFormatter={(value) => `${value / 1000}k`} />
              <Tooltip 
                formatter={(value: number) => [fmtDT(value), '']}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
              />
              <Line type="monotone" dataKey="prevu" stroke="#22c55e" strokeWidth={2} name="Prévu" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="reel" stroke="#3b82f6" strokeWidth={2} name="Réalisé" dot={{ r: 4 }} />
            </LineChart>
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
