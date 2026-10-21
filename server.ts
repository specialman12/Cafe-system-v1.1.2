import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import http from "http";
import webpush from "web-push";
import { Server as SocketServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import {
  initMongoDB,
  getMongoStatus,
  loadInitialFromMongo,
  saveKeyToMongo,
  saveSingleOrderToMongo,
  saveSingleBillToMongo,
  deleteOrderFromMongo,
  deleteTableFromMongo,
  getKeyFromMongo,
  getAllOrdersFromMongo,
  getAllBillsFromMongo,
  getAllTablesFromMongo
} from "./server/mongo.ts";
import {
  initialCategories,
  initialMenuItems,
  initialTables,
  initialCustomers,
  initialBanners,
  initialPopupAd,
  initialSettings,
  initialSystemLogs,
  initialCoupons
} from "./src/lib/storeConstants.ts";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const httpServer = http.createServer(app);
const io = new SocketServer(httpServer, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Handle sync_request for single key or 'all'
  socket.on("sync_request", (key) => {
    if (key === "all" || !key) {
      for (const [k, data] of Object.entries(syncStore)) {
        if (data !== undefined) {
          socket.emit("sync_update", { key: k, data, timestamp: Date.now() });
        }
      }
    } else if (syncStore[key] !== undefined) {
      socket.emit("sync_update", { key, data: syncStore[key], timestamp: Date.now() });
    }
  });

  // Handle direct socket write from client or admin dashboard
  socket.on("sync_write", (payload: { key: string; data: any; senderId?: string }) => {
    if (!payload || !payload.key || payload.data === undefined) return;
    const { key, data, senderId } = payload;

    if (key === "orders" && Array.isArray(data)) {
      const normalizedOrders = data.map(normalizeOrderBackend).filter(Boolean).sort((a: any, b: any) => {
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
    saveKeyToMongo(key, syncStore[key]).catch(() => {});

    // Broadcast update to all connected clients and tabs
    broadcastSync(key, syncStore[key], senderId);
  });

  // Direct real-time order submission over WebSocket
  socket.on("order_create", (orderData: any) => {
    if (!orderData) return;
    const orderId = orderData.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newOrder = normalizeOrderBackend({
      ...orderData,
      id: orderId,
      status: orderData.status || "pending",
      createdAt: orderData.createdAt || new Date().toISOString(),
      timestamp: orderData.timestamp || Date.now()
    });

    const existingOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];
    const filtered = existingOrders.filter((o: any) => o.id !== orderId);
    const updatedOrders = [newOrder, ...filtered];
    syncStore["orders"] = updatedOrders;

    saveDataToDisk();
    saveSingleOrderToMongo(newOrder).catch(() => {});
    saveKeyToMongo("orders", updatedOrders).catch(() => {});

    broadcastSync("orders", updatedOrders, orderData.senderId);

    // Lock screen push notification to admins
    try {
      const settings = syncStore["settings"] || {};
      if (settings.pushAdminNewOrder !== false) {
        const isTakeaway = Number(newOrder.tableNumber) === 0;
        const tableLabel = isTakeaway ? "طلب سفري (Takeaway)" : `طاولة #${newOrder.tableNumber}`;
        sendPushToAdmins({
          title: `🛎️ طلب جديد - ${tableLabel}`,
          body: `القيمة: ${newOrder.total} ج.م`,
          tag: `order-${newOrder.id}`
        }).catch(() => {});
      }
    } catch (e) {}
  });

  socket.on("disconnect", (reason) => {
    // Graceful disconnect reporting to avoid triggering false-positive system alerts for standard page unloads
    if (reason !== "transport close" && reason !== "client namespace disconnect") {
      console.log(`[Socket.IO] Connection gracefully closed for ${socket.id}: ${reason}`);
    }
  });
});

app.use(express.json({ limit: "25mb" }));

// In-memory data store for real-time synchronization
const syncStore: Record<string, any> = {};

// SSE Clients for instant real-time broadcasts
const sseClients = new Set<express.Response>();

function broadcastSync(key: string, data: any, senderId?: string) {
  const finalSenderId = senderId || "server-api";
  const payloadStr = JSON.stringify({ key, data, senderId: finalSenderId, timestamp: Date.now() });
  const eventPayload = `data: ${payloadStr}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(eventPayload);
    } catch (e) {
      sseClients.delete(client);
    }
  }
  io.emit("sync_update", { key, data, senderId: finalSenderId, timestamp: Date.now() });
}

// File storage path for persistence across server restarts
const DATA_FILE = path.join(process.cwd(), "data_store.json");

function normalizeOrderBackend(order: any): any {
  if (!order || typeof order !== 'object') return null;
  const rawItems = Array.isArray(order.items) ? order.items : [];
  const normalizedItems = rawItems.map((ci: any, idx: number) => {
    const rawMenuItem = ci && typeof ci === 'object' ? (ci.menuItem || {}) : {};
    const id = String(rawMenuItem.id || ci?.menuItemId || ci?.id || `item_${idx}`);
    const name = rawMenuItem.name || ci?.name || 'صنف';
    const nameEn = rawMenuItem.nameEn || ci?.nameEn || '';
    const price = typeof rawMenuItem.price === 'number'
      ? rawMenuItem.price
      : (typeof ci?.price === 'number' ? ci.price : 0);
    const categoryId = rawMenuItem.categoryId || ci?.categoryId || '';

    return {
      menuItem: {
        id,
        name,
        nameEn,
        price,
        image: '', // Strip images completely from order items to keep sync ultra-light and fast
        categoryId,
        available: rawMenuItem.available ?? true,
        calories: rawMenuItem.calories
      },
      quantity: typeof ci?.quantity === 'number' && ci.quantity > 0 ? ci.quantity : 1,
      notes: ci?.notes || ci?.note || ''
    };
  });

  const tNum = typeof order.tableNumber === 'number' ? order.tableNumber : (parseInt(order.tableNumber, 10) || 1);

  return {
    ...order,
    id: String(order.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
    tableNumber: tNum,
    items: normalizedItems,
    total: typeof order.total === 'number' ? order.total : normalizedItems.reduce((s: number, it: any) => s + (it.menuItem.price * it.quantity), 0),
    status: order.status || "pending",
    createdAt: order.createdAt || new Date().toISOString(),
    timestamp: order.timestamp || Date.now(),
    billRequested: Boolean(order.billRequested),
    billRequestedAt: order.billRequestedAt
  };
}

function cleanTakeawayData() {
  const currentOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];
  const now = Date.now();

  if (Array.isArray(syncStore["bill_requests"])) {
    syncStore["bill_requests"] = syncStore["bill_requests"].filter((b: any) => {
      if (Number(b.tableNumber) === 0) return false;
      const hasActive = currentOrders.some((o: any) => Number(o.tableNumber) === Number(b.tableNumber) && o.status !== 'completed' && o.status !== 'cancelled' && !o.settled);
      return b.status === 'pending' && b.totalAmount > 0 && hasActive;
    });
  }

  if (Array.isArray(syncStore["tables"])) {
    syncStore["tables"] = syncStore["tables"].filter((t: any) => Number(t.tableNumber) !== 0).map((t: any) => {
      const hasActive = currentOrders.some((o: any) => Number(o.tableNumber) === Number(t.tableNumber) && o.status !== 'completed' && o.status !== 'cancelled' && !o.settled);
      const isLive = t.lastActiveHeartbeat && (now - t.lastActiveHeartbeat < 60000);
      if (!hasActive && !isLive) {
        return {
          ...t,
          status: 'available',
          billRequested: false,
          billRequestedAt: undefined,
          currentOrderId: undefined,
          activeSessionDeviceId: undefined,
          activeSessionCustomerName: undefined,
          lastActiveHeartbeat: undefined,
          tableDelivered: false
        };
      }
      return t;
    });
  }
  // Takeaway orders (tableNumber === 0) are kept and preserved for kitchen and cashier
  initMongoDB().then(db => {
    if (db) {
      db.collection("tables").deleteMany({ tableNumber: 0 }).catch(() => {});
      db.collection("bill_requests").deleteMany({ tableNumber: 0 }).catch(() => {});
    }
  }).catch(() => {});
}

// Function to save state to disk asynchronously without freezing the event loop
let diskSaveTimer: NodeJS.Timeout | null = null;
function saveDataToDisk() {
  if (process.env.VERCEL) return; // Skip disk writes on Vercel (read-only filesystem); MongoDB Atlas provides persistent storage
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

// Ensure database always holds full default seed collections if empty or missing
function seedDefaultsIfEmpty() {
  let modified = false;

  if (syncStore["categories"] === undefined || syncStore["categories"] === null) {
    syncStore["categories"] = initialCategories;
    modified = true;
  }

  if (syncStore["menu_items"] === undefined || syncStore["menu_items"] === null) {
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

  if (syncStore["banners"] === undefined || syncStore["banners"] === null) {
    syncStore["banners"] = initialBanners;
    modified = true;
  }

  if (syncStore["popup_ad"] === undefined || syncStore["popup_ad"] === null) {
    syncStore["popup_ad"] = initialPopupAd;
    modified = true;
  }

  if (syncStore["coupons"] === undefined || syncStore["coupons"] === null) {
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
    initMongoDB().then(database => {
      if (database) {
        for (const [k, v] of Object.entries(syncStore)) {
          saveKeyToMongo(k, v).catch(() => {});
        }
      }
    }).catch(() => {});
  }
}

// Load existing data from disk first
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

// Run default seed check immediately - BUT only after potentially loading from disk
seedDefaultsIfEmpty();
seedDefaultsIfEmpty(); // Actually, this is already fine because it's called after loading from disk.
// The issue is seedDefaultsIfEmpty might be called BEFORE mongo is ready.
// Let's modify seedDefaultsIfEmpty to be more robust.

// ==========================================
// Web Push Notifications & Lock Screen Setup
// ==========================================
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

// Helper: Send Web Push Notification to all Admin phones (wakes screen when locked)
async function sendPushToAdmins(payload: {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  data?: any;
  vibrate?: number[];
}) {
  try {
    const settings = syncStore["settings"] || {};
    if (settings.pushNotificationsEnabled === false) return 0;

    const adminSubs = Array.isArray(syncStore["push_admin_subscriptions"]) 
      ? syncStore["push_admin_subscriptions"] 
      : [];
    
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

    const deadEndpoints: string[] = [];
    let sentCount = 0;

    await Promise.all(
      adminSubs.map(async (subItem: any) => {
        try {
          if (!subItem?.subscription?.endpoint) return;
          await webpush.sendNotification(subItem.subscription, pushPayload);
          sentCount++;
        } catch (err: any) {
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
        (s: any) => !deadEndpoints.includes(s.subscription.endpoint)
      );
      saveDataToDisk();
    }

    return sentCount;
  } catch (err) {
    console.warn("[Push Admin Global Error]:", err);
    return 0;
  }
}

// Helper: Send Web Push Notification to specific Client phones (by table or orderId)
async function sendPushToClients(
  tableNumber: number | undefined,
  orderId: string | undefined,
  payload: {
    title: string;
    body: string;
    tag?: string;
    icon?: string;
    data?: any;
    vibrate?: number[];
  }
) {
  try {
    const settings = syncStore["settings"] || {};
    if (settings.pushNotificationsEnabled === false) return 0;

    const clientSubs = Array.isArray(syncStore["push_client_subscriptions"]) 
      ? syncStore["push_client_subscriptions"] 
      : [];

    const targetSubs = clientSubs.filter((subItem: any) => {
      if (orderId && subItem.orderId === orderId) return true;
      if (tableNumber !== undefined && Number(subItem.tableNumber) === Number(tableNumber)) return true;
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

    const deadEndpoints: string[] = [];
    let sentCount = 0;

    await Promise.all(
      targetSubs.map(async (subItem: any) => {
        try {
          if (!subItem?.subscription?.endpoint) return;
          await webpush.sendNotification(subItem.subscription, pushPayload);
          sentCount++;
        } catch (err: any) {
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
        (s: any) => !deadEndpoints.includes(s.subscription.endpoint)
      );
      saveDataToDisk();
    }

    return sentCount;
  } catch (err) {
    console.warn("[Push Client Global Error]:", err);
    return 0;
  }
}

// Initialize MongoDB and hydrate in-memory store if available
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
      // Seed current store to MongoDB Atlas
      console.log("[MongoDB] Initializing MongoDB collections from current store...");
      for (const [key, data] of Object.entries(syncStore)) {
        saveKeyToMongo(key, data).catch(() => {});
      }
    }
  }
}).catch(err => {
  console.warn("[MongoDB] Background init error:", err);
});

// API: MongoDB Status (GET /api/mongodb-status)
// API: Debug SyncStore (GET /api/debug-store/:key)

// API: MongoDB Status (GET /api/mongodb-status)
app.get("/api/mongodb-status", async (req, res) => {
  try {
    const status = await getMongoStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to check MongoDB status" });
  }
});

// API: MongoDB Manual Sync (POST /api/mongodb-sync-now)
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
      message: "تمت مزامنة جميع البيانات مع MongoDB Atlas بنجاح",
      keysSynced: Object.keys(syncStore).length
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Sync failed" });
  }
});

// 1. API: Send Order (POST /api/orders) - Instant memory update + background mongo
app.post("/api/orders", async (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ error: "لا يمكن إنشاء طلب فارغ بدون أصناف" });
    }

    const orderId = body.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const newOrder = normalizeOrderBackend({
      ...body,
      id: orderId,
      status: body.status || "pending",
      createdAt: body.createdAt || new Date().toISOString(),
      timestamp: body.timestamp || Date.now()
    });

    // Update in-memory sync store immediately
    const existingOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];
    const filtered = existingOrders.filter((o: any) => o.id !== orderId);
    const updatedOrders = [newOrder, ...filtered];
    syncStore["orders"] = updatedOrders;

    // Automatically mark table as busy when a dine-in order is placed
    const tableNum = Number(newOrder.tableNumber);
    if (tableNum > 0) {
      const currentTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
      let tableFound = false;
      const updatedTables = currentTables.map((t: any) => {
        if (Number(t.tableNumber) === tableNum) {
          tableFound = true;
          return {
            ...t,
            status: t.status === 'bill_requested' ? 'bill_requested' : 'busy',
            currentOrderId: newOrder.id,
            seatedAt: t.seatedAt || newOrder.createdAt || new Date().toISOString(),
            firstOrderAt: t.firstOrderAt || newOrder.createdAt || new Date().toISOString(),
            activeSessionCustomerName: newOrder.customerName || t.activeSessionCustomerName,
            activeSessionDeviceId: newOrder.deviceId || t.activeSessionDeviceId,
            lastActiveHeartbeat: Date.now()
          };
        }
        return t;
      });
      if (!tableFound) {
        updatedTables.push({
          tableNumber: tableNum,
          status: 'busy',
          currentOrderId: newOrder.id,
          seatedAt: newOrder.createdAt || new Date().toISOString(),
          firstOrderAt: newOrder.createdAt || new Date().toISOString(),
          activeSessionCustomerName: newOrder.customerName,
          activeSessionDeviceId: newOrder.deviceId,
          lastActiveHeartbeat: Date.now()
        });
      }
      syncStore["tables"] = updatedTables;
      saveKeyToMongo("tables", updatedTables).catch(() => {});
      broadcastSync("tables", updatedTables);
    }

    saveDataToDisk();

    // Respond immediately for zero latency with updated orders list
    res.status(201).json({ 
      success: true, 
      orderId: newOrder.id, 
      order: newOrder, 
      orders: updatedOrders,
      tables: syncStore["tables"]
    });

    // Background MongoDB and broadcast
    broadcastSync("orders", updatedOrders);
    saveSingleOrderToMongo(newOrder).catch(() => {});
    saveKeyToMongo("orders", updatedOrders).catch(() => {});

    // Send Lock Screen Push Notification to Admin phones
    try {
      const settings = syncStore["settings"] || {};
      if (settings.pushAdminNewOrder !== false) {
        const isTakeaway = Number(newOrder.tableNumber) === 0;
        const tableLabel = isTakeaway ? "طلب سفري (Takeaway)" : `طاولة #${newOrder.tableNumber}`;
        const itemsSummary = Array.isArray(newOrder.items) && newOrder.items.length > 0 
          ? newOrder.items.map((i: any) => `${i.quantity}x ${i.menuItem?.name || 'صنف'}`).slice(0, 3).join('، ')
          : 'طلب جديد';
        sendPushToAdmins({
          title: `🛎️ طلب جديد - ${tableLabel}`,
          body: `القيمة: ${newOrder.total} ج.م • (${itemsSummary})`,
          tag: `order-${newOrder.id}`,
          data: { url: `/?tab=orders`, orderId: newOrder.id, tableNumber: newOrder.tableNumber }
        }).catch(() => {});
      }
    } catch (e) {
      // Ignored
    }
  } catch (error: any) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: error?.message || "Failed to place order" });
  }
});

