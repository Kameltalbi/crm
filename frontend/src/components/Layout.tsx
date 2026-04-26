import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, Calendar, Settings, LogOut, Leaf, Menu, X, FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const nav = [
  { to: '/',             label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/affaires',     label: 'Affaires',      icon: Briefcase       },
  { to: '/clients',      label: 'Clients',       icon: Users           },
  { to: '/activites',    label: 'Activités',     icon: FileText        },
  { to: '/previsionnel', label: 'Prévisionnel',  icon: Calendar        },
  { to: '/settings',     label: 'Paramètres',    icon: Settings        },
];

const adminNav = [
  { to: '/users',        label: 'Utilisateurs',  icon: Users           },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-leaf text-white rounded-lg shadow-lg"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 w-60 bg-leaf text-white flex flex-col border-r transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
            <Leaf size={18} />
          </div>
          <div>
            <div className="font-serif text-lg">Bilan CRM</div>
            <div className="text-[10px] uppercase tracking-wider opacity-60">Tunisie · DT</div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
          {user?.role === 'OWNER' && (
            <>
              <div className="border-t border-white/10 my-2" />
              {adminNav.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="border-t border-white/10 p-3 space-y-1">
          <div className="px-3 py-2 text-xs">
            <div className="font-medium">{user?.name}</div>
            <div className="text-white/60 truncate">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto p-4 md:p-6 pt-16 lg:pt-6">{children}</div>
      </main>
    </div>
  );
}
