import { GoogleGenAI, Type } from "@google/genai";
import { getAISessionFromMongo, saveAISessionToMongo } from "./mongo";

const apiKey = process.env.GEMINI_API_KEY || "";
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

export interface ProcessAIChatOptions {
  tableNumber: number;
  message: string;
  history?: Array<{ role: "user" | "model"; text: string }>;
  syncStore: Record<string, any>;
  saveDataToDisk: () => void;
  saveKeyToMongo: (key: string, data: any) => Promise<boolean>;
  broadcastSync: (key: string, data: any, senderId?: string) => void;
  sendPushToAdmins?: (payload: any) => Promise<any>;
}

/**
 * Normalizes Arabic text for phonetic and semantic matching
 */
function cleanArabic(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove tashkeel
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ|ئ/g, "ء")
    .replace(/[^\w\s\u0600-\u06FF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * High-accuracy check to ensure bill/check requests are NEVER confused with food items
 * (e.g. "تشيكن" Chicken, "ميلك شيك" Milkshake, "شيكولاتة" Chocolate, "تشيز كيك" Cheesecake)
 */
function isRealBillRequest(text: string): boolean {
  const norm = cleanArabic(text);

  // Exclude common food items that contain letters matching "شيك"
  const hasFoodContext = 
    norm.includes("تشيكن") || 
    norm.includes("تشكن") || 
    norm.includes("ميلك شيك") || 
    norm.includes("ميلكشيك") || 
    norm.includes("شيكولات") || 
    norm.includes("شوكولات") || 
    norm.includes("تشيز كيك") ||
    norm.includes("كيك") ||
    norm.includes("سندوتش") ||
    norm.includes("وجبه") ||
    norm.includes("برجر") ||
    norm.includes("بيتزا") ||
    norm.includes("عصير") ||
    norm.includes("قهوه") ||
    norm.includes("شاي");

  // Explicit phrases indicating the customer wants to pay or requests the bill
  const explicitPhrases = [
    "هات الشيك", "عايز الشيك", "عاوز الشيك", "جيب الشيك", "ممكن الشيك",
    "الشيك لو سمحت", "الشيك من فضلك", "فين الشيك", "ابعت الشيك",
    "طلب الشيك", "الحساب لو سمحت", "عاوز احاسب", "عايز احاسب",
    "ممكن احاسب", "عايز ادفع", "عاوز ادفع", "هات الحساب", "جيب الحساب",
    "ابعت الحساب", "الحساب كام", "بكام الحساب", "الفاتورة لو سمحت",
    "الفاتوره لو سمحت", "هات الفاتورة", "هات الفاتوره", "طلب الفاتورة",
    "طلب الفاتوره", "عاوز الفاتورة", "عايز الفاتوره",
    "the bill", "the check", "check please", "bill please"
  ];

  for (const phrase of explicitPhrases) {
    if (norm.includes(cleanArabic(phrase)) || text.toLowerCase().includes(phrase)) {
      return true;
    }
  }

  // If there's any food context, strictly DO NOT treat as a bill request
  if (hasFoodContext) {
    return false;
  }

  // Standalone tokens
  const tokens = norm.split(" ");
  if (
    tokens.includes("شيك") || 
    tokens.includes("الشيك") || 
    tokens.includes("الفاتورة") || 
    tokens.includes("الفاتوره") || 
    tokens.includes("احاسب") || 
    tokens.includes("الحساب")
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if the customer is calling the waiter
 */
function isWaiterCall(text: string): boolean {
  const norm = cleanArabic(text);
  const waiterKeywords = ["ويتر", "جرسون", "استدعاء", "الويتر", "الجرسون", "يا كابتن", "كابتن الصاله", "waiter"];
  return waiterKeywords.some(w => norm.includes(cleanArabic(w)) || text.toLowerCase().includes(w));
}

/**
 * Robust item extraction from user Arabic/English text with quantity parsing
 */
function extractMenuItemsFromText(userText: string, menuItems: any[]): any[] {
  const normText = cleanArabic(userText);
  const matched: any[] = [];
  const matchedItemIds = new Set<string>();

  const quantityMap: Record<string, number> = {
    "واحد": 1, "واحده": 1, "1": 1, "١": 1,
    "اتنين": 2, "اثنين": 2, "2": 2, "٢": 2,
    "تلاتة": 3, "تلاته": 3, "ثلاثة": 3, "ثلاثه": 3, "3": 3, "٣": 3,
    "اربعة": 4, "اربعه": 4, "أربعة": 4, "4": 4, "٤": 4,
    "خمسة": 5, "خمسه": 5, "5": 5, "٥": 5,
    "ستة": 6, "سته": 6, "6": 6, "٦": 6,
    "سبعة": 7, "سبعه": 7, "7": 7, "٧": 7,
    "تمانية": 8, "ثمانية": 8, "8": 8, "٨": 8,
    "تسعة": 9, "تسعه": 9, "9": 9, "٩": 9,
    "عشرة": 10, "عشره": 10, "10": 10, "١٠": 10
  };

  const findQuantity = (itemName: string): number => {
    const normName = cleanArabic(itemName);
    for (const [w, q] of Object.entries(quantityMap)) {
      if (
        normText.includes(`${w} ${normName}`) ||
        normText.includes(`${normName} ${w}`) ||
        normText.includes(`${w} من ${normName}`) ||
        normText.startsWith(`${w} `)
      ) {
        return q;
      }
    }
    const digitMatch = normText.match(new RegExp(`(\\d+|[٠-٩]+)\\s*(?:من\\s+)?${normName}`));
    if (digitMatch) {
      const parsed = parseInt(digitMatch[1], 10);
      if (parsed > 0 && parsed <= 50) return parsed;
    }
    const digitMatch2 = normText.match(new RegExp(`${normName}\\s*(\\d+|[٠-٩]+)`));
    if (digitMatch2) {
      const parsed = parseInt(digitMatch2[1], 10);
      if (parsed > 0 && parsed <= 50) return parsed;
    }
    return 1;
  };

  // Sort items by name length descending so specific items match first
  const sortedItems = [...menuItems].sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));

  for (const item of sortedItems) {
    if (!item || !item.name || matchedItemIds.has(item.id)) continue;
    const normName = cleanArabic(item.name);
    const normEn = (item.nameEn || "").toLowerCase().trim();

    let isMatch = false;

    // Direct contains
    if (normName && (normText.includes(normName) || normName.includes(normText))) {
      isMatch = true;
    } else if (normEn && userText.toLowerCase().includes(normEn)) {
      isMatch = true;
    } else {
      // Token overlap
      const itemTokens = normName.split(" ").filter(t => t.length > 2);
      if (itemTokens.length >= 2) {
        const overlap = itemTokens.filter(t => normText.includes(t));
        if (overlap.length >= 2 || overlap.length === itemTokens.length) {
          isMatch = true;
        }
      } else if (itemTokens.length === 1 && itemTokens[0].length >= 3) {
        if (normText.includes(itemTokens[0])) {
          isMatch = true;
        }
      }
    }

    // Chicken / فراخ synonyms
    if (!isMatch) {
      if (
        (normName.includes("تشيكن") || normName.includes("دجاج")) && 
        (normText.includes("فراخ") || normText.includes("دجاج") || normText.includes("تشكن") || normText.includes("تشيكن"))
      ) {
        const subTokens = normName.split(" ").filter(t => !["تشيكن", "دجاج", "فراخ"].includes(t) && t.length > 2);
        if (subTokens.length === 0 || subTokens.some(st => normText.includes(st))) {
          isMatch = true;
        }
      }
    }

    if (isMatch) {
      matchedItemIds.add(item.id);
      const qty = findQuantity(item.name);
      matched.push({
        id: item.id,
        name: item.name,
        nameEn: item.nameEn || "",
        price: item.price,
        quantity: qty
      });
    }
  }

  return matched;
}

export async function processAIChat(options: ProcessAIChatOptions) {
  const {
    tableNumber,
    message,
    history = [],
    syncStore,
    saveDataToDisk,
    saveKeyToMongo,
    broadcastSync,
    sendPushToAdmins
  } = options;

  const tNum = Number(tableNumber) || 1;

  // 1. Fetch available menu items
  const menuItems = (syncStore["menu_items"] || []).filter((i: any) => i && i.available !== false);
  const systemSettings = syncStore["settings"] || {};
  const currency = systemSettings.currencySymbol || "ج.م";

  // 2. Fetch active orders for this table
  const allOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];
  const tableOrders = allOrders.filter((o: any) => 
    Number(o.tableNumber) === tNum && 
    (o.status === "pending" || o.status === "preparing" || o.status === "ready" || o.status === "delivered")
  );

  const existingAISession = await getAISessionFromMongo(tNum);
  const fullHistory = Array.isArray(existingAISession?.history) && existingAISession.history.length > 0 
    ? existingAISession.history 
    : history;

  // Format concise menu context
  const menuSummary = menuItems.map((i: any) => `- ID: "${i.id}" | اسم: "${i.name}" (${i.nameEn || ""}) | سعر: ${i.price} ${currency}`).join("\n");
  const activeOrdersSummary = tableOrders.map((o: any) => `طلب #${o.id.slice(-4)}: ${(o.items || []).map((it: any) => `${it.menuItem?.name || it.name} (x${it.quantity})`).join(", ")} | حالة: ${o.status}`).join("\n");

  const systemInstruction = `أنت المساعد الذكي لمطعم ومقهى "${systemSettings.systemName || "Smart Cafe"}".
العميل يجلس على طاولة رقم: (${tNum}).

القائمة المتاحة حالياً (متوفرة في المخزن):
${menuSummary || "لا توجد أصناف منشورة حالياً."}

الطلبات النشطة الحالية على الطاولة رقم (${tNum}):
${activeOrdersSummary || "لا توجد طلبات جارية بعد."}

تعليمات هامة جداً:
1. قم بالرد باللغة العربية بأسلوب فندقي راقٍ، وودود، ومختصر جداً.
2. إذا طلب العميل إضافة أصناف أو طلب مأكولات/مشروبات (مثل: برجر، تشيكن، بيتزا، ميلك شيك، قهوة)، اختر الإجراء "add_items" وضع الأصناف المطابقة في مصفوفة items بـ ID والكمية.
3. تحذير حاسم: إياك مطلقاً والخلط بين طلب الشيك (الفاتورة) وأسماء الأطعمة والمشروبات مثل تشيكن (Chicken) أو ميلك شيك (Milkshake) أو شيكولاتة أو كيك. إذا ذكر العميل أي صنف طعام أو شراب، فالإجراء حتماً هو add_items وليس request_bill!
4. اختر الإجراء "request_bill" فقط إذا طلب العميل صراحة دفع الحساب أو الفاتورة ("عاوز أحاسب", "هات الشيك", "الفاتورة لو سمحت").
5. إذا طلب استدعاء الويتر أو الجرسون, اختر الإجراء "call_waiter".
6. قم بالرد بهيكلية JSON فقط.`;

  // Try Gemini API if available
  if (aiClient) {
    try {
      const contentsParts: any[] = [];
      
      fullHistory.slice(-6).forEach((h: any) => {
        contentsParts.push(`${h.role === 'user' ? 'العميل' : 'المساعد'}: ${h.text}`);
      });
      contentsParts.push(`العميل: ${message}`);

      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contentsParts.join("\n"),
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING, description: "الرد العربي الودي والواضح للعميل" },
              action: { 
                type: Type.STRING, 
                enum: ["add_items", "request_bill", "call_waiter", "none"],
                description: "الإجراء المطلوب تنفيذ برمجياً" 
              },
              items: {
                type: Type.ARRAY,
                description: "الأصناف المطلوبة مع الكمية والملاحظات",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "ID الصنف المتاح" },
                    name: { type: Type.STRING, description: "اسم الصنف" },
                    quantity: { type: Type.INTEGER, description: "الكمية المطلوبة" },
                    notes: { type: Type.STRING, description: "ملاحظات إضافية" }
                  },
                  required: ["id", "name", "quantity"]
                }
              }
            },
            required: ["reply", "action"]
          }
        }
      });

      const responseText = response.text || "";
      let jsonRes: any = {};
      try {
        jsonRes = JSON.parse(responseText.trim());
      } catch {
        jsonRes = { reply: responseText || "أهلاً بك! نسعد بخدمتك دائماً.", action: "none" };
      }

      // Safety check: if model mistakenly returned request_bill but user asked for food, correct it!
      const fallbackMatched = extractMenuItemsFromText(message, menuItems);
      if (jsonRes.action === "request_bill" && fallbackMatched.length > 0) {
        jsonRes.action = "add_items";
        jsonRes.items = fallbackMatched;
        jsonRes.reply = `تم استلام طلبك وإضافة: ${fallbackMatched.map(i => i.name).join(" و ")} إلى طلبك بنجاح! 🍽️`;
      }

      // Execute Action
      const executed = await executeAIAction(
        jsonRes,
        tNum,
        syncStore,
        saveDataToDisk,
        saveKeyToMongo,
        broadcastSync,
        sendPushToAdmins
      );

      // Save History
      const updatedHistory = [
        ...fullHistory.slice(-10),
        { role: "user", text: message },
        { role: "model", text: jsonRes.reply || "تم استلام طلبك بنجاح!" }
      ];
      await saveAISessionToMongo(tNum, updatedHistory, { lastAction: jsonRes.action });

      return {
        success: true,
        reply: jsonRes.reply,
        action: jsonRes.action,
        items: jsonRes.items || [],
        executed,
        mode: "ai_gemini"
      };
    } catch (err: any) {
      console.warn("[AI Studio] Gemini API call warning, dropping to local smart fallback engine:", err?.message);
    }
  }

  // Fallback Rule Engine (Zero Freeze / Never Hangs / Robust Arabic Matcher)
  return executeFallbackEngine(
    message,
    tNum,
    menuItems,
    fullHistory,
    syncStore,
    saveDataToDisk,
    saveKeyToMongo,
    broadcastSync,
    sendPushToAdmins
  );
}

