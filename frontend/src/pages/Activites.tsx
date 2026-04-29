import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Phone, Mail, Calendar, FileText, Trash2, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { Activite, Affaire, ActiviteType } from '@/types';

const ACTIVITY_ICONS: Record<ActiviteType, any> = {
  NOTE: FileText,
  APPEL: Phone,
  EMAIL_ENVOYE: Mail,
  EMAIL_RECU: Mail,
  RDV: Calendar,
  CHANGEMENT_STATUT: FileText,
  DEVIS_CREE: FileText,
  FACTURE_CREEE: FileText,
  AUTRE: FileText,
};

const ACTIVITY_LABELS: Record<ActiviteType, string> = {
  NOTE: 'Note',
  APPEL: 'Appel',
  EMAIL_ENVOYE: 'Email envoyé',
  EMAIL_RECU: 'Email reçu',
  RDV: 'Rendez-vous',
  CHANGEMENT_STATUT: 'Changement de statut',
  DEVIS_CREE: 'Devis créé',
  FACTURE_CREEE: 'Facture créée',
  AUTRE: 'Autre',
};

type FormData = {
  id?: string;
  affaireId: string;
  type: ActiviteType;
  title: string;
  content: string;
};

const EMPTY: FormData = {
  affaireId: '',
  type: 'NOTE',
  title: '',
  content: '',
};

export function Activites() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY);

  const { data: activitesData } = useQuery<{ data: Activite[], pagination: any }>({
    queryKey: ['activites'],
    queryFn: () => api.get('/activites').then((r) => r.data),
  });
  const activites = activitesData?.data || [];

  const { data: affairesData } = useQuery<{ data: Affaire[], pagination: any }>({
    queryKey: ['affaires'],
    queryFn: () => api.get('/affaires').then((r) => r.data),
  });
  const affaires = affairesData?.data || [];

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = { ...data };
      delete (payload as any).id;
      return data.id ? api.put(`/activites/${data.id}`, payload) : api.post('/activites', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activites'] });
      setOpen(false);
      setForm(EMPTY);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/activites/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activites'] }),
  });

  const openEdit = (a: Activite) => {
    setForm({
      id: a.id,
      affaireId: a.affaireId,
      type: a.type,
      title: a.title,
      content: a.content || '',
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
          <h1 className="font-serif text-2xl md:text-3xl">Activités</h1>
          <p className="text-sm text-muted-foreground">Historique des interactions et tâches</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }}>
          <Plus size={16} className="mr-2" /> Nouvelle activité
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Toutes les activités</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activites.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune activité</p>
            ) : (
              activites.map((a) => {
                const Icon = ACTIVITY_ICONS[a.type];
                const affaire = affaires.find(af => af.id === a.affaireId);
                return (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted">
                          {ACTIVITY_LABELS[a.type]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{a.title}</p>
                      {a.content && <p className="text-sm text-muted-foreground mt-1">{a.content}</p>}
                      {affaire && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Affaire: {affaire.title}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>
                        <Pencil size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(a.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Modifier' : 'Nouvelle'} activité</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Affaire *</Label>
                <Select value={form.affaireId} onValueChange={(v) => setForm({ ...form, affaireId: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir une affaire" /></SelectTrigger>
                  <SelectContent>
                    {affaires.map((a) => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ActiviteType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOTE">Note</SelectItem>
                    <SelectItem value="APPEL">Appel</SelectItem>
                    <SelectItem value="EMAIL_ENVOYE">Email envoyé</SelectItem>
                    <SelectItem value="EMAIL_RECU">Email reçu</SelectItem>
                    <SelectItem value="RDV">Rendez-vous</SelectItem>
                    <SelectItem value="AUTRE">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Titre *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="ex: Appel avec le client"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Détails de l'activité..."
                  rows={3}
                />
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
