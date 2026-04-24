import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Mail, Phone, FileBadge } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { Client } from '@/types';

const EMPTY = { id: '', name: '', contactName: '', email: '', phone: '', address: '', matricule: '', notes: '' };

export function Clients() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then((r) => r.data),
  });

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
      matricule: c.matricule || '', notes: c.notes || '',
    });
    setOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Clients</h1>
          <p className="text-sm text-muted-foreground">Gestion des clients et prospects</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }}>
          <Plus size={16} />Nouveau client
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {clients.map((c) => (
          <Card key={c.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{c.name}</h3>
                <span className="text-xs bg-sage text-leaf px-2 py-0.5 rounded-full">
                  {c._count?.affaires || 0} affaire{(c._count?.affaires || 0) > 1 ? 's' : ''}
                </span>
              </div>
              {c.contactName && <p className="text-sm text-muted-foreground">{c.contactName}</p>}
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {c.email && <div className="flex items-center gap-1.5"><Mail size={11} />{c.email}</div>}
                {c.phone && <div className="flex items-center gap-1.5"><Phone size={11} />{c.phone}</div>}
                {c.matricule && <div className="flex items-center gap-1.5"><FileBadge size={11} />{c.matricule}</div>}
              </div>
              <div className="mt-3 flex gap-1 justify-end">
                <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil size={12} /></Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => confirm('Supprimer ce client ?') && deleteMutation.mutate(c.id)}
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
