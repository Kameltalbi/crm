import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Mail, Phone, FileBadge, Search, TrendingUp, MoreVertical, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDT } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DropdownMenu, DropdownMenuTriggerButton, DropdownMenuContentWrapper, DropdownMenuItem } from '@/components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { Client } from '@/types';
import * as XLSX from 'xlsx';

const EMPTY = { id: '', name: '', contactName: '', email: '', phone: '', address: '', matricule: '', qualificatif: 'NON_SPECIFIE', notes: '' };

export function Clients() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);

  const [page, setPage] = useState(1);

  const { data: clientsData } = useQuery<{ data: Client[], pagination: any }>({
    queryKey: ['clients', page],
    queryFn: () => api.get('/clients', { params: { page, limit: 50 } }).then((r) => r.data),
  });
  const clients = clientsData?.data || [];
  const pagination = clientsData?.pagination;

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contactName && c.contactName.toLowerCase().includes(search.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const totalAffaires = clients.reduce((sum, c) => sum + (c._count?.affaires || 0), 0);
  const avgAffairesPerClient = clients.length > 0 ? (totalAffaires / clients.length).toFixed(1) : 0;

  const saveMutation = useMutation({
    mutationFn: (data: typeof EMPTY) => {
      const payload = { ...data };
      delete (payload as any).id;
      return data.id ? api.put(`/clients/${data.id}`, payload) : api.post('/clients', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });

  const importMutation = useMutation({
    mutationFn: (clients: Omit<typeof EMPTY, 'id'>[]) => api.post('/clients/import', { clients }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      setImportOpen(false);
      setImportFile(null);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleImport = () => {
    if (!importFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (data) {
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

        const clientsToImport = jsonData.map((row: any) => ({
          name: row.name || row.Raison_sociale || row['Raison sociale'] || '',
          contactName: row.contactName || row.Contact || '',
          email: row.email || row.Email || '',
          phone: row.phone || row.Téléphone || row.Telephone || '',
          address: row.address || row.Adresse || '',
          matricule: row.matricule || row.Matricule || '',
          qualificatif: row.qualificatif || row.Qualificatif || 'NON_SPECIFIE',
          notes: row.notes || row.Notes || '',
        }));

        importMutation.mutate(clientsToImport);
      }
    };
    reader.readAsBinaryString(importFile);
  };

  const openEdit = (c: Client) => {
    setForm({
      id: c.id, name: c.name, contactName: c.contactName || '',
      email: c.email || '', phone: c.phone || '', address: c.address || '',
      matricule: c.matricule || '', qualificatif: c.qualificatif || '', notes: c.notes || '',
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6 px-2 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl">Clients</h1>
          <p className="text-sm text-muted-foreground">Gestion des clients et prospects</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setImportOpen(true)} variant="outline" className="w-full sm:w-auto">
            <Upload size={16} />Importer Excel
          </Button>
          <Button onClick={() => { console.log('Opening form'); setForm(EMPTY); setOpen(true); console.log('Form should be open'); }} className="w-full sm:w-auto">
            <Plus size={16} />Nouveau client
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Card className="border-2">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 bg-gray-100 rounded-lg">
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] text-muted-foreground">Total clients</p>
                <p className="text-sm md:text-lg font-bold">{clients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 bg-emerald-100 rounded-lg">
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] text-muted-foreground">Total affaires</p>
                <p className="text-sm md:text-lg font-bold text-emerald-600">{totalAffaires}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-200 bg-blue-50/30">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] text-muted-foreground">Moyenne/client</p>
                <p className="text-sm md:text-lg font-bold text-blue-600">{avgAffairesPerClient}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher par nom, contact ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* List View */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-sage">
                  <th className="text-left p-3 uppercase tracking-wider text-leaf font-semibold">Client</th>
                  <th className="text-left p-3 uppercase tracking-wider text-leaf font-semibold">Contact</th>
                  <th className="text-left p-3 uppercase tracking-wider text-leaf font-semibold">Email</th>
                  <th className="text-left p-3 uppercase tracking-wider text-leaf font-semibold">Téléphone</th>
                  <th className="text-left p-3 uppercase tracking-wider text-leaf font-semibold">Qualificatif</th>
                  <th className="text-left p-3 uppercase tracking-wider text-leaf font-semibold">Matricule</th>
                  <th className="text-center p-3 uppercase tracking-wider text-leaf font-semibold">Affaires</th>
                  <th className="text-right p-3 uppercase tracking-wider text-leaf font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-sage/50">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-muted-foreground">{c.contactName || '—'}</td>
                    <td className="p-3 text-muted-foreground">{c.email || '—'}</td>
                    <td className="p-3 text-muted-foreground">{c.phone || '—'}</td>
                    <td className="p-3 text-muted-foreground">
                      {c.qualificatif === 'PROSPECT' ? '🔍 Prospect' : c.qualificatif === 'CLIENT' ? '🤝 Client' : '—'}
                    </td>
                    <td className="p-3 text-muted-foreground">{c.matricule || '—'}</td>
                    <td className="p-3 text-center">
                      <span className="bg-sage text-leaf px-2 py-0.5 rounded-full text-xs font-medium">
                        {c._count?.affaires || 0}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTriggerButton asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-gray-100"
                            title="Actions"
                          >
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTriggerButton>
                        <DropdownMenuContentWrapper align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            <Pencil size={16} className="mr-2 text-muted-foreground" /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => confirm('Supprimer ce client ?') && deleteMutation.mutate(c.id)} className="text-destructive">
                            <Trash2 size={16} className="mr-2" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContentWrapper>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Aucun client trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        {pagination && pagination.totalPages > 1 && (
          <CardContent className="border-t pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {pagination.total} clients
              </p>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={page === 1 ? 'ghost' : 'default'}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3"
                >
                  ← Précédent
                </Button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={p === page ? 'default' : 'outline'}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 p-0 ${p === page ? 'font-bold' : ''}`}
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant={page === pagination.totalPages ? 'ghost' : 'default'}
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="px-3"
                >
                  Suivant →
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Modifier' : 'Nouveau'} client</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Raison sociale *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Matricule fiscal</Label>
              <Input value={form.matricule} onChange={(e) => setForm({ ...form, matricule: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Qualificatif</Label>
              <Select value={form.qualificatif} onValueChange={(v) => setForm({ ...form, qualificatif: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NON_SPECIFIE">Non spécifié</SelectItem>
                  <SelectItem value="PROSPECT">🔍 Prospect</SelectItem>
                  <SelectItem value="CLIENT">🤝 Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Adresse</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name}>💾 Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importer clients depuis Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Fichier Excel (.xlsx, .xls)</Label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
              />
            </div>
            {importFile && (
              <div className="text-sm text-muted-foreground">
                Fichier sélectionné: {importFile.name}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Les colonnes Excel doivent être: name (ou Raison sociale), contactName (ou Contact), email, phone (ou Téléphone), address (ou Adresse), matricule (ou Matricule), qualificatif, notes
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setImportFile(null); }}>Annuler</Button>
            <Button onClick={handleImport} disabled={!importFile || importMutation.isPending}>
              {importMutation.isPending ? 'Importation...' : 'Importer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
