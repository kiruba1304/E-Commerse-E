import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import BarcodeManager from './pages/BarcodeManager';
import Billing from './pages/Billing';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import Parties from './pages/Parties';
import Reports from './pages/Reports';
import InvoiceTemplates from './pages/InvoiceTemplates';
import Settings from './pages/Settings';
import OnlineOrders from './pages/OnlineOrders';
import { useDatabase } from './hooks/useDatabase';
import { useECommerceIntegration } from './hooks/useECommerceIntegration';
import { Database, FileText, FileCode, FolderDown } from 'lucide-react';

type Page = 'dashboard' | 'products' | 'categories' | 'barcodes' | 'billing' | 'customers' | 'inventory' | 'parties' | 'reports' | 'templates' | 'settings' | 'online_orders';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const db = useDatabase();
  useECommerceIntegration();
  const [isClosing, setIsClosing] = useState(false);
  const [closingCountdown, setClosingCountdown] = useState(15);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api || !api.onAppClose) return;

    api.onAppClose(async () => {
      setIsClosing(true);
      setClosingCountdown(15);

      let timeLeft = 15;
      const interval = setInterval(async () => {
        timeLeft--;
        setClosingCountdown(timeLeft);

        if (timeLeft <= 0) {
          clearInterval(interval);
          try {
            const dir = localStorage.getItem('backup_directory');
            if (dir) {
              const sqlContent = db.generateSqlDump();
              const now = new Date();
              const year = now.getFullYear();
              const month = String(now.getMonth() + 1).padStart(2, '0');
              const day = String(now.getDate()).padStart(2, '0');
              const hours = String(now.getHours()).padStart(2, '0');
              const minutes = String(now.getMinutes()).padStart(2, '0');
              const seconds = String(now.getSeconds()).padStart(2, '0');
              const fileName = `billing_backup_auto_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.sql`;
              await api.saveJson(fileName, sqlContent, dir);
              console.log('App close auto backup saved to', dir);
            }
          } catch (e) {
            console.error('App close auto backup failed:', e);
          } finally {
            if (api.closeApp) {
              api.closeApp();
            }
          }
        }
      }, 1000);
    });
  }, [db]);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.saveJson) return; // Only available in the desktop (Electron) app

    const doBackupIfNeeded = async () => {
      try {
        const dir = localStorage.getItem('backup_directory');
        if (!dir) return;
        const today = new Date().toISOString().slice(0, 10);
        const last = localStorage.getItem('last_backup_date');
        if (last === today) return; // already backed up today

        const payload = {
          products: JSON.parse(localStorage.getItem('billing_app_products') || '[]'),
          customers: JSON.parse(localStorage.getItem('billing_app_customers') || '[]'),
          bills: JSON.parse(localStorage.getItem('billing_app_bills') || '[]'),
          transactions: JSON.parse(localStorage.getItem('billing_app_transactions') || '[]'),
        };
        const content = JSON.stringify(payload, null, 2);
        const fileName = `billing_backup_${today}.json`;
        await api.saveJson(fileName, content, dir);
        localStorage.setItem('last_backup_date', today);
        console.log('Daily backup saved to', dir);
      } catch (e) {
        console.error('Daily backup failed:', e);
      }
    };

    doBackupIfNeeded();
    const id = setInterval(doBackupIfNeeded, 60 * 60 * 1000); // hourly check
    return () => clearInterval(id);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'products':
        return <Products />;
      case 'categories':
        return <Categories />;
      case 'barcodes':
        return <BarcodeManager />;
      case 'billing':
        return <Billing />;
      case 'customers':
        return <Customers onNavigate={setCurrentPage} />;
      case 'inventory':
        return <Inventory />;
      case 'parties':
        return <Parties />;
      case 'reports':
        return <Reports />;
      case 'templates':
        return <InvoiceTemplates />;
      case 'online_orders':
        return <OnlineOrders />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="app-root flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50 text-slate-900">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 overflow-auto p-4 lg:p-6">
        {renderPage()}
      </main>

      {isClosing && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/95 text-white backdrop-blur-xl">
          <style>{`
            @keyframes fly-file {
              0% {
                transform: translate(0, 0) scale(0.6) rotate(0deg);
                opacity: 0;
              }
              15% {
                opacity: 1;
              }
              85% {
                opacity: 1;
              }
              100% {
                transform: translate(240px, -20px) scale(1.1) rotate(360deg);
                opacity: 0;
              }
            }
            .flying-file {
              animation: fly-file 2.2s infinite linear;
            }
            .flying-file-delay-1 {
              animation: fly-file 2.2s infinite linear;
              animation-delay: 0.7s;
            }
            .flying-file-delay-2 {
              animation: fly-file 2.2s infinite linear;
              animation-delay: 1.4s;
            }
            @keyframes pulse-glow {
              0%, 100% {
                box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
              }
              50% {
                box-shadow: 0 0 45px rgba(59, 130, 246, 0.6);
              }
            }
            .db-glow {
              animation: pulse-glow 2s infinite ease-in-out;
            }
          `}</style>

          <div className="text-center max-w-lg px-6 flex flex-col items-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
              Securing Your Database
            </h2>
            <p className="text-slate-400 text-sm mb-12">
              Please wait while we generate a complete SQL backup of your products, customers, bills, and transactions...
            </p>

            {/* Animation Container */}
            <div className="relative flex items-center justify-between w-[440px] h-[150px] mx-auto mb-16 px-4">
              
              {/* Left Side: Local DB */}
              <div className="db-glow relative z-10 flex flex-col items-center justify-center w-24 h-24 rounded-3xl bg-blue-600 border border-blue-400/50 shadow-lg">
                <Database className="h-12 w-12 text-white animate-pulse" />
                <span className="absolute -bottom-7 text-[10px] font-bold tracking-widest text-blue-400 uppercase">Local DB</span>
              </div>

              {/* Center: Flying Files Container */}
              <div className="absolute left-[110px] top-[40px] w-[220px] h-[80px] pointer-events-none">
                {/* File 1 */}
                <div className="flying-file absolute left-0 top-0 flex items-center justify-center w-10 h-12 bg-white/10 rounded-lg border border-white/20 backdrop-blur-md">
                  <FileText className="h-5 w-5 text-blue-400" />
                </div>
                {/* File 2 */}
                <div className="flying-file-delay-1 absolute left-0 top-0 flex items-center justify-center w-10 h-12 bg-white/10 rounded-lg border border-white/20 backdrop-blur-md">
                  <FileCode className="h-5 w-5 text-amber-400" />
                </div>
                {/* File 3 */}
                <div className="flying-file-delay-2 absolute left-0 top-0 flex items-center justify-center w-10 h-12 bg-white/10 rounded-lg border border-white/20 backdrop-blur-md">
                  <FileText className="h-5 w-5 text-emerald-400" />
                </div>
              </div>

              {/* Right Side: Backup Folder */}
              <div className="relative z-10 flex flex-col items-center justify-center w-24 h-24 rounded-3xl bg-emerald-600 border border-emerald-400/50 shadow-lg">
                <FolderDown className="h-12 w-12 text-white animate-pulse" />
                <span className="absolute -bottom-7 text-[10px] font-bold tracking-widest text-emerald-400 uppercase">Backup Dir</span>
              </div>
            </div>

            {/* Countdown Display */}
            <div className="relative flex items-center justify-center w-36 h-36 mb-6 rounded-full bg-slate-900 border-4 border-blue-500/30">
              {/* Spinning progress border */}
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-500 animate-spin" />
              
              <div className="text-center">
                <span className="text-4xl font-extrabold text-blue-400">{closingCountdown}</span>
                <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-1">Seconds</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 italic animate-pulse">
              Safely writing to backup folder... Do not turn off your computer.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
