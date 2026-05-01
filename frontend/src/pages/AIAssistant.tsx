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

const SUGGESTIONS = [
  'Combien d\'opportunités cette semaine ?',
  'CA réalisé cette année',
  'Actions prioritaires',
  'Alertes opportunités à risque',
  'Total clients',
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

  const formatResponse = (data: any): string => {
    const { result } = data;
    
    if (result.type === 'metric') {
      return `${result.title}: ${result.value}`;
    }
    
    if (result.type === 'list') {
      const items = result.data.map((item: any) => {
        if (typeof item === 'string') return `• ${item}`;
        const parts = Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(', ');
        return `• ${parts}`;
      }).join('\n');
      return `${result.title}\n${items}`;
    }
    
    if (result.type === 'text') {
      return result.value;
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
            {SUGGESTIONS.map((suggestion) => (
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
