import { MongoClient, Db } from "mongodb";

interface MongoStatus {
  connected: boolean;
  uriConfigured: boolean;
  dbName: string;
  host?: string;
  error?: string | null;
  lastSync?: string | null;
  mode: "mongodb_atlas" | "hybrid_fallback";
}

let client: MongoClient | null = null;
let db: Db | null = null;
let connectPromise: Promise<Db | null> | null = null;
let lastSyncTimestamp: string | null = null;

const MONGODB_URI = process.env.MONGODB_URI || "";
const DB_NAME = process.env.MONGODB_DB_NAME || "smart_menu_db";

export async function initMongoDB(): Promise<Db | null> {
  if (db) return db;
  if (connectPromise) return connectPromise;

  if (!MONGODB_URI) {
    console.log("[MongoDB] No MONGODB_URI provided in environment. Running in Hybrid Local persistence mode.");
    return null;
  }

  connectPromise = (async () => {
    try {
      console.log("[MongoDB] Connecting to MongoDB Atlas...");
      client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 4000,
        connectTimeoutMS: 5000,
        maxPoolSize: 10,
      });

      await client.connect();
      db = client.db(DB_NAME);
      console.log(`[MongoDB] Connected successfully to database: ${DB_NAME}`);

      // Create indexes on all major collections
      try {
        await db.collection("sync_store").createIndex({ key: 1 }, { unique: true });
        await db.collection("orders").createIndex({ id: 1 }, { unique: true });
        await db.collection("orders").createIndex({ tableNumber: 1, status: 1 });
        await db.collection("orders").createIndex({ timestamp: -1 });
        await db.collection("menu_items").createIndex({ id: 1 }, { unique: true });
        await db.collection("categories").createIndex({ id: 1 }, { unique: true });
        await db.collection("tables").createIndex({ tableNumber: 1 }, { unique: true });
        await db.collection("customers").createIndex({ id: 1 }, { unique: true });
        await db.collection("bill_requests").createIndex({ id: 1 }, { unique: true });
        await db.collection("ai_sessions").createIndex({ tableNumber: 1 });
      } catch (idxErr) {
        console.warn("[MongoDB] Index setup warning:", idxErr);
      }

      lastSyncTimestamp = new Date().toISOString();
      return db;
    } catch (err: any) {
      console.warn("[MongoDB] Connection failed:", err?.message || err);
      client = null;
      db = null;
      connectPromise = null;
      return null;
    }
  })();

  return connectPromise;
}

export async function getMongoStatus(): Promise<MongoStatus> {
  const uriConfigured = Boolean(MONGODB_URI && MONGODB_URI.trim().length > 0);
  let isConnected = false;
  let host = "";

  if (db && client) {
    try {
      await db.command({ ping: 1 });
      isConnected = true;
      host = client.options?.hosts?.join(", ") || "Atlas Cluster";
    } catch {
      isConnected = false;
    }
  }

  return {
    connected: isConnected,
    uriConfigured,
    dbName: DB_NAME,
    host: isConnected ? host : undefined,
    lastSync: lastSyncTimestamp,
    mode: isConnected ? "mongodb_atlas" : "hybrid_fallback",
  };
}

export async function getKeyFromMongo(key: string): Promise<any | null> {
  try {
    const database = await initMongoDB();
    if (!database) return null;

    const doc = await database.collection("sync_store").findOne({ key });
    if (doc && doc.data !== undefined) {
      return doc.data;
    }
    return null;
  } catch (err) {
    console.warn(`[MongoDB] Error reading key [${key}]:`, err);
    return null;
  }
}

export async function getAllOrdersFromMongo(): Promise<any[] | null> {
  try {
    const database = await initMongoDB();
    if (!database) return null;

    const docs = await database.collection("orders").find({}).sort({ timestamp: -1, createdAt: -1 }).toArray();
    if (docs && docs.length > 0) {
      return docs.map(o => {
        const { _id, ...rest } = o;
        return rest;
      });
    }

    // Fallback check in sync_store "orders"
    const syncDoc = await database.collection("sync_store").findOne({ key: "orders" });
    if (syncDoc && Array.isArray(syncDoc.data) && syncDoc.data.length > 0) {
      return syncDoc.data;
    }

    return docs ? [] : null;
  } catch (err) {
    console.warn("[MongoDB] Error reading orders from Mongo:", err);
    return null;
  }
}

export async function getAllBillsFromMongo(): Promise<any[] | null> {
  try {
    const database = await initMongoDB();
    if (!database) return null;

    const docs = await database.collection("bill_requests").find({}).sort({ requestedAt: -1 }).toArray();
    if (docs && docs.length > 0) {
      return docs.map(b => {
        const { _id, ...rest } = b;
        return rest;
      });
    }

    // Fallback check in sync_store "bill_requests"
    const syncDoc = await database.collection("sync_store").findOne({ key: "bill_requests" });
    if (syncDoc && Array.isArray(syncDoc.data) && syncDoc.data.length > 0) {
      return syncDoc.data;
    }

    return docs ? [] : null;
  } catch (err) {
    console.warn("[MongoDB] Error reading bill_requests from Mongo:", err);
    return null;
  }
}