// API: Get Live Orders Summary & Stats (GET /api/orders/stats)
app.get("/api/orders/stats", (req, res) => {
  try {
    const orders = (syncStore["orders"] || []).map(normalizeOrderBackend).filter(Boolean);
    const pendingCount = orders.filter((o: any) => o.status === 'pending').length;
    const preparingCount = orders.filter((o: any) => o.status === 'preparing').length;
    const deliveredCount = orders.filter((o: any) => o.status === 'delivered' || o.status === 'ready').length;
    const activeCount = orders.filter((o: any) => o.status !== 'completed' && o.status !== 'cancelled').length;
    const completedCount = orders.filter((o: any) => o.status === 'completed').length;
    
    // Today's revenue
    const today = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter((o: any) => (o.createdAt || '').slice(0, 10) === today && o.status !== 'cancelled');
    const todayRevenue = todayOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);

    const bills = Array.isArray(syncStore["bill_requests"]) ? syncStore["bill_requests"] : [];
    const pendingBillsCount = bills.filter((b: any) => b.status === 'pending' && Number(b.tableNumber) !== 0).length;

    res.json({
      success: true,
      pendingCount,
      preparingCount,
      deliveredCount,
      activeCount,
      completedCount,
      todayRevenue,
      pendingBillsCount,
      timestamp: Date.now()
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to calculate stats" });
  }
});

// 2. API: Get Orders (GET /api/orders) - Instant lookup with authoritative Mongo synchronization
app.get("/api/orders", async (req, res) => {
  try {
    const memoryOrders = (syncStore["orders"] || []).map(normalizeOrderBackend).filter(Boolean);
    const map = new Map<string, any>();
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
          const combined = Array.from(map.values()).sort((a: any, b: any) => {
            const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
            const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
            return timeB - timeA;
          });
          syncStore["orders"] = combined;
          saveDataToDisk();
          broadcastSync("orders", combined, "server-api");
        }
      }
    } catch (mErr) {}

    const finalOrders = Array.from(map.values()).sort((a: any, b: any) => {
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

// API: Get Order Statuses Lightweight Summary (GET /api/orders/status)
app.get("/api/orders/status", async (req, res) => {
  try {
    const orders = (syncStore["orders"] || []).map(normalizeOrderBackend).filter(Boolean);
    const tableParam = req.query.table ? Number(req.query.table) : null;
    const sinceParam = req.query.since ? Number(req.query.since) : null;

    let filtered = orders;
    if (tableParam !== null && !isNaN(tableParam)) {
      filtered = filtered.filter((o: any) => Number(o.tableNumber) === tableParam);
    }
    if (sinceParam !== null && !isNaN(sinceParam)) {
      filtered = filtered.filter((o: any) => {
        const time = new Date(o.updatedAt || o.createdAt || o.timestamp || 0).getTime();
        return time > sinceParam;
      });
    }

    const statuses = filtered.map((o: any) => ({
      id: o.id,
      tableNumber: o.tableNumber,
      status: o.status || 'pending',
      total: o.total || 0,
      itemsCount: Array.isArray(o.items) ? o.items.length : 0,
      updatedAt: o.updatedAt || o.createdAt || new Date().toISOString(),
      timestamp: o.timestamp || Date.now()
    }));

    res.json({
      timestamp: Date.now(),
      count: statuses.length,
      orders: statuses
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch order statuses" });
  }
});

// API: Get Bills (GET /api/bills) - Instant lookup with authoritative Mongo synchronization
app.get("/api/bills", async (req, res) => {
  try {
    const memoryBills = Array.isArray(syncStore["bill_requests"]) ? syncStore["bill_requests"] : [];
    const map = new Map<string, any>();
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
          const combined = Array.from(map.values()).sort((a: any, b: any) => {
            const timeA = new Date(a.requestedAt || 0).getTime();
            const timeB = new Date(b.requestedAt || 0).getTime();
            return timeB - timeA;
          });
          syncStore["bill_requests"] = combined;
          saveDataToDisk();
          broadcastSync("bill_requests", combined, "server-api");
        }
      }
    } catch (e) {}

    const finalBills = Array.from(map.values())
      .filter((b: any) => Number(b.tableNumber) !== 0)
      .sort((a: any, b: any) => {
        const timeA = new Date(a.requestedAt || 0).getTime();
        const timeB = new Date(b.requestedAt || 0).getTime();
        return timeB - timeA;
      });

    res.json(finalBills);
  } catch (err) {
    res.json([]);
  }
});

// API: Request / Create Bill (POST /api/bills)
app.post("/api/bills", async (req, res) => {
  try {
    const body = req.body;
    if (!body || body.tableNumber === undefined) return res.status(400).json({ error: "tableNumber is required" });

    const tableNum = Number(body.tableNumber);
    if (tableNum === 0 || isNaN(tableNum)) {
      return res.status(400).json({ error: "Takeaway orders do not support bill requests" });
    }
    const billId = body.id || `bill_${tableNum}_${Date.now()}`;
    const nowIso = new Date().toISOString();

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
    const filtered = existingBills.filter((b: any) => !(Number(b.tableNumber) === tableNum && b.status === "pending"));
    const updatedBills = [newBill, ...filtered];
    syncStore["bill_requests"] = updatedBills;
    saveDataToDisk();
    saveKeyToMongo("bill_requests", updatedBills).catch(() => {});

    broadcastSync("bill_requests", updatedBills);
    res.status(201).json({ success: true, bill: newBill });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to create bill" });
  }
});

// API: Update Bill Status (PATCH /api/bills/:id)
app.patch("/api/bills/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, settledAt } = req.body;
    const existingBills = Array.isArray(syncStore["bill_requests"]) ? syncStore["bill_requests"] : [];
    const updatedBills = existingBills.map((b: any) => {
      if (b.id === id || String(b.tableNumber) === id) {
        return { ...b, status: status || b.status, settledAt: settledAt || new Date().toISOString() };
      }
      return b;
    });
    syncStore["bill_requests"] = updatedBills;
    saveDataToDisk();
    saveKeyToMongo("bill_requests", updatedBills).catch(() => {});
    broadcastSync("bill_requests", updatedBills);
    res.json({ success: true, bills: updatedBills });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to update bill" });
  }
});

