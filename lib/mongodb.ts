import { MongoClient, Db, Collection } from "mongodb";
import { Order, MenuItem, Category, Customer, TableInfo, SystemSettings } from "../src/types";

// Environment variables configuration
const MONGODB_URI = process.env.MONGODB_URI || "";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "smart_menu_db";

interface CachedMongo {
  client: MongoClient | null;
  db: Db | null;
  promise: Promise<Db | null> | null;
}

// Global cache to persist connections in server environment
let cached: CachedMongo = (global as any)._mongoCache || {
  client: null,
  db: null,
  promise: null,
};

(global as any)._mongoCache = cached;

/**
 * Connect to MongoDB Atlas
 */
export async function connectToDatabase(): Promise<{ client: MongoClient | null; db: Db | null }> {
  if (cached.db && cached.client) {
    return { client: cached.client, db: cached.db };
  }

  if (!MONGODB_URI) {
    console.warn("[MongoDB] MONGODB_URI is not set in environment. Running in fallback mode.");
    return { client: null, db: null };
  }

  if (!cached.promise) {
    const opts = {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 6000,
      maxPoolSize: 10,
    };

    cached.promise = MongoClient.connect(MONGODB_URI, opts)
      .then(async (client) => {
        const database = client.db(MONGODB_DB_NAME);
        cached.client = client;
        cached.db = database;
        console.log(`[MongoDB Atlas] Successfully connected to database: ${MONGODB_DB_NAME}`);

        // Initialize essential indexes asynchronously
        try {
          await Promise.all([
            database.collection("orders").createIndex({ id: 1 }, { unique: true }),
            database.collection("menu_items").createIndex({ id: 1 }, { unique: true }),
            database.collection("categories").createIndex({ id: 1 }, { unique: true }),
            database.collection("customers").createIndex({ id: 1 }, { unique: true }),
            database.collection("sync_store").createIndex({ key: 1 }, { unique: true }),
          ]);
        } catch (idxErr) {
          console.warn("[MongoDB] Indexes check note:", idxErr);
        }

        return database;
      })
      .catch((err) => {
        console.error("[MongoDB Atlas] Connection failed:", err?.message || err);
        cached.promise = null;
        return null;
      });
  }

  const database = await cached.promise;
  return { client: cached.client, db: database };
}

/**
 * Get a specific collection with type support
 */
export async function getCollection<T = any>(collectionName: string): Promise<Collection<any> | null> {
  const { db } = await connectToDatabase();
  if (!db) return null;
  return db.collection(collectionName);
}

/* =========================================================================
 * 📦 1. ORDERS CRUD (إدارة ومعالجة الطلبات)
 * ========================================================================= */

export async function getAllOrders(): Promise<Order[]> {
  const col = await getCollection<Order>("orders");
  if (!col) return [];
  const orders = await col.find({}).sort({ createdAt: -1, timestamp: -1 }).toArray();
  return orders.map((o: any) => {
    const { _id, ...rest } = o;
    return rest as Order;
  });
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const col = await getCollection<Order>("orders");
  if (!col || !orderId) return null;
  const order = await col.findOne({ id: orderId });
  if (!order) return null;
  const { _id, ...rest } = order as any;
  return rest as Order;
}

