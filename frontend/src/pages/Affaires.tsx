import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, FileText, Receipt, Mail, Eye, Upload, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { fmtDT, MOIS } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge, DropdownMenu, DropdownMenuTriggerButton, DropdownMenuContentWrapper, DropdownMenuItemStyled } from '@/components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { StatutBadge } from './Dashboard';
import type { Affaire, Client, Product, AffaireType, StatutAffaire } from '@/types';

type FormData = {
  id?: string;
  clientId: string;
  productId: string;
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
  clientId: '', productId: '', type: 'BILAN_CARBONE', montantHT: '',
  statut: 'PROSPECTION', probabilite: '50',
  moisPrevu: String(new Date().getMonth() + 1), anneePrevue: '2026',
  viaPartenaire: false, tauxCommission: '40', notes: '',
};

export function Affaires() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ statut: '', type: '', annee: '2026', viaPartenaire: '' });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [clientSearch, setClientSearch] = useState('');

  const { data: affairesData } = useQuery<{ data: Affaire[], pagination: any }>({
    queryKey: ['affaires', filters, page],
    queryFn: () => api.get('/affaires', { params: { ...filters, page } }).then((r) => r.data),
  });
  const affaires = affairesData?.data || [];
  const pagination = affairesData?.pagination;
  const { data: clientsData } = useQuery<{ data: Client[], pagination: any }>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then((r) => r.data),
  });
  const clients = clientsData?.data || [];
  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.contactName && c.contactName.toLowerCase().includes(clientSearch.toLowerCase()))
  );
  const { data: productsData } = useQuery<{ data: Product[], pagination: any }>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data),
  });
  const products = productsData?.data || [];

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      console.log('Saving affaire with data:', data);
      const payload = {
        clientId: data.clientId,
        productId: data.productId || undefined,
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
      delete (payload as any).id;
      return data.id ? api.put(`/affaires/${data.id}`, payload) : api.post('/affaires', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['affaires'] });
      qc.invalidateQueries({ queryKey: ['kpis'] });
      setOpen(false);
    },
    onError: (error: any) => {
      console.error('Save error:', error);
      alert(`Erreur: ${error.response?.data?.error || error.message || 'Erreur inconnue'}`);
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

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post('/affaires/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['affaires'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setImportOpen(false);
      setImportFile(null);
      alert(`Import réussi ! ${data.data.created} affaires créées, ${data.data.updated} mises à jour.`);
    },
    onError: (error: any) => {
      console.error('Import error:', error);
      alert(`Erreur d'import : ${error.response?.data?.error || error.message || 'Erreur inconnue'}`);
    },
  });

  const handleEdit = (a: Affaire) => {
    setForm({
      id: a.id,
      clientId: a.clientId,
      productId: a.productId || '',
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
    setClientSearch('');
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer cette affaire ?')) deleteMutation.mutate(id);
  };

  const openNew = () => {
    setForm(EMPTY);
    setClientSearch('');
    setOpen(true);
  };

  const ht = Number(form.montantHT) || 0;
  const comm = form.viaPartenaire ? Math.round(ht * Number(form.tauxCommission) / 100) : 0;
  const net = ht - comm;

  // Calculate summary KPIs
  const totalCA = affaires.reduce((sum, a) => sum + Number(a.montantHT), 0);
  const pipelineCA = affaires.filter(a => a.statut === 'PIPELINE').reduce((sum, a) => sum + Number(a.montantHT), 0);
  const realiseCA = affaires.filter(a => a.statut === 'REALISE').reduce((sum, a) => sum + Number(a.montantHT), 0);
  const prospectionCA = affaires.filter(a => a.statut === 'PROSPECTION').reduce((sum, a) => sum + Number(a.montantHT), 0);
  const winRate = affaires.filter(a => a.statut === 'REALISE' || a.statut === 'PERDU').length > 0
    ? Math.round((affaires.filter(a => a.statut === 'REALISE').length / affaires.filter(a => a.statut === 'REALISE' || a.statut === 'PERDU').length) * 100)
    : 0;

  return (
    <div className="space-y-5 px-2 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl">Affaires</h1>
          <p className="text-sm text-muted-foreground">Pipeline complet : prospection, confirmé, réalisé</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={() => setImportOpen(true)} variant="outline" className="w-full sm:w-auto"><Upload size={16} />Importer Excel</Button>
          <Button onClick={openNew} className="w-full sm:w-auto"><Plus size={16} />Nouvelle affaire</Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-2">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CA Total</p>
            <p className="text-lg md:text-2xl font-bold text-gray-900 mt-1">{fmtDT(totalCA)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{affaires.length} affaires</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-200 bg-blue-50/30">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pipeline</p>
            <p className="text-lg md:text-2xl font-bold text-blue-600 mt-1">{fmtDT(pipelineCA)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{affaires.filter(a => a.statut === 'PIPELINE').length} en cours</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Réalisé</p>
            <p className="text-lg md:text-2xl font-bold text-emerald-600 mt-1">{fmtDT(realiseCA)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{affaires.filter(a => a.statut === 'REALISE').length} gagnées</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-violet-200 bg-violet-50/30">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Taux conversion</p>
            <p className="text-lg md:text-2xl font-bold text-violet-600 mt-1">{winRate}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{affaires.filter(a => a.statut === 'PERDU').length} perdues</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <CardTitle className="text-base">{affaires.length} affaires</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={filters.statut || 'all'} onValueChange={(v) => setFilters({ ...filters, statut: v === 'all' ? '' : v })}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Tous statuts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="PROSPECTION">🟡 Prospection</SelectItem>
                <SelectItem value="PIPELINE">🔵 Pipeline</SelectItem>
                <SelectItem value="REALISE">✅ Réalisé</SelectItem>
                <SelectItem value="PERDU">❌ Perdu</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.type || 'all'} onValueChange={(v) => setFilters({ ...filters, type: v === 'all' ? '' : v })}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="BILAN_CARBONE">🌍 Bilan</SelectItem>
                <SelectItem value="FORMATION">📚 Formation</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.viaPartenaire || 'all'} onValueChange={(v) => setFilters({ ...filters, viaPartenaire: v === 'all' ? '' : v })}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Apport" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous apports</SelectItem>
                <SelectItem value="true">🤝 Partenaire</SelectItem>
                <SelectItem value="false">👤 Direct</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.annee} onValueChange={(v) => setFilters({ ...filters, annee: v })}>
              <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
                <SelectItem value="2028">2028</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[800px]">
              <thead>
                <tr className="border-b bg-sage">
                  <th className="text-left p-2 md:p-2.5 uppercase tracking-wider text-leaf font-semibold">Client / Titre</th>
                  <th className="text-right p-2 md:p-2.5 uppercase tracking-wider text-leaf font-semibold">HT (DT)</th>
                  <th className="text-right p-2 md:p-2.5 uppercase tracking-wider text-leaf font-semibold">TTC</th>
                  <th className="text-left p-2 md:p-2.5 uppercase tracking-wider text-leaf font-semibold">Statut</th>
                  <th className="text-right p-2 md:p-2.5 uppercase tracking-wider text-leaf font-semibold">Commission</th>
                  <th className="text-right p-2 md:p-2.5 uppercase tracking-wider text-leaf font-semibold">Mon net</th>
                  <th className="text-left p-2 md:p-2.5 uppercase tracking-wider text-leaf font-semibold">Mois</th>
                  <th className="text-left p-2 md:p-2.5 uppercase tracking-wider text-leaf font-semibold">Devis/Fac</th>
                  <th className="text-right p-2 md:p-2.5 uppercase tracking-wider text-leaf font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {affaires.map((a) => {
                  const ht = Number(a.montantHT);
                  const c = a.viaPartenaire ? Math.round(ht * Number(a.tauxCommission) / 100) : 0;
                  return (
                    <tr key={a.id} className={`border-b hover:bg-sage/50 ${a.viaPartenaire ? 'bg-purple-light/20' : ''}`}>
                      <td className="p-2.5">
                        <div className="font-semibold">{a.client?.name || 'N/A'}</div>
                        <div className="text-[10px] text-muted-foreground">{a.title}</div>
                      </td>
                      <td className="p-2.5 text-right font-mono">{fmtDT(ht)}</td>
                      <td className="p-2.5 text-right font-mono font-semibold">{fmtDT(Math.round(ht * 1.19))}</td>
                      <td className="p-2.5"><StatutBadge statut={a.statut} /></td>
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
                        <DropdownMenu>
                          <DropdownMenuTriggerButton asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-gray-100"
                              title="Actions"
                            >
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTriggerButton>
                          <DropdownMenuContentWrapper align="end" className="w-48">
                            <DropdownMenuItemStyled onClick={() => navigate(`/affaires/${a.id}`)}>
                              <Eye size={16} className="mr-2 text-muted-foreground" /> Voir détails
                            </DropdownMenuItemStyled>
                            {!a.devisId && (
                              <DropdownMenuItemStyled onClick={() => createDevisMutation.mutate(a.id)}>
                                <FileText size={16} className="mr-2 text-muted-foreground" /> Créer devis
                              </DropdownMenuItemStyled>
                            )}
                            {!a.factureId && (
                              <DropdownMenuItemStyled onClick={() => createFactureMutation.mutate(a.id)}>
                                <Receipt size={16} className="mr-2 text-muted-foreground" /> Créer facture
                              </DropdownMenuItemStyled>
                            )}
                            {(a.devisPdfUrl || a.facturePdfUrl) && (
                              <DropdownMenuItemStyled onClick={() => {
                                const url = a.devisPdfUrl || a.facturePdfUrl;
                                if (url) window.open(url, '_blank');
                              }}>
                                <Mail size={16} className="mr-2 text-muted-foreground" /> Voir PDF
                              </DropdownMenuItemStyled>
                            )}
                            <DropdownMenuItemStyled onClick={() => handleEdit(a)}>
                              <Pencil size={16} className="mr-2 text-muted-foreground" /> Modifier
                            </DropdownMenuItemStyled>
                            <DropdownMenuItemStyled onClick={() => handleDelete(a.id)} className="text-destructive">
                              <Trash2 size={16} className="mr-2" /> Supprimer
                            </DropdownMenuItemStyled>
                          </DropdownMenuContentWrapper>
                        </DropdownMenu>
                      </td>
                    </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </CardContent>
        {pagination && pagination.totalPages > 1 && (
          <CardContent className="border-t pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {pagination.currentPage} sur {pagination.totalPages} ({pagination.total} affaires)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.currentPage === 1}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.currentPage === pagination.totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </CardContent>
        )}
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
              <Input
                placeholder="Rechercher un client..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="mb-2"
              />
              <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                <SelectContent>
                  {filteredClients.length > 0 ? (
                    filteredClients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.contactName ? `(${c.contactName})` : ''}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">Aucun client trouvé</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Produit *</Label>
              <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir un produit" /></SelectTrigger>
                <SelectContent>
                  {products.filter(p => p.active).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
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
            <span className="text-sm font-medium">🤝 Commission tiers</span>
          </label>

          {form.viaPartenaire && (
            <div className="space-y-1.5">
              <Label>Taux de commission (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={form.tauxCommission}
                onChange={(e) => setForm({ ...form, tauxCommission: e.target.value })}
                placeholder="40"
              />
            </div>
          )}

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
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.clientId || !form.montantHT}>
              💾 Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importer des affaires depuis Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="importFile">Fichier Excel (.xlsx, .xls)</Label>
              <Input
                id="importFile"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              <p className="font-semibold mb-2">Colonnes acceptées (toutes optionnelles) :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>clientName / Nom du client / Client</li>
                <li>clientEmail / Email client / Email</li>
                <li>clientPhone / Téléphone client / Téléphone</li>
                <li>productName / Produit / Product</li>
                <li>title / Titre / Affaire</li>
                <li>type / Type</li>
                <li>montantHT / Montant HT / Montant / Prix</li>
                <li>statut / Statut</li>
                <li>probabilite / Probabilité</li>
                <li>moisPrevu / Mois prévu / Mois</li>
                <li>anneePrevue / Année prévue / Année</li>
              </ul>
              <p className="mt-2 text-xs">Des valeurs par défaut seront utilisées si les colonnes sont manquantes.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Annuler</Button>
            <Button onClick={() => importFile && importMutation.mutate(importFile)} disabled={importMutation.isPending || !importFile}>
              {importMutation.isPending ? 'Import...' : 'Importer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
