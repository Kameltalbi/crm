import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, Settings, LogOut, Menu, X, FileText, Building2, UserCheck, Calendar as CalendarIcon, Receipt, Mail, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { resolveOrganizationLogoUrl } from '@/lib/organizationLogo';
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
    <div className="flex h-screen flex-col bg-gradient-to-br from-background via-background to-muted/50">
      {/* Header */}
      <header className="relative z-[999] flex h-[3.75rem] flex-shrink-0 items-center justify-between border-b border-border/60 bg-white/85 px-4 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-md md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-white text-foreground shadow-sm transition-colors hover:bg-muted/80 hover:border-border"
            title={sidebarOpen ? 'Fermer la sidebar' : 'Ouvrir la sidebar'}
          >
            {sidebarOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
          </button>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {organization && organizationLogoUrl ? (
              <img
                src={organizationLogoUrl}
                alt={organization.name}
                className="h-9 max-h-9 w-auto max-w-[min(200px,42vw)] object-contain sm:h-10 sm:max-h-10"
              />
            ) : organization ? (
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/15">
                  <Building2 size={20} className="text-primary" strokeWidth={2} />
                </div>
                <span className="truncate font-semibold tracking-tight text-foreground sm:text-lg">{organization.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="ktOptima" className="h-9 w-auto sm:h-10" />
                <span className="text-lg font-bold tracking-tight text-foreground sm:text-xl">CRM</span>
              </div>
            )}
          </div>
        </div>
        <div className="hidden flex-1 justify-center px-4 md:flex">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/40 px-4 py-1.5 text-xs font-medium tabular-nums text-muted-foreground shadow-sm">
            <span className="text-foreground/80">
              {currentTime.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <span className="h-1 w-1 rounded-full bg-border" aria-hidden />
            <span>
              {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
          <Notifications />
          <div className="ml-1 flex items-center gap-2 border-l border-border/60 pl-3 sm:ml-2 sm:pl-4">
            <div className="hidden text-right sm:block">
              <div className="max-w-[140px] truncate text-sm font-semibold leading-tight text-foreground md:max-w-[200px]">
                {user?.name}
              </div>
              <div className="max-w-[140px] truncate text-xs text-muted-foreground md:max-w-[220px]">{user?.email}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="Déconnexion"
            >
              <LogOut size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed z-40 flex flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b from-primary via-primary to-[hsl(148,58%,17%)] text-white shadow-[4px_0_24px_-4px_rgba(0,0,0,0.12)] transition-[width,transform] duration-300 ease-out lg:relative',
            sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-0 lg:translate-x-0'
          )}
        >
          {/* Brand / org */}
          <div className="border-b border-white/10 bg-black/10 px-4 py-4">
            {organization && organizationLogoUrl ? (
              <div className="flex min-h-[3rem] items-center justify-center rounded-xl bg-white/5 p-2 ring-1 ring-white/10">
                <img src={organizationLogoUrl} alt={organization.name} className="max-h-11 w-auto max-w-full object-contain" />
              </div>
            ) : organization ? (
              <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2 ring-1 ring-white/10">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Building2 size={22} className="text-white" strokeWidth={2} />
                </div>
                <span className="min-w-0 truncate text-sm font-semibold leading-snug text-white/95">{organization.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-1">
                <img src="/logo.png" alt="ktOptima" className="h-9 w-auto brightness-0 invert opacity-95" />
                <span className="text-base font-bold tracking-tight">CRM</span>
              </div>
            )}
          </div>

          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={closeSidebarOnMobile}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-white/18 text-white shadow-sm ring-1 ring-white/25'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                        isActive ? 'bg-white/20 text-white' : 'bg-white/0 text-white/80 group-hover:bg-white/10 group-hover:text-white'
                      )}
                    >
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <span className="truncate">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
            {user?.role === 'OWNER' && (
              <>
                <div className="my-3 border-t border-white/15" />
                <NavLink
                  to="/settings"
                  onClick={closeSidebarOnMobile}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-white/18 text-white shadow-sm ring-1 ring-white/25'
                        : 'text-white/75 hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                          isActive ? 'bg-white/20 text-white' : 'bg-white/0 text-white/80 group-hover:bg-white/10 group-hover:text-white'
                        )}
                      >
                        <Settings size={18} strokeWidth={2} />
                      </span>
                      <span className="truncate">Paramètres</span>
                    </>
                  )}
                </NavLink>
              </>
            )}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[2px] lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}

        <main className="min-h-0 flex-1 overflow-auto bg-muted/25">
          <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
