import { useState } from 'react';
import { Mail, Users, Package, FileText, Building2, Tag, DollarSign } from 'lucide-react';
import { GmailSettings } from '@/components/settings/GmailSettings';
import { SoftfactureSettings } from '@/components/settings/SoftfactureSettings';
import { UsersSettings } from '@/components/settings/UsersSettings';
import { ProductsSettings } from '@/components/settings/ProductsSettings';
import { OrganizationSettings } from '@/components/settings/OrganizationSettings';
import { CategoriesSettings } from '@/components/settings/CategoriesSettings';
import { CommissionSettings } from '@/components/settings/CommissionSettings';

type Tab = 'organization' | 'gmail' | 'softfacture' | 'users' | 'products' | 'categories' | 'commissions';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'organization', label: 'Organisation', icon: Building2 },
  { id: 'gmail', label: 'Gmail', icon: Mail },
  { id: 'softfacture', label: 'Softfacture', icon: FileText },
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'products', label: 'Produits', icon: Package },
  { id: 'categories', label: 'Catégories', icon: Tag },
  { id: 'commissions', label: 'Primes', icon: DollarSign },
];

export function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('organization');

  return (
    <div className="space-y-6 px-2 md:px-0">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Intégrations et configuration</p>
      </div>

      {/* Horizontal Tab Menu */}
      <div className="flex border-b">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-leaf text-leaf'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="pt-4">
        {activeTab === 'organization' && <OrganizationSettings />}
        {activeTab === 'gmail' && <GmailSettings />}
        {activeTab === 'softfacture' && <SoftfactureSettings />}
        {activeTab === 'users' && <UsersSettings />}
        {activeTab === 'products' && <ProductsSettings />}
        {activeTab === 'categories' && <CategoriesSettings />}
        {activeTab === 'commissions' && <CommissionSettings />}
      </div>
    </div>
  );
}
