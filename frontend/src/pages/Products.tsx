import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Package, Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { Product, ProductType } from '@/types';

const EMPTY = { id: '', name: '', description: '', price: 0, type: 'SERVICE' as ProductType, active: true };

export function Products() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: productsData, error, isLoading } = useQuery<{ data: Product[], pagination: any }>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data),
  });
  const products = productsData?.data || [];

  const saveMutation = useMutation({
    mutationFn: (data: typeof EMPTY) => {
      const payload: any = { name: data.name, description: data.description, price: data.price, type: data.type, active: data.active };
      delete (payload as any).id;
      return data.id ? api.put(`/products/${data.id}`, payload) : api.post('/products', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setOpen(false);
    },
    onError: (err) => {
      console.error('Error saving product:', err);
      alert('Erreur lors de la sauvegarde');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const openEdit = (p: Product) => {
    setForm({
      id: p.id,
      name: p.name,
      description: p.description || '',
      price: Number(p.price),
      type: p.type,
      active: p.active,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6 px-2 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl">Produits</h1>
          <p className="text-sm text-muted-foreground">Gestion des produits et services</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }} className="w-full sm:w-auto">
          <Plus size={16} />Nouveau produit
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Chargement...</p>}
      {error && <p className="text-destructive">Erreur: {String(error)}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {products.map((p) => (
          <Card key={p.id} className={`hover:shadow-md transition-shadow ${!p.active ? 'opacity-60' : ''}`}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${p.type === 'SERVICE' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    <Package size={16} className={p.type === 'SERVICE' ? 'text-blue-600' : 'text-green-600'} />
                  </div>
                  <h3 className="font-semibold">{p.name}</h3>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {p.active ? '✓ Actif' : '✗ Inactif'}
                </span>
              </div>
              {p.description && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{p.description}</p>}
              <p className="text-lg font-bold text-emerald-600 mb-3">{Number(p.price).toLocaleString('fr-TN')} DT</p>
              <div className="flex gap-1 justify-end">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil size={12} /></Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => confirm('Supprimer ce produit ?') && deleteMutation.mutate(p.id)}
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && products.length === 0 && (
        <p className="text-muted-foreground text-center py-8">Aucun produit créé</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Modifier' : 'Nouveau'} produit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Prix (DT) *</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ProductType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SERVICE">📦 Service</SelectItem>
                  <SelectItem value="PRODUCT">🛍️ Produit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="active">Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name || form.price < 0}>
              💾 Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
