import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Pencil, Trash2, Upload, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { Organization } from '@/types';

const EMPTY: FormData = { name: '', email: '', phone: '', address: '', tva: '', logoUrl: '' };

type FormData = {
  name: string;
  email: string;
  phone: string;
  address: string;
  tva: string;
  logoUrl: string;
};

export function Organizations() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ['organizations'],
    queryFn: () => api.get('/organizations').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/organizations', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
      setOpen(false);
      setForm(EMPTY);
      setLogoFile(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      api.put(`/organizations/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
      setOpen(false);
      setForm(EMPTY);
      setEditingId(null);
      setLogoFile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/organizations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizations'] }),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let data = { ...form };

    // Upload logo if file selected
    if (logoFile) {
      const formData = new FormData();
      formData.append('file', logoFile);
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      data.logoUrl = uploadRes.data.url;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEdit = (org: Organization) => {
    setForm({
      name: org.name,
      email: org.email || '',
      phone: org.phone || '',
      address: org.address || '',
      tva: org.tva || '',
      logoUrl: org.logoUrl || '',
    });
    setEditingId(org.id);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette organisation ?')) {
      deleteMutation.mutate(id);
    }
  };

  const openCreate = () => {
    setForm(EMPTY);
    setEditingId(null);
    setLogoFile(null);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Organisations</h1>
          <p className="text-muted-foreground">Gérez vos organisations</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-2" /> Nouvelle organisation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {organizations.map((org) => (
          <Card key={org.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {org.logoUrl ? (
                    <img src={org.logoUrl} alt={org.name} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 size={24} className="text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-base">{org.name}</CardTitle>
                    {org.email && <p className="text-xs text-muted-foreground">{org.email}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(org)}>
                    <Pencil size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(org.id)} className="text-destructive">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {org.phone && <p className="text-muted-foreground">📞 {org.phone}</p>}
              {org.address && <p className="text-muted-foreground">📍 {org.address}</p>}
              {org.tva && <p className="text-muted-foreground">🧾 TVA: {org.tva}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier' : 'Nouvelle'} organisation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Adresse</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="tva">Numéro TVA</Label>
              <Input
                id="tva"
                value={form.tva}
                onChange={(e) => setForm({ ...form, tva: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="logo">Logo</Label>
              <div className="flex items-center gap-4">
                {form.logoUrl && (
                  <img src={form.logoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLogoFile(file);
                        setForm({ ...form, logoUrl: URL.createObjectURL(file) });
                      }
                    }}
                  />
                </div>
                {form.logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setForm({ ...form, logoUrl: '' });
                      setLogoFile(null);
                    }}
                  >
                    <X size={16} />
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
