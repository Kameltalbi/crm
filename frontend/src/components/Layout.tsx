import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, Calendar, Settings, LogOut, Leaf, Menu, X, FileText, Building2, UserCheck, Calendar as CalendarIcon, Receipt, Mail, Sparkles, CreditCard } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Organization } from '@/types';
import { Notifications } from './Notifications';

const nav = [
  { to: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/affaires',     label: 'Opportunités',  icon: Briefcase       },
  { to: '/clients',      label: 'Clients',       icon: Users           },
  { to: '/leads',        label: 'Leads',         icon: UserCheck       },
  { to: '/calendar',     label: 'Calendrier',    icon: CalendarIcon    },
  { to: '/expenses',     label: 'Dépenses',      icon: Receipt         },
  { to: '/activites',    label: 'Activités',     icon: FileText        },
  { to: '/email-templates', label: 'Templates Emails', icon: Mail },
  { to: '/ai-assistant', label: 'Assistant IA', icon: Sparkles },
  { to: '/pricing',      label: 'Tarifs',        icon: CreditCard      },
];

const adminNav = [
  { to: '/users',               label: 'Utilisateurs',   icon: Users       },
  { to: '/settings/organizations', label: 'Organisations', icon: Building2 },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: organizations } = useQuery<Organization[]>({
    queryKey: ['organizations'],
    queryFn: () => api.get('/organizations').then((r) => r.data),
  });

  const organization = organizations?.[0];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background flex-col">
      {/* Header */}
      <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 md:px-6 shadow-sm relative z-[100] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            {organization && organization.logoUrl ? (
              <img src={organization.logoUrl} alt={organization.name} className="h-10 w-auto max-w-[200px] object-contain" />
            ) : organization ? (
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 size={20} className="text-primary" />
              </div>
            ) : (
              <img src="/logo.png" alt="ktOptima" className="h-12 w-auto" />
            )}
          </div>
        </div>
        <div className="hidden md:flex flex-1 justify-center">
          <div className="text-sm font-medium text-muted-foreground">
            {currentTime.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Notifications />
          <div className="border-l border-border pl-4 flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold text-foreground">{user?.name}</div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              title="Déconnexion"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-primary text-white flex flex-col transition-transform duration-300 lg:translate-x-0 shadow-xl',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex-1 py-6 px-4 space-y-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-white/20 text-white shadow-md'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
            {user?.role === 'OWNER' && (
              <>
                <div className="border-t border-white/20 my-4" />
                <NavLink
                  to="/settings"
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-white/20 text-white shadow-md'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  <Settings size={18} />
                  Paramètres
                </NavLink>
              </>
            )}
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-auto bg-muted/30">
          <div className="max-w-[1600px] mx-auto p-6 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
