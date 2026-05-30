import { useState, useEffect } from 'react';
import { Product, Category, Customer, Bill, InventoryTransaction, Party, PartyStockMovement, PartyMovementType, PartyPayment } from '../types';

// Check if we're in Electron environment (for future use)
// const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;

// Browser-compatible mock database using localStorage with Electron File System Persistence
class BrowserDatabase {
  private userDataPath: string | null = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (this.isInitialized) return;

    // Check if Electron
    const api = (window as any).electronAPI;
    if (api?.getUserDataPath) {
      try {
        this.userDataPath = await api.getUserDataPath();
        const data = await api.loadJson('database_backup.json', this.userDataPath);

        if (data) {
          const parsed = JSON.parse(data);
          // Restore to localStorage if valid data found
          Object.keys(parsed).forEach(key => {
            if (key.startsWith('billing_app_')) {
              // Only overwrite if localStorage is empty or we want to enforce file data
              // For safety against data loss (empty localStorage), we restore.
              if (!localStorage.getItem(key)) {
                localStorage.setItem(key, parsed[key]);
              } else {
                // Even if localStorage exists, we might want to sync? 
                // For now, let's assume file is backup. If localStorage is present, we assume it's current.
                // But the user issue is "update deletes data", implying localStorage is gone.
                // So the above check `!localStorage.getItem` works perfectly for restoration.
              }
            }
          });

          // Force overwrite check: compare timestamps? valid check? 
          // Simplest for "safety": If file has data and localStorage has data, we assume localStorage is newer UNLESS localStorage was wiped.
          // If the user lost data, localStorage is empty.
        }
      } catch (e) {
        console.error('Failed to initialize persistent storage:', e);
      }
    }
    this.isInitialized = true;
  }

  private async saveToDisk() {
    if (!this.userDataPath) return; // Not in Electron or not initialized
    const api = (window as any).electronAPI;
    if (!api?.saveJson) return;

    // Gather all relevant data
    const exportData: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('billing_app_')) {
        exportData[key] = localStorage.getItem(key) || '';
      }
    }

    try {
      await api.saveJson('database_backup.json', JSON.stringify(exportData), this.userDataPath);
    } catch (e) {
      console.error('Failed to save to disk:', e);
    }
  }

  private getStorageKey(table: string): string {
    return `billing_app_${table}`;
  }

  private getNextId(table: string): number {
    const key = `billing_app_${table}_next_id`;
    const nextId = parseInt(localStorage.getItem(key) || '1', 10);
    localStorage.setItem(key, (nextId + 1).toString());
    return nextId;
  }

  getProducts(): Product[] {
    const data = localStorage.getItem(this.getStorageKey('products'));
    const raw: any[] = data ? JSON.parse(data) : [];
    // Normalize and coerce types to ensure consistency
    return raw.map((p, idx) => {
      const id = Number(p.id ?? (idx + 1));
      const count = Number(p.count ?? 0);
      const costPrice = Number(p.costPrice ?? 0);
      const sellingPrice = Number(p.sellingPrice ?? 0);
      const discount = Number(p.discount ?? 0);
      const gst = Number(p.gst ?? 0);
      const finalPrice = Number(p.finalPrice ?? sellingPrice * (1 - discount / 100) * (1 + gst / 100));
      const name = String(p.name ?? '');
      const company = String(p.company ?? '');
      const skuCode = p.skuCode ? String(p.skuCode) : (p.productCode ? String(p.productCode) : '');
      const productCode = skuCode; // keep productCode identical to skuCode
      const hsnCode = p.hsnCode ? String(p.hsnCode) : (p.hsc_code ? String(p.hsc_code) : '');
      const barcode = String(p.barcode ?? '');
      const createdAt = String(p.createdAt ?? new Date().toISOString());
      const updatedAt = String(p.updatedAt ?? createdAt);
      const images = Array.isArray(p.images) ? p.images : [];
      const categoryName = p.categoryName ? String(p.categoryName) : '';
      const prod: Product = { id, name, company, productCode, count, costPrice, sellingPrice, discount, gst, finalPrice, barcode, createdAt, updatedAt, skuCode, hsnCode, images, categoryName };
      return prod;
    });
  }

  createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): number {
    const products = this.getProducts();
    const id = this.getNextId('products');
    const now = new Date().toISOString();

    const newProduct: Product = {
      id,
      ...productData,
      createdAt: now,
      updatedAt: now,
    };

    products.push(newProduct);
    localStorage.setItem(this.getStorageKey('products'), JSON.stringify(products));
    this.saveToDisk();
    return id;
  }

  updateProduct(id: number, productData: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): boolean {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === id);

    if (index !== -1) {
      products[index] = {
        ...products[index],
        ...productData,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(this.getStorageKey('products'), JSON.stringify(products));
      this.saveToDisk();
      return true;
    }
    return false;
  }

  deleteProduct(id: number): boolean {
    const products = this.getProducts();
    const initialLength = products.length;
    const filtered = products.filter(p => p.id !== id);
    localStorage.setItem(this.getStorageKey('products'), JSON.stringify(filtered));
    this.saveToDisk();
    return filtered.length < initialLength;
  }

  getCategories(): Category[] {
    const data = localStorage.getItem(this.getStorageKey('categories'));
    const raw: any[] = data ? JSON.parse(data) : [];
    return raw.map((c, idx) => {
      const id = Number(c.id ?? (idx + 1));
      const name = String(c.name ?? '');
      const description = String(c.description ?? '');
      const customizationEnabled = Boolean(c.customizationEnabled ?? false);
      const returnWindowDays = c.returnWindowDays !== undefined && c.returnWindowDays !== null ? Number(c.returnWindowDays) : undefined;
      const createdAt = String(c.createdAt ?? new Date().toISOString());
      const updatedAt = String(c.updatedAt ?? createdAt);
      return { id, name, description, customizationEnabled, returnWindowDays, createdAt, updatedAt };
    });
  }

  createCategory(categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): number {
    const categories = this.getCategories();
    const existing = categories.find(c => c.name.toLowerCase() === categoryData.name.toLowerCase());
    if (existing) {
      return existing.id;
    }
    const id = this.getNextId('categories');
    const now = new Date().toISOString();

    const newCategory: Category = {
      id,
      ...categoryData,
      createdAt: now,
      updatedAt: now,
    };

    categories.push(newCategory);
    localStorage.setItem(this.getStorageKey('categories'), JSON.stringify(categories));
    this.saveToDisk();
    return id;
  }

  updateCategory(id: number, categoryData: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>): boolean {
    const categories = this.getCategories();
    const index = categories.findIndex(c => c.id === id);

    if (index !== -1) {
      categories[index] = {
        ...categories[index],
        ...categoryData,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(this.getStorageKey('categories'), JSON.stringify(categories));
      this.saveToDisk();
      return true;
    }
    return false;
  }

  deleteCategory(id: number): boolean {
    const categories = this.getCategories();
    const initialLength = categories.length;
    const filtered = categories.filter(c => c.id !== id);
    localStorage.setItem(this.getStorageKey('categories'), JSON.stringify(filtered));
    this.saveToDisk();
    return filtered.length < initialLength;
  }

  getProductByBarcode(barcode: string): Product | null {
    const products = this.getProducts();
    const key = String(barcode || '').trim();
    return products.find(p => String(p.barcode || '').trim() === key) || null;
  }

  getCustomers(): Customer[] {
    const data = localStorage.getItem(this.getStorageKey('customers'));
    return data ? JSON.parse(data) : [];
  }

  getParties(): Party[] {
    const data = localStorage.getItem(this.getStorageKey('parties'));
    return data ? JSON.parse(data) : [];
  }

  createParty(partyData: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>): number {
    const parties = this.getParties();
    const id = this.getNextId('parties');
    const now = new Date().toISOString();

    const newParty: Party = {
      id,
      ...partyData,
      createdAt: now,
      updatedAt: now,
    };

    parties.push(newParty);
    localStorage.setItem(this.getStorageKey('parties'), JSON.stringify(parties));
    this.saveToDisk();
    return id;
  }

  updateParty(id: number, updates: Partial<Omit<Party, 'id' | 'createdAt'>>): boolean {
    const parties = this.getParties();
    const index = parties.findIndex(p => p.id === id);
    if (index === -1) return false;

    parties[index] = {
      ...parties[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(this.getStorageKey('parties'), JSON.stringify(parties));
    this.saveToDisk();
    return true;
  }

  deleteParty(id: number): boolean {
    const parties = this.getParties();
    const filtered = parties.filter(p => p.id !== id);
    localStorage.setItem(this.getStorageKey('parties'), JSON.stringify(filtered));

    const movements = this.getPartyMovements().filter(m => m.partyId !== id);
    localStorage.setItem(this.getStorageKey('party_movements'), JSON.stringify(movements));
    this.saveToDisk();
    return filtered.length < parties.length;
  }

  getPartyMovements(): PartyStockMovement[] {
    const data = localStorage.getItem(this.getStorageKey('party_movements'));
    return data ? JSON.parse(data) : [];
  }

  getPartyPayments(): PartyPayment[] {
    const data = localStorage.getItem(this.getStorageKey('party_payments'));
    return data ? JSON.parse(data) : [];
  }

  createPartyMovement(movementData: Omit<PartyStockMovement, 'id' | 'createdAt'>): number {
    const parties = this.getParties();
    const products = this.getProducts();
    const movements = this.getPartyMovements();
    const id = this.getNextId('party_movements');
    const now = new Date().toISOString();

    const movement: PartyStockMovement = {
      id,
      ...movementData,
      createdAt: now,
    };

    const productIndex = products.findIndex(product => product.id === movement.productId);
    if (productIndex === -1) {
      throw new Error(`Product not found (ID ${movement.productId})`);
    }

    const partyExists = parties.some(party => party.id === movement.partyId);
    if (!partyExists) {
      throw new Error(`Party not found (ID ${movement.partyId})`);
    }

    const stockChangeMap: Record<PartyMovementType, number> = {
      purchase: 1,
      sale_return: 1,
      transfer_in: 1,
      return_in: 1,
      adjustment: 1,
      transfer_out: -1,
      return_out: -1,
    };

    const stockDelta = movement.quantity * stockChangeMap[movement.movementType];
    const nextCount = Math.max(0, products[productIndex].count + stockDelta);
    products[productIndex] = {
      ...products[productIndex],
      count: nextCount,
      updatedAt: now,
    };

    movements.push(movement);
    localStorage.setItem(this.getStorageKey('products'), JSON.stringify(products));
    localStorage.setItem(this.getStorageKey('party_movements'), JSON.stringify(movements));
    this.saveToDisk();
    return id;
  }

  createPartyPayment(paymentData: Omit<PartyPayment, 'id' | 'createdAt'>): number {
    const parties = this.getParties();
    const payments = this.getPartyPayments();
    const id = this.getNextId('party_payments');
    const now = new Date().toISOString();

    if (!parties.some(party => party.id === paymentData.partyId)) {
      throw new Error(`Party not found (ID ${paymentData.partyId})`);
    }

    const payment: PartyPayment = {
      id,
      ...paymentData,
      amount: Number(paymentData.amount) || 0,
      createdAt: now,
    };

    payments.push(payment);
    localStorage.setItem(this.getStorageKey('party_payments'), JSON.stringify(payments));
    this.saveToDisk();
    return id;
  }

  createCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): number {
    const customers = this.getCustomers();
    const id = this.getNextId('customers');
    const now = new Date().toISOString();

    const newCustomer: Customer = {
      id,
      ...customerData,
      createdAt: now,
      updatedAt: now,
    };

    customers.push(newCustomer);
    localStorage.setItem(this.getStorageKey('customers'), JSON.stringify(customers));
    this.saveToDisk();
    return id;
  }

  deleteCustomer(id: number): boolean {
    const customers = this.getCustomers();
    const initial = customers.length;
    const filtered = customers.filter(c => c.id !== id);
    localStorage.setItem(this.getStorageKey('customers'), JSON.stringify(filtered));
    this.saveToDisk();
    return filtered.length < initial;
  }

  updateCustomer(id: number, updates: Partial<Omit<Customer, 'id' | 'createdAt'>>): boolean {
    const customers = this.getCustomers();
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) return false;

    const now = new Date().toISOString();
    customers[index] = {
      ...customers[index],
      ...updates,
      updatedAt: now,
    };

    localStorage.setItem(this.getStorageKey('customers'), JSON.stringify(customers));
    this.saveToDisk();
    return true;
  }

  getTransactions(): InventoryTransaction[] {
    const data = localStorage.getItem(this.getStorageKey('transactions'));
    return data ? JSON.parse(data) : [];
  }

  // Bills persistence (embedded items in the bill)
  getBills(): Bill[] {
    const data = localStorage.getItem(this.getStorageKey('bills'));
    return data ? JSON.parse(data) : [];
  }

  createBill(newBill: Bill): number {
    // Reduce stock based on items and record inventory transactions
    const products = this.getProducts();
    const transactions = this.getTransactions();
    const nowIso = new Date().toISOString();

    for (const item of newBill.items || []) {
      const pIndex = products.findIndex(p => p.id === item.productId);
      if (pIndex === -1) {
        throw new Error(`Product not found (ID ${item.productId})`);
      }
      
      // Only reduce physical stock for customer_bills or standard pos bills
      // Skip for seller_bills to prevent double deduction
      if (newBill.invoiceType !== 'seller_bill') {
        const available = products[pIndex].count;
        if (newBill.salesChannel !== 'ecommerce' && available < item.quantity) {
          throw new Error(`Insufficient stock for ${products[pIndex].name}. In stock: ${available}, requested: ${item.quantity}`);
        }
        products[pIndex] = {
          ...products[pIndex],
          count: Math.max(0, available - item.quantity),
          updatedAt: nowIso,
        };

        // Record transaction (stock out)
        const tr: InventoryTransaction = {
          id: this.getNextId('transactions'),
          productId: item.productId,
          type: 'out',
          quantity: item.quantity,
          reason: newBill.salesChannel === 'ecommerce' ? 'e-commerce sale' : 'sale',
          billId: newBill.id,
          createdAt: nowIso,
        };
        transactions.push(tr);
      }
    }

    // Save updated products and transactions
    localStorage.setItem(this.getStorageKey('products'), JSON.stringify(products));
    localStorage.setItem(this.getStorageKey('transactions'), JSON.stringify(transactions));

    // Persist bill
    const bills = this.getBills();
    bills.push(newBill);
    localStorage.setItem(this.getStorageKey('bills'), JSON.stringify(bills));
    this.saveToDisk();
    return newBill.id;
  }

  getBillsByCustomer(customerId: number): Bill[] {
    return this.getBills().filter(b => b.customerId === customerId);
  }

  updateBill(billNumber: string, updates: Partial<Omit<Bill, 'id' | 'createdAt'>>): boolean {
    const bills = this.getBills();
    const index = bills.findIndex(b => b.billNumber === billNumber);
    if (index === -1) return false;

    bills[index] = {
      ...bills[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(this.getStorageKey('bills'), JSON.stringify(bills));
    this.saveToDisk();
    return true;
  }

  generateSqlDump(): string {
    let sql = '';

    // Products
    sql += '-- Table: Products\n';
    sql += 'CREATE TABLE IF NOT EXISTS Products (id INTEGER PRIMARY KEY, name TEXT, company TEXT, productCode TEXT, count INTEGER, costPrice REAL, sellingPrice REAL, discount REAL, gst REAL, finalPrice REAL, barcode TEXT, createdAt TEXT, updatedAt TEXT, hsnCode TEXT, skuCode TEXT, categoryName TEXT);\n';
    const products = this.getProducts();
    products.forEach(p => {
      sql += `INSERT INTO Products VALUES (${p.id}, '${p.name.replace(/'/g, "''")}', '${p.company.replace(/'/g, "''")}', '${(p.productCode || '').replace(/'/g, "''")}', ${p.count}, ${p.costPrice}, ${p.sellingPrice}, ${p.discount}, ${p.gst}, ${p.finalPrice}, '${(p.barcode || '').replace(/'/g, "''")}', '${p.createdAt}', '${p.updatedAt}', '${(p.hsnCode || '').replace(/'/g, "''")}', '${(p.skuCode || '').replace(/'/g, "''")}', '${(p.categoryName || '').replace(/'/g, "''")}');\n`;
    });
    sql += '\n';

    // Categories
    sql += '-- Table: Categories\n';
    sql += 'CREATE TABLE IF NOT EXISTS Categories (id INTEGER PRIMARY KEY, name TEXT, description TEXT, customizationEnabled INTEGER, returnWindowDays INTEGER, createdAt TEXT, updatedAt TEXT);\n';
    const categories = this.getCategories();
    categories.forEach(c => {
      sql += `INSERT INTO Categories VALUES (${c.id}, '${c.name.replace(/'/g, "''")}', '${(c.description || '').replace(/'/g, "''")}', ${c.customizationEnabled ? 1 : 0}, ${c.returnWindowDays !== undefined && c.returnWindowDays !== null ? c.returnWindowDays : 'NULL'}, '${c.createdAt}', '${c.updatedAt}');\n`;
    });
    sql += '\n';

    // Customers
    sql += '-- Table: Customers\n';
    sql += 'CREATE TABLE IF NOT EXISTS Customers (id INTEGER PRIMARY KEY, name TEXT, phone TEXT, email TEXT, address TEXT, creditBalance REAL, creditHistory TEXT, createdAt TEXT, updatedAt TEXT, gstNumber TEXT);\n';
    const customers = this.getCustomers();
    customers.forEach(c => {
      sql += `INSERT INTO Customers VALUES (${c.id}, '${c.name.replace(/'/g, "''")}', '${c.phone.replace(/'/g, "''")}', '${(c.email || '').replace(/'/g, "''")}', '${(c.address || '').replace(/'/g, "''")}', ${c.creditBalance || 0}, '${JSON.stringify(c.creditHistory || []).replace(/'/g, "''")}', '${c.createdAt}', '${c.updatedAt}', '${(c.gstNumber || '').replace(/'/g, "''")}');\n`;
    });
    sql += '\n';

    // Parties
    sql += '-- Table: Parties\n';
    sql += 'CREATE TABLE IF NOT EXISTS Parties (id INTEGER PRIMARY KEY, name TEXT, type TEXT, phone TEXT, email TEXT, address TEXT, openingBalance REAL, notes TEXT, createdAt TEXT, updatedAt TEXT);\n';
    const parties = this.getParties();
    parties.forEach(p => {
      sql += `INSERT INTO Parties VALUES (${p.id}, '${p.name.replace(/'/g, "''")}', '${p.type}', '${(p.phone || '').replace(/'/g, "''")}', '${(p.email || '').replace(/'/g, "''")}', '${(p.address || '').replace(/'/g, "''")}', ${p.openingBalance || 0}, '${(p.notes || '').replace(/'/g, "''")}', '${p.createdAt}', '${p.updatedAt}');\n`;
    });
    sql += '\n';

    // Party Movements
    sql += '-- Table: PartyMovements\n';
    sql += 'CREATE TABLE IF NOT EXISTS PartyMovements (id INTEGER PRIMARY KEY, partyId INTEGER, productId INTEGER, quantity INTEGER, amount REAL, movementType TEXT, referenceNo TEXT, notes TEXT, createdAt TEXT);\n';
    const movements = this.getPartyMovements();
    movements.forEach(m => {
      sql += `INSERT INTO PartyMovements VALUES (${m.id}, ${m.partyId}, ${m.productId}, ${m.quantity}, ${m.amount || 0}, '${m.movementType}', '${(m.referenceNo || '').replace(/'/g, "''")}', '${(m.notes || '').replace(/'/g, "''")}', '${m.createdAt}');\n`;
    });
    sql += '\n';

    // Party Payments
    sql += '-- Table: PartyPayments\n';
    sql += 'CREATE TABLE IF NOT EXISTS PartyPayments (id INTEGER PRIMARY KEY, partyId INTEGER, amount REAL, method TEXT, referenceNo TEXT, notes TEXT, createdAt TEXT);\n';
    const payments = this.getPartyPayments();
    payments.forEach(p => {
      sql += `INSERT INTO PartyPayments VALUES (${p.id}, ${p.partyId}, ${p.amount || 0}, '${p.method}', '${(p.referenceNo || '').replace(/'/g, "''")}', '${(p.notes || '').replace(/'/g, "''")}', '${p.createdAt}');\n`;
    });
    sql += '\n';

    // Bills
    sql += '-- Table: Bills\n';
    sql += 'CREATE TABLE IF NOT EXISTS Bills (id INTEGER PRIMARY KEY, billNumber TEXT, customerId INTEGER, totalAmount REAL, totalDiscount REAL, totalGst REAL, finalAmount REAL, paymentMethod TEXT, status TEXT, createdAt TEXT, updatedAt TEXT);\n';

    // Bill Items
    sql += '-- Table: BillItems\n';
    sql += 'CREATE TABLE IF NOT EXISTS BillItems (id INTEGER PRIMARY KEY, billId INTEGER, productId INTEGER, quantity INTEGER, unitPrice REAL, discount REAL, gst REAL, totalPrice REAL);\n';

    const bills = this.getBills();
    bills.forEach(b => {
      sql += `INSERT INTO Bills VALUES (${b.id}, '${b.billNumber.replace(/'/g, "''")}', ${b.customerId || 'NULL'}, ${b.totalAmount || 0}, ${b.totalDiscount || 0}, ${b.totalGst || 0}, ${b.finalAmount || 0}, '${b.paymentMethod}', '${b.status}', '${b.createdAt}', '${b.updatedAt}');\n`;

      if (b.items) {
        b.items.forEach(item => {
          sql += `INSERT INTO BillItems VALUES (${item.id}, ${b.id}, ${item.productId}, ${item.quantity}, ${item.unitPrice}, ${item.discount}, ${item.gst}, ${item.totalPrice});\n`;
        });
      }
    });
    sql += '\n';

    // Inventory Transactions
    sql += '-- Table: InventoryTransactions\n';
    sql += 'CREATE TABLE IF NOT EXISTS InventoryTransactions (id INTEGER PRIMARY KEY, productId INTEGER, type TEXT, quantity INTEGER, reason TEXT, billId INTEGER, createdAt TEXT);\n';
    const transactions = this.getTransactions();
    transactions.forEach(t => {
      sql += `INSERT INTO InventoryTransactions VALUES (${t.id}, ${t.productId}, '${t.type}', ${t.quantity}, '${t.reason.replace(/'/g, "''")}', ${t.billId || 'NULL'}, '${t.createdAt}');\n`;
    });

    return sql;
  }

  importSqlDump(sql: string): boolean {
    if (!sql || typeof sql !== 'string') return false;

    // Parsed entities arrays
    const products: Product[] = [];
    const categories: Category[] = [];
    const customers: Customer[] = [];
    const parties: Party[] = [];
    const movements: PartyStockMovement[] = [];
    const payments: PartyPayment[] = [];
    const bills: Bill[] = [];
    const billItems: any[] = [];
    const transactions: InventoryTransaction[] = [];

    // Custom SQL values parser
    const parseSqlValues = (valuesStr: string): any[] => {
      const result: any[] = [];
      let current = '';
      let inString = false;
      for (let i = 0; i < valuesStr.length; i++) {
        const char = valuesStr[i];
        const nextChar = valuesStr[i + 1];
        if (inString) {
          if (char === "'" && nextChar === "'") {
            current += "'"; // escaped quote
            i++; // skip next quote
          } else if (char === "'") {
            inString = false; // end of string
          } else {
            current += char;
          }
        } else {
          if (char === "'") {
            inString = true;
          } else if (char === ',') {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
      }
      result.push(current.trim());
      
      return result.map(val => {
        if (!val || val.toUpperCase() === 'NULL' || val === '') return null;
        if (val.startsWith("'") && val.endsWith("'")) {
          return val.slice(1, -1).replace(/''/g, "'");
        }
        if (!isNaN(val as any) && val !== '') {
          return Number(val);
        }
        return val;
      });
    };

    // Split SQL by semicolons/newlines to find lines
    const lines = sql.split('\n');
    let hasData = false;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('INSERT INTO')) return;

      const match = trimmed.match(/INSERT INTO\s+(\w+)\s+VALUES\s*\((.*)\)\s*;?/i);
      if (!match) return;

      hasData = true;
      const tableName = match[1];
      const valuesStr = match[2];
      const row = parseSqlValues(valuesStr);

      switch (tableName.toLowerCase()) {
        case 'products':
          products.push({
            id: Number(row[0]),
            name: String(row[1]),
            company: String(row[2]),
            productCode: row[3] ? String(row[3]) : undefined,
            count: Number(row[4] ?? 0),
            costPrice: Number(row[5] ?? 0),
            sellingPrice: Number(row[6] ?? 0),
            discount: Number(row[7] ?? 0),
            gst: Number(row[8] ?? 0),
            finalPrice: Number(row[9] ?? 0),
            barcode: String(row[10] ?? ''),
            createdAt: String(row[11] ?? new Date().toISOString()),
            updatedAt: String(row[12] ?? new Date().toISOString()),
            hsnCode: row[13] ? String(row[13]) : '',
            skuCode: row[14] ? String(row[14]) : '',
            categoryName: row[15] ? String(row[15]) : '',
          });
          break;

        case 'categories':
          categories.push({
            id: Number(row[0]),
            name: String(row[1]),
            description: row[2] ? String(row[2]) : '',
            customizationEnabled: Number(row[3]) === 1,
            returnWindowDays: row[4] !== null ? Number(row[4]) : undefined,
            createdAt: String(row[5] ?? new Date().toISOString()),
            updatedAt: String(row[6] ?? new Date().toISOString()),
          });
          break;

        case 'customers':
          customers.push({
            id: Number(row[0]),
            name: String(row[1]),
            phone: String(row[2]),
            email: row[3] ? String(row[3]) : undefined,
            address: row[4] ? String(row[4]) : undefined,
            creditBalance: row[5] ? Number(row[5]) : 0,
            creditHistory: row[6] ? JSON.parse(String(row[6])) : [],
            createdAt: String(row[7] ?? new Date().toISOString()),
            updatedAt: String(row[8] ?? new Date().toISOString()),
            gstNumber: row[9] ? String(row[9]) : undefined,
          });
          break;

        case 'parties':
          parties.push({
            id: Number(row[0]),
            name: String(row[1]),
            type: String(row[2]) as any,
            phone: row[3] ? String(row[3]) : undefined,
            email: row[4] ? String(row[4]) : undefined,
            address: row[5] ? String(row[5]) : undefined,
            openingBalance: row[6] ? Number(row[6]) : 0,
            notes: row[7] ? String(row[7]) : undefined,
            createdAt: String(row[8] ?? new Date().toISOString()),
            updatedAt: String(row[9] ?? new Date().toISOString()),
          });
          break;

        case 'partymovements':
          movements.push({
            id: Number(row[0]),
            partyId: Number(row[1]),
            productId: Number(row[2]),
            quantity: Number(row[3]),
            amount: row[4] ? Number(row[4]) : 0,
            movementType: String(row[5]) as any,
            referenceNo: row[6] ? String(row[6]) : undefined,
            notes: row[7] ? String(row[7]) : undefined,
            createdAt: String(row[8] ?? new Date().toISOString()),
          });
          break;

        case 'partypayments':
          payments.push({
            id: Number(row[0]),
            partyId: Number(row[1]),
            amount: Number(row[2]),
            method: String(row[3]) as any,
            referenceNo: row[4] ? String(row[4]) : undefined,
            notes: row[5] ? String(row[5]) : undefined,
            createdAt: String(row[6] ?? new Date().toISOString()),
          });
          break;

        case 'bills':
          bills.push({
            id: Number(row[0]),
            billNumber: String(row[1]),
            customerId: row[2] ? Number(row[2]) : undefined,
            totalAmount: Number(row[3]),
            totalDiscount: Number(row[4]),
            totalGst: Number(row[5]),
            finalAmount: Number(row[6]),
            paymentMethod: String(row[7]) as any,
            status: String(row[8]) as any,
            createdAt: String(row[9] ?? new Date().toISOString()),
            updatedAt: String(row[10] ?? new Date().toISOString()),
            items: [],
          });
          break;

        case 'billitems':
          billItems.push({
            id: Number(row[0]),
            billId: Number(row[1]),
            productId: Number(row[2]),
            quantity: Number(row[3]),
            unitPrice: Number(row[4]),
            discount: Number(row[5]),
            gst: Number(row[6]),
            totalPrice: Number(row[7]),
          });
          break;

        case 'inventorytransactions':
          transactions.push({
            id: Number(row[0]),
            productId: Number(row[1]),
            type: String(row[2]) as any,
            quantity: Number(row[3]),
            reason: String(row[4]),
            billId: row[5] ? Number(row[5]) : undefined,
            createdAt: String(row[6] ?? new Date().toISOString()),
          });
          break;
      }
    });

    if (!hasData) return false;

    // Connect bill items back into bills
    billItems.forEach(item => {
      const parentBill = bills.find(b => b.id === item.billId);
      if (parentBill) {
        parentBill.items = parentBill.items || [];
        parentBill.items.push(item);
      }
    });

    // Write all data cleanly to localStorage, overwriting old keys
    localStorage.setItem(this.getStorageKey('products'), JSON.stringify(products));
    localStorage.setItem(this.getStorageKey('categories'), JSON.stringify(categories));
    localStorage.setItem(this.getStorageKey('customers'), JSON.stringify(customers));
    localStorage.setItem(this.getStorageKey('parties'), JSON.stringify(parties));
    localStorage.setItem(this.getStorageKey('party_movements'), JSON.stringify(movements));
    localStorage.setItem(this.getStorageKey('party_payments'), JSON.stringify(payments));
    localStorage.setItem(this.getStorageKey('bills'), JSON.stringify(bills));
    localStorage.setItem(this.getStorageKey('transactions'), JSON.stringify(transactions));

    // Reset next ID sequences to prevent clashing
    const setNextId = (table: string, list: { id: number }[]) => {
      const maxId = Math.max(...list.map(item => item.id), 0);
      localStorage.setItem(`billing_app_${table}_next_id`, (maxId + 1).toString());
    };

    setNextId('products', products);
    setNextId('categories', categories);
    setNextId('customers', customers);
    setNextId('parties', parties);
    setNextId('party_movements', movements);
    setNextId('party_payments', payments);
    setNextId('bills', bills);
    setNextId('transactions', transactions);

    // Save to disk backup
    this.saveToDisk();

    return true;
  }

  public async waitForInit(): Promise<void> {
    if (this.isInitialized) return;
    // Simple polling or promise resolution
    return new Promise(resolve => {
      const check = () => {
        if (this.isInitialized) resolve();
        else setTimeout(check, 50);
      }
      check();
    });
  }
}

// Global database instance
const browserDb = new BrowserDatabase();

export const useDatabase = () => {
  return browserDb;
};

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const db = useDatabase();

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      await db.waitForInit();
      const productList = db.getProducts();
      setProducts(productList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = db.createProduct(productData);
      await loadProducts(); // Reload products
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add product');
      throw err;
    }
  };

  const updateProduct = async (id: number, productData: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>) => {
    try {
      const success = db.updateProduct(id, productData);
      if (success) {
        await loadProducts(); // Reload products
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
      throw err;
    }
  };

  const deleteProduct = async (id: number) => {
    try {
      const success = db.deleteProduct(id);
      if (success) {
        await loadProducts(); // Reload products
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
      throw err;
    }
  };

  const getProductByBarcode = (barcode: string): Product | null => {
    return db.getProductByBarcode(barcode);
  };

  useEffect(() => {
    loadProducts();
    const handleSync = () => {
      loadProducts();
    };
    window.addEventListener('ecommerce-sync-completed', handleSync);
    return () => {
      window.removeEventListener('ecommerce-sync-completed', handleSync);
    };
  }, []);

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductByBarcode,
    refreshProducts: loadProducts,
  };
};

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const db = useDatabase();

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      await db.waitForInit();
      const list = db.getCategories();
      setCategories(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = db.createCategory(categoryData);
      await loadCategories();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add category');
      throw err;
    }
  };

  const updateCategory = async (id: number, categoryData: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>) => {
    try {
      const success = db.updateCategory(id, categoryData);
      if (success) {
        await loadCategories();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
      throw err;
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      const success = db.deleteCategory(id);
      if (success) {
        await loadCategories();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
      throw err;
    }
  };

  useEffect(() => {
    loadCategories();
    const handleSync = () => {
      loadCategories();
    };
    window.addEventListener('ecommerce-sync-completed', handleSync);
    return () => {
      window.removeEventListener('ecommerce-sync-completed', handleSync);
    };
  }, []);

  return {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    refreshCategories: loadCategories,
  };
};

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const db = useDatabase();

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      await db.waitForInit();
      const customerList = db.getCustomers();

      setCustomers(customerList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = db.createCustomer(customerData);
      await loadCustomers(); // Reload customers
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add customer');
      throw err;
    }
  };

  const deleteCustomer = async (id: number) => {
    try {
      const success = db.deleteCustomer(id);
      if (success) {
        await loadCustomers();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
      throw err;
    }
  };

  const updateCustomer = async (id: number, updates: Partial<Omit<Customer, 'id' | 'createdAt'>>) => {
    try {
      const success = db.updateCustomer(id, updates);
      if (success) {
        await loadCustomers();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer');
      throw err;
    }
  };

  useEffect(() => {
    loadCustomers();
    const handleSync = () => {
      loadCustomers();
    };
    window.addEventListener('ecommerce-sync-completed', handleSync);
    return () => {
      window.removeEventListener('ecommerce-sync-completed', handleSync);
    };
  }, []);

  return {
    customers,
    loading,
    error,
    addCustomer,
    deleteCustomer,
    updateCustomer,
    refreshCustomers: loadCustomers,
  };
};

export const useParties = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [movements, setMovements] = useState<PartyStockMovement[]>([]);
  const [payments, setPayments] = useState<PartyPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const db = useDatabase();

  const loadParties = async () => {
    try {
      setLoading(true);
      setError(null);
      await db.waitForInit();
      setParties(db.getParties());
      setMovements(db.getPartyMovements());
      setPayments(db.getPartyPayments());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load parties');
    } finally {
      setLoading(false);
    }
  };

  const addParty = async (partyData: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = db.createParty(partyData);
    await loadParties();
    return id;
  };

  const updateParty = async (id: number, updates: Partial<Omit<Party, 'id' | 'createdAt'>>) => {
    const success = db.updateParty(id, updates);
    if (success) await loadParties();
    return success;
  };

  const deleteParty = async (id: number) => {
    const success = db.deleteParty(id);
    if (success) await loadParties();
    return success;
  };

  const addMovement = async (movementData: Omit<PartyStockMovement, 'id' | 'createdAt'>) => {
    const id = db.createPartyMovement(movementData);
    await loadParties();
    return id;
  };

  const addPayment = async (paymentData: Omit<PartyPayment, 'id' | 'createdAt'>) => {
    const id = db.createPartyPayment(paymentData);
    await loadParties();
    return id;
  };

  useEffect(() => {
    loadParties();
  }, []);

  return {
    parties,
    movements,
    payments,
    loading,
    error,
    addParty,
    updateParty,
    deleteParty,
    addMovement,
    addPayment,
    refreshParties: loadParties,
  };
};


