import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Phone, Mail, Calendar, FileText, Trash2, Pencil, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAffaire, setFilterAffaire] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('2026');
  const [view, setView] = useState<'timeline' | 'calendar'>('timeline');
  const [currentDate, setCurrentDate] = useState(new Date());

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

  // Filter activities
  const filteredActivites = activites.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterAffaire !== 'all' && a.affaireId !== filterAffaire) return false;
    if (filterMonth !== 'all') {
      const activityDate = new Date(a.createdAt);
      if (activityDate.getMonth() + 1 !== parseInt(filterMonth)) return false;
    }
    if (filterYear !== 'all') {
      const activityDate = new Date(a.createdAt);
      if (activityDate.getFullYear() !== parseInt(filterYear)) return false;
    }
    return true;
  });

  // Group by date
  const groupedByDate = filteredActivites.reduce((acc, a) => {
    const date = new Date(a.createdAt).toLocaleDateString('fr-FR');
    if (!acc[date]) acc[date] = [];
    acc[date].push(a);
    return acc;
  }, {} as Record<string, Activite[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // Calendar view logic
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: null, activities: [] });
    }
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toLocaleDateString('fr-FR');
      const dayActivities = filteredActivites.filter(a => {
        const activityDate = new Date(a.createdAt).toLocaleDateString('fr-FR');
        return activityDate === dateStr;
      });
      days.push({ date, activities: dayActivities });
    }
    return days;
  };

  const calendarDays = getCalendarDays();
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

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
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">Activités</h1>
          <p className="text-sm text-muted-foreground mt-1">Timeline et calendrier des interactions</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }}>
          <Plus size={16} className="mr-2" /> Nouvelle activité
        </Button>
      </div>

      {/* View Toggle and Filters */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={view === 'timeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('timeline')}
          >
            Timeline
          </Button>
          <Button
            variant={view === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('calendar')}
          >
            Calendrier
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAffaire} onValueChange={setFilterAffaire}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Affaire" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes affaires</SelectItem>
              {affaires.map((a) => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Mois" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous mois</SelectItem>
              {monthNames.map((label, idx) => (
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
      </div>

      {/* Calendar View */}
      {view === 'calendar' && (
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <Calendar size={16} className="mr-2" /> Précédent
              </Button>
              <CardTitle className="text-lg font-semibold">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                Suivant <Calendar size={16} className="ml-2" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`min-h-[100px] p-2 border rounded-lg ${
                    day.date ? 'hover:bg-muted/50 cursor-pointer' : 'bg-muted/30'
                  }`}
                >
                  {day.date && (
                    <>
                      <div className="text-sm font-medium mb-1">{day.date.getDate()}</div>
                      <div className="space-y-1">
                        {day.activities.slice(0, 3).map((a) => {
                          const Icon = ACTIVITY_ICONS[a.type];
                          return (
                            <div
                              key={a.id}
                              className="text-xs p-1 rounded bg-primary/10 text-primary flex items-center gap-1"
                              title={a.title}
                            >
                              <Icon size={10} />
                              <span className="truncate">{a.title}</span>
                            </div>
                          );
                        })}
                        {day.activities.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{day.activities.length - 3} autres
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline View */}
      {view === 'timeline' && (
        <div className="space-y-8">
          {filteredActivites.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-sm text-muted-foreground">Aucune activité</p>
              </CardContent>
            </Card>
          ) : (
            sortedDates.map((date) => (
              <div key={date}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-px h-8 bg-border"></div>
                  <h3 className="text-sm font-semibold text-muted-foreground">{date}</h3>
                </div>
                <div className="relative pl-8 space-y-4">
                  <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border"></div>
                  {groupedByDate[date].map((a, idx) => {
                    const Icon = ACTIVITY_ICONS[a.type];
                    const affaire = affaires.find(af => af.id === a.affaireId);
                    const isFirst = idx === 0;
                    const isLast = idx === groupedByDate[date].length - 1;
                    return (
                      <div key={a.id} className="relative">
                        <div className={`absolute -left-[23px] w-3 h-3 rounded-full bg-background border-2 ${
                          a.type === 'NOTE' ? 'border-blue-500' :
                          a.type === 'APPEL' ? 'border-green-500' :
                          a.type === 'EMAIL_ENVOYE' || a.type === 'EMAIL_RECU' ? 'border-purple-500' :
                          a.type === 'RDV' ? 'border-orange-500' : 'border-gray-500'
                        } ${isFirst ? 'top-4' : isLast ? 'bottom-4' : 'top-1/2 -translate-y-1/2'}`}></div>
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <Icon size={18} className="text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge variant="secondary" className="text-xs">
                                    {ACTIVITY_LABELS[a.type]}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(a.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="font-medium text-sm">{a.title}</p>
                                {a.content && <p className="text-sm text-muted-foreground mt-1">{a.content}</p>}
                                {affaire && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Affaire: <span className="font-medium">{affaire.title}</span>
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
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

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
