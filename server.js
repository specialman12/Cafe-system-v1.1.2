// server.ts
import dotenv from "dotenv";
import express from "express";
import path from "path";
import fs from "fs";
import http from "http";
import webpush from "web-push";
import { Server as SocketServer } from "socket.io";
import { createServer as createViteServer } from "vite";

// server/mongo.ts
import { MongoClient } from "mongodb";
var client = null;
var db = null;
var connectPromise = null;
var lastSyncTimestamp = null;
var MONGODB_URI = process.env.MONGODB_URI || "";
var DB_NAME = process.env.MONGODB_DB_NAME || "smart_menu_db";
async function initMongoDB() {
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
        serverSelectionTimeoutMS: 4e3,
        connectTimeoutMS: 5e3,
        maxPoolSize: 10
      });
      await client.connect();
      db = client.db(DB_NAME);
      console.log(`[MongoDB] Connected successfully to database: ${DB_NAME}`);
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
      lastSyncTimestamp = (/* @__PURE__ */ new Date()).toISOString();
      return db;
    } catch (err) {
      console.warn("[MongoDB] Connection failed:", err?.message || err);
      client = null;
      db = null;
      connectPromise = null;
      return null;
    }
  })();
  return connectPromise;
}
async function getMongoStatus() {
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
    host: isConnected ? host : void 0,
    lastSync: lastSyncTimestamp,
    mode: isConnected ? "mongodb_atlas" : "hybrid_fallback"
  };
}
async function getKeyFromMongo(key) {
  try {
    const database = await initMongoDB();
    if (!database) return null;
    const doc = await database.collection("sync_store").findOne({ key });
    if (doc && doc.data !== void 0) {
      return doc.data;
    }
    return null;
  } catch (err) {
    console.warn(`[MongoDB] Error reading key [${key}]:`, err);
    return null;
  }
}
async function getAllOrdersFromMongo() {
  try {
    const database = await initMongoDB();
    if (!database) return null;
    const docs = await database.collection("orders").find({}).sort({ timestamp: -1, createdAt: -1 }).toArray();
    if (docs && docs.length > 0) {
      return docs.map((o) => {
        const { _id, ...rest } = o;
        return rest;
      });
    }
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
async function getAllBillsFromMongo() {
  try {
    const database = await initMongoDB();
    if (!database) return null;
    const docs = await database.collection("bill_requests").find({}).sort({ requestedAt: -1 }).toArray();
    if (docs && docs.length > 0) {
      return docs.map((b) => {
        const { _id, ...rest } = b;
        return rest;
      });
    }
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
async function loadInitialFromMongo() {
  try {
    const database = await initMongoDB();
    if (!database) return null;
    const docs = await database.collection("sync_store").find({}).toArray();
    if (!docs || docs.length === 0) return null;
    const result = {};
    for (const doc of docs) {
      if (doc.key && doc.data !== void 0) {
        result[doc.key] = doc.data;
      }
    }
    console.log(`[MongoDB] Successfully loaded ${docs.length} keys from MongoDB Atlas.`);
    lastSyncTimestamp = (/* @__PURE__ */ new Date()).toISOString();
    return result;
  } catch (err) {
    console.warn("[MongoDB] Error reading from sync_store:", err);
    return null;
  }
}
async function saveKeyToMongo(key, data) {
  try {
    const database = await initMongoDB();
    if (!database) return false;
    await database.collection("sync_store").updateOne(
      { key },
      { $set: { key, data, updatedAt: /* @__PURE__ */ new Date() } },
      { upsert: true }
    );
    if (key === "orders" && Array.isArray(data)) {
      const ordersCol = database.collection("orders");
      if (data.length === 0) {
        await ordersCol.deleteMany({});
      } else {
        const ops = data.filter((ord) => ord && ord.id).map((ord) => ({
          updateOne: {
            filter: { id: ord.id },
            update: { $set: { ...ord, updatedAt: /* @__PURE__ */ new Date() } },
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
        const incomingIds = data.map((cust) => String(cust.id)).filter(Boolean);
        await custCol.deleteMany({ id: { $nin: incomingIds } });
        const ops = data.filter((cust) => cust && cust.id).map((cust) => ({
          updateOne: {
            filter: { id: cust.id },
            update: { $set: { ...cust, updatedAt: /* @__PURE__ */ new Date() } },
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
        const incomingIds = data.map((item) => String(item.id)).filter(Boolean);
        await menuCol.deleteMany({ id: { $nin: incomingIds } });
        const ops = data.filter((item) => item && item.id).map((item) => ({
          updateOne: {
            filter: { id: item.id },
            update: { $set: { ...item, updatedAt: /* @__PURE__ */ new Date() } },
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
        const incomingIds = data.map((cat) => String(cat.id)).filter(Boolean);
        await catCol.deleteMany({ id: { $nin: incomingIds } });
        const ops = data.filter((cat) => cat && cat.id).map((cat) => ({
          updateOne: {
            filter: { id: cat.id },
            update: { $set: { ...cat, updatedAt: /* @__PURE__ */ new Date() } },
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
        const incomingTableNumbers = data.map((tbl) => Number(tbl.tableNumber)).filter((n) => !isNaN(n));
        await tablesCol.deleteMany({ tableNumber: { $nin: incomingTableNumbers } });
        const ops = data.filter((tbl) => tbl && tbl.tableNumber !== void 0).map((tbl) => ({
          updateOne: {
            filter: { tableNumber: Number(tbl.tableNumber) },
            update: { $set: { ...tbl, updatedAt: /* @__PURE__ */ new Date() } },
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
        const ops = data.filter((bill) => bill && bill.id).map((bill) => ({
          updateOne: {
            filter: { id: bill.id },
            update: { $set: { ...bill, updatedAt: /* @__PURE__ */ new Date() } },
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
        { _id: "current_settings" },
        { $set: { ...data, updatedAt: /* @__PURE__ */ new Date() } },
        { upsert: true }
      );
    }
    lastSyncTimestamp = (/* @__PURE__ */ new Date()).toISOString();
    return true;
  } catch (err) {
    console.warn(`[MongoDB] Error saving key [${key}]:`, err);
    return false;
  }
}
async function saveSingleOrderToMongo(order) {
  try {
    const database = await initMongoDB();
    if (!database || !order || !order.id) return false;
    await database.collection("orders").updateOne(
      { id: order.id },
      { $set: { ...order, updatedAt: /* @__PURE__ */ new Date() } },
      { upsert: true }
    );
    lastSyncTimestamp = (/* @__PURE__ */ new Date()).toISOString();
    return true;
  } catch (err) {
    console.warn(`[MongoDB] Error saving single order [${order?.id}]:`, err);
    return false;
  }
}
async function saveSingleBillToMongo(bill) {
  try {
    const database = await initMongoDB();
    if (!database || !bill || !bill.id) return false;
    await database.collection("bill_requests").updateOne(
      { id: bill.id },
      { $set: { ...bill, updatedAt: /* @__PURE__ */ new Date() } },
      { upsert: true }
    );
    lastSyncTimestamp = (/* @__PURE__ */ new Date()).toISOString();
    return true;
  } catch (err) {
    console.warn(`[MongoDB] Error saving single bill [${bill?.id}]:`, err);
    return false;
  }
}
async function deleteOrderFromMongo(orderId) {
  try {
    const database = await initMongoDB();
    if (!database || !orderId) return false;
    await database.collection("orders").deleteOne({ id: orderId });
    lastSyncTimestamp = (/* @__PURE__ */ new Date()).toISOString();
    return true;
  } catch (err) {
    console.warn(`[MongoDB] Error deleting order [${orderId}]:`, err);
    return false;
  }
}
async function deleteTableFromMongo(tableNumber) {
  try {
    const database = await initMongoDB();
    if (!database) return false;
    await database.collection("tables").deleteOne({ tableNumber: Number(tableNumber) });
    lastSyncTimestamp = (/* @__PURE__ */ new Date()).toISOString();
    return true;
  } catch (err) {
    console.warn(`[MongoDB] Error deleting table [${tableNumber}]:`, err);
    return false;
  }
}

// src/lib/storeConstants.ts
var initialCategories = [
  {
    "id": "cat-hot-drinks",
    "name": "\u0647\u0648\u062A \u062F\u0631\u064A\u0646\u0643",
    "nameEn": "Hot Drinks",
    "description": "\u0634\u0627\u064A\u060C \u0642\u0647\u0648\u0629 \u062A\u0631\u0643\u064A\u060C \u0633\u062D\u0644\u0628 \u0648\u0645\u0634\u0631\u0648\u0628\u0627\u062A \u062F\u0627\u0641\u0626\u0629",
    "descriptionEn": "Teas, Turkish coffee, and warm beverages",
    "icon": "Flame",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "order": 1
  },
  {
    "id": "cat-italian-coffee",
    "name": "\u0642\u0647\u0648\u0629 \u0627\u064A\u0637\u0627\u0644\u064A",
    "nameEn": "Italian Coffee",
    "description": "\u0625\u0633\u0628\u0631\u0633\u0648\u060C \u0643\u0627\u0628\u062A\u0634\u064A\u0646\u0648\u060C \u0641\u0644\u0627\u062A \u0648\u0627\u064A\u062A\u060C \u0644\u0627\u062A\u064A\u0647 \u0648\u0645\u0648\u0643\u0627",
    "descriptionEn": "Espresso, Cappuccino, Flat White, Latte & Mocha",
    "icon": "Coffee",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "order": 2
  },
  {
    "id": "cat-fresh-juice",
    "name": "\u0639\u0635\u064A\u0631 \u0641\u0631\u064A\u0634",
    "nameEn": "Fresh Juice",
    "description": "\u0639\u0635\u0627\u0626\u0631 \u0641\u0648\u0627\u0643\u0647 \u0637\u0628\u064A\u0639\u064A\u0629 \u0637\u0627\u0632\u062C\u0629 100%",
    "descriptionEn": "100% fresh natural fruit juices",
    "icon": "GlassWater",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "order": 3
  },
  {
    "id": "cat-soda",
    "name": "\u0635\u0648\u062F\u0627",
    "nameEn": "Soda",
    "description": "\u0645\u0634\u0631\u0648\u0628\u0627\u062A \u0635\u0648\u062F\u0627 \u0645\u0646\u0639\u0634\u0629 \u0648\u0645\u0648\u0647\u064A\u062A\u0648 \u0628\u0646\u0643\u0647\u0627\u062A \u0645\u062A\u0639\u062F\u062F\u0629",
    "descriptionEn": "Refreshing flavored sodas and mojitos",
    "icon": "GlassWater",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "order": 4
  },
  {
    "id": "cat-smoothie",
    "name": "\u0633\u0645\u0648\u0632\u064A",
    "nameEn": "Smoothie",
    "description": "\u0633\u0645\u0648\u0632\u064A \u0645\u062B\u0644\u062C \u0628\u0645\u062E\u062A\u0644\u0641 \u0627\u0644\u0641\u0648\u0627\u0643\u0647 \u0627\u0644\u0637\u0627\u0632\u062C\u0629",
    "descriptionEn": "Blended fruit smoothies and refreshes",
    "icon": "GlassWater",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "order": 5
  },
  {
    "id": "cat-boba",
    "name": "\u0628\u0648\u0628\u0627",
    "nameEn": "Boba Drinks",
    "description": "\u0645\u0634\u0631\u0648\u0628\u0627\u062A \u0628\u0648\u0628\u0627 \u0628\u062D\u0628\u064A\u0628\u0627\u062A \u0627\u0644\u062A\u0627\u0628\u064A\u0648\u0643\u0627 \u0627\u0644\u0645\u0645\u064A\u0632\u0629",
    "descriptionEn": "Tapioca pearl boba drinks",
    "icon": "GlassWater",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "order": 6
  },
  {
    "id": "cat-milkshake",
    "name": "\u0645\u064A\u0644\u0643 \u0634\u064A\u0643",
    "nameEn": "Milkshakes",
    "description": "\u0645\u062E\u0641\u0648\u0642 \u062D\u0644\u064A\u0628 \u0643\u0631\u064A\u0645\u064A \u0648\u063A\u0646\u064A \u0628\u0627\u0644\u0646\u0643\u0647\u0627\u062A \u0627\u0644\u0641\u0627\u062E\u0631\u0629",
    "descriptionEn": "Rich and creamy flavored milkshakes",
    "icon": "Milk",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "order": 7
  },
  {
    "id": "cat-ice-coffee",
    "name": "\u0627\u064A\u0633 \u0643\u0648\u0641\u064A",
    "nameEn": "Ice Coffee",
    "description": "\u0642\u0647\u0648\u0629 \u0645\u062B\u0644\u062C\u0629\u060C \u0627\u064A\u0633 \u0644\u0627\u062A\u064A\u0647 \u0648\u0627\u064A\u0633 \u0645\u0648\u0643\u0627",
    "descriptionEn": "Iced espresso & cold coffee creations",
    "icon": "Coffee",
    "image": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    "order": 8
  },
  {
    "id": "cat-ice-frappe",
    "name": "\u0627\u064A\u0633 \u0641\u0631\u0627\u0628\u064A\u0647",
    "nameEn": "Ice Frappe",
    "description": "\u0641\u0631\u0627\u0628\u064A\u0647 \u0645\u062B\u0644\u062C \u0645\u062E\u0641\u0648\u0642 \u0628\u0627\u0644\u0643\u0631\u064A\u0645\u0629 \u0648\u0627\u0644\u0646\u0643\u0647\u0627\u062A",
    "descriptionEn": "Blended iced coffee frappes",
    "icon": "Coffee",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "order": 9
  },
  {
    "id": "cat-ice-tea",
    "name": "\u0627\u064A\u0633 \u062A\u064A",
    "nameEn": "Ice Tea",
    "description": "\u0634\u0627\u064A \u0645\u062B\u0644\u062C \u0628\u0646\u0643\u0647\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u0643\u0647 \u0648\u0627\u0644\u0632\u0647\u0648\u0631",
    "descriptionEn": "Chilled brewed iced teas",
    "icon": "GlassWater",
    "image": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80",
    "order": 10
  },
  {
    "id": "cat-ice-matcha",
    "name": "\u0627\u064A\u0633 \u0645\u0627\u062A\u0634\u0627",
    "nameEn": "Ice Matcha",
    "description": "\u0645\u0627\u062A\u0634\u0627 \u064A\u0627\u0628\u0627\u0646\u064A\u0629 \u0645\u062B\u0644\u062C\u0629 \u0645\u0639 \u0627\u0644\u062D\u0644\u064A\u0628 \u0648\u0627\u0644\u0641\u0648\u0627\u0643\u0647",
    "descriptionEn": "Artisanal iced Japanese matcha drinks",
    "icon": "GlassWater",
    "image": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80",
    "order": 11
  },
  {
    "id": "cat-soft-drinks",
    "name": "\u0633\u0648\u0641\u062A \u062F\u0631\u064A\u0646\u0643",
    "nameEn": "Soft Drinks",
    "description": "\u0645\u0634\u0631\u0648\u0628\u0627\u062A \u0637\u0627\u0642\u0629 \u0648\u0645\u064A\u0627\u0647 \u063A\u0627\u0632\u064A\u0629 \u0648\u0645\u0639\u062F\u0646\u064A\u0629",
    "descriptionEn": "Energy drinks, sodas & water",
    "icon": "GlassWater",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "order": 12
  },
  {
    "id": "cat-waffle",
    "name": "\u0648\u0627\u0641\u0644",
    "nameEn": "Waffles",
    "description": "\u0648\u0627\u0641\u0644 \u0645\u0642\u0631\u0645\u0634 \u0645\u0639 \u0623\u0634\u0647\u0649 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0634\u0648\u0643\u0648\u0644\u0627\u062A\u0629 \u0648\u0627\u0644\u0635\u0648\u0635\u0627\u062A",
    "descriptionEn": "Crispy waffles with sweet toppings",
    "icon": "Cake",
    "image": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80",
    "order": 13
  },
  {
    "id": "cat-pancake",
    "name": "\u0628\u0627\u0646 \u0643\u064A\u0643",
    "nameEn": "Pancakes",
    "description": "\u0645\u064A\u0646\u064A \u0628\u0627\u0646 \u0643\u064A\u0643 \u0637\u0627\u0632\u062C (12 \u0642\u0637\u0639\u0629 / 25 \u0642\u0637\u0639\u0629) \u0645\u0639 \u0635\u0648\u0635\u0627\u062A \u0641\u0627\u062E\u0631\u0629",
    "descriptionEn": "Fresh mini pancakes (12 pcs / 25 pcs)",
    "icon": "Cake",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "order": 14
  },
  {
    "id": "cat-taro",
    "name": "\u062A\u0627\u0631\u0648",
    "nameEn": "Taro Drinks",
    "description": "\u0645\u0634\u0631\u0648\u0628\u0627\u062A \u0627\u0644\u062A\u0627\u0631\u0648 \u0627\u0644\u0644\u0630\u064A\u0630\u0629 \u0628\u0646\u0643\u0647\u0629 \u0645\u0645\u064A\u0632\u0629",
    "descriptionEn": "Unique and flavorful Taro blends",
    "icon": "GlassWater",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "order": 15
  },
  {
    "id": "cat-dessert",
    "name": "\u062F\u064A\u0632\u064A\u0631\u062A",
    "nameEn": "Desserts",
    "description": "\u062A\u0634\u0643\u064A\u0644\u0629 \u0641\u0627\u062E\u0631\u0629 \u0645\u0646 \u0627\u0644\u0643\u064A\u0643\u060C \u0627\u0644\u0645\u0648\u0633 \u0648\u0627\u0644\u0645\u0648\u0644\u062A\u0646",
    "descriptionEn": "Cakes, mousse, and gourmet desserts",
    "icon": "Cake",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "order": 16
  },
  {
    "id": "cat-toast",
    "name": "\u062A\u0648\u0633\u062A",
    "nameEn": "Toast",
    "description": "\u0633\u0646\u062F\u0648\u062A\u0634\u0627\u062A \u062A\u0648\u0633\u062A \u0633\u0627\u062E\u0646\u0629 \u0648\u062C\u0628\u0646 \u0648\u0644\u062D\u0648\u0645 \u0645\u062F\u062E\u0646\u0629",
    "descriptionEn": "Hot toasted sandwiches with cheese and meats",
    "icon": "Utensils",
    "image": "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
    "order": 17
  },
  {
    "id": "cat-croissant",
    "name": "\u0643\u0631\u0648\u0627\u0633\u0648\u0646",
    "nameEn": "Croissants",
    "description": "\u0643\u0631\u0648\u0627\u0633\u0648\u0646 \u0641\u0631\u0646\u0633\u064A \u0647\u0634 \u062D\u0627\u062F\u0642 \u0648\u062D\u0644\u0648",
    "descriptionEn": "Flaky fresh sweet and savory croissants",
    "icon": "Utensils",
    "image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    "order": 18
  },
  {
    "id": "cat-cold-cuts",
    "name": "\u0643\u0648\u0644\u062F \u0643\u0627\u062A(\u0633\u0646\u062F\u0648\u062A\u0634)",
    "nameEn": "Cold Cuts Sandwiches",
    "description": "\u0633\u0646\u062F\u0648\u062A\u0634\u0627\u062A \u0643\u0648\u0644\u062F \u0643\u0627\u062A \u0641\u0627\u062E\u0631\u0629",
    "descriptionEn": "Premium cold cuts deli sandwiches",
    "icon": "Utensils",
    "image": "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80",
    "order": 19
  },
  {
    "id": "cat-wraps",
    "name": "\u0631\u0627\u0628 \u0633\u064A\u0644\u064A\u0648(\u062A\u0648\u0631\u062A\u064A\u0644\u0627)",
    "nameEn": "Celio Wraps (Tortilla)",
    "description": "\u0631\u0648\u0644 \u062A\u0648\u0631\u062A\u064A\u0644\u0627 \u0628\u062D\u0634\u0648\u0627\u062A \u0627\u0644\u062C\u0628\u0646 \u0648\u0627\u0644\u0644\u062D\u0648\u0645 \u0627\u0644\u0645\u062F\u062E\u0646\u0629",
    "descriptionEn": "Tortilla wraps with cheeses and meats",
    "icon": "Utensils",
    "image": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80",
    "order": 20
  },
  {
    "id": "cat-extras",
    "name": "\u0627\u0636\u0627\u0641\u0627\u062A",
    "nameEn": "Extras & Add-ons",
    "description": "\u0625\u0636\u0627\u0641\u0627\u062A \u0641\u0644\u064A\u0641\u0631\u060C \u0645\u0643\u0633\u0631\u0627\u062A\u060C \u0628\u0648\u0628\u0627 \u0648\u0628\u0630\u0648\u0631 \u0627\u0644\u0631\u064A\u062D\u0627\u0646",
    "descriptionEn": "Toppings, flavors, nuts & boba",
    "icon": "Sparkles",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "order": 21
  }
];
var initialMenuItems = [
  {
    "id": "m-1",
    "categoryId": "cat-hot-drinks",
    "name": "\u0634\u0627\u064A",
    "price": 30,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-2",
    "categoryId": "cat-hot-drinks",
    "name": "\u0634\u0627\u064A \u0641\u0648\u0627\u0643\u0647",
    "price": 40,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-3",
    "categoryId": "cat-hot-drinks",
    "name": "\u0634\u0627\u064A \u0643\u0631\u0643",
    "price": 60,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-4",
    "categoryId": "cat-hot-drinks",
    "name": "\u0647\u0648\u062A \u0633\u064A\u0632\u0631",
    "price": 50,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-5",
    "categoryId": "cat-hot-drinks",
    "name": "\u0642\u0647\u0648\u0647 \u062A\u0631\u0643\u064A \u0633\u0627\u062F\u0647 \u0633\u0646\u062C\u0644",
    "price": 40,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-6",
    "categoryId": "cat-hot-drinks",
    "name": "\u0642\u0647\u0648\u0629 \u062A\u0631\u0643\u064A \u0633\u0627\u062F\u0647 \u062F\u0628\u0644",
    "price": 55,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-7",
    "categoryId": "cat-hot-drinks",
    "name": "\u0642\u0647\u0648\u0629 \u062A\u0631\u0643\u064A \u0645\u062D\u0648\u062C \u0633\u0646\u062C\u0644",
    "price": 45,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-8",
    "categoryId": "cat-hot-drinks",
    "name": "\u0642\u0647\u0648\u0629 \u062A\u0631\u0643\u064A \u0645\u062D\u0648\u062C \u062F\u0628\u0644",
    "price": 60,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-9",
    "categoryId": "cat-hot-drinks",
    "name": "\u0642\u0647\u0648\u0629 \u0645\u062D\u0648\u062C \u0645\u0633\u062A\u0643\u0629",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-10",
    "categoryId": "cat-hot-drinks",
    "name": "\u0642\u0647\u0648\u0629 \u0641\u0631\u0646\u0633\u0627\u0648\u064A",
    "price": 50,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-11",
    "categoryId": "cat-hot-drinks",
    "name": "\u0642\u0647\u0648\u0629 \u0628\u0646\u062F\u0642",
    "price": 60,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-12",
    "categoryId": "cat-hot-drinks",
    "name": "\u0642\u0647\u0648\u0629 \u0643\u0631\u0627\u0645\u064A\u0644",
    "price": 60,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-13",
    "categoryId": "cat-hot-drinks",
    "name": "\u0642\u0647\u0648\u0629 \u0634\u0648\u0643\u0644\u062A",
    "price": 60,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-14",
    "categoryId": "cat-hot-drinks",
    "name": "\u0633\u062D\u0644\u0628",
    "price": 60,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-15",
    "categoryId": "cat-hot-drinks",
    "name": "\u0627\u0639\u0634\u0627\u0628",
    "price": 40,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-16",
    "categoryId": "cat-hot-drinks",
    "name": "\u0645\u0643\u0633 \u0627\u0639\u0634\u0627\u0628",
    "price": 50,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-17",
    "categoryId": "cat-italian-coffee",
    "name": "\u0627\u0633\u0628\u0631\u0633\u0648 \u0633\u0646\u062C\u0644",
    "price": 45,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-18",
    "categoryId": "cat-italian-coffee",
    "name": "\u0627\u0633\u0628\u0631\u0633\u0648 \u062F\u0627\u0628\u0644",
    "price": 65,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-19",
    "categoryId": "cat-italian-coffee",
    "name": "\u0645\u064A\u0643\u0627\u062A\u0648",
    "price": 60,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-20",
    "categoryId": "cat-italian-coffee",
    "name": "\u0643\u0648\u0631\u062A\u0627\u062F\u0648",
    "price": 65,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-21",
    "categoryId": "cat-italian-coffee",
    "name": "\u0641\u0644\u0627\u062A \u0648\u0627\u064A\u062A",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-22",
    "categoryId": "cat-italian-coffee",
    "name": "\u0644\u0627\u062A\u064A\u0647",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-23",
    "categoryId": "cat-italian-coffee",
    "name": "\u0643\u0627\u0628\u062A\u0634\u064A\u0646\u0648",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-24",
    "categoryId": "cat-italian-coffee",
    "name": "\u0627\u0641\u0648\u062C\u0627\u062A\u0648",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-25",
    "categoryId": "cat-italian-coffee",
    "name": "\u0645\u0648\u0643\u0627",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-26",
    "categoryId": "cat-italian-coffee",
    "name": "\u0646\u0633\u0643\u0627\u0641\u064A\u0647",
    "price": 50,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-27",
    "categoryId": "cat-italian-coffee",
    "name": "\u0646\u0633\u0643\u0627\u0641\u064A\u0629 \u062D\u0644\u064A\u0628",
    "price": 65,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-28",
    "categoryId": "cat-italian-coffee",
    "name": "\u0647\u0648\u062A \u0627\u0633\u0628\u0627\u0646\u0634 \u0644\u0627\u062A\u064A\u0647",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-29",
    "categoryId": "cat-fresh-juice",
    "name": "\u0645\u0627\u0646\u062C\u0648",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-30",
    "categoryId": "cat-fresh-juice",
    "name": "\u062C\u0648\u0627\u0641\u0647",
    "price": 65,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-31",
    "categoryId": "cat-fresh-juice",
    "name": "\u0641\u0631\u0627\u0648\u0644\u0647",
    "price": 65,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-32",
    "categoryId": "cat-fresh-juice",
    "name": "\u0643\u064A\u0648\u064A",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-33",
    "categoryId": "cat-fresh-juice",
    "name": "\u0627\u0646\u0627\u0646\u0627\u0633",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-34",
    "categoryId": "cat-fresh-juice",
    "name": "\u062E\u0648\u062E",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-35",
    "categoryId": "cat-fresh-juice",
    "name": "\u0628\u0631\u062A\u0642\u0627\u0644",
    "price": 65,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-36",
    "categoryId": "cat-fresh-juice",
    "name": "\u0627\u0641\u0648\u0643\u0627\u062F\u0648",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-37",
    "categoryId": "cat-fresh-juice",
    "name": "\u0627\u0641\u0648\u0643\u0627\u062F\u0648 \u0645\u0643\u0633\u0631\u0627\u062A",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-38",
    "categoryId": "cat-fresh-juice",
    "name": "\u0645\u0648\u0632 \u0628\u0644\u0628\u0646",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-39",
    "categoryId": "cat-fresh-juice",
    "name": "\u0645\u0648\u0632 \u0641\u0631\u0648\u0644\u0629",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-40",
    "categoryId": "cat-fresh-juice",
    "name": "\u0628\u0637\u064A\u062E",
    "price": 65,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-41",
    "categoryId": "cat-fresh-juice",
    "name": "\u0628\u0637\u064A\u062E \u0646\u0639\u0646\u0627\u0639",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-42",
    "categoryId": "cat-fresh-juice",
    "name": "\u0644\u064A\u0645\u0648\u0646",
    "price": 50,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-43",
    "categoryId": "cat-fresh-juice",
    "name": "\u0644\u064A\u0645\u0648\u0646\u0627\u062F\u0647",
    "price": 55,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-44",
    "categoryId": "cat-fresh-juice",
    "name": "\u0627\u0644\u064A\u0643\u062A\u0631\u064A\u0643",
    "price": 60,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-45",
    "categoryId": "cat-fresh-juice",
    "name": "\u0628\u0644\u0627\u0643 \u0644\u064A\u0645\u0648\u0646",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-46",
    "categoryId": "cat-fresh-juice",
    "name": "\u0641\u0631\u0648\u062A \u0643\u0648\u0643\u062A\u064A\u0644",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-47",
    "categoryId": "cat-soda",
    "name": "\u0628\u0644\u0648 \u0628\u064A\u0631\u064A",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-48",
    "categoryId": "cat-soda",
    "name": "\u0641\u0631\u0648\u0644\u0629",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-49",
    "categoryId": "cat-soda",
    "name": "\u0628\u0627\u0634\u0648\u0646",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-50",
    "categoryId": "cat-soda",
    "name": "\u0645\u0627\u0646\u062C\u0648",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-51",
    "categoryId": "cat-soda",
    "name": "\u062E\u0648\u062E",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-52",
    "categoryId": "cat-soda",
    "name": "\u0631\u0633\u0628\u0631\u064A \u0628\u0631\u064A",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-53",
    "categoryId": "cat-soda",
    "name": "\u0634\u0631\u064A \u0643\u0648\u0644\u0627",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-54",
    "categoryId": "cat-soda",
    "name": "\u062C\u064A\u0644\u064A \u0643\u0648\u0644\u0627",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-55",
    "categoryId": "cat-soda",
    "name": "\u0628\u064A\u0646\u0627 \u0643\u0648\u0644\u0627\u062F\u0627",
    "price": 85,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-56",
    "categoryId": "cat-soda",
    "name": "\u0628\u0644\u0648 \u0633\u0643\u0627\u064A",
    "price": 85,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-57",
    "categoryId": "cat-soda",
    "name": "\u0645\u0648\u0647\u064A\u062A\u0648",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-58",
    "categoryId": "cat-soda",
    "name": "\u0645\u0648\u0647\u064A\u062A\u0648 \u0641\u0644\u064A\u0641\u0631",
    "price": 85,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-59",
    "categoryId": "cat-smoothie",
    "name": "\u0645\u0627\u0646\u062C\u0648",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-60",
    "categoryId": "cat-smoothie",
    "name": "\u0643\u064A\u0648\u064A",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-61",
    "categoryId": "cat-smoothie",
    "name": "\u062E\u0648\u062E",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-62",
    "categoryId": "cat-smoothie",
    "name": "\u0627\u0646\u0627\u0646\u0627\u0633",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-63",
    "categoryId": "cat-smoothie",
    "name": "\u0628\u0637\u064A\u062E",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-64",
    "categoryId": "cat-smoothie",
    "name": "\u0628\u0637\u064A\u062E \u0646\u0639\u0646\u0627\u0639",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-65",
    "categoryId": "cat-smoothie",
    "name": "\u0641\u0631\u0627\u0648\u0644\u0647",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-66",
    "categoryId": "cat-smoothie",
    "name": "\u0644\u064A\u0645\u0648\u0646 \u0646\u0639\u0646\u0627\u0639",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-67",
    "categoryId": "cat-smoothie",
    "name": "\u0628\u0644\u0648 \u0628\u064A\u0631\u064A",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-68",
    "categoryId": "cat-smoothie",
    "name": "\u0645\u064A\u0643\u0633 \u0628\u064A\u0631\u064A",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-69",
    "categoryId": "cat-smoothie",
    "name": "\u0633\u064A\u0644\u064A\u0648 (\u0643\u064A\u0648\u064A \u0628\u0627\u0634\u0648\u0646)",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-70",
    "categoryId": "cat-boba",
    "name": "\u0627\u064A\u0633 \u0644\u0627\u062A\u064A\u0647",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-71",
    "categoryId": "cat-boba",
    "name": "\u0627\u064A\u0633 \u0627\u0633\u0628\u0627\u0646\u0634 \u0644\u0627\u062A\u064A\u0647",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-72",
    "categoryId": "cat-boba",
    "name": "\u0627\u064A\u0633 \u0645\u0648\u0643\u0627",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-73",
    "categoryId": "cat-boba",
    "name": "\u0645\u0627\u062A\u0634\u0627",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-74",
    "categoryId": "cat-boba",
    "name": "\u062A\u0627\u0631\u0648",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-75",
    "categoryId": "cat-milkshake",
    "name": "\u06A4\u0627\u0646\u064A\u0644\u064A\u0627",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-76",
    "categoryId": "cat-milkshake",
    "name": "\u0643\u0631\u0627\u0645\u064A\u0644",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-77",
    "categoryId": "cat-milkshake",
    "name": "\u0628\u0646\u062F\u0642",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-78",
    "categoryId": "cat-milkshake",
    "name": "\u062A\u064A\u0631\u0627\u0645\u064A\u0633\u064A\u0648",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-79",
    "categoryId": "cat-milkshake",
    "name": "\u0634\u0648\u0643\u0644\u064A\u062A",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-80",
    "categoryId": "cat-milkshake",
    "name": "\u0643\u0648\u0643\u064A\u0632",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-81",
    "categoryId": "cat-milkshake",
    "name": "\u0628\u0631\u0627\u0648\u0646\u064A\u0632",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-82",
    "categoryId": "cat-milkshake",
    "name": "\u0644\u0648\u062A\u0633",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-83",
    "categoryId": "cat-milkshake",
    "name": "\u0641\u0633\u062F\u0642",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-84",
    "categoryId": "cat-milkshake",
    "name": "\u0628\u0644\u0627\u0643 \u0628\u064A\u0631\u064A",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-85",
    "categoryId": "cat-milkshake",
    "name": "\u0633\u064A\u0644\u064A\u0648 (\u0643\u0627\u062C\u0648 \u0643\u0631\u0627\u0645\u064A\u0644 \u0642\u0631\u0641\u0647)",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-86",
    "categoryId": "cat-ice-coffee",
    "name": "\u0627\u064A\u0633 \u0627\u0633\u0628\u0627\u0646\u0634 \u0644\u0627\u062A\u064A\u0647",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-87",
    "categoryId": "cat-ice-coffee",
    "name": "\u0627\u064A\u0633 \u0644\u0627\u062A\u064A\u0647",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-88",
    "categoryId": "cat-ice-coffee",
    "name": "\u0627\u064A\u0633 \u0645\u0648\u0643\u0627",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-89",
    "categoryId": "cat-ice-coffee",
    "name": "\u0627\u064A\u0633 \u0645\u064A\u0643\u0627\u062A\u0648 \u0643\u0631\u0627\u0645\u064A\u0644",
    "price": 105,
    "description": "",
    "image": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-90",
    "categoryId": "cat-ice-coffee",
    "name": "\u0627\u064A\u0633 \u0644\u0627\u062A\u064A\u0647 \u0631\u0648\u0632",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-91",
    "categoryId": "cat-ice-coffee",
    "name": "\u0627\u064A\u0633 \u0627\u0645\u0631\u064A\u0643\u0627\u0646\u0648",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-92",
    "categoryId": "cat-ice-frappe",
    "name": "\u0641\u0627\u0646\u064A\u0644\u064A\u0627",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-93",
    "categoryId": "cat-ice-frappe",
    "name": "\u0634\u0648\u0643\u0644\u064A\u062A",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-94",
    "categoryId": "cat-ice-frappe",
    "name": "\u0628\u0646\u062F\u0642",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-95",
    "categoryId": "cat-ice-frappe",
    "name": "\u0628\u0633\u062A\u0627\u0634\u064A\u0648",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-96",
    "categoryId": "cat-ice-frappe",
    "name": "\u062A\u064A\u0631\u0627\u0645\u064A\u0633\u064A\u0648",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-97",
    "categoryId": "cat-ice-frappe",
    "name": "\u0641\u0631\u0627\u0628\u062A\u0634\u064A\u0646\u0648",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-98",
    "categoryId": "cat-ice-frappe",
    "name": "\u0627\u064A\u0644\u064A \u0643\u0631\u064A\u0645",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-99",
    "categoryId": "cat-ice-tea",
    "name": "\u0641\u0648\u0627\u0643\u0647",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-100",
    "categoryId": "cat-ice-tea",
    "name": "\u0644\u0627\u0641\u0646\u062F\u0631",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-101",
    "categoryId": "cat-ice-tea",
    "name": "\u0631\u0648\u0632\u064A",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-102",
    "categoryId": "cat-ice-tea",
    "name": "\u0643\u0644\u0627\u0633\u064A\u0643",
    "price": 50,
    "description": "",
    "image": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-103",
    "categoryId": "cat-ice-matcha",
    "name": "\u0644\u0627\u062A\u064A\u0647",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-104",
    "categoryId": "cat-ice-matcha",
    "name": "\u0628\u064A\u0631\u064A \u0644\u0627\u062A\u064A\u0647",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-105",
    "categoryId": "cat-ice-matcha",
    "name": "\u0641\u0631\u0627\u0648\u0644\u0647 \u0644\u0627\u062A\u064A\u0647",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-106",
    "categoryId": "cat-ice-matcha",
    "name": "\u0627\u0633\u0628\u0627\u0646\u0634 \u0644\u0627\u062A\u064A\u0647",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-107",
    "categoryId": "cat-soft-drinks",
    "name": "\u0631\u064A\u062F \u0628\u0648\u0644 \u0627\u0637\u0639\u0645",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-108",
    "categoryId": "cat-soft-drinks",
    "name": "\u0631\u064A\u062F \u0628\u0648\u0644",
    "price": 85,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-109",
    "categoryId": "cat-soft-drinks",
    "name": "\u0645\u0648\u0633\u064A \u0627\u0637\u0639\u0645",
    "price": 50,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-110",
    "categoryId": "cat-soft-drinks",
    "name": "\u0628\u064A\u0628\u0633\u064A \u0643\u0627\u0646\u0632",
    "price": 35,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-111",
    "categoryId": "cat-soft-drinks",
    "name": "\u0633\u0641\u0646 \u0643\u0627\u0646\u0632",
    "price": 35,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-112",
    "categoryId": "cat-soft-drinks",
    "name": "\u0645\u064A\u0627\u0647 \u0641\u0648\u0627\u0631\u0629",
    "price": 25,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-113",
    "categoryId": "cat-soft-drinks",
    "name": "\u0645\u064A\u0627\u0647 \u0641\u0644\u0648",
    "price": 25,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-114",
    "categoryId": "cat-soft-drinks",
    "name": "\u0645\u064A\u0627\u0647 \u0645\u0639\u062F\u0646\u064A\u0629 \u0635\u063A\u064A\u0631",
    "price": 15,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-115",
    "categoryId": "cat-waffle",
    "name": "\u0634\u0648\u0643\u0644\u062A",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-116",
    "categoryId": "cat-waffle",
    "name": "\u0646\u0648\u062A\u064A\u0644\u0627",
    "price": 140,
    "description": "",
    "image": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-117",
    "categoryId": "cat-waffle",
    "name": "\u0648\u0627\u064A\u062A",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-118",
    "categoryId": "cat-waffle",
    "name": "\u0643\u064A\u0646\u062F\u0631",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-119",
    "categoryId": "cat-waffle",
    "name": "\u0641\u064A\u0631\u0648 \u0631\u0648\u0634\u064A\u0647",
    "price": 140,
    "description": "",
    "image": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-120",
    "categoryId": "cat-waffle",
    "name": "\u062F\u0628\u064A",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-121",
    "categoryId": "cat-waffle",
    "name": "\u0644\u0648\u062A\u0633",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-122",
    "categoryId": "cat-waffle",
    "name": "\u0627\u0633\u0628\u0634\u064A\u0627\u0644",
    "price": 180,
    "description": "",
    "image": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-123",
    "categoryId": "cat-pancake",
    "name": "\u0628\u0627\u0646 \u0643\u064A\u0643 \u0634\u0648\u0643\u0644\u062A (12 \u0642\u0637\u0639\u0629)",
    "price": 80,
    "description": "12 \u0642\u0637\u0639\u0629 \u0645\u064A\u0646\u064A \u0628\u0627\u0646 \u0643\u064A\u0643 \u0645\u0639 \u0635\u0648\u0635 \u0634\u0648\u0643\u0648\u0644\u0627\u062A\u0629 \u0641\u0627\u062E\u0631",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-124",
    "categoryId": "cat-pancake",
    "name": "\u0628\u0627\u0646 \u0643\u064A\u0643 \u0634\u0648\u0643\u0644\u062A (25 \u0642\u0637\u0639\u0629)",
    "price": 150,
    "description": "25 \u0642\u0637\u0639\u0629 \u0645\u064A\u0646\u064A \u0628\u0627\u0646 \u0643\u064A\u0643 \u0645\u0639 \u0635\u0648\u0635 \u0634\u0648\u0643\u0648\u0644\u0627\u062A\u0629 \u0641\u0627\u062E\u0631",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-125",
    "categoryId": "cat-pancake",
    "name": "\u0628\u0627\u0646 \u0643\u064A\u0643 \u0646\u0648\u062A\u064A\u0644\u0627 (12 \u0642\u0637\u0639\u0629)",
    "price": 100,
    "description": "12 \u0642\u0637\u0639\u0629 \u0645\u0639 \u0646\u0648\u062A\u064A\u0644\u0627 \u0623\u0635\u0644\u064A\u0629",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-126",
    "categoryId": "cat-pancake",
    "name": "\u0628\u0627\u0646 \u0643\u064A\u0643 \u0646\u0648\u062A\u064A\u0644\u0627 (25 \u0642\u0637\u0639\u0629)",
    "price": 190,
    "description": "25 \u0642\u0637\u0639\u0629 \u0645\u0639 \u0646\u0648\u062A\u064A\u0644\u0627 \u0623\u0635\u0644\u064A\u0629",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-127",
    "categoryId": "cat-pancake",
    "name": "\u0628\u0627\u0646 \u0643\u064A\u0643 \u0648\u0627\u064A\u062A (12 \u0642\u0637\u0639\u0629)",
    "price": 80,
    "description": "12 \u0642\u0637\u0639\u0629 \u0645\u0639 \u0635\u0648\u0635 \u0634\u0648\u0643\u0648\u0644\u0627\u062A\u0629 \u0628\u064A\u0636\u0627\u0621",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-128",
    "categoryId": "cat-pancake",
    "name": "\u0628\u0627\u0646 \u0643\u064A\u0643 \u0648\u0627\u064A\u062A (25 \u0642\u0637\u0639\u0629)",
    "price": 150,
    "description": "25 \u0642\u0637\u0639\u0629 \u0645\u0639 \u0635\u0648\u0635 \u0634\u0648\u0643\u0648\u0644\u0627\u062A\u0629 \u0628\u064A\u0636\u0627\u0621",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-129",
    "categoryId": "cat-pancake",
    "name": "\u0628\u0627\u0646 \u0643\u064A\u0643 \u0643\u064A\u0646\u062F\u0631 (12 \u0642\u0637\u0639\u0629)",
    "price": 90,
    "description": "12 \u0642\u0637\u0639\u0629 \u0645\u0639 \u0635\u0648\u0635 \u0643\u064A\u0646\u062F\u0631",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-130",
    "categoryId": "cat-pancake",
    "name": "\u0628\u0627\u0646 \u0643\u064A\u0643 \u0643\u064A\u0646\u062F\u0631 (25 \u0642\u0637\u0639\u0629)",
    "price": 170,
    "description": "25 \u0642\u0637\u0639\u0629 \u0645\u0639 \u0635\u0648\u0635 \u0643\u064A\u0646\u062F\u0631",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-131",
    "categoryId": "cat-pancake",
    "name": "\u0628\u0627\u0646 \u0643\u064A\u0643 \u0641\u064A\u0631\u0648 \u0631\u0648\u0634\u064A\u0647 (12 \u0642\u0637\u0639\u0629)",
    "price": 90,
    "description": "12 \u0642\u0637\u0639\u0629 \u0645\u0639 \u0635\u0648\u0635 \u0631\u0648\u0634\u064A\u0647 \u0648\u0628\u0646\u062F\u0642",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-132",
    "categoryId": "cat-pancake",
    "name": "\u0628\u0627\u0646 \u0643\u064A\u0643 \u0641\u064A\u0631\u0648 \u0631\u0648\u0634\u064A\u0647 (25 \u0642\u0637\u0639\u0629)",
    "price": 170,
    "description": "25 \u0642\u0637\u0639\u0629 \u0645\u0639 \u0635\u0648\u0635 \u0631\u0648\u0634\u064A\u0647 \u0648\u0628\u0646\u062F\u0642",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-133",
    "categoryId": "cat-pancake",
    "name": "\u0628\u0627\u0646 \u0643\u064A\u0643 \u062F\u0628\u064A (12 \u0642\u0637\u0639\u0629)",
    "price": 90,
    "description": "12 \u0642\u0637\u0639\u0629 \u0628\u0646\u0643\u0647\u0629 \u0643\u0646\u0627\u0641\u0629 \u0648\u0634\u0648\u0643\u0648\u0644\u0627\u062A\u0629 \u062F\u0628\u064A",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-134",
    "categoryId": "cat-pancake",
    "name": "\u0628\u0627\u0646 \u0643\u064A\u0643 \u062F\u0628\u064A (25 \u0642\u0637\u0639\u0629)",
    "price": 170,
    "description": "25 \u0642\u0637\u0639\u0629 \u0628\u0646\u0643\u0647\u0629 \u0643\u0646\u0627\u0641\u0629 \u0648\u0634\u0648\u0643\u0648\u0644\u0627\u062A\u0629 \u062F\u0628\u064A",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-135",
    "categoryId": "cat-pancake",
    "name": "\u0628\u0627\u0646 \u0643\u064A\u0643 \u0644\u0648\u062A\u0633 (12 \u0642\u0637\u0639\u0629)",
    "price": 90,
    "description": "12 \u0642\u0637\u0639\u0629 \u0645\u0639 \u0632\u0628\u062F\u0629 \u0648\u0628\u0633\u0643\u0648\u064A\u062A \u0644\u0648\u062A\u0633",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-136",
    "categoryId": "cat-pancake",
    "name": "\u0628\u0627\u0646 \u0643\u064A\u0643 \u0644\u0648\u062A\u0633 (25 \u0642\u0637\u0639\u0629)",
    "price": 170,
    "description": "25 \u0642\u0637\u0639\u0629 \u0645\u0639 \u0632\u0628\u062F\u0629 \u0648\u0628\u0633\u0643\u0648\u064A\u062A \u0644\u0648\u062A\u0633",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-137",
    "categoryId": "cat-pancake",
    "name": "\u0628\u0627\u0646 \u0643\u064A\u0643 \u0641\u0648\u0627\u0643\u0647 (12 \u0642\u0637\u0639\u0629)",
    "price": 80,
    "description": "12 \u0642\u0637\u0639\u0629 \u0645\u0639 \u0642\u0637\u0639 \u0641\u0648\u0627\u0643\u0647 \u0645\u0634\u0643\u0644\u0629 \u0648\u0635\u0648\u0635 \u0639\u0633\u0644",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-138",
    "categoryId": "cat-pancake",
    "name": "\u0628\u0627\u0646 \u0643\u064A\u0643 \u0641\u0648\u0627\u0643\u0647 (25 \u0642\u0637\u0639\u0629)",
    "price": 150,
    "description": "25 \u0642\u0637\u0639\u0629 \u0645\u0639 \u0642\u0637\u0639 \u0641\u0648\u0627\u0643\u0647 \u0645\u0634\u0643\u0644\u0629 \u0648\u0635\u0648\u0635 \u0639\u0633\u0644",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-139",
    "categoryId": "cat-pancake",
    "name": "\u0628\u0627\u0646 \u0643\u064A\u0643 \u0627\u0633\u0628\u0634\u064A\u0627\u0644 (12 \u0642\u0637\u0639\u0629)",
    "price": 95,
    "description": "12 \u0642\u0637\u0639\u0629 \u0645\u064A\u0643\u0633 \u0635\u0648\u0635\u0627\u062A \u0648\u062A\u0648\u0628\u064A\u0646\u062C \u0641\u0627\u062E\u0631",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-140",
    "categoryId": "cat-pancake",
    "name": "\u0628\u0627\u0646 \u0643\u064A\u0643 \u0627\u0633\u0628\u0634\u064A\u0627\u0644 (25 \u0642\u0637\u0639\u0629)",
    "price": 180,
    "description": "25 \u0642\u0637\u0639\u0629 \u0645\u064A\u0643\u0633 \u0635\u0648\u0635\u0627\u062A \u0648\u062A\u0648\u0628\u064A\u0646\u062C \u0641\u0627\u062E\u0631",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-141",
    "categoryId": "cat-taro",
    "name": "\u0633\u0628\u0627\u0646\u0634 \u0644\u0627\u062A\u064A\u0629",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-142",
    "categoryId": "cat-taro",
    "name": "\u0644\u0627\u062A\u064A\u0629",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-143",
    "categoryId": "cat-taro",
    "name": "\u0634\u0648\u0643\u0644\u062A",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-144",
    "categoryId": "cat-taro",
    "name": "\u0641\u0631\u0648\u0644\u0629",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-145",
    "categoryId": "cat-taro",
    "name": "\u0628\u0644\u0648 \u0628\u064A\u0631\u064A",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-146",
    "categoryId": "cat-taro",
    "name": "\u0645\u0627\u062A\u0634\u0627",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-147",
    "categoryId": "cat-dessert",
    "name": "\u0645\u0648\u0633 \u062C\u0644\u0627\u0643\u0633\u064A",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-148",
    "categoryId": "cat-dessert",
    "name": "\u0645\u0648\u0633 \u0643\u064A\u0646\u062F\u0631",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-149",
    "categoryId": "cat-dessert",
    "name": "\u0643\u064A\u0646\u062F\u0631 \u0643\u064A\u0643",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-150",
    "categoryId": "cat-dessert",
    "name": "\u0645\u0648\u0633 \u0631\u0648\u0634\u064A\u0629",
    "price": 140,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-151",
    "categoryId": "cat-dessert",
    "name": "\u0631\u0648\u0634\u064A\u0629 \u0641\u0627\u062F\u062C",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-152",
    "categoryId": "cat-dessert",
    "name": "\u0646\u0648\u062A\u064A\u0644\u0627 \u0643\u064A\u0643",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-153",
    "categoryId": "cat-dessert",
    "name": "\u0641\u0627\u0646\u062A\u0627\u0632\u064A\u0627",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-154",
    "categoryId": "cat-dessert",
    "name": "\u0645\u064A\u062C\u0627 \u062F\u0648\u0631",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-155",
    "categoryId": "cat-dessert",
    "name": "\u0634\u0648\u0643\u0644\u062A \u0628\u0633\u062A\u0627\u0634\u064A\u0648",
    "price": 140,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-156",
    "categoryId": "cat-dessert",
    "name": "\u0646\u0648\u062A\u064A\u0644\u0627 \u062F\u0628\u064A",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-157",
    "categoryId": "cat-dessert",
    "name": "\u0643\u0648\u0643\u064A \u0628\u0627\u064A",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-158",
    "categoryId": "cat-dessert",
    "name": "\u0643\u0627\u0631\u0648\u062A \u0643\u064A\u0643",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-159",
    "categoryId": "cat-dessert",
    "name": "\u0631\u064A\u062F \u0641\u0644\u0641\u062A",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-160",
    "categoryId": "cat-dessert",
    "name": "\u062A\u0634\u064A\u0632 \u0643\u064A\u0643",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-161",
    "categoryId": "cat-dessert",
    "name": "\u0633\u0627\u0646 \u0633\u0628\u0627\u0633\u062A\u064A\u0627\u0646",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-162",
    "categoryId": "cat-dessert",
    "name": "\u0645\u0648\u0644\u062A\u0646 \u0643\u064A\u0643",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-163",
    "categoryId": "cat-dessert",
    "name": "\u0628\u0631\u0627\u0648\u0646\u064A\u0632",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-164",
    "categoryId": "cat-dessert",
    "name": "\u0627\u0643\u0644\u064A\u0631",
    "price": 85,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-165",
    "categoryId": "cat-toast",
    "name": "\u0645\u064A\u0643\u0633 \u062A\u0634\u064A\u0632",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-166",
    "categoryId": "cat-toast",
    "name": "\u0628\u0633\u0637\u0631\u0645\u0629",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-167",
    "categoryId": "cat-toast",
    "name": "\u0633\u0645\u0648\u0643 \u062A\u0631\u0643\u064A",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-168",
    "categoryId": "cat-toast",
    "name": "\u0633\u0645\u0648\u0643 \u0628\u064A\u0641",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-169",
    "categoryId": "cat-toast",
    "name": "\u0643\u0641\u064A\u0627\u0631 \u0631\u0648\u0645\u064A",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-170",
    "categoryId": "cat-croissant",
    "name": "\u0645\u064A\u0643\u0633 \u062A\u0634\u064A\u0632",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-171",
    "categoryId": "cat-croissant",
    "name": "\u0628\u0633\u0637\u0631\u0645\u0629",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-172",
    "categoryId": "cat-croissant",
    "name": "\u0633\u0645\u0648\u0643 \u062A\u0631\u0643\u064A",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-173",
    "categoryId": "cat-croissant",
    "name": "\u0633\u0645\u0648\u0643 \u0628\u064A\u0641",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-174",
    "categoryId": "cat-croissant",
    "name": "\u0645\u064A\u0643\u0633 \u0634\u0648\u0643\u0644\u062A",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-175",
    "categoryId": "cat-croissant",
    "name": "\u0633\u0627\u062F\u0629",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-176",
    "categoryId": "cat-cold-cuts",
    "name": "\u0631\u0633\u062A\u0648 \u0631\u0648\u0645\u064A",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-177",
    "categoryId": "cat-cold-cuts",
    "name": "\u0631\u0648\u0632 \u0628\u064A\u0641",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-178",
    "categoryId": "cat-cold-cuts",
    "name": "\u0633\u0645\u0648\u0643 \u0633\u0627\u0644\u0645\u0648\u0646",
    "price": 220,
    "description": "",
    "image": "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-179",
    "categoryId": "cat-wraps",
    "name": "\u0645\u064A\u0643\u0633 \u062A\u0634\u064A\u0632",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-180",
    "categoryId": "cat-wraps",
    "name": "\u0628\u0633\u0637\u0631\u0645\u0629",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-181",
    "categoryId": "cat-wraps",
    "name": "\u0633\u0645\u0648\u0643 \u062A\u0631\u0643\u064A",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-182",
    "categoryId": "cat-wraps",
    "name": "\u0633\u0645\u0648\u0643 \u0628\u064A\u0641",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-183",
    "categoryId": "cat-extras",
    "name": "\u0641\u0644\u064A\u0641\u0631",
    "price": 25,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-184",
    "categoryId": "cat-extras",
    "name": "\u0645\u0643\u0633\u0631\u0627\u062A",
    "price": 30,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-185",
    "categoryId": "cat-extras",
    "name": "\u0627\u064A\u0633 \u0643\u0631\u064A\u0645",
    "price": 25,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-186",
    "categoryId": "cat-extras",
    "name": "\u0628\u0648\u0628\u0627",
    "price": 30,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-187",
    "categoryId": "cat-extras",
    "name": "\u0628\u0630\u0648\u0631 \u0627\u0644\u0631\u064A\u062D\u0627\u0646",
    "price": 25,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  }
];
var initialTables = Array.from({ length: 12 }, (_, i) => ({
  tableNumber: i + 1,
  name: `\u0637\u0627\u0648\u0644\u0629 ${i + 1}`,
  capacity: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
  section: i < 4 ? "\u0627\u0644\u0635\u0627\u0644\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629" : i < 8 ? "\u0627\u0644\u062A\u0631\u0627\u0633 \u0627\u0644\u062E\u0627\u0631\u062C\u064A" : "\u0642\u0633\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u0627\u062A VIP",
  status: "available"
}));
var initialCustomers = [
  {
    id: "cust-1",
    name: "\u0623\u062D\u0645\u062F \u0645\u062D\u0645\u0648\u062F",
    phone: "01012345678",
    notes: "\u0639\u0645\u064A\u0644 \u0645\u0645\u064A\u0632 \u062F\u0627\u0626\u0645 - \u064A\u0641\u0636\u0644 \u0627\u0644\u0642\u0647\u0648\u0629 \u0628\u062F\u0648\u0646 \u0633\u0643\u0631",
    lastTable: 1,
    totalOrders: 6,
    totalSpent: 850,
    lastVisit: new Date(Date.now() - 2 * 864e5).toISOString(),
    createdAt: new Date(Date.now() - 30 * 864e5).toISOString(),
    favoriteItemName: "\u0627\u064A\u0633 \u0627\u0633\u0628\u0627\u0646\u0634 \u0644\u0627\u062A\u064A\u0647",
    favoriteItemId: "c-cold",
    favoriteOrderCount: 5,
    discountEligible: false,
    customDiscountRate: 0
  },
  {
    id: "cust-2",
    name: "\u0633\u0627\u0631\u0629 \u062E\u0627\u0644\u062F",
    phone: "01123456789",
    notes: "\u062A\u0641\u0636\u0644 \u0627\u0644\u062C\u0644\u0648\u0633 \u0641\u064A \u0627\u0644\u062A\u0631\u0627\u0633 \u0627\u0644\u062E\u0627\u0631\u062C\u064A",
    lastTable: 4,
    totalOrders: 3,
    totalSpent: 420,
    lastVisit: new Date(Date.now() - 5 * 864e5).toISOString(),
    createdAt: new Date(Date.now() - 20 * 864e5).toISOString(),
    favoriteItemName: "\u0648\u0627\u0641\u0644 \u0644\u0648\u062A\u0633 \u0628\u0644\u062C\u064A\u0643\u064A",
    favoriteItemId: "c-waffle",
    favoriteOrderCount: 3,
    discountEligible: false,
    customDiscountRate: 0
  }
];
var initialBanners = [
  {
    id: "b1",
    title: "\u0639\u0631\u0636 \u0627\u0644\u0641\u0637\u0648\u0631 \u0627\u0644\u0635\u0628\u0627\u062D\u064A \u0627\u0644\u0631\u0627\u0642\u064A \u2615\u{1F950}",
    subtitle: "\u0643\u0631\u0648\u0627\u0633\u0648\u0646 \u0637\u0627\u0632\u062C + \u0643\u0627\u0628\u062A\u0634\u064A\u0646\u0648 \u0625\u064A\u0637\u0627\u0644\u064A \u0628\u062E\u0635\u0645 20% \u0637\u0648\u0627\u0644 \u0641\u062A\u0631\u0629 \u0627\u0644\u0635\u0628\u0627\u062D",
    image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    active: true,
    badgeText: "\u0639\u0631\u0636 \u0627\u0644\u0635\u0628\u0627\u062D",
    mealTime: "breakfast",
    scheduleEnabled: true,
    scheduleStartTime: "06:00",
    scheduleEndTime: "12:00",
    autoHideOutsideSchedule: true
  },
  {
    id: "b2",
    title: "\u0645\u0647\u0631\u062C\u0627\u0646 \u0627\u0644\u062D\u0644\u0648\u064A\u0627\u062A \u0648\u0627\u0644\u0648\u0627\u0641\u0644 \u0627\u0644\u0628\u0644\u062C\u064A\u0643\u064A \u{1F9C7}",
    subtitle: "\u0627\u0637\u0644\u0628 2 \u0648\u0627\u0641\u0644 \u0646\u0648\u062A\u064A\u0644\u0627 \u0623\u0648 \u0644\u0648\u062A\u0633 \u0648\u0627\u062D\u0635\u0644 \u0639\u0644\u0649 \u0642\u0647\u0648\u0629 \u0645\u062C\u0627\u0646\u064A\u0629 \u0623\u0648 \u0645\u0634\u0631\u0648\u0628 \u0635\u0648\u062F\u0627 \u0645\u0646\u0639\u0634.",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80",
    active: true,
    badgeText: "\u0643\u0648\u0645\u0628\u0648 \u0627\u0644\u0623\u0633\u0628\u0648\u0639",
    mealTime: "all",
    scheduleEnabled: false
  },
  {
    id: "b3",
    title: "\u0639\u0635\u0627\u0626\u0631 \u0648\u0633\u0645\u0648\u0630\u064A \u0627\u0644\u0641\u0648\u0627\u0643\u0647 \u0627\u0644\u0637\u0627\u0632\u062C\u0629 \u{1F353}",
    subtitle: "\u0627\u0646\u062A\u0639\u0627\u0634 \u0637\u0628\u064A\u0639\u064A 100% \u0628\u062F\u0648\u0646 \u0625\u0636\u0627\u0641\u0627\u062A \u0633\u0643\u0631\u064A\u0629 - \u062A\u0634\u0643\u064A\u0644\u0629 \u0639\u0635\u0627\u0626\u0631 \u0627\u0644\u0645\u0648\u0633\u0645 \u0627\u0644\u0645\u0645\u064A\u0632\u0629.",
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1200&q=80",
    active: true,
    badgeText: "\u0627\u0646\u062A\u0639\u0627\u0634 \u0627\u0644\u0635\u064A\u0641",
    mealTime: "lunch",
    scheduleEnabled: true,
    scheduleStartTime: "12:00",
    scheduleEndTime: "18:00",
    autoHideOutsideSchedule: true
  }
];
var initialPopupAd = {
  id: "p1",
  title: "\u0623\u0647\u0644\u0627\u064B \u0628\u0643 \u0641\u064A \u0643\u0627\u0641\u064A\u0647\u0646\u0627 \u0627\u0644\u0631\u0627\u0642\u064A",
  content: "\u0627\u0633\u062A\u0645\u062A\u0639 \u0628\u0623\u062C\u0645\u0644 \u0627\u0644\u0623\u062C\u0648\u0627\u0621 \u0648\u0623\u0644\u0630 \u0627\u0644\u0645\u0634\u0631\u0648\u0628\u0627\u062A \u0648\u0627\u0644\u0648\u062C\u0628\u0627\u062A. \u062A\u0635\u0641\u062D \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0648\u0627\u0637\u0644\u0628 \u0645\u0628\u0627\u0634\u0631\u0629 \u0645\u0646 \u0637\u0627\u0648\u0644\u062A\u0643.",
  image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
  active: true,
  buttonText: "\u062A\u0635\u0641\u062D \u0627\u0644\u0645\u0646\u064A\u0648 \u0627\u0644\u0622\u0646"
};
var initialSettings = {
  systemName: "Smart Caf\xE9 & Resto",
  systemNameEn: "Smart Caf\xE9 & Resto",
  systemSubtitle: "\u0646\u0638\u0627\u0645 \u0627\u0644\u0645\u0646\u064A\u0648 \u0627\u0644\u0630\u0643\u064A \u0644\u0644\u0637\u0627\u0648\u0644\u0627\u062A",
  systemSubtitleEn: "Smart Table Menu System",
  logoUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=200&q=80",
  coverImageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1400&q=80",
  adminSoundVolume: 0.9,
  clientSoundVolume: 0.8,
  adminSoundType: "chime",
  clientSoundType: "bell",
  soundNotificationMode: "all",
  billSoundEnabled: true,
  orderSoundEnabled: true,
  billSoundType: "bill",
  qrTableEnforced: true,
  qrMode: "per_table",
  bannerEnabled: true,
  popupAdEnabled: true,
  adminUsername: "admin",
  adminPassword: "admin123",
  adminPin: "1234",
  currencySymbol: "\u062C.\u0645",
  taxEnabled: true,
  taxRate: 14,
  loyaltyDiscountEnabled: false,
  loyaltyDiscountRate: 0,
  loyaltyMinOrders: 0,
  enableReviews: false,
  promptReviewAfterBill: false,
  reviewPromptTitle: "\u0634\u0627\u0631\u0643\u0646\u0627 \u0631\u0623\u064A\u0643 \u0641\u064A \u062A\u062C\u0631\u0628\u062A\u0643 \u0627\u0644\u064A\u0648\u0645!",
  reviewPromptSubtitle: "\u064A\u0633\u0639\u062F\u0646\u0627 \u0645\u0639\u0631\u0641\u0629 \u0631\u0623\u064A\u0643 \u0641\u064A \u0627\u0644\u0623\u0637\u0628\u0627\u0642 \u0648\u0627\u0644\u062E\u062F\u0645\u0629 \u0628\u064A\u0646\u0645\u0627 \u064A\u0642\u0648\u0645 \u0627\u0644\u0648\u064A\u062A\u0631 \u0628\u062A\u062C\u0647\u064A\u0632 \u0627\u0644\u0634\u064A\u0643 \u0644\u0643",
  reviewShowFoodRating: false,
  reviewShowServiceRating: false,
  reviewShowPlaceRating: false,
  reviewRequireComment: false,
  autoApproveReviews: false,
  profitMargin: 65,
  showVipCustomerBanner: true,
  pushNotificationsEnabled: false,
  pushAdminNewOrder: false,
  pushAdminBillRequest: false,
  pushAdminWaiterCall: false,
  pushClientOrderStatus: false,
  pushClientBillSettled: false,
  requireCustomerName: false,
  enableCustomerData: true,
  singleActiveSessionEnabled: false,
  lockOnFirstOrderOnly: false,
  autoReleaseOnExit: false,
  showPopularSection: true,
  customBrowserTitle: "Smart Menu System - \u0646\u0638\u0627\u0645 \u0627\u0644\u0645\u0646\u064A\u0648 \u0627\u0644\u0630\u0643\u064A",
  customFaviconUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=200&q=80",
  adminPageTitle: "\u0644\u0648\u062D\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0648\u0627\u0644\u062A\u062D\u0643\u0645 - Smart Caf\xE9",
  adminFaviconUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=200&q=80",
  menuPageTitle: "Smart Caf\xE9 & Resto - \u0627\u0644\u0645\u0646\u064A\u0648 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A",
  menuFaviconUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=200&q=80",
  defaultLanguage: "ar",
  allowDirectTableSelection: true,
  allowTakeawayOrder: false,
  developerPassword: "1234",
  socialLinks: {
    enabled: true,
    whatsapp: "201000000000",
    instagram: "https://instagram.com",
    facebook: "https://facebook.com",
    tiktok: "https://tiktok.com",
    snapchat: "",
    phone: "01000000000",
    locationUrl: "https://maps.google.com",
    website: ""
  },
  developerRights: {
    enabled: true,
    developerName: "\u0645\u062D\u0645\u0648\u062F \u0627\u0644\u0639\u0641\u0648\u0631\u064A",
    developerTitle: "\u0645\u0647\u0646\u062F\u0633 \u0628\u0631\u0645\u062C\u064A\u0627\u062A \u0648\u0645\u0637\u0648\u0631 \u0623\u0646\u0638\u0645\u0629 \u0630\u0643\u064A\u0629 \u0633\u062D\u0627\u0628\u064A\u0629",
    developerAvatar: "",
    developerBio: "\u062A\u0637\u0648\u064A\u0631 \u0648\u062A\u0635\u0645\u064A\u0645 \u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u0633\u062D\u0627\u0628\u064A\u0629 \u0627\u0644\u0645\u062A\u0642\u062F\u0645\u0629 \u0648\u0645\u0646\u0635\u0627\u062A \u0627\u0644\u0645\u0646\u064A\u0648 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A\u0629 \u0644\u0644\u0645\u0637\u0627\u0639\u0645 \u0648\u0627\u0644\u0643\u0627\u0641\u064A\u0647\u0627\u062A \u0628\u0623\u062D\u062F\u062B \u0627\u0644\u062A\u0642\u0646\u064A\u0627\u062A \u0627\u0644\u0633\u0631\u064A\u0639\u0629 \u0648\u0627\u0644\u0645\u0633\u062A\u0642\u0631\u0629.",
    developerNote: "\u0645\u062A\u0627\u062D \u0644\u062A\u0646\u0641\u064A\u0630 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0627\u0644\u0628\u0631\u0645\u062C\u064A\u0629 \u0627\u0644\u0645\u062E\u0635\u0635\u0629\u060C \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0648\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0627\u0644\u0633\u062D\u0627\u0628\u064A\u0629 \u0627\u0644\u062D\u062F\u064A\u062B\u0629.",
    developerWhatsApp: "01000000000",
    developerPhone: "01000000000",
    developerWebsite: "",
    developerGithub: "",
    developerLinkedin: "",
    developerEmail: "mahmoud.eliafory115@gmail.com",
    developerPassword: "1234",
    copyrightText: "\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0642 \u0645\u062D\u0641\u0648\u0638\u0629 \xA9 2026 - \u062A\u0645 \u0627\u0644\u062A\u0637\u0648\u064A\u0631 \u0628\u0648\u0627\u0633\u0637\u0629 \u0627\u0644\u0645\u0647\u0646\u062F\u0633 \u0645\u062D\u0645\u0648\u062F \u0627\u0644\u0639\u0641\u0648\u0631\u064A"
  },
  themeSettings: {
    preset: "classic-cafe",
    primaryColor: "#3D271D",
    accentColor: "#D4A373",
    backgroundColor: "#FAF7F2",
    cardBgColor: "#FFFFFF",
    textColor: "#2D1E18"
  }
};
var initialSystemLogs = [];
var initialCoupons = [
  {
    id: "coup-1",
    code: "WELCOME10",
    discountType: "percentage",
    discountValue: 10,
    minOrderAmount: 100,
    maxDiscountAmount: 50,
    active: true,
    usageCount: 12
  },
  {
    id: "coup-2",
    code: "SAVE20",
    discountType: "fixed",
    discountValue: 20,
    minOrderAmount: 80,
    active: true,
    usageCount: 5
  }
];
var LocalStore = class {
  getStorage(key, fallback) {
    try {
      if (typeof window !== "undefined" && window.__INITIAL_DATA__ && window.__INITIAL_DATA__[key] !== void 0 && window.__INITIAL_DATA__[key] !== null) {
        return window.__INITIAL_DATA__[key];
      }
      const syncItem = localStorage.getItem(`smart_menu_sync_${key}`);
      if (syncItem) {
        const parsed2 = JSON.parse(syncItem);
        const raw = parsed2 && parsed2.data !== void 0 ? parsed2.data : parsed2;
        if (raw !== null && raw !== void 0) return raw;
      }
      const item = localStorage.getItem(`smart_menu_${key}`);
      if (!item) return fallback;
      const parsed = JSON.parse(item);
      if (parsed === null || parsed === void 0) return fallback;
      if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
      return parsed;
    } catch {
      return fallback;
    }
  }
  setStorage(key, value) {
    try {
      localStorage.setItem(`smart_menu_${key}`, JSON.stringify(value));
      localStorage.setItem(`smart_menu_sync_${key}`, JSON.stringify({ data: value, senderId: "local-store", t: Date.now() }));
      if (typeof window !== "undefined") {
        if (!window.__INITIAL_DATA__) window.__INITIAL_DATA__ = {};
        window.__INITIAL_DATA__[key] = value;
      }
      window.dispatchEvent(new CustomEvent("smart_menu_update", { detail: { key } }));
    } catch (e) {
      console.error("Storage error:", e);
    }
  }
};
var dbStore = new LocalStore();

// server.ts
dotenv.config();
var app = express();
var PORT = 3e3;
var httpServer = http.createServer(app);
var io = new SocketServer(httpServer, {
  cors: { origin: "*" }
});
io.on("connection", (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  socket.on("sync_request", (key) => {
    if (key === "all" || !key) {
      for (const [k, data] of Object.entries(syncStore)) {
        if (data !== void 0) {
          socket.emit("sync_update", { key: k, data, timestamp: Date.now() });
        }
      }
    } else if (syncStore[key] !== void 0) {
      socket.emit("sync_update", { key, data: syncStore[key], timestamp: Date.now() });
    }
  });
  socket.on("sync_write", (payload) => {
    if (!payload || !payload.key || payload.data === void 0) return;
    const { key, data, senderId } = payload;
    if (key === "orders" && Array.isArray(data)) {
      const normalizedOrders = data.map(normalizeOrderBackend).filter(Boolean).sort((a, b) => {
        const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
        const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
        return timeB - timeA;
      });
      syncStore["orders"] = normalizedOrders;
    } else if (key === "bill_requests" && Array.isArray(data)) {
      syncStore["bill_requests"] = data;
    } else {
      syncStore[key] = data;
    }
    saveDataToDisk();
    saveKeyToMongo(key, syncStore[key]).catch(() => {
    });
    broadcastSync(key, syncStore[key], senderId);
  });
  socket.on("order_create", (orderData) => {
    if (!orderData) return;
    const orderId = orderData.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newOrder = normalizeOrderBackend({
      ...orderData,
      id: orderId,
      status: orderData.status || "pending",
      createdAt: orderData.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      timestamp: orderData.timestamp || Date.now()
    });
    const existingOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];
    const filtered = existingOrders.filter((o) => o.id !== orderId);
    const updatedOrders = [newOrder, ...filtered];
    syncStore["orders"] = updatedOrders;
    saveDataToDisk();
    saveSingleOrderToMongo(newOrder).catch(() => {
    });
    saveKeyToMongo("orders", updatedOrders).catch(() => {
    });
    broadcastSync("orders", updatedOrders, orderData.senderId);
    try {
      const settings = syncStore["settings"] || {};
      if (settings.pushAdminNewOrder !== false) {
        const isTakeaway = Number(newOrder.tableNumber) === 0;
        const tableLabel = isTakeaway ? "\u0637\u0644\u0628 \u0633\u0641\u0631\u064A (Takeaway)" : `\u0637\u0627\u0648\u0644\u0629 #${newOrder.tableNumber}`;
        sendPushToAdmins({
          title: `\u{1F6CE}\uFE0F \u0637\u0644\u0628 \u062C\u062F\u064A\u062F - ${tableLabel}`,
          body: `\u0627\u0644\u0642\u064A\u0645\u0629: ${newOrder.total} \u062C.\u0645`,
          tag: `order-${newOrder.id}`
        }).catch(() => {
        });
      }
    } catch (e) {
    }
  });
  socket.on("disconnect", (reason) => {
    if (reason !== "transport close" && reason !== "client namespace disconnect") {
      console.log(`[Socket.IO] Connection gracefully closed for ${socket.id}: ${reason}`);
    }
  });
});
app.use(express.json({ limit: "25mb" }));
var syncStore = {};
var sseClients = /* @__PURE__ */ new Set();
function broadcastSync(key, data, senderId) {
  const finalSenderId = senderId || "server-api";
  const payloadStr = JSON.stringify({ key, data, senderId: finalSenderId, timestamp: Date.now() });
  const eventPayload = `data: ${payloadStr}

`;
  for (const client2 of sseClients) {
    try {
      client2.write(eventPayload);
    } catch (e) {
      sseClients.delete(client2);
    }
  }
  io.emit("sync_update", { key, data, senderId: finalSenderId, timestamp: Date.now() });
}
var DATA_FILE = path.join(process.cwd(), "data_store.json");
function normalizeOrderBackend(order) {
  if (!order || typeof order !== "object") return null;
  const rawItems = Array.isArray(order.items) ? order.items : [];
  const normalizedItems = rawItems.map((ci, idx) => {
    const rawMenuItem = ci && typeof ci === "object" ? ci.menuItem || {} : {};
    const id = String(rawMenuItem.id || ci?.menuItemId || ci?.id || `item_${idx}`);
    const name = rawMenuItem.name || ci?.name || "\u0635\u0646\u0641";
    const nameEn = rawMenuItem.nameEn || ci?.nameEn || "";
    const price = typeof rawMenuItem.price === "number" ? rawMenuItem.price : typeof ci?.price === "number" ? ci.price : 0;
    const categoryId = rawMenuItem.categoryId || ci?.categoryId || "";
    return {
      menuItem: {
        id,
        name,
        nameEn,
        price,
        image: "",
        // Strip images completely from order items to keep sync ultra-light and fast
        categoryId,
        available: rawMenuItem.available ?? true,
        calories: rawMenuItem.calories
      },
      quantity: typeof ci?.quantity === "number" && ci.quantity > 0 ? ci.quantity : 1,
      notes: ci?.notes || ci?.note || ""
    };
  });
  const tNum = typeof order.tableNumber === "number" ? order.tableNumber : parseInt(order.tableNumber, 10) || 1;
  return {
    ...order,
    id: String(order.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
    tableNumber: tNum,
    items: normalizedItems,
    total: typeof order.total === "number" ? order.total : normalizedItems.reduce((s, it) => s + it.menuItem.price * it.quantity, 0),
    status: order.status || "pending",
    createdAt: order.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
    timestamp: order.timestamp || Date.now(),
    billRequested: Boolean(order.billRequested),
    billRequestedAt: order.billRequestedAt
  };
}
function cleanTakeawayData() {
  const currentOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];
  const now = Date.now();
  if (Array.isArray(syncStore["bill_requests"])) {
    syncStore["bill_requests"] = syncStore["bill_requests"].filter((b) => {
      if (Number(b.tableNumber) === 0) return false;
      const hasActive = currentOrders.some((o) => Number(o.tableNumber) === Number(b.tableNumber) && o.status !== "completed" && o.status !== "cancelled" && !o.settled);
      return b.status === "pending" && b.totalAmount > 0 && hasActive;
    });
  }
  if (Array.isArray(syncStore["tables"])) {
    syncStore["tables"] = syncStore["tables"].filter((t) => Number(t.tableNumber) !== 0).map((t) => {
      const hasActive = currentOrders.some((o) => Number(o.tableNumber) === Number(t.tableNumber) && o.status !== "completed" && o.status !== "cancelled" && !o.settled);
      const isLive = t.lastActiveHeartbeat && now - t.lastActiveHeartbeat < 6e4;
      if (!hasActive && !isLive) {
        return {
          ...t,
          status: "available",
          billRequested: false,
          billRequestedAt: void 0,
          currentOrderId: void 0,
          activeSessionDeviceId: void 0,
          activeSessionCustomerName: void 0,
          lastActiveHeartbeat: void 0,
          tableDelivered: false
        };
      }
      return t;
    });
  }
  initMongoDB().then((db2) => {
    if (db2) {
      db2.collection("tables").deleteMany({ tableNumber: 0 }).catch(() => {
      });
      db2.collection("bill_requests").deleteMany({ tableNumber: 0 }).catch(() => {
      });
    }
  }).catch(() => {
  });
}
var diskSaveTimer = null;
function saveDataToDisk() {
  if (diskSaveTimer) clearTimeout(diskSaveTimer);
  diskSaveTimer = setTimeout(() => {
    try {
      const dataStr = JSON.stringify(syncStore);
      fs.writeFile(DATA_FILE, dataStr, "utf-8", (err) => {
        if (err) console.warn("[Server DB] Async save to disk error:", err);
      });
    } catch (e) {
      console.warn("[Server DB] Save to disk error:", e);
    }
  }, 100);
}
function seedDefaultsIfEmpty() {
  let modified = false;
  if (syncStore["categories"] === void 0 || syncStore["categories"] === null) {
    syncStore["categories"] = initialCategories;
    modified = true;
  }
  if (syncStore["menu_items"] === void 0 || syncStore["menu_items"] === null) {
    syncStore["menu_items"] = initialMenuItems;
    modified = true;
  }
  if (!Array.isArray(syncStore["tables"])) {
    syncStore["tables"] = initialTables;
    modified = true;
  }
  if (!syncStore["settings"] || typeof syncStore["settings"] !== "object" || Object.keys(syncStore["settings"]).length === 0) {
    syncStore["settings"] = initialSettings;
    modified = true;
  }
  if (syncStore["banners"] === void 0 || syncStore["banners"] === null) {
    syncStore["banners"] = initialBanners;
    modified = true;
  }
  if (syncStore["popup_ad"] === void 0 || syncStore["popup_ad"] === null) {
    syncStore["popup_ad"] = initialPopupAd;
    modified = true;
  }
  if (syncStore["coupons"] === void 0 || syncStore["coupons"] === null) {
    syncStore["coupons"] = initialCoupons;
    modified = true;
  }
  if (!Array.isArray(syncStore["system_logs"])) {
    syncStore["system_logs"] = initialSystemLogs;
    modified = true;
  }
  if (!Array.isArray(syncStore["customers"])) {
    syncStore["customers"] = initialCustomers;
    modified = true;
  }
  if (!Array.isArray(syncStore["orders"])) {
    syncStore["orders"] = [];
    modified = true;
  }
  if (!Array.isArray(syncStore["bill_requests"])) {
    syncStore["bill_requests"] = [];
    modified = true;
  }
  if (modified) {
    saveDataToDisk();
    console.log("[Server DB] Automatically hydrated and seeded default menu collections into store.");
    initMongoDB().then((database) => {
      if (database) {
        for (const [k, v] of Object.entries(syncStore)) {
          saveKeyToMongo(k, v).catch(() => {
          });
        }
      }
    }).catch(() => {
    });
  }
}
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.orders)) {
      parsed.orders = parsed.orders.map(normalizeOrderBackend).filter(Boolean);
    }
    Object.assign(syncStore, parsed);
    cleanTakeawayData();
    console.log("[Server DB] Loaded persisted data from disk");
  }
} catch (e) {
  console.warn("[Server DB] Could not load data from disk:", e);
}
seedDefaultsIfEmpty();
seedDefaultsIfEmpty();
if (!syncStore["vapid_keys"] || !syncStore["vapid_keys"].publicKey || !syncStore["vapid_keys"].privateKey) {
  try {
    const keys = webpush.generateVAPIDKeys();
    syncStore["vapid_keys"] = keys;
    saveDataToDisk();
    console.log("[Push] Generated new VAPID keys for Web Push");
  } catch (e) {
    console.error("[Push] Failed to generate VAPID keys:", e);
  }
}
if (syncStore["vapid_keys"]?.publicKey && syncStore["vapid_keys"]?.privateKey) {
  try {
    webpush.setVapidDetails(
      "mailto:admin@smartmenu.local",
      syncStore["vapid_keys"].publicKey,
      syncStore["vapid_keys"].privateKey
    );
    console.log("[Push] VAPID details configured successfully");
  } catch (err) {
    console.warn("[Push] Failed to set VAPID details:", err);
  }
}
if (!Array.isArray(syncStore["push_admin_subscriptions"])) {
  syncStore["push_admin_subscriptions"] = [];
}
if (!Array.isArray(syncStore["push_client_subscriptions"])) {
  syncStore["push_client_subscriptions"] = [];
}
async function sendPushToAdmins(payload) {
  try {
    const settings = syncStore["settings"] || {};
    if (settings.pushNotificationsEnabled === false) return 0;
    const adminSubs = Array.isArray(syncStore["push_admin_subscriptions"]) ? syncStore["push_admin_subscriptions"] : [];
    if (adminSubs.length === 0) return 0;
    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icon.svg",
      badge: "/icon.svg",
      tag: payload.tag || `admin-alert-${Date.now()}`,
      vibrate: payload.vibrate || [350, 150, 350, 150, 400],
      data: payload.data || { url: "/?tab=orders" },
      requireInteraction: true
    });
    const deadEndpoints = [];
    let sentCount = 0;
    await Promise.all(
      adminSubs.map(async (subItem) => {
        try {
          if (!subItem?.subscription?.endpoint) return;
          await webpush.sendNotification(subItem.subscription, pushPayload);
          sentCount++;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            deadEndpoints.push(subItem.subscription.endpoint);
          } else {
            console.warn("[Push Admin Error]:", err?.message || err);
          }
        }
      })
    );
    if (deadEndpoints.length > 0) {
      syncStore["push_admin_subscriptions"] = adminSubs.filter(
        (s) => !deadEndpoints.includes(s.subscription.endpoint)
      );
      saveDataToDisk();
    }
    return sentCount;
  } catch (err) {
    console.warn("[Push Admin Global Error]:", err);
    return 0;
  }
}
async function sendPushToClients(tableNumber, orderId, payload) {
  try {
    const settings = syncStore["settings"] || {};
    if (settings.pushNotificationsEnabled === false) return 0;
    const clientSubs = Array.isArray(syncStore["push_client_subscriptions"]) ? syncStore["push_client_subscriptions"] : [];
    const targetSubs = clientSubs.filter((subItem) => {
      if (orderId && subItem.orderId === orderId) return true;
      if (tableNumber !== void 0 && Number(subItem.tableNumber) === Number(tableNumber)) return true;
      return false;
    });
    if (targetSubs.length === 0) return 0;
    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icon.svg",
      badge: "/icon.svg",
      tag: payload.tag || `client-alert-${Date.now()}`,
      vibrate: payload.vibrate || [300, 150, 300, 150, 300],
      data: payload.data || { url: "/" },
      requireInteraction: true
    });
    const deadEndpoints = [];
    let sentCount = 0;
    await Promise.all(
      targetSubs.map(async (subItem) => {
        try {
          if (!subItem?.subscription?.endpoint) return;
          await webpush.sendNotification(subItem.subscription, pushPayload);
          sentCount++;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            deadEndpoints.push(subItem.subscription.endpoint);
          } else {
            console.warn("[Push Client Error]:", err?.message || err);
          }
        }
      })
    );
    if (deadEndpoints.length > 0) {
      syncStore["push_client_subscriptions"] = clientSubs.filter(
        (s) => !deadEndpoints.includes(s.subscription.endpoint)
      );
      saveDataToDisk();
    }
    return sentCount;
  } catch (err) {
    console.warn("[Push Client Global Error]:", err);
    return 0;
  }
}
initMongoDB().then(async (database) => {
  if (database) {
    const mongoData = await loadInitialFromMongo();
    if (mongoData && Object.keys(mongoData).length > 0) {
      if (Array.isArray(mongoData.orders)) {
        mongoData.orders = mongoData.orders.map(normalizeOrderBackend).filter(Boolean);
      }
      Object.assign(syncStore, mongoData);
      cleanTakeawayData();
      saveDataToDisk();
      console.log("[MongoDB] Hydrated store from MongoDB Atlas");
    } else {
      console.log("[MongoDB] Initializing MongoDB collections from current store...");
      for (const [key, data] of Object.entries(syncStore)) {
        saveKeyToMongo(key, data).catch(() => {
        });
      }
    }
  }
}).catch((err) => {
  console.warn("[MongoDB] Background init error:", err);
});
app.get("/api/mongodb-status", async (req, res) => {
  try {
    const status = await getMongoStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to check MongoDB status" });
  }
});
app.post("/api/mongodb-sync-now", async (req, res) => {
  try {
    const database = await initMongoDB();
    if (!database) {
      return res.status(503).json({
        success: false,
        message: "MongoDB Atlas is not configured or reachable. Operating in Hybrid Local Persistence mode."
      });
    }
    for (const [key, data] of Object.entries(syncStore)) {
      await saveKeyToMongo(key, data);
    }
    res.json({
      success: true,
      message: "\u062A\u0645\u062A \u0645\u0632\u0627\u0645\u0646\u0629 \u062C\u0645\u064A\u0639 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0639 MongoDB Atlas \u0628\u0646\u062C\u0627\u062D",
      keysSynced: Object.keys(syncStore).length
    });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Sync failed" });
  }
});
app.post("/api/orders", async (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0646\u0634\u0627\u0621 \u0637\u0644\u0628 \u0641\u0627\u0631\u063A \u0628\u062F\u0648\u0646 \u0623\u0635\u0646\u0627\u0641" });
    }
    const orderId = body.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newOrder = normalizeOrderBackend({
      ...body,
      id: orderId,
      status: body.status || "pending",
      createdAt: body.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      timestamp: body.timestamp || Date.now()
    });
    const existingOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];
    const filtered = existingOrders.filter((o) => o.id !== orderId);
    const updatedOrders = [newOrder, ...filtered];
    syncStore["orders"] = updatedOrders;
    saveDataToDisk();
    res.status(201).json({ success: true, orderId: newOrder.id, order: newOrder, orders: updatedOrders });
    broadcastSync("orders", updatedOrders);
    saveSingleOrderToMongo(newOrder).catch(() => {
    });
    saveKeyToMongo("orders", updatedOrders).catch(() => {
    });
    try {
      const settings = syncStore["settings"] || {};
      if (settings.pushAdminNewOrder !== false) {
        const isTakeaway = Number(newOrder.tableNumber) === 0;
        const tableLabel = isTakeaway ? "\u0637\u0644\u0628 \u0633\u0641\u0631\u064A (Takeaway)" : `\u0637\u0627\u0648\u0644\u0629 #${newOrder.tableNumber}`;
        const itemsSummary = Array.isArray(newOrder.items) && newOrder.items.length > 0 ? newOrder.items.map((i) => `${i.quantity}x ${i.menuItem?.name || "\u0635\u0646\u0641"}`).slice(0, 3).join("\u060C ") : "\u0637\u0644\u0628 \u062C\u062F\u064A\u062F";
        sendPushToAdmins({
          title: `\u{1F6CE}\uFE0F \u0637\u0644\u0628 \u062C\u062F\u064A\u062F - ${tableLabel}`,
          body: `\u0627\u0644\u0642\u064A\u0645\u0629: ${newOrder.total} \u062C.\u0645 \u2022 (${itemsSummary})`,
          tag: `order-${newOrder.id}`,
          data: { url: `/?tab=orders`, orderId: newOrder.id, tableNumber: newOrder.tableNumber }
        }).catch(() => {
        });
      }
    } catch (e) {
    }
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: error?.message || "Failed to place order" });
  }
});
app.get("/api/orders", async (req, res) => {
  try {
    const memoryOrders = (syncStore["orders"] || []).map(normalizeOrderBackend).filter(Boolean);
    const map = /* @__PURE__ */ new Map();
    for (const o of memoryOrders) {
      if (o && o.id) map.set(String(o.id), o);
    }
    try {
      const mongoOrders = await getAllOrdersFromMongo();
      if (mongoOrders && Array.isArray(mongoOrders) && mongoOrders.length > 0) {
        let changed = false;
        for (const o of mongoOrders) {
          if (o && o.id) {
            const norm = normalizeOrderBackend(o);
            if (norm) {
              const key = String(norm.id);
              const existing = map.get(key);
              if (!existing) {
                map.set(key, norm);
                changed = true;
              } else {
                const timeExisting = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
                const timeMongo = new Date(norm.updatedAt || norm.createdAt || 0).getTime();
                if (norm.status !== existing.status || norm.billRequested !== existing.billRequested || timeMongo > timeExisting) {
                  map.set(key, { ...existing, ...norm });
                  changed = true;
                }
              }
            }
          }
        }
        if (changed) {
          const combined = Array.from(map.values()).sort((a, b) => {
            const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
            const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
            return timeB - timeA;
          });
          syncStore["orders"] = combined;
          saveDataToDisk();
          broadcastSync("orders", combined, "server-api");
        }
      }
    } catch (mErr) {
    }
    const finalOrders = Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
      const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
      return timeB - timeA;
    });
    res.json(finalOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    const orders = (syncStore["orders"] || []).map(normalizeOrderBackend).filter(Boolean);
    res.json(orders);
  }
});
app.get("/api/orders/status", async (req, res) => {
  try {
    const orders = (syncStore["orders"] || []).map(normalizeOrderBackend).filter(Boolean);
    const tableParam = req.query.table ? Number(req.query.table) : null;
    const sinceParam = req.query.since ? Number(req.query.since) : null;
    let filtered = orders;
    if (tableParam !== null && !isNaN(tableParam)) {
      filtered = filtered.filter((o) => Number(o.tableNumber) === tableParam);
    }
    if (sinceParam !== null && !isNaN(sinceParam)) {
      filtered = filtered.filter((o) => {
        const time = new Date(o.updatedAt || o.createdAt || o.timestamp || 0).getTime();
        return time > sinceParam;
      });
    }
    const statuses = filtered.map((o) => ({
      id: o.id,
      tableNumber: o.tableNumber,
      status: o.status || "pending",
      total: o.total || 0,
      itemsCount: Array.isArray(o.items) ? o.items.length : 0,
      updatedAt: o.updatedAt || o.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      timestamp: o.timestamp || Date.now()
    }));
    res.json({
      timestamp: Date.now(),
      count: statuses.length,
      orders: statuses
    });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to fetch order statuses" });
  }
});
app.get("/api/bills", async (req, res) => {
  try {
    const memoryBills = Array.isArray(syncStore["bill_requests"]) ? syncStore["bill_requests"] : [];
    const map = /* @__PURE__ */ new Map();
    for (const b of memoryBills) {
      if (b && b.id) map.set(String(b.id), b);
    }
    try {
      const mongoBills = await getAllBillsFromMongo();
      if (mongoBills && Array.isArray(mongoBills) && mongoBills.length > 0) {
        let changed = false;
        for (const b of mongoBills) {
          if (b && b.id) {
            const existing = map.get(String(b.id));
            if (!existing) {
              map.set(String(b.id), b);
              changed = true;
            } else if (b.status !== existing.status || b.settledAt !== existing.settledAt) {
              map.set(String(b.id), { ...existing, ...b });
              changed = true;
            }
          }
        }
        if (changed) {
          const combined = Array.from(map.values()).sort((a, b) => {
            const timeA = new Date(a.requestedAt || 0).getTime();
            const timeB = new Date(b.requestedAt || 0).getTime();
            return timeB - timeA;
          });
          syncStore["bill_requests"] = combined;
          saveDataToDisk();
          broadcastSync("bill_requests", combined, "server-api");
        }
      }
    } catch (e) {
    }
    const finalBills = Array.from(map.values()).filter((b) => Number(b.tableNumber) !== 0).sort((a, b) => {
      const timeA = new Date(a.requestedAt || 0).getTime();
      const timeB = new Date(b.requestedAt || 0).getTime();
      return timeB - timeA;
    });
    res.json(finalBills);
  } catch (err) {
    res.json([]);
  }
});
app.post("/api/bills", async (req, res) => {
  try {
    const body = req.body;
    if (!body || body.tableNumber === void 0) return res.status(400).json({ error: "tableNumber is required" });
    const tableNum = Number(body.tableNumber);
    if (tableNum === 0 || isNaN(tableNum)) {
      return res.status(400).json({ error: "Takeaway orders do not support bill requests" });
    }
    const billId = body.id || `bill_${tableNum}_${Date.now()}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const newBill = {
      id: billId,
      tableNumber: tableNum,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      deviceId: body.deviceId,
      requestedAt: body.requestedAt || nowIso,
      status: body.status || "pending",
      totalAmount: body.totalAmount,
      itemsCount: body.itemsCount,
      notes: body.notes
    };
    const existingBills = Array.isArray(syncStore["bill_requests"]) ? syncStore["bill_requests"] : [];
    const filtered = existingBills.filter((b) => !(Number(b.tableNumber) === tableNum && b.status === "pending"));
    const updatedBills = [newBill, ...filtered];
    syncStore["bill_requests"] = updatedBills;
    saveDataToDisk();
    saveKeyToMongo("bill_requests", updatedBills).catch(() => {
    });
    broadcastSync("bill_requests", updatedBills);
    res.status(201).json({ success: true, bill: newBill });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to create bill" });
  }
});
app.patch("/api/bills/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, settledAt } = req.body;
    const existingBills = Array.isArray(syncStore["bill_requests"]) ? syncStore["bill_requests"] : [];
    const updatedBills = existingBills.map((b) => {
      if (b.id === id || String(b.tableNumber) === id) {
        return { ...b, status: status || b.status, settledAt: settledAt || (/* @__PURE__ */ new Date()).toISOString() };
      }
      return b;
    });
    syncStore["bill_requests"] = updatedBills;
    saveDataToDisk();
    saveKeyToMongo("bill_requests", updatedBills).catch(() => {
    });
    broadcastSync("bill_requests", updatedBills);
    res.json({ success: true, bills: updatedBills });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to update bill" });
  }
});
app.patch("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const existingOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];
    let found = false;
    let updatedOrderObj = null;
    const updatedOrders = existingOrders.map((o) => {
      if (o.id === id) {
        found = true;
        updatedOrderObj = { ...o, status, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
        return updatedOrderObj;
      }
      return o;
    });
    if (!found) {
      const mongoOrders = await getAllOrdersFromMongo();
      if (mongoOrders) {
        const mongoFound = mongoOrders.find((o) => o.id === id);
        if (mongoFound) {
          updatedOrderObj = { ...mongoFound, status, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
          await saveSingleOrderToMongo(updatedOrderObj);
          const newOrdersList = mongoOrders.map((o) => o.id === id ? updatedOrderObj : o);
          syncStore["orders"] = newOrdersList;
          saveDataToDisk();
          saveKeyToMongo("orders", newOrdersList).catch(() => {
          });
          broadcastSync("orders", newOrdersList);
          return res.json({ success: true, orderId: id, status });
        }
      }
      return res.status(404).json({ error: "Order not found" });
    }
    syncStore["orders"] = updatedOrders;
    saveDataToDisk();
    try {
      const settings = syncStore["settings"] || {};
      if (settings.pushClientOrderStatus !== false && updatedOrderObj) {
        const tNum = updatedOrderObj.tableNumber;
        if (status === "preparing") {
          sendPushToClients(tNum, updatedOrderObj.id, {
            title: "\u{1F373} \u0627\u0644\u0645\u0631\u062D\u0644\u0629 1: \u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0637\u0644\u0628\u0643 \u0648\u0628\u062F\u0623 \u0627\u0644\u062A\u062D\u0636\u064A\u0631!",
            body: "\u0627\u0644\u0645\u0637\u0628\u062E \u0648\u0627\u0644\u0634\u064A\u0641 \u064A\u0642\u0648\u0645\u0648\u0646 \u0627\u0644\u0622\u0646 \u0628\u062A\u062C\u0647\u064A\u0632 \u0637\u0644\u0628\u0643 \u0628\u0639\u0646\u0627\u064A\u0629\u060C \u0633\u0646\u0631\u0633\u0644 \u0644\u0643 \u0625\u0634\u0639\u0627\u0631\u0627\u064B \u0641\u0648\u0631 \u062A\u0633\u0644\u064A\u0645\u0647",
            tag: `order-status-${updatedOrderObj.id}`,
            data: { url: `/?trackOrder=${updatedOrderObj.id}&table=${tNum}` }
          }).catch(() => {
          });
        } else if (status === "delivered") {
          sendPushToClients(tNum, updatedOrderObj.id, {
            title: "\u{1F37D}\uFE0F \u0627\u0644\u0645\u0631\u062D\u0644\u0629 2: \u062A\u0645 \u062A\u062C\u0647\u064A\u0632 \u0637\u0644\u0628\u0643 \u0648\u062A\u0633\u0644\u064A\u0645\u0647!",
            body: "\u0637\u0644\u0628\u0643 \u0623\u0635\u0628\u062D \u0639\u0644\u0649 \u0637\u0627\u0648\u0644\u062A\u0643 \u0627\u0644\u0622\u0646\u060C \u0628\u0627\u0644\u0647\u0646\u0627\u0621 \u0648\u0627\u0644\u0634\u0641\u0627\u0621 \u0646\u062A\u0645\u0646\u0649 \u0644\u0643 \u0648\u0642\u062A\u0627\u064B \u0645\u0645\u062A\u0639\u0627\u064B",
            tag: `order-status-${updatedOrderObj.id}`,
            data: { url: `/?trackOrder=${updatedOrderObj.id}&table=${tNum}` }
          }).catch(() => {
          });
        }
      }
    } catch (e) {
    }
    if (status === "delivered") {
      const orderTableNum = Number(updatedOrderObj?.tableNumber);
      if (orderTableNum >= 0) {
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        const currentTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
        const newTables = currentTables.map((t) => {
          if (Number(t.tableNumber) === orderTableNum) {
            return {
              ...t,
              tableDelivered: true,
              deliveredAt: nowIso
            };
          }
          return t;
        });
        syncStore["tables"] = newTables;
        saveKeyToMongo("tables", newTables).catch(() => {
        });
        broadcastSync("tables", newTables);
      }
    }
    if (status === "completed" || status === "cancelled") {
      const orderTableNum = Number(updatedOrderObj?.tableNumber);
      if (orderTableNum >= 0) {
        const remainingActive = updatedOrders.filter(
          (o) => Number(o.tableNumber) === orderTableNum && o.status !== "completed" && o.status !== "cancelled"
        );
        const currentTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
        const tableObj = currentTables.find((t) => Number(t.tableNumber) === orderTableNum);
        if (remainingActive.length === 0 && (!tableObj || !tableObj.billRequested && tableObj.status !== "bill_requested")) {
          const nowIso = (/* @__PURE__ */ new Date()).toISOString();
          const newTables = currentTables.map((t) => {
            if (Number(t.tableNumber) === orderTableNum) {
              return {
                ...t,
                status: "available",
                billRequested: false,
                billRequestedAt: void 0,
                tableDelivered: false,
                deliveredAt: void 0,
                activeSessionDeviceId: void 0,
                activeSessionCustomerName: void 0,
                currentOrderId: void 0,
                settledAt: nowIso
              };
            }
            return t;
          });
          syncStore["tables"] = newTables;
          saveKeyToMongo("tables", newTables).catch(() => {
          });
          broadcastSync("tables", newTables);
        }
      }
    }
    res.json({ success: true, orderId: id, status, orders: updatedOrders });
    broadcastSync("orders", updatedOrders);
    if (updatedOrderObj) {
      saveSingleOrderToMongo(updatedOrderObj).catch(() => {
      });
    }
    saveKeyToMongo("orders", updatedOrders).catch(() => {
    });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
});
app.delete("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existingOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];
    const updatedOrders = existingOrders.filter((o) => o.id !== id);
    syncStore["orders"] = updatedOrders;
    saveDataToDisk();
    await deleteOrderFromMongo(id);
    saveKeyToMongo("orders", updatedOrders).catch(() => {
    });
    broadcastSync("orders", updatedOrders);
    res.json({ success: true, deletedOrderId: id });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ error: "Failed to delete order" });
  }
});
app.post("/api/orders/clear", async (req, res) => {
  try {
    syncStore["orders"] = [];
    syncStore["bill_requests"] = [];
    saveDataToDisk();
    try {
      const db2 = await initMongoDB();
      if (db2) {
        await db2.collection("orders").deleteMany({});
        await db2.collection("sync_store").updateOne(
          { key: "orders" },
          { $set: { data: [], updatedAt: /* @__PURE__ */ new Date() } },
          { upsert: true }
        );
        await db2.collection("sync_store").updateOne(
          { key: "bill_requests" },
          { $set: { data: [], updatedAt: /* @__PURE__ */ new Date() } },
          { upsert: true }
        );
      }
    } catch (mErr) {
      console.warn("MongoDB clear error:", mErr);
    }
    broadcastSync("orders", []);
    broadcastSync("bill_requests", []);
    res.json({ success: true, message: "\u062A\u0645 \u0645\u0633\u062D \u0648\u062A\u0635\u0641\u064A\u0631 \u0643\u0627\u0641\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0628\u0646\u062C\u0627\u062D" });
  } catch (error) {
    console.error("Error clearing orders:", error);
    res.status(500).json({ error: "Failed to clear orders" });
  }
});
app.get("/api/menu", async (req, res) => {
  try {
    const mongoVal = await getKeyFromMongo("menu_items");
    const menu = mongoVal || syncStore["menu_items"] || [];
    res.json(menu);
  } catch {
    res.json(syncStore["menu_items"] || []);
  }
});
app.post("/api/menu", async (req, res) => {
  try {
    const items = req.body;
    syncStore["menu_items"] = items;
    saveDataToDisk();
    await saveKeyToMongo("menu_items", items);
    broadcastSync("menu_items", items);
    res.json({ success: true, count: Array.isArray(items) ? items.length : 1 });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to update menu" });
  }
});
app.get("/api/categories", async (req, res) => {
  try {
    const mongoVal = await getKeyFromMongo("categories");
    const categories = mongoVal || syncStore["categories"] || [];
    res.json(categories);
  } catch {
    res.json(syncStore["categories"] || []);
  }
});
app.post("/api/categories", async (req, res) => {
  try {
    const categories = req.body;
    syncStore["categories"] = categories;
    saveDataToDisk();
    await saveKeyToMongo("categories", categories);
    broadcastSync("categories", categories);
    res.json({ success: true, count: Array.isArray(categories) ? categories.length : 1 });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to update categories" });
  }
});
app.get("/api/tables", async (req, res) => {
  try {
    const mongoVal = await getKeyFromMongo("tables");
    const tables = mongoVal || syncStore["tables"] || [];
    res.json(tables);
  } catch {
    res.json(syncStore["tables"] || []);
  }
});
app.post("/api/tables", async (req, res) => {
  try {
    const tables = req.body;
    syncStore["tables"] = tables;
    saveDataToDisk();
    await saveKeyToMongo("tables", tables);
    broadcastSync("tables", tables);
    res.json({ success: true, count: Array.isArray(tables) ? tables.length : 1 });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to update tables" });
  }
});
app.get("/api/customers", async (req, res) => {
  try {
    const mongoVal = await getKeyFromMongo("customers");
    const customers = mongoVal || syncStore["customers"] || [];
    res.json(customers);
  } catch {
    res.json(syncStore["customers"] || []);
  }
});
app.post("/api/customers", async (req, res) => {
  try {
    const customers = req.body;
    syncStore["customers"] = customers;
    saveDataToDisk();
    await saveKeyToMongo("customers", customers);
    broadcastSync("customers", customers);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to update customers" });
  }
});
app.get("/api/settings", async (req, res) => {
  try {
    const mongoVal = await getKeyFromMongo("settings");
    const settings = mongoVal || syncStore["settings"] || {};
    res.json(settings);
  } catch {
    res.json(syncStore["settings"] || {});
  }
});
app.post("/api/settings", async (req, res) => {
  try {
    const settings = req.body;
    syncStore["settings"] = settings;
    saveDataToDisk();
    await saveKeyToMongo("settings", settings);
    broadcastSync("settings", settings);
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to update settings" });
  }
});
app.get("/api/bootstrap", async (req, res) => {
  seedDefaultsIfEmpty();
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json({
    success: true,
    store: syncStore,
    timestamp: Date.now()
  });
});
app.get("/api/sync-all", async (req, res) => {
  seedDefaultsIfEmpty();
  res.json({ success: true, store: syncStore, data: syncStore, timestamp: Date.now() });
});
app.post("/api/restore-default-menu", async (req, res) => {
  try {
    syncStore["categories"] = initialCategories;
    syncStore["menu_items"] = initialMenuItems;
    syncStore["banners"] = initialBanners;
    syncStore["popup_ad"] = initialPopupAd;
    syncStore["settings"] = initialSettings;
    syncStore["tables"] = initialTables;
    syncStore["coupons"] = initialCoupons;
    syncStore["system_logs"] = initialSystemLogs;
    saveDataToDisk();
    await saveKeyToMongo("categories", initialCategories);
    await saveKeyToMongo("menu_items", initialMenuItems);
    await saveKeyToMongo("banners", initialBanners);
    await saveKeyToMongo("popup_ad", initialPopupAd);
    await saveKeyToMongo("settings", initialSettings);
    await saveKeyToMongo("tables", initialTables);
    await saveKeyToMongo("coupons", initialCoupons);
    await saveKeyToMongo("system_logs", initialSystemLogs);
    broadcastSync("categories", initialCategories);
    broadcastSync("menu_items", initialMenuItems);
    broadcastSync("banners", initialBanners);
    broadcastSync("popup_ad", initialPopupAd);
    broadcastSync("settings", initialSettings);
    broadcastSync("tables", initialTables);
    broadcastSync("coupons", initialCoupons);
    broadcastSync("system_logs", initialSystemLogs);
    res.json({
      success: true,
      message: "\u062A\u0645\u062A \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0648\u0628\u0646\u0627\u0621 \u0643\u0627\u0641\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u064A\u0648 \u0648\u0627\u0644\u0642\u0648\u0627\u0626\u0645 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629 \u0628\u0646\u062C\u0627\u062D!",
      categoriesCount: initialCategories.length,
      menuItemsCount: initialMenuItems.length
    });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Restore failed" });
  }
});
app.post("/api/reset-data", async (req, res) => {
  try {
    syncStore["orders"] = [];
    const db2 = await initMongoDB();
    if (db2) {
      await db2.collection("orders").deleteMany({});
    }
    const cleanTables = Array.from({ length: 12 }, (_, i) => ({
      tableNumber: i + 1,
      name: `\u0637\u0627\u0648\u0644\u0629 ${i + 1}`,
      capacity: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
      section: i < 4 ? "\u0627\u0644\u0635\u0627\u0644\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629" : i < 8 ? "\u0627\u0644\u062A\u0631\u0627\u0633 \u0627\u0644\u062E\u0627\u0631\u062C\u064A" : "\u0642\u0633\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u0627\u062A VIP",
      status: "available"
    }));
    syncStore["tables"] = cleanTables;
    syncStore["system_logs"] = [
      {
        id: `log-reset-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        category: "system",
        level: "success",
        message: "\u062A\u0645\u062A \u062A\u0647\u064A\u0626\u0629 \u0648\u0627\u0633\u062A\u0628\u062F\u0627\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D \u062A\u0627\u0645",
        messageEn: "Data cleanly reset and replaced",
        actor: "\u0627\u0644\u0645\u062F\u064A\u0631",
        details: "\u062A\u0645 \u062A\u0641\u0631\u064A\u063A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u0648\u062A\u062D\u0631\u064A\u0631 \u0643\u0627\u0641\u0629 \u0627\u0644\u0637\u0627\u0648\u0644\u0627\u062A"
      }
    ];
    saveDataToDisk();
    await saveKeyToMongo("orders", []);
    await saveKeyToMongo("tables", cleanTables);
    await saveKeyToMongo("system_logs", syncStore["system_logs"]);
    for (const key of ["orders", "tables", "system_logs"]) {
      const payload = `data: ${JSON.stringify({ key, data: syncStore[key], timestamp: Date.now() })}

`;
      for (const client2 of sseClients) {
        try {
          client2.write(payload);
        } catch (e) {
          sseClients.delete(client2);
        }
      }
    }
    res.json({ success: true, message: "\u062A\u0645\u062A \u062A\u0647\u064A\u0626\u0629 \u0648\u0627\u0633\u062A\u0628\u062F\u0627\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D" });
  } catch (error) {
    console.error("Error resetting data:", error);
    res.status(500).json({ error: error?.message || "Failed to reset data" });
  }
});
app.get("/api/sync/:key", async (req, res) => {
  const { key } = req.params;
  try {
    if (key === "orders") {
      const inMemoryOrders = (syncStore["orders"] || []).map(normalizeOrderBackend).filter(Boolean);
      const map = /* @__PURE__ */ new Map();
      for (const o of inMemoryOrders) {
        if (o && o.id) map.set(String(o.id), o);
      }
      try {
        const mongoOrders = await getAllOrdersFromMongo();
        if (mongoOrders && Array.isArray(mongoOrders)) {
          for (const o of mongoOrders) {
            if (o && o.id) {
              const norm = normalizeOrderBackend(o);
              if (norm) {
                const k = String(norm.id);
                const existing = map.get(k);
                if (!existing) {
                  map.set(k, norm);
                } else {
                  const timeExisting = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
                  const timeMongo = new Date(norm.updatedAt || norm.createdAt || 0).getTime();
                  if (norm.status !== existing.status || norm.billRequested !== existing.billRequested || timeMongo > timeExisting) {
                    map.set(k, { ...existing, ...norm });
                  }
                }
              }
            }
          }
        }
      } catch (mErr) {
      }
      const combined = Array.from(map.values()).sort((a, b) => {
        const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
        const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
        return timeB - timeA;
      });
      syncStore["orders"] = combined;
      return res.json({ key, data: combined, timestamp: Date.now() });
    } else if (key === "bill_requests") {
      const inMemoryBills = Array.isArray(syncStore["bill_requests"]) ? syncStore["bill_requests"] : [];
      const map = /* @__PURE__ */ new Map();
      for (const b of inMemoryBills) {
        if (b && b.id) map.set(String(b.id), b);
      }
      try {
        const mongoBills = await getAllBillsFromMongo();
        if (mongoBills && Array.isArray(mongoBills)) {
          for (const b of mongoBills) {
            if (b && b.id) {
              const existing = map.get(String(b.id));
              if (!existing) {
                map.set(String(b.id), b);
              } else if (b.status !== existing.status || b.settledAt !== existing.settledAt) {
                map.set(String(b.id), { ...existing, ...b });
              }
            }
          }
        }
      } catch (e) {
      }
      const combinedBills = Array.from(map.values()).filter((b) => Number(b.tableNumber) !== 0).sort((a, b) => {
        const timeA = new Date(a.requestedAt || 0).getTime();
        const timeB = new Date(b.requestedAt || 0).getTime();
        return timeB - timeA;
      });
      syncStore["bill_requests"] = combinedBills;
      return res.json({ key, data: combinedBills, timestamp: Date.now() });
    } else if (key === "tables") {
      const inMemoryTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
      return res.json({ key, data: inMemoryTables, timestamp: Date.now() });
    } else {
      const mongoVal = await getKeyFromMongo(key);
      if (mongoVal !== null && mongoVal !== void 0) {
        syncStore[key] = mongoVal;
        return res.json({ key, data: mongoVal, timestamp: Date.now() });
      }
    }
  } catch (e) {
  }
  const data = syncStore[key] ?? null;
  res.json({ key, data, timestamp: Date.now() });
});
app.post("/api/sync/:key", async (req, res) => {
  const { key } = req.params;
  const { data, senderId } = req.body;
  if (data !== void 0) {
    if (key === "orders" && Array.isArray(data)) {
      const normalizedOrders = data.map(normalizeOrderBackend).filter(Boolean).sort((a, b) => {
        const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
        const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
        return timeB - timeA;
      });
      syncStore["orders"] = normalizedOrders;
    } else if (key === "bill_requests" && Array.isArray(data)) {
      const existingBills = Array.isArray(syncStore["bill_requests"]) ? syncStore["bill_requests"] : [];
      const billMap = /* @__PURE__ */ new Map();
      for (const b of existingBills) {
        if (b && b.id) billMap.set(String(b.id), b);
      }
      for (const incomingB of data) {
        if (!incomingB || !incomingB.id) continue;
        const keyId = String(incomingB.id);
        const existing = billMap.get(keyId);
        if (!existing) {
          if (Number(incomingB.tableNumber) !== 0) {
            billMap.set(keyId, incomingB);
          }
        } else {
          if (existing.status === "settled" && incomingB.status !== "settled") {
          } else {
            const mergedTotal = typeof incomingB.totalAmount === "number" && !isNaN(incomingB.totalAmount) && incomingB.totalAmount > 0 ? incomingB.totalAmount : existing.totalAmount || 0;
            billMap.set(keyId, { ...existing, ...incomingB, totalAmount: mergedTotal });
          }
        }
      }
      syncStore["bill_requests"] = Array.from(billMap.values()).filter((b) => Number(b.tableNumber) !== 0);
    } else if (key === "tables" && Array.isArray(data)) {
      const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
      const currentOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];
      const allowedTableNums = new Set(existingTables.map((t) => Number(t.tableNumber)));
      const isAuthoritative = senderId === "server-api" || senderId === "admin" || req.headers["x-admin-session"] === "true";
      const filteredIncoming = isAuthoritative ? data : data.filter((t) => t && allowedTableNums.has(Number(t.tableNumber)));
      const filteredTableNums = new Set(filteredIncoming.map((t) => Number(t.tableNumber)));
      const missingTables = isAuthoritative ? [] : existingTables.filter((et) => !filteredTableNums.has(Number(et.tableNumber)));
      const fullIncomingList = [...filteredIncoming, ...missingTables];
      const mergedTables = fullIncomingList.map((incomingT) => {
        const existingT = existingTables.find((et) => Number(et.tableNumber) === Number(incomingT.tableNumber));
        if (!existingT) return incomingT;
        const tableOrders = currentOrders.filter(
          (o) => Number(o.tableNumber) === Number(incomingT.tableNumber) && o.status !== "completed" && o.status !== "cancelled"
        );
        const hasUndeliveredOrders = tableOrders.some((o) => o.status !== "delivered");
        const isExistingActive = existingT.activeSessionDeviceId && (hasUndeliveredOrders || Date.now() - (existingT.lastActiveHeartbeat || 0) < 45e3);
        if (isExistingActive && existingT.activeSessionDeviceId !== incomingT.activeSessionDeviceId) {
          return {
            ...incomingT,
            activeSessionDeviceId: existingT.activeSessionDeviceId,
            lastActiveHeartbeat: existingT.lastActiveHeartbeat,
            activeSessionCustomerName: existingT.activeSessionCustomerName,
            tableDelivered: existingT.tableDelivered,
            sessionTransferRequest: existingT.sessionTransferRequest || incomingT.sessionTransferRequest
          };
        }
        return incomingT;
      });
      syncStore["tables"] = mergedTables;
    } else {
      syncStore[key] = data;
    }
    saveDataToDisk();
    saveKeyToMongo(key, syncStore[key]).catch(() => {
    });
    broadcastSync(key, syncStore[key], senderId);
  }
  res.json({ success: true, key, data: syncStore[key], senderId, timestamp: Date.now() });
});
app.post("/api/tables/claim-session", (req, res) => {
  try {
    const { tableNumber, deviceId, customerName, isHeartbeat } = req.body;
    if (!tableNumber || !deviceId) {
      return res.status(400).json({ error: "tableNumber and deviceId are required" });
    }
    const tNum = Number(tableNumber);
    const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
    const currentOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];
    const tableIndex = existingTables.findIndex((t) => Number(t.tableNumber) === tNum);
    if (tableIndex === -1) {
      return res.status(404).json({ error: "Table not found" });
    }
    const table = existingTables[tableIndex];
    const tableOrders = currentOrders.filter(
      (o) => Number(o.tableNumber) === tNum && o.status !== "completed" && o.status !== "cancelled"
    );
    const hasUndeliveredOrders = tableOrders.some((o) => o.status !== "delivered");
    const isHolderAlive = table.activeSessionDeviceId && (hasUndeliveredOrders || Date.now() - (table.lastActiveHeartbeat || 0) < 45e3);
    if (isHolderAlive && table.activeSessionDeviceId !== deviceId) {
      return res.json({
        success: false,
        locked: true,
        message: "\u0647\u0630\u0647 \u0627\u0644\u0637\u0627\u0648\u0644\u0629 \u0645\u062D\u062C\u0648\u0632\u0629 \u0628\u062D\u0648\u0632\u0629 \u0627\u0644\u0639\u0645\u064A\u0644 \u0627\u0644\u0623\u0648\u0644 \u0627\u0644\u0630\u064A \u062F\u062E\u0644 \u0642\u0628\u0644\u0643",
        activeDeviceId: table.activeSessionDeviceId,
        hasUndeliveredOrders
      });
    }
    if (isHeartbeat && !table.activeSessionDeviceId) {
      return res.json({
        success: true,
        locked: false,
        claimed: false,
        table
      });
    }
    const updatedTable = {
      ...table,
      activeSessionDeviceId: deviceId,
      lastActiveHeartbeat: Date.now(),
      activeSessionCustomerName: customerName || table.activeSessionCustomerName
    };
    existingTables[tableIndex] = updatedTable;
    syncStore["tables"] = existingTables;
    saveDataToDisk();
    saveKeyToMongo("tables", existingTables).catch(() => {
    });
    const eventPayload = `data: ${JSON.stringify({ key: "tables", data: existingTables, timestamp: Date.now() })}

`;
    for (const client2 of sseClients) {
      try {
        client2.write(eventPayload);
      } catch {
        sseClients.delete(client2);
      }
    }
    return res.json({
      success: true,
      locked: false,
      claimed: true,
      table: updatedTable
    });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to claim table" });
  }
});
app.post("/api/tables/heartbeat", (req, res) => {
  try {
    const { tableNumber, deviceId } = req.body;
    const tNum = Number(tableNumber);
    const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
    const tableIndex = existingTables.findIndex((t) => Number(t.tableNumber) === tNum);
    if (tableIndex === -1) return res.status(404).json({ error: "Table not found" });
    const table = existingTables[tableIndex];
    if (table.activeSessionDeviceId === deviceId) {
      table.lastActiveHeartbeat = Date.now();
      saveDataToDisk();
      return res.json({ success: true });
    }
    return res.json({ success: false, locked: Boolean(table.activeSessionDeviceId) });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Heartbeat failed" });
  }
});
app.post(["/api/tables/release-session", "/api/tables/settle-bill"], async (req, res) => {
  try {
    const { tableNumber, all } = req.body;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
    const existingOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];
    if (all === true || tableNumber === -1) {
      const cleanTables = existingTables.map((t) => ({
        ...t,
        status: "available",
        currentOrderId: void 0,
        seatedAt: void 0,
        activeSessionDeviceId: void 0,
        activeSessionCustomerName: void 0,
        firstOrderAt: void 0,
        lastActiveHeartbeat: void 0,
        billRequestedAt: void 0,
        billRequested: false,
        tableDelivered: false,
        deliveredAt: void 0,
        sessionTransferRequest: void 0,
        settledAt: nowIso
      }));
      syncStore["tables"] = cleanTables;
      const updatedOrders = existingOrders.map((o) => {
        if (o.status !== "cancelled" && !o.settled) {
          return { ...o, status: "completed", checkSent: true, settled: true, settledAt: nowIso };
        }
        return o;
      });
      syncStore["orders"] = updatedOrders;
      const existingBills = Array.isArray(syncStore["bill_requests"]) ? syncStore["bill_requests"] : [];
      const settledBills = existingBills.map((b) => {
        if (b.status !== "settled") {
          return {
            ...b,
            id: `bill_table_${b.tableNumber}_settled_${Date.now()}`,
            status: "settled",
            settledAt: nowIso
          };
        }
        return b;
      });
      syncStore["bill_requests"] = settledBills;
      saveDataToDisk();
      saveKeyToMongo("tables", cleanTables).catch(() => {
      });
      saveKeyToMongo("orders", updatedOrders).catch(() => {
      });
      saveKeyToMongo("bill_requests", settledBills).catch(() => {
      });
      broadcastSync("tables", cleanTables, "server-api");
      broadcastSync("orders", updatedOrders, "server-api");
      broadcastSync("bill_requests", settledBills, "server-api");
      return res.json({ success: true, message: "All tables released and settled" });
    }
    const tNum = Number(tableNumber);
    const updatedTables = existingTables.map((t) => {
      if (Number(t.tableNumber) === tNum) {
        return {
          ...t,
          status: "available",
          currentOrderId: void 0,
          seatedAt: void 0,
          activeSessionDeviceId: void 0,
          activeSessionCustomerName: void 0,
          firstOrderAt: void 0,
          lastActiveHeartbeat: void 0,
          billRequestedAt: void 0,
          billRequested: false,
          tableDelivered: false,
          deliveredAt: void 0,
          sessionTransferRequest: void 0,
          settledAt: nowIso
        };
      }
      return t;
    });
    syncStore["tables"] = updatedTables;
    const updatedOrdersSingle = existingOrders.map((o) => {
      if (Number(o.tableNumber) === tNum && o.status !== "cancelled" && !o.settled) {
        return { ...o, status: "completed", checkSent: true, settled: true, settledAt: nowIso };
      }
      return o;
    });
    syncStore["orders"] = updatedOrdersSingle;
    const existingBillsSingle = Array.isArray(syncStore["bill_requests"]) ? syncStore["bill_requests"] : [];
    const updatedBills = existingBillsSingle.map((b) => {
      if (Number(b.tableNumber) === tNum && b.status !== "settled") {
        return {
          ...b,
          id: `bill_table_${tNum}_settled_${Date.now()}`,
          status: "settled",
          settledAt: nowIso
        };
      }
      return b;
    });
    syncStore["bill_requests"] = updatedBills;
    saveDataToDisk();
    saveKeyToMongo("tables", updatedTables).catch(() => {
    });
    saveKeyToMongo("orders", updatedOrdersSingle).catch(() => {
    });
    saveKeyToMongo("bill_requests", updatedBills).catch(() => {
    });
    broadcastSync("tables", updatedTables, "server-api");
    broadcastSync("orders", updatedOrdersSingle, "server-api");
    broadcastSync("bill_requests", updatedBills, "server-api");
    try {
      const settings = syncStore["settings"] || {};
      if (settings.pushClientBillSettled !== false) {
        sendPushToClients(tNum, void 0, {
          title: "\u{1F4B3} \u062A\u0645 \u062A\u0633\u0648\u064A\u0629 \u0627\u0644\u062D\u0633\u0627\u0628 \u0628\u0646\u062C\u0627\u062D",
          body: "\u0633\u0639\u062F\u0646\u0627 \u0628\u062E\u062F\u0645\u062A\u0643\u0645 \u0641\u064A \u0645\u0637\u0639\u0645\u0646\u0627! \u0646\u062A\u0645\u0646\u0649 \u0644\u0643\u0645 \u064A\u0648\u0645\u0627\u064B \u0633\u0639\u064A\u062F\u0627\u064B \u0648\u0646\u0646\u062A\u0638\u0631 \u0632\u064A\u0627\u0631\u062A\u0643\u0645 \u0645\u062C\u062F\u062F\u0627\u064B",
          tag: `bill-settled-${tNum}`,
          data: { url: "/" }
        }).catch(() => {
        });
      }
    } catch (e) {
    }
    return res.json({ success: true, tableNumber: tNum, settled: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to release table" });
  }
});
app.post("/api/tables/add", async (req, res) => {
  try {
    const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
    const tableNums = existingTables.map((t) => Number(t.tableNumber) || 0);
    const nextTableNumber = tableNums.length > 0 ? Math.max(...tableNums) + 1 : 1;
    const newTable = { tableNumber: nextTableNumber, status: "available" };
    const updated = [...existingTables, newTable];
    syncStore["tables"] = updated;
    saveDataToDisk();
    saveKeyToMongo("tables", updated).catch(() => {
    });
    broadcastSync("tables", updated, "server-api");
    res.json({ success: true, tables: updated });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to add table" });
  }
});
app.post("/api/tables/delete", async (req, res) => {
  try {
    const { tableNumber } = req.body;
    const tNum = Number(tableNumber);
    const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
    const updated = existingTables.filter((t) => Number(t.tableNumber) !== tNum);
    syncStore["tables"] = updated;
    console.log(`[Server] Deleting table ${tNum}, remaining tables: ${updated.length}`);
    saveDataToDisk();
    await deleteTableFromMongo(tNum);
    saveKeyToMongo("tables", updated).catch(() => {
    });
    broadcastSync("tables", updated, "server-api");
    res.json({ success: true, tables: updated });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to delete table" });
  }
});
app.post("/api/tables/request-bill", async (req, res) => {
  try {
    const { tableNumber, deviceId, customerName } = req.body;
    const tNum = Number(tableNumber);
    if (tNum === 0 || isNaN(tNum)) {
      return res.json({ success: false, message: "Takeaway orders do not support bill requests" });
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
    let tableFound = false;
    const updatedTables = existingTables.map((t) => {
      if (Number(t.tableNumber) === tNum) {
        tableFound = true;
        return {
          ...t,
          status: "bill_requested",
          billRequested: true,
          billRequestedAt: nowIso
        };
      }
      return t;
    });
    if (!tableFound) {
      updatedTables.push({
        tableNumber: tNum,
        status: "bill_requested",
        billRequested: true,
        billRequestedAt: nowIso,
        activeSessionDeviceId: deviceId,
        activeSessionCustomerName: customerName
      });
    }
    syncStore["tables"] = updatedTables;
    const existingOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];
    let hasPreparingOrders = false;
    let tableTotalAmount = 0;
    let tableItemsCount = 0;
    const updatedOrders = existingOrders.map((o) => {
      if (Number(o.tableNumber) === tNum && o.status !== "cancelled" && !o.settled) {
        if (o.status === "preparing" || o.status === "ready" || o.status === "delivered") {
          hasPreparingOrders = true;
        }
        let ordTotal = typeof o.total === "number" ? o.total : parseFloat(o.total);
        if (isNaN(ordTotal) || ordTotal <= 0) {
          if (Array.isArray(o.items)) {
            ordTotal = o.items.reduce((s, i) => {
              const rawP = i?.menuItem?.price ?? i?.price ?? 0;
              const itemPrice = typeof rawP === "number" ? rawP : parseFloat(String(rawP)) || 0;
              const qty = typeof i.quantity === "number" ? i.quantity : parseInt(String(i.quantity), 10) || 1;
              return s + itemPrice * qty;
            }, 0);
          } else {
            ordTotal = 0;
          }
        }
        tableTotalAmount += ordTotal;
        tableItemsCount += o.items?.length || 0;
        return {
          ...o,
          billRequested: true,
          billRequestedAt: nowIso
        };
      }
      return o;
    });
    syncStore["orders"] = updatedOrders;
    const passedTotal = typeof req.body?.totalAmount === "number" ? req.body.totalAmount : parseFloat(req.body?.totalAmount);
    const finalBillTotal = !isNaN(passedTotal) && passedTotal > 0 ? passedTotal : tableTotalAmount;
    if (finalBillTotal <= 0 && tableItemsCount === 0) {
      return res.json({ success: false, message: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0637\u0644\u0628\u0627\u062A \u0645\u0633\u062C\u0644\u0629 \u0644\u0647\u0630\u0647 \u0627\u0644\u0637\u0627\u0648\u0644\u0629 \u0644\u0637\u0644\u0628 \u0627\u0644\u0634\u064A\u0643" });
    }
    const existingBills = Array.isArray(syncStore["bill_requests"]) ? syncStore["bill_requests"] : [];
    const newBill = {
      id: `bill_table_${tNum}`,
      tableNumber: tNum,
      customerName,
      deviceId,
      requestedAt: nowIso,
      status: "pending",
      totalAmount: finalBillTotal,
      itemsCount: tableItemsCount
    };
    const filteredBills = existingBills.filter((b) => !(Number(b.tableNumber) === tNum && b.status === "pending"));
    const updatedBills = [newBill, ...filteredBills];
    syncStore["bill_requests"] = updatedBills;
    saveDataToDisk();
    saveKeyToMongo("tables", updatedTables).catch(() => {
    });
    saveKeyToMongo("orders", updatedOrders).catch(() => {
    });
    saveKeyToMongo("bill_requests", updatedBills).catch(() => {
    });
    saveSingleBillToMongo(newBill).catch(() => {
    });
    broadcastSync("tables", updatedTables, "server-api");
    broadcastSync("orders", updatedOrders, "server-api");
    broadcastSync("bill_requests", updatedBills, "server-api");
    try {
      const settings = syncStore["settings"] || {};
      if (settings.pushAdminBillRequest !== false) {
        sendPushToAdmins({
          title: `\u{1F9FE} \u0637\u0644\u0628 \u0627\u0644\u062D\u0633\u0627\u0628 / \u0627\u0644\u0634\u064A\u0643 - \u0637\u0627\u0648\u0644\u0629 #${tNum}`,
          body: `\u0627\u0644\u0639\u0645\u064A\u0644 \u064A\u0637\u0644\u0628 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 (\u0625\u062C\u0645\u0627\u0644\u064A: ${tableTotalAmount} \u062C.\u0645)\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0648\u062C\u0647 \u0644\u0644\u0637\u0627\u0648\u0644\u0629`,
          tag: `bill-req-${tNum}`,
          data: { url: `/?tab=tables&focusTable=${tNum}`, tableNumber: tNum }
        }).catch(() => {
        });
      }
    } catch (e) {
    }
    return res.json({
      success: true,
      tableNumber: tNum,
      status: "bill_requested",
      hasPreparingOrders
    });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to request bill" });
  }
});
app.post("/api/tables/deliver", async (req, res) => {
  try {
    const { tableNumber } = req.body;
    const tNum = Number(tableNumber);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
    const updatedTables = existingTables.map((t) => {
      if (Number(t.tableNumber) === tNum) {
        return {
          ...t,
          tableDelivered: true,
          deliveredAt: nowIso
        };
      }
      return t;
    });
    syncStore["tables"] = updatedTables;
    const existingOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];
    const updatedOrders = existingOrders.map((o) => {
      if (Number(o.tableNumber) === tNum && (o.status === "pending" || o.status === "preparing" || o.status === "ready")) {
        return {
          ...o,
          status: "delivered",
          deliveredAt: nowIso
        };
      }
      return o;
    });
    syncStore["orders"] = updatedOrders;
    saveDataToDisk();
    saveKeyToMongo("tables", updatedTables).catch(() => {
    });
    saveKeyToMongo("orders", updatedOrders).catch(() => {
    });
    broadcastSync("tables", updatedTables);
    broadcastSync("orders", updatedOrders);
    return res.json({ success: true, tableNumber: tNum, delivered: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to deliver table" });
  }
});
app.post("/api/tables/transfer-request", (req, res) => {
  try {
    const { tableNumber, requesterDeviceId, requesterCustomerName } = req.body;
    const tNum = Number(tableNumber);
    const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
    const tableIndex = existingTables.findIndex((t) => Number(t.tableNumber) === tNum);
    if (tableIndex === -1) return res.status(404).json({ error: "Table not found" });
    existingTables[tableIndex].sessionTransferRequest = {
      fromDeviceId: requesterDeviceId,
      fromCustomerName: requesterCustomerName,
      requestedAt: Date.now(),
      status: "pending"
    };
    syncStore["tables"] = existingTables;
    saveDataToDisk();
    saveKeyToMongo("tables", existingTables).catch(() => {
    });
    const eventPayload = `data: ${JSON.stringify({ key: "tables", data: existingTables, timestamp: Date.now() })}

`;
    for (const client2 of sseClients) {
      try {
        client2.write(eventPayload);
      } catch {
        sseClients.delete(client2);
      }
    }
    return res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Transfer request failed" });
  }
});
app.post("/api/tables/transfer-respond", (req, res) => {
  try {
    const { tableNumber, currentDeviceId, accept } = req.body;
    const tNum = Number(tableNumber);
    const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
    const tableIndex = existingTables.findIndex((t) => Number(t.tableNumber) === tNum);
    if (tableIndex === -1) return res.status(404).json({ error: "Table not found" });
    const table = existingTables[tableIndex];
    if (table.activeSessionDeviceId === currentDeviceId && table.sessionTransferRequest) {
      if (accept) {
        table.activeSessionDeviceId = table.sessionTransferRequest.fromDeviceId;
        table.lastActiveHeartbeat = Date.now();
        table.sessionTransferRequest.status = "accepted";
      } else {
        table.sessionTransferRequest.status = "rejected";
      }
      syncStore["tables"] = existingTables;
      saveDataToDisk();
      saveKeyToMongo("tables", existingTables).catch(() => {
      });
      const eventPayload = `data: ${JSON.stringify({ key: "tables", data: existingTables, timestamp: Date.now() })}

`;
      for (const client2 of sseClients) {
        try {
          client2.write(eventPayload);
        } catch {
          sseClients.delete(client2);
        }
      }
      return res.json({ success: true, accepted: accept });
    }
    return res.status(403).json({ error: "Unauthorized response" });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Transfer respond failed" });
  }
});
app.get("/api/push/vapid-public-key", (req, res) => {
  const publicKey = syncStore["vapid_keys"]?.publicKey;
  if (!publicKey) {
    return res.status(500).json({ error: "VAPID key not initialized" });
  }
  res.json({ publicKey });
});
app.post("/api/push/subscribe-admin", (req, res) => {
  try {
    const { subscription, deviceName } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Invalid subscription payload" });
    }
    const currentSubs = Array.isArray(syncStore["push_admin_subscriptions"]) ? syncStore["push_admin_subscriptions"] : [];
    const filtered = currentSubs.filter((s) => s.subscription?.endpoint !== subscription.endpoint);
    filtered.push({
      subscription,
      deviceName: deviceName || "\u0647\u0627\u062A\u0641 \u0627\u0644\u0623\u062F\u0645\u0646",
      subscribedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    syncStore["push_admin_subscriptions"] = filtered;
    saveDataToDisk();
    res.json({ success: true, count: filtered.length });
  } catch (e) {
    res.status(500).json({ error: e?.message });
  }
});
app.post("/api/push/unsubscribe-admin", (req, res) => {
  try {
    const { endpoint } = req.body;
    const currentSubs = Array.isArray(syncStore["push_admin_subscriptions"]) ? syncStore["push_admin_subscriptions"] : [];
    syncStore["push_admin_subscriptions"] = currentSubs.filter((s) => s.subscription?.endpoint !== endpoint);
    saveDataToDisk();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e?.message });
  }
});
app.post("/api/push/subscribe-client", (req, res) => {
  try {
    const { subscription, tableNumber, orderId, customerName } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Invalid subscription payload" });
    }
    const currentSubs = Array.isArray(syncStore["push_client_subscriptions"]) ? syncStore["push_client_subscriptions"] : [];
    const filtered = currentSubs.filter((s) => s.subscription?.endpoint !== subscription.endpoint);
    filtered.push({
      subscription,
      tableNumber: Number(tableNumber),
      orderId,
      customerName: customerName || "\u0639\u0645\u064A\u0644",
      subscribedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    syncStore["push_client_subscriptions"] = filtered;
    saveDataToDisk();
    res.json({ success: true, count: filtered.length });
  } catch (e) {
    res.status(500).json({ error: e?.message });
  }
});
app.post("/api/push/test-admin", async (req, res) => {
  try {
    const sentCount = await sendPushToAdmins({
      title: "\u{1F514} \u062A\u062C\u0631\u0628\u0629 \u0625\u0634\u0639\u0627\u0631 \u0647\u0627\u062A\u0641 \u0627\u0644\u0623\u062F\u0645\u0646",
      body: "\u062A\u062C\u0631\u0628\u0629 \u0646\u0627\u062C\u062D\u0629! \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0633\u062A\u0635\u0644 \u0625\u0644\u0649 \u0647\u0627\u062A\u0641\u0643 \u062D\u062A\u0649 \u0648\u0634\u0627\u0634\u0629 \u0627\u0644\u0647\u0627\u062A\u0641 \u0645\u0642\u0641\u0644\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u{1F4F1}\u2713",
      tag: `test-admin-${Date.now()}`,
      data: { url: "/?tab=orders" }
    });
    res.json({ success: true, sentCount });
  } catch (e) {
    res.status(500).json({ error: e?.message });
  }
});
app.post("/api/push/test-client", async (req, res) => {
  try {
    const { tableNumber } = req.body;
    const tNum = tableNumber !== void 0 ? Number(tableNumber) : void 0;
    const sentCount = await sendPushToClients(tNum, void 0, {
      title: "\u{1F37D}\uFE0F \u062A\u062C\u0631\u0628\u0629 \u0625\u0634\u0639\u0627\u0631 \u0647\u0627\u062A\u0641 \u0627\u0644\u0639\u0645\u064A\u0644",
      body: "\u062A\u062C\u0631\u0628\u0629 \u0646\u0627\u062C\u062D\u0629! \u0633\u062A\u0635\u0644\u0643 \u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062D\u0627\u0644\u0629 \u0637\u0644\u0628\u0643 \u0641\u0648\u0631\u064A\u0627\u064B \u0648\u0634\u0627\u0634\u062A\u0643 \u0645\u0642\u0641\u0644\u0629 \u2615\u2713",
      tag: `test-client-${Date.now()}`,
      data: { url: `/?table=${tNum || 1}` }
    });
    res.json({ success: true, sentCount });
  } catch (e) {
    res.status(500).json({ error: e?.message });
  }
});
app.get("/api/push/status", (req, res) => {
  const adminSubs = Array.isArray(syncStore["push_admin_subscriptions"]) ? syncStore["push_admin_subscriptions"] : [];
  const clientSubs = Array.isArray(syncStore["push_client_subscriptions"]) ? syncStore["push_client_subscriptions"] : [];
  res.json({
    adminDevicesCount: adminSubs.length,
    clientDevicesCount: clientSubs.length,
    vapidConfigured: Boolean(syncStore["vapid_keys"]?.publicKey)
  });
});
app.post("/api/call-waiter", async (req, res) => {
  try {
    const { tableNumber, customerName } = req.body;
    const tNum = Number(tableNumber);
    const settings = syncStore["settings"] || {};
    if (settings.pushAdminWaiterCall !== false) {
      sendPushToAdmins({
        title: `\u{1F514} \u0627\u0633\u062A\u062F\u0639\u0627\u0621 \u0627\u0644\u0648\u064A\u062A\u0631 - \u0637\u0627\u0648\u0644\u0629 #${tNum}`,
        body: `\u0627\u0644\u0639\u0645\u064A\u0644 (${customerName || "\u0637\u0627\u0648\u0644\u0629 " + tNum}) \u064A\u0637\u0644\u0628 \u062D\u0636\u0648\u0631 \u0627\u0644\u0648\u064A\u062A\u0631 \u0627\u0644\u0622\u0646 \u0644\u0645\u0633\u0627\u0639\u062F\u062A\u0647`,
        tag: `waiter-call-${tNum}`,
        data: { url: `/?tab=tables&focusTable=${tNum}`, tableNumber: tNum }
      }).catch(() => {
      });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e?.message });
  }
});
app.get("/api/sync-stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();
  sseClients.add(res);
  const pingInterval = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch (e) {
      clearInterval(pingInterval);
      sseClients.delete(res);
    }
  }, 15e3);
  req.on("close", () => {
    clearInterval(pingInterval);
    sseClients.delete(res);
  });
});
function getBootstrapDataScript() {
  seedDefaultsIfEmpty();
  const safeStore = {};
  const keysToInclude = [
    "settings",
    "popup_ad",
    "banners",
    "categories",
    "menu_items",
    "tables",
    "coupons",
    "customers",
    "reviews",
    "orders",
    "bill_requests"
  ];
  for (const k of keysToInclude) {
    if (syncStore[k] !== void 0) {
      safeStore[k] = syncStore[k];
    }
  }
  const serialized = JSON.stringify(safeStore).replace(/</g, "\\u003c");
  return `<script id="__INITIAL_DATA_SCRIPT__">window.__INITIAL_DATA__ = ${serialized};</script>`;
}
async function startServer() {
  try {
    const database = await initMongoDB();
    if (database) {
      const mongoData = await loadInitialFromMongo();
      if (mongoData && Object.keys(mongoData).length > 0) {
        if (Array.isArray(mongoData.orders)) {
          mongoData.orders = mongoData.orders.map(normalizeOrderBackend).filter(Boolean);
        }
        Object.assign(syncStore, mongoData);
        saveDataToDisk();
        console.log("[MongoDB] Pre-startup hydration successful");
      }
    }
  } catch (e) {
    console.warn("[MongoDB] Pre-startup hydration warning:", e);
  }
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith("/api") || url.startsWith("/socket.io") || url.startsWith("/@") || url.includes(".") && !url.endsWith(".html") && !url.includes(".html?")) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        const script = getBootstrapDataScript();
        const html = template.replace("</head>", `${script}
</head>`);
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Surrogate-Control", "no-store");
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));
    app.get("*", (req, res) => {
      try {
        let template = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
        const script = getBootstrapDataScript();
        const html = template.replace("</head>", `${script}
</head>`);
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Surrogate-Control", "no-store");
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        res.sendFile(path.join(distPath, "index.html"));
      }
    });
  }
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
