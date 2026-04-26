import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { User, UserRole } from '@/types';

const EMPTY = { id: '', email: '', name: '', password: '', role: 'PARTNER' as UserRole };

export function Users() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data.user),
  });

  const saveMutation = useMutation({
    mutationFn: (data: typeof EMPTY) => {
      const payload: any = { email: data.email, name: data.name, role: data.role };
      if (data.password) payload.password = data.password;
      delete (payload as any).id;
      return data.id ? api.put(`/users/${data.id}`, payload) : api.post('/users', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const openEdit = (u: User) => {
    setForm({
      id: u.id,
      email: u.email,
      name: u.name,
      password: '',
      role: u.role,
    });
    setOpen(true);
  };

  const isOwner = currentUser?.role === 'OWNER';

  return (
    <div className="space-y-6 px-2 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">Gestion des accès et rôles</p>
        </div>
        {isOwner && (
          <Button onClick={() => { setForm(EMPTY); setOpen(true); }} className="w-full sm:w-auto">
            <Plus size={16} />Nouvel utilisateur
          </Button>
        )}
      </div>

      {!isOwner && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-800">
              ⚠️ Vous n'avez pas les permissions pour gérer les utilisateurs. Contactez un administrateur.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {users.map((u) => (
          <Card key={u.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <UserIcon size={16} />
                  </div>
                  <h3 className="font-semibold">{u.name}</h3>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'OWNER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {u.role === 'OWNER' ? '👑 Owner' : '🤝 Partner'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{u.email}</p>
              {isOwner && (
                <div className="flex gap-1 justify-end">
                  <Button size="sm" variant="outline" onClick={() => openEdit(u)}><Pencil size={12} /></Button>
                  {u.id !== currentUser?.id && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => confirm('Supprimer cet utilisateur ?') && deleteMutation.mutate(u.id)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Modifier' : 'Nouvel'} utilisateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{form.id ? 'Mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Rôle *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">👑 Owner (Accès complet)</SelectItem>
                  <SelectItem value="PARTNER">🤝 Partner (Accès limité)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.email || !form.name || (!form.id && !form.password)}>
              💾 Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
