import React, { useEffect, useMemo, useState } from 'react';
import { useBills, useCustomers } from '../hooks/useDatabase';
import { 
  Globe, Package, CheckCircle, Truck, Printer, Check, X, 
  RefreshCw, RotateCcw, AlertCircle, AlertTriangle 
} from 'lucide-react';
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

  // Web Sync state
  const [webOrders, setWebOrders] = useState<any[]>([]);
  const [webCustomizations, setWebCustomizations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'standard' | 'customization'>('standard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Modal states for prompts
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'dispatch' | 'dispatch_custom' | 'book_dtdc' | 'book_custom_dtdc' | null>(null);
  const [modalTargetId, setModalTargetId] = useState<number | null>(null);
  const [modalInputValue, setModalInputValue] = useState('');
  const [modalPlaceholder, setModalPlaceholder] = useState('');
  const [modalTitle, setModalTitle] = useState('');

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

  // Filter local bills where salesChannel === 'ecommerce' and invoiceType === 'customer_bill'
  const onlineOrders = useMemo(() => {
    return bills
      .filter(b => b.salesChannel === 'ecommerce' && b.invoiceType === 'customer_bill')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bills]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const settingsRaw = localStorage.getItem('app_settings');
      if (!settingsRaw) {
        setIsConfigured(false);
        setLoading(false);
        return;
      }
      
      const settings = JSON.parse(settingsRaw);
      const apiUrl = (settings.ecommerceApiUrl || '').replace(/\/$/, '');
      const apiKey = settings.ecommerceApiKey || '';
      
      if (!apiUrl || !apiKey) {
        setIsConfigured(false);
        setLoading(false);
        return;
      }
      
      setIsConfigured(true);
      
      // Fetch standard orders
      const res = await fetch(`${apiUrl}/billing/sync/orders/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWebOrders(data.orders || []);
        } else {
          throw new Error(data.error || "Failed to load orders");
        }
      } else {
        throw new Error(`Server returned status ${res.status}`);
      }

      // Fetch customization orders
      try {
        const custRes = await fetch(`${apiUrl}/billing/sync/customizations/list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: apiKey })
        });
        if (custRes.ok) {
          const custData = await custRes.json();
          if (custData.success) {
            setWebCustomizations(custData.customizations || []);
          }
        }
      } catch (custErr) {
        console.error("Error loading customization requests:", custErr);
      }

    } catch (err: any) {
      console.error("Error loading online orders from e-commerce:", err);
      setError(err.message || "Failed to connect to website backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    
    // Auto-reload on background sync completion
    window.addEventListener('ecommerce-sync-completed', loadOrders);
    return () => {
      window.removeEventListener('ecommerce-sync-completed', loadOrders);
    };
  }, []);

  // Update order status
  const handleUpdateStatus = async (orderId: number, status: string, additional: any = {}) => {
    try {
      setUpdatingId(orderId);
      const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
      const apiUrl = (settings.ecommerceApiUrl || '').replace(/\/$/, '');
      const apiKey = settings.ecommerceApiKey || '';
      
      const res = await fetch(`${apiUrl}/billing/sync/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, status, ...additional })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        await loadOrders();
      } else {
        alert(data.error || "Failed to update order status");
      }
    } catch (err: any) {
      alert("Error updating order: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Update customization status
  const handleUpdateCustomizationStatus = async (custId: number, status: string) => {
    try {
      setUpdatingId(custId);
      const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
      const apiUrl = (settings.ecommerceApiUrl || '').replace(/\/$/, '');
      const apiKey = settings.ecommerceApiKey || '';
      
      const res = await fetch(`${apiUrl}/billing/sync/customizations/${custId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, status })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        await loadOrders();
      } else {
        alert(data.error || "Failed to update customization status");
      }
    } catch (err: any) {
      alert("Error updating customization: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // OpenLink utility
  const openLink = (url: string) => {
    const api = (window as any).electronAPI;
    if (api && api.openExternal) {
      api.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  // Dispatch custom order (Open Modal)
  const handleDispatchCustomOrder = (custId: number) => {
    const trackId = `TRK${Math.floor(Math.random() * 90000000 + 10000000)}`;
    setModalTitle("Dispatch Custom Order");
    setModalPlaceholder(`Hub Courier Tracker ID: ${trackId}`);
    setModalInputValue(`Hub Courier Tracker ID: ${trackId}`);
    setModalType('dispatch_custom');
    setModalTargetId(custId);
    setModalOpen(true);
  };

  // Book DTDC Shipment for Customization (Open Modal)
  const handleBookCustomDtdcShipping = (custId: number) => {
    setModalTitle("Book Custom DTDC Shipment");
    setModalPlaceholder("0.5");
    setModalInputValue("0.5");
    setModalType('book_custom_dtdc');
    setModalTargetId(custId);
    setModalOpen(true);
  };

  // Dispatch generic order (Open Modal)
  const handleDispatchOrder = (orderId: number) => {
    const trackId = `TRK${Math.floor(Math.random() * 90000000 + 10000000)}`;
    setModalTitle("Dispatch Order");
    setModalPlaceholder(`Hub Courier Tracker ID: ${trackId}`);
    setModalInputValue(`Hub Courier Tracker ID: ${trackId}`);
    setModalType('dispatch');
    setModalTargetId(orderId);
    setModalOpen(true);
  };

  // Book DTDC Shipment (Open Modal)
  const handleBookDtdcShipping = (orderId: number) => {
    setModalTitle("Book DTDC Shipment");
    setModalPlaceholder("0.5");
    setModalInputValue("0.5");
    setModalType('book_dtdc');
    setModalTargetId(orderId);
    setModalOpen(true);
  };

  // Execute actual actions
  const executeDispatchOrder = async (orderId: number, trackingInfo: string) => {
    await handleUpdateStatus(orderId, 'Dispatched', { tracking_info: trackingInfo });
  };

  const executeBookDtdcShipping = async (orderId: number, weight: number) => {
    try {
      setUpdatingId(orderId);
      const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
      const apiUrl = (settings.ecommerceApiUrl || '').replace(/\/$/, '');
      const apiKey = settings.ecommerceApiKey || '';
      
      const res = await fetch(`${apiUrl}/billing/sync/orders/${orderId}/book-shipping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, weight_kg: weight })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`DTDC shipment booked successfully! AWB: ${data.order.tracking_info.split('AWB:')[1]?.trim() || data.order.tracking_info}`);
        await loadOrders();
        if (data.order.shipping_label_url) {
          openLink(data.order.shipping_label_url);
        }
      } else {
        alert(data.error || "Failed to book DTDC shipment");
      }
    } catch (err: any) {
      alert("Error booking DTDC shipping: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const executeDispatchCustomOrder = async (custId: number, trackingInfo: string) => {
    try {
      setUpdatingId(custId);
      const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
      const apiUrl = (settings.ecommerceApiUrl || '').replace(/\/$/, '');
      const apiKey = settings.ecommerceApiKey || '';
      
      const res = await fetch(`${apiUrl}/billing/sync/customizations/${custId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, status: 'Dispatched', tracking_info: trackingInfo })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        await loadOrders();
      } else {
        alert(data.error || "Failed to dispatch customization order");
      }
    } catch (err: any) {
      alert("Error dispatching customization order: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const executeBookCustomDtdcShipping = async (custId: number, weight: number) => {
    try {
      setUpdatingId(custId);
      const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
      const apiUrl = (settings.ecommerceApiUrl || '').replace(/\/$/, '');
      const apiKey = settings.ecommerceApiKey || '';
      
      const res = await fetch(`${apiUrl}/billing/sync/customizations/${custId}/book-shipping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, weight_kg: weight })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`DTDC shipment booked successfully! AWB: ${data.customization.tracking_info.split('AWB:')[1]?.trim() || data.customization.tracking_info}`);
        await loadOrders();
        if (data.customization.shipping_label_url) {
          openLink(data.customization.shipping_label_url);
        }
      } else {
        alert(data.error || "Failed to book DTDC shipment for customization");
      }
    } catch (err: any) {
      alert("Error booking DTDC shipping for customization: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleModalSubmit = async () => {
    if (!modalTargetId || !modalType) return;
    const value = modalInputValue.trim();
    
    // Reset modal state
    setModalOpen(false);
    
    if (modalType === 'dispatch') {
      await executeDispatchOrder(modalTargetId, value);
    } else if (modalType === 'book_dtdc') {
      const weight = parseFloat(value) || 0.5;
      await executeBookDtdcShipping(modalTargetId, weight);
    } else if (modalType === 'dispatch_custom') {
      await executeDispatchCustomOrder(modalTargetId, value);
    } else if (modalType === 'book_custom_dtdc') {
      const weight = parseFloat(value) || 0.5;
      await executeBookCustomDtdcShipping(modalTargetId, weight);
    }
  };

  const handleRejectOrder = async (orderId: number) => {
    if (!window.confirm("Are you sure you want to reject this order?")) return;
    await handleUpdateStatus(orderId, 'Rejected');
  };

  const handleConfirmDelivery = async (orderId: number) => {
    await handleUpdateStatus(orderId, 'Customer Received');
  };

  // Resolve Return request
  const handleResolveReturn = async (orderId: number, decision: 'Approved' | 'Rejected') => {
    if (!window.confirm(`Are you sure you want to ${decision.toLowerCase()} this return request?`)) return;
    try {
      setUpdatingId(orderId);
      const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
      const apiUrl = (settings.ecommerceApiUrl || '').replace(/\/$/, '');
      const apiKey = settings.ecommerceApiKey || '';
      
      const res = await fetch(`${apiUrl}/billing/sync/orders/${orderId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, decision })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        await loadOrders();
      } else {
        alert(data.error || "Failed to resolve return request");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Dual-mode mapping
  const displayedOrders = useMemo(() => {
    let list = [];
    if (isConfigured && webOrders.length > 0) {
      list = [...webOrders];
    } else {
      // Fallback: map local SQLite bills to order objects
      list = onlineOrders.map(b => {
        const customer = b.customer || customers.find(c => c.id === b.customerId);
        return {
          id: b.id,
          isLocalFallback: true,
          created_at: b.createdAt,
          billNumber: b.billNumber,
          final_amount: b.finalAmount,
          payment_method: (b.paymentMethod || 'ONLINE').toUpperCase(),
          status: b.status === 'completed' ? 'Customer Received' : 'Pending',
          customer: {
            name: customer?.name || 'Online Customer',
            phone: customer?.phone || '',
            email: customer?.email || '',
            shipping_address: customer?.address || ''
          },
          items: b.items?.map(item => ({
            id: item.id,
            product_name: item.product?.name || 'Product',
            product_image: item.productImage || item.product?.images?.[0],
            quantity: item.quantity,
            price: item.unitPrice
          })) || []
        };
      });
    }

    const getStatusPriority = (status: string) => {
      const s = String(status || '').trim();
      if (s === 'Pending') return 1;
      if (s === 'Accepted') return 2;
      if (s === 'Dispatched') return 3;
      if (s === 'Customer Received') return 4;
      if (s === 'Returned') return 5;
      if (s === 'Rejected') return 6;
      return 7;
    };

    return list.sort((a, b) => {
      const pA = getStatusPriority(a.status);
      const pB = getStatusPriority(b.status);
      
      const groupA = pA <= 3 ? 0 : 1;
      const groupB = pB <= 3 ? 0 : 1;
      
      if (groupA !== groupB) {
        return groupA - groupB;
      }
      
      const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
      const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [isConfigured, webOrders, onlineOrders, customers]);

  // Local printer label routine (reused)
  const handlePrintLocalLabel = (order: any) => {
    const settingsRaw = localStorage.getItem('app_settings');
    const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
    const storeName = settings.storeName || settings.store || 'Store';
    const storeAddress = settings.address || '';
    const storePhone = settings.phone || '';

    const customerName = order.customer?.name || 'Customer';
    const customerAddress = order.customer?.shipping_address || order.customer?.address || '';
    const customerPhone = order.customer?.phone || '';

    const win = window.open('', '_blank');
    if (!win) return;

    function escapeHtml(s: any) {
      if (!s) return '';
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    const paymentType = (order.payment_method || '').toString().toLowerCase() === 'cod' ? 'COD' : 'Prepaid';
    const barcodeValue = String(order.billNumber || `#${order.id}`).trim();
    const barcodeSvg = buildBarcodeSvg(barcodeValue, labelSize);

    const size = LABEL_DIMENSIONS[labelSize] || LABEL_DIMENSIONS['4x6'];
    const layout = LABEL_LAYOUTS[labelSize] || LABEL_LAYOUTS['4x6'];

    const html = `
      <html>
        <head>
          <title>Shipping Label - ${escapeHtml(order.billNumber || order.id)}</title>
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
              <div class="label-id">${escapeHtml(order.billNumber || order.id)}</div>
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
              <span>Order ID: ${escapeHtml(order.billNumber || order.id)}</span>
              <span>${new Date(order.created_at || order.createdAt).toLocaleString()}</span>
              <span>${escapeHtml(paymentType)}</span>
            </div>
          </div>
        </body>
      </html>
    `;

    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  };

  const displayedCustomizations = useMemo(() => {
    const getStatusPriority = (status: string) => {
      const s = String(status || '').trim();
      if (s === 'Pending') return 1;
      if (s === 'In Progress') return 2;
      if (s === 'Dispatched') return 3;
      if (s === 'Completed') return 4;
      if (s === 'Rejected') return 5;
      return 6;
    };

    return [...webCustomizations].sort((a, b) => {
      const pA = getStatusPriority(a.status);
      const pB = getStatusPriority(b.status);
      
      const groupA = pA <= 3 ? 0 : 1;
      const groupB = pB <= 3 ? 0 : 1;
      
      if (groupA !== groupB) {
        return groupA - groupB;
      }
      
      const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
      const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [webCustomizations]);

  const handlePrintLocalCustomLabel = (cust: any) => {
    const settingsRaw = localStorage.getItem('app_settings');
    const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
    const storeName = settings.storeName || settings.store || 'Store';
    const storeAddress = settings.address || '';
    const storePhone = settings.phone || '';

    const customerName = cust.user_name || 'Customer';
    const customerAddress = cust.shipping_address || '';
    const customerPhone = cust.user_phone || '';

    const win = window.open('', '_blank');
    if (!win) return;

    function escapeHtml(s: any) {
      if (!s) return '';
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    const barcodeValue = `CUST-${String(cust.id).padStart(6, '0')}`;
    const barcodeSvg = buildBarcodeSvg(barcodeValue, labelSize);

    const size = LABEL_DIMENSIONS[labelSize] || LABEL_DIMENSIONS['4x6'];
    const layout = LABEL_LAYOUTS[labelSize] || LABEL_LAYOUTS['4x6'];

    const html = `
      <html>
        <head>
          <title>Custom Label - ${escapeHtml(barcodeValue)}</title>
          <style>
            @page { size: ${size.width} ${size.height}; margin: 0; }
            html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; font-family: Arial, sans-serif; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            * { box-sizing: border-box; }
            .label { width: 100%; height: 100%; box-sizing: border-box; border: 1.5px solid #111; padding: ${layout.padding}; display: flex; flex-direction: column; gap: ${layout.gap}; overflow: hidden; background: #fff; }
            .header { display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid #111; padding-bottom: 4px; }
            .brand { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
            .brand-name { margin: 0; font-size: ${layout.headingSize}; line-height: 1; font-weight: 700; letter-spacing: 0.03em; color: #111; text-transform: uppercase; }
            .brand-subtitle { margin: 0; font-size: calc(${layout.metaSize} - 1px); line-height: 1.1; color: #555; }
            .label-id { margin: 0; font-size: ${layout.metaSize}; line-height: 1.1; font-weight: 700; color: #111; text-align: right; }
            .section { display: flex; flex-direction: column; gap: 1px; }
            .section h3 { margin: 0; font-size: calc(${layout.headingSize} - 1px); line-height: 1; letter-spacing: 0.02em; text-transform: uppercase; color: #111; }
            .address-box { border: 1px solid #222; border-radius: 4px; padding: 4px 5px; background: #fafafa; }
            .pre { white-space: pre-line; font-size: calc(${layout.bodySize} - 1px); line-height: ${layout.lineHeight}; font-weight: 600; color: #111; }
            .from .pre { font-size: calc(${layout.bodySize} - 2px); }
            .to .pre { font-size: calc(${layout.bodySize} - 1px); line-height: 1.14; }
            .custom-details { border: 1px dashed #7a4ea5; border-radius: 4px; padding: 4px; margin-top: 2px; font-size: calc(${layout.bodySize} - 1px); background: #fdfcff; color: #5c3580; }
            .custom-title { font-weight: bold; text-transform: uppercase; font-size: calc(${layout.metaSize} - 1px); margin-bottom: 2px; }
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
                <div class="brand-name">Custom Order</div>
                <div class="brand-subtitle">Special Handcrafted Request</div>
              </div>
              <div class="label-id">${escapeHtml(barcodeValue)}</div>
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
            <div class="custom-details">
              <div class="custom-title">Customization Details</div>
              <div><strong>Product:</strong> ${escapeHtml(cust.product_name)} (Qty: ${cust.quantity})</div>
              <div><strong>Color:</strong> ${escapeHtml(cust.selected_color_name)} (${escapeHtml(cust.selected_color_hex)})</div>
              <div><strong>Notes:</strong> ${escapeHtml(cust.customization_notes || 'None')}</div>
            </div>
            <div class="barcode-wrap">${barcodeSvg}</div>
            <div class="meta">
              <span>Request ID: ${escapeHtml(barcodeValue)}</span>
              <span>${new Date(cust.created_at).toLocaleString()}</span>
              <span>PREPAID</span>
            </div>
          </div>
        </body>
      </html>
    `;

    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  };

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
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" /> Webhook Orders & Requests
            </h2>
            <p className="text-xs text-slate-500">Manage standard sales and custom fashion requests from your website.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-full border border-slate-200/60 shadow-inner">
              <button
                onClick={() => setActiveTab('standard')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase transition-all ${
                  activeTab === 'standard'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setActiveTab('customization')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase transition-all ${
                  activeTab === 'customization'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Customizations
              </button>
            </div>
            {isConfigured && (
              <button 
                onClick={loadOrders}
                disabled={loading}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
                title="Fetch live order statuses from website"
              >
                <RefreshCw className={`h-4 w-4 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
                <span>Sync Statuses</span>
              </button>
            )}
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
            <span className="badge bg-blue-100 text-blue-800 px-3 py-1 text-xs font-semibold rounded-full">
              {activeTab === 'standard' ? displayedOrders.length : displayedCustomizations.length} {activeTab === 'standard' ? 'Orders' : 'Customizations'}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <strong>Offline Mode:</strong> {error}. Showing last-synced order cache from local POS storage.
            </div>
          </div>
        )}

        {!isConfigured && !error && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
            <AlertCircle className="h-5 w-5 text-indigo-600 shrink-0" />
            <div className="flex-1">
              <strong>Configuration Notice:</strong> E-commerce API connection is not set up. Please head to settings to configure connection parameters. Displaying local order receipts.
            </div>
          </div>
        )}

        {activeTab === 'customization' ? (
          displayedCustomizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-16 w-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-medium text-slate-900">No customization requests yet</h3>
              <p className="text-slate-500 max-w-md mt-2">
                Custom design requests from your e-commerce platform will appear here when customers make custom orders.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 shadow-soft">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Request ID</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Date</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Customer Details</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Product</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Customization Requirements</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Fulfillment Actions</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedCustomizations.map((cust) => {
                    const displayId = `#CUST-${String(cust.id).padStart(6, '0')}`;
                    return (
                      <tr key={cust.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-4 font-bold text-indigo-950">
                          {displayId}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {new Date(cust.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">{cust.user_name}</div>
                          <div className="text-xs text-slate-500">{cust.user_phone || cust.user_email}</div>
                          {cust.shipping_address && cust.shipping_address !== 'N/A' && (
                            <div className="text-xs text-slate-400 max-w-[200px] truncate mt-1" title={cust.shipping_address}>
                              {cust.shipping_address}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {cust.product_image ? (
                              <img 
                                src={cust.product_image} 
                                alt={cust.product_name} 
                                className="h-10 w-10 rounded-lg object-cover border border-slate-200 shrink-0" 
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 shrink-0 font-bold text-[10px]">
                                N/A
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 text-sm truncate max-w-[180px]" title={cust.product_name}>
                                {cust.product_name}
                              </div>
                              <div className="text-xs text-slate-500">
                                Qty: {cust.quantity} • ₹{parseFloat(cust.product?.price || 0).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {cust.selected_color_name && (
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-semibold text-slate-500">Color:</span>
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                                <span 
                                  className="h-2.5 w-2.5 rounded-full border border-black/10 shrink-0" 
                                  style={{ backgroundColor: cust.selected_color_hex || '#fff' }}
                                />
                                {cust.selected_color_name}
                              </span>
                            </div>
                          )}
                          {cust.customization_notes ? (
                            <div className="text-xs text-slate-700 bg-slate-50 border border-slate-100 p-2 rounded-lg max-w-[220px] whitespace-pre-wrap">
                              {cust.customization_notes}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No notes provided</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2 min-w-[160px] align-right items-stretch">
                            {/* Pending State */}
                            {cust.status === 'Pending' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateCustomizationStatus(cust.id, 'In Progress')}
                                  disabled={updatingId === cust.id}
                                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to reject this customization?")) {
                                      handleUpdateCustomizationStatus(cust.id, 'Rejected');
                                    }
                                  }}
                                  disabled={updatingId === cust.id}
                                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-sm"
                                >
                                  Reject
                                </button>
                              </div>
                            )}

                            {/* In Progress State */}
                            {cust.status === 'In Progress' && (
                              <div className="flex flex-col gap-1.5">
                                <button
                                  onClick={() => handleDispatchCustomOrder(cust.id)}
                                  disabled={updatingId === cust.id}
                                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
                                >
                                  Dispatch Custom Order
                                </button>
                                <button
                                  onClick={() => handleBookCustomDtdcShipping(cust.id)}
                                  disabled={updatingId === cust.id}
                                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                  <Truck className="h-3.5 w-3.5" /> Book DTDC
                                </button>
                              </div>
                            )}

                            {/* Dispatched State */}
                            {cust.status === 'Dispatched' && (
                              <div className="flex flex-col gap-1.5">
                                <button
                                  onClick={() => handleUpdateCustomizationStatus(cust.id, 'Completed')}
                                  disabled={updatingId === cust.id}
                                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                                >
                                  <Check className="h-3.5 w-3.5" /> Confirm Completed
                                </button>
                                {cust.shipping_label_url && (
                                  <button
                                    onClick={() => openLink(cust.shipping_label_url)}
                                    className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm"
                                  >
                                    <Printer className="h-3.5 w-3.5" /> Print DTDC Label
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Print Label Actions */}
                            <button
                              onClick={() => handlePrintLocalCustomLabel(cust)}
                              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                            >
                              <Printer className="h-3.5 w-3.5" /> Local Custom Label
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${
                            cust.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            cust.status === 'Dispatched' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                            cust.status === 'In Progress' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            cust.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {cust.status === 'Completed' && <CheckCircle className="h-3.5 w-3.5" />}
                            {cust.status}
                          </span>
                          {cust.tracking_info && (
                            <div className="text-[10px] text-slate-500 font-medium mt-1 truncate max-w-[120px]" title={cust.tracking_info}>
                              {cust.tracking_info}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          displayedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-16 w-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-medium text-slate-900">No online orders yet</h3>
              <p className="text-slate-500 max-w-md mt-2">
                Orders from your e-commerce platform will appear here automatically when they sync with your store.
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
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Fulfillment Actions</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedOrders.map((order) => {
                    const displayOrderNumber = order.online_order_number 
                      ? `#${String(order.online_order_number).padStart(6, '0')}` 
                      : (order.billNumber ? order.billNumber.replace('EC-CUST-', '#') : `#${order.id}`);

                    return (
                      <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-4 font-bold text-indigo-950">
                          {displayOrderNumber}
                          {order.isLocalFallback && (
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">cached POS receipt</div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {new Date(order.created_at || order.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">{order.customer?.name || 'Online Customer'}</div>
                          <div className="text-xs text-slate-500">{order.customer?.phone || order.customer?.email}</div>
                          {order.customer?.shipping_address && (
                            <div className="text-xs text-slate-400 max-w-[200px] truncate mt-1" title={order.customer.shipping_address}>
                              {order.customer.shipping_address}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-3 my-1">
                            {order.items?.map((item: any) => {
                              const imageUrl = item.product_image || item.productImage;
                              return (
                                <div key={item.id} className="flex items-center gap-3">
                                  {imageUrl ? (
                                    <img 
                                      src={imageUrl} 
                                      alt={item.product_name} 
                                      className="h-10 w-10 rounded-lg object-cover border border-slate-200 shrink-0" 
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 shrink-0 font-bold text-[10px]">
                                      N/A
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-900 text-sm truncate max-w-[180px]" title={item.product_name}>
                                      {item.product_name}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      Qty: {item.quantity} • ₹{item.price}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-900">₹{parseFloat(order.final_amount).toFixed(2)}</div>
                          <div className="mt-1">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                              order.payment_method?.toLowerCase() === 'cod' 
                                ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {order.payment_method || 'ONLINE'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2 min-w-[160px] align-right items-stretch">
                            {/* Accept/Reject for Pending COD */}
                            {order.status === 'Pending' && order.payment_method?.toLowerCase() === 'cod' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateStatus(order.id, 'Accepted')}
                                  disabled={updatingId === order.id}
                                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                                >
                                  <Check className="h-3 w-3" /> Accept
                                </button>
                                <button
                                  onClick={() => handleRejectOrder(order.id)}
                                  disabled={updatingId === order.id}
                                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-sm"
                                >
                                  <X className="h-3 w-3" /> Reject
                                </button>
                              </div>
                            )}

                            {/* Dispatch & DTDC shipment for Accepted or Prepaid Pending */}
                            {(order.status === 'Accepted' || (order.status === 'Pending' && order.payment_method?.toLowerCase() !== 'cod')) && (
                              <div className="flex flex-col gap-1.5">
                                <button
                                  onClick={() => handleDispatchOrder(order.id)}
                                  disabled={updatingId === order.id}
                                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
                                >
                                  Dispatch Order
                                </button>
                                <button
                                  onClick={() => handleBookDtdcShipping(order.id)}
                                  disabled={updatingId === order.id}
                                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                  <Truck className="h-3.5 w-3.5" /> Book DTDC
                                </button>
                              </div>
                            )}

                            {/* Confirm delivery / print labels for Dispatched */}
                            {order.status === 'Dispatched' && (
                              <div className="flex flex-col gap-1.5">
                                <button
                                  onClick={() => handleConfirmDelivery(order.id)}
                                  disabled={updatingId === order.id}
                                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                                >
                                  <Check className="h-3.5 w-3.5" /> Confirm Delivery
                                </button>
                                {order.shipping_label_url && (
                                  <button
                                    onClick={() => openLink(order.shipping_label_url)}
                                    className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                                  >
                                    <Printer className="h-3.5 w-3.5" /> Print DTDC Label
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Returns workflow for Customer Received */}
                            {order.status === 'Customer Received' && order.return_request_status === 'Pending' && (
                              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-2 flex flex-col gap-1.5">
                                <div className="text-[10px] font-bold text-rose-800 uppercase flex items-center gap-1">
                                  <RotateCcw className="h-3 w-3" /> Return Requested
                                </div>
                                <div className="text-[10px] text-slate-600 line-clamp-2" title={order.return_reason}>
                                  Reason: "{order.return_reason}"
                                </div>
                                {order.return_image_url && (
                                  <button
                                    onClick={() => openLink(order.return_image_url)}
                                    className="text-[10px] text-indigo-600 underline block mb-0.5 text-left bg-transparent border-none p-0 cursor-pointer"
                                  >
                                    View Proof Image
                                  </button>
                                )}
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => handleResolveReturn(order.id, 'Approved')}
                                    disabled={updatingId === order.id}
                                    className="flex-1 rounded bg-emerald-600 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleResolveReturn(order.id, 'Rejected')}
                                    disabled={updatingId === order.id}
                                    className="flex-1 rounded bg-rose-600 py-1 text-[10px] font-semibold text-white hover:bg-rose-700"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Standard Local Invoice Label Print */}
                            <button
                              onClick={() => handlePrintLocalLabel(order)}
                              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                            >
                              <Printer className="h-3.5 w-3.5" /> Local Invoice Label
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${
                            order.status === 'Customer Received' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            order.status === 'Dispatched' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                            order.status === 'Accepted' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            order.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            order.status === 'Returned' ? 'bg-red-100 text-red-800 border border-red-200' :
                            'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {order.status === 'Customer Received' && <CheckCircle className="h-3.5 w-3.5" />}
                            {order.status}
                          </span>
                          {order.tracking_info && (
                            <div className="text-[10px] text-slate-500 font-medium mt-1 truncate max-w-[120px]" title={order.tracking_info}>
                              {order.tracking_info}
                            </div>
                          )}
                          {order.return_request_status && order.return_request_status !== 'None' && order.return_request_status !== 'Pending' && (
                            <div className={`text-[10px] font-bold mt-1 uppercase ${
                              order.return_request_status === 'Approved' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              Return {order.return_request_status}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md scale-95 transform rounded-[2rem] border border-white/60 bg-white/95 p-6 shadow-2xl transition-all duration-300">
            <h3 className="text-xl font-bold text-slate-900">{modalTitle}</h3>
            <p className="mt-2 text-xs text-slate-500">
              {modalType?.startsWith('dispatch') 
                ? "Please enter the shipment tracking number or details to dispatch this order."
                : "Please enter the weight of the package in kilograms to book the DTDC shipment."}
            </p>
            <div className="mt-4">
              <input
                type="text"
                value={modalInputValue}
                onChange={(e) => setModalInputValue(e.target.value)}
                placeholder={modalPlaceholder}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none ring-blue-500/20 focus:border-blue-500 focus:ring-4 transition-all"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleModalSubmit();
                  if (e.key === 'Escape') setModalOpen(false);
                }}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleModalSubmit}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineOrders;
