import { Order, MenuItem } from '../types';

export function isSameOrderId(idA: any, idB: any): boolean {
  if (!idA || !idB) return false;
  if (idA === idB) return true;
  const sA = String(idA).trim();
  const sB = String(idB).trim();
  if (sA === sB) return true;
  const cleanA = sA.replace(/^ord[-_]/, '');
  const cleanB = sB.replace(/^ord[-_]/, '');
  if (cleanA && cleanB && cleanA === cleanB) return true;
  const numA = sA.match(/\d{10,}/)?.[0];
  const numB = sB.match(/\d{10,}/)?.[0];
  if (numA && numB && numA === numB) return true;
  return false;
}

export function normalizeOrder(order: any, fallbackMenuItems?: MenuItem[] | Map<string, MenuItem>): Order {
  if (!order || typeof order !== 'object') {
    return {
      id: `ord-${Date.now()}`,
      tableNumber: 1,
      items: [],
      total: 0,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
  }

  const menuMap: Map<string, MenuItem> | null = fallbackMenuItems instanceof Map
    ? fallbackMenuItems
    : (Array.isArray(fallbackMenuItems) && fallbackMenuItems.length > 0
      ? new Map(fallbackMenuItems.map(m => [m.id, m]))
      : null);

  const rawItems = Array.isArray(order.items) ? order.items : [];
  const normalizedItems = rawItems.map((ci: any, idx: number) => {
    const rawMenuItem = ci && typeof ci === 'object' ? (ci.menuItem || {}) : {};
    const itemId = String(rawMenuItem.id || ci?.menuItemId || ci?.id || `item-${idx}`);
    
    // Fast path: if rawMenuItem already has name and price, avoid map lookup
    const hasFullInfo = rawMenuItem.name && typeof rawMenuItem.price === 'number';
    const matchedMenuItem = (!hasFullInfo && menuMap) ? menuMap.get(itemId) : undefined;

    const rawPrice = typeof rawMenuItem.price === 'number'
      ? rawMenuItem.price
      : typeof ci?.price === 'number'
      ? ci.price
      : (parseFloat(rawMenuItem.price) || parseFloat(ci?.price) || matchedMenuItem?.price || 0);

    const price = !isNaN(rawPrice) && rawPrice >= 0 ? rawPrice : 0;

    const name = rawMenuItem.name || ci?.name || matchedMenuItem?.name || 'صنف';
    const nameEn = rawMenuItem.nameEn || ci?.nameEn || matchedMenuItem?.nameEn || '';
    const image = rawMenuItem.image || ci?.image || matchedMenuItem?.image || '';
    const categoryId = rawMenuItem.categoryId || ci?.categoryId || matchedMenuItem?.categoryId || '';

    return {
      menuItem: {
        id: itemId,
        name,
        nameEn,
        price,
        categoryId,
        description: rawMenuItem.description || matchedMenuItem?.description || '',
        image,
        available: rawMenuItem.available ?? true,
        calories: rawMenuItem.calories || matchedMenuItem?.calories
      },
      quantity: typeof ci?.quantity === 'number' && ci.quantity > 0 ? ci.quantity : (parseInt(ci?.quantity, 10) || 1),
      notes: ci?.notes || ci?.note || ''
    };
  });

  const tNum = typeof order.tableNumber === 'number' ? order.tableNumber : (parseInt(order.tableNumber, 10) || 0);
  const isTakeaway = tNum === 0;

  const itemsTotal = normalizedItems.reduce((s: number, it: any) => s + ((it.menuItem?.price || 0) * (it.quantity || 1)), 0);
  const orderRawTotal = typeof order.total === 'number' ? order.total : parseFloat(order.total);
  const finalTotal = (!isNaN(orderRawTotal) && orderRawTotal > 0) ? orderRawTotal : itemsTotal;

  return {
    ...order,
    id: String(order.id || `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`),
    tableNumber: tNum,
    items: normalizedItems,
    total: finalTotal,
    status: order.status || 'pending',
    createdAt: order.createdAt || new Date().toISOString(),
    billRequested: isTakeaway ? false : Boolean(order.billRequested),
    billRequestedAt: isTakeaway ? undefined : order.billRequestedAt
  };
}

export function normalizeOrders(orders: any[], fallbackMenuItems?: MenuItem[] | Map<string, MenuItem>): Order[] {
  if (!Array.isArray(orders)) return [];
  const menuMap: Map<string, MenuItem> | null = fallbackMenuItems instanceof Map
    ? fallbackMenuItems
    : (Array.isArray(fallbackMenuItems) && fallbackMenuItems.length > 0
      ? new Map(fallbackMenuItems.map(m => [m.id, m]))
      : null);

  return orders.map(o => normalizeOrder(o, menuMap || undefined));
}

/**
 * Automatically adds Egypt country code (+20) when customer enters phone number
 */
export function formatEgyptianPhoneNumber(raw: string): string {
  if (!raw) return '';
  // Convert Eastern Arabic numerals (٠-٩) to English digits
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let cleaned = raw.replace(/[٠-٩]/g, d => {
    const idx = arabicDigits.indexOf(d);
    return idx !== -1 ? idx.toString() : d;
  });

  const trimmed = cleaned.trim();
  if (!trimmed) return '';

  // Allow clearing if user deletes back down to prefix
  if (trimmed === '+' || trimmed === '+2' || trimmed === '+20' || trimmed === '+20 ') {
    return '';
  }

  // Extract all digits
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  // If already starts with Egypt country code '20'
  if (digits.startsWith('20')) {
    let rest = digits.slice(2);
    if (rest.startsWith('0')) {
      rest = rest.slice(1);
    }
    return `+20 ${rest}`;
  }

  // If starts with 0 (e.g. 010..., 011..., 012..., 015...)
  if (digits.startsWith('0')) {
    return `+20 ${digits.slice(1)}`;
  }

  // If starts with 1 (e.g. 10..., 11..., 12..., 15...)
  if (/^1[0125]/.test(digits)) {
    return `+20 ${digits}`;
  }

  // Default for any other digits
  return `+20 ${digits}`;
}

