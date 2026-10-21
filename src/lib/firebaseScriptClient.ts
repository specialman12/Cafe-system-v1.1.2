/**
 * Firebase Script Client
 * Connects directly to Firebase via the native CDN script tag in index.html (No local npm library needed)
 * Exposes window.firebase for HTML and React components
 */

import { Order, TableInfo, BillRequest, MenuItem, Category, SystemSettings } from '../types';

export interface FirebaseClientInterface {
  isReady: boolean;
  saveOrder: (order: Order) => Promise<boolean>;
  onOrdersSnapshot: (callback: (orders: Order[]) => void) => () => void;
  updateOrderStatus: (orderId: string, status: string) => Promise<boolean>;
  saveTable: (table: TableInfo) => Promise<boolean>;
  onTablesSnapshot: (callback: (tables: TableInfo[]) => void) => () => void;
  saveBillRequest: (bill: BillRequest) => Promise<boolean>;
  onBillsSnapshot: (callback: (bills: BillRequest[]) => void) => () => void;
  saveMenuItem: (item: MenuItem) => Promise<boolean>;
  deleteMenuItem: (itemId: string) => Promise<boolean>;
  onMenuSnapshot: (callback: (items: MenuItem[]) => void) => () => void;
  saveCategory: (category: Category) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  onCategoriesSnapshot: (callback: (categories: Category[]) => void) => () => void;
  saveSettings: (settings: SystemSettings) => Promise<boolean>;
  onSettingsSnapshot: (callback: (settings: SystemSettings | null) => void) => () => void;
}

function getFirebase() {
  if (typeof window === 'undefined') return null;
  return (window as any).firebase || null;
}

