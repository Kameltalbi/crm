import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'list'>('month');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setView('list');
    }
  }, []);

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

  const eventsInMonth = events
    .filter((e: any) => {
      const d = new Date(e.startDate);
      return d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth();
    })
    .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const monthNames = [
    t('expenses.months.january'),
    t('expenses.months.february'),
    t('expenses.months.march'),
    t('expenses.months.april'),
    t('expenses.months.may'),
    t('expenses.months.june'),
    t('expenses.months.july'),
    t('expenses.months.august'),
    t('expenses.months.september'),
    t('expenses.months.october'),
    t('expenses.months.november'),
    t('expenses.months.december'),
  ];
  const dayNames = [t('calendarPage.days.sun'), t('calendarPage.days.mon'), t('calendarPage.days.tue'), t('calendarPage.days.wed'), t('calendarPage.days.thu'), t('calendarPage.days.fri'), t('calendarPage.days.sat')];

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
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">{t('calendarPage.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('calendarPage.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
          <div className="grid grid-cols-2 sm:flex gap-1 w-full sm:w-auto">
            <Button
              variant={view === 'month' ? 'default' : 'outline'}
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setView('month')}
            >
              {t('calendarPage.viewMonth')}
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setView('list')}
            >
              {t('calendarPage.viewList')}
            </Button>
          </div>
          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={navigateToToday}>
            {t('calendarPage.today')}
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => { setForm(EMPTY); setOpen(true); }}>
            <Plus size={16} className="mr-2" /> {t('calendarPage.newEvent')}
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="space-y-2 pb-3">
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigateMonth('prev')} aria-label={t('common.previous')}>
              <ChevronLeft size={16} />
            </Button>
            <CardTitle className="text-base sm:text-lg font-semibold text-center truncate px-2">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigateMonth('next')} aria-label={t('common.next')}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {view === 'list' ? (
            <div className="space-y-2 min-h-[200px]">
              {eventsInMonth.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t('calendarPage.none')}</p>
              ) : (
                eventsInMonth.map((event: any) => {
                  const statusInfo = STATUS_LABELS[event.status] || STATUS_LABELS.SCHEDULED;
                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Clock size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">{event.title}</span>
                          <Badge className={`shrink-0 ${statusInfo.color}`}>{statusInfo.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(event.startDate).toLocaleString(
                            i18n.language === 'ar' ? 'ar-TN' : i18n.language === 'en' ? 'en-GB' : 'fr-FR',
                            {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </p>
                        {event.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 min-w-0">
                            <MapPin size={12} className="shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(event)}>
                          <Pencil size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(event.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1 sm:mb-2">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="text-center text-[10px] sm:text-sm font-medium text-muted-foreground py-1 sm:py-2 leading-tight truncate"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {calendarDays.map((day, idx) => (
                  <div
                    key={idx}
                    className={`min-h-[52px] sm:min-h-[88px] md:min-h-[120px] p-0.5 sm:p-1 md:p-2 border rounded-md sm:rounded-lg text-left ${
                      day.date ? 'hover:bg-muted/50 cursor-pointer' : 'bg-muted/30 pointer-events-none'
                    }`}
                  >
                    {day.date && (
                      <>
                        <div className="text-[11px] sm:text-sm font-medium mb-0.5 sm:mb-1 leading-none">{day.date.getDate()}</div>
                        <div className="hidden sm:block space-y-1">
                          {day.events.slice(0, 3).map((e: any) => (
                            <div
                              key={e.id}
                              className="text-[10px] md:text-xs p-0.5 md:p-1 rounded bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                              onClick={() => openEdit(e)}
                              title={e.title}
                            >
                              <div className="font-medium truncate">{e.title}</div>
                              <div className="text-[10px] opacity-75 hidden md:block">
                                {new Date(e.startDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          ))}
                          {day.events.length > 3 && (
                            <div className="text-[10px] text-muted-foreground">
                              +{day.events.length - 3} {t('calendarPage.others')}
                            </div>
                          )}
                        </div>
                        <div className="sm:hidden flex flex-wrap gap-0.5 mt-0.5">
                          {day.events.slice(0, 3).map((e: any) => (
                            <button
                              key={e.id}
                              type="button"
                              className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                              onClick={() => openEdit(e)}
                              aria-label={e.title}
                            />
                          ))}
                          {day.events.length > 3 && (
                            <span className="text-[9px] text-muted-foreground ml-0.5">+{day.events.length - 3}</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Events List */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('calendarPage.upcoming')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('calendarPage.none')}</p>
            ) : (
              events.slice(0, 5).map((event: any) => {
                const statusInfo = STATUS_LABELS[event.status] || STATUS_LABELS.SCHEDULED;
                return (
                  <div key={event.id} className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <CalendarIcon size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-sm break-words">{event.title}</span>
                          <Badge className={`shrink-0 ${statusInfo.color}`}>{statusInfo.label}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(event.startDate).toLocaleString(
                            i18n.language === 'ar' ? 'ar-TN' : i18n.language === 'en' ? 'en-GB' : 'fr-FR',
                            {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 min-w-0">
                            <MapPin size={12} className="shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 justify-end sm:justify-start shrink-0 border-t border-border/60 pt-2 sm:border-0 sm:pt-0 sm:pl-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(event)}>
                        <Pencil size={14} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(event.id)}>
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>{form.id ? t('common.edit') : t('common.add')} {t('calendarPage.event')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t('expenses.titleCol')} *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('calendarPage.titlePlaceholder')} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t('calendarPage.startDate')} *</Label>
                  <Input type="date" value={form.startDateDate} onChange={(e) => setForm({ ...form, startDateDate: e.target.value, endDateDate: form.endDateDate || e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('calendarPage.startTime')} *</Label>
                  <Input type="time" value={form.startDateTime} onChange={(e) => setForm({ ...form, startDateTime: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t('calendarPage.endDate')} *</Label>
                  <Input type="date" value={form.endDateDate} onChange={(e) => setForm({ ...form, endDateDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('calendarPage.endTime')} *</Label>
                  <Input type="time" value={form.endDateTime} onChange={(e) => setForm({ ...form, endDateTime: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t('calendarPage.type')}</Label>
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
                  <Label>{t('calendarPage.location')}</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t('calendarPage.optional')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t('leads.notes')}</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t('leads.notes')} rows={2} />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? t('organizations.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
