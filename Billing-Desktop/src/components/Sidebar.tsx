import React from 'react';
import {
  Home,
  Package,
  Receipt,
  Users,
  Warehouse,
  BarChart3,
  Settings,
  Barcode,
  Layout,
  Building2
} from 'lucide-react';

type Page = 'dashboard' | 'products' | 'barcodes' | 'billing' | 'customers' | 'inventory' | 'parties' | 'reports' | 'templates' | 'settings' | 'online_orders';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: Page) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'billing', label: 'New Bill', icon: Receipt },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'barcodes', label: 'Barcodes', icon: Barcode },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'inventory', label: 'Inventory', icon: Warehouse },
  { id: 'parties', label: 'Parties', icon: Building2 },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'templates', label: 'INV Template', icon: Layout },
  { id: 'online_orders', label: 'Online Orders', icon: Package },
];

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  return (
    <div className="relative flex w-72 flex-col border-r border-white/50 bg-slate-950 text-white shadow-2xl shadow-slate-900/20">
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-primary-500/30 to-transparent" />
      <div className="relative p-6 pb-4">
        <div className="inline-flex rounded-2xl bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-100 backdrop-blur">
          Bill போடு
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Billing Suite</h1>
        <p className="mt-1 text-sm text-slate-300">Professional POS system</p>
      </div>

      <nav className="relative mt-2 flex-1 px-3 pb-6">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as Page)}
              className={`mb-1 flex w-full items-center rounded-2xl px-4 py-3 text-left transition-all duration-200 ${isActive
                  ? 'bg-white/14 text-white shadow-lg shadow-black/10 ring-1 ring-white/10'
                  : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
            >
              <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-200' : 'text-slate-400'}`} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4">
        <button
          onClick={() => onNavigate('settings')}
          className="flex w-full items-center rounded-2xl bg-white/10 px-4 py-3 text-left text-slate-200 transition-colors hover:bg-white/15 hover:text-white"
        >
          <Settings className="mr-3 h-5 w-5 text-primary-200" />
          <span className="font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