export async function getAllTablesFromMongo(): Promise<any[] | null> {
  try {
    const database = await initMongoDB();
    if (!database) return null;

    const docs = await database.collection("tables").find({}).sort({ tableNumber: 1 }).toArray();
    if (docs && docs.length > 0) {
      return docs.map(t => {
        const { _id, ...rest } = t;
        return rest;
      });
    }

    const syncDoc = await database.collection("sync_store").findOne({ key: "tables" });
    if (syncDoc && Array.isArray(syncDoc.data) && syncDoc.data.length > 0) {
      return syncDoc.data;
    }

    return docs ? [] : null;
  } catch (err) {
    console.warn("[MongoDB] Error reading tables from Mongo:", err);
    return null;
  }
}

export async function loadInitialFromMongo(): Promise<Record<string, any> | null> {
  try {
    const database = await initMongoDB();
    if (!database) return null;

    const docs = await database.collection("sync_store").find({}).toArray();
    if (!docs || docs.length === 0) return null;

    const result: Record<string, any> = {};
    for (const doc of docs) {
      if (doc.key && doc.data !== undefined) {
        result[doc.key] = doc.data;
      }
    }
    console.log(`[MongoDB] Successfully loaded ${docs.length} keys from MongoDB Atlas.`);
    lastSyncTimestamp = new Date().toISOString();
    return result;
  } catch (err) {
    console.warn("[MongoDB] Error reading from sync_store:", err);
    return null;
  }
}

export async function saveKeyToMongo(key: string, data: any): Promise<boolean> {
  try {
    const database = await initMongoDB();
    if (!database) return false;

    await database.collection("sync_store").updateOne(
      { key },
      { $set: { key, data, updatedAt: new Date() } },
      { upsert: true }
    );

    // Mirror array collections into dedicated MongoDB collections using ultra-fast bulkWrite operations
    if (key === "orders" && Array.isArray(data)) {
      const ordersCol = database.collection("orders");
      if (data.length === 0) {
        await ordersCol.deleteMany({});
      } else {
        const ops = data.filter((ord: any) => ord && ord.id).map((ord: any) => ({
          updateOne: {
            filter: { id: ord.id },
            update: { $set: { ...ord, updatedAt: new Date() } },
            upsert: true
          }
        }));
        if (ops.length > 0) {
          await ordersCol.bulkWrite(ops, { ordered: false });
        }
      }
    } else if (key === "customers" && Array.isArray(data)) {
      const custCol = database.collection("customers");
      if (data.length === 0) {
        await custCol.deleteMany({});
      } else {
        const incomingIds = data.map((cust: any) => String(cust.id)).filter(Boolean);
        await custCol.deleteMany({ id: { $nin: incomingIds } });
        const ops = data.filter((cust: any) => cust && cust.id).map((cust: any) => ({
          updateOne: {
            filter: { id: cust.id },
            update: { $set: { ...cust, updatedAt: new Date() } },
            upsert: true
          }
        }));
        if (ops.length > 0) {
          await custCol.bulkWrite(ops, { ordered: false });
        }
      }
    } else if (key === "menu_items" && Array.isArray(data)) {
      const menuCol = database.collection("menu_items");
      if (data.length === 0) {
        await menuCol.deleteMany({});
      } else {
        const incomingIds = data.map((item: any) => String(item.id)).filter(Boolean);
        await menuCol.deleteMany({ id: { $nin: incomingIds } });
        const ops = data.filter((item: any) => item && item.id).map((item: any) => ({
          updateOne: {
            filter: { id: item.id },
            update: { $set: { ...item, updatedAt: new Date() } },
            upsert: true
          }
        }));
        if (ops.length > 0) {
          await menuCol.bulkWrite(ops, { ordered: false });
        }
      }
    } else if (key === "categories" && Array.isArray(data)) {
      const catCol = database.collection("categories");
      if (data.length === 0) {
        await catCol.deleteMany({});
      } else {
        const incomingIds = data.map((cat: any) => String(cat.id)).filter(Boolean);
        await catCol.deleteMany({ id: { $nin: incomingIds } });
        const ops = data.filter((cat: any) => cat && cat.id).map((cat: any) => ({
          updateOne: {
            filter: { id: cat.id },
            update: { $set: { ...cat, updatedAt: new Date() } },
            upsert: true
          }
        }));
        if (ops.length > 0) {
          await catCol.bulkWrite(ops, { ordered: false });
        }
      }
    } else if (key === "tables" && Array.isArray(data)) {
      const tablesCol = database.collection("tables");
      if (data.length === 0) {
        await tablesCol.deleteMany({});
      } else {
        const incomingTableNumbers = data.map((tbl: any) => Number(tbl.tableNumber)).filter((n: any) => !isNaN(n));
        await tablesCol.deleteMany({ tableNumber: { $nin: incomingTableNumbers } });
        const ops = data.filter((tbl: any) => tbl && tbl.tableNumber !== undefined).map((tbl: any) => ({
          updateOne: {
            filter: { tableNumber: Number(tbl.tableNumber) },
            update: { $set: { ...tbl, updatedAt: new Date() } },
            upsert: true
          }
        }));
        if (ops.length > 0) {
          await tablesCol.bulkWrite(ops, { ordered: false });
        }
      }
    } else if (key === "bill_requests" && Array.isArray(data)) {
      const billsCol = database.collection("bill_requests");
      if (data.length === 0) {
        await billsCol.deleteMany({});
      } else {
        const ops = data.filter((bill: any) => bill && bill.id).map((bill: any) => ({
          updateOne: {
            filter: { id: bill.id },
            update: { $set: { ...bill, updatedAt: new Date() } },
            upsert: true
          }
        }));
        if (ops.length > 0) {
          await billsCol.bulkWrite(ops, { ordered: false });
        }
      }
    } else if (key === "settings" && typeof data === "object" && data !== null) {
      const settingsCol = database.collection("settings");
      await settingsCol.updateOne(
        { _id: "current_settings" as any },
        { $set: { ...data, updatedAt: new Date() } },
        { upsert: true }
      );
    }

    lastSyncTimestamp = new Date().toISOString();
    return true;
  } catch (err) {
    console.warn(`[MongoDB] Error saving key [${key}]:`, err);
    return false;
  }
}