async function executeAIAction(
  jsonRes: any,
  tableNumber: number,
  syncStore: Record<string, any>,
  saveDataToDisk: () => void,
  saveKeyToMongo: (key: string, data: any) => Promise<boolean>,
  broadcastSync: (key: string, data: any, senderId?: string) => void,
  sendPushToAdmins?: (payload: any) => Promise<any>
) {
  const { action, items } = jsonRes;
  let executed = false;
  const tNum = Number(tableNumber) || 1;

  if (action === "request_bill") {
    const nowIso = new Date().toISOString();
    const tables = syncStore["tables"] || [];
    const updatedTables = tables.map((t: any) => {
      if (Number(t.tableNumber) === tNum) {
        return { ...t, status: "bill_requested", billRequested: true, billRequestedAt: nowIso };
      }
      return t;
    });
    syncStore["tables"] = updatedTables;

    // Save bill request
    const billReqs = syncStore["bill_requests"] || [];
    const newBill = {
      id: `bill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tableNumber: tNum,
      requestedAt: nowIso,
      status: "pending"
    };
    const updatedBills = [newBill, ...billReqs];
    syncStore["bill_requests"] = updatedBills;

    // 1. Immediate WebSocket Broadcast (0ms)
    broadcastSync("tables", updatedTables);
    broadcastSync("bill_requests", updatedBills);

    // 2. Push Notification to Admin Phones
    if (sendPushToAdmins) {
      sendPushToAdmins({
        title: `🧾 طلب الحساب / الشيك - طاولة #${tNum}`,
        body: `العميل يطلب الفاتورة لطاولة رقم (${tNum})`,
        tag: `bill-req-${tNum}`,
        data: { url: `/?tab=tables&focusTable=${tNum}`, tableNumber: tNum }
      }).catch(() => {});
    }

    // 3. Non-blocking DB & Disk Save
    try {
      saveDataToDisk();
      saveKeyToMongo("tables", updatedTables).catch(() => {});
      saveKeyToMongo("bill_requests", updatedBills).catch(() => {});
    } catch (e) {}

    executed = true;
  } else if (action === "add_items" && Array.isArray(items) && items.length > 0) {
    const validMenuItems = syncStore["menu_items"] || [];
    
    // Resilient Fallback Matching: Never drop items!
    const cartItems = items.map((it: any) => {
      const cleanName = cleanArabic(it.name || "");
      const matched = validMenuItems.find((m: any) => 
        (it.id && m.id === it.id) || 
        cleanArabic(m.name) === cleanName ||
        (cleanName && cleanArabic(m.name).includes(cleanName)) ||
        (cleanName && cleanName.includes(cleanArabic(m.name)))
      );

      return {
        menuItem: {
          id: matched?.id || it.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: matched?.name || it.name || "صنف",
          nameEn: matched?.nameEn || it.nameEn || "",
          price: Number(matched?.price || it.price || 50),
          categoryId: matched?.categoryId || "general",
          image: matched?.image || ""
        },
        quantity: Math.max(1, Number(it.quantity) || 1),
        notes: it.notes || ""
      };
    }).filter(Boolean);

    if (cartItems.length > 0) {
      const nowIso = new Date().toISOString();
      const rawSubtotal = cartItems.reduce(
        (sum: number, ci: any) => sum + ((ci.menuItem?.price || 0) * (ci.quantity || 1)), 
        0
      );

      const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newOrder = {
        id: orderId,
        tableNumber: tNum,
        items: cartItems,
        subtotal: rawSubtotal,
        total: rawSubtotal,
        status: "pending",
        createdAt: nowIso,
        timestamp: Date.now(),
        paymentMethod: "cash"
      };

      // 1. Immediate In-Memory State Updates
      const existingOrders = Array.isArray(syncStore["orders"]) ? syncStore["orders"] : [];
      const updatedOrders = [newOrder, ...existingOrders.filter((o: any) => o.id !== orderId)];
      syncStore["orders"] = updatedOrders;

      const tables = syncStore["tables"] || [];
      const updatedTables = tables.map((t: any) => 
        Number(t.tableNumber) === tNum ? { ...t, status: "busy", currentOrderId: newOrder.id } : t
      );
      syncStore["tables"] = updatedTables;

      // 2. Immediate WebSocket Broadcast to all clients and Admin Dashboard (0ms latency!)
      broadcastSync("orders", updatedOrders);
      broadcastSync("tables", updatedTables);

      // 3. Instant Push notification to Admin Phone(s)
      if (sendPushToAdmins) {
        sendPushToAdmins({
          title: `🛎️ طلب جديد (شات ذكي) - طاولة #${tNum}`,
          body: `القيمة: ${rawSubtotal} ج.م (${cartItems.length} أصناف)`,
          tag: `order-${newOrder.id}`,
          data: { url: `/?tab=orders`, tableNumber: tNum }
        }).catch(() => {});
      }

      // 4. Non-blocking Asynchronous Persistence (disk & MongoDB)
      try {
        saveDataToDisk();
        saveKeyToMongo("orders", updatedOrders).catch((err) => console.warn("[MongoDB] Orders save warning:", err));
        saveKeyToMongo("tables", updatedTables).catch((err) => console.warn("[MongoDB] Tables save warning:", err));
      } catch (saveErr) {
        console.warn("[AI Action] Persistence warning (non-blocking):", saveErr);
      }

      executed = true;
    }
  }

  return executed;
}

