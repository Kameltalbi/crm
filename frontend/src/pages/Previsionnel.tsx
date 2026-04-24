import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fmtDT, MOIS } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Previsionnel } from '@/types';

export function Previsionnel() {
  const [annee, setAnnee] = useState(2026);
  const { data } = useQuery<Previsionnel>({
    queryKey: ['previsionnel', annee],
    queryFn: () => api.get(`/previsionnel/${annee}`).then((r) => r.data),
  });

  if (!data) return <div className="text-center py-20 text-muted-foreground">Chargement...</div>;

  const maxV = Math.max(...data.mois.map((m) => m.caTotalPrevu), 1);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Prévisionnel</h1>
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
      <div className="rounded-xl bg-gradient-to-br from-leaf to-leaf-mid text-white p-5 grid grid-cols-4 gap-5">
        <NetItem label="CA Brut HT" value={fmtDT(data.totaux.caBrutHT)} />
        <NetItem label="Commissions partenaire" value={fmtDT(data.totaux.commissionEstimee)} sub="40% sur apports partenaire" />
        <NetItem label="TVA à reverser" value={fmtDT(data.totaux.tvaCollectee)} />
        <NetItem label="MON NET (après comm.)" value={fmtDT(data.totaux.netHT)} highlight />
      </div>

      {/* Mois grid */}
      <div className="grid grid-cols-4 gap-3">
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