// 3. API: Update Order Status (PATCH /api/orders/:id)
app.patch("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const existingOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];

    let found = false;
    let updatedOrderObj: any = null;
    const nowIso = new Date().toISOString();
    const updatedOrders = existingOrders.map((o: any) => {
      if (o.id === id) {
        found = true;
        updatedOrderObj = { 
          ...o, 
          status, 
          updatedAt: nowIso,
          deliveredAt: status === 'delivered' ? (o.deliveredAt || nowIso) : o.deliveredAt,
          completedAt: status === 'completed' ? (o.completedAt || nowIso) : o.completedAt,
          checkSent: status === 'completed' ? true : o.checkSent
        };
        return updatedOrderObj;
      }
      return o;
    });

    if (!found) {
      // Check MongoDB if not in memory
      const mongoOrders = await getAllOrdersFromMongo();
      if (mongoOrders) {
        const mongoFound = mongoOrders.find(o => o.id === id);
        if (mongoFound) {
          updatedOrderObj = { 
            ...mongoFound, 
            status, 
            updatedAt: nowIso,
            deliveredAt: status === 'delivered' ? (mongoFound.deliveredAt || nowIso) : mongoFound.deliveredAt,
            completedAt: status === 'completed' ? (mongoFound.completedAt || nowIso) : mongoFound.completedAt,
            checkSent: status === 'completed' ? true : mongoFound.checkSent
          };
          await saveSingleOrderToMongo(updatedOrderObj);
          const newOrdersList = mongoOrders.map(o => o.id === id ? updatedOrderObj : o);
          syncStore["orders"] = newOrdersList;
          saveDataToDisk();
          saveKeyToMongo("orders", newOrdersList).catch(() => {});

          broadcastSync("orders", newOrdersList);

          return res.json({ success: true, orderId: id, status });
        }
      }
      return res.status(404).json({ error: "Order not found" });
    }

    syncStore["orders"] = updatedOrders;
    saveDataToDisk();

    // Send Lock Screen Push notification to Client phone
    try {
      const settings = syncStore["settings"] || {};
      if (settings.pushClientOrderStatus !== false && updatedOrderObj) {
        const tNum = updatedOrderObj.tableNumber;
        if (status === 'preparing') {
          sendPushToClients(tNum, updatedOrderObj.id, {
            title: "🍳 المرحلة 1: تم استلام طلبك وبدأ التحضير!",
            body: "المطبخ والشيف يقومون الآن بتجهيز طلبك بعناية، سنرسل لك إشعاراً فور تسليمه",
            tag: `order-status-${updatedOrderObj.id}`,
            data: { url: `/?trackOrder=${updatedOrderObj.id}&table=${tNum}` }
          }).catch(() => {});
        } else if (status === 'delivered') {
          sendPushToClients(tNum, updatedOrderObj.id, {
            title: "🍽️ المرحلة 2: تم تجهيز طلبك وتسليمه!",
            body: "طلبك أصبح على طاولتك الآن، بالهناء والشفاء نتمنى لك وقتاً ممتعاً",
            tag: `order-status-${updatedOrderObj.id}`,
            data: { url: `/?trackOrder=${updatedOrderObj.id}&table=${tNum}` }
          }).catch(() => {});
        }
      }
    } catch (e) {
      // Ignored
    }

    // If order was marked delivered, update table tableDelivered flag
    if (status === 'delivered') {
      const orderTableNum = Number(updatedOrderObj?.tableNumber);
      if (orderTableNum >= 0) {
        const nowIso = new Date().toISOString();
        const currentTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
        const newTables = currentTables.map((t: any) => {
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
        saveKeyToMongo("tables", newTables).catch(() => {});
        broadcastSync("tables", newTables);
      }
    }

    // If order was marked completed or cancelled, and table does NOT have a bill pending, check if table has any active orders left
    if (status === 'completed' || status === 'cancelled') {
      const orderTableNum = Number(updatedOrderObj?.tableNumber);
      if (orderTableNum >= 0) {
        const remainingActive = updatedOrders.filter((o: any) => 
          Number(o.tableNumber) === orderTableNum && 
          o.status !== 'completed' && 
          o.status !== 'cancelled'
        );
        const currentTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
        const tableObj = currentTables.find((t: any) => Number(t.tableNumber) === orderTableNum);
        
        // Only auto-release if the table did NOT request a bill (bill requests must be explicitly released by cashier)
        if (remainingActive.length === 0 && (!tableObj || (!tableObj.billRequested && tableObj.status !== 'bill_requested'))) {
          const nowIso = new Date().toISOString();
          const newTables = currentTables.map((t: any) => {
            if (Number(t.tableNumber) === orderTableNum) {
              return {
                ...t,
                status: 'available',
                billRequested: false,
                billRequestedAt: undefined,
                tableDelivered: false,
                deliveredAt: undefined,
                activeSessionDeviceId: undefined,
                activeSessionCustomerName: undefined,
                currentOrderId: undefined,
                settledAt: nowIso
              };
            }
            return t;
          });
          syncStore["tables"] = newTables;
          saveKeyToMongo("tables", newTables).catch(() => {});
          broadcastSync("tables", newTables);
        }
      }
    }

    // Respond immediately for zero latency with updated orders list
    res.json({ success: true, orderId: id, status, orders: updatedOrders });

    // Background MongoDB and broadcast
    broadcastSync("orders", updatedOrders);
    if (updatedOrderObj) {
      saveSingleOrderToMongo(updatedOrderObj).catch(() => {});
    }
    saveKeyToMongo("orders", updatedOrders).catch(() => {});
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// 4. API: Delete Order (DELETE /api/orders/:id)
app.delete("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existingOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];
    const updatedOrders = existingOrders.filter((o: any) => o.id !== id);
    syncStore["orders"] = updatedOrders;
    saveDataToDisk();

    // Delete from MongoDB
    await deleteOrderFromMongo(id);
    saveKeyToMongo("orders", updatedOrders).catch(() => {});

    broadcastSync("orders", updatedOrders);

    res.json({ success: true, deletedOrderId: id });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

// API Route: POST /api/orders/clear (Completely clear all orders, bills & stats)
app.post("/api/orders/clear", async (req, res) => {
  try {
    syncStore["orders"] = [];
    syncStore["bill_requests"] = [];
    saveDataToDisk();

    try {
      const db = await initMongoDB();
      if (db) {
        await db.collection("orders").deleteMany({});
        await db.collection("sync_store").updateOne(
          { key: "orders" },
          { $set: { data: [], updatedAt: new Date() } },
          { upsert: true }
        );
        await db.collection("sync_store").updateOne(
          { key: "bill_requests" },
          { $set: { data: [], updatedAt: new Date() } },
          { upsert: true }
        );
      }
    } catch (mErr) {
      console.warn("MongoDB clear error:", mErr);
    }

    broadcastSync("orders", []);
    broadcastSync("bill_requests", []);

    res.json({ success: true, message: "تم مسح وتصفير كافة بيانات الطلبات بنجاح" });
  } catch (error) {
    console.error("Error clearing orders:", error);
    res.status(500).json({ error: "Failed to clear orders" });
  }
});

// API Route: Direct Entity REST Endpoints (MongoDB backed)
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
  } catch (err: any) {
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
  } catch (err: any) {
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
  } catch (err: any) {
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
  } catch (err: any) {
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
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to update settings" });
  }
});

// API Route: GET /api/bootstrap (Unified 1-call initial bootstrap for syncHub)
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

// API Route: GET /api/sync-all
app.get("/api/sync-all", async (req, res) => {
  seedDefaultsIfEmpty();
  res.json({ success: true, store: syncStore, data: syncStore, timestamp: Date.now() });
});

// API Route: POST /api/restore-default-menu (Complete full restore of default menu & categories)
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
      message: "تمت استعادة وبناء كافة بيانات المنيو والقوائم الافتراضية بنجاح!",
      categoriesCount: initialCategories.length,
      menuItemsCount: initialMenuItems.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Restore failed" });
  }
});

