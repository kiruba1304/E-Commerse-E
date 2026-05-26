export interface Product {
  id: number;
  name: string;
  company: string;
  productCode?: string; // optional for backward-compatibility
  count: number;
  costPrice: number;
  sellingPrice: number;
  discount: number;
  gst: number;
  barcode: string;
  finalPrice: number;
  reservedStock?: number; // Stock reserved for online orders
  hsnCode?: string;
  skuCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: number;
  name: string;
  type?: 'walk-in' | 'online'; // Added for E-commerce integration
  phone: string;
  email?: string;
  address?: string;
  totalPurchases?: number; // Total amount spent
  purchaseCount?: number; // Number of purchases
  lastPurchaseDate?: string; // Last purchase date
  lastPurchaseAmount?: number; // Last purchase amount
  creditBalance?: number; // Credit balance for the customer
  creditHistory?: CreditTransaction[]; // Transaction history for credit
  createdAt: string;
  updatedAt: string;
}

export interface CreditTransaction {
  id: number;
  customerId: number;
  amount: number; // Positive for credit added, negative for credit used
  type: 'added' | 'used' | 'adjusted';
  description?: string;
  billId?: number;
  createdAt: string;
}

export type PartyType = 'supplier' | 'customer' | 'branch' | 'distributor' | 'other';

export interface Party {
  id: number;
  name: string;
  type: PartyType;
  phone?: string;
  email?: string;
  address?: string;
  openingBalance: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PartyMovementType = 'purchase' | 'sale_return' | 'transfer_in' | 'transfer_out' | 'return_in' | 'return_out' | 'adjustment';

export interface PartyStockMovement {
  id: number;
  partyId: number;
  productId: number;
  quantity: number;
  amount?: number;
  movementType: PartyMovementType;
  referenceNo?: string;
  notes?: string;
  createdAt: string;
}

export interface PartyPayment {
  id: number;
  partyId: number;
  amount: number;
  method: 'cash' | 'bank' | 'upi' | 'adjustment' | 'other';
  referenceNo?: string;
  notes?: string;
  createdAt: string;
}

export interface BillItem {
  id: number;
  billId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  gst: number;
  totalPrice: number;
  product?: Product;
}

export interface Bill {
  id: number;
  customerId?: number;
  billNumber: string;
  totalAmount: number;
  totalDiscount: number;
  totalGst: number;
  finalAmount: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'credit' | 'other' | 'online';
  status: 'pending' | 'completed' | 'cancelled';
  salesChannel?: 'pos' | 'ecommerce'; // Source of the bill
  invoiceType?: 'customer_bill' | 'seller_bill'; // Type of invoice
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  items?: BillItem[];
  previousBalance?: number;
  currentlyPaid?: number;
  totalOutstanding?: number;
  netBalance?: number;
}

export interface InventoryTransaction {
  id: number;
  productId: number;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  billId?: number;
  createdAt: string;
}

export interface SalesReport {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  totalSales: number;
  totalProfit: number;
  totalBills: number;
  topProducts: Array<{
    productId: number;
    productName: string;
    quantitySold: number;
    revenue: number;
  }>;
}
