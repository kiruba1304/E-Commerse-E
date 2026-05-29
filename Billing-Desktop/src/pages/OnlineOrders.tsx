import React, { useEffect, useMemo, useState } from 'react';
import { useBills, useCustomers } from '../hooks/useDatabase';
import { 
  Globe, Package, CheckCircle, Truck, Printer, Check, X, 
  RefreshCw, RotateCcw, AlertCircle, AlertTriangle 
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

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

const formatDate = (dateInput: any) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

const formatBarcodeText = (val: string) => {
  const clean = val.replace(/\s+/g, '');
  if (/^\d+$/.test(clean)) {
    return clean.replace(/(.{4})/g, '$1 ').trim();
  }
  return val.split('').join(' ');
};

const buildBarcodeSvg = (value: string, labelSize: string, displayValue = false) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const targetWidth = labelSize === '3in' ? 175 : labelSize === 'A4' ? 320 : 240;
  const targetHeight = labelSize === '3in' ? 32 : labelSize === 'A4' ? 54 : 40;

  JsBarcode(svg, value, {
    format: 'CODE128',
    displayValue: displayValue,
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

  const extraHeight = displayValue ? 22 : 0;
  svg.setAttribute('width', String(targetWidth));
  svg.setAttribute('height', String(targetHeight + extraHeight));
  svg.setAttribute('viewBox', `0 0 ${targetWidth} ${targetHeight + extraHeight}`);

  return new XMLSerializer().serializeToString(svg);
};

const getDisplayOrderNumber = (order: any) => {
  if (!order) return '';
  return order.online_order_number 
    ? `#${String(order.online_order_number).padStart(6, '0')}` 
    : (order.billNumber ? order.billNumber.replace('EC-CUST-', '#') : `#${order.id}`);
};

const OnlineOrders: React.FC = () => {
  const { bills } = useBills();
  const { customers } = useCustomers();
  const [labelSize, setLabelSize] = useState(getInitialLabelSize);

  // Web Sync state
  const [webOrders, setWebOrders] = useState<any[]>([]);
  const [webCustomizations, setWebCustomizations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'standard' | 'customization' | 'returns'>('standard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'month' | 'year' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
          handlePrintLocalDtdcLabel(data.order);
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
          handlePrintLocalCustomDtdcLabel(data.customization);
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
    if (isConfigured && !error) {
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

    // Apply Date Filter
    list = list.filter(order => {
      const orderDate = new Date(order.created_at || order.createdAt);
      if (isNaN(orderDate.getTime())) return true;
      
      const now = new Date();
      if (dateFilter === 'today') {
        return orderDate.toDateString() === now.toDateString();
      }
      if (dateFilter === 'month') {
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      }
      if (dateFilter === 'year') {
        return orderDate.getFullYear() === now.getFullYear();
      }
      if (dateFilter === 'custom') {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) {
          start.setHours(0, 0, 0, 0);
          if (orderDate < start) return false;
        }
        if (end) {
          end.setHours(23, 59, 59, 999);
          if (orderDate > end) return false;
        }
      }
      return true;
    });

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
  }, [isConfigured, error, webOrders, onlineOrders, customers, dateFilter, startDate, endDate]);

  // Local printer label routine (reused)
  const handlePrintLocalLabel = async (order: any) => {
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
    const barcodeValue = getDisplayOrderNumber(order).trim();
    const barcodeSvg = buildBarcodeSvg(barcodeValue, labelSize, false);
    const qrCodeDataUrl = await QRCode.toDataURL(barcodeValue, { margin: 1, width: 120 });

    const size = LABEL_DIMENSIONS[labelSize] || LABEL_DIMENSIONS['4x6'];
    const layout = LABEL_LAYOUTS[labelSize] || LABEL_LAYOUTS['4x6'];

    const html = `
      <html>
        <head>
          <title>Shipping Label - ${escapeHtml(barcodeValue)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
            @page { size: ${size.width} ${size.height}; margin: 0; }
            * { box-sizing: border-box; }
            html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; font-family: 'Inter', Arial, sans-serif; background: #fff; color: #000; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 10px; display: flex; align-items: center; justify-content: center; }
            
            .label-container { width: 100%; height: 100%; border: 3px solid #000; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
            
            /* Grid Rows */
            .row { display: flex; width: 100%; border-bottom: 2px solid #000; }
            .row:last-child { border-bottom: none; }
            
            /* Two Column Rows */
            .col-50 { width: 50%; border-right: 2px solid #000; padding: ${layout.padding}; display: flex; flex-direction: column; gap: 2px; justify-content: flex-start; }
            .col-50:last-child { border-right: none; }
            
            /* Header Row */
            .row-header { align-items: stretch; }
            .col-logo { width: 33.333%; border-right: 2px solid #000; padding: ${layout.padding}; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 3px; }
            .logo-icon { width: calc(${layout.headingSize} * 2.2); height: calc(${layout.headingSize} * 2.2); color: #000; }
            .logo-text { font-size: calc(${layout.metaSize} - 1.5px); font-weight: 850; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1; }
            .col-title { width: 66.666%; padding: ${layout.padding}; display: flex; align-items: center; justify-content: center; font-size: calc(${layout.headingSize} + 4px); font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; text-align: center; }
            
            /* Labels & Contents */
            .lbl { font-size: calc(${layout.metaSize} - 1px); font-weight: 800; text-transform: uppercase; color: #000; letter-spacing: 0.03em; margin-bottom: 1px; }
            .val-bold { font-size: ${layout.bodySize}; font-weight: 800; text-transform: uppercase; line-height: ${layout.lineHeight}; }
            .val-text { font-size: calc(${layout.bodySize} - 0.5px); font-weight: 500; line-height: ${layout.lineHeight}; white-space: pre-line; }
            
            /* QR & Order Info Row */
            .col-qr { width: 33.333%; border-right: 2px solid #000; padding: ${layout.padding}; display: flex; align-items: center; justify-content: center; }
            .qr-code { width: calc(${layout.bodySize} * 5.2); height: calc(${layout.bodySize} * 5.2); display: block; max-width: 100%; height: auto; }
            .col-order-info { width: 66.666%; padding: ${layout.padding}; display: flex; flex-direction: column; justify-content: center; gap: 6px; }
            .order-info-item { display: flex; flex-direction: column; }
            
            /* Barcode Row */
            .row-barcode { flex-direction: column; align-items: center; justify-content: center; padding: ${layout.padding}; text-align: center; gap: 4px; border-bottom: 2px solid #000; }
            .barcode-title { font-size: calc(${layout.metaSize} - 1px); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
            .barcode-svg-wrap { width: 100%; display: flex; justify-content: center; padding: 2px 0; }
            .barcode-svg-wrap svg { max-width: 95%; height: auto; display: block; }
            .barcode-text { font-size: calc(${layout.bodySize} + 1px); font-weight: 800; letter-spacing: 0.1em; margin-top: 1px; }
            
            /* Payment & Amount Row */
            .payment-big { font-size: calc(${layout.headingSize} * 1.8); font-weight: 900; text-transform: uppercase; line-height: 1.1; margin-top: 2px; }
            
            /* Footer Row */
            .row-footer { padding: 4px; justify-content: center; align-items: center; text-align: center; font-size: calc(${layout.metaSize} - 1.5px); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: #fafafb; }
          </style>
        </head>
        <body>
          <div class="label-container">
            <!-- Row 1: Header -->
            <div class="row row-header">
              <div class="col-logo">
                <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
                <div class="logo-text">${escapeHtml(storeName)}</div>
              </div>
              <div class="col-title">Shipping Label</div>
            </div>
            
            <!-- Row 2: Sender/Consignee Info -->
            <div class="row">
              <div class="col-50">
                <span class="lbl">From:</span>
                <span class="val-bold">${escapeHtml(storeName)}</span>
                <span class="val-text">${escapeHtml(storeAddress)}</span>
                <span class="val-text" style="font-weight:700; margin-top:2px;">Phone: ${escapeHtml(storePhone)}</span>
              </div>
              <div class="col-50">
                <span class="lbl">To:</span>
                <span class="val-bold">${escapeHtml(customerName)}</span>
                <span class="val-text">${escapeHtml(customerAddress)}</span>
                <span class="val-text" style="font-weight:700; margin-top:2px;">Phone: ${escapeHtml(customerPhone)}</span>
              </div>
            </div>
            
            <!-- Row 3: Carrier Details -->
            <div class="row">
              <div class="col-50">
                <span class="lbl">Shipping Partner:</span>
                <span class="val-bold">Local POS Delivery</span>
              </div>
              <div class="col-50">
                <span class="lbl">Shipping Date:</span>
                <span class="val-bold">${formatDate(new Date())}</span>
              </div>
            </div>
            
            <!-- Row 4: QR & Order Details -->
            <div class="row">
              <div class="col-qr">
                <img class="qr-code" src="${qrCodeDataUrl}" alt="QR" />
              </div>
              <div class="col-order-info">
                <div class="order-info-item">
                  <span class="lbl">Order Date:</span>
                  <span class="val-bold">${formatDate(order.created_at || order.createdAt)}</span>
                </div>
                <div class="order-info-item">
                  <span class="lbl">Order ID:</span>
                  <span class="val-bold">${escapeHtml(barcodeValue)}</span>
                </div>
              </div>
            </div>
            
            <!-- Row 5: Barcode & Tracking -->
            <div class="row-barcode">
              <span class="barcode-title">Local Invoice Barcode:</span>
              <div class="barcode-svg-wrap">${barcodeSvg}</div>
              <div class="barcode-text">${formatBarcodeText(barcodeValue)}</div>
            </div>
            
            <!-- Row 6: Payment Info -->
            <div class="row">
              <div class="col-50">
                <span class="lbl">Payment Type:</span>
                <span class="payment-big">${escapeHtml(paymentType)}</span>
              </div>
              <div class="col-50">
                <span class="lbl">${paymentType === 'COD' ? 'COD Amount:' : 'Prepaid Amount:'}</span>
                <span class="payment-big">₹${parseFloat(order.final_amount).toFixed(2)}</span>
              </div>
            </div>
            
            <!-- Row 7: Footer -->
            <div class="row-footer">
              LOCAL OUTLET DELIVERY / SERVICE: STANDARD
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

  const handlePrintLocalDtdcLabel = async (order: any) => {
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
    const rawTracking = order.tracking_info || '';
    const awbNumber = rawTracking.includes('AWB:') ? rawTracking.split('AWB:')[1]?.trim() : rawTracking;
    const barcodeValue = awbNumber || `D${String(order.id).padStart(8, '0')}`;
    const barcodeSvg = buildBarcodeSvg(barcodeValue, labelSize, false);
    const qrCodeDataUrl = await QRCode.toDataURL(barcodeValue, { margin: 1, width: 120 });

    const size = LABEL_DIMENSIONS[labelSize] || LABEL_DIMENSIONS['4x6'];
    const layout = LABEL_LAYOUTS[labelSize] || LABEL_LAYOUTS['4x6'];

    const html = `
      <html>
        <head>
          <title>DTDC Shipping Label - ${escapeHtml(barcodeValue)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
            @page { size: ${size.width} ${size.height}; margin: 0; }
            * { box-sizing: border-box; }
            html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; font-family: 'Inter', Arial, sans-serif; background: #fff; color: #000; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 10px; display: flex; align-items: center; justify-content: center; }
            
            .label-container { width: 100%; height: 100%; border: 3px solid #000; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
            
            /* Grid Rows */
            .row { display: flex; width: 100%; border-bottom: 2px solid #000; }
            .row:last-child { border-bottom: none; }
            
            /* Two Column Rows */
            .col-50 { width: 50%; border-right: 2px solid #000; padding: ${layout.padding}; display: flex; flex-direction: column; gap: 2px; justify-content: flex-start; }
            .col-50:last-child { border-right: none; }
            
            /* Header Row */
            .row-header { align-items: stretch; }
            .col-logo { width: 33.333%; border-right: 2px solid #000; padding: ${layout.padding}; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 3px; }
            .logo-icon { width: calc(${layout.headingSize} * 2.2); height: calc(${layout.headingSize} * 2.2); color: #000; }
            .logo-text { font-size: calc(${layout.metaSize} - 1.5px); font-weight: 850; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1; }
            .col-title { width: 66.666%; padding: ${layout.padding}; display: flex; align-items: center; justify-content: center; font-size: calc(${layout.headingSize} + 4px); font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; text-align: center; }
            
            /* Labels & Contents */
            .lbl { font-size: calc(${layout.metaSize} - 1px); font-weight: 800; text-transform: uppercase; color: #000; letter-spacing: 0.03em; margin-bottom: 1px; }
            .val-bold { font-size: ${layout.bodySize}; font-weight: 800; text-transform: uppercase; line-height: ${layout.lineHeight}; }
            .val-text { font-size: calc(${layout.bodySize} - 0.5px); font-weight: 500; line-height: ${layout.lineHeight}; white-space: pre-line; }
            
            /* QR & Order Info Row */
            .col-qr { width: 33.333%; border-right: 2px solid #000; padding: ${layout.padding}; display: flex; align-items: center; justify-content: center; }
            .qr-code { width: calc(${layout.bodySize} * 5.2); height: calc(${layout.bodySize} * 5.2); display: block; max-width: 100%; height: auto; }
            .col-order-info { width: 66.666%; padding: ${layout.padding}; display: flex; flex-direction: column; justify-content: center; gap: 6px; }
            .order-info-item { display: flex; flex-direction: column; }
            
            /* Barcode Row */
            .row-barcode { flex-direction: column; align-items: center; justify-content: center; padding: ${layout.padding}; text-align: center; gap: 4px; border-bottom: 2px solid #000; }
            .barcode-title { font-size: calc(${layout.metaSize} - 1px); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
            .barcode-svg-wrap { width: 100%; display: flex; justify-content: center; padding: 2px 0; }
            .barcode-svg-wrap svg { max-width: 95%; height: auto; display: block; }
            .barcode-text { font-size: calc(${layout.bodySize} + 1px); font-weight: 800; letter-spacing: 0.1em; margin-top: 1px; }
            
            /* Payment & Amount Row */
            .payment-big { font-size: calc(${layout.headingSize} * 1.8); font-weight: 900; text-transform: uppercase; line-height: 1.1; margin-top: 2px; }
            
            /* Footer Row */
            .row-footer { padding: 4px; justify-content: center; align-items: center; text-align: center; font-size: calc(${layout.metaSize} - 1.5px); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: #fafafb; }
          </style>
        </head>
        <body>
          <div class="label-container">
            <!-- Row 1: Header -->
            <div class="row row-header">
              <div class="col-logo">
                <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 2L11 13"></path>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                <div class="logo-text">DTDC Express</div>
              </div>
              <div class="col-title">Shipping Label</div>
            </div>
            
            <!-- Row 2: Sender/Consignee Info -->
            <div class="row">
              <div class="col-50">
                <span class="lbl">From:</span>
                <span class="val-bold">${escapeHtml(storeName)}</span>
                <span class="val-text">${escapeHtml(storeAddress)}</span>
                <span class="val-text" style="font-weight:700; margin-top:2px;">Phone: ${escapeHtml(storePhone)}</span>
              </div>
              <div class="col-50">
                <span class="lbl">To:</span>
                <span class="val-bold">${escapeHtml(customerName)}</span>
                <span class="val-text">${escapeHtml(customerAddress)}</span>
                <span class="val-text" style="font-weight:700; margin-top:2px;">Phone: ${escapeHtml(customerPhone)}</span>
              </div>
            </div>
            
            <!-- Row 3: Carrier Details -->
            <div class="row">
              <div class="col-50">
                <span class="lbl">Shipping Partner:</span>
                <span class="val-bold">DTDC Express</span>
              </div>
              <div class="col-50">
                <span class="lbl">Shipping Date:</span>
                <span class="val-bold">${formatDate(new Date())}</span>
              </div>
            </div>
            
            <!-- Row 4: QR & Order Details -->
            <div class="row">
              <div class="col-qr">
                <img class="qr-code" src="${qrCodeDataUrl}" alt="QR" />
              </div>
              <div class="col-order-info">
                <div class="order-info-item">
                  <span class="lbl">Order Date:</span>
                  <span class="val-bold">${formatDate(order.created_at || order.createdAt)}</span>
                </div>
                <div class="order-info-item">
                  <span class="lbl">Order ID:</span>
                  <span class="val-bold">${escapeHtml(getDisplayOrderNumber(order))}</span>
                </div>
              </div>
            </div>
            
            <!-- Row 5: Barcode & Tracking -->
            <div class="row-barcode">
              <span class="barcode-title">Shipping Tracking Number:</span>
              <div class="barcode-svg-wrap">${barcodeSvg}</div>
              <div class="barcode-text">${formatBarcodeText(barcodeValue)}</div>
            </div>
            
            <!-- Row 6: Payment Info -->
            <div class="row">
              <div class="col-50">
                <span class="lbl">Payment Type:</span>
                <span class="payment-big">${escapeHtml(paymentType)}</span>
              </div>
              <div class="col-50">
                <span class="lbl">${paymentType === 'COD' ? 'COD Amount:' : 'Prepaid Amount:'}</span>
                <span class="payment-big">₹${parseFloat(order.final_amount).toFixed(2)}</span>
              </div>
            </div>
            
            <!-- Row 7: Footer -->
            <div class="row-footer">
              DTDC COURIER CARRIER / SERVICE: EXPRESS RESIDENTIAL
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

  const handlePrintLocalCustomDtdcLabel = async (cust: any) => {
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

    const paymentType = 'Prepaid';
    const rawTracking = cust.tracking_info || '';
    const awbNumber = rawTracking.includes('AWB:') ? rawTracking.split('AWB:')[1]?.trim() : rawTracking;
    const barcodeValue = awbNumber || `CUST-D${String(cust.id).padStart(6, '0')}`;
    const barcodeSvg = buildBarcodeSvg(barcodeValue, labelSize, false);
    const qrCodeDataUrl = await QRCode.toDataURL(barcodeValue, { margin: 1, width: 120 });

    const size = LABEL_DIMENSIONS[labelSize] || LABEL_DIMENSIONS['4x6'];
    const layout = LABEL_LAYOUTS[labelSize] || LABEL_LAYOUTS['4x6'];

    const prodPrice = cust.product?.price || 0.0;
    const finalAmount = prodPrice * cust.quantity;

    const html = `
      <html>
        <head>
          <title>DTDC Custom Shipping Label - ${escapeHtml(barcodeValue)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
            @page { size: ${size.width} ${size.height}; margin: 0; }
            * { box-sizing: border-box; }
            html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; font-family: 'Inter', Arial, sans-serif; background: #fff; color: #000; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 10px; display: flex; align-items: center; justify-content: center; }
            
            .label-container { width: 100%; height: 100%; border: 3px solid #000; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
            
            /* Grid Rows */
            .row { display: flex; width: 100%; border-bottom: 2px solid #000; }
            .row:last-child { border-bottom: none; }
            
            /* Two Column Rows */
            .col-50 { width: 50%; border-right: 2px solid #000; padding: ${layout.padding}; display: flex; flex-direction: column; gap: 2px; justify-content: flex-start; }
            .col-50:last-child { border-right: none; }
            
            /* Header Row */
            .row-header { align-items: stretch; }
            .col-logo { width: 33.333%; border-right: 2px solid #000; padding: ${layout.padding}; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 3px; }
            .logo-icon { width: calc(${layout.headingSize} * 2.2); height: calc(${layout.headingSize} * 2.2); color: #000; }
            .logo-text { font-size: calc(${layout.metaSize} - 1.5px); font-weight: 850; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1; }
            .col-title { width: 66.666%; padding: ${layout.padding}; display: flex; align-items: center; justify-content: center; font-size: calc(${layout.headingSize} + 4px); font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; text-align: center; }
            
            /* Labels & Contents */
            .lbl { font-size: calc(${layout.metaSize} - 1px); font-weight: 800; text-transform: uppercase; color: #000; letter-spacing: 0.03em; margin-bottom: 1px; }
            .val-bold { font-size: ${layout.bodySize}; font-weight: 800; text-transform: uppercase; line-height: ${layout.lineHeight}; }
            .val-text { font-size: calc(${layout.bodySize} - 0.5px); font-weight: 500; line-height: ${layout.lineHeight}; white-space: pre-line; }
            
            /* QR & Order Info Row */
            .col-qr { width: 33.333%; border-right: 2px solid #000; padding: ${layout.padding}; display: flex; align-items: center; justify-content: center; }
            .qr-code { width: calc(${layout.bodySize} * 5.2); height: calc(${layout.bodySize} * 5.2); display: block; max-width: 100%; height: auto; }
            .col-order-info { width: 66.666%; padding: ${layout.padding}; display: flex; flex-direction: column; justify-content: center; gap: 6px; }
            .order-info-item { display: flex; flex-direction: column; }
            
            /* Barcode Row */
            .row-barcode { flex-direction: column; align-items: center; justify-content: center; padding: ${layout.padding}; text-align: center; gap: 4px; border-bottom: 2px solid #000; }
            .barcode-title { font-size: calc(${layout.metaSize} - 1px); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
            .barcode-svg-wrap { width: 100%; display: flex; justify-content: center; padding: 2px 0; }
            .barcode-svg-wrap svg { max-width: 95%; height: auto; display: block; }
            .barcode-text { font-size: calc(${layout.bodySize} + 1px); font-weight: 800; letter-spacing: 0.1em; margin-top: 1px; }
            
            /* Payment & Amount Row */
            .payment-big { font-size: calc(${layout.headingSize} * 1.8); font-weight: 900; text-transform: uppercase; line-height: 1.1; margin-top: 2px; }
            
            /* Footer Row */
            .row-footer { padding: 4px; justify-content: center; align-items: center; text-align: center; font-size: calc(${layout.metaSize} - 1.5px); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: #fafafb; }
          </style>
        </head>
        <body>
          <div class="label-container">
            <!-- Row 1: Header -->
            <div class="row row-header">
              <div class="col-logo">
                <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 2L11 13"></path>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                <div class="logo-text">DTDC Custom</div>
              </div>
              <div class="col-title">Shipping Label</div>
            </div>
            
            <!-- Row 2: Sender/Consignee Info -->
            <div class="row">
              <div class="col-50">
                <span class="lbl">From:</span>
                <span class="val-bold">${escapeHtml(storeName)}</span>
                <span class="val-text">${escapeHtml(storeAddress)}</span>
                <span class="val-text" style="font-weight:700; margin-top:2px;">Phone: ${escapeHtml(storePhone)}</span>
              </div>
              <div class="col-50">
                <span class="lbl">To:</span>
                <span class="val-bold">${escapeHtml(customerName)}</span>
                <span class="val-text">${escapeHtml(customerAddress)}</span>
                <span class="val-text" style="font-weight:700; margin-top:2px;">Phone: ${escapeHtml(customerPhone)}</span>
              </div>
            </div>
            
            <!-- Row 3: Carrier Details -->
            <div class="row">
              <div class="col-50">
                <span class="lbl">Shipping Partner:</span>
                <span class="val-bold">DTDC Express</span>
              </div>
              <div class="col-50">
                <span class="lbl">Shipping Date:</span>
                <span class="val-bold">${formatDate(new Date())}</span>
              </div>
            </div>
            
            <!-- Row 4: QR & Custom Order Info -->
            <div class="row">
              <div class="col-qr">
                <img class="qr-code" src="${qrCodeDataUrl}" alt="QR" />
              </div>
              <div class="col-order-info">
                <div class="order-info-item">
                  <span class="lbl">Order Date:</span>
                  <span class="val-bold">${formatDate(cust.created_at || cust.createdAt)}</span>
                </div>
                <div class="order-info-item">
                  <span class="lbl">Order ID:</span>
                  <span class="val-bold">#CUST-${String(cust.id).padStart(6, '0')}</span>
                </div>
                <div class="order-info-item" style="border-top: 1px dashed #ccc; padding-top: 4px; margin-top: 2px;">
                  <span class="lbl">Specs:</span>
                  <span class="val-text" style="font-size: 8px;"><strong>${escapeHtml(cust.product_name)}</strong> (Qty: ${cust.quantity})<br/>Color: ${escapeHtml(cust.selected_color_name)}<br/>Notes: ${escapeHtml(cust.customization_notes || 'None')}</span>
                </div>
              </div>
            </div>
            
            <!-- Row 5: Barcode & Tracking -->
            <div class="row-barcode">
              <span class="barcode-title">Shipping Tracking Number:</span>
              <div class="barcode-svg-wrap">${barcodeSvg}</div>
              <div class="barcode-text">${formatBarcodeText(barcodeValue)}</div>
            </div>
            
            <!-- Row 6: Payment Info -->
            <div class="row">
              <div class="col-50">
                <span class="lbl">Payment Type:</span>
                <span class="payment-big">${escapeHtml(paymentType)}</span>
              </div>
              <div class="col-50">
                <span class="lbl">Prepaid Amount:</span>
                <span class="payment-big">₹${parseFloat(finalAmount.toString()).toFixed(2)}</span>
              </div>
            </div>
            
            <!-- Row 7: Footer -->
            <div class="row-footer">
              DTDC CUSTOM COURIER / SERVICE: SPECIAL HANDCRAFTED
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

    let list = [...webCustomizations];

    // Apply Date Filter
    list = list.filter(cust => {
      const custDate = new Date(cust.created_at || cust.createdAt);
      if (isNaN(custDate.getTime())) return true;
      
      const now = new Date();
      if (dateFilter === 'today') {
        return custDate.toDateString() === now.toDateString();
      }
      if (dateFilter === 'month') {
        return custDate.getMonth() === now.getMonth() && custDate.getFullYear() === now.getFullYear();
      }
      if (dateFilter === 'year') {
        return custDate.getFullYear() === now.getFullYear();
      }
      if (dateFilter === 'custom') {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) {
          start.setHours(0, 0, 0, 0);
          if (custDate < start) return false;
        }
        if (end) {
          end.setHours(23, 59, 59, 999);
          if (custDate > end) return false;
        }
      }
      return true;
    });

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
  }, [webCustomizations, dateFilter, startDate, endDate]);

  const displayedReturns = useMemo(() => {
    return displayedOrders.filter(order => order.return_request_status === 'Pending');
  }, [displayedOrders]);

  const handlePrintLocalCustomLabel = async (cust: any) => {
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

    const paymentType = 'Prepaid';
    const barcodeValue = `CUST-${String(cust.id).padStart(6, '0')}`;
    const barcodeSvg = buildBarcodeSvg(barcodeValue, labelSize, false);
    const qrCodeDataUrl = await QRCode.toDataURL(barcodeValue, { margin: 1, width: 120 });

    const size = LABEL_DIMENSIONS[labelSize] || LABEL_DIMENSIONS['4x6'];
    const layout = LABEL_LAYOUTS[labelSize] || LABEL_LAYOUTS['4x6'];

    const prodPrice = cust.product?.price || 0.0;
    const finalAmount = prodPrice * cust.quantity;

    const html = `
      <html>
        <head>
          <title>Custom Label - ${escapeHtml(barcodeValue)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
            @page { size: ${size.width} ${size.height}; margin: 0; }
            * { box-sizing: border-box; }
            html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; font-family: 'Inter', Arial, sans-serif; background: #fff; color: #000; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 10px; display: flex; align-items: center; justify-content: center; }
            
            .label-container { width: 100%; height: 100%; border: 3px solid #000; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
            
            /* Grid Rows */
            .row { display: flex; width: 100%; border-bottom: 2px solid #000; }
            .row:last-child { border-bottom: none; }
            
            /* Two Column Rows */
            .col-50 { width: 50%; border-right: 2px solid #000; padding: ${layout.padding}; display: flex; flex-direction: column; gap: 2px; justify-content: flex-start; }
            .col-50:last-child { border-right: none; }
            
            /* Header Row */
            .row-header { align-items: stretch; }
            .col-logo { width: 33.333%; border-right: 2px solid #000; padding: ${layout.padding}; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 3px; }
            .logo-icon { width: calc(${layout.headingSize} * 2.2); height: calc(${layout.headingSize} * 2.2); color: #000; }
            .logo-text { font-size: calc(${layout.metaSize} - 1.5px); font-weight: 850; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1; }
            .col-title { width: 66.666%; padding: ${layout.padding}; display: flex; align-items: center; justify-content: center; font-size: calc(${layout.headingSize} + 4px); font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; text-align: center; }
            
            /* Labels & Contents */
            .lbl { font-size: calc(${layout.metaSize} - 1px); font-weight: 800; text-transform: uppercase; color: #000; letter-spacing: 0.03em; margin-bottom: 1px; }
            .val-bold { font-size: ${layout.bodySize}; font-weight: 800; text-transform: uppercase; line-height: ${layout.lineHeight}; }
            .val-text { font-size: calc(${layout.bodySize} - 0.5px); font-weight: 500; line-height: ${layout.lineHeight}; white-space: pre-line; }
            
            /* QR & Order Info Row */
            .col-qr { width: 33.333%; border-right: 2px solid #000; padding: ${layout.padding}; display: flex; align-items: center; justify-content: center; }
            .qr-code { width: calc(${layout.bodySize} * 5.2); height: calc(${layout.bodySize} * 5.2); display: block; max-width: 100%; height: auto; }
            .col-order-info { width: 66.666%; padding: ${layout.padding}; display: flex; flex-direction: column; justify-content: center; gap: 6px; }
            .order-info-item { display: flex; flex-direction: column; }
            
            /* Barcode Row */
            .row-barcode { flex-direction: column; align-items: center; justify-content: center; padding: ${layout.padding}; text-align: center; gap: 4px; border-bottom: 2px solid #000; }
            .barcode-title { font-size: calc(${layout.metaSize} - 1px); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
            .barcode-svg-wrap { width: 100%; display: flex; justify-content: center; padding: 2px 0; }
            .barcode-svg-wrap svg { max-width: 95%; height: auto; display: block; }
            .barcode-text { font-size: calc(${layout.bodySize} + 1px); font-weight: 800; letter-spacing: 0.1em; margin-top: 1px; }
            
            /* Payment & Amount Row */
            .payment-big { font-size: calc(${layout.headingSize} * 1.8); font-weight: 900; text-transform: uppercase; line-height: 1.1; margin-top: 2px; }
            
            /* Footer Row */
            .row-footer { padding: 4px; justify-content: center; align-items: center; text-align: center; font-size: calc(${layout.metaSize} - 1.5px); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: #fafafb; }
          </style>
        </head>
        <body>
          <div class="label-container">
            <!-- Row 1: Header -->
            <div class="row row-header">
              <div class="col-logo">
                <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
                <div class="logo-text">${escapeHtml(storeName)}</div>
              </div>
              <div class="col-title">Shipping Label</div>
            </div>
            
            <!-- Row 2: Sender/Consignee Info -->
            <div class="row">
              <div class="col-50">
                <span class="lbl">From:</span>
                <span class="val-bold">${escapeHtml(storeName)}</span>
                <span class="val-text">${escapeHtml(storeAddress)}</span>
                <span class="val-text" style="font-weight:700; margin-top:2px;">Phone: ${escapeHtml(storePhone)}</span>
              </div>
              <div class="col-50">
                <span class="lbl">To:</span>
                <span class="val-bold">${escapeHtml(customerName)}</span>
                <span class="val-text">${escapeHtml(customerAddress)}</span>
                <span class="val-text" style="font-weight:700; margin-top:2px;">Phone: ${escapeHtml(customerPhone)}</span>
              </div>
            </div>
            
            <!-- Row 3: Carrier Details -->
            <div class="row">
              <div class="col-50">
                <span class="lbl">Shipping Partner:</span>
                <span class="val-bold">Local POS Delivery</span>
              </div>
              <div class="col-50">
                <span class="lbl">Shipping Date:</span>
                <span class="val-bold">${formatDate(new Date())}</span>
              </div>
            </div>
            
            <!-- Row 4: QR & Custom Order Info -->
            <div class="row">
              <div class="col-qr">
                <img class="qr-code" src="${qrCodeDataUrl}" alt="QR" />
              </div>
              <div class="col-order-info">
                <div class="order-info-item">
                  <span class="lbl">Order Date:</span>
                  <span class="val-bold">${formatDate(cust.created_at || cust.createdAt)}</span>
                </div>
                <div class="order-info-item">
                  <span class="lbl">Order ID:</span>
                  <span class="val-bold">#CUST-${String(cust.id).padStart(6, '0')}</span>
                </div>
                <div class="order-info-item" style="border-top: 1px dashed #ccc; padding-top: 4px; margin-top: 2px;">
                  <span class="lbl">Specs:</span>
                  <span class="val-text" style="font-size: 8px;"><strong>${escapeHtml(cust.product_name)}</strong> (Qty: ${cust.quantity})<br/>Color: ${escapeHtml(cust.selected_color_name)}<br/>Notes: ${escapeHtml(cust.customization_notes || 'None')}</span>
                </div>
              </div>
            </div>
            
            <!-- Row 5: Barcode & Tracking -->
            <div class="row-barcode">
              <span class="barcode-title">Local Custom Request Barcode:</span>
              <div class="barcode-svg-wrap">${barcodeSvg}</div>
              <div class="barcode-text">${formatBarcodeText(barcodeValue)}</div>
            </div>
            
            <!-- Row 6: Payment Info -->
            <div class="row">
              <div class="col-50">
                <span class="lbl">Payment Type:</span>
                <span class="payment-big">${escapeHtml(paymentType)}</span>
              </div>
              <div class="col-50">
                <span class="lbl">Prepaid Amount:</span>
                <span class="val-big">₹${parseFloat(finalAmount.toString()).toFixed(2)}</span>
              </div>
            </div>
            
            <!-- Row 7: Footer -->
            <div class="row-footer">
              LOCAL CUSTOM WORKSHOP / SERVICE: OUTLET PICKUP
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
              <button
                onClick={() => setActiveTab('returns')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase transition-all ${
                  activeTab === 'returns'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Returns
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
              {activeTab === 'standard' ? displayedOrders.length : activeTab === 'customization' ? displayedCustomizations.length : displayedReturns.length} {activeTab === 'standard' ? 'Orders' : activeTab === 'customization' ? 'Customizations' : 'Returns'}
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

        {/* Date Filter Toolbar */}
        <div className="mb-6 p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Filter By Date:</span>
            {[
              { value: 'all', label: 'All Orders' },
              { value: 'today', label: 'Today' },
              { value: 'month', label: 'This Month' },
              { value: 'year', label: 'This Year' },
              { value: 'custom', label: 'Custom Range' }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setDateFilter(opt.value as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dateFilter === opt.value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none shadow-sm"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none shadow-sm"
              />
            </div>
          )}
        </div>

        {activeTab === 'customization' && (
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
                                    onClick={() => handlePrintLocalCustomDtdcLabel(cust)}
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
        )}

        {activeTab === 'standard' && (
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
                    const displayOrderNumber = getDisplayOrderNumber(order);

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
                                    onClick={() => handlePrintLocalDtdcLabel(order)}
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

        {activeTab === 'returns' && (
          displayedReturns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-16 w-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-medium text-slate-900">No return requests found</h3>
              <p className="text-slate-500 max-w-md mt-2">
                All customer return requests from your website will appear here for you to approve or reject.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 shadow-soft">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Order ID</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Date</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Buyer</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Returned Products</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Return Reason</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Proof Image</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Refund Value</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedReturns.map((order) => {
                    const displayOrderNumber = getDisplayOrderNumber(order);

                    return (
                      <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-4 font-bold text-indigo-950">
                          {displayOrderNumber}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {new Date(order.created_at || order.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">{order.customer?.name || 'Online Customer'}</div>
                          <div className="text-xs text-slate-500">{order.customer?.phone || order.customer?.email}</div>
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
                        <td className="px-4 py-4 text-xs">
                          {order.return_reason ? (
                            <div className="text-xs text-slate-700 bg-slate-50 border border-slate-100 p-2 rounded-lg max-w-[220px] whitespace-pre-wrap">
                              {order.return_reason}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No reason provided</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {order.return_image_url ? (
                            <div className="flex flex-col gap-1.5 items-start">
                              <img 
                                src={order.return_image_url} 
                                alt="Proof" 
                                className="h-10 w-10 rounded-lg object-cover border border-slate-200 hover:scale-105 transition-transform cursor-pointer shadow-sm" 
                                onClick={() => openLink(order.return_image_url)}
                                title="Click to view full image"
                              />
                              <button
                                onClick={() => openLink(order.return_image_url)}
                                className="text-[10px] text-indigo-600 hover:underline bg-transparent border-none p-0 cursor-pointer text-left font-semibold"
                              >
                                View Proof
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No Image</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-900">₹{parseFloat(order.final_amount).toFixed(2)}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1.5 min-w-[120px] align-right items-stretch">
                            <button
                              onClick={() => handleResolveReturn(order.id, 'Approved')}
                              disabled={updatingId === order.id}
                              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                              <Check className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleResolveReturn(order.id, 'Rejected')}
                              disabled={updatingId === order.id}
                              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-sm"
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </button>
                          </div>
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
