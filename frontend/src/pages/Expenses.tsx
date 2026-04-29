import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Receipt, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDT } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

type FormData = {
  id?: string;
  title: string;
  description: string;
  amount: string;
  currency: string;
  category: string;
  date: string;
  relatedAffaireId: string;
  relatedLeadId: string;
  status: string;
  receiptUrl: string;
  notes: string;
};

const EMPTY: FormData = {
  title: '',
  description: '',
  amount: '',
  currency: 'TND',
  category: 'OPERATIONAL',
  date: new Date().toISOString().split('T')[0],
  relatedAffaireId: '',
  relatedLeadId: '',
  status: 'PENDING',
  receiptUrl: '',
  notes: '',
};

const CATEGORY_LABELS: Record<string, string> = {
  OPERATIONAL: 'Opérationnel',
  TRAVEL: 'Déplacement',
  MEAL: 'Repas',
  ACCOMMODATION: 'Hébergement',
  EQUIPMENT: 'Matériel',
  SOFTWARE: 'Logiciel',
  MARKETING: 'Marketing',
  COMMISSION: 'Commission',
  OTHER: 'Autre',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: 'Approuvé', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejeté', color: 'bg-red-100 text-red-700' },
  PAID: { label: 'Payé', color: 'bg-blue-100 text-blue-700' },
};

export function Expenses() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('2026');

  const { data: expensesData } = useQuery<{ data: any[], pagination: any }>({
    queryKey: ['expenses', filterCategory, filterStatus, filterMonth, filterYear],
    queryFn: () => api.get('/expenses', {
      params: {
        category: filterCategory !== 'all' ? filterCategory : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        month: filterMonth !== 'all' ? filterMonth : undefined,
        year: filterYear,
      }
    }).then((r) => r.data),
  });
  const expenses = expensesData?.data || [];

  const { data: affairesData } = useQuery<{ data: any[], pagination: any }>({
    queryKey: ['affaires'],
    queryFn: () => api.get('/affaires').then((r) => r.data),
  });
  const affaires = affairesData?.data || [];

  const { data: leadsData } = useQuery<{ data: any[], pagination: any }>({
    queryKey: ['leads'],
    queryFn: () => api.get('/leads').then((r) => r.data),
  });
  const leads = leadsData?.data || [];

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = { ...data };
      delete (payload as any).id;
      return data.id ? api.put(`/expenses/${data.id}`, payload) : api.post('/expenses', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      setOpen(false);
      setForm(EMPTY);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const openEdit = (expense: any) => {
    setForm({
      id: expense.id,
      title: expense.title,
      description: expense.description || '',
      amount: String(expense.amount),
      currency: expense.currency || 'TND',
      category: expense.category,
      date: new Date(expense.date).toISOString().split('T')[0],
      relatedAffaireId: expense.relatedAffaireId || '',
      relatedLeadId: expense.relatedLeadId || '',
      status: expense.status,
      receiptUrl: expense.receiptUrl || '',
      notes: expense.notes || '',
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6 px-2 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">Dépenses</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestion des frais et dépenses</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }}>
          <Plus size={16} className="mr-2" /> Nouvelle dépense
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total des dépenses</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{fmtDT(totalAmount)} TND</p>
              <p className="text-xs text-muted-foreground mt-1">{expenses.length} dépenses</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Receipt size={24} className="text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Mois" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous mois</SelectItem>
            {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((label, idx) => (
              <SelectItem key={idx} value={String(idx + 1)}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2026">2026</SelectItem>
            <SelectItem value="2027">2027</SelectItem>
            <SelectItem value="2028">2028</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Expenses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {expenses.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <p className="text-sm text-muted-foreground">Aucune dépense</p>
            </CardContent>
          </Card>
        ) : (
          expenses.map((expense: any) => {
            const statusInfo = STATUS_LABELS[expense.status] || STATUS_LABELS.PENDING;
            return (
              <Card key={expense.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold">{expense.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(expense.date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Montant</span>
                      <span className="text-lg font-bold">{fmtDT(Number(expense.amount))} {expense.currency}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Catégorie</span>
                      <span className="text-xs">{CATEGORY_LABELS[expense.category] || expense.category}</span>
                    </div>
                    {expense.relatedAffaire && (
                      <div className="text-xs text-muted-foreground">
                        Affaire: {expense.relatedAffaire.title}
                      </div>
                    )}
                    {expense.relatedLead && (
                      <div className="text-xs text-muted-foreground">
                        Lead: {expense.relatedLead.name}
                      </div>
                    )}
                    {expense.receiptUrl && (
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <Receipt size={12} />
                        <span>Justificatif</span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(expense)}>
                        <Pencil size={14} className="mr-1" /> Modifier
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(expense.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Modifier' : 'Nouvelle'} dépense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Titre *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre de la dépense" />
              </div>
              <div className="space-y-1.5">
                <Label>Montant *</Label>
                <Input type="number" step="0.001" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.000" />
              </div>
              <div className="space-y-1.5">
                <Label>Devise</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TND">TND</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Affaire liée</Label>
                <Select value={form.relatedAffaireId || 'none'} onValueChange={(v) => setForm({ ...form, relatedAffaireId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {affaires.map((a) => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Lead lié</Label>
                <Select value={form.relatedLeadId || 'none'} onValueChange={(v) => setForm({ ...form, relatedLeadId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>URL du justificatif</Label>
                <Input value={form.receiptUrl} onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description de la dépense..." rows={2} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes additionnelles..." rows={2} />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
