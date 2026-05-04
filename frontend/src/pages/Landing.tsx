import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, TrendingUp, Shield, Zap, Users, BarChart3, CheckCircle2, ArrowRight, Mail, Phone, MapPin, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  
  useEffect(() => {
    const today = new Date().toDateString();
    const storageKey = 'softfacture_popup_count';
    const storageDateKey = 'softfacture_popup_date';
    
    const storedDate = localStorage.getItem(storageDateKey);
    const storedCount = parseInt(localStorage.getItem(storageKey) || '0', 10);
    
    // Reset count if it's a new day
    if (storedDate !== today) {
      localStorage.setItem(storageKey, '0');
      localStorage.setItem(storageDateKey, today);
    }
    
    const currentCount = storedDate === today ? storedCount : 0;
    
    // Only show if less than 2 times today
    if (currentCount < 2) {
      const timer = setTimeout(() => {
        setShowPopup(true);
        localStorage.setItem(storageKey, String(currentCount + 1));
        localStorage.setItem(storageDateKey, today);
      }, 2000);
      
      const closeTimer = setTimeout(() => {
        setShowPopup(false);
      }, 9000);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(closeTimer);
      };
    }
  }, []);
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="ktOptima" className="h-8 w-auto" />
              <span className="text-xl font-bold text-foreground">CRM</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-lg text-muted-foreground hover:text-foreground transition-colors">
                Fonctionnalités
              </a>
              <a href="#why" className="text-lg text-muted-foreground hover:text-foreground transition-colors">
                Pourquoi nous ?
              </a>
              <Link to="/pricing" className="text-lg text-muted-foreground hover:text-foreground transition-colors">
                Tarifs
              </Link>
              <a href="#contact" className="text-lg text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </a>
            </nav>
              <div className="hidden md:flex items-center gap-3">
                <Link to="/login">
                  <Button variant="ghost" size="lg" className="bg-[#d1fae4] hover:bg-[#c1ebe0]">
                    Connexion
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="lg" className="bg-leaf hover:bg-leaf/90">
                    S'inscrire
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-lg text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Fonctionnalités
              </a>
              <a href="#why" className="block text-lg text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Pourquoi nous ?
              </a>
              <Link to="/pricing" className="block text-lg text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Tarifs
              </Link>
              <a href="#contact" className="block text-lg text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Contact
              </a>
              <div className="pt-4 space-y-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="lg" className="w-full">
                    Connexion
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="lg" className="w-full bg-leaf hover:bg-leaf/90">
                    S'inscrire
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sage/20 via-background to-emerald-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-lg font-medium mb-6">
              <TrendingUp size={24} />
              Le CRM simple pour gérer vos ventes et vos clients
            </div>
            <h1 className="text-6xl md:text-8xl font-serif font-bold text-foreground mb-6">
              Gérez votre entreprise avec{' '}
              <span className="text-leaf">intelligence</span>
            </h1>
            <p className="text-2xl md:text-3xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              ktOptima vous aide à suivre vos affaires, gérer vos clients et optimiser vos prévisions avec une interface simple et puissante.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-leaf hover:bg-leaf/90 text-lg px-8">
                  Commencer gratuitement
                  <ArrowRight size={20} className="ml-2" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Démo gratuite
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-3 text-base">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500" />
                Sans engagement
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500" />
                Support local
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500" />
                Sécurisé
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">
              Fonctionnalités puissantes
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tout ce dont vous avez besoin pour gérer votre entreprise en un seul endroit
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
                <BarChart3 size={24} className="text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Tableau de bord</h3>
              <p className="text-base text-muted-foreground">
                Visualisez vos KPIs en temps réel avec des graphiques interactifs et des prévisions intelligentes.
              </p>
            </div>
            <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                <Users size={24} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Gestion des clients</h3>
              <p className="text-base text-muted-foreground">
                Suivez vos affaires et clients avec un pipeline personnalisé et des notifications automatiques.
              </p>
            </div>
            <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
                <Zap size={24} className="text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Prévisions IA</h3>
              <p className="text-base text-muted-foreground">
                Prédisez vos revenus futurs avec notre algorithme d'intelligence artificielle avancé.
              </p>
            </div>
            <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4">
                <Shield size={24} className="text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sécurité</h3>
              <p className="text-base text-muted-foreground">
                Vos données sont protégées avec un chiffrement de bout en bout et des sauvegardes automatiques.
              </p>
            </div>
            <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center mb-4">
                <TrendingUp size={24} className="text-rose-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Analytics</h3>
              <p className="text-base text-muted-foreground">
                Analysez vos performances avec des rapports détaillés et des insights actionnables.
              </p>
            </div>
            <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center mb-4">
                <Users size={24} className="text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Collaboration</h3>
              <p className="text-base text-muted-foreground">
                Travaillez en équipe avec des rôles personnalisés et des permissions granulaires.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Use Section */}
      <section id="why" className="py-20 bg-gradient-to-br from-sage/10 to-emerald-50/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
                Pourquoi choisir ktOptima ?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Conçu spécifiquement pour les entreprises tunisiennes, ktOptima s'adapte à vos besoins locaux avec une interface intuitive et des fonctionnalités puissantes.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">100% Tunisien</h4>
                    <p className="text-base text-muted-foreground">
                      Développé localement avec un support en arabe et en français.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Facile à utiliser</h4>
                    <p className="text-base text-muted-foreground">
                      Interface intuitive, pas besoin de formation technique.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Support réactif</h4>
                    <p className="text-base text-muted-foreground">
                      Équipe disponible pour vous aider à tout moment.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Prix transparent</h4>
                    <p className="text-base text-muted-foreground">
                      Pas de frais cachés, payez uniquement ce que vous utilisez.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-leaf to-emerald-600 rounded-3xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-4">Prêt à transformer votre entreprise ?</h3>
                <p className="text-emerald-100 mb-6">
                  Rejoignez des centaines d'entreprises tunisiennes qui utilisent déjà ktOptima.
                </p>
                <Link to="/register">
                  <Button size="lg" className="bg-white text-leaf hover:bg-white/90 w-full">
                    Commencer maintenant
                    <ArrowRight size={20} className="ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="ktOptima" className="h-8 w-auto" />
              </div>
              <p className="text-gray-400 mb-4 max-w-md text-base">
                La solution CRM moderne pour les entreprises tunisiennes. Gérez vos affaires, vos clients et vos prévisions en toute simplicité.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors">
                  <Mail size={20} />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors">
                  <Phone size={20} />
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg">Liens rapides</h4>
              <ul className="space-y-2 text-gray-400 text-base">
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    Fonctionnalités
                  </a>
                </li>
                <li>
                  <a href="#why" className="hover:text-white transition-colors">
                    Pourquoi nous ?
                  </a>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    Connexion
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-white transition-colors">
                    Inscription
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg">Contact</h4>
              <ul className="space-y-2 text-gray-400 text-base">
                <li className="flex items-center gap-2">
                  <Mail size={16} />
                  contact@ktoptima.com
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={16} />
                  +216 55 053 505
                </li>
                <li className="flex items-center gap-2">
                  <MapPin size={16} />
                  Tunis, Tunisie
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-base">
            <p>&copy; 2026 ktOptima. Tous droits réservés.</p>
          </div>
        </div>
      </footer>

      {/* Softfacture Popup */}
      {showPopup && (
        <div className="fixed bottom-4 right-4 z-[100] animate-in slide-in-from-right duration-500">
          <a
            href="https://softfacture.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <div className="bg-white rounded-lg shadow-2xl border p-6 max-w-sm hover:shadow-3xl transition-shadow cursor-pointer">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPopup(false);
                }}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Softfacture</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Gérez votre facturation facilement avec notre solution Softfacture.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-blue-600 hover:text-blue-700">
                    Découvrir <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </div>
          </a>
        </div>
      )}
    </div>
  );
}
