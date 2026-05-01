import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Mail, Eye, Save, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type FormData = {
  id?: string;
  name: string;
  subject: string;
  body: string;
  variables: string;
  isActive: boolean;
};

const EMPTY: FormData = {
  name: '',
  subject: '',
  body: '',
  variables: JSON.stringify(['client', 'montant', 'date', 'statut']),
  isActive: true,
};

export function EmailTemplates() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState({ subject: '', body: '' });

  const { data: templates } = useQuery<EmailTemplate[]>({
    queryKey: ['email-templates'],
    queryFn: () => api.get('/email-templates').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/email-templates', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-templates'] });
      setOpen(false);
      setForm(EMPTY);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      api.put(`/email-templates/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-templates'] });
      setOpen(false);
      setForm(EMPTY);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/email-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-templates'] }),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.id) {
      updateMutation.mutate({ id: form.id as string, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setForm(template as any);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer ce template ?')) deleteMutation.mutate(id);
  };

  const handlePreview = (template: EmailTemplate) => {
    // Replace variables for preview
    let subject = template.subject;
    let body = template.body;
    
    const variables = {
      client: 'Client Exemple',
      montant: '5 000 DT',
      date: new Date().toLocaleDateString('fr-FR'),
      statut: 'PIPELINE',
      titre: 'Affaire Test',
      probabilite: '50%',
    };
    
    Object.entries(variables).forEach(([key, value]) => {
      subject = subject.replace(new RegExp(`{${key}}`, 'g'), value);
      body = body.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    
    setPreviewData({ subject, body });
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-6 px-2 md:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">Templates d'emails</h1>
          <p className="text-sm text-muted-foreground mt-1">Créez et gérez vos templates d'emails personnalisés</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }}>
          <Plus size={16} className="mr-2" /> Nouveau template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates?.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail size={18} className="text-muted-foreground" />
                {template.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Sujet</p>
                <p className="text-sm font-medium truncate">{template.subject}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Variables</p>
                <p className="text-xs">{JSON.parse(template.variables).join(', ')}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => handlePreview(template)}>
                  <Eye size={14} className="mr-1" /> Aperçu
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleEdit(template)}>
                  <Pencil size={14} className="mr-1" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(template.id)} className="text-destructive">
                  <Trash2 size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Modifier' : 'Nouveau'} template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nom *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="ex: Suivi devis"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sujet *</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="ex: Devis {montant} pour {client}"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Corps *</Label>
                <Textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Bonjour {client},&#10;&#10;Votre devis de {montant} DT est en attente.&#10;&#10;Cordialement"
                  rows={8}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Variables disponibles</Label>
                <p className="text-xs text-muted-foreground">
                  {`{client}, {montant}, {date}, {statut}, {titre}, {probabilite}`}
                </p>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aperçu de l'email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Sujet</p>
              <p className="font-medium">{previewData.subject}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Corps</p>
              <div className="p-4 bg-gray-50 rounded text-sm whitespace-pre-wrap">{previewData.body}</div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setPreviewOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
