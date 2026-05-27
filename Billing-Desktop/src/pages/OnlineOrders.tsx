import React, { useMemo } from 'react';
import { useBills, useCustomers } from '../hooks/useDatabase';
import { Globe, Package, CheckCircle } from 'lucide-react';

const OnlineOrders: React.FC = () => {
  const { bills } = useBills();
  const { customers } = useCustomers();

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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" /> Recent Webhook Orders
          </h2>
          <span className="badge bg-blue-100 text-blue-800 px-3 py-1 text-xs font-semibold rounded-full">{onlineOrders.length} Orders</span>
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
