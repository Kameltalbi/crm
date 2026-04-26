import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { User } from '@/types';

export function UsersSettings() {
  const navigate = useNavigate();

  const { data: currentUser } = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data.user),
  });

  if (currentUser?.role !== 'OWNER') {
    return null;
  }

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Users className="text-purple-600" size={20} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Gestion des utilisateurs</CardTitle>
            <CardDescription>Créer et gérer les utilisateurs et leurs rôles</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button onClick={() => navigate('/users')} className="w-full sm:w-auto">
          Gérer les utilisateurs
        </Button>
      </CardContent>
    </Card>
  );
}
