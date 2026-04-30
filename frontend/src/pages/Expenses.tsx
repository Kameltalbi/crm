import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Receipt, Repeat, TrendingUp, TrendingDown, Scale } from 'lucide-react';
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
  category: '',
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
  const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));

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

  // Fetch all expenses (unfiltered) for total balance
  const { data: allExpensesData } = useQuery<{ data: any[], pagination: any }>({
    queryKey: ['expenses', 'all', filterYear],
    queryFn: () => api.get('/expenses', { params: { year: filterYear, limit: 9999 } }).then((r) => r.data),
  });
  const allExpenses = allExpensesData?.data || [];
  const totalExpenses = allExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

  // Fetch custom expense categories
  const { data: expenseCategories = [] } = useQuery<any[]>({
    queryKey: ['categories', 'EXPENSE'],
    queryFn: () => api.get('/categories', { params: { type: 'EXPENSE' } }).then((r) => r.data),
  });

  // Fetch affaires for CA calculation
  const { data: affairesData } = useQuery<{ data: any[], pagination: any }>({
    queryKey: ['affaires', 'for-balance', filterYear],
    queryFn: () => api.get('/affaires', { params: { year: filterYear, limit: 9999 } }).then((r) => r.data),
  });
  const affaires = affairesData?.data || [];
  const TVA = 0.19;
  const caRealiseHT = affaires.filter((a: any) => a.statut === 'REALISE').reduce((sum: number, a: any) => sum + Number(a.montantHT), 0);
  const caPipelineHT = affaires.filter((a: any) => a.statut === 'PIPELINE').reduce((sum: number, a: any) => sum + Number(a.montantHT), 0);
  const caProspectionHT = affaires.filter((a: any) => a.statut === 'PROSPECTION').reduce((sum: number, a: any) => sum + Number(a.montantHT), 0);
  const caTotalHT = caRealiseHT + caPipelineHT + caProspectionHT;
  const caTotalTTC = caTotalHT * (1 + TVA);
  const caRealiseTTC = caRealiseHT * (1 + TVA);
  const caPipelineTTC = caPipelineHT * (1 + TVA);
  const caProspectionTTC = caProspectionHT * (1 + TVA);
  const solde = caTotalTTC - totalExpenses;

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        title: data.title,
        amount: data.amount,
        category: data.category,
        date: data.date,
        currency: 'TND',
        status: 'PAID',
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

      {/* Solde Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">CA Total TTC ({filterYear})</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">{fmtDT(caTotalTTC)} TND</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">HT: {fmtDT(caTotalHT)} TND</p>
                <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                  <span>R: {fmtDT(caRealiseTTC)}</span>
                  <span>P: {fmtDT(caPipelineTTC)}</span>
                  <span>Pr: {fmtDT(caProspectionTTC)}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <TrendingUp size={20} className="text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Dépenses ({filterYear})</p>
                <p className="text-xl font-bold text-red-600 mt-1">{fmtDT(totalExpenses)} TND</p>
                <p className="text-[10px] text-muted-foreground mt-1">{allExpenses.length} dépenses</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <TrendingDown size={20} className="text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`shadow-sm border-2 ${solde >= 0 ? 'border-emerald-200' : 'border-red-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Solde (CA - Dépenses)</p>
                <p className={`text-xl font-bold mt-1 ${solde >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {solde >= 0 ? '+' : ''}{fmtDT(solde)} TND
                </p>
                <p className={`text-[10px] mt-1 ${solde >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {solde >= 0 ? 'Les revenus couvrent les dépenses' : 'Les dépenses dépassent les revenus'}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${solde >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <Scale size={20} className={solde >= 0 ? 'text-emerald-600' : 'text-red-600'} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Taux de couverture</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {totalExpenses > 0 ? Math.round((caTotalTTC / totalExpenses) * 100) : '—'}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">CA / Dépenses</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Receipt size={20} className="text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {expenseCategories.map((cat: any) => (
              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
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
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
            <SelectItem value="2027">2027</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Expenses List */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">Aucune dépense</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Titre</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Catégorie</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Montant</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense: any) => {
                    const statusInfo = STATUS_LABELS[expense.status] || STATUS_LABELS.PENDING;
                    return (
                      <tr key={expense.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {new Date(expense.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-4 font-medium">{expense.title}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {expense.category}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold whitespace-nowrap">
                          {fmtDT(Number(expense.amount))} TND
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(expense)}>
                              <Pencil size={14} />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(expense.id)}>
                              <Trash2 size={14} className="text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
                    {expenseCategories.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
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