export const useBills = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const db = useDatabase();

  const loadBills = async () => {
    try {
      setLoading(true);
      setError(null);
      await db.waitForInit();
      const list = db.getBills();
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBills(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const addBill = async (bill: Bill) => {
    try {
      const id = db.createBill(bill);
      await loadBills();
      return id;
    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to create bill');
      throw err;
    }
  };

  const updateBill = async (billNumber: string, updates: Partial<Omit<Bill, 'id' | 'createdAt'>>) => {
    try {
      const success = db.updateBill(billNumber, updates);
      if (success) {
        await loadBills();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bill');
      throw err;
    }
  };

  const getBillsByCustomer = (customerId: number) => db.getBillsByCustomer(customerId);

  useEffect(() => {
    loadBills();
    const handleSync = () => {
      loadBills();
    };
    window.addEventListener('ecommerce-sync-completed', handleSync);
    return () => {
      window.removeEventListener('ecommerce-sync-completed', handleSync);
    };
  }, []);

  return {
    bills,
    loading,
    error,
    addBill,
    updateBill,
    refreshBills: loadBills,
    getBillsByCustomer,
  };
};


export const useTransactions = () => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const db = useDatabase();

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      await db.waitForInit();
      const list = db.getTransactions();
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTransactions(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
    const handleSync = () => {
      loadTransactions();
    };
    window.addEventListener('ecommerce-sync-completed', handleSync);
    return () => {
      window.removeEventListener('ecommerce-sync-completed', handleSync);
    };
  }, []);

  return { transactions, loading, error, refreshTransactions: loadTransactions };
};
