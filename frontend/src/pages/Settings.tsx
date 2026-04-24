import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function Settings() {
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const [toast, setToast] = useState<string | null>(null);

  const { data: gmailStatus } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: () => api.get('/gmail/status').then((r) => r.data),
  });

  useEffect(() => {
    if (params.get('gmail') === 'connected') {
      setToast('✅ Gmail connecté avec succès !');
      qc.invalidateQueries({ queryKey: ['gmail-status'] });
      setTimeout(() => setToast(null), 4000);
    }
  }, [params, qc]);

  const connectGmail = async () => {
    const { data } = await api.get('/gmail/auth');
    window.location.href = data.url;
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="font-serif text-3xl">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Intégrations et configuration</p>
      </div>

      {toast && (
        <div className="bg-leaf text-white px-4 py-2 rounded-lg text-sm">{toast}</div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <Mail className="text-red-600" size={20} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Gmail</CardTitle>
              <CardDescription>Envoyer devis et factures directement depuis le CRM</CardDescription>
            </div>
            {gmailStatus?.connected ? (
              <div className="flex items-center gap-1.5 text-sm text-leaf font-medium">
                <CheckCircle2 size={16} />Connecté
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <XCircle size={16} />Non connecté
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {gmailStatus?.connected ? (
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Compte : </span>
                <span className="font-medium">{gmailStatus.email}</span>
              </div>
              <Button variant="outline" onClick={connectGmail}>Changer de compte</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connectez votre compte Gmail pour envoyer vos documents Softfacture par email en un clic.
              </p>
              <Button onClick={connectGmail}>Connecter Gmail</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Softfacture API</CardTitle>
          <CardDescription>Intégration avec votre app de facturation</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configuration définie dans le fichier <code className="bg-muted px-1.5 py-0.5 rounded">.env</code>
            du serveur (variables <code className="bg-muted px-1 py-0.5 rounded">SOFTFACTURE_API_URL</code> et
            <code className="bg-muted px-1 py-0.5 rounded ml-1">SOFTFACTURE_API_KEY</code>).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