export async function createOrder(order: Order): Promise<Order> {
  const col = await getCollection<Order>("orders");
  const orderToSave = {
    ...order,
    id: order.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: order.createdAt || new Date().toISOString(),
    status: order.status || "pending",
  };

  if (col) {
    await col.updateOne(
      { id: orderToSave.id },
      { $set: { ...orderToSave, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
  }
  return orderToSave;
}

export async function updateOrderStatus(orderId: string, status: Order["status"]): Promise<boolean> {
  const col = await getCollection<Order>("orders");
  if (!col || !orderId) return false;
  const res = await col.updateOne(
    { id: orderId },
    { $set: { status, updatedAt: new Date().toISOString() } }
  );
  return res.matchedCount > 0;
}

export async function updateOrder(orderId: string, updateData: Partial<Order>): Promise<boolean> {
  const col = await getCollection<Order>("orders");
  if (!col || !orderId) return false;
  const res = await col.updateOne(
    { id: orderId },
    { $set: { ...updateData, updatedAt: new Date().toISOString() } }
  );
  return res.matchedCount > 0;
}

export async function deleteOrder(orderId: string): Promise<boolean> {
  const col = await getCollection<Order>("orders");
  if (!col || !orderId) return false;
  const res = await col.deleteOne({ id: orderId });
  return res.deletedCount > 0;
}

/* =========================================================================
 * 🍽️ 2. MENU ITEMS CRUD (إدارة الأصناف والوجبات)
 * ========================================================================= */

export async function getAllMenuItems(): Promise<MenuItem[]> {
  const col = await getCollection<MenuItem>("menu_items");
  if (!col) return [];
  const items = await col.find({}).toArray();
  return items.map((it: any) => {
    const { _id, ...rest } = it;
    return rest as MenuItem;
  });
}

export async function getMenuItemById(itemId: string): Promise<MenuItem | null> {
  const col = await getCollection<MenuItem>("menu_items");
  if (!col || !itemId) return null;
  const item = await col.findOne({ id: itemId });
  if (!item) return null;
  const { _id, ...rest } = item as any;
  return rest as MenuItem;
}

export async function upsertMenuItem(item: MenuItem): Promise<MenuItem> {
  const col = await getCollection<MenuItem>("menu_items");
  if (col && item && item.id) {
    await col.updateOne(
      { id: item.id },
      { $set: { ...item, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
  }
  return item;
}

export async function deleteMenuItem(itemId: string): Promise<boolean> {
  const col = await getCollection<MenuItem>("menu_items");
  if (!col || !itemId) return false;
  const res = await col.deleteOne({ id: itemId });
  return res.deletedCount > 0;
}

/* =========================================================================
 * 📂 3. CATEGORIES CRUD (إدارة أقسام وقوائم الطعام)
 * ========================================================================= */

export async function getAllCategories(): Promise<Category[]> {
  const col = await getCollection<Category>("categories");
  if (!col) return [];
  const categories = await col.find({}).sort({ order: 1 }).toArray();
  return categories.map((cat: any) => {
    const { _id, ...rest } = cat;
    return rest as Category;
  });
}

export async function upsertCategory(category: Category): Promise<Category> {
  const col = await getCollection<Category>("categories");
  if (col && category && category.id) {
    await col.updateOne(
      { id: category.id },
      { $set: { ...category, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
  }
  return category;
}

export async function deleteCategory(categoryId: string): Promise<boolean> {
  const col = await getCollection<Category>("categories");
  if (!col || !categoryId) return false;
  const res = await col.deleteOne({ id: categoryId });
  return res.deletedCount > 0;
}

/* =========================================================================
 * 👥 4. CUSTOMERS CRUD (إدارة بيانات وسجلات العملاء)
 * ========================================================================= */

export async function getAllCustomers(): Promise<Customer[]> {
  const col = await getCollection<Customer>("customers");
  if (!col) return [];
  const customers = await col.find({}).sort({ lastVisit: -1 }).toArray();
  return customers.map((c: any) => {
    const { _id, ...rest } = c;
    return rest as Customer;
  });
}

export async function getCustomerById(customerId: string): Promise<Customer | null> {
  const col = await getCollection<Customer>("customers");
  if (!col || !customerId) return null;
  const customer = await col.findOne({ id: customerId });
  if (!customer) return null;
  const { _id, ...rest } = customer as any;
  return rest as Customer;
}

export async function upsertCustomer(customer: Customer): Promise<Customer> {
  const col = await getCollection<Customer>("customers");
  if (col && customer && customer.id) {
    await col.updateOne(
      { id: customer.id },
      { $set: { ...customer, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
  }
  return customer;
}

export async function deleteCustomer(customerId: string): Promise<boolean> {
  const col = await getCollection<Customer>("customers");
  if (!col || !customerId) return false;
  const res = await col.deleteOne({ id: customerId });
  return res.deletedCount > 0;
}

/* =========================================================================
 * 🪑 5. TABLES & SETTINGS (الطاولات وإعدادات السيستم)
 * ========================================================================= */

export async function getAllTables(): Promise<TableInfo[]> {
  const col = await getCollection<TableInfo>("tables");
  if (!col) return [];
  const tables = await col.find({}).sort({ tableNumber: 1 }).toArray();
  return tables.map((t: any) => {
    const { _id, ...rest } = t;
    return rest as TableInfo;
  });
}

export async function saveTables(tables: TableInfo[]): Promise<boolean> {
  const col = await getCollection<TableInfo>("tables");
  if (!col || !Array.isArray(tables)) return false;
  for (const table of tables) {
    if (table && typeof table.tableNumber === "number") {
      await col.updateOne(
        { tableNumber: table.tableNumber },
        { $set: { ...table, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
    }
  }
  return true;
}

export async function getSystemSettings(): Promise<SystemSettings | null> {
  const col = await getCollection<SystemSettings>("settings");
  if (!col) return null;
  const doc = await col.findOne({ id: "main_system_settings" });
  if (!doc) return null;
  const { _id, id, ...settings } = doc as any;
  return settings as SystemSettings;
}

export async function saveSystemSettings(settings: Partial<SystemSettings>): Promise<boolean> {
  const col = await getCollection<SystemSettings>("settings");
  if (!col) return false;
  await col.updateOne(
    { id: "main_system_settings" },
    { $set: { ...settings, id: "main_system_settings", updatedAt: new Date().toISOString() } },
    { upsert: true }
  );
  return true;
}

/* =========================================================================
 * 🔄 6. SYNC STORE HELPERS (المزامنة الشاملة)
 * ========================================================================= */

export async function getSyncKey<T = any>(key: string): Promise<T | null> {
  const col = await getCollection<{ key: string; data: T }>("sync_store");
  if (!col || !key) return null;
  const doc = await col.findOne({ key });
  return doc ? doc.data : null;
}

export async function setSyncKey(key: string, data: any): Promise<boolean> {
  const col = await getCollection("sync_store");
  if (!col || !key) return false;
  await col.updateOne(
    { key },
    { $set: { key, data, updatedAt: new Date().toISOString() } },
    { upsert: true }
  );
  return true;
}
