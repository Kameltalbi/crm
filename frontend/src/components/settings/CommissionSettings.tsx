import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const EMPTY_CONFIG = {
  name: '',
  calculationType: 'SIMPLE',
  periodicity: 'MONTHLY',
  simpleRate: 0,
  minThreshold: 0,
  maxCap: '',
  includeNewClients: true,
  includeRenewals: true,
  includeRecurring: true,
  paymentDelay: 30,
};

const CALC_LABELS: Record<string, string> = {
  SIMPLE: 'Simple (% fixe)',
  TIERS: 'Par paliers',
  PROGRESSIVE: 'Progressif',
  CUSTOM: 'Personnalisé',
};

const PERIOD_LABELS: Record<string, string> = {
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  SEMI_ANNUAL: 'Semestriel',
  ANNUAL: 'Annuel',
};

export function CommissionSettings() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ ...EMPTY_CONFIG });
  const [editId, setEditId] = useState<string | null>(null);

  const { data: configs = [] } = useQuery<any[]>({
    queryKey: ['commission-configs'],
    queryFn: () => api.get('/commissions/config').then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (editId) {
        return api.put(`/commissions/config/${editId}`, data);
      }
      return api.post('/commissions/config', data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commission-configs'] });
      setOpen(false);
      setForm({ ...EMPTY_CONFIG });
      setEditId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/commissions/config/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commission-configs'] });
    },
  });

  const handleNew = () => {
    setForm({ ...EMPTY_CONFIG });
    setEditId(null);
    setOpen(true);
  };

  const handleEdit = (config: any) => {
    let tiers: any[] = [];
    let progressiveRules: any[] = [];
    try { tiers = config.tierConfig ? JSON.parse(config.tierConfig) : []; } catch { tiers = []; }
    try { progressiveRules = config.progressiveConfig ? JSON.parse(config.progressiveConfig) : []; } catch { progressiveRules = []; }
    setForm({
      name: config.name || '',
      calculationType: config.calculationType,
      periodicity: config.periodicity,
      simpleRate: Number(config.simpleRate) || 0,
      minThreshold: Number(config.minThreshold) || 0,
      maxCap: config.maxCap ? String(config.maxCap) : '',
      includeNewClients: config.includeNewClients ?? true,
      includeRenewals: config.includeRenewals ?? true,
      includeRecurring: config.includeRecurring ?? true,
      paymentDelay: config.paymentDelay || 30,
      tiers,
      progressiveRules,
    });
    setEditId(config.id);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce mécanisme de prime ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      alert('Veuillez saisir un nom pour le mécanisme de prime');
      return;
    }
    const payload = { ...form };
    if (form.calculationType === 'TIERS' && form.tiers) {
      payload.tierConfig = JSON.stringify(form.tiers);
    }
    if (form.calculationType === 'PROGRESSIVE' && form.progressiveRules) {
      payload.progressiveConfig = JSON.stringify(form.progressiveRules);
    }
    delete payload.tiers;
    delete payload.progressiveRules;
    saveMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Mécanismes de Primes</h2>
          <p className="text-sm text-muted-foreground">Gérez les différents mécanismes de calcul des primes commerciales</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus size={16} /> Nouveau mécanisme
        </Button>
      </div>

      {/* List of configs */}
      {configs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun mécanisme de prime configuré. Cliquez sur "Nouveau mécanisme" pour en créer un.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {configs.map((config: any) => (
            <Card key={config.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-base">{config.name || 'Sans nom'}</h3>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Type: <strong>{CALC_LABELS[config.calculationType] || config.calculationType}</strong></span>
                      <span>Périodicité: <strong>{PERIOD_LABELS[config.periodicity] || config.periodicity}</strong></span>
                      {config.calculationType === 'SIMPLE' && (
                        <span>Taux: <strong>{Number(config.simpleRate)}%</strong></span>
                      )}
                      {config.maxCap && (
                        <span>Plafond: <strong>{Number(config.maxCap)} DT</strong></span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(config)}>
                      <Pencil size={16} />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(config.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog for create/edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'Modifier le mécanisme' : 'Nouveau mécanisme de prime'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nom du mécanisme *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Prime mensuelle commerciaux" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type de calcul</Label>
                <Select value={form.calculationType} onValueChange={(v) => setForm({ ...form, calculationType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SIMPLE">Simple (% fixe)</SelectItem>
                    <SelectItem value="TIERS">Par paliers</SelectItem>
                    <SelectItem value="PROGRESSIVE">Progressif</SelectItem>
                    <SelectItem value="CUSTOM">Personnalisé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Périodicité</Label>
                <Select value={form.periodicity} onValueChange={(v) => setForm({ ...form, periodicity: v })}>
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
            {form.calculationType === 'SIMPLE' && (
              <div className="space-y-1.5">
                <Label>Taux de commission (%)</Label>
                <Input type="number" value={form.simpleRate} onChange={(e) => setForm({ ...form, simpleRate: Number(e.target.value) })} placeholder="Ex: 5" />
              </div>
            )}
            {form.calculationType === 'TIERS' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Paliers d'atteinte</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => {
                    const tiers = form.tiers || [];
                    setForm({ ...form, tiers: [...tiers, { min: tiers.length > 0 ? tiers[tiers.length - 1].max : 0, max: 100, rate: 0 }] });
                  }}>
                    <Plus size={14} className="mr-1" /> Ajouter un palier
                  </Button>
                </div>
                {(form.tiers || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucun palier défini. Ajoutez des paliers pour configurer les taux par seuil d'atteinte.</p>
                )}
                {(form.tiers || []).map((tier: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input type="number" value={tier.min} placeholder="Min %" onChange={(e) => {
                        const tiers = [...(form.tiers || [])];
                        tiers[idx] = { ...tiers[idx], min: Number(e.target.value) };
                        setForm({ ...form, tiers });
                      }} />
                    </div>
                    <span className="text-sm text-muted-foreground">à</span>
                    <div className="flex-1">
                      <Input type="number" value={tier.max} placeholder="Max %" onChange={(e) => {
                        const tiers = [...(form.tiers || [])];
                        tiers[idx] = { ...tiers[idx], max: Number(e.target.value) };
                        setForm({ ...form, tiers });
                      }} />
                    </div>
                    <span className="text-sm text-muted-foreground">→</span>
                    <div className="flex-1">
                      <Input type="number" value={tier.rate} placeholder="Taux %" onChange={(e) => {
                        const tiers = [...(form.tiers || [])];
                        tiers[idx] = { ...tiers[idx], rate: Number(e.target.value) };
                        setForm({ ...form, tiers });
                      }} />
                    </div>
                    <span className="text-sm text-muted-foreground">%</span>
                    <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => {
                      const tiers = [...(form.tiers || [])];
                      tiers.splice(idx, 1);
                      setForm({ ...form, tiers });
                    }}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {form.calculationType === 'PROGRESSIVE' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Règles progressives</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => {
                    const rules = form.progressiveRules || [];
                    setForm({ ...form, progressiveRules: [...rules, { min: rules.length > 0 ? rules[rules.length - 1].max : 0, max: 100, multiplier: 1 }] });
                  }}>
                    <Plus size={14} className="mr-1" /> Ajouter une règle
                  </Button>
                </div>
                {(form.progressiveRules || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucune règle définie. Ajoutez des règles progressives.</p>
                )}
                {(form.progressiveRules || []).map((rule: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input type="number" value={rule.min} placeholder="Min %" onChange={(e) => {
                        const rules = [...(form.progressiveRules || [])];
                        rules[idx] = { ...rules[idx], min: Number(e.target.value) };
                        setForm({ ...form, progressiveRules: rules });
                      }} />
                    </div>
                    <span className="text-sm text-muted-foreground">à</span>
                    <div className="flex-1">
                      <Input type="number" value={rule.max} placeholder="Max %" onChange={(e) => {
                        const rules = [...(form.progressiveRules || [])];
                        rules[idx] = { ...rules[idx], max: Number(e.target.value) };
                        setForm({ ...form, progressiveRules: rules });
                      }} />
                    </div>
                    <span className="text-sm text-muted-foreground">×</span>
                    <div className="flex-1">
                      <Input type="number" step="0.01" value={rule.multiplier} placeholder="Multiplicateur" onChange={(e) => {
                        const rules = [...(form.progressiveRules || [])];
                        rules[idx] = { ...rules[idx], multiplier: Number(e.target.value) };
                        setForm({ ...form, progressiveRules: rules });
                      }} />
                    </div>
                    <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => {
                      const rules = [...(form.progressiveRules || [])];
                      rules.splice(idx, 1);
                      setForm({ ...form, progressiveRules: rules });
                    }}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Seuil minimum (DT)</Label>
                <Input type="number" value={form.minThreshold} onChange={(e) => setForm({ ...form, minThreshold: Number(e.target.value) })} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Plafond maximum (DT)</Label>
                <Input type="number" value={form.maxCap} onChange={(e) => setForm({ ...form, maxCap: e.target.value })} placeholder="Illimité" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Délai de paiement client (jours)</Label>
              <Input type="number" value={form.paymentDelay} onChange={(e) => setForm({ ...form, paymentDelay: Number(e.target.value) })} placeholder="30" />
            </div>
            <div className="space-y-2">
              <Label>Types de ventes inclus</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.includeNewClients} onChange={(e) => setForm({ ...form, includeNewClients: e.target.checked })} />
                  Nouveaux clients
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.includeRenewals} onChange={(e) => setForm({ ...form, includeRenewals: e.target.checked })} />
                  Renouvellements
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.includeRecurring} onChange={(e) => setForm({ ...form, includeRecurring: e.target.checked })} />
                  Récurrent
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
