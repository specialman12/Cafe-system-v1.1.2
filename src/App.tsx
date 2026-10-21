import React, { useState, useEffect, useCallback } from 'react';
import { 
  Category, 
  MenuItem, 
  Order, 
  TableInfo, 
  Banner, 
  PopupAd, 
  SystemSettings,
  CartItem,
  Customer,
  SystemLog,
  Coupon
} from './types';
import { getData } from './lib/storeConstants';
import { useSyncState } from './lib/useSyncState';
import { useOrdersVault } from './lib/useOrdersVault';
import { normalizeOrders } from './utils/orderUtils';
import { ClientMenu } from './components/ClientMenu';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginPage } from './components/AdminLoginPage';

export default function App() {
  const [view, setView] = useState<'client' | 'admin' | 'admin-login'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();

      const hasAdminSession = localStorage.getItem('smart_menu_admin_session') === 'true';
      const activeView = sessionStorage.getItem('smart_menu_active_view');

      const isAdminInPath = pathname === '/admin' || pathname === '/admin/' || pathname.endsWith('/admin');
      const isAdminInSearch = params.get('admin') === 'true' || params.get('view') === 'admin' || params.has('admin_login');
      const isAdminInHash = hash === '#admin' || hash === '#/admin';

      if (params.has('table') && !params.has('admin_login') && !isAdminInPath && !isAdminInHash) {
        return 'client';
      }

      if (isAdminInPath || isAdminInSearch || isAdminInHash) {
        return hasAdminSession ? 'admin' : 'admin-login';
      }

      if (activeView === 'admin' && hasAdminSession) {
        return 'admin';
      }

      if (activeView === 'client') {
        return 'client';
      }
    }
    return 'client';
  });

  // Parse Table Number from URL parameter ?table=X (0 means not selected yet / requires selection)
  const [tableNumber, setTableNumber] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('table');
      if (t !== null && t !== '' && !isNaN(parseInt(t, 10)) && parseInt(t, 10) > 0) {
        return parseInt(t, 10);
      }
    }
    return 0; // 0 = No table selected yet (mandatory selection on direct link access)
  });

  const [isViewOnly, setIsViewOnly] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      const preview = params.get('preview');
      const view = params.get('view');
      const t = params.get('table');
      return mode === 'view' || mode === 'browse' || preview === 'true' || view === 'menu' || t === 'view' || t === 'browse';
    }
    return false;
  });

  const [isTableFixed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('table');
      if (t !== null && t !== '' && !isNaN(parseInt(t, 10)) && parseInt(t, 10) > 0) {
        return true;
      }
    }
    return false;
  });

  // Core application state
  const [categories, setCategories] = useSyncState<Category[]>('categories', getData.categories());
  const [menuItems, setMenuItems] = useSyncState<MenuItem[]>('menu_items', getData.menuItems());
  const {
    orders,
    setOrders,
    updateOrderStatus,
    updatingOrderIds,
    placeOrder,
    billRequests,
    setBillRequests,
    mergeIncomingOrders,
    mergeIncomingBills,
    requestBillForTable,
    settleBillForTable,
    deleteOrderPermanently,
    clearAllOrders
  } = useOrdersVault(menuItems);
  const [tables, setTables, tablesLoaded] = useSyncState<TableInfo[]>('tables', getData.tables());
  const [customers, setCustomers] = useSyncState<Customer[]>('customers', getData.customers());
  const [banners, setBanners] = useSyncState<Banner[]>('banners', getData.banners());
  const [popupAd, setPopupAd] = useSyncState<PopupAd>('popup_ad', getData.popupAd());
  const [settings, setSettings] = useSyncState<SystemSettings>('settings', getData.settings());
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [coupons, setCoupons] = useSyncState<Coupon[]>('coupons', getData.coupons());

  const addSystemLog = useCallback(() => {
    // Audit logs removed
  }, []);

  // Check URL for admin access or table changes
  useEffect(() => {
    const handleUrlChange = () => {
      const pathname = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);

      const t = params.get('table');
      const mode = params.get('mode');
      const preview = params.get('preview');
      const view = params.get('view');
      const isBrowse = mode === 'view' || mode === 'browse' || preview === 'true' || view === 'menu' || t === 'view' || t === 'browse';
      setIsViewOnly(isBrowse);

      if (t !== null && t !== '' && !isNaN(parseInt(t, 10)) && parseInt(t, 10) > 0) {
        setTableNumber(parseInt(t, 10));
      } else {
        setTableNumber(0);
      }

      // If table parameter is present (customer scanned QR code ?table=X), stay in client view
      const hasAdminSession = localStorage.getItem('smart_menu_admin_session') === 'true';
      const activeView = sessionStorage.getItem('smart_menu_active_view');
      const isAdminInPath = pathname === '/admin' || pathname === '/admin/' || pathname.endsWith('/admin');
      const isAdminInSearch = params.get('admin') === 'true' || params.get('view') === 'admin' || params.has('admin_login');
      const isAdminInHash = hash === '#admin' || hash === '#/admin';

      if (params.has('table') && !params.has('admin_login') && !isAdminInPath && !isAdminInHash) {
        setView('client');
      } else if (isAdminInPath || isAdminInSearch || isAdminInHash) {
        setView(hasAdminSession ? 'admin' : 'admin-login');
      } else if (activeView === 'admin' && hasAdminSession) {
        setView('admin');
      } else if (activeView === 'client') {
        setView('client');
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const handleCancelOrder = useCallback((orderId: string) => {
    setOrders(prev => {
      const target = prev.find(o => o.id === orderId);
      if (!target || target.status !== 'pending') return prev;

      const updated = prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' as const } : o);

      const tableNum = target.tableNumber;
      const remainingActive = updated.filter(o => o.tableNumber === tableNum && (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready' || o.status === 'delivered'));

      if (remainingActive.length === 0) {
        setTables(tablesPrev => tablesPrev.map(t => {
          if (t.tableNumber === tableNum && t.status !== 'bill_requested') {
            return {
              ...t,
              status: 'available',
              seatedAt: undefined,
              firstOrderAt: undefined,
              currentOrderId: undefined
            };
          }
          return t;
        }));
      }

      return updated;
    });
  }, [setOrders, setTables]);

  // Set document title and browser favicon dynamically according to current view (Admin vs Client Menu) and settings
  useEffect(() => {
    const isAdminView = view === 'admin' || view === 'admin-login';

    // 1. Dynamic Page Title
    let currentTitle = '';
    if (isAdminView) {
      currentTitle = settings.adminPageTitle || `لوحة الإدارة - ${settings.systemName || 'Smart Café'}`;
    } else {
      currentTitle = settings.menuPageTitle || settings.customBrowserTitle || settings.systemName || 'Smart Café & Resto';
    }
    document.title = currentTitle;

    // 2. Dynamic Favicon (Browser Icon)
    let currentFavicon = '';
    if (isAdminView) {
      currentFavicon = settings.adminFaviconUrl || settings.customFaviconUrl || settings.logoUrl || '';
    } else {
      currentFavicon = settings.menuFaviconUrl || settings.customFaviconUrl || settings.logoUrl || '';
    }

    if (currentFavicon && typeof document !== 'undefined') {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = currentFavicon;
    }
  }, [
    view,
    settings.adminPageTitle,
    settings.adminFaviconUrl,
    settings.menuPageTitle,
    settings.menuFaviconUrl,
    settings.customBrowserTitle,
    settings.customFaviconUrl,
    settings.systemName,
    settings.logoUrl
  ]);

  const handlePlaceOrder = useCallback((orderData: { 
    tableNumber: number; 
    items: CartItem[]; 
    notes?: string; 
    paymentMethod?: 'cash' | 'card';
    customerName?: string;
    customerPhone?: string;
    deviceId?: string;
    couponCode?: string;
    discountAmount?: number;
  }) => {
    if (!orderData || !orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      return;
    }
    const rawSubtotal = orderData.items.reduce((sum, item) => sum + ((item.menuItem?.price || 0) * (item.quantity || 1)), 0);
    const discount = orderData.discountAmount || 0;
    const discountedSubtotal = Math.max(0, rawSubtotal - discount);
    const isTaxActive = settings.taxEnabled !== false && (settings.taxRate ?? 0) > 0;
    const taxRate = isTaxActive ? (settings.taxRate ?? 0) : 0;
    const tax = Math.round((discountedSubtotal * taxRate) / 100);
    const total = discountedSubtotal + tax;
    const nowIso = new Date().toISOString();

    const sanitizedItems: CartItem[] = (orderData.items || []).map(ci => {
      const rawItem = ci.menuItem || (ci as any);
      return {
        quantity: ci.quantity || 1,
        notes: ci.notes || '',
        menuItem: {
          id: rawItem.id || `item_${Math.random()}`,
          categoryId: rawItem.categoryId || '',
          name: rawItem.name || 'صنف',
          nameEn: rawItem.nameEn || '',
          price: typeof rawItem.price === 'number' ? rawItem.price : 0,
          description: rawItem.description || '',
          descriptionEn: rawItem.descriptionEn || '',
          image: '',
          available: rawItem.available ?? true,
          isPopular: rawItem.isPopular,
          isNew: rawItem.isNew,
          calories: rawItem.calories,
          order: rawItem.order
        }
      };
    });

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      tableNumber: Number(orderData.tableNumber) || 1,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      items: sanitizedItems,
      subtotal: rawSubtotal,
      couponCode: orderData.couponCode,
      discountAmount: discount,
      total,
      status: 'pending',
      createdAt: nowIso,
      notes: orderData.notes,
      paymentMethod: orderData.paymentMethod || 'cash'
    };

    placeOrder(newOrder);

    // Increment coupon usage count if used
    if (orderData.couponCode) {
      setCoupons(prev => prev.map(c => c.code.toUpperCase() === orderData.couponCode?.toUpperCase() ? { ...c, usageCount: (c.usageCount || 0) + 1 } : c));
    }

    // Save or update customer profile in CRM
    if (orderData.customerPhone || orderData.customerName) {
      setCustomers(prev => {
        const phone = orderData.customerPhone?.trim();
        const existingIndex = phone ? prev.findIndex(c => c.phone === phone) : -1;
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            name: orderData.customerName?.trim() || updated[existingIndex].name,
            totalOrders: (updated[existingIndex].totalOrders || 0) + 1,
            totalSpent: (updated[existingIndex].totalSpent || 0) + total,
            lastTable: orderData.tableNumber,
            lastVisit: new Date().toISOString()
          };
          return updated;
        } else {
          const newCust: Customer = {
            id: `cust-${Date.now()}`,
            name: orderData.customerName?.trim() || `عميل طاولة ${orderData.tableNumber}`,
            phone: phone || '',
            totalOrders: 1,
            totalSpent: total,
            lastTable: orderData.tableNumber,
            lastVisit: new Date().toISOString(),
            createdAt: new Date().toISOString()
          };
          return [newCust, ...prev];
        }
      });
    }

    // Mark table as busy
    setTables(prev => {
      const targetNum = Number(orderData.tableNumber) || 1;
      const existing = prev.find(t => Number(t.tableNumber) === targetNum);
      if (existing) {
        return prev.map(t => Number(t.tableNumber) === targetNum ? { 
          ...t, 
          status: 'busy', 
          currentOrderId: newOrder.id, 
          seatedAt: t.seatedAt || nowIso,
          firstOrderAt: t.firstOrderAt || nowIso,
          activeSessionDeviceId: orderData.deviceId || t.activeSessionDeviceId,
          activeSessionCustomerName: orderData.customerName || t.activeSessionCustomerName,
          lastActiveHeartbeat: Date.now(),
          billRequested: false,
          billRequestedAt: undefined,
          tableDelivered: false
        } : t);
      } else {
        return [{
          tableNumber: targetNum,
          status: 'busy',
          currentOrderId: newOrder.id,
          seatedAt: nowIso,
          firstOrderAt: nowIso,
          activeSessionCustomerName: orderData.customerName,
          lastActiveHeartbeat: Date.now(),
          billRequested: false,
          billRequestedAt: undefined,
          tableDelivered: false
        }, ...prev];
      }
    });
  }, [settings.taxRate, settings.currencySymbol, setOrders, setCustomers, setTables]);

  const handleRequestBill = useCallback((tNum: number, customerName?: string, deviceId?: string, explicitTotal?: number) => {
    const tableN = Number(tNum);
    if (!tableN || isNaN(tableN)) return;
    const nowIso = new Date().toISOString();
    requestBillForTable(tableN, customerName, deviceId, explicitTotal);

    setTables(prev => {
      const exists = prev.some(t => Number(t.tableNumber) === tableN);
      if (exists) {
        return prev.map(t => 
          Number(t.tableNumber) === tableN
            ? { ...t, status: 'bill_requested', billRequested: true, billRequestedAt: nowIso } 
            : t
        );
      } else {
        return [...prev, {
          tableNumber: tableN,
          status: 'bill_requested',
          billRequested: true,
          billRequestedAt: nowIso,
          activeSessionCustomerName: customerName,
          activeSessionDeviceId: deviceId
        }];
      }
    });

    setOrders(prev => prev.map(o => {
      if (Number(o.tableNumber) === tableN && o.status !== 'completed' && o.status !== 'cancelled') {
        return { ...o, billRequested: true, billRequestedAt: nowIso };
      }
      return o;
    }));

    // Direct API call
    fetch('/api/tables/request-bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableNumber: tableN, customerName, deviceId, totalAmount: explicitTotal })
    }).catch(err => console.warn('[Direct Request Bill API] Error:', err));
  }, [requestBillForTable, setTables, setOrders]);

  const handleRemoveOrderItem = useCallback((orderId: string, menuItemId: string) => {
    setOrders(prev => {
      const target = prev.find(o => o.id === orderId);
      if (!target || target.status !== 'pending' || !target.items) return prev;

      const remainingItems = target.items.filter(ci => {
        const id = ci?.menuItem?.id || (ci as any)?.menuItemId || (ci as any)?.id;
        return id !== menuItemId;
      });
      if (remainingItems.length === 0) {
        const updated = prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' as const } : o);
        const tableNum = target.tableNumber;
        const remainingActive = updated.filter(o => o.tableNumber === tableNum && (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready' || o.status === 'delivered'));

        if (remainingActive.length === 0) {
          setTables(tablesPrev => tablesPrev.map(t => {
            if (t.tableNumber === tableNum && t.status !== 'bill_requested') {
              return {
                ...t,
                status: 'available',
                seatedAt: undefined,
                firstOrderAt: undefined,
                currentOrderId: undefined
              };
            }
            return t;
          }));
        }

        return updated;
      } else {
        const subtotal = remainingItems.reduce((sum, item) => sum + ((item.menuItem?.price ?? (item as any)?.price ?? 0) * (item.quantity || 1)), 0);
        const isTaxActive = settings.taxEnabled !== false && (settings.taxRate ?? 0) > 0;
        const tax = isTaxActive ? Math.round((subtotal * (settings.taxRate ?? 0)) / 100) : 0;
        const total = subtotal + tax;

        return prev.map(o => o.id === orderId ? { ...o, items: remainingItems, total } : o);
      }
    });
  }, [settings.taxRate, settings.taxEnabled, setOrders, setTables]);

  const handleTableHeartbeat = useCallback((tNum: number, deviceId: string, customerName?: string) => {
    fetch('/api/tables/claim-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableNumber: tNum, deviceId, customerName, isHeartbeat: true })
    }).catch(() => {});

    setTables(prev => {
      let changed = false;
      const next = prev.map(t => {
        if (t.tableNumber === tNum) {
          if (t.activeSessionDeviceId === deviceId) {
            if (Date.now() - (t.lastActiveHeartbeat || 0) > 10000) {
              changed = true;
              return {
                ...t,
                lastActiveHeartbeat: Date.now(),
                activeSessionCustomerName: customerName || t.activeSessionCustomerName
              };
            }
          }
        }
        return t;
      });
      return changed ? next : prev;
    });
  }, [setTables]);

  const handleRequestSessionTransfer = useCallback((tNum: number, requesterDeviceId: string, requesterCustomerName?: string) => {
    fetch('/api/tables/transfer-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableNumber: tNum, requesterDeviceId, requesterCustomerName })
    }).catch(() => {});

    setTables(prev => prev.map(t => {
      if (t.tableNumber === tNum) {
        return {
          ...t,
          sessionTransferRequest: {
            fromDeviceId: requesterDeviceId,
            fromCustomerName: requesterCustomerName,
            requestedAt: Date.now(),
            status: 'pending'
          }
        };
      }
      return t;
    }));
  }, [setTables]);

  const handleRespondSessionTransfer = useCallback((tNum: number, accept: boolean, currentDeviceId?: string) => {
    if (currentDeviceId) {
      fetch('/api/tables/transfer-respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNumber: tNum, currentDeviceId, accept })
      }).catch(() => {});
    }

    setTables(prev => prev.map(t => {
      if (t.tableNumber === tNum && t.sessionTransferRequest) {
        if (accept) {
          return {
            ...t,
            activeSessionDeviceId: t.sessionTransferRequest.fromDeviceId,
            lastActiveHeartbeat: Date.now(),
            sessionTransferRequest: {
              ...t.sessionTransferRequest,
              status: 'accepted'
            }
          };
        } else {
          return {
            ...t,
            sessionTransferRequest: {
              ...t.sessionTransferRequest,
              status: 'rejected'
            }
          };
        }
      }
      return t;
    }));
  }, [setTables]);

  const handleTakeoverDeliveredTable = useCallback((tNum: number, newDeviceId: string) => {
    setTables(prev => prev.map(t => {
      if (t.tableNumber === tNum) {
        return {
          ...t,
          activeSessionDeviceId: newDeviceId,
          lastActiveHeartbeat: Date.now(),
          tableDelivered: false,
          sessionTransferRequest: undefined
        };
      }
      return t;
    }));
  }, [setTables]);

  const handleReleaseTableSession = useCallback((tNum: number, newDeviceId?: string) => {
    fetch('/api/tables/release-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableNumber: tNum })
    }).catch(() => {});

    setTables(prev => prev.map(t => {
      if (t.tableNumber !== tNum) return t;
      const tableOrders = orders.filter(o => o.tableNumber === tNum && (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready' || o.status === 'delivered'));
      if (tableOrders.length === 0) {
        return {
          ...t,
          status: 'available',
          activeSessionDeviceId: newDeviceId || undefined,
          lastActiveHeartbeat: newDeviceId ? Date.now() : undefined,
          activeSessionCustomerName: undefined,
          seatedAt: undefined,
          firstOrderAt: undefined,
          currentOrderId: undefined,
          billRequested: false,
          billRequestedAt: undefined,
          tableDelivered: false,
          sessionTransferRequest: undefined
        };
      } else {
        return {
          ...t,
          activeSessionDeviceId: newDeviceId || undefined,
          lastActiveHeartbeat: newDeviceId ? Date.now() : undefined
        };
      }
    }));
  }, [orders, setTables]);

  return (
    <div className="min-h-screen text-[#2D1E18] font-sans antialiased selection:bg-[#D4A373] selection:text-[#2A1D15]">
      {view === 'client' ? (
        <ClientMenu
          categories={categories || []}
          menuItems={menuItems || []}
          orders={orders || []}
          tableNumber={tableNumber}
          isTableFixed={isTableFixed}
          isViewOnly={isViewOnly}
          tables={tables || []}
          tablesLoaded={tablesLoaded}
          banners={banners || []}
          popupAd={popupAd}
          settings={settings}
          coupons={coupons || []}
          customers={customers || []}
          onPlaceOrder={handlePlaceOrder}
          onRequestBill={handleRequestBill}
          onHeartbeat={handleTableHeartbeat}
          onRequestSessionTransfer={handleRequestSessionTransfer}
          onRespondSessionTransfer={handleRespondSessionTransfer}
          onTakeoverDeliveredTable={handleTakeoverDeliveredTable}
          onReleaseSession={handleReleaseTableSession}
          onCancelOrder={handleCancelOrder}
          onRemoveOrderItem={handleRemoveOrderItem}
          onTableChange={setTableNumber}
          onSwitchToAdmin={() => {
            sessionStorage.setItem('smart_menu_active_view', 'admin');
            const hasAdminSession = localStorage.getItem('smart_menu_admin_session') === 'true';
            setView(hasAdminSession ? 'admin' : 'admin-login');
          }}
        />
      ) : view === 'admin-login' ? (
        <AdminLoginPage
          settings={settings}
          onSuccess={() => {
            try { localStorage.setItem('smart_menu_admin_session', 'true'); } catch (e) {}
            sessionStorage.setItem('smart_menu_active_view', 'admin');
            setView('admin');
          }}
          onBackToClient={() => {
            sessionStorage.setItem('smart_menu_active_view', 'client');
            setView('client');
          }}
        />
      ) : (
        <AdminDashboard
          categories={categories || []}
          setCategories={setCategories}
          menuItems={menuItems || []}
          setMenuItems={setMenuItems}
          orders={orders || []}
          setOrders={setOrders}
          updateOrderStatus={updateOrderStatus}
          updatingOrderIds={updatingOrderIds}
          billRequests={billRequests || []}
          setBillRequests={setBillRequests}
          mergeIncomingBills={mergeIncomingBills}
          mergeIncomingOrders={mergeIncomingOrders}
          deleteOrderPermanently={deleteOrderPermanently}
          clearAllOrders={clearAllOrders}
          tables={tables || []}
          setTables={setTables}
          customers={customers || []}
          setCustomers={setCustomers}
          banners={banners || []}
          setBanners={setBanners}
          popupAd={popupAd}
          setPopupAd={setPopupAd}
          settings={settings}
          setSettings={setSettings}
          coupons={coupons || []}
          setCoupons={setCoupons}
          systemLogs={systemLogs || []}
          setSystemLogs={setSystemLogs}
          addSystemLog={addSystemLog}
          onSwitchToClient={() => {
            sessionStorage.setItem('smart_menu_active_view', 'client');
            setView('client');
          }}
          onLockAdmin={() => {
            try { localStorage.removeItem('smart_menu_admin_session'); } catch (e) {}
            sessionStorage.setItem('smart_menu_active_view', 'client');
            setView('admin-login');
          }}
        />
      )}
    </div>
  );
}
