import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form-controls';

export function CommissionSettings() {
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
      alert('Configuration sauvegardée avec succès. Les primes seront calculées automatiquement.');
    },
  });

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Configuration des Primes Commerciales</h2>
        <p className="text-sm text-muted-foreground">Définissez comment les primes sont calculées pour vos commerciaux</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Type de calcul et périodicité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paramètres additionnels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div>
            <Label>Délai de paiement client (jours)</Label>
            <Input type="number" value={config.paymentDelay} onChange={(e) => setConfig({ ...config, paymentDelay: Number(e.target.value) })} placeholder="30" />
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
        </CardContent>
      </Card>
    </div>
  );
}