export async function saveSingleOrderToMongo(order: any): Promise<boolean> {
  try {
    const database = await initMongoDB();
    if (!database || !order || !order.id) return false;

    await database.collection("orders").updateOne(
      { id: order.id },
      { $set: { ...order, updatedAt: new Date() } },
      { upsert: true }
    );
    lastSyncTimestamp = new Date().toISOString();
    return true;
  } catch (err) {
    console.warn(`[MongoDB] Error saving single order [${order?.id}]:`, err);
    return false;
  }
}

export async function saveSingleBillToMongo(bill: any): Promise<boolean> {
  try {
    const database = await initMongoDB();
    if (!database || !bill || !bill.id) return false;

    await database.collection("bill_requests").updateOne(
      { id: bill.id },
      { $set: { ...bill, updatedAt: new Date() } },
      { upsert: true }
    );
    lastSyncTimestamp = new Date().toISOString();
    return true;
  } catch (err) {
    console.warn(`[MongoDB] Error saving single bill [${bill?.id}]:`, err);
    return false;
  }
}

export async function deleteOrderFromMongo(orderId: string): Promise<boolean> {
  try {
    const database = await initMongoDB();
    if (!database || !orderId) return false;

    await database.collection("orders").deleteOne({ id: orderId });
    lastSyncTimestamp = new Date().toISOString();
    return true;
  } catch (err) {
    console.warn(`[MongoDB] Error deleting order [${orderId}]:`, err);
    return false;
  }
}

export async function deleteTableFromMongo(tableNumber: number): Promise<boolean> {
  try {
    const database = await initMongoDB();
    if (!database) return false;

    await database.collection("tables").deleteOne({ tableNumber: Number(tableNumber) });
    lastSyncTimestamp = new Date().toISOString();
    return true;
  } catch (err) {
    console.warn(`[MongoDB] Error deleting table [${tableNumber}]:`, err);
    return false;
  }
}

export async function getAISessionFromMongo(tableNumber: number | string): Promise<any | null> {
  try {
    const database = await initMongoDB();
    if (!database) return null;

    const doc = await database.collection("ai_sessions").findOne({ tableNumber: Number(tableNumber) });
    if (doc) {
      const { _id, ...rest } = doc;
      return rest;
    }
    return null;
  } catch (err) {
    console.warn(`[MongoDB] Error reading AI session for table [${tableNumber}]:`, err);
    return null;
  }
}

export async function saveAISessionToMongo(tableNumber: number | string, history: any[], context?: any): Promise<boolean> {
  try {
    const database = await initMongoDB();
    if (!database) return false;

    await database.collection("ai_sessions").updateOne(
      { tableNumber: Number(tableNumber) },
      { $set: { tableNumber: Number(tableNumber), history, context, updatedAt: new Date() } },
      { upsert: true }
    );
    return true;
  } catch (err) {
    console.warn(`[MongoDB] Error saving AI session for table [${tableNumber}]:`, err);
    return false;
  }
}
