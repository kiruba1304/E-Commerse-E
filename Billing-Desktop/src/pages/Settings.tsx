import React, { useEffect, useState } from 'react';
import { Download, Save, Database, Upload } from 'lucide-react';
import { useProducts, useCustomers, useBills, useTransactions, useDatabase } from '../hooks/useDatabase';

const Settings: React.FC = () => {
  const db = useDatabase();
  const { products } = useProducts();
  const { customers } = useCustomers();
  const { bills } = useBills();
  const { transactions } = useTransactions();

  const [storeName, setStoreName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [backupDir, setBackupDir] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [showGst, setShowGst] = useState(true);
  const [footerMessage, setFooterMessage] = useState('');

  const [printers, setPrinters] = useState<any[]>([]);
  const [selectedReceiptPrinter, setSelectedReceiptPrinter] = useState<string>(() => localStorage.getItem('receipt_printer_name') || '');
  const [selectedLabelPrinter, setSelectedLabelPrinter] = useState<string>(() => localStorage.getItem('label_printer_name') || '');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('app_settings');
      const settings = raw ? JSON.parse(raw) : {};
      setStoreName(settings.storeName || 'SASHVIKA SAREES');
      setLogoUrl(settings.logoUrl || '');
      setUpiId(settings.upiId || '');
      setBankAccountNumber(settings.bankAccountNumber || '');
      setBankIfscCode(settings.bankIfscCode || '');
      setAccountHolderName(settings.accountHolderName || '');
      setAddress(settings.address || '32-F, Near Eswaran Temple, Kadaiveethi, Idappadi – 637101');
      setPhone(settings.phone || '9965326590, 9047656890');
      setGstNumber(settings.gstNumber || '');
      setShowGst(settings.showGst !== undefined ? settings.showGst : true);
      setFooterMessage(settings.footerMessage || 'Thank you for your business!');
    } catch { }
    try {
      const dir = localStorage.getItem('backup_directory') || '';
      setBackupDir(dir);
    } catch { }

    try {
      const api = (window as any).electronAPI;
      if (api?.listPrinters) {
        api.listPrinters()
          .then((list: any[]) => setPrinters(list || []))
          .catch(() => setPrinters([]));
      }
    } catch { }
  }, []);

  const handleReceiptPrinterChange = (name: string) => {
    setSelectedReceiptPrinter(name);
  };

  const handleLabelPrinterChange = (name: string) => {
    setSelectedLabelPrinter(name);
  };

  const savePrinterSettings = () => {
    if (selectedReceiptPrinter) {
      localStorage.setItem('receipt_printer_name', selectedReceiptPrinter);
    } else {
      localStorage.removeItem('receipt_printer_name');
    }

    if (selectedLabelPrinter) {
      localStorage.setItem('label_printer_name', selectedLabelPrinter);
    } else {
      localStorage.removeItem('label_printer_name');
    }

    alert('Printer settings saved successfully!');
  };

  const saveSettings = () => {
    const existingRaw = localStorage.getItem('app_settings');
    const existing = existingRaw ? JSON.parse(existingRaw) : {};
    const next = { 
      ...existing, 
      storeName: storeName || 'SASHVIKA SAREES',
      logoUrl: logoUrl,
      upiId: upiId.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      bankIfscCode: bankIfscCode.trim(),
      accountHolderName: accountHolderName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      gstNumber: gstNumber.trim(),
      showGst: showGst,
      footerMessage: footerMessage.trim()
    };
    localStorage.setItem('app_settings', JSON.stringify(next));
    alert('Settings saved');
  };

  const downloadCsv = (rows: (string | number)[][], filename: string) => {
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJson = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportProducts = () => {
    const rows: (string | number)[][] = [
      ['ID', 'Code', 'Name', 'Company', 'Stock', 'Cost', 'Selling', 'Discount', 'GST', 'Final', 'Barcode', 'Created', 'Updated'],
      ...products.map(p => [
        p.id, p.productCode || '', p.name, p.company, p.count,
        p.costPrice.toFixed(2), p.sellingPrice.toFixed(2), p.discount,
        p.gst.toFixed(2), p.finalPrice.toFixed(2), p.barcode,
        p.createdAt, p.updatedAt
      ])
    ];
    downloadCsv(rows, 'products.csv');
  };

  const exportCustomers = () => {
    const rows: (string | number)[][] = [
      ['ID', 'Name', 'Phone', 'Email', 'Address', 'Created', 'Updated'],
      ...customers.map(c => [c.id, c.name, c.phone, c.email || '', c.address || '', c.createdAt, c.updatedAt])
    ];
    downloadCsv(rows, 'customers.csv');
  };

  const exportBills = () => {
    const rows: (string | number)[][] = [
      ['ID', 'Bill No', 'CustomerId', 'Date', 'Total', 'Discount', 'GST', 'Final', 'Payment', 'Status', 'ItemsCount'],
      ...bills.map(b => [
        b.id, b.billNumber, b.customerId || '', b.createdAt,
        b.totalAmount.toFixed(2), b.totalDiscount.toFixed(2), b.totalGst.toFixed(2),
        b.finalAmount.toFixed(2), b.paymentMethod, b.status, (b.items || []).length
      ])
    ];
    downloadCsv(rows, 'bills.csv');
  };

  const exportTransactions = () => {
    const rows: (string | number)[][] = [
      ['ID', 'ProductId', 'Type', 'Qty', 'Reason', 'BillId', 'Created'],
      ...transactions.map(t => [t.id, t.productId, t.type, t.quantity, t.reason, t.billId || '', t.createdAt])
    ];
    downloadCsv(rows, 'inventory_transactions.csv');
  };

  const chooseBackupDirectory = async () => {
    try {
      const api = (window as any).electronAPI;
      if (!api || !api.chooseBackupDirectory) {
        alert('You are running in browser mode (or Electron API is unavailable). Backups will be downloaded to your default Downloads folder instead of a specific directory.');
        return;
      }
      const chosen = await api.chooseBackupDirectory();
      if (chosen) {
        localStorage.setItem('backup_directory', chosen);
        setBackupDir(chosen);
        alert('Backup folder set to: ' + chosen);
      }
    } catch (e: any) {
      console.error('Failed to choose backup directory:', e);
      alert('Failed to choose folder: ' + (e?.message || String(e)));
    }
  };

  const runBackupNow = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const fileName = `billing_backup_${today}.sql`;
      const content = db.generateSqlDump();

      const api = (window as any).electronAPI;

      if (api && api.saveJson) {
        // Desktop Mode
        const dir = backupDir || localStorage.getItem('backup_directory');
        if (!dir) {
          alert('Please select a backup folder first.');
          return;
        }
        // Reusing saveJson for text content (it just writes string to file)
        const fullPath = await api.saveJson(fileName, content, dir);
        localStorage.setItem('last_backup_date', today);
        alert('Backup saved: ' + fullPath);
      } else {
        // Browser Fallback
        downloadJson(content, fileName);

        localStorage.setItem('last_backup_date', today);
        alert('Backup downloaded to your default Downloads folder.');
      }
    } catch (e: any) {
      alert('Backup failed: ' + (e?.message || String(e)));
    }
  };

  const handleImportSql = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('Warning: Importing this backup will completely replace your current database. All products, customers, bills, transactions, and parties will be overwritten. Do you want to proceed?')) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const sqlContent = e.target?.result as string;
      if (!sqlContent) {
        alert('Failed to read the backup file.');
        return;
      }

      try {
        const success = db.importSqlDump(sqlContent);
        if (success) {
          alert('Database restored successfully! The application will now reload to apply the restored data.');
          window.location.reload();
        } else {
          alert('Failed to restore database: The SQL file content was invalid or empty.');
        }
      } catch (err: any) {
        alert('Restore failed: ' + (err?.message || String(err)));
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    if (!confirm('This will permanently delete all products, customers, bills, and transactions. Continue?')) return;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k.startsWith('billing_app_')) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
    alert('All application data cleared. The app will reload now.');
    window.location.reload();
  };


  return (
    <div className="min-h-full rounded-[2rem] bg-white/70 p-5 shadow-soft backdrop-blur-sm lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary-600">Administration</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">Settings</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Export data, customize receipts, and manage backups in one place.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card border border-white/60 bg-white/85 shadow-soft">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Receipt Customization</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Store Logo</label>
              <div className="flex items-center gap-4 mt-1">
                {logoUrl ? (
                  <div className="relative w-20 h-20 rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                    <img src={logoUrl} alt="Store logo" className="max-w-full max-h-full object-contain" />
                    <button 
                      type="button" 
                      onClick={() => setLogoUrl('')} 
                      className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-all flex items-center justify-center w-5 h-5 text-[10px] font-bold"
                      title="Remove logo"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">No Logo</span>
                  </div>
                )}
                <label className="btn-secondary px-4 py-2 cursor-pointer text-sm font-semibold flex items-center gap-2">
                  Upload Image
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setLogoUrl(event.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }} 
                  />
                </label>
              </div>
              <p className="mt-1 text-xs text-slate-500">Recommended: Square format (PNG/JPG). Displays beautifully on top of A4 bills.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Store Name</label>
              <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="input w-full" placeholder="Enter store name" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Footer Message</label>
              <input type="text" value={footerMessage} onChange={(e) => setFooterMessage(e.target.value)} className="input w-full" placeholder="e.g., Thank you for shopping with us!" />
            </div>
            <button onClick={saveSettings} className="btn-primary inline-flex items-center gap-2 px-4 py-2">
              <Save className="h-4 w-4" /> Save Settings
            </button>
          </div>
        </div>

        <div className="card border border-white/60 bg-white/85 shadow-soft">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Store Contact & GST Customization</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Store Address</label>
              <textarea 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                className="input w-full h-auto py-2" 
                rows={2} 
                placeholder="Enter store address" 
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Store Mobile Number</label>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                className="input w-full" 
                placeholder="Enter mobile number" 
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">GST Number</label>
              <input 
                type="text" 
                value={gstNumber} 
                onChange={(e) => setGstNumber(e.target.value)} 
                className="input w-full" 
                placeholder="e.g., 22AAAAA1111A1Z1" 
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <label className="text-sm font-semibold text-slate-900">Show GST Number on Invoices</label>
                <p className="text-xs text-slate-500">Toggle whether to display the GST number in bill templates.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGst(!showGst)}
                style={{ backgroundColor: showGst ? 'var(--primary)' : '#cbd5e1' }}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showGst ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
            <button onClick={saveSettings} className="btn-primary inline-flex items-center gap-2 px-4 py-2 mt-2">
              <Save className="h-4 w-4" /> Save Contact Details
            </button>
          </div>
        </div>

        <div className="card border border-white/60 bg-white/85 shadow-soft">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Export Data</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={exportProducts} className="btn-secondary flex items-center gap-2 px-4 py-2">
              <Download className="h-4 w-4" /> Products CSV
            </button>
            <button onClick={exportCustomers} className="btn-secondary flex items-center gap-2 px-4 py-2">
              <Download className="h-4 w-4" /> Customers CSV
            </button>
            <button onClick={exportBills} className="btn-secondary flex items-center gap-2 px-4 py-2">
              <Download className="h-4 w-4" /> Bills CSV
            </button>
            <button onClick={exportTransactions} className="btn-secondary flex items-center gap-2 px-4 py-2">
              <Download className="h-4 w-4" /> Inventory CSV
            </button>
          </div>
        </div>


        <div className="card border border-white/60 bg-white/85 shadow-soft">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Database Backup</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Backup Folder</label>
              <div className="flex gap-2">
                <input type="text" className="input flex-1" value={backupDir} readOnly placeholder="Not set" />
                <button onClick={chooseBackupDirectory} className="btn-secondary px-4 py-2">Browse…</button>
              </div>
              <p className="mt-1 text-xs text-slate-500">Choose a local folder (e.g., D:\Backups). A daily backup will be saved as billing_backup_YYYY-MM-DD.sql</p>
            </div>
            <div className="flex gap-2">
              <button onClick={runBackupNow} className="btn-primary inline-flex items-center gap-2 px-4 py-2">
                <Database className="h-4 w-4" /> Backup Now (SQL)
              </button>
              
              <label className="btn-secondary cursor-pointer inline-flex items-center gap-2 px-4 py-2">
                <Upload className="h-4 w-4" /> Import SQL Backup
                <input type="file" accept=".sql" className="hidden" onChange={handleImportSql} />
              </label>
            </div>
          </div>
        </div>

        <div className="card border border-white/60 bg-white/85 shadow-soft">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Payment Method Account Details</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">UPI ID</label>
              <input 
                type="text" 
                value={upiId} 
                onChange={(e) => setUpiId(e.target.value)} 
                className="input w-full" 
                placeholder="e.g., user@upi" 
              />
              <p className="mt-1 text-xs text-slate-500">Your UPI ID for receiving payments via QR code</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Bank Account Number</label>
              <input 
                type="text" 
                value={bankAccountNumber} 
                onChange={(e) => setBankAccountNumber(e.target.value)} 
                className="input w-full" 
                placeholder="e.g., 1234567890" 
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Bank IFSC Code</label>
              <input 
                type="text" 
                value={bankIfscCode} 
                onChange={(e) => setBankIfscCode(e.target.value)} 
                className="input w-full" 
                placeholder="e.g., SBIN0001234" 
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Account Holder Name</label>
              <input 
                type="text" 
                value={accountHolderName} 
                onChange={(e) => setAccountHolderName(e.target.value)} 
                className="input w-full" 
                placeholder="Your business/personal name" 
              />
            </div>
            <button onClick={saveSettings} className="btn-primary inline-flex items-center gap-2 px-4 py-2">
              <Save className="h-4 w-4" /> Save Payment Details
            </button>
          </div>
        </div>

        <div className="card border border-white/60 bg-white/85 shadow-soft">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Printer Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Default Receipt Printer</label>
              <select
                value={selectedReceiptPrinter}
                onChange={(e) => handleReceiptPrinterChange(e.target.value)}
                className="input w-full"
                title="Select Receipt Printer"
              >
                <option value="">Interactive (Show Print Dialog)</option>
                {printers.map((p: any) => (
                  <option key={p.name} value={p.name}>{p.displayName || p.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">Select your thermal receipt printer for silent, instant printing during checkout.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Default Barcode Label Printer</label>
              <select
                value={selectedLabelPrinter}
                onChange={(e) => handleLabelPrinterChange(e.target.value)}
                className="input w-full"
                title="Select Label Printer"
              >
                <option value="">Select Label Printer...</option>
                {printers.map((p: any) => (
                  <option key={p.name} value={p.name}>{p.displayName || p.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">Select your label printer (e.g. TVS LP46 Dlite) to use when printing product labels.</p>
            </div>

            <button onClick={savePrinterSettings} className="btn-primary inline-flex items-center gap-2 px-4 py-2 mt-2">
              <Save className="h-4 w-4" /> Save Printer Settings
            </button>
          </div>
        </div>

        <div className="card border border-red-100 bg-gradient-to-br from-red-50 to-white shadow-soft">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Danger Zone</h2>
          <p className="mb-3 text-sm text-slate-600">Clear all data from the local database (products, customers, bills, transactions).</p>
          <button onClick={clearAllData} className="btn-danger px-4 py-2">Clear All Data</button>
        </div>
      </div>
    </div>
  );
};

export default Settings;

