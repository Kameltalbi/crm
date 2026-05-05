import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Target, User, Calendar, DollarSign } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDT } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { User as UserType } from '@/types';
import { useAuth } from '@/lib/auth';

type FormData = {
  id?: string;
  userId: string;
  year: string;
  month: string;
  targetAmount: string;
};

const EMPTY: FormData = {
  userId: '',
  year: String(new Date().getFullYear()),
  month: String(new Date().getMonth() + 1),
  targetAmount: '',
};

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export function Objectifs() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const user = useAuth((s) => s.user);

  const { data: objectivesData } = useQuery<any[]>({
    queryKey: ['sales-objectives', selectedYear],
    queryFn: () => api.get('/sales-objectives', { params: { year: selectedYear } }).then((r) => r.data),
  });
  const objectives = objectivesData || [];

  const { data: usersData } = useQuery<{ data: UserType[], pagination: any }>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });
  const users = usersData?.data || [];

  const { data: commissionsData } = useQuery<any>({
    queryKey: ['commissions-calculate', selectedYear, selectedMonth],
    queryFn: () => api.post('/commissions/calculate', { year: Number(selectedYear), month: Number(selectedMonth) }).then(r => r.data),
    enabled: !!user && (user.role === 'OWNER' || user.role === 'PARTNER' || user.role === 'COMMERCIAL'),
  });
  const commissions = commissionsData?.commissions || [];

  // Filter commissions based on role
  const filteredCommissions = user?.role === 'COMMERCIAL' 
    ? commissions.filter((c: any) => c.userId === user?.id)
    : commissions;

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        userId: data.userId,
        year: Number(data.year),
        month: Number(data.month),
        targetAmount: Number(data.targetAmount),
      };
      delete (payload as any).id;
      return data.id ? api.put(`/sales-objectives/${data.id}`, payload) : api.post('/sales-objectives', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-objectives'] });
      setOpen(false);
      setForm(EMPTY);
    },
    onError: (error: any) => {
      alert(`${t('productsPage.error')}: ${error.response?.data?.error || error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/sales-objectives/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-objectives'] });
    },
  });

  const handleSave = () => {
    if (!form.userId || !form.targetAmount) {
      alert(t('objectifs.requiredFields', { defaultValue: 'Veuillez remplir tous les champs obligatoires' }));
      return;
    }
    saveMutation.mutate(form);
  };

  const handleEdit = (item: any) => {
    setForm({
      id: item.id,
      userId: item.userId,
      year: String(item.year),
      month: String(item.month),
      targetAmount: String(item.targetAmount),
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet objectif ?')) {
      deleteMutation.mutate(id);
    }
  };

  const openNew = () => {
    setForm(EMPTY);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">{t('objectifs.title', { defaultValue: 'Objectifs Commerciaux' })}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('objectifs.subtitle', { defaultValue: 'Gérez les objectifs de vos commerciaux' })}</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2025, 2026, 2027, 2028].map((year) => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month, idx) => (
                <SelectItem key={idx} value={String(idx + 1)}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openNew}><Plus size={16} className="mr-2" />{t('objectifs.new', { defaultValue: 'Nouvel objectif' })}</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-semibold">{t('objectifs.salesperson', { defaultValue: 'Commercial' })}</th>
                <th className="text-left p-4 font-semibold">{t('expenses.month', { defaultValue: 'Mois' })}</th>
                <th className="text-right p-4 font-semibold">{t('objectifs.target', { defaultValue: 'Objectif' })}</th>
                <th className="text-right p-4 font-semibold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {objectives.map((obj) => (
                <tr key={obj.id} className="border-b hover:bg-muted/30">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-muted-foreground" />
                      <span className="font-medium">{obj.user?.name || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-muted-foreground" />
                      <span>{MONTHS[obj.month - 1]} {obj.year}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right font-semibold">{fmtDT(Number(obj.targetAmount))} HT</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(obj)}>
                        <Pencil size={16} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(obj.id)} className="text-destructive">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {objectives.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    {t('objectifs.noneForYear', { defaultValue: 'Aucun objectif pour cette année' })}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {filteredCommissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign size={20} className="text-leaf" />
              Primes - {MONTHS[Number(selectedMonth) - 1]} {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-semibold">Commercial</th>
                  <th className="text-right p-4 font-semibold">Objectif</th>
                  <th className="text-right p-4 font-semibold">Ventes</th>
                  <th className="text-right p-4 font-semibold">Atteinte</th>
                  <th className="text-right p-4 font-semibold">Prime</th>
                </tr>
              </thead>
              <tbody>
                {filteredCommissions.map((comm: any) => (
                  <tr key={comm.userId} className="border-b hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-muted-foreground" />
                        <span className="font-medium">{comm.userName}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">{fmtDT(comm.targetAmount)}</td>
                    <td className="p-4 text-right">{fmtDT(comm.salesAmount)}</td>
                    <td className="p-4 text-right">
                      <span className={`font-semibold ${parseFloat(comm.achievementRate) >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                        {comm.achievementRate}%
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-bold text-leaf">{fmtDT(parseFloat(comm.commission))}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? t('common.edit') : t('objectifs.new', { defaultValue: 'Nouvel objectif' })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('objectifs.salesperson', { defaultValue: 'Commercial' })} *</Label>
              <Select value={form.userId} onValueChange={(v) => setForm({ ...form, userId: v })}>
                <SelectTrigger><SelectValue placeholder={t('objectifs.chooseSalesperson', { defaultValue: 'Choisir un commercial' })} /></SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name} ({user.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
              <Label>{t('expenses.year')} *</Label>
                <Select value={form.year} onValueChange={(v) => setForm({ ...form, year: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2025, 2026, 2027, 2028].map((year) => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('expenses.month')} *</Label>
                <Select value={form.month} onValueChange={(v) => setForm({ ...form, month: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, idx) => (
                      <SelectItem key={idx + 1} value={String(idx + 1)}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('objectifs.target', { defaultValue: 'Objectif' })} (DT) *</Label>
              <Input type="number" min="0" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} placeholder={t('objectifs.targetPlaceholder', { defaultValue: 'Ex: 50000' })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? t('organizations.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
