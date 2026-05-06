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
  period: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
  month: string;
  quarter: string;
  semester: string;
  targetAmount: string;
};

const EMPTY: FormData = {
  userId: '',
  year: String(new Date().getFullYear()),
  period: 'MONTHLY',
  month: String(new Date().getMonth() + 1),
  quarter: '1',
  semester: '1',
  targetAmount: '',
};

const monthKeys = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const periodLabels = {
  MONTHLY: { fr: 'Mensuel', ar: 'شهري', en: 'Monthly' },
  QUARTERLY: { fr: 'Trimestriel', ar: 'ربع سنوي', en: 'Quarterly' },
  SEMI_ANNUAL: { fr: 'Semestriel', ar: 'نصف سنوي', en: 'Semi-annual' },
  ANNUAL: { fr: 'Annuel', ar: 'سنوي', en: 'Annual' },
};

const quarterLabels = {
  fr: ['T1 (Jan-Mars)', 'T2 (Avr-Juin)', 'T3 (Juil-Sept)', 'T4 (Oct-Déc)'],
  ar: ['R1 (يناير-مارس)', 'R2 (أبريل-يونيو)', 'R3 (يوليو-سبتمبر)', 'R4 (أكتوبر-ديسمبر)'],
  en: ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'],
};

const semesterLabels = {
  fr: ['S1 (Jan-Juin)', 'S2 (Juil-Déc)'],
  ar: ['ن1 (يناير-يونيو)', 'ن2 (يوليو-ديسمبر)'],
  en: ['H1 (Jan-Jun)', 'H2 (Jul-Dec)'],
};

