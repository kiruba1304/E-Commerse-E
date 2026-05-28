import React, { useEffect, useMemo, useState } from 'react';
import { useBills, useCustomers } from '../hooks/useDatabase';
import { Globe, Package, CheckCircle } from 'lucide-react';
import JsBarcode from 'jsbarcode';

const LABEL_SIZES = [
  { value: '3in', label: '3 inch - Thermal label printer' },
  { value: '4x6', label: '4 x 6 in - Standard thermal' },
  { value: '4x8', label: '4 x 8 in - Extended thermal' },
  { value: 'A6', label: 'A6 - Compact label' },
  { value: 'A4', label: 'A4 - Full page label' }
] as const;

const LABEL_DIMENSIONS: Record<string, { width: string; height: string }> = {
  '3in': { width: '3in', height: '6in' },
  '4x6': { width: '4in', height: '6in' },
  '4x8': { width: '4in', height: '8in' },
  'A6': { width: '4.13in', height: '5.83in' },
  'A4': { width: '8.27in', height: '11.69in' }
};

const LABEL_LAYOUTS: Record<string, {
  padding: string;
  gap: string;
  headingSize: string;
  bodySize: string;
  metaSize: string;
  lineHeight: string;
}> = {
  '3in': {
    padding: '4px',
    gap: '2px',
    headingSize: '10px',
    bodySize: '10px',
    metaSize: '9px',
    lineHeight: '1.12'
  },
  '4x6': {
    padding: '6px',
    gap: '3px',
    headingSize: '11px',
    bodySize: '11px',
    metaSize: '10px',
    lineHeight: '1.15'
  },
  '4x8': {
    padding: '8px',
    gap: '4px',
    headingSize: '12px',
    bodySize: '12px',
    metaSize: '10px',
    lineHeight: '1.16'
  },
  'A6': {
    padding: '7px',
    gap: '4px',
    headingSize: '12px',
    bodySize: '12px',
    metaSize: '10px',
    lineHeight: '1.16'
  },
  'A4': {
    padding: '12px',
    gap: '6px',
    headingSize: '14px',
    bodySize: '14px',
    metaSize: '11px',
    lineHeight: '1.2'
  }
};

const getInitialLabelSize = () => {
  try {
    const raw = localStorage.getItem('app_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      const saved = String(parsed.shippingLabelSize || '').toUpperCase();
      if (LABEL_SIZES.some(size => size.value === saved)) return saved;
    }
  } catch {
    // ignore invalid storage
  }
  return '3in';
};

const buildBarcodeSvg = (value: string, labelSize: string) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const targetWidth = labelSize === '3in' ? 175 : labelSize === 'A4' ? 320 : 240;
  const targetHeight = labelSize === '3in' ? 32 : labelSize === 'A4' ? 54 : 40;

  JsBarcode(svg, value, {
    format: 'CODE128',
    displayValue: true,
    margin: 0,
    width: labelSize === '3in' ? 0.9 : 1.05,
    height: targetHeight,
    fontSize: labelSize === '3in' ? 8 : 10,
    textMargin: 2,
    textAlign: 'center',
    textPosition: 'bottom',
    background: 'transparent',
    lineColor: '#111'
  });

  svg.setAttribute('width', String(targetWidth));
  svg.setAttribute('height', String(targetHeight + 22));
  svg.setAttribute('viewBox', `0 0 ${targetWidth} ${targetHeight + 22}`);

  return new XMLSerializer().serializeToString(svg);
};

