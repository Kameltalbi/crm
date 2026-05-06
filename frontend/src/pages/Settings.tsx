import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Mail, Users, Package, FileText, Building2, Tag, DollarSign } from 'lucide-react';
import { GmailSettings } from '@/components/settings/GmailSettings';
import { SoftfactureSettings } from '@/components/settings/SoftfactureSettings';
import { UsersSettings } from '@/components/settings/UsersSettings';
import { ProductsSettings } from '@/components/settings/ProductsSettings';
import { OrganizationSettings } from '@/components/settings/OrganizationSettings';
import { CategoriesSettings } from '@/components/settings/CategoriesSettings';
import { CommissionSettings } from '@/components/settings/CommissionSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { api } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form-controls';

type Tab = 'organization' | 'gmail' | 'softfacture' | 'users' | 'products' | 'categories' | 'commissions' | 'security';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'organization', label: 'Organisation', icon: Building2 },
  { id: 'gmail', label: 'Gmail', icon: Mail },
  { id: 'softfacture', label: 'Softfacture', icon: FileText },
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'security', label: 'Sécurité', icon: FileText },
  { id: 'products', label: 'Produits', icon: Package },
  { id: 'categories', label: 'Catégories', icon: Tag },
  { id: 'commissions', label: 'Primes', icon: DollarSign },
];

export function Settings() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('organization');
  const [visibleTabs, setVisibleTabs] = useState(TABS);

  const { data: organization } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.get('/organizations').then(r => r.data),
  });

  useEffect(() => {
    const org = Array.isArray(organization) ? organization[0] : organization;
    if (org?.plan === 'ENTERPRISE') {
      setVisibleTabs(TABS);
    } else {
      setVisibleTabs(TABS.filter(tab => tab.id !== 'commissions'));
    }
  }, [organization]);

  useEffect(() => {
    setActiveTab((current) =>
      visibleTabs.some((x) => x.id === current) ? current : 'organization'
    );
  }, [visibleTabs]);

  return (
    <div className="space-y-6 px-2 md:px-0">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.integrationsSubtitle')}</p>
      </div>

      {/* Mobile: menu déroulant */}
      <div className="md:hidden">
        <Select value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
          <SelectTrigger className="h-11 w-full justify-between gap-2 text-left font-medium [&>span]:min-w-0">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {(() => {
                const tab = visibleTabs.find((x) => x.id === activeTab);
                if (!tab) return <SelectValue placeholder={t('settings.title')} />;
                const Icon = tab.icon;
                return (
                  <>
                    <Icon size={18} className="shrink-0 text-muted-foreground" />
                    <SelectValue>{t(`settings.tabs.${tab.id}`)}</SelectValue>
                  </>
                );
              })()}
            </div>
          </SelectTrigger>
          <SelectContent position="item-aligned" className="max-h-[min(70vh,24rem)] w-[var(--radix-select-trigger-width)]">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <SelectItem key={tab.id} value={tab.id} className="cursor-pointer">
                  <span className="flex items-center gap-2 py-0.5">
                    <Icon size={16} className="shrink-0 text-muted-foreground" />
                    <span>{t(`settings.tabs.${tab.id}`)}</span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop / tablette: onglets horizontaux (scroll si besoin) */}
      <div className="hidden md:flex border-b overflow-x-auto overscroll-x-contain scroll-smooth [-webkit-overflow-scrolling:touch]">
        <div className="flex min-w-min flex-nowrap gap-0">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-leaf text-leaf'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={16} className="shrink-0" />
                {t(`settings.tabs.${tab.id}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-4">
        {activeTab === 'organization' && <OrganizationSettings />}
        {activeTab === 'gmail' && <GmailSettings />}
        {activeTab === 'softfacture' && <SoftfactureSettings />}
        {activeTab === 'users' && <UsersSettings />}
        {activeTab === 'security' && <SecuritySettings />}
        {activeTab === 'products' && <ProductsSettings />}
        {activeTab === 'categories' && <CategoriesSettings />}
        {activeTab === 'commissions' && <CommissionSettings />}
      </div>
    </div>
  );
}