export const firebaseScriptClient: FirebaseClientInterface = {
  get isReady() {
    const fb = getFirebase();
    return Boolean(fb && fb.db);
  },

  async saveOrder(order: Order): Promise<boolean> {
    try {
      const fb = getFirebase();
      if (!fb || !fb.db || !fb.doc || !fb.setDoc) return false;
      const orderRef = fb.doc(fb.db, 'orders', String(order.id));
      await fb.setDoc(orderRef, {
        ...order,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firebase Script Client] saveOrder error:', err);
      return false;
    }
  },

  onOrdersSnapshot(callback: (orders: Order[]) => void): () => void {
    try {
      const fb = getFirebase();
      if (!fb || !fb.db || !fb.collection || !fb.onSnapshot) return () => {};
      const ordersCol = fb.collection(fb.db, 'orders');
      const unsubscribe = fb.onSnapshot(ordersCol, (snapshot: any) => {
        const list: Order[] = [];
        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data();
          if (data && data.id) {
            list.push(data as Order);
          }
        });
        callback(list);
      }, (err: any) => {
        console.warn('[Firebase Script Client] orders onSnapshot error:', err);
      });
      return unsubscribe;
    } catch {
      return () => {};
    }
  },

  async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
    try {
      const fb = getFirebase();
      if (!fb || !fb.db || !fb.doc || !fb.updateDoc) return false;
      const orderRef = fb.doc(fb.db, 'orders', String(orderId));
      await fb.updateDoc(orderRef, {
        status,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (err) {
      console.warn('[Firebase Script Client] updateOrderStatus error:', err);
      return false;
    }
  },

  async saveTable(table: TableInfo): Promise<boolean> {
    try {
      const fb = getFirebase();
      if (!fb || !fb.db || !fb.doc || !fb.setDoc) return false;
      const tableRef = fb.doc(fb.db, 'tables', String(table.tableNumber));
      await fb.setDoc(tableRef, {
        ...table,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firebase Script Client] saveTable error:', err);
      return false;
    }
  },

  onTablesSnapshot(callback: (tables: TableInfo[]) => void): () => void {
    try {
      const fb = getFirebase();
      if (!fb || !fb.db || !fb.collection || !fb.onSnapshot) return () => {};
      const tablesCol = fb.collection(fb.db, 'tables');
      const unsubscribe = fb.onSnapshot(tablesCol, (snapshot: any) => {
        const list: TableInfo[] = [];
        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data();
          if (data && data.tableNumber !== undefined) {
            list.push(data as TableInfo);
          }
        });
        callback(list);
      }, (err: any) => {
        console.warn('[Firebase Script Client] tables onSnapshot error:', err);
      });
      return unsubscribe;
    } catch {
      return () => {};
    }
  },

  async saveBillRequest(bill: BillRequest): Promise<boolean> {
    try {
      const fb = getFirebase();
      if (!fb || !fb.db || !fb.doc || !fb.setDoc) return false;
      const billRef = fb.doc(fb.db, 'bill_requests', String(bill.id));
      await fb.setDoc(billRef, {
        ...bill,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firebase Script Client] saveBillRequest error:', err);
      return false;
    }
  },

  onBillsSnapshot(callback: (bills: BillRequest[]) => void): () => void {
    try {
      const fb = getFirebase();
      if (!fb || !fb.db || !fb.collection || !fb.onSnapshot) return () => {};
      const billsCol = fb.collection(fb.db, 'bill_requests');
      const unsubscribe = fb.onSnapshot(billsCol, (snapshot: any) => {
        const list: BillRequest[] = [];
        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data();
          if (data && data.id) {
            list.push(data as BillRequest);
          }
        });
        callback(list);
      }, (err: any) => {
        console.warn('[Firebase Script Client] bills onSnapshot error:', err);
      });
      return unsubscribe;
    } catch {
      return () => {};
    }
  },

  async saveMenuItem(item: MenuItem): Promise<boolean> {
    try {
      const fb = getFirebase();
      if (!fb || !fb.db || !fb.doc || !fb.setDoc) return false;
      const ref = fb.doc(fb.db, 'menu_items', String(item.id));
      await fb.setDoc(ref, { ...item, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firebase Script Client] saveMenuItem error:', err);
      return false;
    }
  },

  async deleteMenuItem(itemId: string): Promise<boolean> {
    try {
      const fb = getFirebase();
      if (!fb || !fb.db || !fb.doc || !fb.deleteDoc) return false;
      const ref = fb.doc(fb.db, 'menu_items', String(itemId));
      await fb.deleteDoc(ref);
      return true;
    } catch (err) {
      console.warn('[Firebase Script Client] deleteMenuItem error:', err);
      return false;
    }
  },

  onMenuSnapshot(callback: (items: MenuItem[]) => void): () => void {
    try {
      const fb = getFirebase();
      if (!fb || !fb.db || !fb.collection || !fb.onSnapshot) return () => {};
      const col = fb.collection(fb.db, 'menu_items');
      return fb.onSnapshot(col, (snapshot: any) => {
        const list: MenuItem[] = [];
        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data();
          if (data && data.id) list.push(data as MenuItem);
        });
        callback(list);
      }, () => {});
    } catch {
      return () => {};
    }
  },

  async saveCategory(category: Category): Promise<boolean> {
    try {
      const fb = getFirebase();
      if (!fb || !fb.db || !fb.doc || !fb.setDoc) return false;
      const ref = fb.doc(fb.db, 'categories', String(category.id));
      await fb.setDoc(ref, { ...category, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firebase Script Client] saveCategory error:', err);
      return false;
    }
  },

  async deleteCategory(categoryId: string): Promise<boolean> {
    try {
      const fb = getFirebase();
      if (!fb || !fb.db || !fb.doc || !fb.deleteDoc) return false;
      const ref = fb.doc(fb.db, 'categories', String(categoryId));
      await fb.deleteDoc(ref);
      return true;
    } catch (err) {
      console.warn('[Firebase Script Client] deleteCategory error:', err);
      return false;
    }
  },

  onCategoriesSnapshot(callback: (categories: Category[]) => void): () => void {
    try {
      const fb = getFirebase();
      if (!fb || !fb.db || !fb.collection || !fb.onSnapshot) return () => {};
      const col = fb.collection(fb.db, 'categories');
      return fb.onSnapshot(col, (snapshot: any) => {
        const list: Category[] = [];
        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data();
          if (data && data.id) list.push(data as Category);
        });
        callback(list);
      }, () => {});
    } catch {
      return () => {};
    }
  },

  async saveSettings(settings: SystemSettings): Promise<boolean> {
    try {
      const fb = getFirebase();
      if (!fb || !fb.db || !fb.doc || !fb.setDoc) return false;
      const ref = fb.doc(fb.db, 'settings', 'global_settings');
      await fb.setDoc(ref, { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firebase Script Client] saveSettings error:', err);
      return false;
    }
  },

  onSettingsSnapshot(callback: (settings: SystemSettings | null) => void): () => void {
    try {
      const fb = getFirebase();
      if (!fb || !fb.db || !fb.doc || !fb.onSnapshot) return () => {};
      const ref = fb.doc(fb.db, 'settings', 'global_settings');
      return fb.onSnapshot(ref, (docSnap: any) => {
        if (docSnap.exists && docSnap.exists()) {
          callback(docSnap.data() as SystemSettings);
        } else {
          callback(null);
        }
      }, () => {});
    } catch {
      return () => {};
    }
  }
};
