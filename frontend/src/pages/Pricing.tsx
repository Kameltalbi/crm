import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CreditCard, Wallet, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';

const plans = [
  {
    name: 'Starter',
    monthlyPrice: 30,
    annualPrice: 360,
    features: [
      '3 opportunités',
      '1 utilisateur',
      'Email templates de base',
      'Support email',
    ],
    maxUsers: 1,
  },
  {
    name: 'Pro',
    monthlyPrice: 50,
    annualPrice: 600,
    features: [
      'Opportunités illimitées',
      '5 utilisateurs',
      'Assistant IA conversationnel',
      'Lead scoring automatique',
      'Intégration Softfacture',
      'Support prioritaire',
      'Backup quotidien',
    ],
    maxUsers: 5,
    popular: true,
  },
];

export function Pricing() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'VIREMENT' | 'ESPECES'>('VIREMENT');
  const [dialogOpen, setDialogOpen] = useState(false);

  const subscribeMutation = useMutation({
    mutationFn: () =>
      api.post('/subscriptions', { plan: selectedPlan, paymentMethod: selectedPaymentMethod }).then((r) => r.data),
    onSuccess: () => {
      alert('Demande d\'abonnement envoyée ! Nous vous contacterons pour confirmer le paiement.');
      setDialogOpen(false);
      navigate('/dashboard');
    },
  });

  const handleSubscribe = (plan: string) => {
    setSelectedPlan(plan);
    setDialogOpen(true);
  };

  const handleConfirmSubscribe = () => {
    subscribeMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl font-bold text-gray-900 mb-4">
            Choisissez votre plan
          </h1>
          <p className="text-xl text-gray-600">
            Paiement annuel uniquement par virement ou espèces
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.name} className={`border-2 ${plan.popular ? 'border-leaf shadow-lg' : ''}`}>
              {plan.popular && (
                <div className="bg-leaf text-white text-sm font-semibold text-center py-2 rounded-t-lg">
                  Plus populaire
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm text-gray-500">Prix annuel</p>
                  <p className="text-4xl font-bold">{plan.annualPrice} DT</p>
                  <p className="text-sm text-gray-500">{plan.monthlyPrice} DT/mois</p>
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="text-leaf flex-shrink-0 mt-0.5" size={16} />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(plan.name)}
                >
                  S'abonner <ArrowRight size={16} className="ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Modes de paiement acceptés</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <CreditCard className="text-leaf" size={32} />
                <div>
                  <p className="font-semibold">Virement bancaire</p>
                  <p className="text-sm text-gray-600">Détails fournis après inscription</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Wallet className="text-leaf" size={32} />
                <div>
                  <p className="font-semibold">Espèces</p>
                  <p className="text-sm text-gray-600">Paiement en main propre</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Subscription Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirmer l'abonnement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Plan sélectionné</p>
                <p className="font-semibold text-lg">{selectedPlan}</p>
                <p className="text-2xl font-bold">{plans.find(p => p.name === selectedPlan)?.annualPrice} DT/an</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Mode de paiement</p>
                <div className="flex gap-2">
                  <Button
                    variant={selectedPaymentMethod === 'VIREMENT' ? 'default' : 'outline'}
                    onClick={() => setSelectedPaymentMethod('VIREMENT')}
                    className="flex-1"
                  >
                    Virement
                  </Button>
                  <Button
                    variant={selectedPaymentMethod === 'ESPECES' ? 'default' : 'outline'}
                    onClick={() => setSelectedPaymentMethod('ESPECES')}
                    className="flex-1"
                  >
                    Espèces
                  </Button>
                </div>
              </div>

              {selectedPaymentMethod === 'VIREMENT' && (
                <div className="p-3 bg-blue-50 rounded text-sm">
                  <p className="font-semibold mb-1">Informations de virement :</p>
                  <p>RIB : XX XXX XXX XXX XXX XXX XX</p>
                  <p>Banque : BIAT</p>
                  <p>Reference : CRM-{selectedPlan}-{Date.now()}</p>
                </div>
              )}

              {selectedPaymentMethod === 'ESPECES' && (
                <div className="p-3 bg-green-50 rounded text-sm">
                  <p className="font-semibold">Paiement en espèces :</p>
                  <p>Notre équipe vous contactera pour organiser le paiement.</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                  Annuler
                </Button>
                <Button onClick={handleConfirmSubscribe} disabled={subscribeMutation.isPending} className="flex-1">
                  {subscribeMutation.isPending ? 'Envoi...' : 'Confirmer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
