import { useEffect, useRef } from 'react';
import { useDatabase } from './useDatabase';
import { BillItem } from '../types';

export const useECommerceIntegration = () => {
  const db = useDatabase();
  const isSyncingRef = useRef(false);

  const performSync = async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      await db.waitForInit();

      // Read configurations from localStorage
      const settingsRaw = localStorage.getItem('app_settings');
      if (!settingsRaw) {
        isSyncingRef.current = false;
        return;
      }

      const settings = JSON.parse(settingsRaw);
      const apiUrl = (settings.ecommerceApiUrl || '').replace(/\/$/, '');
      const apiKey = settings.ecommerceApiKey || '';

      if (!apiUrl || !apiKey) {
        isSyncingRef.current = false;
        return;
      }

      console.log('Starting E-Commerce Bidirectional Sync...');

      // -------------------------------------------------------------
      // 1. SYNC PRODUCTS (BIDIRECTIONAL)
      // -------------------------------------------------------------
      const localProducts = db.getProducts();
      const productSyncRes = await fetch(`${apiUrl}/billing/sync/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          products: localProducts
        })
      });

      if (productSyncRes.ok) {
        const prodData = await productSyncRes.json();
        const webProducts = prodData.products || [];

        // Update local storage products with details from website
        for (const wp of webProducts) {
          const localProd = localProducts.find(
            lp => (wp.barcode && lp.barcode === wp.barcode) || (wp.sku_code && lp.skuCode === wp.sku_code)
          );

          if (localProd) {
            // Update local product: stock count, price, name, classification code, images
            db.updateProduct(localProd.id, {
              count: wp.stock,
              sellingPrice: wp.price,
              name: wp.name,
              skuCode: wp.sku_code,
              hsnCode: wp.hsc_code,
              images: wp.images || []
            });
          } else {
            // Create product locally since it does not exist
            db.createProduct({
              name: wp.name,
              company: 'N/A',
              productCode: wp.sku_code,
              skuCode: wp.sku_code,
              hsnCode: wp.hsc_code,
              count: wp.stock,
              costPrice: wp.original_price || wp.price,
              sellingPrice: wp.price,
              discount: 0,
              gst: settings.gstPercentage || 18,
              barcode: wp.barcode || `BC-${Date.now()}-${Math.floor(Math.random() * 100)}`,
              finalPrice: wp.price,
              images: wp.images || []
            });
          }
        }
      }

      // -------------------------------------------------------------
      // 2. SYNC POS BILLS TO WEBSITE
      // -------------------------------------------------------------
      const localBills = db.getBills();
      
      // Load synced bill numbers list to prevent resending
      const syncedBillsRaw = localStorage.getItem('synced_bill_numbers');
      const syncedBillNumbers: string[] = syncedBillsRaw ? JSON.parse(syncedBillsRaw) : [];

      const unsyncedBills = localBills.filter(b => !syncedBillNumbers.includes(b.billNumber));

      if (unsyncedBills.length > 0) {
        const billSyncRes = await fetch(`${apiUrl}/billing/sync/bills`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            bills: unsyncedBills
          })
        });

        if (billSyncRes.ok) {
          const resJson = await billSyncRes.json();
          if (resJson.success) {
            // Add all processed bill numbers to synced bills list
            const updatedSynced = [...syncedBillNumbers, ...unsyncedBills.map(b => b.billNumber)];
            localStorage.setItem('synced_bill_numbers', JSON.stringify(updatedSynced));
          }
        }
      }

      // -------------------------------------------------------------
      // 3. PULL WEBSITE ORDERS TO POS
      // -------------------------------------------------------------
      const orderPullRes = await fetch(`${apiUrl}/billing/sync/orders/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey })
      });

      if (orderPullRes.ok) {
        const orderData = await orderPullRes.json();
        const pendingOrders = orderData.orders || [];

        if (pendingOrders.length > 0) {
          console.log(`Fetched ${pendingOrders.length} pending orders from website.`);
          const processedOrderIds: number[] = [];

          const currentProducts = db.getProducts();

          for (const order of pendingOrders) {
            // Find or create customer
            let customerId: number;
            const customers = db.getCustomers();
            const email = order.customer?.email;
            const phone = order.customer?.phone;
            
            const existingCustomer = customers.find(
              c => (phone && c.phone === phone) || (email && c.email === email)
            );

            if (existingCustomer) {
              customerId = existingCustomer.id;
              db.updateCustomer(customerId, {
                type: 'online',
                address: order.customer?.shipping_address
              });
            } else {
              customerId = db.createCustomer({
                name: order.customer?.name || 'Online Customer',
                phone: phone || '',
                email: email,
                address: order.customer?.shipping_address,
                type: 'online'
              });
            }

            // Prepare items and reduce stock locally
            const billItems: BillItem[] = [];
            let totalAmount = 0;

            for (const item of (order.items || [])) {
              // Match product locally on ID or Barcode
              const product = currentProducts.find(
                p => p.id === item.product_id || p.barcode === item.barcode || p.skuCode === item.sku_code
              );

              if (product) {
                const itemTotal = item.price * item.quantity;
                totalAmount += itemTotal;

                billItems.push({
                  id: Date.now() + Math.random(),
                  billId: 0, // will be set by createBill
                  productId: product.id,
                  quantity: item.quantity,
                  unitPrice: item.price,
                  discount: 0,
                  gst: product.gst || settings.gstPercentage || 18,
                  totalPrice: itemTotal,
                  product, // store reference to product for rendering
                  productImage: item.product_image
                });
              }
            }

            // Map payment method to 'cod' or 'online' or other valid POS payment method
            let mappedPaymentMethod: any = 'online';
            if (order.payment_method) {
              const methodLower = order.payment_method.toLowerCase();
              if (['cod', 'cash', 'card', 'upi', 'credit', 'other'].includes(methodLower)) {
                mappedPaymentMethod = methodLower;
              }
            }

            // Create POS Customer Bill for records
            db.createBill({
              id: 0,
              billNumber: `EC-CUST-${order.id}`,
              customerId,
              totalAmount: totalAmount,
              totalDiscount: order.discount_amount || 0,
              totalGst: order.gst_amount || 0,
              finalAmount: order.final_amount,
              paymentMethod: mappedPaymentMethod,
              status: 'completed',
              salesChannel: 'ecommerce',
              invoiceType: 'customer_bill',
              items: billItems,
              createdAt: order.created_at || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });

            processedOrderIds.push(order.id);
          }

          // Report processed orders back to website to mark them as synced
          if (processedOrderIds.length > 0) {
            await fetch(`${apiUrl}/billing/sync/orders/mark-synced`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: apiKey,
                order_ids: processedOrderIds
              })
            });
          }

          const api = (window as any).electronAPI;
          if (api?.showAlert) {
            api.showAlert(`Successfully synced ${pendingOrders.length} orders from website!`, 'Sync Complete');
          }
        }
      }

      // Save sync timing log
      const nowStr = new Date().toLocaleString();
      const updatedSettings = {
        ...settings,
        lastSyncTime: nowStr,
        syncStatus: 'Success'
      };
      localStorage.setItem('app_settings', JSON.stringify(updatedSettings));
      console.log('Bidirectional E-Commerce Sync completed successfully.');

    } catch (e: any) {
      console.error('E-Commerce Sync error:', e);
      try {
        const raw = localStorage.getItem('app_settings');
        if (raw) {
          const settings = JSON.parse(raw);
          localStorage.setItem('app_settings', JSON.stringify({
            ...settings,
            syncStatus: `Failed: ${e.message || String(e)}`
          }));
        }
      } catch {}
    } finally {
      isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    // Run sync on startup
    performSync();

    let timer: any = null;
    let lastSyncTime = Date.now();

    const tick = async () => {
      // Load latest interval from localStorage
      let intervalSeconds = 10;
      try {
        const raw = localStorage.getItem('app_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.ecommerceSyncInterval !== undefined) {
            intervalSeconds = Math.max(5, parseInt(parsed.ecommerceSyncInterval) || 10);
          }
        }
      } catch {}

      const elapsed = (Date.now() - lastSyncTime) / 1000;
      if (elapsed >= intervalSeconds) {
        await performSync();
        lastSyncTime = Date.now();
      }

      timer = setTimeout(tick, 1000); // Check every second
    };

    timer = setTimeout(tick, 1000);

    // Bind custom window event listener for manual triggers from Settings page
    const handleManualSync = async () => {
      await performSync();
      lastSyncTime = Date.now();
    };
    window.addEventListener('trigger-ecommerce-sync', handleManualSync);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('trigger-ecommerce-sync', handleManualSync);
    };
  }, [db]);
};
