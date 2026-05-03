import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar as CalendarIcon, Clock, MapPin, Phone, Mail, UserCheck, Trash2, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

type FormData = {
  id?: string;
  title: string;
  description: string;
  startDateDate: string;
  startDateTime: string;
  endDateDate: string;
  endDateTime: string;
  eventType: string;
  location: string;
};

const EMPTY: FormData = {
  title: '',
  description: '',
  startDateDate: '',
  startDateTime: '09:00',
  endDateDate: '',
  endDateTime: '10:00',
  eventType: 'MEETING',
  location: '',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  MEETING: 'Réunion',
  CALL: 'Appel',
  TASK: 'Tâche',
  REMINDER: 'Rappel',
  DEADLINE: 'Échéance',
  AUTRE: 'Autre',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: 'Programmé', color: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Terminé', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Annulé', color: 'bg-red-100 text-red-700' },
  POSTPONED: { label: 'Reporté', color: 'bg-yellow-100 text-yellow-700' },
};

export function Calendar() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'list'>('month');

  const { data: eventsData } = useQuery<{ data: any[], pagination: any }>({
    queryKey: ['calendar'],
    queryFn: () => api.get('/calendar').then((r) => r.data),
  });
  const events = eventsData?.data || [];

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload: any = {
        title: data.title,
        description: data.description || null,
        startDate: `${data.startDateDate}T${data.startDateTime}`,
        endDate: `${data.endDateDate}T${data.endDateTime}`,
        eventType: data.eventType,
        location: data.location || null,
      };
      return data.id ? api.put(`/calendar/${data.id}`, payload) : api.post('/calendar', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] });
      setOpen(false);
      setForm(EMPTY);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/calendar/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }),
  });

  const openEdit = (event: any) => {
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    setForm({
      id: event.id,
      title: event.title,
      description: event.description || '',
      startDateDate: start.toISOString().slice(0, 10),
      startDateTime: start.toTimeString().slice(0, 5),
      endDateDate: end.toISOString().slice(0, 10),
      endDateTime: end.toTimeString().slice(0, 5),
      eventType: event.eventType,
      location: event.location || '',
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: null, events: [] });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = events.filter((e: any) => {
        const eventDate = new Date(e.startDate);
        return eventDate.getDate() === day &&
               eventDate.getMonth() === month &&
               eventDate.getFullYear() === year;
      });
      days.push({ date, events: dayEvents });
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

  const navigateToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="space-y-6 px-2 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">Calendrier</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestion des événements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={navigateToToday}>
            Aujourd'hui
          </Button>
          <Button onClick={() => { setForm(EMPTY); setOpen(true); }}>
            <Plus size={16} className="mr-2" /> Nouvel événement
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft size={16} />
            </Button>
            <CardTitle className="text-lg font-semibold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight size={16} />
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
                className={`min-h-[120px] p-2 border rounded-lg ${
                  day.date ? 'hover:bg-muted/50 cursor-pointer' : 'bg-muted/30'
                }`}
              >
                {day.date && (
                  <>
                    <div className="text-sm font-medium mb-1">{day.date.getDate()}</div>
                    <div className="space-y-1">
                      {day.events.slice(0, 3).map((e: any) => {
                        const typeLabel = EVENT_TYPE_LABELS[e.eventType] || e.eventType;
                        return (
                          <div
                            key={e.id}
                            className="text-xs p-1 rounded bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                            onClick={() => openEdit(e)}
                            title={e.title}
                          >
                            <div className="font-medium truncate">{e.title}</div>
                            <div className="text-xs opacity-75">
                              {new Date(e.startDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        );
                      })}
                      {day.events.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{day.events.length - 3} autres
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

      {/* Upcoming Events List */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Événements à venir</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun événement</p>
            ) : (
              events.slice(0, 5).map((event: any) => {
                const statusInfo = STATUS_LABELS[event.status] || STATUS_LABELS.SCHEDULED;
                return (
                  <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CalendarIcon size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-sm">{event.title}</span>
                        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(event.startDate).toLocaleString('fr-FR', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin size={12} />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(event)}>
                        <Pencil size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(event.id)}>
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

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Modifier' : 'Nouvel'} événement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Titre *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Réunion client ABC" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date début *</Label>
                  <Input type="date" value={form.startDateDate} onChange={(e) => setForm({ ...form, startDateDate: e.target.value, endDateDate: form.endDateDate || e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Heure début *</Label>
                  <Input type="time" value={form.startDateTime} onChange={(e) => setForm({ ...form, startDateTime: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date fin *</Label>
                  <Input type="date" value={form.endDateDate} onChange={(e) => setForm({ ...form, endDateDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Heure fin *</Label>
                  <Input type="time" value={form.endDateTime} onChange={(e) => setForm({ ...form, endDateTime: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.eventType} onValueChange={(v) => setForm({ ...form, eventType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Lieu</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Optionnel" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Notes..." rows={2} />
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
