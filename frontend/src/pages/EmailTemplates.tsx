import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Mail, Eye, Sparkles } from 'lucide-react';
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
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState({ subject: '', body: '' });
  const [aiOpen, setAiOpen] = useState(false);
  const [aiForm, setAiForm] = useState({
    type: 'Relance',
    tone: 'Professionnel',
    language: 'Français',
    objective: '',
    context: '',
  });

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

  const generateMutation = useMutation({
    mutationFn: () =>
      api.post('/email-templates/generate', aiForm).then((r) => r.data),
    onSuccess: (generated) => {
      setForm((prev) => ({
        ...prev,
        name: generated.name || prev.name,
        subject: generated.subject || prev.subject,
        body: generated.body || prev.body,
        variables: generated.variables || prev.variables,
      }));
      setAiOpen(false);
      setOpen(true);
    },
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
    if (confirm(t('emailTemplates.confirmDelete'))) deleteMutation.mutate(id);
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
    <div className="space-y-5 md:space-y-6 px-2 md:px-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight break-words">
            {t('emailTemplates.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('emailTemplates.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:shrink-0">
          <Button
            className="w-full sm:w-auto justify-center"
            onClick={() => {
              setForm(EMPTY);
              setOpen(true);
            }}
          >
            <Plus size={16} className="mr-2 shrink-0" /> {t('emailTemplates.newTemplate')}
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto justify-center"
            onClick={() => setAiOpen(true)}
            disabled={generateMutation.isPending}
          >
            <Sparkles size={16} className="mr-2 shrink-0" /> Générer avec IA
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {templates?.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-start gap-2 min-w-0">
                <Mail size={18} className="text-muted-foreground shrink-0 mt-0.5" />
                <span className="break-words leading-snug">{template.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t('emailTemplates.subject')}</p>
                <p className="text-sm font-medium break-words">{template.subject}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t('emailTemplates.variables')}</p>
                <p className="text-xs break-words">
                  {(() => {
                    try {
                      return (JSON.parse(template.variables) as string[]).join(', ');
                    } catch {
                      return template.variables;
                    }
                  })()}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:flex-1 sm:min-w-0"
                  onClick={() => handlePreview(template)}
                >
                  <Eye size={14} className="mr-1 shrink-0" /> {t('emailTemplates.preview')}
                </Button>
                <Button size="sm" variant="outline" className="w-full sm:flex-1" onClick={() => handleEdit(template)}>
                  <Pencil size={14} className="mr-1 shrink-0" /> {t('common.edit')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto sm:ml-auto text-destructive border-destructive/30 hover:bg-destructive/10 justify-center"
                  onClick={() => handleDelete(template.id)}
                  aria-label={t('common.delete')}
                >
                  <Trash2 size={14} className="shrink-0" />
                  <span className="ml-2 sm:hidden">{t('common.delete')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-left pr-8 break-words">
              {form.id ? t('common.edit') : t('common.add')} {t('emailTemplates.template')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t('common.name')} *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('emailTemplates.namePlaceholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('emailTemplates.subject')} *</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder={t('emailTemplates.subjectPlaceholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('emailTemplates.body')} *</Label>
                <Textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder={t('emailTemplates.bodyPlaceholder')}
                  rows={8}
                  className="min-h-[180px] text-base sm:text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('emailTemplates.availableVariables')}</Label>
                <p className="text-xs text-muted-foreground">
                  {`{client}, {montant}, {date}, {statut}, {titre}, {probabilite}`}
                </p>
              </div>
            </div>
            <DialogFooter className="mt-6 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? t('organizations.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-left pr-8">{t('emailTemplates.previewTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t('emailTemplates.subject')}</p>
              <p className="font-medium break-words">{previewData.subject}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t('emailTemplates.body')}</p>
              <div className="p-3 sm:p-4 max-h-[50vh] overflow-y-auto bg-gray-50 rounded-lg text-sm whitespace-pre-wrap break-words">
                {previewData.body}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full sm:w-auto" onClick={() => setPreviewOpen(false)}>
              {t('emailTemplates.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-left pr-8">Générer un template avec IA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type d'email</Label>
              <Input
                value={aiForm.type}
                onChange={(e) => setAiForm({ ...aiForm, type: e.target.value })}
                placeholder="Relance, proposition, remerciement..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ton</Label>
                <Input
                  value={aiForm.tone}
                  onChange={(e) => setAiForm({ ...aiForm, tone: e.target.value })}
                  placeholder="Professionnel, cordial, direct..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Langue</Label>
                <Input
                  value={aiForm.language}
                  onChange={(e) => setAiForm({ ...aiForm, language: e.target.value })}
                  placeholder="Français"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Objectif</Label>
              <Input
                value={aiForm.objective}
                onChange={(e) => setAiForm({ ...aiForm, objective: e.target.value })}
                placeholder="Obtenir un rendez-vous cette semaine..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contexte (optionnel)</Label>
              <Textarea
                value={aiForm.context}
                onChange={(e) => setAiForm({ ...aiForm, context: e.target.value })}
                rows={4}
                placeholder="Détails utiles sur l'offre ou la relation client..."
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setAiOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button className="w-full sm:w-auto" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? 'Génération...' : 'Générer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
