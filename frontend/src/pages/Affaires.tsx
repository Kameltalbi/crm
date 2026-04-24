import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, FileText, Receipt, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDT, MOIS } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge } from '@/components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { StatutBadge } from './Dashboard';
import type { Affaire, Client, AffaireType, StatutAffaire } from '@/types';

type FormData = {
  id?: string;
  clientId: string;
  title: string;
  type: AffaireType;
  montantHT: string;
  statut: StatutAffaire;
  probabilite: string;
  moisPrevu: string;
  anneePrevue: string;
  viaPartenaire: boolean;
  tauxCommission: string;
  notes: string;
};

const EMPTY: FormData = {
  clientId: '', title: '', type: 'BILAN_CARBONE', montantHT: '',
  statut: 'PROSPECTION', probabilite: '50',
  moisPrevu: String(new Date().getMonth() + 1), anneePrevue: '2026',
  viaPartenaire: false, tauxCommission: '40', notes: '',
};

export function Affaires() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ statut: '', type: '', annee: '2026', viaPartenaire: '' });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY);

  const { data: affaires = [] } = useQuery<Affaire[]>({
    queryKey: ['affaires', filters],
    queryFn: () => api.get('/affaires', { params: { ...filters } }).then((r) => r.data),
  });
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        clientId: data.clientId,
        title: data.title,
        type: data.type,
        montantHT: Number(data.montantHT),
        statut: data.statut,
        probabilite: Number(data.probabilite),
        moisPrevu: Number(data.moisPrevu),
        anneePrevue: Number(data.anneePrevue),
        viaPartenaire: data.viaPartenaire,
        tauxCommission: Number(data.tauxCommission),
        notes: data.notes,
      };
      return data.id
        ? api.put(`/affaires/${data.id}`, payload)
        : api.post('/affaires', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['affaires'] });
      qc.invalidateQueries({ queryKey: ['kpis'] });
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/affaires/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['affaires'] });
      qc.invalidateQueries({ queryKey: ['kpis'] });
    },
  });

  const createDevisMutation = useMutation({
    mutationFn: (id: string) => api.post(`/softfacture/devis/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affaires'] }),
  });

  const createFactureMutation = useMutation({
    mutationFn: (id: string) => api.post(`/softfacture/facture/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affaires'] }),
  });

  const handleEdit = (a: Affaire) => {
    setForm({
      id: a.id,
      clientId: a.clientId,
      title: a.title,
      type: a.type,
      montantHT: String(a.montantHT),
      statut: a.statut,
      probabilite: String(a.probabilite),
      moisPrevu: String(a.moisPrevu),
      anneePrevue: String(a.anneePrevue),
      viaPartenaire: a.viaPartenaire,
      tauxCommission: String(a.tauxCommission),
      notes: a.notes || '',
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer cette affaire ?')) deleteMutation.mutate(id);
  };

  const openNew = () => {
    setForm(EMPTY);
    setOpen(true);
  };

  const ht = Number(form.montantHT) || 0;
  const comm = form.viaPartenaire ? Math.round(ht * Number(form.tauxCommission) / 100) : 0;
  const net = ht - comm;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Affaires</h1>
          <p className="text-sm text-muted-foreground">Pipeline complet : prospection, confirmé, réalisé</p>
        </div>
        <Button onClick={openNew}><Plus size={16} />Nouvelle affaire</Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 justify-between">
          <CardTitle className="text-base">{affaires.length} affaires</CardTitle>
          <div className="flex gap-2">
            <Select value={filters.statut || 'all'} onValueChange={(v) => setFilters({ ...filters, statut: v === 'all' ? '' : v })}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Tous statuts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="PROSPECTION">🟡 Prospection</SelectItem>
                <SelectItem value="PIPELINE">🔵 Pipeline</SelectItem>
                <SelectItem value="REALISE">✅ Réalisé</SelectItem>
                <SelectItem value="PERDU">❌ Perdu</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.type || 'all'} onValueChange={(v) => setFilters({ ...filters, type: v === 'all' ? '' : v })}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="BILAN_CARBONE">🌍 Bilan</SelectItem>
                <SelectItem value="FORMATION">📚 Formation</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.viaPartenaire || 'all'} onValueChange={(v) => setFilters({ ...filters, viaPartenaire: v === 'all' ? '' : v })}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Apport" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous apports</SelectItem>
                <SelectItem value="true">🤝 Partenaire</SelectItem>
                <SelectItem value="false">👤 Direct</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.annee} onValueChange={(v) => setFilters({ ...filters, annee: v })}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
                <SelectItem value="2028">2028</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-sage">
                <th className="text-left p-2.5 uppercase tracking-wider text-leaf font-semibold">Client / Titre</th>
                <th className="text-left p-2.5 uppercase tracking-wider text-leaf font-semibold">Type</th>
                <th className="text-right p-2.5 uppercase tracking-wider text-leaf font-semibold">HT (DT)</th>
                <th className="text-right p-2.5 uppercase tracking-wider text-leaf font-semibold">TTC</th>
                <th className="text-left p-2.5 uppercase tracking-wider text-leaf font-semibold">Statut</th>
                <th className="text-left p-2.5 uppercase tracking-wider text-leaf font-semibold">Partenaire</th>
                <th className="text-right p-2.5 uppercase tracking-wider text-leaf font-semibold">Commission</th>
                <th className="text-right p-2.5 uppercase tracking-wider text-leaf font-semibold">Mon net</th>
                <th className="text-left p-2.5 uppercase tracking-wider text-leaf font-semibold">Mois</th>
                <th className="text-left p-2.5 uppercase tracking-wider text-leaf font-semibold">Devis/Fac</th>
                <th className="text-right p-2.5 uppercase tracking-wider text-leaf font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {affaires.map((a) => {
                const ht = Number(a.montantHT);
                const c = a.viaPartenaire ? Math.round(ht * Number(a.tauxCommission) / 100) : 0;
                return (
                  <tr key={a.id} className={`border-b hover:bg-sage/50 ${a.viaPartenaire ? 'bg-purple-light/20' : ''}`}>
                    <td className="p-2.5">
                      <div className="font-semibold">{a.client.name}</div>
                      <div className="text-[10px] text-muted-foreground">{a.title}</div>
                    </td>
                    <td className="p-2.5">
                      {a.type === 'BILAN_CARBONE'
                        ? <Badge variant="secondary">🌍</Badge>
                        : <Badge className="bg-gold-light text-gold">📚</Badge>}
                    </td>
                    <td className="p-2.5 text-right font-mono">{fmtDT(ht)}</td>
                    <td className="p-2.5 text-right font-mono font-semibold">{fmtDT(Math.round(ht * 1.19))}</td>
                    <td className="p-2.5"><StatutBadge statut={a.statut} /></td>
                    <td className="p-2.5">{a.viaPartenaire ? <Badge className="bg-purple text-white">🤝</Badge> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="p-2.5 text-right font-mono text-purple">{a.viaPartenaire ? fmtDT(c) : '—'}</td>
                    <td className="p-2.5 text-right font-mono font-semibold text-leaf">{fmtDT(ht - c)}</td>
                    <td className="p-2.5 text-muted-foreground">{MOIS[a.moisPrevu]}</td>
                    <td className="p-2.5">
                      <div className="flex gap-1 text-[10px]">
                        {a.devisNumero && <Badge variant="outline">D {a.devisNumero}</Badge>}
                        {a.factureNumero && <Badge className="bg-leaf text-white">F {a.factureNumero}</Badge>}
                      </div>
                    </td>
                    <td className="p-2.5 text-right">
                      <div className="flex gap-1 justify-end">
                        {!a.devisId && (
                          <Button size="sm" variant="outline" onClick={() => createDevisMutation.mutate(a.id)} title="Créer devis">
                            <FileText size={12} />
                          </Button>
                        )}
                        {!a.factureId && (
                          <Button size="sm" variant="outline" onClick={() => createFactureMutation.mutate(a.id)} title="Créer facture">
                            <Receipt size={12} />
                          </Button>
                        )}
                        {(a.devisPdfUrl || a.facturePdfUrl) && (
                          <Button size="sm" variant="outline" title="Envoyer par email">
                            <Mail size={12} />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleEdit(a)}>
                          <Pencil size={12} />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(a.id)}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Modal create/edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Modifier' : 'Nouvelle'} affaire</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as AffaireType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BILAN_CARBONE">🌍 Bilan Carbone</SelectItem>
                  <SelectItem value="FORMATION">📚 Formation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Titre *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="ex: Bilan Carbone UBCI 2026"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Montant HT (DT) *</Label>
              <Input
                type="number"
                value={form.montantHT}
                onChange={(e) => setForm({ ...form, montantHT: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Statut *</Label>
              <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v as StatutAffaire })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROSPECTION">🟡 Prospection</SelectItem>
                  <SelectItem value="PIPELINE">🔵 Pipeline</SelectItem>
                  <SelectItem value="REALISE">✅ Réalisé</SelectItem>
                  <SelectItem value="PERDU">❌ Perdu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Probabilité (%)</Label>
              <Input type="number" min="0" max="100" value={form.probabilite} onChange={(e) => setForm({ ...form, probabilite: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Mois prévu</Label>
              <Select value={form.moisPrevu} onValueChange={(v) => setForm({ ...form, moisPrevu: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOIS.slice(1).map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Année</Label>
              <Select value={form.anneePrevue} onValueChange={(v) => setForm({ ...form, anneePrevue: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                  <SelectItem value="2028">2028</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Partenaire toggle */}
          <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${form.viaPartenaire ? 'border-purple bg-purple-light' : 'border-border'}`}>
            <input
              type="checkbox"
              checked={form.viaPartenaire}
              onChange={(e) => setForm({ ...form, viaPartenaire: e.target.checked })}
              className="w-4 h-4 accent-purple"
            />
            <span className="text-sm font-medium">🤝 Affaire apportée par le partenaire (commission 40% HT)</span>
          </label>

          {form.viaPartenaire && ht > 0 && (
            <div className="bg-purple-light border border-purple/30 rounded-lg p-3 space-y-1 text-sm">
              <div className="text-[10px] uppercase text-purple font-bold">Détail commission</div>
              <div className="flex justify-between"><span>Montant HT</span><span className="font-mono">{fmtDT(ht)}</span></div>
              <div className="flex justify-between text-purple"><span>Commission ({form.tauxCommission}%)</span><span className="font-mono font-semibold">{fmtDT(comm)}</span></div>
              <div className="flex justify-between font-bold border-t border-purple/30 pt-1 mt-1"><span>Mon net HT</span><span className="font-mono">{fmtDT(net)}</span></div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Contacts, prochaine étape..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.clientId || !form.title || !form.montantHT}>
              💾 Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
