import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function SoftfactureSettings() {
  return (
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
  );
}