async function executeFallbackEngine(
  userText: string,
  tableNumber: number,
  menuItems: any[],
  fullHistory: any[],
  syncStore: Record<string, any>,
  saveDataToDisk: () => void,
  saveKeyToMongo: (key: string, data: any) => Promise<boolean>,
  broadcastSync: (key: string, data: any, senderId?: string) => void,
  sendPushToAdmins?: (payload: any) => Promise<any>
) {
  const tNum = Number(tableNumber) || 1;
  let reply = "";
  let action = "none";
  let matchedItems: any[] = [];

  // 1. Search for menu items FIRST to completely prevent false-positive bill requests
  matchedItems = extractMenuItemsFromText(userText, menuItems);

  if (matchedItems.length > 0) {
    action = "add_items";
    const itemsDescription = matchedItems.map(i => `${i.quantity > 1 ? i.quantity + '× ' : ''}${i.name}`).join(" و ");
    reply = `أهلاً بك! تم استلام طلبك بنجاح وإضافة: ${itemsDescription} إلى طلبك ووصل للمطبخ وللوحة الأدمن فوراً! 🍳✓`;
    await executeAIAction(
      { action: "add_items", items: matchedItems },
      tNum,
      syncStore,
      saveDataToDisk,
      saveKeyToMongo,
      broadcastSync,
      sendPushToAdmins
    );
  } else if (isRealBillRequest(userText)) {
    action = "request_bill";
    reply = `تم استلام طلب الشيك لطاولة رقم (${tNum})، والكرت/الكاشير والويتر في الطريق إليك الآن بالفاتورة! 🧾`;
    await executeAIAction(
      { action: "request_bill" },
      tNum,
      syncStore,
      saveDataToDisk,
      saveKeyToMongo,
      broadcastSync,
      sendPushToAdmins
    );
  } else if (isWaiterCall(userText)) {
    action = "call_waiter";
    reply = `تم إرسال إشعار للويتر لإجابة طلبك على طاولة رقم (${tNum}) فوراً! 🔔`;
    if (sendPushToAdmins) {
      sendPushToAdmins({
        title: `🔔 استدعاء الويتر - طاولة #${tNum}`,
        body: `العميل على طاولة #${tNum} يطلب حضور الويتر الآن لمساعدته`,
        tag: `waiter-call-${tNum}`,
        data: { url: `/?tab=tables&focusTable=${tNum}`, tableNumber: tNum }
      }).catch(() => {});
    }
  } else {
    const topPicks = menuItems.slice(0, 3).map(m => m.name).join("، ");
    reply = `أهلاً بك! يمكنك إخباري باسم الصنف أو المشروب المطلوب مباشرة (مثل: "عايز تشيكن برجر" أو "2 كابتشينو"). من أكثر الأصناف طلباً لدينا: ${topPicks || "تصفح القائمة أعلاه"}.`;
  }

  const updatedHistory = [
    ...fullHistory.slice(-10),
    { role: "user", text: userText },
    { role: "model", text: reply }
  ];
  await saveAISessionToMongo(tNum, updatedHistory, { lastAction: action });

  return {
    success: true,
    reply,
    action,
    items: matchedItems,
    mode: "fallback_engine"
  };
}
