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
      'Jusqu\'à 100 prospects',
      '1 utilisateur',
      'Pipeline simple (kanban)',
      'Gestion des clients',
      'Templates email de base',
      'Support email',
    ],
    cta: 'Commencer',
  },
  {
    name: 'Growth',
    monthlyPrice: 40,
    annualPrice: 480,
    features: [
      'Jusqu\'à 300 prospects',
      '3 utilisateurs',
      'Pipeline personnalisable',
      'Reporting simple',
      'Automatisations basiques',
      'Support prioritaire',
    ],
    cta: 'Choisir ce plan',
    popular: true,
  },
  {
    name: 'Pro',
    monthlyPrice: 50,
    annualPrice: 600,
    features: [
      'Prospects illimités',
      '5 utilisateurs',
      'Assistant IA conversationnel',
      'Lead scoring automatique',
      'Automatisations avancées',
      'Intégration Softfacture',
      'Dashboard avancé + KPI',
      'Backup quotidien',
      'Support prioritaire',
    ],
    cta: 'Passer au niveau supérieur',
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
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Choisissez votre plan
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Paiement annuel uniquement
          </p>
          <p className="text-sm text-gray-500">
            Sans engagement – support inclus – mise en place rapide
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`border-2 transition-all hover:shadow-xl ${
                plan.popular 
                  ? 'border-leaf shadow-xl relative scale-105 z-10' 
                  : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-leaf text-white text-sm font-semibold px-4 py-1 rounded-full shadow-md">
                  Plus populaire
                </div>
              )}
              <CardHeader className="pt-8">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-4xl font-bold text-gray-900">{plan.annualPrice} DT</p>
                  <p className="text-sm text-gray-500">par an</p>
                  <p className="text-xs text-gray-400">{plan.monthlyPrice} DT/mois</p>
                </div>

                <ul className="space-y-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="text-leaf flex-shrink-0 mt-0.5" size={20} />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(plan.name)}
                  size="lg"
                >
                  {plan.cta}
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
