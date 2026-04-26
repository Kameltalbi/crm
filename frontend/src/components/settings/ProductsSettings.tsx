import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function ProductsSettings() {
  const navigate = useNavigate();

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Package className="text-blue-600" size={20} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Gestion des produits</CardTitle>
            <CardDescription>Créer et gérer vos produits et services</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button onClick={() => navigate('/products')} className="w-full sm:w-auto">
          Gérer les produits
        </Button>
      </CardContent>
    </Card>
  );
}
