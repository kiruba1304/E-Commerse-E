import { useEffect } from 'react';
import { useDatabase } from './useDatabase';
import { BillItem } from '../types';

export const useECommerceIntegration = () => {
  const db = useDatabase();

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api || !api.onWebhookOrder) return;

    api.onWebhookOrder(async (orderData: any) => {
      console.log('Received E-commerce Webhook:', orderData);
      
      try {
        await db.waitForInit(); // ensure DB is ready
        
        // 1. Process Customer (Online Categorization)
        let customerId: number;
        const customers = db.getCustomers();
        const existingCustomer = customers.find(c => c.phone === orderData.customer?.phone || c.email === orderData.customer?.email);
        
        if (existingCustomer) {
          customerId = existingCustomer.id;
          db.updateCustomer(customerId, { 
            type: 'online', 
            address: orderData.customer?.shipping_address 
          });
        } else {
          customerId = db.createCustomer({
            name: orderData.customer?.name || 'Online Customer',
            phone: orderData.customer?.phone || '',
            email: orderData.customer?.email,
            address: orderData.customer?.shipping_address,
            type: 'online'
          });
        }

        // 2. Reserve Stock and Prepare Items
        const products = db.getProducts();
        const billItems: BillItem[] = [];
        let totalAmount = 0;

        for (const item of (orderData.items || [])) {
          const product = products.find(p => p.barcode === item.sku || p.id === item.productId);
          if (product) {
            // Update reserved stock
            const currentReserved = product.reservedStock || 0;
            db.updateProduct(product.id, {
              reservedStock: currentReserved + (item.quantity || 1)
            });

            const itemTotal = (item.price || product.sellingPrice) * (item.quantity || 1);
            totalAmount += itemTotal;

            billItems.push({
              id: Date.now() + Math.random(),
              billId: 0, // Will be set by db.createBill
              productId: product.id,
              quantity: item.quantity || 1,
              unitPrice: item.price || product.sellingPrice,
              discount: 0,
              gst: product.gst || 0,
              totalPrice: itemTotal
            });
          }
        }

        // 3. Generate Multi-Tier Invoices
        const shipping = Number(orderData.shipping || 0);
        const commission = Number(orderData.commission || 0);
        const orderId = orderData.orderId || Math.floor(Math.random() * 1000000);

        // Bill A: Customer Facing Invoice (Includes Shipping)
        db.createBill({
          id: 0,
          billNumber: `EC-CUST-${orderId}`,
          customerId,
          totalAmount: totalAmount + shipping,
          totalDiscount: 0,
          totalGst: 0,
          finalAmount: totalAmount + shipping,
          paymentMethod: 'online',
          status: 'completed',
          salesChannel: 'ecommerce',
          invoiceType: 'customer_bill',
          items: billItems,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        // Bill B: Seller/Marketplace Bill (Deducts Commission)
        db.createBill({
          id: 0,
          billNumber: `EC-SELL-${orderId}`,
          customerId, // Keeping customer reference
          totalAmount: totalAmount,
          totalDiscount: commission, // Treat commission as discount on seller payout
          totalGst: 0,
          finalAmount: totalAmount - commission,
          paymentMethod: 'online',
          status: 'completed',
          salesChannel: 'ecommerce',
          invoiceType: 'seller_bill',
          items: billItems,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        // Show success alert
        api.showAlert(`New E-commerce order #${orderId} received and processed!`, 'Order Synced');
      } catch (err) {
        console.error('Error processing E-commerce order:', err);
      }
    });
  }, [db]);

  // ==============================================================================
  // METHOD 2: POLLING (THE "PULL" METHOD) - NO THIRD-PARTY APPS REQUIRED
  // ==============================================================================
  // Since the POS is a local desktop app, it cannot easily receive incoming traffic
  // from the public internet without port-forwarding or tools like Ngrok.
  // The industry-standard way to solve this natively is "Polling".
  // The POS actively reaches out to your website every X minutes to fetch new orders.
  useEffect(() => {
    const ENABLE_POLLING = true; // Set to true to enable this method
    if (!ENABLE_POLLING) return;

    const ECOMMERCE_API_URL = 'https://yourwebsite.com/api/pending-orders'; // Your website's API endpoint
    const API_KEY = 'your_secret_api_key';

    const fetchNewOrders = async () => {
      try {
        await db.waitForInit();
        // 1. Ask the website for new orders
        const response = await fetch(ECOMMERCE_API_URL, {
          headers: { 'Authorization': `Bearer ${API_KEY}` }
        });

        if (!response.ok) return;

        const newOrders = await response.json();
        
        if (newOrders && newOrders.length > 0) {
          console.log(`Fetched ${newOrders.length} new orders from E-Commerce site.`);
          
          for (const _ of newOrders) {
            // Process the order here using the exact same logic as the Webhook method above
            // (Create customer, reserve stock, generate bills)
            // ...
          }

          // 2. Tell the website the orders were successfully synced so it doesn't send them again
          const syncedIds = newOrders.map((o: any) => o.orderId);
          await fetch('https://yourwebsite.com/api/mark-orders-synced', {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ syncedIds })
          });
          
          const api = (window as any).electronAPI;
          if (api) api.showAlert(`Synced ${newOrders.length} orders from website!`, 'Sync Complete');
        }
      } catch (err) {
        console.error('Failed to poll e-commerce orders:', err);
      }
    };

    // Run once on startup, then every 5 minutes (300000 ms)
    fetchNewOrders();
    const interval = setInterval(fetchNewOrders, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [db]);
};
