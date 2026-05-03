import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Phone, Mail, Building2, Trash2, Pencil, TrendingUp, UserCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

type FormData = {
  id?: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: string;
  score: string;
  estimatedValue: string;
  notes: string;
  clientId?: string;
};

const EMPTY: FormData = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  company: '',
  source: 'AUTRE',
  status: 'NEW',
  score: '0',
  estimatedValue: '',
  notes: '',
};

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: 'Site web',
  REFERRAL: 'Recommandation',
  LINKEDIN: 'LinkedIn',
  EMAIL: 'Email',
  PHONE: 'Téléphone',
  EVENT: 'Événement',
  PARTNER: 'Partenaire',
  AUTRE: 'Autre',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NEW: { label: 'Nouveau', color: 'bg-blue-100 text-blue-700' },
  CONTACTED: { label: 'Contacté', color: 'bg-yellow-100 text-yellow-700' },
  QUALIFIED: { label: 'Qualifié', color: 'bg-green-100 text-green-700' },
  CONVERTED: { label: 'Converti', color: 'bg-purple-100 text-purple-700' },
  LOST: { label: 'Perdu', color: 'bg-red-100 text-red-700' },
};

export function Leads() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('2026');
  const [page, setPage] = useState(1);

  const { data: leadsData } = useQuery<{ data: any[], pagination: any }>({
    queryKey: ['leads', filterStatus, filterSource, page],
    queryFn: () => api.get('/leads', { params: { status: filterStatus !== 'all' ? filterStatus : undefined, source: filterSource !== 'all' ? filterSource : undefined, page } }).then((r) => r.data),
  });
  const leads = leadsData?.data || [];
  const pagination = leadsData?.pagination;

  const { data: clientsData } = useQuery<{ data: any[], pagination: any }>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then((r) => r.data),
  });
  const clients = clientsData?.data || [];

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = { ...data };
      delete (payload as any).id;
      return data.id ? api.put(`/leads/${data.id}`, payload) : api.post('/leads', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      setOpen(false);
      setForm(EMPTY);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/leads/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => api.post(`/leads/${id}/convert`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const openEdit = (lead: any) => {
    setForm({
      id: lead.id,
      name: lead.name,
      contactName: lead.contactName || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      source: lead.source,
      status: lead.status,
      score: String(lead.score),
      estimatedValue: lead.estimatedValue ? String(lead.estimatedValue) : '',
      notes: lead.notes || '',
      clientId: lead.clientId || '',
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const handleConvert = (id: string) => {
    if (confirm('Convertir ce lead en client ?')) {
      convertMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6 px-2 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestion des prospects</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }}>
          <Plus size={16} className="mr-2" /> Nouveau lead
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterStatus || 'all'} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSource || 'all'} onValueChange={setFilterSource}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Toutes sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes sources</SelectItem>
            {Object.entries(SOURCE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterMonth || 'all'} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tous mois" />
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

      {/* Summary */}
      {leads.length > 0 && (
        <div className="flex flex-wrap gap-4">
          <Card className="flex-1 min-w-[160px]">
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total leads</span>
              <span className="text-lg font-bold">{leads.length}</span>
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-[160px]">
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Valeur totale</span>
              <span className="text-lg font-bold text-primary">
                {leads.reduce((sum: number, l: any) => sum + (Number(l.estimatedValue) || 0), 0).toLocaleString('fr-FR')} DT
              </span>
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-[160px]">
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Score moyen</span>
              <span className="text-lg font-bold">
                {Math.round(leads.reduce((sum: number, l: any) => sum + (Number(l.score) || 0), 0) / leads.length)}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leads.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <p className="text-sm text-muted-foreground">Aucun lead</p>
            </CardContent>
          </Card>
        ) : (
          leads.map((lead: any) => {
            const statusInfo = STATUS_LABELS[lead.status] || STATUS_LABELS.NEW;
            return (
              <Card key={lead.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold">{lead.name}</CardTitle>
                      {lead.company && <p className="text-sm text-muted-foreground">{lead.company}</p>}
                    </div>
                    <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1">
                    {lead.contactName && (
                      <div className="flex items-center gap-2 text-sm">
                        <UserCheck size={14} className="text-muted-foreground" />
                        <span>{lead.contactName}</span>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail size={14} className="text-muted-foreground" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone size={14} className="text-muted-foreground" />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp size={14} />
                      <span>Score: {lead.score}</span>
                    </div>
                    {lead.estimatedValue && (
                      <span className="text-sm font-semibold">{Number(lead.estimatedValue).toLocaleString('fr-FR')} DT</span>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    {lead.status !== 'CONVERTED' && lead.status !== 'LOST' && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleConvert(lead.id)}>
                        <Building2 size={14} className="mr-1" /> Convertir
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openEdit(lead)}>
                      <Pencil size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(lead.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {pagination.total} leads
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={page === 1 ? 'ghost' : 'default'}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3"
            >
              ← Précédent
            </Button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={p === page ? 'default' : 'outline'}
                onClick={() => setPage(p)}
                className={`w-8 h-8 p-0 ${p === page ? 'font-bold' : ''}`}
              >
                {p}
              </Button>
            ))}
            <Button
              size="sm"
              variant={page === pagination.totalPages ? 'ghost' : 'default'}
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-3"
            >
              Suivant →
            </Button>
          </div>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Modifier' : 'Nouveau'} lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Nom *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom du lead" />
              </div>
              <div className="space-y-1.5">
                <Label>Contact</Label>
                <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="Nom du contact" />
              </div>
              <div className="space-y-1.5">
                <Label>Entreprise</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Nom de l'entreprise" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+216 XX XXX XXX" />
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOURCE_LABELS).map(([key, label]) => (
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
                <Label>Score (0-100)</Label>
                <Input type="number" min="0" max="100" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Valeur estimée (DT)</Label>
                <Input type="number" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} placeholder="0" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes sur le lead..." rows={3} />
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
