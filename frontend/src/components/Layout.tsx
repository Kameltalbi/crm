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
];

function resolveOrganizationLogoUrl(logoUrl: string | null | undefined): string {
  if (!logoUrl) return '';
  if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
  let path = logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`;
  if (path.startsWith('/uploads/')) {
    path = path.replace('/uploads/', '/api/uploads/');
  }
  return `${window.location.origin}${path}`;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: organizationsData } = useQuery<Organization | Organization[]>({
    queryKey: ['organizations'],
    queryFn: () => api.get('/organizations').then((r) => r.data),
  });

  const organization = Array.isArray(organizationsData) ? organizationsData[0] : organizationsData;
  const organizationLogoUrl = resolveOrganizationLogoUrl(organization?.logoUrl);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-background flex-col">
      {/* Header */}
      <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 md:px-6 shadow-sm relative z-[999] flex-shrink-0 block">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
            title={sidebarOpen ? 'Fermer la sidebar' : 'Ouvrir la sidebar'}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            {organization && organizationLogoUrl ? (
              <img src={organizationLogoUrl} alt={organization.name} className="h-10 w-auto max-w-[200px] object-contain" />
            ) : organization ? (
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 size={20} className="text-primary" />
                </div>
                <span className="text-lg font-bold text-foreground">{organization.name}</span>
              </div>
            ) : (
              <>
                <img src="/logo.png" alt="ktOptima" className="h-12 w-auto" />
                <span className="text-xl font-bold text-foreground">CRM</span>
              </>
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
            'fixed lg:relative inset-y-0 left-0 z-40 bg-primary text-white flex flex-col transition-all duration-300 shadow-xl overflow-hidden',
            sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-0 lg:translate-x-0'
          )}
        >
          {/* Organization Logo */}
          <div className="p-4 border-b border-white/10">
            {organization && organizationLogoUrl ? (
              <img src={organizationLogoUrl} alt={organization.name} className="h-12 w-auto max-w-[200px] object-contain" />
            ) : organization ? (
              <div className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center">
                <Building2 size={24} className="text-white" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="ktOptima" className="h-10 w-auto" />
                <span className="text-lg font-bold">CRM</span>
              </div>
            )}
          </div>

          <div className="flex-1 py-4 px-4 space-y-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={closeSidebarOnMobile}
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
                  onClick={closeSidebarOnMobile}
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
