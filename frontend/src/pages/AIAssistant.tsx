import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form-controls';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  data?: any;
}

const suggestions = [
  "Prédire CA fin d'année",
  "Conseils pour atteindre mes objectifs",
  "Analyse des objectifs mensuels",
  "Actions prioritaires",
  "Alertes opportunités à risque",
];

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Bonjour ! Je suis votre assistant IA. Que puis-je faire pour vous ?',
    },
  ]);
  const [input, setInput] = useState('');

  const queryMutation = useMutation({
    mutationFn: (message: string) =>
      api.post('/ai-assistant/query', { message }).then((r) => r.data),
    onSuccess: (data) => {
      const response = formatResponse(data);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response, data: data.result },
      ]);
    },
  });

  const fmtDT = (v: number) => Math.round(v).toLocaleString('fr-FR') + ' DT';

  const formatResponse = (data: any): string => {
    const { result } = data;
    
    if (result.type === 'metric') {
      return `📊 ${result.title} : ${result.value}`;
    }
    
    if (result.type === 'list') {
      if (!result.data || result.data.length === 0) {
        return `📋 ${result.title}\n\nAucun élément trouvé.`;
      }
      const items = result.data.map((item: any, i: number) => {
        if (typeof item === 'string') return `${i + 1}. ${item}`;
        const parts = Object.entries(item).map(([k, v]) => `${v}`).join(' — ');
        return `${i + 1}. ${parts}`;
      }).join('\n');
      return `📋 ${result.title}\n\n${items}`;
    }
    
    if (result.type === 'text') {
      return result.value;
    }

    if (result.type === 'prediction') {
      const months = result.monthsData || {};
      const sortedKeys = Object.keys(months).sort();
      const monthNames = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      const monthLines = sortedKeys.map((k: string) => {
        const m = parseInt(k.split('-')[1]);
        return `  • ${monthNames[m]} : ${fmtDT(months[k])}`;
      }).join('\n');

      const predictedTTC = fmtDT(result.predictedCA * 1.19);
      const currentTTC = fmtDT(result.currentCA * 1.19);
      const pipelineTTC = fmtDT(result.pipelineCA * 1.19);
      const pondereTTC = fmtDT((result.pipelinePondere || 0) * 1.19);

      let analysis = '';
      if (result.predictedCA > result.currentCA * 2) {
        analysis = `\n\n✅ Bonne dynamique ! Votre rythme actuel laisse présager un très bon exercice. Continuez à convertir les opportunités en pipeline.`;
      } else if (result.pipelineCA > 0) {
        analysis = `\n\n⚡ Vous avez du potentiel en pipeline. Concentrez vos efforts sur la conversion des ${fmtDT(result.pipelineCA)} HT en cours pour maximiser le CA.`;
      } else {
        analysis = `\n\n⚠️ Attention : peu d'opportunités en pipeline pour les mois restants. Intensifiez la prospection pour sécuriser la fin d'année.`;
      }

      let actions = '\n\n💡 Actions recommandées :';
      if (result.pipelineCA > 0) {
        actions += '\n  1. Relancer les opportunités en négociation pour accélérer la clôture';
      }
      actions += '\n  ' + (result.pipelineCA > 0 ? '2' : '1') + '. Prospecter activement pour alimenter le pipeline des mois à venir';
      actions += '\n  ' + (result.pipelineCA > 0 ? '3' : '2') + '. Fidéliser les clients existants avec des prestations complémentaires';

      return `📈 Prédiction CA fin d'année ${new Date().getFullYear()}\n\n` +
        `CA réalisé à ce jour : ${fmtDT(result.currentCA)} HT (${currentTTC} TTC)\n` +
        `Pipeline restant : ${fmtDT(result.pipelineCA)} HT (${pipelineTTC} TTC)\n` +
        `Pipeline pondéré (par probabilité) : ${fmtDT(result.pipelinePondere || 0)} HT (${pondereTTC} TTC)\n` +
        `Moyenne mensuelle : ${fmtDT(result.avgMonthlyCA || 0)} HT\n\n` +
        `🎯 CA prévu fin d'année : ${fmtDT(result.predictedCA)} HT (${predictedTTC} TTC)\n` +
        (result.growth ? `📊 Croissance vs année précédente : ${result.growth > 0 ? '+' : ''}${result.growth}%\n` : '') +
        `\n📅 Détail par mois (réalisé) :\n${monthLines}` +
        analysis + actions;
    }

    if (result.type === 'recommendations') {
      const recs = (result.recommendations || []).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n');
      return `💡 Recommandations personnalisées\n\n${recs}`;
    }

    if (result.type === 'target_analysis') {
      const monthlyTarget = fmtDT(result.monthlyTarget || 0);
      return `🎯 Analyse des objectifs\n\n` +
        `CA réalisé : ${fmtDT(result.currentCA)} HT\n` +
        `CA prévu fin d'année : ${fmtDT(result.predictedCA)} HT\n` +
        `Objectif mensuel moyen : ${monthlyTarget} HT\n` +
        `Mois restants : ${result.monthsRemaining}\n\n` +
        (result.recommendations ? `💡 Recommandations :\n${(result.recommendations || []).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}` : '');
    }
    
    return JSON.stringify(result, null, 2);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    
    queryMutation.mutate(userMessage);
  };

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <div className="space-y-6 px-2 md:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="text-purple-600" size={32} />
            Assistant IA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Posez vos questions en langage naturel
          </p>
        </div>
      </div>

      <Card className="h-[600px] flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Bot className="text-purple-600" size={20} />
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-purple-600" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-gray-600" />
                </div>
              )}
            </div>
          ))}
          {queryMutation.isPending && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-purple-600" />
              </div>
              <div className="bg-gray-100 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">En train de réfléchir...</p>
              </div>
            </div>
          )}
        </CardContent>
        <div className="border-t p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion: string) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestion(suggestion)}
                className="text-xs"
              >
                {suggestion}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Posez votre question..."
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={queryMutation.isPending || !input.trim()}>
              <Send size={16} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
