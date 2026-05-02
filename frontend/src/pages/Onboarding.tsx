import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/form-controls';

const steps = [
  {
    title: 'Bienvenue !',
    content: 'CRM Tunisie vous aide à gérer vos clients et opportunités simplement. Commençons en 3 étapes.',
  },
  {
    title: 'Ajoutez votre premier client',
    content: 'Créez votre premier client pour commencer à suivre vos opportunités commerciales.',
    input: {
      label: 'Nom de l\'entreprise',
      placeholder: 'Ex: Mon Entreprise SARL',
    },
  },
  {
    title: 'Créez votre première opportunité',
    content: 'Ajoutez une opportunité pour suivre vos chances de vente.',
    input: {
      label: 'Montant estimé (DT)',
      placeholder: 'Ex: 5000',
    },
  },
  {
    title: 'C\'est prêt !',
    content: 'Vous avez configuré les bases. Explorez le dashboard et commencez à utiliser CRM Tunisie.',
  },
];

export function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({ companyName: '', amount: '' });

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      localStorage.setItem('onboardingCompleted', 'true');
      navigate('/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    navigate('/dashboard');
  };

  const step = steps[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 rounded-full w-8 ${
                    idx <= currentStep ? 'bg-leaf' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Ignorer
            </button>
          </div>
          <CardTitle className="text-2xl">{step.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-600">{step.content}</p>

          {step.input && (
            <div className="space-y-2">
              <Label>{step.input.label}</Label>
              <Input
                placeholder={step.input.placeholder}
                value={currentStep === 1 ? formData.companyName : formData.amount}
                onChange={(e) => {
                  if (currentStep === 1) {
                    setFormData({ ...formData, companyName: e.target.value });
                  } else {
                    setFormData({ ...formData, amount: e.target.value });
                  }
                }}
              />
            </div>
          )}

          {currentStep === steps.length - 1 && (
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Check size={16} />
                <span>Lead scoring automatique activé</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Check size={16} />
                <span>Assistant IA disponible</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Check size={16} />
                <span>Templates d'emails configurés</span>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowLeft size={16} className="mr-2" />
              Retour
            </Button>
            <Button onClick={handleNext}>
              {currentStep === steps.length - 1 ? 'Commencer' : 'Suivant'}
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
