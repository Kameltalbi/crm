import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/form-controls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Organization } from '@/types';

export function OrganizationSettings() {
  const { data: organization, refetch } = useQuery<Organization[]>({
    queryKey: ['organizations'],
    queryFn: () => api.get('/organizations').then((r) => r.data),
  });

  const org = organization?.[0];

  const [name, setName] = useState(org?.name || '');
  const [email, setEmail] = useState(org?.email || '');
  const [phone, setPhone] = useState(org?.phone || '');
  const [address, setAddress] = useState(org?.address || '');
  const [tva, setTva] = useState(org?.tva || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(org?.logoUrl || '');

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/organizations/${org?.id}`, data),
    onSuccess: () => {
      refetch();
      alert('Organisation mise à jour avec succès');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => api.post(`/organizations/${org?.id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    onSuccess: () => {
      refetch();
      alert('Logo téléchargé avec succès');
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoUpload = () => {
    if (logoFile) {
      const formData = new FormData();
      formData.append('logo', logoFile);
      uploadMutation.mutate(formData);
    }
  };

  const handleSave = () => {
    updateMutation.mutate({ name, email, phone, address, tva });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations de l'organisation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nom de l'organisation *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: ktOptima"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email de contact</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@ktoptima.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+216 55 053 505"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address">Adresse</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Tunis, Tunisie"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tva">Matricule fiscal</Label>
          <Input
            id="tva"
            value={tva}
            onChange={(e) => setTva(e.target.value)}
            placeholder="1234567/A/M/000"
          />
        </div>

        <div className="border-t pt-4">
          <Label htmlFor="logo">Logo</Label>
          <div className="flex items-center gap-4 mt-2">
            {logoPreview && (
              <img src={logoPreview} alt="Logo" className="h-16 w-auto" />
            )}
            <input
              id="logo"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="flex-1"
            />
            {logoFile && (
              <Button onClick={handleLogoUpload} disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? 'Téléchargement...' : 'Télécharger'}
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