const OnlineOrders: React.FC = () => {
  const { bills } = useBills();
  const { customers } = useCustomers();
  const [labelSize, setLabelSize] = useState(getInitialLabelSize);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('app_settings');
      const settings = raw ? JSON.parse(raw) : {};
      const saved = String(settings.shippingLabelSize || '').toUpperCase();
      if (saved && LABEL_SIZES.some(size => size.value === saved)) {
        setLabelSize(saved);
      }
    } catch {
      // keep default
    }
  }, []);

  const persistLabelSize = (nextSize: string) => {
    setLabelSize(nextSize);
    try {
      const raw = localStorage.getItem('app_settings');
      const settings = raw ? JSON.parse(raw) : {};
      localStorage.setItem('app_settings', JSON.stringify({
        ...settings,
        shippingLabelSize: nextSize
      }));
    } catch {
      // ignore storage write failures
    }
  };

  // Filter bills where salesChannel === 'ecommerce' and invoiceType === 'customer_bill'
  const onlineOrders = useMemo(() => {
    return bills
      .filter(b => b.salesChannel === 'ecommerce' && b.invoiceType === 'customer_bill')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bills]);

  return (
    <div className="min-h-full rounded-[2rem] bg-white/70 p-5 shadow-soft backdrop-blur-sm lg:p-8">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600">E-Commerce Integration</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">Online Orders</h1>
          <p className="mt-2 max-w-2xl text-slate-600">View and manage orders synchronized from your online store.</p>
        </div>
      </div>

      <div className="card border border-white/60 bg-white/85 shadow-soft">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" /> Recent Webhook Orders
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
              <span>Label Size</span>
              <select
                value={labelSize}
                onChange={(e) => persistLabelSize(e.target.value)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-900 outline-none"
              >
                {LABEL_SIZES.map(size => (
                  <option key={size.value} value={size.value}>{size.label}</option>
                ))}
              </select>
            </label>
            <span className="badge bg-blue-100 text-blue-800 px-3 py-1 text-xs font-semibold rounded-full">{onlineOrders.length} Orders</span>
          </div>
        </div>

        {onlineOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-xl font-medium text-slate-900">No online orders yet</h3>
            <p className="text-slate-500 max-w-md mt-2">
              Orders from your e-commerce platform will appear here automatically when the webhook is triggered.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 shadow-soft">
            <table className="w-full">
              <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-4 py-4 text-left font-semibold text-slate-700">Order ID</th>
                  <th className="px-4 py-4 text-left font-semibold text-slate-700">Date</th>
                  <th className="px-4 py-4 text-left font-semibold text-slate-700">Customer</th>
                  <th className="px-4 py-4 text-left font-semibold text-slate-700">Ordered Items</th>
                  <th className="px-4 py-4 text-left font-semibold text-slate-700">Total / Payment</th>
                  <th className="px-4 py-4 text-left font-semibold text-slate-700">Actions</th>
                  <th className="px-4 py-4 text-left font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {onlineOrders.map((order) => {
                  const customer = customers.find(c => c.id === order.customerId);
                  
                  return (
                    <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-4 font-medium text-slate-900">{order.billNumber.replace('EC-CUST-', '#')}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {new Date(order.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">{customer?.name || 'Online Customer'}</div>
                        <div className="text-xs text-slate-500">{customer?.phone || customer?.email}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-3 my-1">
                          {order.items?.map((item) => {
                            const imageUrl = item.productImage || item.product?.images?.[0];
                            return (
                              <div key={item.id} className="flex items-center gap-3">
                                {imageUrl ? (
                                  <img 
                                    src={imageUrl} 
                                    alt={item.product?.name || 'Product'} 
                                    className="h-10 w-10 rounded-lg object-cover border border-slate-200 shrink-0" 
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 shrink-0 font-bold text-[10px]">
                                    N/A
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 text-sm truncate max-w-[200px]" title={item.product?.name || 'Product'}>
                                    {item.product?.name || 'Product'}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    ID: {item.productId} • Qty: {item.quantity}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-900">₹{order.finalAmount.toFixed(2)}</div>
                        <div className="mt-1">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                            order.paymentMethod === 'cod' 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {order.paymentMethod || 'ONLINE'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => {
                            // generate and print shipping label
                            const settingsRaw = localStorage.getItem('app_settings');
                            const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
                            const storeName = settings.storeName || settings.store || 'Store';
                            const storeAddress = settings.address || '';
                            const storePhone = settings.phone || '';

                            const customerName = customer?.name || 'Customer';
                            const customerAddress = customer?.address || order.customer?.address || order.shippingAddress || '';
                            const customerPhone = customer?.phone || order.customer?.phone || '';

                            const win = window.open('', '_blank');
                            if (!win) return;

                            // helper escape
                            function escapeHtml(s: any) {
                              if (!s) return '';
                              return String(s)
                                .replace(/&/g, '&amp;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;')
                                .replace(/"/g, '&quot;')
                                .replace(/'/g, '&#39;');
                            }

                            const paymentType = (order.paymentMethod || '').toString().toLowerCase() === 'cod' ? 'COD' : 'Prepaid';
                            const barcodeValue = String(order.billNumber || '').trim();
                            const barcodeSvg = buildBarcodeSvg(barcodeValue, labelSize);

                            const size = LABEL_DIMENSIONS[labelSize] || LABEL_DIMENSIONS['4x6'];
                            const layout = LABEL_LAYOUTS[labelSize] || LABEL_LAYOUTS['4x6'];

                            const html = `
                              <html>
                                <head>
                                  <title>Shipping Label - ${escapeHtml(order.billNumber || '')}</title>
                                  <style>
                                    @page { size: ${size.width} ${size.height}; margin: 0; }
                                    html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; font-family: Arial, sans-serif; }
                                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                    * { box-sizing: border-box; }
                                    .label { width: 100%; height: 100%; box-sizing: border-box; border: 1.5px solid #111; padding: ${layout.padding}; display: flex; flex-direction: column; gap: ${layout.gap}; overflow: hidden; background: #fff; }
                                    .header { display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid #111; padding-bottom: 4px; }
                                    .brand { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
                                    .brand-name { margin: 0; font-size: ${layout.headingSize}; line-height: 1; font-weight: 700; letter-spacing: 0.03em; color: #111; text-transform: uppercase; }
                                    .brand-subtitle { margin: 0; font-size: calc(${layout.metaSize} + 1px); line-height: 1.1; color: #555; }
                                    .label-id { margin: 0; font-size: ${layout.metaSize}; line-height: 1.1; font-weight: 700; color: #111; text-align: right; }
                                    .section { display: flex; flex-direction: column; gap: 1px; }
                                    .section h3 { margin: 0; font-size: calc(${layout.headingSize} + 1px); line-height: 1; letter-spacing: 0.02em; text-transform: uppercase; color: #111; }
                                    .section.from { flex: 0 0 auto; }
                                    .section.to { flex: 1 1 auto; justify-content: center; }
                                    .address-box { border: 1px solid #222; border-radius: 4px; padding: 4px 5px; background: #fafafa; }
                                    .pre { white-space: pre-line; font-size: calc(${layout.bodySize} + 1px); line-height: ${layout.lineHeight}; font-weight: 600; color: #111; }
                                    .from .pre { font-size: calc(${layout.bodySize} + 2px); }
                                    .to .pre { font-size: calc(${layout.bodySize} + 3px); line-height: 1.14; }
                                    .barcode-wrap { margin-top: 2px; display: flex; justify-content: center; align-items: center; }
                                    .barcode-wrap svg { display: block; margin: 0 auto; width: auto; max-width: 80%; height: auto; }
                                    .meta { margin-top: auto; font-size: ${layout.metaSize}; color: #111; line-height: 1.25; border-top: 1px solid #111; padding-top: 4px; display: flex; justify-content: space-between; gap: 6px; flex-wrap: wrap; }
                                    .meta span { white-space: nowrap; }
                                  </style>
                                </head>
                                <body>
                                  <div class="label">
                                    <div class="header">
                                      <div class="brand">
                                        <div class="brand-name">Shipping Label</div>
                                        <div class="brand-subtitle">Auto-generated for dispatch</div>
                                      </div>
                                      <div class="label-id">${escapeHtml(order.billNumber || '')}</div>
                                    </div>
                                    <div class="section from">
                                      <h3>From</h3>
                                      <div class="address-box">
                                        <div class="pre">${escapeHtml(storeName)}\n${escapeHtml(storeAddress)}\n${escapeHtml(storePhone)}</div>
                                      </div>
                                    </div>
                                    <div class="section to">
                                      <h3>To</h3>
                                      <div class="address-box">
                                        <div class="pre">${escapeHtml(customerName)}\n${escapeHtml(customerAddress)}\nMob: ${escapeHtml(customerPhone)}</div>
                                      </div>
                                    </div>
                                    <div class="barcode-wrap">${barcodeSvg}</div>
                                    <div class="meta">
                                      <span>Order ID: ${escapeHtml(order.billNumber || '')}</span>
                                      <span>${new Date(order.createdAt).toLocaleString()}</span>
                                      <span>${escapeHtml(paymentType)}</span>
                                    </div>
                                  </div>
                                </body>
                              </html>
                            `;

                            win.document.write(html);
                            win.document.close();
                            win.focus();
                            setTimeout(() => { win.print(); /* optionally close: win.close(); */ }, 300);
                          }}
                          className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700"
                        >
                          Print Label
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                          <CheckCircle className="h-3.5 w-3.5" /> Synced
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnlineOrders;