// API Route: POST /api/reset-data (Complete clean data reset)
app.post("/api/reset-data", async (req, res) => {
  try {
    syncStore["orders"] = [];
    const db = await initMongoDB();
    if (db) {
      await db.collection("orders").deleteMany({});
    }
    const cleanTables = Array.from({ length: 12 }, (_, i) => ({
      tableNumber: i + 1,
      name: `طاولة ${i + 1}`,
      capacity: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
      section: i < 4 ? 'الصالة الرئيسية' : i < 8 ? 'التراس الخارجي' : 'قسم العائلات VIP',
      status: 'available'
    }));
    syncStore["tables"] = cleanTables;

    syncStore["system_logs"] = [
      {
        id: `log-reset-${Date.now()}`,
        timestamp: new Date().toISOString(),
        category: "system",
        level: "success",
        message: "تمت تهيئة واستبدال البيانات بنجاح تام",
        messageEn: "Data cleanly reset and replaced",
        actor: "المدير",
        details: "تم تفريغ الطلبات القديمة وتحرير كافة الطاولات"
      }
    ];

    saveDataToDisk();

    // Async save reset state to MongoDB
    await saveKeyToMongo("orders", []);
    await saveKeyToMongo("tables", cleanTables);
    await saveKeyToMongo("system_logs", syncStore["system_logs"]);

    // Broadcast reset to all clients
    for (const key of ["orders", "tables", "system_logs"]) {
      const payload = `data: ${JSON.stringify({ key, data: syncStore[key], timestamp: Date.now() })}\n\n`;
      for (const client of sseClients) {
        try {
          client.write(payload);
        } catch (e) {
          sseClients.delete(client);
        }
      }
    }

    res.json({ success: true, message: "تمت تهيئة واستبدال البيانات بالكامل بنجاح" });
  } catch (error: any) {
    console.error("Error resetting data:", error);
    res.status(500).json({ error: error?.message || "Failed to reset data" });
  }
});

