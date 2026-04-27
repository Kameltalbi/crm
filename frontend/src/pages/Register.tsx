import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Leaf, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/form-controls';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { email, password, name, organizationName });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sage to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-xl bg-leaf flex items-center justify-center">
            <Leaf className="text-white" size={22} />
          </div>
          <div>
            <CardTitle>kt-Optima</CardTitle>
            <CardDescription>Créer votre organisation et compte</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="organizationName">Nom de l'organisation *</Label>
              <Input id="organizationName" type="text" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Votre nom *</Label>
              <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe (min. 6 caractères) *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Inscription...' : 'S\'inscrire'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Déjà un compte ? <Link to="/login" className="text-leaf hover:underline">Se connecter</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
