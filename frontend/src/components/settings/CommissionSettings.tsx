import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  baseBonus: 0,
  minThreshold: 0,
  maxCap: '',
  includeNewClients: true,
  includeRenewals: true,
  includeRecurring: true,
  paymentDelay: 30,
};

const CALC_LABELS: Record<string, string> = {
  SIMPLE: 'Taux fixe',
  TIERS: 'Paliers (recommandé)',
  PROGRESSIVE: 'Progressif',
  CUSTOM: 'Avancé',
};

const PERIOD_LABELS: Record<string, string> = {
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  SEMI_ANNUAL: 'Semestriel',
  ANNUAL: 'Annuel',
};

export function CommissionSettings() {
  const { t } = useTranslation();
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
    let customMeta: any = {};
    try { customMeta = config.customFormula ? JSON.parse(config.customFormula) : {}; } catch { customMeta = {}; }
    setForm({
      name: config.name || '',
      calculationType: config.calculationType,
      periodicity: config.periodicity,
      simpleRate: Number(config.simpleRate) || 0,
      baseBonus: Number(customMeta.baseBonus) || 0,
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
    payload.customFormula = JSON.stringify({ baseBonus: Number(form.baseBonus || 0) });
    delete payload.tiers;
    delete payload.progressiveRules;
    delete payload.baseBonus;
    saveMutation.mutate(payload);
  };

  const getTierValueLabel = (formulaType?: string) => {
    switch (formulaType) {
      case 'PERCENT_OF_SALES':
        return t('commissionSettings.tier.valueLabels.percentOfSales');
      case 'BASE_X_ACHIEVEMENT':
        return t('commissionSettings.tier.valueLabels.baseAchievementCoefficient');
      case 'BASE_X_MULTIPLIER':
        return t('commissionSettings.tier.valueLabels.baseMultiplier');
      case 'FIXED_AMOUNT':
        return t('commissionSettings.tier.valueLabels.fixedAmount');
      default:
        return t('commissionSettings.tier.valueLabels.value');
    }
  };

  const getTierValuePlaceholder = (formulaType?: string) => {
    switch (formulaType) {
      case 'PERCENT_OF_SALES':
        return t('commissionSettings.examples.percent');
      case 'BASE_X_ACHIEVEMENT':
        return t('commissionSettings.examples.achievementFactor');
      case 'BASE_X_MULTIPLIER':
        return t('commissionSettings.examples.multiplier');
      case 'FIXED_AMOUNT':
        return t('commissionSettings.examples.fixedAmount');
      default:
        return t('commissionSettings.tier.valueLabels.value');
    }
  };

  const getTierExplanation = (formulaType?: string) => {
    switch (formulaType) {
      case 'PERCENT_OF_SALES':
        return t('commissionSettings.tier.explanations.percentOfSales');
      case 'BASE_X_ACHIEVEMENT':
        return t('commissionSettings.tier.explanations.baseAchievement');
      case 'BASE_X_MULTIPLIER':
        return t('commissionSettings.tier.explanations.baseMultiplier');
      case 'FIXED_AMOUNT':
        return t('commissionSettings.tier.explanations.fixedAmount');
      default:
        return '';
    }
  };

  const getCalculationTypeHelp = (calculationType: string) => {
    switch (calculationType) {
      case 'SIMPLE':
        return t('commissionSettings.typeHelp.simple');
      case 'TIERS':
        return t('commissionSettings.typeHelp.tiers');
      case 'PROGRESSIVE':
        return t('commissionSettings.typeHelp.progressive');
      case 'CUSTOM':
        return t('commissionSettings.typeHelp.custom');
      default:
        return '';
    }
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
                {(() => {
                  let meta: any = {};
                  try { meta = config.customFormula ? JSON.parse(config.customFormula) : {}; } catch { meta = {}; }
                  return (
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-base">{config.name || 'Sans nom'}</h3>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Type: <strong>{CALC_LABELS[config.calculationType] || config.calculationType}</strong></span>
                      <span>Périodicité: <strong>{PERIOD_LABELS[config.periodicity] || config.periodicity}</strong></span>
                      {config.calculationType === 'SIMPLE' && (
                        <span>Taux: <strong>{Number(config.simpleRate)}%</strong></span>
                      )}
                      {config.calculationType === 'TIERS' && Number(meta.baseBonus) > 0 && (
                        <span>Base: <strong>{Number(meta.baseBonus)} DT</strong></span>
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
                  );
                })()}
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
                    <SelectItem value="TIERS">Paliers (recommandé)</SelectItem>
                    <SelectItem value="SIMPLE">Taux fixe</SelectItem>
                    <SelectItem value="PROGRESSIVE">Progressif</SelectItem>
                    <SelectItem value="CUSTOM">Avancé</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {getCalculationTypeHelp(form.calculationType)}
                </p>
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
                <Label>{t('commissionSettings.simpleRate')}</Label>
                <Input type="number" value={form.simpleRate} onChange={(e) => setForm({ ...form, simpleRate: Number(e.target.value) })} placeholder="Ex: 5" />
                <p className="text-xs text-muted-foreground">
                  {t('commissionSettings.simpleRateHint')}
                </p>
              </div>
            )}
            {form.calculationType === 'TIERS' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{t('commissionSettings.baseBonus')}</Label>
                  <Input
                    type="number"
                    value={form.baseBonus}
                    onChange={(e) => setForm({ ...form, baseBonus: Number(e.target.value) })}
                    placeholder={t('commissionSettings.examples.baseBonus')}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('commissionSettings.baseBonusHint')}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <Label>{t('commissionSettings.tier.title')}</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => {
                    const tiers = form.tiers || [];
                    setForm({
                      ...form,
                      tiers: [
                        ...tiers,
                        {
                          min: tiers.length > 0 ? tiers[tiers.length - 1].max : 0,
                          max: tiers.length > 0 ? tiers[tiers.length - 1].max + 10 : 10,
                          formulaType: 'PERCENT_OF_SALES',
                          value: 0,
                        },
                      ],
                    });
                  }}>
                    <Plus size={14} className="mr-1" /> {t('commissionSettings.tier.add')}
                  </Button>
                </div>
                {(form.tiers || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">{t('commissionSettings.tier.empty')}</p>
                )}
                {(form.tiers || []).map((tier: any, idx: number) => (
                  <div key={idx} className="border rounded-md p-3 space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">{t('commissionSettings.tier.item', { index: idx + 1 })}</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">{t('commissionSettings.tier.min')}</Label>
                      <Input type="number" value={tier.min} placeholder={t('commissionSettings.tier.minPlaceholder')} onChange={(e) => {
                        const tiers = [...(form.tiers || [])];
                        tiers[idx] = { ...tiers[idx], min: Number(e.target.value) };
                        setForm({ ...form, tiers });
                      }} />
                      </div>
                      <span className="text-sm text-muted-foreground mt-5">à</span>
                      <div className="flex-1">
                        <Label className="text-xs">{t('commissionSettings.tier.max')}</Label>
                      <Input type="number" value={tier.max} placeholder={t('commissionSettings.tier.maxPlaceholder')} onChange={(e) => {
                        const tiers = [...(form.tiers || [])];
                        tiers[idx] = { ...tiers[idx], max: Number(e.target.value) };
                        setForm({ ...form, tiers });
                      }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">{t('commissionSettings.tier.mechanism')}</Label>
                      <Select value={tier.formulaType || 'PERCENT_OF_SALES'} onValueChange={(v) => {
                        const tiers = [...(form.tiers || [])];
                        tiers[idx] = { ...tiers[idx], formulaType: v };
                        setForm({ ...form, tiers });
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENT_OF_SALES">{t('commissionSettings.tier.formula.percentOfSales')}</SelectItem>
                          <SelectItem value="BASE_X_ACHIEVEMENT">{t('commissionSettings.tier.formula.baseAchievement')}</SelectItem>
                          <SelectItem value="BASE_X_MULTIPLIER">{t('commissionSettings.tier.formula.baseMultiplier')}</SelectItem>
                          <SelectItem value="FIXED_AMOUNT">{t('commissionSettings.tier.formula.fixedAmount')}</SelectItem>
                        </SelectContent>
                      </Select>
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">{getTierValueLabel(tier.formulaType || 'PERCENT_OF_SALES')}</Label>
                        <Input type="number" step="0.01" value={tier.value ?? tier.rate ?? 0} placeholder={getTierValuePlaceholder(tier.formulaType || 'PERCENT_OF_SALES')} onChange={(e) => {
                        const tiers = [...(form.tiers || [])];
                        tiers[idx] = { ...tiers[idx], value: Number(e.target.value) };
                        setForm({ ...form, tiers });
                      }} />
                      </div>
                      <Button type="button" size="sm" variant="ghost" className="text-destructive mt-5" onClick={() => {
                      const tiers = [...(form.tiers || [])];
                      tiers.splice(idx, 1);
                      setForm({ ...form, tiers });
                    }}>
                      <Trash2 size={14} />
                    </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{getTierExplanation(tier.formulaType || 'PERCENT_OF_SALES')}</p>
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
                    setForm({
                      ...form,
                      progressiveRules: [
                        ...rules,
                        {
                          min: rules.length > 0 ? rules[rules.length - 1].max : 0,
                          max: rules.length > 0 ? rules[rules.length - 1].max + 20 : 100,
                          multiplier: 1,
                          continueAboveMax: false,
                        },
                      ],
                    });
                  }}>
                    <Plus size={14} className="mr-1" /> Ajouter une règle
                  </Button>
                </div>
                {(form.progressiveRules || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucune règle définie. Ajoutez des règles progressives.</p>
                )}
                {(form.progressiveRules || []).map((rule: any, idx: number) => (
                  <div key={idx} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center gap-2">
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
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={!!rule.continueAboveMax}
                        onChange={(e) => {
                          const rules = [...(form.progressiveRules || [])];
                          rules[idx] = { ...rules[idx], continueAboveMax: e.target.checked };
                          setForm({ ...form, progressiveRules: rules });
                        }}
                      />
                      Appliquer cette règle même si le taux dépasse le maximum
                    </label>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('commissionSettings.minimumPayout')}</Label>
                <Input type="number" value={form.minThreshold} onChange={(e) => setForm({ ...form, minThreshold: Number(e.target.value) })} placeholder="0" />
                <p className="text-xs text-muted-foreground">
                  {t('commissionSettings.minimumPayoutHint')}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>{t('commissionSettings.maximumPayout')}</Label>
                <Input type="number" value={form.maxCap} onChange={(e) => setForm({ ...form, maxCap: e.target.value })} placeholder={t('commissionSettings.maximumPayoutPlaceholder')} />
                <p className="text-xs text-muted-foreground">
                  {t('commissionSettings.maximumPayoutHint')}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('commissionSettings.paymentDelay')}</Label>
              <Input type="number" value={form.paymentDelay} onChange={(e) => setForm({ ...form, paymentDelay: Number(e.target.value) })} placeholder="30" />
              <p className="text-xs text-muted-foreground">
                {t('commissionSettings.paymentDelayHint')}
              </p>
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
