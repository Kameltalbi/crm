import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Phone, Mail, Calendar, FileText, Trash2, Pencil, DollarSign, Target, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDT, MOIS } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { StatutBadge } from './Dashboard';
import type { Affaire, Activite, ActiviteType } from '@/types';

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

type ActivityFormData = {
  type: ActiviteType;
  title: string;
  content: string;
};

const EMPTY_ACTIVITY: ActivityFormData = {
  type: 'NOTE',
  title: '',
  content: '',
};

export function AffaireDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityForm, setActivityForm] = useState<ActivityFormData>(EMPTY_ACTIVITY);

  const { data: affaire, isLoading } = useQuery<Affaire>({
    queryKey: ['affaire', id],
    queryFn: () => api.get(`/affaires/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const saveActivityMutation = useMutation({
    mutationFn: (data: ActivityFormData) => {
      return api.post('/activites', { ...data, affaireId: id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['affaire', id] });
      setActivityOpen(false);
      setActivityForm(EMPTY_ACTIVITY);
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: (activityId: string) => api.delete(`/activites/${activityId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affaire', id] }),
  });

  if (isLoading) {
    return <div className="text-center py-20 text-muted-foreground">Chargement...</div>;
  }

  if (!affaire) {
    return <div className="text-center py-20 text-muted-foreground">Affaire introuvable</div>;
  }

  const handleActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveActivityMutation.mutate(activityForm);
  };

  return (
    <div className="space-y-6 px-2 md:px-0">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/affaires')}>
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <h1 className="font-serif text-2xl md:text-3xl">{affaire.title}</h1>
          <p className="text-sm text-muted-foreground">{affaire.client?.name || 'N/A'}</p>
        </div>
      </div>

      {/* Affaire Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign size={16} /> Montant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtDT(Number(affaire.montantHT))}</p>
            <p className="text-sm text-muted-foreground">HT</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target size={16} /> Statut
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatutBadge statut={affaire.statut} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp size={16} /> Probabilité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{affaire.probabilite}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Informations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium">{affaire.type === 'BILAN_CARBONE' ? 'Bilan Carbone' : 'Formation'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Mois prévu</p>
              <p className="font-medium">{MOIS[affaire.moisPrevu]} {affaire.anneePrevue}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Via partenaire</p>
              <p className="font-medium">{affaire.viaPartenaire ? 'Oui' : 'Non'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Commission</p>
              <p className="font-medium">{affaire.tauxCommission}%</p>
            </div>
          </div>
          {affaire.notes && (
            <div className="mt-4">
              <p className="text-muted-foreground text-sm">Notes</p>
              <p className="text-sm mt-1">{affaire.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activities Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Historique des activités</CardTitle>
            <Button size="sm" onClick={() => setActivityOpen(true)}>
              <Plus size={14} className="mr-2" /> Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {affaire.activites?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune activité</p>
            ) : (
              affaire.activites?.map((a: Activite) => {
                const Icon = ACTIVITY_ICONS[a.type];
                return (
                  <div key={a.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Icon size={18} className="text-muted-foreground" />
                      </div>
                      <div className="w-0.5 flex-1 bg-border mt-2" />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted">
                          {ACTIVITY_LABELS[a.type]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(a.createdAt).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{a.title}</p>
                      {a.content && <p className="text-sm text-muted-foreground mt-1">{a.content}</p>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Activity Dialog */}
      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle activité</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleActivitySubmit}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select value={activityForm.type} onValueChange={(v) => setActivityForm({ ...activityForm, type: v as ActiviteType })}>
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
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  placeholder="ex: Appel avec le client"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={activityForm.content}
                  onChange={(e) => setActivityForm({ ...activityForm, content: e.target.value })}
                  placeholder="Détails de l'activité..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setActivityOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saveActivityMutation.isPending}>
                {saveActivityMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