export function Objectifs() {
  const { t, i18n } = useTranslation();
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
      const payload: any = {
        userId: data.userId,
        year: Number(data.year),
        period: data.period,
        targetAmount: Number(data.targetAmount),
      };
      
      if (data.period === 'MONTHLY') {
        payload.month = Number(data.month);
      } else if (data.period === 'QUARTERLY') {
        payload.quarter = Number(data.quarter);
      } else if (data.period === 'SEMI_ANNUAL') {
        payload.semester = Number(data.semester);
      }
      delete (payload as any).id;
      return data.id ? api.put(`/sales-objectives/${data.id}`, payload) : api.post('/sales-objectives', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-objectives'] });
      setOpen(false);
      setForm(EMPTY);
    },
    onError: (error: any) => {
      alert(`${t('common.error')}: ${error.response?.data?.error || error.message}`);
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
      period: item.period || 'MONTHLY',
      month: String(item.month || new Date().getMonth() + 1),
      quarter: String(item.quarter || 1),
      semester: String(item.semester || 1),
      targetAmount: String(item.targetAmount),
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('objectifs.confirmDelete'))) {
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
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">{t('objectifs.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('objectifs.subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:w-auto">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2025, 2026, 2027, 2028].map((year) => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthKeys.map((key, idx) => (
                <SelectItem key={idx} value={String(idx + 1)}>{t(`expenses.months.${key}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openNew} className="w-full sm:w-auto"><Plus size={16} className="mr-2" />{t('objectifs.new')}</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="md:hidden space-y-3 p-3">
            {objectives.map((obj) => (
              <Card key={obj.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <User size={16} className="text-muted-foreground" />
                      <span className="font-medium truncate">{obj.user?.name || 'N/A'}</span>
                    </div>
                    <span className="font-semibold text-sm">{fmtDT(Number(obj.targetAmount))} HT</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {obj.period === 'MONTHLY' && t(`expenses.months.${monthKeys[obj.month - 1]}`)}
                    {obj.period === 'QUARTERLY' && quarterLabels[i18n.language as keyof typeof quarterLabels]?.[obj.quarter - 1]}
                    {obj.period === 'SEMI_ANNUAL' && semesterLabels[i18n.language as keyof typeof semesterLabels]?.[obj.semester - 1]}
                    {obj.period === 'ANNUAL' && periodLabels.ANNUAL[i18n.language as keyof typeof periodLabels.ANNUAL]}
                    {` ${obj.year}`}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(obj)}>
                      <Pencil size={16} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(obj.id)} className="text-destructive">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {objectives.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  {t('objectifs.noneForYear')}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-semibold">{t('objectifs.salespersonCol')}</th>
                <th className="text-left p-4 font-semibold">{t('expenses.month')}</th>
                <th className="text-right p-4 font-semibold">{t('objectifs.targetCol')}</th>
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
                      <span>
                  {obj.period === 'MONTHLY' && t(`expenses.months.${monthKeys[obj.month - 1]}`)}
                  {obj.period === 'QUARTERLY' && quarterLabels[i18n.language as keyof typeof quarterLabels]?.[obj.quarter - 1]}
                  {obj.period === 'SEMI_ANNUAL' && semesterLabels[i18n.language as keyof typeof semesterLabels]?.[obj.semester - 1]}
                  {obj.period === 'ANNUAL' && periodLabels.ANNUAL[i18n.language as keyof typeof periodLabels.ANNUAL]}
                  {` ${obj.year}`}
                </span>
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
                    {t('objectifs.noneForYear')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>

      {filteredCommissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign size={20} className="text-leaf" />
              {t('objectifs.commissionsTitle')} - {t(`expenses.months.${monthKeys[Number(selectedMonth) - 1]}`)} {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="md:hidden space-y-3 p-3">
              {filteredCommissions.map((comm: any) => (
                <Card key={comm.userId}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <User size={16} className="text-muted-foreground" />
                        <span className="font-medium truncate">{comm.userName}</span>
                      </div>
                      <span className="font-bold text-leaf">{fmtDT(parseFloat(comm.commission))}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">{t('objectifs.targetCol')}: </span>{fmtDT(comm.targetAmount)}</div>
                      <div><span className="text-muted-foreground">{t('objectifs.salesCol')}: </span>{fmtDT(comm.salesAmount)}</div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">{t('objectifs.achievementCol')}: </span>
                        <span className={`font-semibold ${parseFloat(comm.achievementRate) >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                          {comm.achievementRate}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-semibold">{t('objectifs.salespersonCol')}</th>
                  <th className="text-right p-4 font-semibold">{t('objectifs.targetCol')}</th>
                  <th className="text-right p-4 font-semibold">{t('objectifs.salesCol')}</th>
                  <th className="text-right p-4 font-semibold">{t('objectifs.achievementCol')}</th>
                  <th className="text-right p-4 font-semibold">{t('objectifs.commissionCol')}</th>
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
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? t('common.edit') : t('objectifs.new')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('objectifs.salesperson')} *</Label>
              <Select value={form.userId} onValueChange={(v) => setForm({ ...form, userId: v })}>
                <SelectTrigger><SelectValue placeholder={t('objectifs.chooseSalesperson')} /></SelectTrigger>
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
                <Label>{t('objectifs.period')} *</Label>
                <Select value={form.period} onValueChange={(v) => setForm({ ...form, period: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(periodLabels) as Array<keyof typeof periodLabels>).map((period) => (
                      <SelectItem key={period} value={period}>{periodLabels[period][i18n.language as keyof typeof periodLabels.MONTHLY]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.period === 'MONTHLY' && (
              <div className="space-y-1.5">
                <Label>{t('expenses.month')} *</Label>
                <Select value={form.month} onValueChange={(v) => setForm({ ...form, month: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {monthKeys.map((key, idx) => (
                      <SelectItem key={idx + 1} value={String(idx + 1)}>{t(`expenses.months.${key}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.period === 'QUARTERLY' && (
              <div className="space-y-1.5">
                <Label>{t('objectifs.quarter')} *</Label>
                <Select value={form.quarter} onValueChange={(v) => setForm({ ...form, quarter: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {quarterLabels[i18n.language as keyof typeof quarterLabels]?.map((label, idx) => (
                      <SelectItem key={idx + 1} value={String(idx + 1)}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.period === 'SEMI_ANNUAL' && (
              <div className="space-y-1.5">
                <Label>{t('objectifs.semester')} *</Label>
                <Select value={form.semester} onValueChange={(v) => setForm({ ...form, semester: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {semesterLabels[i18n.language as keyof typeof semesterLabels]?.map((label, idx) => (
                      <SelectItem key={idx + 1} value={String(idx + 1)}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t('objectifs.target')} (DT) *</Label>
              <Input type="number" min="0" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} placeholder={t('objectifs.targetPlaceholder')} />
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
