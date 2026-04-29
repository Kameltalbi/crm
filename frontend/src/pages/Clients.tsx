import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Mail, Phone, FileBadge, Search, TrendingUp, MoreVertical } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDT } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DropdownMenu, DropdownMenuTriggerButton, DropdownMenuContentWrapper, DropdownMenuItem } from '@/components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { Client } from '@/types';

const EMPTY = { id: '', name: '', contactName: '', email: '', phone: '', address: '', matricule: '', qualificatif: 'NON_SPECIFIE', notes: '' };

export function Clients() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState('');

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then((r) => r.data),
  });

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contactName && c.contactName.toLowerCase().includes(search.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const totalAffaires = clients.reduce((sum, c) => sum + (c._count?.affaires || 0), 0);
  const avgAffairesPerClient = clients.length > 0 ? (totalAffaires / clients.length).toFixed(1) : 0;

  const saveMutation = useMutation({
    mutationFn: (data: typeof EMPTY) => {
      const payload = { ...data };
      delete (payload as any).id;
      return data.id ? api.put(`/clients/${data.id}`, payload) : api.post('/clients', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });

  const openEdit = (c: Client) => {
    setForm({
      id: c.id, name: c.name, contactName: c.contactName || '',
      email: c.email || '', phone: c.phone || '', address: c.address || '',
      matricule: c.matricule || '', qualificatif: c.qualificatif || '', notes: c.notes || '',
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6 px-2 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl">Clients</h1>
          <p className="text-sm text-muted-foreground">Gestion des clients et prospects</p>
        </div>
        <Button onClick={() => { console.log('Opening form'); setForm(EMPTY); setOpen(true); console.log('Form should be open'); }} className="w-full sm:w-auto">
          <Plus size={16} />Nouveau client
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-2">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gray-100 rounded-lg">
                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Total clients</p>
                <p className="text-lg md:text-2xl font-bold">{clients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Total affaires</p>
                <p className="text-lg md:text-2xl font-bold text-emerald-600">{totalAffaires}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-200 bg-blue-50/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Moyenne/client</p>
                <p className="text-lg md:text-2xl font-bold text-blue-600">{avgAffairesPerClient}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher par nom, contact ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* List View */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-sage">
                  <th className="text-left p-3 uppercase tracking-wider text-leaf font-semibold">Client</th>
                  <th className="text-left p-3 uppercase tracking-wider text-leaf font-semibold">Contact</th>
                  <th className="text-left p-3 uppercase tracking-wider text-leaf font-semibold">Email</th>
                  <th className="text-left p-3 uppercase tracking-wider text-leaf font-semibold">Téléphone</th>
                  <th className="text-left p-3 uppercase tracking-wider text-leaf font-semibold">Qualificatif</th>
                  <th className="text-left p-3 uppercase tracking-wider text-leaf font-semibold">Matricule</th>
                  <th className="text-center p-3 uppercase tracking-wider text-leaf font-semibold">Affaires</th>
                  <th className="text-right p-3 uppercase tracking-wider text-leaf font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-sage/50">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-muted-foreground">{c.contactName || '—'}</td>
                    <td className="p-3 text-muted-foreground">{c.email || '—'}</td>
                    <td className="p-3 text-muted-foreground">{c.phone || '—'}</td>
                    <td className="p-3 text-muted-foreground">
                      {c.qualificatif === 'PROSPECT' ? '🔍 Prospect' : c.qualificatif === 'CLIENT' ? '🤝 Client' : '—'}
                    </td>
                    <td className="p-3 text-muted-foreground">{c.matricule || '—'}</td>
                    <td className="p-3 text-center">
                      <span className="bg-sage text-leaf px-2 py-0.5 rounded-full text-xs font-medium">
                        {c._count?.affaires || 0}
                      </span>
                    </td>
                    <td className="p-3 text-right">
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
                        <DropdownMenuContentWrapper align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            <Pencil size={16} className="mr-2 text-muted-foreground" /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => confirm('Supprimer ce client ?') && deleteMutation.mutate(c.id)} className="text-destructive">
                            <Trash2 size={16} className="mr-2" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContentWrapper>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Aucun client trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Modifier' : 'Nouveau'} client</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Raison sociale *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Matricule fiscal</Label>
              <Input value={form.matricule} onChange={(e) => setForm({ ...form, matricule: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Qualificatif</Label>
              <Select value={form.qualificatif} onValueChange={(v) => setForm({ ...form, qualificatif: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NON_SPECIFIE">Non spécifié</SelectItem>
                  <SelectItem value="PROSPECT">🔍 Prospect</SelectItem>
                  <SelectItem value="CLIENT">🤝 Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Adresse</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name}>💾 Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