function deepMerge(target: any, source: any): any {
  if (source === null || source === undefined) return target;
  if (target === null || target === undefined) return source;
  if (Array.isArray(target) && Array.isArray(source)) {
    if (source.length === 0 && target.length > 0) return target;
    return source;
  }
  if (typeof target !== "object" || Array.isArray(target)) {
    return source;
  }
  if (typeof source !== "object" || Array.isArray(source)) {
    return source;
  }

  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (key in target) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// API Route: GET /api/sync/:key
app.get("/api/sync/:key", async (req, res) => {
  const { key } = req.params;
  try {
    if (key === "orders") {
      const inMemoryOrders = (syncStore["orders"] || []).map(normalizeOrderBackend).filter(Boolean);
      const map = new Map<string, any>();
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
      } catch (mErr) {}

      const combined = Array.from(map.values()).sort((a: any, b: any) => {
        const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
        const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
        return timeB - timeA;
      });

      syncStore["orders"] = combined;
      return res.json({ key, data: combined, timestamp: Date.now() });
    } else if (key === "bill_requests") {
      const inMemoryBills = Array.isArray(syncStore["bill_requests"]) ? syncStore["bill_requests"] : [];
      const map = new Map<string, any>();
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
      } catch (e) {}

      const combinedBills = Array.from(map.values())
        .filter((b: any) => Number(b.tableNumber) !== 0)
        .sort((a: any, b: any) => {
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
      if (mongoVal !== null && mongoVal !== undefined) {
        syncStore[key] = mongoVal;
        return res.json({ key, data: mongoVal, timestamp: Date.now() });
      }
    }
  } catch (e) {}

  const data = syncStore[key] ?? null;
  res.json({ key, data, timestamp: Date.now() });
});

// API Route: POST /api/sync/:key
app.post("/api/sync/:key", async (req, res) => {
  const { key } = req.params;
  const { data, senderId } = req.body;

  if (data !== undefined) {
    if (key === "orders" && Array.isArray(data)) {
      const normalizedOrders = data.map(normalizeOrderBackend).filter(Boolean).sort((a: any, b: any) => {
        const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
        const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
        return timeB - timeA;
      });
      syncStore["orders"] = normalizedOrders;
    } else if (key === "bill_requests" && Array.isArray(data)) {
      const existingBills = Array.isArray(syncStore["bill_requests"]) ? syncStore["bill_requests"] : [];
      const billMap = new Map<string, any>();
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
          // If server already settled this bill, do not let stale client 'pending' revert it!
          if (existing.status === 'settled' && incomingB.status !== 'settled') {
            // Keep settled
          } else {
            const mergedTotal = (typeof incomingB.totalAmount === 'number' && !isNaN(incomingB.totalAmount) && incomingB.totalAmount > 0)
              ? incomingB.totalAmount
              : (existing.totalAmount || 0);
            billMap.set(keyId, { ...existing, ...incomingB, totalAmount: mergedTotal });
          }
        }
      }
      syncStore["bill_requests"] = Array.from(billMap.values()).filter((b: any) => Number(b.tableNumber) !== 0);
    } else if (key === "tables" && Array.isArray(data)) {
      const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
      const currentOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];

      // Only allow syncing table numbers that currently exist in syncStore["tables"] (unless set by server-api/admin or authorized admin dashboard session)
      const allowedTableNums = new Set(existingTables.map((t: any) => Number(t.tableNumber)));
      const isAuthoritative = senderId === 'server-api' || senderId === 'admin' || req.headers['x-admin-session'] === 'true';
      
      const filteredIncoming = isAuthoritative
        ? data
        : data.filter((t: any) => t && allowedTableNums.has(Number(t.tableNumber)));

      const filteredTableNums = new Set(filteredIncoming.map((t: any) => Number(t.tableNumber)));
      const missingTables = isAuthoritative
        ? []
        : existingTables.filter((et: any) => !filteredTableNums.has(Number(et.tableNumber)));

      const fullIncomingList = [...filteredIncoming, ...missingTables];

      // Merge tables while strictly protecting active sessions of first-arrived customers
      const mergedTables = fullIncomingList.map((incomingT: any) => {
        const existingT = existingTables.find((et: any) => Number(et.tableNumber) === Number(incomingT.tableNumber));
        if (!existingT) return incomingT;

        const tableOrders = currentOrders.filter(
          (o: any) => Number(o.tableNumber) === Number(incomingT.tableNumber) && o.status !== 'completed' && o.status !== 'cancelled'
        );
        const hasUndeliveredOrders = tableOrders.some((o: any) => o.status !== 'delivered');
        const isExistingActive = existingT.activeSessionDeviceId && (
          hasUndeliveredOrders ||
          (Date.now() - (existingT.lastActiveHeartbeat || 0) < 45000)
        );

        // If existing table has an active session from Device A, and incoming table has a different or empty device ID:
        // PRESERVE Device A's session to prevent Device B from kicking out Device A!
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

    // Async save to MongoDB
    saveKeyToMongo(key, syncStore[key]).catch(() => {});

    // Broadcast to all connected clients with senderId
    broadcastSync(key, syncStore[key], senderId);
  }

  res.json({ success: true, key, data: syncStore[key], senderId, timestamp: Date.now() });
});

// Dedicated Authoritative Table Session Endpoints
// 1. Claim or enter table
app.post("/api/tables/claim-session", (req, res) => {
  try {
    const { tableNumber, deviceId, customerName, isHeartbeat } = req.body;
    if (!tableNumber || !deviceId) {
      return res.status(400).json({ error: "tableNumber and deviceId are required" });
    }

    const tNum = Number(tableNumber);
    const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
    const currentOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];

    const tableIndex = existingTables.findIndex((t: any) => Number(t.tableNumber) === tNum);
    if (tableIndex === -1) {
      return res.status(404).json({ error: "Table not found" });
    }

    const table = existingTables[tableIndex];
    const tableOrders = currentOrders.filter(
      (o: any) => Number(o.tableNumber) === tNum && o.status !== 'completed' && o.status !== 'cancelled'
    );
    const hasUndeliveredOrders = tableOrders.some((o: any) => o.status !== 'delivered');
    const isHolderAlive = table.activeSessionDeviceId && (
      hasUndeliveredOrders ||
      (Date.now() - (table.lastActiveHeartbeat || 0) < 45000)
    );

    // If table is active by ANOTHER device:
    if (isHolderAlive && table.activeSessionDeviceId !== deviceId) {
      return res.json({
        success: false,
        locked: true,
        message: "هذه الطاولة محجوزة بحوزة العميل الأول الذي دخل قبلك",
        activeDeviceId: table.activeSessionDeviceId,
        hasUndeliveredOrders
      });
    }

    // Passive Heartbeat protection: If request is a passive heartbeat and table has NO active session device (e.g. admin freed up table),
    // DO NOT automatically re-claim the table for this device!
    if (isHeartbeat && !table.activeSessionDeviceId) {
      return res.json({
        success: true,
        locked: false,
        claimed: false,
        table
      });
    }

    // Table is free or same device: grant session
    const updatedTable = {
      ...table,
      activeSessionDeviceId: deviceId,
      lastActiveHeartbeat: Date.now(),
      activeSessionCustomerName: customerName || table.activeSessionCustomerName
    };

    existingTables[tableIndex] = updatedTable;
    syncStore["tables"] = existingTables;
    saveDataToDisk();
    saveKeyToMongo("tables", existingTables).catch(() => {});

    // Broadcast table update
    const eventPayload = `data: ${JSON.stringify({ key: "tables", data: existingTables, timestamp: Date.now() })}\n\n`;
    for (const client of sseClients) {
      try { client.write(eventPayload); } catch { sseClients.delete(client); }
    }

    return res.json({
      success: true,
      locked: false,
      claimed: true,
      table: updatedTable
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to claim table" });
  }
});

// 2. Table Heartbeat
app.post("/api/tables/heartbeat", (req, res) => {
  try {
    const { tableNumber, deviceId } = req.body;
    const tNum = Number(tableNumber);
    const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];

    const tableIndex = existingTables.findIndex((t: any) => Number(t.tableNumber) === tNum);
    if (tableIndex === -1) return res.status(404).json({ error: "Table not found" });

    const table = existingTables[tableIndex];
    if (table.activeSessionDeviceId === deviceId) {
      table.lastActiveHeartbeat = Date.now();
      saveDataToDisk();
      return res.json({ success: true });
    }

    return res.json({ success: false, locked: Boolean(table.activeSessionDeviceId) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Heartbeat failed" });
  }
});

// 3. Release / Clear Table Session & Settle Bill
app.post(["/api/tables/release-session", "/api/tables/settle-bill"], async (req, res) => {
  try {
    const { tableNumber, all } = req.body;
    const nowIso = new Date().toISOString();
    const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
    const existingOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];

    if (all === true || tableNumber === -1) {
      const cleanTables = existingTables.map((t: any) => ({
        ...t,
        status: 'available',
        currentOrderId: undefined,
        seatedAt: undefined,
        activeSessionDeviceId: undefined,
        activeSessionCustomerName: undefined,
        firstOrderAt: undefined,
        lastActiveHeartbeat: undefined,
        billRequestedAt: undefined,
        billRequested: false,
        tableDelivered: false,
        deliveredAt: undefined,
        sessionTransferRequest: undefined,
        settledAt: nowIso
      }));
      syncStore["tables"] = cleanTables;

      // Also complete and settle all active orders
      const updatedOrders = existingOrders.map((o: any) => {
        if (o.status !== 'cancelled' && !o.settled) {
          return { ...o, status: 'completed', checkSent: true, settled: true, settledAt: nowIso };
        }
        return o;
      });
      syncStore["orders"] = updatedOrders;

      // Mark all bill requests as settled
      const existingBills = Array.isArray(syncStore["bill_requests"]) ? syncStore["bill_requests"] : [];
      const settledBills = existingBills.map((b: any) => {
        if (b.status !== 'settled') {
          return {
            ...b,
            id: `bill_table_${b.tableNumber}_settled_${Date.now()}`,
            status: 'settled',
            settledAt: nowIso
          };
        }
        return b;
      });
      syncStore["bill_requests"] = settledBills;

      saveDataToDisk();
      saveKeyToMongo("tables", cleanTables).catch(() => {});
      saveKeyToMongo("orders", updatedOrders).catch(() => {});
      saveKeyToMongo("bill_requests", settledBills).catch(() => {});

      broadcastSync("tables", cleanTables, "server-api");
      broadcastSync("orders", updatedOrders, "server-api");
      broadcastSync("bill_requests", settledBills, "server-api");
      return res.json({ success: true, message: "All tables released and settled" });
    }

    const tNum = Number(tableNumber);
    const updatedTables = existingTables.map((t: any) => {
      if (Number(t.tableNumber) === tNum) {
        return {
          ...t,
          status: 'available',
          currentOrderId: undefined,
          seatedAt: undefined,
          activeSessionDeviceId: undefined,
          activeSessionCustomerName: undefined,
          firstOrderAt: undefined,
          lastActiveHeartbeat: undefined,
          billRequestedAt: undefined,
          billRequested: false,
          tableDelivered: false,
          deliveredAt: undefined,
          sessionTransferRequest: undefined,
          settledAt: nowIso
        };
      }
      return t;
    });
    syncStore["tables"] = updatedTables;

    // Mark all active non-cancelled, non-settled orders for this table as completed and settled
    const updatedOrdersSingle = existingOrders.map((o: any) => {
      if (Number(o.tableNumber) === tNum && o.status !== 'cancelled' && !o.settled) {
        return { ...o, status: 'completed', checkSent: true, settled: true, settledAt: nowIso };
      }
      return o;
    });
    syncStore["orders"] = updatedOrdersSingle;

    // Mark bill requests for this table as settled
    const existingBillsSingle = Array.isArray(syncStore["bill_requests"]) ? syncStore["bill_requests"] : [];
    const updatedBills = existingBillsSingle.map((b: any) => {
      if (Number(b.tableNumber) === tNum && b.status !== 'settled') {
        return { 
          ...b, 
          id: `bill_table_${tNum}_settled_${Date.now()}`,
          status: 'settled', 
          settledAt: nowIso 
        };
      }
      return b;
    });
    syncStore["bill_requests"] = updatedBills;

    saveDataToDisk();
    saveKeyToMongo("tables", updatedTables).catch(() => {});
    saveKeyToMongo("orders", updatedOrdersSingle).catch(() => {});
    saveKeyToMongo("bill_requests", updatedBills).catch(() => {});

    broadcastSync("tables", updatedTables, "server-api");
    broadcastSync("orders", updatedOrdersSingle, "server-api");
    broadcastSync("bill_requests", updatedBills, "server-api");

    // Push notification to client phone
    try {
      const settings = syncStore["settings"] || {};
      if (settings.pushClientBillSettled !== false) {
        sendPushToClients(tNum, undefined, {
          title: "💳 تم تسوية الحساب بنجاح",
          body: "سعدنا بخدمتكم في مطعمنا! نتمنى لكم يوماً سعيداً وننتظر زيارتكم مجدداً",
          tag: `bill-settled-${tNum}`,
          data: { url: "/" }
        }).catch(() => {});
      }
    } catch (e) {
      // Ignored
    }

    return res.json({ success: true, tableNumber: tNum, settled: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to release table" });
  }
});

// Authoritative Table Management: Add/Delete Tables securely
app.post("/api/tables/add", async (req, res) => {
  try {
    const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
    const tableNums = existingTables.map((t: any) => Number(t.tableNumber) || 0);
    const nextTableNumber = tableNums.length > 0 ? Math.max(...tableNums) + 1 : 1;
    const newTable = { tableNumber: nextTableNumber, status: 'available' };
    const updated = [...existingTables, newTable];
    syncStore["tables"] = updated;

    saveDataToDisk();
    saveKeyToMongo("tables", updated).catch(() => {});
    broadcastSync("tables", updated, "server-api");

    res.json({ success: true, tables: updated });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to add table" });
  }
});

app.post("/api/tables/delete", async (req, res) => {
  try {
    const { tableNumber } = req.body;
    const tNum = Number(tableNumber);
    const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
    const updated = existingTables.filter((t: any) => Number(t.tableNumber) !== tNum);
    syncStore["tables"] = updated;

    console.log(`[Server] Deleting table ${tNum}, remaining tables: ${updated.length}`);
    saveDataToDisk();
    await deleteTableFromMongo(tNum);
    saveKeyToMongo("tables", updated).catch(() => {});
    broadcastSync("tables", updated, "server-api");

    res.json({ success: true, tables: updated });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete table" });
  }
});

// 4. Request Bill (Client requests bill for a table)
app.post("/api/tables/request-bill", async (req, res) => {
  try {
    const { tableNumber, deviceId, customerName } = req.body;
    const tNum = Number(tableNumber);
    if (tNum === 0 || isNaN(tNum)) {
      return res.json({ success: false, message: "Takeaway orders do not support bill requests" });
    }

    const nowIso = new Date().toISOString();

    const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
    let tableFound = false;
    const updatedTables = existingTables.map((t: any) => {
      if (Number(t.tableNumber) === tNum) {
        tableFound = true;
        return {
          ...t,
          status: 'bill_requested',
          billRequested: true,
          billRequestedAt: nowIso
        };
      }
      return t;
    });

    if (!tableFound) {
      updatedTables.push({
        tableNumber: tNum,
        status: 'bill_requested',
        billRequested: true,
        billRequestedAt: nowIso,
        activeSessionDeviceId: deviceId,
        activeSessionCustomerName: customerName
      });
    }

    syncStore["tables"] = updatedTables;

    // Check orders for this table: Mark billRequested flag on all active orders without cancelling anything
    const existingOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];
    let hasPreparingOrders = false;
    let tableTotalAmount = 0;
    let tableItemsCount = 0;

    const updatedOrders = existingOrders.map((o: any) => {
      if (Number(o.tableNumber) === tNum && o.status !== 'cancelled' && !o.settled) {
        if (o.status === 'preparing' || o.status === 'ready' || o.status === 'delivered') {
          hasPreparingOrders = true;
        }
        let ordTotal = typeof o.total === 'number' ? o.total : parseFloat(o.total);
        if (isNaN(ordTotal) || ordTotal <= 0) {
          if (Array.isArray(o.items)) {
            ordTotal = o.items.reduce((s: number, i: any) => {
              const rawP = i?.menuItem?.price ?? i?.price ?? 0;
              const itemPrice = typeof rawP === 'number' ? rawP : (parseFloat(String(rawP)) || 0);
              const qty = typeof i.quantity === 'number' ? i.quantity : (parseInt(String(i.quantity), 10) || 1);
              return s + (itemPrice * qty);
            }, 0);
          } else {
            ordTotal = 0;
          }
        }
        tableTotalAmount += ordTotal;
        tableItemsCount += (o.items?.length || 0);
        return {
          ...o,
          billRequested: true,
          billRequestedAt: nowIso
        };
      }
      return o;
    });
    syncStore["orders"] = updatedOrders;

    const passedTotal = typeof req.body?.totalAmount === 'number' ? req.body.totalAmount : parseFloat(req.body?.totalAmount);
    const finalBillTotal = (!isNaN(passedTotal) && passedTotal > 0) ? passedTotal : tableTotalAmount;

    if (finalBillTotal <= 0 && tableItemsCount === 0) {
      return res.json({ success: false, message: "لا توجد طلبات مسجلة لهذه الطاولة لطلب الشيك" });
    }

    // Create or update dedicated BillRequest entity
    const existingBills = Array.isArray(syncStore["bill_requests"]) ? syncStore["bill_requests"] : [];
    const newBill = {
      id: `bill_table_${tNum}`,
      tableNumber: tNum,
      customerName,
      deviceId,
      requestedAt: nowIso,
      status: 'pending',
      totalAmount: finalBillTotal,
      itemsCount: tableItemsCount
    };
    const filteredBills = existingBills.filter((b: any) => !(Number(b.tableNumber) === tNum && b.status === 'pending'));
    const updatedBills = [newBill, ...filteredBills];
    syncStore["bill_requests"] = updatedBills;

    saveDataToDisk();
    saveKeyToMongo("tables", updatedTables).catch(() => {});
    saveKeyToMongo("orders", updatedOrders).catch(() => {});
    saveKeyToMongo("bill_requests", updatedBills).catch(() => {});
    saveSingleBillToMongo(newBill).catch(() => {});

    broadcastSync("tables", updatedTables, "server-api");
    broadcastSync("orders", updatedOrders, "server-api");
    broadcastSync("bill_requests", updatedBills, "server-api");

    // Push notification to Admin phones for Bill request
    try {
      const settings = syncStore["settings"] || {};
      if (settings.pushAdminBillRequest !== false) {
        sendPushToAdmins({
          title: `🧾 طلب الحساب / الشيك - طاولة #${tNum}`,
          body: `العميل يطلب الفاتورة (إجمالي: ${tableTotalAmount} ج.م)، يرجى التوجه للطاولة`,
          tag: `bill-req-${tNum}`,
          data: { url: `/?tab=tables&focusTable=${tNum}`, tableNumber: tNum }
        }).catch(() => {});
      }
    } catch (e) {
      // Ignored
    }

    return res.json({
      success: true,
      tableNumber: tNum,
      status: 'bill_requested',
      hasPreparingOrders
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to request bill" });
  }
});

// 5. Deliver Table (Deliver all active orders for table and mark table delivered)
app.post("/api/tables/deliver", async (req, res) => {
  try {
    const { tableNumber } = req.body;
    const tNum = Number(tableNumber);
    const nowIso = new Date().toISOString();

    const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];
    const updatedTables = existingTables.map((t: any) => {
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
    const updatedOrders = existingOrders.map((o: any) => {
      if (Number(o.tableNumber) === tNum && (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready')) {
        return {
          ...o,
          status: 'delivered',
          deliveredAt: nowIso
        };
      }
      return o;
    });
    syncStore["orders"] = updatedOrders;

    saveDataToDisk();
    saveKeyToMongo("tables", updatedTables).catch(() => {});
    saveKeyToMongo("orders", updatedOrders).catch(() => {});

    broadcastSync("tables", updatedTables);
    broadcastSync("orders", updatedOrders);

    return res.json({ success: true, tableNumber: tNum, delivered: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to deliver table" });
  }
});

// 3. Request Session Transfer (Device B asks Device A for permission)
app.post("/api/tables/transfer-request", (req, res) => {
  try {
    const { tableNumber, requesterDeviceId, requesterCustomerName } = req.body;
    const tNum = Number(tableNumber);
    const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];

    const tableIndex = existingTables.findIndex((t: any) => Number(t.tableNumber) === tNum);
    if (tableIndex === -1) return res.status(404).json({ error: "Table not found" });

    existingTables[tableIndex].sessionTransferRequest = {
      fromDeviceId: requesterDeviceId,
      fromCustomerName: requesterCustomerName,
      requestedAt: Date.now(),
      status: "pending"
    };

    syncStore["tables"] = existingTables;
    saveDataToDisk();
    saveKeyToMongo("tables", existingTables).catch(() => {});

    // Broadcast to let Device A see the modal immediately
    const eventPayload = `data: ${JSON.stringify({ key: "tables", data: existingTables, timestamp: Date.now() })}\n\n`;
    for (const client of sseClients) {
      try { client.write(eventPayload); } catch { sseClients.delete(client); }
    }

    return res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Transfer request failed" });
  }
});

// 4. Respond to Session Transfer (Device A accepts or rejects)
app.post("/api/tables/transfer-respond", (req, res) => {
  try {
    const { tableNumber, currentDeviceId, accept } = req.body;
    const tNum = Number(tableNumber);
    const existingTables = Array.isArray(syncStore["tables"]) ? syncStore["tables"] : [];

    const tableIndex = existingTables.findIndex((t: any) => Number(t.tableNumber) === tNum);
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
      saveKeyToMongo("tables", existingTables).catch(() => {});

      const eventPayload = `data: ${JSON.stringify({ key: "tables", data: existingTables, timestamp: Date.now() })}\n\n`;
      for (const client of sseClients) {
        try { client.write(eventPayload); } catch { sseClients.delete(client); }
      }

      return res.json({ success: true, accepted: accept });
    }

      return res.status(403).json({ error: "Unauthorized response" });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Transfer respond failed" });
    }
  });

  // ==========================================
  // Web Push & Notification API Endpoints
  // ==========================================

  // 1. Get VAPID Public Key for client push subscription
  app.get("/api/push/vapid-public-key", (req, res) => {
    const publicKey = syncStore["vapid_keys"]?.publicKey;
    if (!publicKey) {
      return res.status(500).json({ error: "VAPID key not initialized" });
    }
    res.json({ publicKey });
  });

  // 2. Subscribe Admin Phone for Push Notifications
  app.post("/api/push/subscribe-admin", (req, res) => {
    try {
      const { subscription, deviceName } = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: "Invalid subscription payload" });
      }

      const currentSubs = Array.isArray(syncStore["push_admin_subscriptions"]) 
        ? syncStore["push_admin_subscriptions"] 
        : [];

      const filtered = currentSubs.filter((s: any) => s.subscription?.endpoint !== subscription.endpoint);
      filtered.push({
        subscription,
        deviceName: deviceName || "هاتف الأدمن",
        subscribedAt: new Date().toISOString()
      });

      syncStore["push_admin_subscriptions"] = filtered;
      saveDataToDisk();
      res.json({ success: true, count: filtered.length });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  // 3. Unsubscribe Admin Phone
  app.post("/api/push/unsubscribe-admin", (req, res) => {
    try {
      const { endpoint } = req.body;
      const currentSubs = Array.isArray(syncStore["push_admin_subscriptions"]) 
        ? syncStore["push_admin_subscriptions"] 
        : [];
      syncStore["push_admin_subscriptions"] = currentSubs.filter((s: any) => s.subscription?.endpoint !== endpoint);
      saveDataToDisk();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  // 4. Subscribe Client Phone for Push Notifications
  app.post("/api/push/subscribe-client", (req, res) => {
    try {
      const { subscription, tableNumber, orderId, customerName } = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: "Invalid subscription payload" });
      }

      const currentSubs = Array.isArray(syncStore["push_client_subscriptions"]) 
        ? syncStore["push_client_subscriptions"] 
        : [];

      const filtered = currentSubs.filter((s: any) => s.subscription?.endpoint !== subscription.endpoint);
      filtered.push({
        subscription,
        tableNumber: Number(tableNumber),
        orderId,
        customerName: customerName || "عميل",
        subscribedAt: new Date().toISOString()
      });

      syncStore["push_client_subscriptions"] = filtered;
      saveDataToDisk();
      res.json({ success: true, count: filtered.length });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  // 5. Test Push to Admin phones
  app.post("/api/push/test-admin", async (req, res) => {
    try {
      const sentCount = await sendPushToAdmins({
        title: "🔔 تجربة إشعار هاتف الأدمن",
        body: "تجربة ناجحة! الإشعارات ستصل إلى هاتفك حتى وشاشة الهاتف مقفلة بالكامل 📱✓",
        tag: `test-admin-${Date.now()}`,
        data: { url: "/?tab=orders" }
      });
      res.json({ success: true, sentCount });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  // 6. Test Push to Client phone(s)
  app.post("/api/push/test-client", async (req, res) => {
    try {
      const { tableNumber } = req.body;
      const tNum = tableNumber !== undefined ? Number(tableNumber) : undefined;
      const sentCount = await sendPushToClients(tNum, undefined, {
        title: "🍽️ تجربة إشعار هاتف العميل",
        body: "تجربة ناجحة! ستصلك إشعارات حالة طلبك فورياً وشاشتك مقفلة ☕✓",
        tag: `test-client-${Date.now()}`,
        data: { url: `/?table=${tNum || 1}` }
      });
      res.json({ success: true, sentCount });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  // 7. Get Push Status & Registered Devices Count
  app.get("/api/push/status", (req, res) => {
    const adminSubs = Array.isArray(syncStore["push_admin_subscriptions"]) 
      ? syncStore["push_admin_subscriptions"] 
      : [];
    const clientSubs = Array.isArray(syncStore["push_client_subscriptions"]) 
      ? syncStore["push_client_subscriptions"] 
      : [];
    res.json({
      adminDevicesCount: adminSubs.length,
      clientDevicesCount: clientSubs.length,
      vapidConfigured: Boolean(syncStore["vapid_keys"]?.publicKey)
    });
  });

  // 8. Call Waiter Endpoint
  app.post("/api/call-waiter", async (req, res) => {
    try {
      const { tableNumber, customerName } = req.body;
      const tNum = Number(tableNumber);
      const settings = syncStore["settings"] || {};
      if (settings.pushAdminWaiterCall !== false) {
        sendPushToAdmins({
          title: `🔔 استدعاء الويتر - طاولة #${tNum}`,
          body: `العميل (${customerName || 'طاولة ' + tNum}) يطلب حضور الويتر الآن لمساعدته`,
          tag: `waiter-call-${tNum}`,
          data: { url: `/?tab=tables&focusTable=${tNum}`, tableNumber: tNum }
        }).catch(() => {});
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

// API Route: SSE Stream GET /api/sync-stream
app.get("/api/sync-stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  sseClients.add(res);

  // Keep-alive ping every 15 seconds
  const pingInterval = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch (e) {
      clearInterval(pingInterval);
      sseClients.delete(res);
    }
  }, 15000);

  req.on("close", () => {
    clearInterval(pingInterval);
    sseClients.delete(res);
  });
});

function getBootstrapDataScript(): string {
  seedDefaultsIfEmpty();
  const safeStore: Record<string, any> = {};
  const keysToInclude = [
    'settings',
    'popup_ad',
    'banners',
    'categories',
    'menu_items',
    'tables',
    'coupons',
    'customers',
    'reviews',
    'orders',
    'bill_requests'
  ];
  for (const k of keysToInclude) {
    if (syncStore[k] !== undefined) {
      safeStore[k] = syncStore[k];
    }
  }
  const serialized = JSON.stringify(safeStore).replace(/</g, '\\u003c');
  return `<script id="__INITIAL_DATA_SCRIPT__">window.__INITIAL_DATA__ = ${serialized};</script>`;
}

async function startServer() {
  // Hydrate store from MongoDB Atlas before listening to requests
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

  // Integrate Vite middleware in development mode with HTML bootstrap injection
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      if (
        url.startsWith("/api") ||
        url.startsWith("/socket.io") ||
        url.startsWith("/@") ||
        (url.includes(".") && !url.endsWith(".html") && !url.includes(".html?"))
      ) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        const script = getBootstrapDataScript();
        const html = template.replace("</head>", `${script}\n</head>`);
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Surrogate-Control", "no-store");
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e: any) {
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
        const html = template.replace("</head>", `${script}\n</head>`);
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

if (!process.env.VERCEL) {
  startServer();
}

export { app, httpServer };
export default app;
