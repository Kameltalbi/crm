import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Receipt, Repeat } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDT } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

type FormData = {
  id?: string;
  title: string;
  amount: string;
  category: string;
  date: string;
  isRecurrent: boolean;
  recurrenceMonths: string;
};

const EMPTY: FormData = {
  title: '',
  amount: '',
  category: 'OPERATIONAL',
  date: new Date().toISOString().split('T')[0],
  isRecurrent: false,
  recurrenceMonths: '1',
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

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        title: data.title,
        amount: data.amount,
        category: data.category,
        date: data.date,
        currency: 'TND',
        status: 'PENDING',
      };

      if (data.id) {
        return api.put(`/expenses/${data.id}`, payload);
      }

      // Si récurrent, créer une dépense par mois
      if (data.isRecurrent && parseInt(data.recurrenceMonths) > 1) {
        const months = parseInt(data.recurrenceMonths);
        const startDate = new Date(data.date);
        const promises = [];
        for (let i = 0; i < months; i++) {
          const d = new Date(startDate);
          d.setMonth(d.getMonth() + i);
          promises.push(api.post('/expenses', { ...payload, date: d.toISOString().split('T')[0] }));
        }
        return Promise.all(promises);
      }

      return api.post('/expenses', payload);
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
      amount: String(expense.amount),
      category: expense.category,
      date: new Date(expense.date).toISOString().split('T')[0],
      isRecurrent: false,
      recurrenceMonths: '1',
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Modifier' : 'Nouvelle'} dépense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Loyer bureau, Abonnement..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Montant (TND) *</Label>
                <Input type="number" step="0.001" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.000" />
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
            </div>
            <div className="space-y-1.5">
              <Label>Date de début</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>

            {/* Récurrence */}
            {!form.id && (
              <div className="rounded-lg border p-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isRecurrent}
                    onChange={(e) => setForm({ ...form, isRecurrent: e.target.checked })}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Repeat size={16} className="text-muted-foreground" />
                  <span className="text-sm font-medium">Dépense récurrente</span>
                </label>
                {form.isRecurrent && (
                  <div className="space-y-1.5">
                    <Label>Nombre de mois</Label>
                    <Input
                      type="number"
                      min="2"
                      max="36"
                      value={form.recurrenceMonths}
                      onChange={(e) => setForm({ ...form, recurrenceMonths: e.target.value })}
                      placeholder="Ex: 12"
                    />
                    <p className="text-xs text-muted-foreground">
                      {parseInt(form.recurrenceMonths) > 1
                        ? `${form.recurrenceMonths} dépenses de ${form.amount || '0'} TND seront créées (une par mois)`
                        : 'Minimum 2 mois'}
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? 'Enregistrement...'
                  : form.isRecurrent && !form.id && parseInt(form.recurrenceMonths) > 1
                    ? `Créer ${form.recurrenceMonths} dépenses`
                    : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
