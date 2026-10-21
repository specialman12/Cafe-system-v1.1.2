import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Category, 
  MenuItem, 
  CartItem, 
  Order,
  TableInfo, 
  Banner, 
  PopupAd, 
  SystemSettings,
  Coupon,
  Customer,
  CustomerReview
} from '../types';
import { formatEgyptianPhoneNumber } from '../utils/orderUtils';
import { clientUiTranslations, autoTranslateArabicToEnglish, autoTranslateCustomerName } from '../utils/translation';
import { DeveloperModal } from './DeveloperModal';
import { ThermalReceipt } from './ThermalReceipt';
import { SpecialOffersCarousel } from './SpecialOffersCarousel';
import { subscribeClientPush, isPushSupported } from '../lib/pushNotifications';
import { 
  UserPlus,
  User,
  ShoppingBag, 
  Search, 
  Plus, 
  Minus, 
  Trash2,
  X, 
  Layers, 
  Receipt, 
  Check, 
  ChevronLeft, 
  Sparkles, 
  Lock, 
  CircleDot, 
  ChefHat,
  Coffee,
  CheckCircle2,
  Clock,
  Send,
  Flame,
  CreditCard,
  Banknote,
  Info,
  BellRing,
  Phone,
  MessageCircle,
  MapPin,
  Globe,
  Instagram,
  Facebook,
  Share2,
  ShieldAlert,
  Unlock,
  Printer,
  FileText,
  AlertTriangle,
  AlertCircle,
  Eye,
  Smartphone,
  RotateCcw,
  Tag,
  Percent,
  Star,
  Type,
  Gift,
  Heart,
  Award,
  UtensilsCrossed,
  Utensils
} from 'lucide-react';

interface ClientMenuProps {
  categories: Category[];
  menuItems: MenuItem[];
  orders: Order[];
  tableNumber: number;
  isTableFixed?: boolean;
  isViewOnly?: boolean;
  tables: TableInfo[];
  tablesLoaded?: boolean;
  banners: Banner[];
  popupAd: PopupAd;
  settings: SystemSettings;
  coupons?: Coupon[];
  customers?: Customer[];
  reviews?: CustomerReview[];
  onSubmitReview?: (review: Omit<CustomerReview, 'id' | 'createdAt' | 'status'>) => void;
  onPlaceOrder: (order: { 
    tableNumber: number; 
    items: CartItem[]; 
    notes?: string; 
    paymentMethod?: 'cash' | 'card';
    customerName?: string;
    customerPhone?: string;
    deviceId?: string;
    couponCode?: string;
    discountAmount?: number;
  }) => void;
  onRequestBill: (tableNumber: number, customerName?: string, deviceId?: string, explicitTotal?: number) => void;
  onHeartbeat?: (tableNumber: number, deviceId: string, customerName?: string) => void;
  onRequestSessionTransfer?: (tableNumber: number, deviceId: string, customerName?: string) => void;
  onRespondSessionTransfer?: (tableNumber: number, accept: boolean, currentDeviceId?: string) => void;
  onTakeoverDeliveredTable?: (tableNumber: number, deviceId: string) => void;
  onReleaseSession?: (tableNumber: number, newDeviceId?: string) => void;
  onCancelOrder?: (orderId: string) => void;
  onRemoveOrderItem?: (orderId: string, menuItemId: string) => void;
  onTableChange: (newTable: number) => void;
  onSwitchToAdmin: () => void;
}

export const ClientMenu: React.FC<ClientMenuProps> = ({
  categories = [],
  menuItems = [],
  orders = [],
  tableNumber = 0,
  isTableFixed = false,
  isViewOnly = false,
  tables = [],
  tablesLoaded = true,
  banners = [],
  popupAd,
  settings,
  coupons = [],
  customers = [],
  reviews = [],
  onSubmitReview,
  onPlaceOrder,
  onRequestBill,
  onHeartbeat,
  onRequestSessionTransfer,
  onRespondSessionTransfer,
  onTakeoverDeliveredTable,
  onReleaseSession,
  onCancelOrder,
  onRemoveOrderItem,
  onTableChange,
  onSwitchToAdmin
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const itemsSectionRef = useRef<HTMLDivElement | null>(null);

  const handleSelectCategory = (catId: string | null) => {
    setSelectedCategoryId(catId);
    setSearchQuery('');
    
    // Auto-scroll to items top ONLY when inside a specific category, not on the main homepage/interface
    if (catId) {
      window.scrollTo(0, 0);
      setTimeout(() => {
        if (itemsSectionRef.current) {
          itemsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 30);
    }
  };

  // Scroll to top of items only when inside a specific category
  useEffect(() => {
    if (selectedCategoryId) {
      window.scrollTo(0, 0);
      const timer = setTimeout(() => {
        if (itemsSectionRef.current) {
          itemsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [selectedCategoryId]);
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState<'ar' | 'en'>(() => {
    try {
      const saved = localStorage.getItem('smart_menu_preferred_lang');
      if (saved === 'ar' || saved === 'en') return saved;
    } catch {}

    if (settings.autoDetectBrowserLanguage !== false) {
      try {
        const navLang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
        if (navLang.toLowerCase().startsWith('en')) {
          return 'en';
        }
      } catch {}
    }

    return (settings.defaultLanguage as 'ar' | 'en') || 'ar';
  });

  const handleToggleLanguage = () => {
    setLanguage(prev => {
      const next = prev === 'ar' ? 'en' : 'ar';
      try { localStorage.setItem('smart_menu_preferred_lang', next); } catch {}
      return next;
    });
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('smart_menu_preferred_lang');
      if (!saved && settings.defaultLanguage) {
        setLanguage(settings.defaultLanguage as 'ar' | 'en');
      }
    } catch {}
  }, [settings.defaultLanguage]);
  const t = clientUiTranslations[language] || clientUiTranslations.ar;
  const [showDevModal, setShowDevModal] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);
  const [orderNotes, setOrderNotes] = useState('');
  const [customerName, setCustomerName] = useState(() => {
    try { return localStorage.getItem('smart_menu_client_name') || ''; } catch { return ''; }
  });
  const [customerPhone, setCustomerPhone] = useState(() => {
    try {
      const saved = localStorage.getItem('smart_menu_client_phone') || '';
      return saved ? formatEgyptianPhoneNumber(saved) : '';
    } catch { return ''; }
  });
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);
  const [confirmCancelOrderId, setConfirmCancelOrderId] = useState<string | null>(null);
  const [showBillSuccess, setShowBillSuccess] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showDigitalCheck, setShowDigitalCheck] = useState(false);
  const [isBrowsingOnly, setIsBrowsingOnly] = useState(() => Boolean(isViewOnly));
  const [currentTableNum, setCurrentTableNum] = useState<number>(() => {
    if (isViewOnly) return 0;
    if (typeof tableNumber === 'number' && tableNumber > 0) {
      return tableNumber;
    }
    return 0;
  });
  const [showTableChangeModal, setShowTableChangeModal] = useState<boolean>(() => {
    if (isViewOnly) return false;
    return !tableNumber || tableNumber <= 0;
  });
  const [clientPushSubscribed, setClientPushSubscribed] = useState(false);
  const [isActivatingPush, setIsActivatingPush] = useState(false);
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [isCallingWaiter, setIsCallingWaiter] = useState(false);

  const handleActivatePush = async () => {
    setIsActivatingPush(true);
    try {
      const res = await subscribeClientPush(currentTableNum, undefined, customerName.trim() || undefined);
      if (res.success) {
        setClientPushSubscribed(true);
      }
    } catch (e) {
      console.warn('Client push activation error:', e);
    } finally {
      setIsActivatingPush(false);
    }
  };

  const handleCallWaiter = async () => {
    setIsCallingWaiter(true);
    try {
      await fetch('/api/call-waiter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: currentTableNum,
          customerName: customerName.trim() || undefined
        })
      });
      setWaiterCalled(true);
      setTimeout(() => setWaiterCalled(false), 8000);
    } catch (e) {
      console.warn('Call waiter error:', e);
    } finally {
      setIsCallingWaiter(false);
    }
  };

  const currency = settings.currencySymbol
    ? (language === 'en' && settings.currencySymbol === 'ج.م' ? 'EGP' : settings.currencySymbol)
    : (language === 'en' ? 'EGP' : 'ج.م');
  const tableLabel = language === 'en' ? `Table No. (${currentTableNum})` : `طاولة رقم (${currentTableNum})`;
  const tableShortLabel = language === 'en' ? `Table (${currentTableNum})` : `طاولة (${currentTableNum})`;
  const tableSimpleLabel = language === 'en' ? `Table ${currentTableNum}` : `طاولة ${currentTableNum}`;

  // Coupon Promotion System States
  const [couponInputCode, setCouponInputCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  // Customer Recognition State
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);

  // Font Scaling Mode (Accessibility - Continuous Free Slider "سحب حر" with Default Reset)
  const [fontScalePercent, setFontScalePercent] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('smart_menu_font_scale_pct');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 75 && val <= 160) return val;
      }
    } catch {}
    return 100;
  });
  const [showFontControl, setShowFontControl] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('smart_menu_font_scale_pct', fontScalePercent.toString());
    } catch {}

    if (typeof document !== 'undefined') {
      const factor = fontScalePercent / 100;
      document.documentElement.style.setProperty('--font-scale-factor', factor.toString());
      document.documentElement.style.fontSize = `${(16 * factor).toFixed(2)}px`;
    }
  }, [fontScalePercent]);

  const handleResetFontScale = () => {
    setFontScalePercent(100);
  };

  // Recognize customer by phone or name, auto-fill details, & remember profiles
  useEffect(() => {
    const trimmedPhone = customerPhone.trim();
    const trimmedName = customerName.trim();

    if (!trimmedPhone && !trimmedName) {
      setMatchedCustomer(null);
      return;
    }

    // Load saved customer profiles dictionary from localStorage
    let localProfiles: Record<string, { name: string; phone: string }> = {};
    try {
      const raw = localStorage.getItem('smart_menu_customer_profiles');
      if (raw) localProfiles = JSON.parse(raw);
    } catch {}

    const pDigits = trimmedPhone.replace(/\D/g, '');
    const foundInServer = (customers || []).find(c => {
      if (!c) return false;
      const cDigits = (c.phone || '').replace(/\D/g, '');
      const matchPhone = trimmedPhone && c.phone && (
        c.phone.trim() === trimmedPhone ||
        (pDigits && cDigits && (pDigits === cDigits || pDigits.slice(-10) === cDigits.slice(-10)))
      );
      const matchName = trimmedName && c.name && c.name.trim().toLowerCase() === trimmedName.toLowerCase();
      return Boolean(matchPhone || matchName);
    });

    let profileName = foundInServer?.name;
    let profilePhone = foundInServer?.phone;

    if (!profileName || !profilePhone) {
      if (trimmedPhone && localProfiles[trimmedPhone]) {
        profileName = profileName || localProfiles[trimmedPhone].name;
        profilePhone = profilePhone || localProfiles[trimmedPhone].phone;
      }
      if (trimmedName && localProfiles[trimmedName]) {
        profileName = profileName || localProfiles[trimmedName].name;
        profilePhone = profilePhone || localProfiles[trimmedName].phone;
      }
    }

    // Auto-fill missing field if recognized!
    if (trimmedPhone && !customerName && profileName) {
      setCustomerName(profileName);
    } else if (trimmedName && !customerPhone && profilePhone) {
      setCustomerPhone(profilePhone);
    }

    if (foundInServer) {
      setMatchedCustomer(foundInServer);
    } else if (profileName || profilePhone) {
      setMatchedCustomer({
        id: `local-${trimmedPhone || trimmedName}`,
        name: profileName || customerName || 'عميل كافيه',
        phone: profilePhone || customerPhone || '',
        totalOrders: 1,
        totalSpent: 0,
        lastVisit: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
    } else {
      setMatchedCustomer(null);
    }
  }, [customerPhone, customerName, customers]);

  // Intelligent Bilingual Item/Category Resolvers with Fail-Safe Fallbacks
  const getItemName = (item?: { name: string; nameEn?: string } | null) => {
    if (!item) return language === 'en' ? 'Menu Item' : 'صنف المنيو';
    if (language === 'en') {
      if (item.nameEn && item.nameEn.trim()) return item.nameEn.trim();
      const translated = autoTranslateArabicToEnglish(item.name || '');
      return translated || item.name || 'Menu Item';
    }
    return item.name?.trim() || item.nameEn?.trim() || 'صنف المنيو';
  };

  const getItemDesc = (item?: { description?: string; descriptionEn?: string } | null) => {
    if (!item) return '';
    if (language === 'en') {
      if (item.descriptionEn && item.descriptionEn.trim()) return item.descriptionEn.trim();
      return item.description || '';
    }
    return item.description || '';
  };

  const getCategoryName = (cat?: { name: string; nameEn?: string } | null) => {
    if (!cat) return language === 'en' ? 'Category' : 'قسم المنيو';
    if (language === 'en') {
      if (cat.nameEn && cat.nameEn.trim()) return cat.nameEn.trim();
      const translated = autoTranslateArabicToEnglish(cat.name || '');
      return translated || cat.name || 'Category';
    }
    return cat.name?.trim() || cat.nameEn?.trim() || 'قسم المنيو';
  };

  const getCategoryDesc = (cat?: { description?: string; descriptionEn?: string } | null) => {
    if (!cat) return '';
    if (language === 'en') {
      if (cat.descriptionEn && cat.descriptionEn.trim()) return cat.descriptionEn.trim();
      return cat.description || '';
    }
    return cat.description || '';
  };

  // Thermal Printing State for Client Invoices
  const [clientPrintReceipt, setClientPrintReceipt] = useState<{
    type: 'order' | 'table-bill';
    order?: Order | null;
    tableBill?: any | null;
  } | null>(null);

  const handlePrintOrderReceipt = (order: Order) => {
    setClientPrintReceipt({
      type: 'order',
      order
    });
    setTimeout(() => window.print(), 200);
  };

  const handlePrintDigitalCheck = () => {
    setClientPrintReceipt({
      type: 'table-bill',
      tableBill: {
        tableNumber: currentTableNum,
        orders: activeTableOrders,
        items: aggregatedSessionItems.map(it => ({
          name: it.menuItem?.name || 'صنف',
          nameEn: it.menuItem?.nameEn || '',
          quantity: it.quantity || 1,
          price: it.menuItem?.price || 0
        })),
        subtotal: sessionSubtotal,
        tax: sessionTax,
        total: sessionTotal,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined
      }
    });
    setTimeout(() => window.print(), 200);
  };

  // Unique Device Identifier for Single Active Session Locking
  // Scoped per tab/session (using sessionStorage, with persistent random id fallback)
  const [deviceId] = useState(() => {
    try {
      let d = sessionStorage.getItem('smart_menu_tab_device_id');
      if (!d) {
        d = 'dev-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
        sessionStorage.setItem('smart_menu_tab_device_id', d);
      }
      return d;
    } catch {
      return 'dev-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
    }
  });

  // Dynamic Theme Palette
  const theme = settings.themeSettings || {
    preset: 'classic-cafe',
    primaryColor: '#3D271D',
    accentColor: '#D4A373',
    backgroundColor: '#FAF7F2',
    cardBgColor: '#FFFFFF',
    textColor: '#2D1E18'
  };

  // Sync internal table state with prop
  useEffect(() => {
    if (isViewOnly) {
      setIsBrowsingOnly(true);
      setShowTableChangeModal(false);
      return;
    }
    if (typeof tableNumber === 'number' && tableNumber > 0) {
      setCurrentTableNum(tableNumber);
      setShowTableChangeModal(false);
    } else if (tableNumber === 0) {
      setCurrentTableNum(0);
      setShowTableChangeModal(true);
    }
  }, [tableNumber, isViewOnly]);

  // Current table session and lock state
  const currentTableInfo = (tables || []).find(t => Number(t.tableNumber) === Number(currentTableNum));
  const activeTableOrders = (orders || []).filter(
    o => Number(o.tableNumber) === Number(currentTableNum) && o.status !== 'cancelled' && o.status !== 'completed' && !(o as any).settled
  );
  // Session orders for active check (includes all active non-settled, non-cancelled orders)
  const allSessionOrders = (orders || []).filter(
    o => Number(o.tableNumber) === Number(currentTableNum) && o.status !== 'cancelled' && o.status !== 'completed' && !(o as any).settled
  );

  // Helper to accurately determine if a specific table is truly occupied by active orders
  const isTableTrulyOccupied = useCallback((t?: TableInfo) => {
    if (!t || Number(t.tableNumber) === 0) return false;
    const tableOrders = (orders || []).filter(
      o => Number(o.tableNumber) === Number(t.tableNumber) && o.status !== 'cancelled' && o.status !== 'completed' && !(o as any).settled
    );
    // A table is ONLY truly busy if it currently has active un-settled food orders!
    return tableOrders.length > 0;
  }, [orders]);

  // 1. Is the order delivered to the table?
  const isOrderDeliveredToTable = Boolean(
    currentTableInfo?.tableDelivered ||
    (activeTableOrders.length > 0 && activeTableOrders.every(o => o.status === 'delivered'))
  );

  // 2. Is single active session enabled in settings?
  const isSingleSessionEnabled = settings.singleActiveSessionEnabled !== false;

  // 3. Is another device active on this table? (Prevent anyone from hijacking or entering someone else's table)
  const hasOtherActiveDevice = Boolean(
    Number(currentTableNum) !== 0 &&
    isTableTrulyOccupied(currentTableInfo) &&
    currentTableInfo?.activeSessionDeviceId &&
    currentTableInfo.activeSessionDeviceId !== deviceId
  );

  // 4. Session lock flag
  const isSessionLockedByOther = isSingleSessionEnabled && hasOtherActiveDevice && !isOrderDeliveredToTable;

  // Session Handover Toast & States
  const [transferRequestSent, setTransferRequestSent] = useState(false);
  const [transferToast, setTransferToast] = useState<string | null>(null);

  // Optimistic Bill State & Cashier Settlement Notifications
  const [optimisticBillRequested, setOptimisticBillRequested] = useState(false);
  const [showBillSettledNotification, setShowBillSettledNotification] = useState(false);

  // Server authoritative bill state:
  const isServerBillRequested = Number(currentTableNum) !== 0 && allSessionOrders.length > 0 && Boolean(
    currentTableInfo?.status === 'bill_requested' || currentTableInfo?.billRequested
  );

  const isBillRequested = Number(currentTableNum) !== 0 && allSessionOrders.length > 0 && Boolean(
    isServerBillRequested || optimisticBillRequested
  );

  // Track table settlement by Cashier
  const prevTableStatusRef = useRef<string | undefined>(currentTableInfo?.status);
  const wasBillRequestedRef = useRef<boolean>(false);

  useEffect(() => {
    if (isBillRequested) {
      wasBillRequestedRef.current = true;
    }
  }, [isBillRequested]);

  useEffect(() => {
    const prevStatus = prevTableStatusRef.current;
    const currentStatus = currentTableInfo?.status;

    // Reset bill state and show notification ONLY when table is settled by cashier (changed from bill_requested/busy to available)
    if (currentStatus === 'available' && (prevStatus === 'bill_requested' || wasBillRequestedRef.current)) {
      wasBillRequestedRef.current = false;
      setOptimisticBillRequested(false);
      setShowDigitalCheck(false);
      setShowBillSettledNotification(true);
      setTimeout(() => setShowBillSettledNotification(false), 8000);
    }
    prevTableStatusRef.current = currentStatus;
  }, [currentTableInfo?.status]);

  // Auto-takeover when table order is delivered:
  useEffect(() => {
    if (isOrderDeliveredToTable && hasOtherActiveDevice && onTakeoverDeliveredTable) {
      onTakeoverDeliveredTable(currentTableNum, deviceId);
      setTransferToast('تم تسليم الطلب السابق للطاولة بنجاح. يمكنك الآن بدء طلب جديد بحرية!');
      setIsBrowsingOnly(false);
      setTimeout(() => setTransferToast(null), 5000);
    }
  }, [isOrderDeliveredToTable, hasOtherActiveDevice, currentTableNum, deviceId, onTakeoverDeliveredTable]);

  // When session transfer is accepted by Device A:
  useEffect(() => {
    if (
      currentTableInfo?.sessionTransferRequest?.fromDeviceId === deviceId &&
      currentTableInfo.sessionTransferRequest.status === 'accepted'
    ) {
      setIsBrowsingOnly(false);
      setTransferRequestSent(false);
      setTransferToast('وافق الشخص الحالي على تسليم الجلسة لك! أنت الآن المتحكم بالطاولة ويمكنك الطلب.');
      setTimeout(() => setTransferToast(null), 6000);
    }
  }, [currentTableInfo?.sessionTransferRequest, deviceId]);

  // Send Heartbeat ping immediately and periodically to keep session alive and recognize device
  useEffect(() => {
    if (onHeartbeat && !isSessionLockedByOther && tablesLoaded !== false) {
      onHeartbeat(currentTableNum, deviceId, customerName);
      
      const interval = setInterval(() => {
        onHeartbeat(currentTableNum, deviceId, customerName);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [currentTableNum, deviceId, customerName, onHeartbeat, isSessionLockedByOther, tablesLoaded]);

  // Auto-release session on exit if enabled and no active unpaid orders
  useEffect(() => {
    if (settings.autoReleaseOnExit && onReleaseSession) {
      const handleExit = () => {
        if (activeTableOrders.length === 0) {
          onReleaseSession(currentTableNum);
        }
      };
      window.addEventListener('beforeunload', handleExit);
      window.addEventListener('pagehide', handleExit);
      return () => {
        window.removeEventListener('beforeunload', handleExit);
        window.removeEventListener('pagehide', handleExit);
      };
    }
  }, [settings.autoReleaseOnExit, activeTableOrders.length, currentTableNum, onReleaseSession]);

  // Aggregated session items for Digital Check
  const aggregatedSessionItems = React.useMemo(() => {
    const map = new Map<string, { menuItem: MenuItem; quantity: number; notes: string[] }>();
    (allSessionOrders || []).forEach(order => {
      (order?.items || []).forEach((ci, idx) => {
        const itemObj = ci?.menuItem;
        const itemId = String(itemObj?.id || (ci as any)?.menuItemId || (ci as any)?.id || `item_${idx}`);
        
        const rawP = itemObj?.price ?? (ci as any)?.price ?? 0;
        const parsedP = typeof rawP === 'number' ? rawP : (parseFloat(String(rawP)) || 0);
        const itemPrice = !isNaN(parsedP) && parsedP >= 0 ? parsedP : 0;

        const resolvedMenuItem: MenuItem = {
          id: itemId,
          name: itemObj?.name || (ci as any)?.name || 'صنف',
          nameEn: itemObj?.nameEn || (ci as any)?.nameEn || '',
          price: itemPrice,
          categoryId: itemObj?.categoryId || (ci as any)?.categoryId || '',
          description: itemObj?.description || (ci as any)?.description || '',
          image: itemObj?.image || (ci as any)?.image || '',
          available: true
        };

        const qty = typeof ci?.quantity === 'number' && ci.quantity > 0 ? ci.quantity : (parseInt(String(ci?.quantity), 10) || 1);

        const existing = map.get(itemId);
        if (existing) {
          existing.quantity += qty;
          if (ci.notes) existing.notes.push(ci.notes);
        } else {
          map.set(itemId, {
            menuItem: resolvedMenuItem,
            quantity: qty,
            notes: ci.notes ? [ci.notes] : []
          });
        }
      });
    });
    return Array.from(map.values());
  }, [allSessionOrders]);

  const sessionSubtotal = aggregatedSessionItems.reduce((sum, item) => {
    const rawP = item.menuItem?.price ?? 0;
    const p = typeof rawP === 'number' ? rawP : (parseFloat(String(rawP)) || 0);
    const q = typeof item.quantity === 'number' ? item.quantity : (parseInt(String(item.quantity), 10) || 1);
    return sum + (p * q);
  }, 0);
  const isTaxActive = settings.taxEnabled !== false && (settings.taxRate ?? 0) > 0;
  const sessionTax = isTaxActive ? Math.round((sessionSubtotal * (settings.taxRate ?? 0)) / 100) : 0;
  const sessionTotal = sessionSubtotal + sessionTax;

  // Live order status change notification for current table
  const [liveNotification, setLiveNotification] = useState<{ id: string; title: string; message: string; type: 'preparing' | 'ready' | 'info' } | null>(null);
  const prevOrdersStatusRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const tableOrders = (orders || []).filter(o => o.tableNumber === currentTableNum);
    tableOrders.forEach(o => {
      const prevStatus = prevOrdersStatusRef.current[o.id];
      if (prevStatus && prevStatus !== o.status) {
        // Status changed (visual notification only, no sounds)
        if (o.status === 'preparing') {
          setLiveNotification({
            id: o.id,
            title: 'المطبخ بدأ بتحضير طلبك!',
            message: `طلبك رقم #${o.id.slice(-4)} قيد التجهيز الآن بكل حب وعناية.`,
            type: 'preparing'
          });
          setTimeout(() => setLiveNotification(null), 6000);
        } else if (o.status === 'ready') {
          setLiveNotification({
            id: o.id,
            title: 'طلبك جاهز ولذيذ!',
            message: `تم تجهيز طلبك رقم #${o.id.slice(-4)} وهو في طريقه لطاولتك الآن.`,
            type: 'ready'
          });
          setTimeout(() => setLiveNotification(null), 6000);
        }
      }
      prevOrdersStatusRef.current[o.id] = o.status;
    });
  }, [orders, currentTableNum]);

  // Logo secret click counter for discreet admin access
  const [logoClicks, setLogoClicks] = useState(0);

  const handleLogoClick = () => {
    const nextClicks = logoClicks + 1;
    setLogoClicks(nextClicks);
    if (nextClicks >= 3) {
      setLogoClicks(0);
      onSwitchToAdmin();
    }
  };

  // Show Popup Ad on initial load if enabled
  useEffect(() => {
    if (settings.popupAdEnabled && popupAd.active) {
      const timer = setTimeout(() => setShowPopup(true), 800);
      return () => clearTimeout(timer);
    }
  }, [settings.popupAdEnabled, popupAd.active]);

  // Cart operations
  const handleAddToCart = (item: MenuItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isViewOnly || isBrowsingOnly) {
      setSelectedItemForModal(item);
      return;
    }
    if (!item.available) return;
    setCart(prev => {
      const existing = prev.find(ci => ci.menuItem.id === item.id);
      if (existing) {
        return prev.map(ci => ci.menuItem.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci);
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart(prev => {
      return prev.map(ci => {
        if (ci.menuItem.id === itemId) {
          const newQ = ci.quantity + delta;
          return newQ > 0 ? { ...ci, quantity: newQ } : null;
        }
        return ci;
      }).filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => prev.filter(ci => ci.menuItem.id !== itemId));
  };

  const getItemQuantity = (itemId: string) => {
    const item = cart.find(ci => ci.menuItem.id === itemId);
    return item ? item.quantity : 0;
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Dynamic Coupon and Loyalty Discount Logic
  const couponDiscountAmount = React.useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.minOrderAmount && cartTotal < appliedCoupon.minOrderAmount) {
      return 0;
    }
    let discount = 0;
    if (appliedCoupon.discountType === 'percentage') {
      discount = Math.round((cartTotal * appliedCoupon.discountValue) / 100);
      if (appliedCoupon.maxDiscountAmount && discount > appliedCoupon.maxDiscountAmount) {
        discount = appliedCoupon.maxDiscountAmount;
      }
    } else {
      discount = appliedCoupon.discountValue;
    }
    return Math.min(discount, cartTotal);
  }, [appliedCoupon, cartTotal]);

  // Customer and loyalty discounts completely disabled per instructions
  const activeCustomerDiscountRate = 0;
  const customerDiscountAmount = 0;

  const discountAmount = couponDiscountAmount;

  const taxRate = (settings.taxEnabled !== false && (settings.taxRate ?? 0) > 0) ? (settings.taxRate ?? 0) : 0;
  const discountedSubtotal = Math.max(0, cartTotal - discountAmount);
  const cartTax = Math.round((discountedSubtotal * taxRate) / 100);
  const finalCartTotal = discountedSubtotal + cartTax;

  const handleApplyCoupon = () => {
    setCouponError(null);
    setCouponSuccess(null);
    if (!couponInputCode.trim()) {
      setCouponError(language === 'en' ? 'Please enter coupon code' : 'يرجى إدخال رمز الكوبون');
      return;
    }
    const code = couponInputCode.trim().toUpperCase();
    const found = coupons.find(c => c.code.toUpperCase() === code);
    if (!found) {
      setCouponError(language === 'en' ? 'Coupon is invalid' : 'كود الخصم غير موجود أو غير صالح');
      return;
    }
    if (!found.active) {
      setCouponError(language === 'en' ? 'Coupon is inactive' : 'كود الخصم غير نشط حالياً');
      return;
    }
    if (found.maxUses && found.usageCount && found.usageCount >= found.maxUses) {
      setCouponError(language === 'en' ? 'Coupon usage limit reached' : 'لقد تخطى هذا الكوبون الحد الأقصى للاستخدام');
      return;
    }
    if (found.expiresAt && new Date(found.expiresAt) < new Date()) {
      setCouponError(language === 'en' ? 'Coupon has expired' : 'انتهت صلاحية هذا الكوبون');
      return;
    }
    if (found.minOrderAmount && cartTotal < found.minOrderAmount) {
      setCouponError(
        language === 'en'
          ? `Minimum order amount for this coupon is ${found.minOrderAmount} ${currency}`
          : `الحد الأدنى لتفعيل الكوبون هو ${found.minOrderAmount} ${currency}`
      );
      return;
    }
    setAppliedCoupon(found);
    setCouponSuccess(
      language === 'en'
        ? 'Coupon applied successfully!'
        : 'تم تطبيق الكوبون بنجاح!'
    );
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInputCode('');
    setCouponError(null);
    setCouponSuccess(null);
  };

  useEffect(() => {
    if (appliedCoupon && appliedCoupon.minOrderAmount && cartTotal < appliedCoupon.minOrderAmount) {
      setAppliedCoupon(null);
      setCouponError(
        language === 'en'
          ? `Coupon removed: total fell below ${appliedCoupon.minOrderAmount} ${currency}`
          : `تمت إزالة الكوبون: المجموع أقل من الحد الأدنى للطلب (${appliedCoupon.minOrderAmount} ${currency})`
      );
      setCouponSuccess(null);
    }
  }, [cartTotal, appliedCoupon, language, currency]);

  // Handle Banner Clicks (Category Jump, Coupon Auto-apply, Meal Time Toast)
  const handleBannerClick = (banner: Banner) => {
    if (banner.linkType === 'category' && banner.targetCategoryId) {
      handleSelectCategory(banner.targetCategoryId);
    } else if (banner.linkType === 'coupon' && banner.targetCouponCode) {
      const code = banner.targetCouponCode.toUpperCase();
      const found = (coupons || []).find(c => c.code.toUpperCase() === code);
      if (found) {
        setAppliedCoupon(found);
        setCouponInputCode(found.code);
        setCouponSuccess(language === 'en' ? `Coupon applied: ${found.code}` : `تمت إضافة كود الخصم (${found.code}) إلى السلة بنجاح! 🎉`);
      } else {
        const dummyCoupon: Coupon = {
          id: `banner-cpn-${Date.now()}`,
          code: code,
          discountType: 'percentage',
          discountValue: banner.targetDiscountPercent || 15,
          active: true,
          usageCount: 0
        };
        setAppliedCoupon(dummyCoupon);
        setCouponInputCode(code);
        setCouponSuccess(`تم تفعيل خصم الإعلان (${code} - ${banner.targetDiscountPercent || 15}%) على سلتك! 🎉`);
      }
    } else if (banner.mealTime && banner.mealTime !== 'all') {
      const mealNames: Record<string, string> = {
        breakfast: 'فترة الفطور الصباحي ☕🥐',
        lunch: 'فترة الغداء 🍔🥩',
        dinner: 'فترة العشاء 🍕🍹',
        late_night: 'فترة السهر والليالي 🌃'
      };
      setCouponSuccess(`عروض ${mealNames[banner.mealTime] || 'الوجبات'} متاحة لك الآن!`);
    }
  };

  const handleSendOrder = () => {
    if (cart.length === 0) return;
    if (isSessionLockedByOther) {
      alert(language === 'en' ? 'Sorry, this table is currently locked by another device.' : 'عذراً، هذه الطاولة محجوزة حالياً بجلسة نشطة من جهاز آخر.');
      return;
    }

    if (Number(currentTableNum) === 0) {
      alert(language === 'en' ? 'Please select your table number first before placing an order.' : 'يرجى تحديد رقم الطاولة أولاً لإرسال الطلب.');
      setShowTableChangeModal(true);
      return;
    }

    try {
      const formattedPhone = customerPhone ? formatEgyptianPhoneNumber(customerPhone) : '';
      if (customerName) localStorage.setItem('smart_menu_client_name', customerName);
      if (formattedPhone) localStorage.setItem('smart_menu_client_phone', formattedPhone);

      const trimmedN = customerName.trim();
      const trimmedP = formattedPhone.trim();

      if (trimmedN || trimmedP) {
        let localProfiles: Record<string, { name: string; phone: string }> = {};
        try {
          const raw = localStorage.getItem('smart_menu_customer_profiles');
          if (raw) localProfiles = JSON.parse(raw);
        } catch {}

        const entry = { name: trimmedN, phone: trimmedP };
        if (trimmedP) localProfiles[trimmedP] = entry;
        if (trimmedN) localProfiles[trimmedN] = entry;

        localStorage.setItem('smart_menu_customer_profiles', JSON.stringify(localProfiles));
      }
    } catch {}

    // Sanitize order items so images are never sent to Admin or backend
    const sanitizedCart = (cart || []).map(ci => ({
      ...ci,
      menuItem: {
        ...ci.menuItem,
        image: '' // Stripped completely as requested
      }
    }));

    const formattedOrderPhone = customerPhone ? formatEgyptianPhoneNumber(customerPhone).trim() : undefined;

    onPlaceOrder({
      tableNumber: currentTableNum,
      items: sanitizedCart,
      notes: orderNotes,
      paymentMethod,
      customerName: customerName.trim() || undefined,
      customerPhone: formattedOrderPhone || undefined,
      deviceId,
      couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      discountAmount: discountAmount
    });
    setCart([]);
    setIsCartOpen(false);
    setOrderNotes('');
    setAppliedCoupon(null);
    setCouponInputCode('');
    setCouponError(null);
    setCouponSuccess(null);
    setOptimisticBillRequested(false);
    setShowDigitalCheck(false);
    setShowOrderSuccess(true);
    setTimeout(() => setShowOrderSuccess(false), 7000);

    // Prompt or auto-subscribe to Lock Screen Push Notifications
    if (isPushSupported() && settings.pushNotificationsEnabled !== false && settings.pushClientOrderStatus !== false) {
      subscribeClientPush(currentTableNum, undefined, customerName.trim() || undefined)
        .then(res => {
          if (res.success) setClientPushSubscribed(true);
        })
        .catch(() => {});
    }
  };

  const handleSendBillRequest = () => {
    setOptimisticBillRequested(true);
    const trimName = customerName.trim() || undefined;
    onRequestBill(currentTableNum, trimName, deviceId, sessionTotal);
    setShowBillSuccess(true);
    setShowDigitalCheck(true);

    // Direct HTTP POST to guarantee immediate sync and SSE broadcast across all clients
    fetch('/api/tables/request-bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableNumber: currentTableNum,
        deviceId,
        customerName: trimName,
        totalAmount: sessionTotal
      })
    }).catch(err => console.warn('[Request Bill API] Error:', err));

    setTimeout(() => setShowBillSuccess(false), 4000);
  };

  // Filter items by category and search, sorted by order ascending
  const filteredItems = React.useMemo(() => {
    const list = (menuItems || []).filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        item.name.toLowerCase().includes(q) || 
        (item.nameEn && item.nameEn.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.descriptionEn && item.descriptionEn.toLowerCase().includes(q));
      if (searchQuery) return matchesSearch;
      if (selectedCategoryId) return item.categoryId === selectedCategoryId;
      return true;
    });

    return [...list].sort((a, b) => {
      const orderA = typeof a.order === 'number' ? a.order : 999;
      const orderB = typeof b.order === 'number' ? b.order : 999;
      return orderA - orderB;
    });
  }, [menuItems, searchQuery, selectedCategoryId]);

  // Process categories: Order and Time-based Visibility (Scheduling)
  const processedCategories = React.useMemo(() => {
    if (!categories || categories.length === 0) return [];

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const isWithinSchedule = (start?: string, end?: string): boolean => {
      if (!start || !end) return false;
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return false;
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      if (startMin <= endMin) {
        return currentMinutes >= startMin && currentMinutes <= endMin;
      } else {
        // Across midnight (e.g. 22:00 to 04:00)
        return currentMinutes >= startMin || currentMinutes <= endMin;
      }
    };

    // 1. Filter categories if scheduleEnabled and scheduleAction === 'hide_outside'
    const filtered = categories.filter(cat => {
      if (cat.scheduleEnabled && cat.scheduleAction === 'hide_outside') {
        return isWithinSchedule(cat.scheduleStartTime, cat.scheduleEndTime);
      }
      return true;
    });

    // 2. Sort: pinned items first during their time window, then order asc
    return [...filtered].sort((a, b) => {
      const aPinned = Boolean(a.scheduleEnabled && a.scheduleAction === 'pin_top' && isWithinSchedule(a.scheduleStartTime, a.scheduleEndTime));
      const bPinned = Boolean(b.scheduleEnabled && b.scheduleAction === 'pin_top' && isWithinSchedule(b.scheduleStartTime, b.scheduleEndTime));

      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      const orderA = typeof a.order === 'number' ? a.order : 999;
      const orderB = typeof b.order === 'number' ? b.order : 999;
      return orderA - orderB;
    });
  }, [categories]);

  const selectedCategory = (processedCategories || []).find(c => c.id === selectedCategoryId);

  // Locked Table Screen Return
  if (isSessionLockedByOther && !isBrowsingOnly) {
    return (
      <div className="min-h-screen bg-[#1F1915] text-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center" style={{ direction: 'rtl' }}>
        <div className="bg-[#2D211A] border border-[#D4A373]/30 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Lock size={38} strokeWidth={2.5} />
          </div>
          
          <h2 className="text-xl font-black text-white mb-2">{tableLabel} بحوزة عميل آخر</h2>
          <p className="text-xs text-[#D5C2A5] mb-4 leading-relaxed font-semibold">
            هناك هاتف آخر دخل قبلك وهو المتحكم حالياً بطلب هذه الطاولة (نظام الأولوية للأسبق). يمكنك إرسال طلب له للتنازل عن الجلسة لك، أو تصفح المنيو، أو الانتظار حتى يتم تسليم طلبه.
          </p>

          {/* Transfer request status indicator */}
          {(() => {
            const isMyRequestPending = currentTableInfo?.sessionTransferRequest?.fromDeviceId === deviceId && currentTableInfo.sessionTransferRequest.status === 'pending';
            const isMyRequestRejected = currentTableInfo?.sessionTransferRequest?.fromDeviceId === deviceId && currentTableInfo.sessionTransferRequest.status === 'rejected';

            return (
              <div className="space-y-3 mb-6">
                {isMyRequestPending && (
                  <div className="bg-amber-950/60 border border-amber-500/40 text-amber-200 p-3 rounded-2xl text-xs font-bold space-y-1">
                    <p className="flex items-center justify-center gap-1.5 text-amber-300">
                      <Clock size={14} className="animate-spin" />
                      <span>تم إرسال طلب استلام الجلسة بنجاح</span>
                    </p>
                    <p className="text-[11px] text-stone-300 font-normal">
                      بانتظار موافقة الشخص الحالي على شاشته للتنازل لك...
                    </p>
                  </div>
                )}

                {isMyRequestRejected && (
                  <div className="bg-rose-950/60 border border-rose-500/40 text-rose-200 p-3 rounded-2xl text-xs font-bold space-y-1">
                    <p className="flex items-center justify-center gap-1.5 text-rose-300">
                      <AlertCircle size={14} />
                      <span>اعتذر المتحكم الحالي عن تسليم الجلسة</span>
                    </p>
                    <p className="text-[11px] text-stone-300 font-normal">
                      يمكنك تصفح المنيو، وبمجرد تسليم طلبه للتربيزة ستتمكن من الطلب فوراً.
                    </p>
                  </div>
                )}

                {/* Request takeover button */}
                {onRequestSessionTransfer && !isMyRequestPending && (
                  <button 
                    onClick={() => {
                      onRequestSessionTransfer(currentTableNum, deviceId, customerName);
                      setTransferRequestSent(true);
                    }}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black py-3.5 rounded-2xl font-black text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Send size={15} />
                    <span>إرسال طلب للشخص الحالي للدخول مكانه</span>
                  </button>
                )}

                <button 
                  onClick={() => setIsBrowsingOnly(true)}
                  className="w-full bg-stone-800 border border-stone-700 text-stone-200 py-3 rounded-2xl font-bold text-xs hover:bg-stone-700 transition-all flex items-center justify-center gap-2"
                >
                  <Eye size={15} />
                  <span>تصفح المنيو والأسعار (للعرض فقط)</span>
                </button>
              </div>
            );
          })()}

          <div className="pt-2 border-t border-stone-800">
            {!isTableFixed && (
              <button 
                onClick={() => setShowTableChangeModal(true)}
                className="text-amber-400 font-bold text-xs py-2 hover:underline"
              >
                أو اختر طاولة أخرى متاحة
              </button>
            )}
          </div>
        </div>
        
        {/* Table Selection Modal when locked */}
        {showTableChangeModal && !isTableFixed && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
             <div className="bg-[#2D211A] text-white border border-[#D4A373]/30 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
               <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                 <h3 className="font-black text-sm text-[#FDFBF7]">اختر طاولة أخرى</h3>
                 <button onClick={() => setShowTableChangeModal(false)} className="w-8 h-8 flex items-center justify-center bg-stone-800 text-stone-400 rounded-full hover:bg-stone-700">
                   <X size={16} />
                 </button>
               </div>
               <div className="p-4 max-h-[60vh] overflow-y-auto">
                 <div className="grid grid-cols-3 gap-2.5">
                   {tables.map(t => {
                     const isBusy = isTableTrulyOccupied(t);
                     return (
                       <button
                         key={t.tableNumber}
                         onClick={() => {
                           onTableChange(t.tableNumber);
                           setIsBrowsingOnly(false);
                           setShowTableChangeModal(false);
                         }}
                         className={`p-3 rounded-2xl border text-center font-bold text-xs transition-all ${
                           isBusy
                             ? 'bg-amber-950/40 text-amber-400 border-amber-800/40 hover:bg-amber-900/60'
                             : 'bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700'
                         }`}
                       >
                         <div className="text-xs font-black">طاولة {t.tableNumber}</div>
                         <div className="text-[10px] opacity-75">{isBusy ? 'مشغولة' : 'متاحة'}</div>
                       </button>
                     );
                   })}
                 </div>
               </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen pb-36 transition-all duration-200" 
      style={{ 
        direction: language === 'en' ? 'ltr' : 'rtl',
        backgroundColor: theme?.backgroundColor || '#F8F9FA',
        color: theme?.textColor || '#2D1E18'
      }}
    >
      
      {/* 1. Cafe Cover & Header Station */}
      <div 
        className="relative text-[#FDFBF7] shadow-xl overflow-hidden transition-colors duration-300"
        style={{ backgroundColor: theme?.primaryColor || '#2A1D15' }}
      >
        {/* Cover Photo Backdrop with subtle parallax */}
        <div className="relative h-48 sm:h-64 w-full overflow-hidden">
          <img 
            src={settings.coverImageUrl || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1400&q=80'} 
            alt="Cafe Cover" 
            className="w-full h-full object-cover opacity-60 transform hover:scale-105 transition-transform duration-700"
          />
          <div 
            className="absolute inset-0 bg-gradient-to-t" 
            style={{
              background: `linear-gradient(to top, ${theme?.primaryColor || '#2A1D15'}, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.6) 100%)`
            }}
          />
          
          {/* Top Actions in Header */}
          <div className="absolute top-4 inset-x-4 max-w-4xl mx-auto flex items-center justify-between z-20">
            {/* Table Badge - Clickable only in normal mode, non-interactive in view mode */}
            <div className="flex items-center gap-2">
              {isViewOnly || isBrowsingOnly ? (
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-bold text-amber-200 shadow-md">
                  <Eye size={13} className="text-amber-400" />
                  <span>{language === 'en' ? 'View Only' : 'للمشاهدة فقط'}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!isTableFixed && settings.allowDirectTableSelection !== false) {
                      setShowTableChangeModal(true);
                    }
                  }}
                  className={`flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/15 text-xs font-bold text-amber-200 shadow-md transition-all active:scale-95 ${
                    !isTableFixed && settings.allowDirectTableSelection !== false
                      ? 'hover:bg-black/80 hover:border-amber-400/40 cursor-pointer'
                      : 'cursor-default'
                  }`}
                  title={!isTableFixed && settings.allowDirectTableSelection !== false ? 'اضغط لاختيار أو تغيير رقم الطاولة' : undefined}
                >
                  <CircleDot size={13} className="text-emerald-400 animate-pulse" />
                  <span>{language === 'en' ? `Table #${currentTableNum}` : tableLabel}</span>
                  {!isTableFixed && settings.allowDirectTableSelection !== false && (
                    <span className="text-[10px] text-amber-300/80 font-normal">✎</span>
                  )}
                </button>
              )}
            </div>

            {/* Free Font Scaling Slider & Direct Table Order Badge */}
            <div className="flex items-center gap-2 relative">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFontControl(prev => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer backdrop-blur-md ${
                    fontScalePercent !== 100
                      ? 'bg-amber-500 text-stone-950 border-amber-400 ring-2 ring-amber-400/40'
                      : 'bg-black/60 hover:bg-black/80 text-stone-200 border-white/20'
                  }`}
                  title="تكبير وتصغير حجم الخط (سحب حر) مع إمكانية استعادة الوضع الافتراضي"
                >
                  <Type size={14} className={fontScalePercent !== 100 ? 'text-stone-950 font-black' : 'text-amber-300'} />
                  <span className="text-[11px] font-bold">{fontScalePercent}%</span>
                  <span className="text-[10px] opacity-80 hidden xs:inline">خط</span>
                </button>

                {/* Free Drag Font Slider Popover */}
                {showFontControl && (
                  <div 
                    className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 w-72 sm:w-80 bg-[#241710]/95 backdrop-blur-xl border-2 border-[#D4A373]/60 rounded-3xl p-4 shadow-2xl z-50 text-white animate-in zoom-in-95 duration-150"
                    style={{ direction: language === 'en' ? 'ltr' : 'rtl' }}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                          <Type size={15} />
                        </div>
                        <div>
                          <h4 className="font-black text-xs text-amber-100">تكبير وتصغير الخط (سحب حر)</h4>
                          <p className="text-[10px] text-stone-300">اسحب الشريط للوصول للحجم المناسب لك</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowFontControl(false)}
                        className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 flex items-center justify-center cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {/* Continuous Range Slider */}
                    <div className="py-3.5 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-200">
                        <span className="flex items-center gap-1 text-[11px] text-stone-400">
                          <span>A-</span>
                          <span>(75%)</span>
                        </span>
                        <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 px-3 py-0.5 rounded-full">
                          <span className="text-amber-300 text-xs font-black">{fontScalePercent}%</span>
                        </div>
                        <span className="flex items-center gap-1 text-[11px] text-stone-400">
                          <span>(150%)</span>
                          <span>A+</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setFontScalePercent(prev => Math.max(75, prev - 5))}
                          className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-amber-200 font-bold cursor-pointer"
                          title="تصغير الخط 5%"
                        >
                          <Minus size={14} />
                        </button>
                        
                        <input
                          type="range"
                          min={75}
                          max={150}
                          step={1}
                          value={fontScalePercent}
                          onChange={(e) => setFontScalePercent(Number(e.target.value))}
                          className="w-full h-2.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-[#D4A373] focus:outline-none"
                          aria-label="شريط تكبير وتصغير الخط سحب حر"
                        />

                        <button
                          type="button"
                          onClick={() => setFontScalePercent(prev => Math.min(150, prev + 5))}
                          className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-amber-200 font-bold cursor-pointer"
                          title="تكبير الخط 5%"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* Quick Presets */}
                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        {[85, 100, 115, 135].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setFontScalePercent(pct)}
                            className={`py-1 rounded-xl text-[10px] font-black transition-all border cursor-pointer ${
                              fontScalePercent === pct
                                ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-xs'
                                : 'bg-stone-800/80 text-stone-300 border-white/10 hover:bg-stone-700'
                            }`}
                          >
                            {pct === 100 ? '100% الافتراضي' : `${pct}%`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reset Button & Done */}
                    <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={handleResetFontScale}
                        disabled={fontScalePercent === 100}
                        className={`flex-1 py-2 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                          fontScalePercent === 100
                            ? 'bg-stone-800/40 text-stone-500 cursor-not-allowed border border-white/5'
                            : 'bg-[#D4A373] hover:bg-[#c29161] text-[#2A1D15] active:scale-95 shadow-md cursor-pointer'
                        }`}
                        title="إعادة حجم الخط للوضع الافتراضي 100%"
                      >
                        <RotateCcw size={13} />
                        <span>إعادة للوضع الافتراضي (100%)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowFontControl(false)}
                        className="py-2 px-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-stone-200 text-xs font-bold transition-all cursor-pointer"
                      >
                        تم
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full text-xs text-stone-200 border border-white/10">
                <Coffee size={13} className="text-[#D4A373]" />
                <span>{language === 'en' ? 'Direct Order' : 'طلب مباشر'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cafe Identity Modern Card */}
        <div className="max-w-4xl mx-auto px-4 -mt-16 pb-4 relative z-10">
          <div 
            className="rounded-3xl p-4 sm:p-6 shadow-2xl border border-stone-200/90 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-right transition-colors duration-300"
            style={{ backgroundColor: theme?.cardBgColor || '#fffdfa' }}
          >
            <div className="relative -mt-12 sm:-mt-14 flex-shrink-0">
              <img 
                src={settings.logoUrl} 
                alt={settings.systemName} 
                onClick={handleLogoClick}
                title={settings.systemName}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white shadow-xl bg-stone-900 cursor-pointer select-none hover:scale-105 transition-transform"
              />
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" title="مفتوح الآن" />
            </div>

            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 
                    className="text-xl sm:text-2xl font-black tracking-tight"
                    style={{ color: theme?.textColor || '#2D1E18' }}
                  >
                    {language === 'en' ? (settings.systemNameEn || settings.systemName) : settings.systemName}
                  </h1>
                  {settings.systemNameEn && (
                    <p className="text-xs text-stone-500 font-medium tracking-wide mt-0.5">
                      {language === 'en' ? settings.systemName : settings.systemNameEn}
                    </p>
                  )}
                </div>

                <div className="inline-flex items-center justify-center gap-2 flex-wrap">
                  {/* Language Switcher Pill */}
                  {settings.showLanguageToggleInMenu !== false && (
                    <button
                      type="button"
                      onClick={handleToggleLanguage}
                      className="bg-white hover:bg-stone-50 text-[#3D271D] text-xs font-bold px-3.5 py-1.5 rounded-full border border-[#DFD1BD] transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                      title={language === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
                    >
                      <Globe size={13} className="text-[#BA8E58]" />
                      <span>{language === 'ar' ? 'English 🇬🇧' : 'العربية 🇸🇦'}</span>
                    </button>
                  )}

                  {isViewOnly || isBrowsingOnly ? (
                    <span className="bg-amber-100/90 text-amber-950 border border-amber-300 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                      <Eye size={12} className="text-amber-800" />
                      <span>{language === 'en' ? 'View-Only Menu' : 'منيو للمشاهدة فقط'}</span>
                    </span>
                  ) : (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                      <CircleDot size={10} className="text-emerald-600" />
                      <span>{language === 'en' ? 'Open for Orders' : 'مفتوح للطلبات'}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Table Info, Digital Check, and Request Bill Bar */}
              <div className="mt-3 pt-3 border-t border-[#ebdcc4] flex items-center justify-between flex-wrap gap-2">
                {isViewOnly || isBrowsingOnly ? (
                  <div className="w-full flex items-center justify-center py-2 px-3 bg-amber-50/90 rounded-2xl border border-amber-200/80 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-950">
                      <Eye size={14} className="text-amber-800" />
                      <span>{language === 'en' ? 'Digital Menu & Prices (View Only)' : 'قائمة الطعام والأسعار (للمشاهدة والاستعراض فقط)'}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 1. Table Number Badge */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isTableFixed && settings.allowDirectTableSelection !== false) {
                            setShowTableChangeModal(true);
                          }
                        }}
                        className={`bg-[#3D271D] text-amber-100 font-black text-xs px-3.5 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95 ${
                          !isTableFixed && settings.allowDirectTableSelection !== false
                            ? 'hover:bg-[#2A1D15] hover:ring-2 hover:ring-[#D4A373]/40 cursor-pointer'
                            : 'cursor-default'
                        }`}
                        title={!isTableFixed && settings.allowDirectTableSelection !== false ? 'اضغط لاختيار أو تغيير رقم الطاولة' : undefined}
                      >
                        <CircleDot size={12} className={isTableFixed ? 'text-amber-400' : 'text-emerald-400 animate-pulse'} />
                        <span>{tableLabel}</span>
                        {isTableFixed ? (
                          <Lock size={11} className="text-amber-300 ml-0.5" />
                        ) : settings.allowDirectTableSelection !== false ? (
                          <span className="text-[10px] text-amber-300/80 font-normal mr-0.5">✎</span>
                        ) : null}
                      </button>

                      {isBillRequested ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black animate-pulse">
                          <Receipt size={12} />
                          <span>الشيك مطلوب</span>
                        </span>
                      ) : isSessionLockedByOther ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-100 text-rose-900 border border-rose-300 text-[10px] font-black">
                          <Lock size={12} />
                          <span>محجوزة</span>
                        </span>
                      ) : null}
                    </div>

                    {/* 2. Unified Check & Bill Action - Only visible when there are active unpaid orders for this table */}
                    {Number(currentTableNum) !== 0 && allSessionOrders.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowDigitalCheck(true)}
                        className={`text-xs font-black px-3.5 py-1.5 rounded-2xl border transition-all flex items-center gap-2 shadow-xs active:scale-95 ${
                          isBillRequested
                            ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                            : 'bg-[#3D271D] hover:bg-[#2A1D15] text-amber-100 border-[#2A1D15]'
                        }`}
                        title="عرض الشيك وطلب الحساب"
                      >
                        <Receipt size={14} className={isBillRequested ? 'text-amber-700' : 'text-[#D4A373]'} />
                        <span>
                          {isBillRequested
                            ? 'الشيك (جاري إحضار الحساب...)'
                            : 'عرض الشيك وطلب الحساب'}
                        </span>
                        {allSessionOrders.length > 0 && (
                          <span className="bg-[#D4A373] text-[#2A1D15] text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                            {allSessionOrders.reduce((sum, o) => sum + o.total, 0)} {currency}
                          </span>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Live Notification for Customer (State Transition Alert) */}
      {liveNotification && (
        <div className="fixed top-5 inset-x-4 max-w-md mx-auto z-50 animate-in slide-in-from-top-6 duration-300">
          <div className="bg-[#2A1D15] text-white p-4 rounded-3xl shadow-2xl border border-[#D4A373]/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D4A373] text-[#2A1D15] flex items-center justify-center font-bold flex-shrink-0">
                <BellRing size={20} className="animate-bounce" />
              </div>
              <div>
                <h4 className="font-black text-sm text-amber-200">{liveNotification.title}</h4>
                <p className="text-xs text-stone-300 mt-0.5">{liveNotification.message}</p>
              </div>
            </div>
            <button 
              onClick={() => setLiveNotification(null)}
              className="text-stone-400 hover:text-white p-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Session Transfer Toast Notification */}
      {transferToast && (
        <div className="fixed top-20 inset-x-4 max-w-md mx-auto z-50 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-950 text-white p-4 rounded-3xl shadow-2xl border border-emerald-500/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <p className="text-xs font-bold text-emerald-100">{transferToast}</p>
            </div>
            <button 
              onClick={() => setTransferToast(null)}
              className="text-emerald-300 hover:text-white p-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Incoming Session Handover Request Modal on Device A */}
      {(() => {
        const incomingTransferRequest = (
          currentTableInfo?.activeSessionDeviceId === deviceId &&
          currentTableInfo.sessionTransferRequest &&
          currentTableInfo.sessionTransferRequest.status === 'pending' &&
          currentTableInfo.sessionTransferRequest.fromDeviceId !== deviceId &&
          (Date.now() - currentTableInfo.sessionTransferRequest.requestedAt < 60000)
        ) ? currentTableInfo.sessionTransferRequest : null;

        if (!incomingTransferRequest) return null;

        return (
          <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" style={{ direction: 'rtl' }}>
            <div className="bg-[#2D211A] text-white border-2 border-amber-400 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-400/40 shadow-inner">
                <Smartphone size={28} />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="font-black text-base text-white">
                  طلب استلام جلسة {tableShortLabel}
                </h3>
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  هناك شخص آخر دخل على {tableShortLabel} ويطلب استلام الجلسة ليقوم بالطلب بدلاً منك. هل توافق على تسليمه الجلسة؟
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onRespondSessionTransfer) {
                      onRespondSessionTransfer(currentTableNum, true, deviceId);
                    }
                    setIsBrowsingOnly(true);
                  }}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <Check size={16} />
                  <span>موافقة وتسليمه الجلسة (التحول للتصفح)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onRespondSessionTransfer) {
                      onRespondSessionTransfer(currentTableNum, false, deviceId);
                    }
                  }}
                  className="w-full py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs flex items-center justify-center transition-all"
                >
                  <span>رفض الطلب والاستمرار بالتحكم</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Browsing Only / View Only Alert Bar when viewing menu */}
      {isBrowsingOnly && (
        <div className="max-w-4xl mx-auto px-4 pt-3">
          <div className="bg-gradient-to-r from-amber-950 via-[#3D271D] to-[#2A1D15] text-white p-3.5 rounded-2xl shadow-lg border border-amber-500/40 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                👁️
              </span>
              <div>
                <p className="font-black text-amber-200 text-xs sm:text-sm">
                  وضع استعراض المنيو والأسعار (للمشاهدة فقط)
                </p>
                <p className="text-[10px] text-stone-300">
                  يمكنك تصفح ومطالعة كافة الأقسام والأصناف والأسعار بحرية.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">

        {/* Single Active Session Lock Warning Alert */}
        {isSessionLockedByOther && !isBrowsingOnly && (
          <div className="bg-gradient-to-r from-rose-900 via-stone-900 to-rose-950 text-white p-5 rounded-3xl shadow-xl border border-rose-500/40 space-y-3 animate-in fade-in duration-300">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-400/30 flex items-center justify-center flex-shrink-0">
                <ShieldAlert size={22} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm text-rose-200">
                    {tableLabel} محجوزة بجلسة نشطة لهاتف آخر
                  </h4>
                  <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    مقفلة
                  </span>
                </div>
                <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                  تم قفل الطاولة لهاتف العميل الأول لمنع تداخل واختلاط الطلبات. يمكنك تصفح المنيو بحرية في وضع القراءة، أو اختيار طاولة أخرى متاحة.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2 flex-wrap border-t border-white/10">
              <button
                onClick={() => setIsBrowsingOnly(true)}
                className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors"
              >
                تصفح المنيو فقط (وضع الاطلاع)
              </button>
              <button
                onClick={() => setShowTableChangeModal(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-black transition-colors"
              >
                اختيار طاولة أخرى متاحة
              </button>
              <button
                onClick={() => {
                  if (onHeartbeat) onHeartbeat(currentTableNum, deviceId);
                  setIsBrowsingOnly(false);
                }}
                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium mr-auto transition-colors"
              >
                أنا صاحب الجلسة (استعادة)
              </button>
            </div>
          </div>
        )}

        {/* Success Alert Banners */}
        {showCancelSuccess && (
          <div className="bg-rose-900 text-white p-4 rounded-3xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300 border border-rose-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 text-white flex items-center justify-center font-bold">
                <Trash2 size={20} />
              </div>
              <div>
                <h4 className="font-black text-sm">تم إلغاء الطلب بنجاح!</h4>
                <p className="text-xs text-rose-100">تم إلغاء طلبك قبل بدء التجهيز والتحضير في المطبخ.</p>
              </div>
            </div>
            <button onClick={() => setShowCancelSuccess(false)} className="text-white/80 hover:text-white">
              <X size={18} />
            </button>
          </div>
        )}

        {showOrderSuccess && (
          <div className="bg-emerald-700 text-white p-4 rounded-3xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-300 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
                  <Check size={22} />
                </div>
                <div>
                  <h4 className="font-black text-sm">تم إرسال طلبك بنجاح للمطبخ!</h4>
                  <p className="text-xs text-emerald-100">{tableLabel} - تم تأكيد طلبك وجاري تجهيزه من فريق المطبخ.</p>
                </div>
              </div>
              <button onClick={() => setShowOrderSuccess(false)} className="text-white/80 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="pt-2 border-t border-emerald-600/70 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setShowOrderSuccess(false);
                  setShowDigitalCheck(true);
                }}
                className="px-3.5 py-1.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5"
              >
                <Receipt size={14} />
                <span>عرض شيك الطاولة والحساب</span>
              </button>
              <button
                type="button"
                onClick={() => setShowOrderSuccess(false)}
                className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all"
              >
                متابعة تصفح المنيو
              </button>
            </div>
          </div>
        )}

        {showBillSuccess && (
          <div className="bg-[#3D271D] text-white p-4 rounded-3xl shadow-lg flex items-center justify-between animate-in fade-in duration-300 border border-[#D4A373]/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D4A373] text-[#2A1D15] flex items-center justify-center font-bold">
                <Receipt size={22} />
              </div>
              <div>
                <h4 className="font-black text-sm text-amber-200">تم طلب الفاتورة والحساب!</h4>
                <p className="text-xs text-stone-200">الويتر في طريقه الآن ل{tableLabel} لإتمام الدفع.</p>
              </div>
            </div>
            <button onClick={() => setShowBillSuccess(false)} className="text-white/80 hover:text-white">
              <X size={18} />
            </button>
          </div>
        )}

            {/* Special Offers Carousel with Arrows and Touch Swipe */}
            <SpecialOffersCarousel 
              banners={banners} 
              isEnabled={settings.bannerEnabled !== false}
              language={language}
              currency={currency}
              onBannerClick={handleBannerClick}
            />

        {/* High-Precision Search Bar */}
        <div className="relative">
          <span className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-stone-500">
            <Search size={18} />
          </span>
          <input 
            type="text"
            placeholder={language === 'en' ? 'Search coffee, drinks, cakes, or meals...' : 'ابحث عن مشروبك، قهوتك، أو وجبتك المفضلة...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-3 pr-11 pl-4 bg-[#fffdfa] rounded-2xl border border-[#DFD1BD] text-[#2D1E18] placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#BA8E58] shadow-xs transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 left-0 flex items-center pl-4 text-stone-400 hover:text-stone-700"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* VIEW 1: Categories View & Highlights */}
        {!searchQuery && selectedCategoryId === null ? (
          <div className="space-y-4">
            {/* Horizontal Categories Quick Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => handleSelectCategory(null)}
                className="px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 shadow-xs bg-[#3D271D] text-white"
              >
                <Layers size={13} />
                <span>{language === 'en' ? 'All Categories' : 'كل الأقسام'}</span>
              </button>
              {processedCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 shadow-xs bg-white text-stone-800 hover:bg-[#EFE7DC] border border-[#DFD1BD]"
                >
                  <span>{getCategoryName(cat)}</span>
                </button>
              ))}
            </div>

            <div id="categories-section" className="flex items-center justify-between px-1 pt-1">
              <h2 className="text-base sm:text-lg font-black text-[#2D1E18] flex items-center gap-2">
                <Layers size={18} className="text-[#BA8E58]" />
                <span>{language === 'en' ? 'Browse Menu Categories' : 'تصفح أقسام المنيو'}</span>
              </h2>
              <span className="text-xs font-bold text-[#3D271D] bg-[#fffdfa] px-3 py-1 rounded-full border border-stone-200 shadow-xs">
                {processedCategories.length} {language === 'en' ? 'Categories' : 'أقسام'}
              </span>
            </div>

            {/* Categories Visual Cards Grid (Vertical Portrait Cards with Glow) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
              {(processedCategories || []).map((cat) => {
                const count = (menuItems || []).filter(m => m.categoryId === cat.id).length;
                const catTitle = getCategoryName(cat);
                const catDesc = getCategoryDesc(cat);
                return (
                  <div
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat.id)}
                    className="group relative h-72 sm:h-84 rounded-[28px] overflow-hidden shadow-md hover:shadow-2xl hover:shadow-amber-900/20 border border-[#DFD1BD] hover:border-amber-400 bg-[#1E140F] cursor-pointer transition-all duration-300 flex flex-col justify-between p-4 active:scale-[0.98] ring-1 ring-amber-500/10"
                  >
                    {/* Vertical Photo Background */}
                    <div className="absolute inset-0 overflow-hidden">
                      <img 
                        src={cat.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80'} 
                        alt={catTitle || 'قسم'} 
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80'; }}
                        className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 ease-out"
                      />
                      {/* Vertical Glow & Gradient: Smooth fade to dark bottom for high text clarity */}
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-900/35 to-black/20 group-hover:from-stone-950 transition-colors duration-300" />
                    </div>

                    {/* Top Tag: Item Count Badge */}
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="bg-stone-950/70 backdrop-blur-md border border-white/25 text-amber-200 text-[11px] font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                        <Sparkles size={11} className="text-amber-400" />
                        <span>{count}</span>
                        <span className="text-[10px] text-stone-300">{language === 'en' ? 'items' : 'صنف'}</span>
                      </span>
                    </div>

                    {/* Category Title & Info directly over the bottom of the vertical photo */}
                    <div className={`relative z-10 w-full space-y-1 ${language === 'en' ? 'text-left' : 'text-right'}`}>
                      <div className="flex items-end justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-white text-base sm:text-lg md:text-xl tracking-wide leading-snug drop-shadow-md group-hover:text-amber-300 transition-colors">
                            {catTitle}
                          </h3>
                          {language === 'ar' && cat.nameEn && (
                            <p className="text-[11px] text-amber-100/90 font-semibold drop-shadow-sm truncate mt-0.5" dir="ltr">
                              {cat.nameEn}
                            </p>
                          )}
                          {catDesc && (
                            <p className="text-[11px] text-stone-300/90 font-normal line-clamp-1 drop-shadow-sm mt-0.5">
                              {catDesc}
                            </p>
                          )}
                        </div>
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-white/20 backdrop-blur-md group-hover:bg-[#BA8E58] text-white flex items-center justify-center transition-all flex-shrink-0 shadow-md border border-white/20 group-hover:border-[#BA8E58]">
                          <ChevronLeft size={18} className={language === 'en' ? 'rotate-180' : ''} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Popular Items Showcase (Controlled by Admin Toggle Button) */}
            {settings.showPopularSection !== false && (
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-base font-black text-[#2D1E18] flex items-center gap-1.5">
                    <Sparkles size={16} className="text-[#BA8E58]" />
                    <span>{language === 'en' ? 'Most Popular & Best Sellers' : 'الأكثر طلباً وشهرة'}</span>
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4">
                  {(menuItems || []).filter(m => m.isPopular).slice(0, 8).map((item) => {
                    const qty = getItemQuantity(item.id);
                    const isAvailable = item.available !== false;
                    const itemName = getItemName(item);
                    const itemDesc = getItemDesc(item);

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItemForModal(item)}
                        className={`group relative bg-white rounded-[26px] overflow-hidden border border-[#E5D5BC] shadow-xs hover:shadow-xl hover:shadow-amber-900/15 hover:border-amber-400/60 transition-all duration-300 cursor-pointer flex flex-col h-full hover:-translate-y-1 active:scale-[0.99] ${
                          !isAvailable ? 'opacity-60 grayscale' : ''
                        }`}
                      >
                        {/* Portrait Image Box */}
                        <div className="relative w-full aspect-[4/3] sm:aspect-[4/3.2] overflow-hidden bg-stone-100 flex-shrink-0">
                          <img 
                            src={item.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80'} 
                            alt={itemName || 'صنف'} 
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80'; }}
                            className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-500 ease-out"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 group-hover:from-black/50 transition-colors" />

                          <div className="absolute top-2 inset-x-2 z-10 flex items-center justify-between pointer-events-none">
                            {item.calories ? (
                              <span className="bg-black/60 backdrop-blur-md text-stone-100 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                <Flame size={10} className="text-amber-400" />
                                <span>{item.calories}</span>
                              </span>
                            ) : <span />}

                            <span className="bg-amber-500/90 backdrop-blur-md text-stone-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                              <Sparkles size={9} />
                              <span>الأكثر طلباً</span>
                            </span>
                          </div>

                          {!isAvailable && (
                            <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-xs z-10 flex items-center justify-center p-2 text-center">
                              <span className="text-xs text-white font-bold bg-rose-600 px-3 py-1 rounded-xl shadow-md">
                                {language === 'en' ? 'Out of Stock' : 'غير متوفر'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Item Details */}
                        <div className={`p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2 bg-gradient-to-b from-white to-[#FAF6F0] ${language === 'en' ? 'text-left' : 'text-right'}`}>
                          <div>
                            <h4 className="font-black text-[#2D1E18] text-sm sm:text-base leading-snug group-hover:text-amber-900 transition-colors line-clamp-1">
                              {itemName}
                            </h4>
                            {language === 'ar' && item.nameEn && (
                              <p className="text-[10px] text-stone-500 font-medium truncate mt-0.5" dir="ltr">
                                {item.nameEn}
                              </p>
                            )}
                            {itemDesc && (
                              <p className="text-[10px] text-stone-600/90 line-clamp-1 mt-0.5 font-normal">
                                {itemDesc}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1.5 border-t border-stone-200/70">
                            <span className="bg-amber-100/90 text-[#3D271D] border border-amber-300/60 text-xs font-black px-2.5 py-1 rounded-full shadow-2xs">
                              {item.price} {currency}
                            </span>

                            {isViewOnly || isBrowsingOnly ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemForModal(item);
                                }}
                                className="px-3 py-1 rounded-full bg-amber-100 hover:bg-amber-200 text-[#3D271D] text-xs font-bold border border-amber-300/80 shadow-2xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                              >
                                <Eye size={12} className="text-amber-800" />
                                <span>{language === 'en' ? 'View' : 'عرض'}</span>
                              </button>
                            ) : isAvailable && (
                              qty === 0 ? (
                                <button
                                  onClick={(e) => handleAddToCart(item, e)}
                                  className="px-3 py-1 rounded-full bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-black shadow-xs hover:shadow-md transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                                >
                                  <Plus size={13} />
                                  <span>{language === 'en' ? 'Add' : 'أضف'}</span>
                                </button>
                              ) : (
                                <div 
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 bg-stone-100 px-1.5 py-0.5 rounded-full border border-stone-300/80 shadow-inner"
                                >
                                  <button
                                    onClick={(e) => handleUpdateQuantity(item.id, -1, e)}
                                    className="w-5 h-5 rounded-full bg-white text-stone-900 font-bold flex items-center justify-center hover:bg-stone-200 text-xs shadow-2xs"
                                  >
                                    -
                                  </button>
                                  <span className="font-black text-xs px-1 text-stone-900">{qty}</span>
                                  <button
                                    onClick={(e) => handleUpdateQuantity(item.id, 1, e)}
                                    className="w-5 h-5 rounded-full bg-[#BA8E58] text-white font-bold flex items-center justify-center hover:bg-[#A87C47] text-xs shadow-2xs"
                                  >
                                    +
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* VIEW 2: Items inside selected category or Search Results (2-Column Grid as in user photo) */
          <div ref={itemsSectionRef} className="space-y-4 scroll-mt-6">
            {/* Header when inside category */}
            <div className="flex items-center justify-between bg-white p-3 sm:p-4 rounded-3xl border border-[#DFD1BD] shadow-xs">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => handleSelectCategory(null)}
                  className="px-3 py-1.5 rounded-full bg-[#EFE7DC] hover:bg-[#E5DACB] text-[#3D271D] font-black text-xs flex items-center gap-1 transition-colors shadow-xs"
                  title="العودة لكل الأقسام"
                >
                  <ChevronLeft size={16} className={language === 'en' ? 'rotate-180' : ''} />
                  <span>{language === 'en' ? 'All Categories' : 'كل الأقسام'}</span>
                </button>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-[#2D1E18]">
                    {searchQuery 
                      ? (language === 'en' ? `Results for: "${searchQuery}"` : `نتائج: "${searchQuery}"`) 
                      : getCategoryName(selectedCategory)}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    {filteredItems.length} {language === 'en' ? 'items available' : 'صنف متوفر'}
                  </p>
                </div>
              </div>

              {!searchQuery && (
                <button
                  onClick={() => handleSelectCategory(null)}
                  className="text-xs font-bold text-[#BA8E58] hover:text-[#3D271D] transition-colors flex items-center gap-1"
                >
                  <Layers size={13} />
                  <span>{language === 'en' ? 'Change Category' : 'تغيير القسم'}</span>
                </button>
              )}
            </div>

            {/* Quick Horizontal Category Switcher Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => handleSelectCategory(null)}
                className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 shadow-xs ${
                  selectedCategoryId === null && !searchQuery
                    ? 'bg-[#3D271D] text-white shadow-md'
                    : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
                }`}
              >
                <Layers size={13} />
                <span>{language === 'en' ? 'All Categories' : 'كل الأقسام'}</span>
              </button>
              {processedCategories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id && !searchQuery;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 shadow-xs ${
                      isSelected
                        ? 'bg-[#BA8E58] text-white shadow-md ring-2 ring-[#BA8E58]/30'
                        : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
                    }`}
                  >
                    <span>{getCategoryName(cat)}</span>
                  </button>
                );
              })}
            </div>

            {/* 2-Column / Multi-Column Product Grid */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-6 space-y-2">
                <p className="text-stone-600 font-bold text-sm">
                  {language === 'en' ? 'No matching items found' : 'لم يتم العثور على أي أصناف مطابقة'}
                </p>
                <button
                  onClick={() => handleSelectCategory(null)}
                  className="text-xs text-[#3D271D] font-black underline"
                >
                  {language === 'en' ? 'Back to Main Menu' : 'العودة للقائمة الرئيسية'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {filteredItems.map((item) => {
                  const qty = getItemQuantity(item.id);
                  const isAvailable = item.available !== false;
                  const displayName = getItemName(item);
                  const displayDesc = getItemDesc(item);

                  return (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedItemForModal(item)}
                      className={`group relative h-80 sm:h-92 rounded-[28px] overflow-hidden shadow-md hover:shadow-2xl hover:shadow-amber-900/20 border border-[#DFD1BD] hover:border-amber-400 bg-[#1E140F] cursor-pointer transition-all duration-300 flex flex-col justify-between p-4.5 active:scale-[0.98] ring-1 ring-amber-500/10 ${
                        !isAvailable ? 'opacity-65' : ''
                      }`}
                    >
                      {/* Product Image Background */}
                      <div className="absolute inset-0 overflow-hidden">
                        <img 
                          src={item.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80'} 
                          alt={displayName || 'صنف'} 
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80'; }}
                          className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-900/35 to-black/20 group-hover:from-stone-950 transition-colors duration-300" />
                      </div>

                      {/* Top Badges & Tags */}
                      <div className="relative z-10 flex items-center justify-between">
                        {item.calories ? (
                          <span className="bg-stone-950/70 backdrop-blur-md border border-white/25 text-amber-200 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                            <Flame size={10} className="text-amber-400" />
                            <span>{item.calories}</span>
                          </span>
                        ) : <span />}

                        {item.isPopular && (
                          <span className="bg-amber-500 text-stone-950 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                            <Sparkles size={10} />
                            <span>مُميز</span>
                          </span>
                        )}

                        {!isAvailable && (
                          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-xs z-10 flex items-center justify-center p-2 text-center rounded-[28px]">
                            <span className="text-xs text-white font-bold bg-rose-600 px-3 py-1 rounded-xl shadow-md">
                              {language === 'en' ? 'Out of Stock' : 'غير متوفر'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Product Info & Action Row */}
                      <div className={`relative z-10 w-full space-y-2 ${language === 'en' ? 'text-left' : 'text-right'}`}>
                        <div>
                          <h4 className="font-black text-white text-base sm:text-lg tracking-wide leading-snug drop-shadow-md group-hover:text-amber-300 transition-colors line-clamp-1">
                            {displayName}
                          </h4>
                          {language === 'ar' && item.nameEn && (
                            <p className="text-[11px] text-amber-100/90 font-semibold drop-shadow-sm truncate mt-0.5" dir="ltr">
                              {item.nameEn}
                            </p>
                          )}
                          {displayDesc && (
                            <p className="text-[11px] text-stone-300/90 font-normal line-clamp-2 mt-0.5 drop-shadow-sm leading-relaxed">
                              {displayDesc}
                            </p>
                          )}
                        </div>

                        {/* Price & Cart Buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/20">
                          <span className="bg-[#BA8E58] text-white text-xs sm:text-sm font-black px-3 py-1 rounded-full shadow-md">
                            {item.price} {currency}
                          </span>

                          {isViewOnly || isBrowsingOnly ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItemForModal(item);
                              }}
                              className="px-3.5 py-1.5 rounded-full bg-amber-100/90 hover:bg-white text-[#2D1E18] text-xs font-black shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                            >
                              <Eye size={13} className="text-[#3D271D]" />
                              <span>{language === 'en' ? 'View Details' : 'عرض التفاصيل'}</span>
                            </button>
                          ) : isAvailable && (
                            qty === 0 ? (
                              <button
                                onClick={(e) => handleAddToCart(item, e)}
                                className="px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white text-[#2D1E18] text-xs font-black shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                              >
                                <Plus size={14} />
                                <span>{language === 'en' ? 'Add' : 'أضف'}</span>
                              </button>
                            ) : (
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/30 shadow-md"
                              >
                                <button
                                  onClick={(e) => handleUpdateQuantity(item.id, -1, e)}
                                  className="w-5.5 h-5.5 rounded-full bg-stone-100 text-stone-900 font-bold flex items-center justify-center hover:bg-stone-200 text-xs shadow-xs"
                                >
                                  -
                                </button>
                                <span className="font-black text-xs px-1.5 text-stone-900">{qty}</span>
                                <button
                                  onClick={(e) => handleUpdateQuantity(item.id, 1, e)}
                                  className="w-5.5 h-5.5 rounded-full bg-[#BA8E58] text-white font-bold flex items-center justify-center hover:bg-[#A87C47] text-xs shadow-xs"
                                >
                                  +
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 2. Floating High-Contrast Wide Cart Pill Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 inset-x-4 max-w-xl mx-auto z-40 animate-in slide-in-from-bottom-5 duration-300">
          <div 
            onClick={() => setIsCartOpen(true)}
            className="text-white p-4 rounded-3xl shadow-2xl cursor-pointer flex items-center justify-between transition-all active:scale-99 border"
            style={{
              background: `linear-gradient(to right, ${theme?.primaryColor || '#2A1D15'}, ${theme?.primaryColor || '#3D271D'}, ${theme?.primaryColor || '#2A1D15'})`,
              borderColor: theme?.accentColor || '#D4A373'
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base shadow-md"
                style={{
                  backgroundColor: theme?.accentColor || '#D4A373',
                  color: theme?.primaryColor || '#2A1D15'
                }}
              >
                <ShoppingBag size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm sm:text-base text-white">سلة المشتريات</span>
                  <span className="bg-[#D4A373]/30 text-amber-200 border border-[#D4A373]/50 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    {totalItemsCount} عناصر
                  </span>
                </div>
                <p className="text-[11px] text-stone-300">{tableLabel} - اضغط لإتمام وتأكيد الطلب</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-base sm:text-lg font-black text-amber-300">
                {cartTotal} {currency}
              </span>
              <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white">
                <ChevronLeft size={16} />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Luxury Bottom-Slide Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-[#fffdfa] w-full sm:max-w-lg rounded-t-[32px] sm:rounded-3xl shadow-2xl border-t-2 sm:border-2 border-[#D4A373]/40 max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            
            {/* Grab Handle for Bottom Sheet on Mobile */}
            <div className="pt-2.5 pb-1 flex justify-center sm:hidden bg-[#fbf6ee]">
              <div className="w-12 h-1.5 bg-stone-300 rounded-full" />
            </div>

            {/* Cart Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-[#fbf6ee]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#3D271D] text-white flex items-center justify-center font-bold">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#2D1E18]">مراجعة الطلب - {tableShortLabel}</h3>
                  <p className="text-xs text-stone-500">{totalItemsCount} أصناف في السلة</p>
                </div>
              </div>

              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-200/70 hover:bg-stone-300 text-stone-700 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              
              {/* Quick Table Change (if unified QR mode or customer moved) */}
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
                <div className="flex items-center gap-2">
                  <CircleDot size={14} className="text-[#8C6D48]" />
                  <span className="font-bold text-stone-700">رقم الطاولة:</span>
                </div>
                <select
                  value={currentTableNum}
                  onChange={(e) => {
                    const newT = Number(e.target.value);
                    setCurrentTableNum(newT);
                    onTableChange(newT);
                  }}
                  className="bg-white border border-stone-300 rounded-xl px-3 py-1 font-bold text-[#2D1E18] focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                >
                  {tables.filter(t => Number(t.tableNumber) !== 0).map(t => (
                    <option key={t.tableNumber} value={t.tableNumber}>
                      {language === 'en' ? `Table No. (${t.tableNumber})` : `طاولة رقم (${t.tableNumber})`}
                    </option>
                  ))}
                </select>
              </div>

              {cart.map((ci, idx) => {
                const itemId = ci.menuItem?.id || (ci as any)?.id || `cart_${idx}`;
                const itemImg = ci.menuItem?.image;
                const itemName = ci.menuItem ? getItemName(ci.menuItem) : ((ci as any)?.name || 'صنف');
                const itemPrice = ci.menuItem?.price ?? (ci as any)?.price ?? 0;

                return (
                <div 
                  key={itemId} 
                  className="flex items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-stone-200 shadow-sm"
                >
                  {itemImg ? (
                    <img 
                      src={itemImg || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80'} 
                      alt={itemName || 'صنف'} 
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80'; }}
                      className="w-14 h-14 rounded-xl object-cover border border-stone-200 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-stone-100 flex items-center justify-center text-xl flex-shrink-0">
                      ☕
                    </div>
                  )}

                  <div className="flex-1">
                    <h4 className="font-black text-sm text-[#2D1E18]">
                      {itemName}
                    </h4>
                    <p className="text-xs font-bold text-[#8C6D48] mt-0.5">
                      {itemPrice * ci.quantity} {currency} ({itemPrice} {currency} {language === 'en' ? 'each' : 'للقطعة'})
                    </p>
                  </div>

                  {/* Quantity Control & Delete */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200">
                      <button
                        onClick={() => handleUpdateQuantity(itemId, -1)}
                        className="w-7 h-7 rounded-lg bg-white text-[#3D271D] font-bold flex items-center justify-center hover:bg-stone-200 shadow-sm"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="font-black text-xs px-1.5 text-[#2D1E18]">
                        {ci.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(itemId, 1)}
                        className="w-7 h-7 rounded-lg bg-[#3D271D] text-white font-bold flex items-center justify-center hover:bg-[#2A1D15]"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveFromCart(itemId)}
                      className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                      title="حذف من السلة"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
              })}

              {/* Payment Method Selector */}
              <div className="pt-2">
                <label className="text-xs font-bold text-stone-700 block mb-1.5">
                  طريقة الدفع المفضلة
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'cash' 
                        ? 'bg-[#3D271D] text-white border-[#3D271D] shadow-sm' 
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <Banknote size={15} />
                    <span>نقداً (كاش للويتر)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'card' 
                        ? 'bg-[#3D271D] text-white border-[#3D271D] shadow-sm' 
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <CreditCard size={15} />
                    <span>بطاقة / فيزا</span>
                  </button>
                </div>
              </div>

              {/* Customer Contact & Name/Phone Collection */}
              <div className="p-3 bg-white rounded-2xl border border-stone-200 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <User size={14} className="text-[#8C6D48]" />
                    <span>بيانات العميل (الاسم ورقم الهاتف)</span>
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="الاسم الكريم..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#3D271D] font-medium"
                  />
                  <div className="relative">
                    <input
                      type="tel"
                      placeholder="رقم الهاتف (مفتاح مصر +20 تلقائي)..."
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(formatEgyptianPhoneNumber(e.target.value))}
                      onBlur={() => {
                        if (customerPhone) setCustomerPhone(formatEgyptianPhoneNumber(customerPhone));
                      }}
                      dir="ltr"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#3D271D] font-medium text-right placeholder:text-right"
                    />
                  </div>
                </div>

                {/* Active Customer Discount Badge if applicable */}
                {activeCustomerDiscountRate > 0 && (
                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-bold shadow-2xs animate-in fade-in">
                    <div className="flex items-center gap-1.5">
                      <Percent size={14} className="text-emerald-700" />
                      <span>{language === 'en' ? 'Loyalty Discount:' : 'خصم ولاء العملاء:'}</span>
                      <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-black">%{activeCustomerDiscountRate}</span>
                    </div>
                    <span className="text-[11px] font-black text-emerald-800">
                      -{customerDiscountAmount} {currency}
                    </span>
                  </div>
                )}
              </div>

              {/* Coupon Code Section */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 shadow-2xs">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Tag size={14} className="text-[#8C6D48]" />
                  <span>{language === 'en' ? 'Discount Coupon' : 'كوبون الخصم والتخفيض'}</span>
                </label>
                
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-xs font-bold text-emerald-800">
                    <div className="flex items-center gap-2">
                      <Percent size={15} className="text-emerald-600 animate-bounce" />
                      <div>
                        <span>{language === 'en' ? 'Applied Code:' : 'الكود المفعّل:'} </span>
                        <span className="underline decoration-wavy decoration-emerald-500 font-mono text-stone-900 bg-white px-2 py-0.5 rounded-md border border-emerald-100">{appliedCoupon.code}</span>
                        <span className="text-[10px] text-emerald-600 block mt-0.5">
                          {language === 'en' ? 'Discount saved:' : 'القيمة المخصومة:'} {discountAmount} {currency} ({appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}%` : `${appliedCoupon.discountValue} ${currency}`})
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-rose-500 hover:text-rose-700 bg-white px-2 py-1 rounded-lg border border-rose-200 shadow-2xs hover:scale-105 transition-all text-[11px]"
                    >
                      {language === 'en' ? 'Remove' : 'إزالة ❌'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={language === 'en' ? 'Enter coupon code (WELCOME10)...' : 'أدخل رمز كوبون الخصم (مثال: WELCOME10)...'}
                        value={couponInputCode}
                        onChange={(e) => {
                          setCouponInputCode(e.target.value);
                          setCouponError(null);
                          setCouponSuccess(null);
                        }}
                        className="flex-1 p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D] uppercase placeholder:normal-case font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="px-4 py-2 bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                      >
                        {language === 'en' ? 'Apply' : 'تطبيق'}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                        <span>⚠</span>
                        <span>{couponError}</span>
                      </p>
                    )}
                    {couponSuccess && (
                      <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                        <span>✓</span>
                        <span>{couponSuccess}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Order Notes */}
              <div className="pt-1">
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  ملاحظات خاصة على الطلب (بدون سكر، زيادة ثلج، حليب نباتي، إلخ)
                </label>
                <textarea 
                  rows={2}
                  placeholder="اكتب أي ملاحظة للباريستا أو الشيف..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full p-3 bg-white border border-stone-300 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                />
              </div>
            </div>

            {/* Cart Footer Actions */}
            <div className="p-5 border-t border-stone-200 bg-[#fbf6ee] space-y-3">
              <div className="space-y-1.5 border-b border-stone-200/60 pb-3 text-xs text-stone-600 font-bold">
                <div className="flex justify-between">
                  <span>{language === 'en' ? 'Subtotal:' : 'المجموع الفرعي:'}</span>
                  <span>{cartTotal} {currency}</span>
                </div>
                
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>{language === 'en' ? 'Coupon Discount:' : 'خصم الكوبون:'}</span>
                    <span>-{discountAmount} {currency}</span>
                  </div>
                )}
                
                {taxRate > 0 && (
                  <div className="flex justify-between text-stone-500">
                    <span>{language === 'en' ? `Tax (${taxRate}%):` : `الضريبة المضافة (${taxRate}%):`}</span>
                    <span>+{cartTax} {currency}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-base font-black text-[#2D1E18]">
                <span>{language === 'en' ? 'Total Amount:' : 'المجموع النهائي المطلوب:'}</span>
                <span className="text-[#3D271D] text-xl font-black">{finalCartTotal} {currency}</span>
              </div>

              <button
                onClick={handleSendOrder}
                className="w-full py-3.5 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] active:scale-98 text-white font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <ChefHat size={17} />
                <span>تأكيد وإرسال الطلب للمطبخ الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Single Item Full Detail Modal */}
      {selectedItemForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#fffdfa] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-stone-300 relative">
            <button
              onClick={() => setSelectedItemForModal(null)}
              className="absolute top-3 left-3 z-10 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="relative h-60 w-full bg-stone-200">
              <img 
                src={selectedItemForModal.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80'} 
                alt={selectedItemForModal.name || 'صنف'} 
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80'; }}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              
              {/* Category Badge on Modal Picture */}
              {(() => {
                const modalCat = categories.find(c => c.id === selectedItemForModal.categoryId);
                if (!modalCat) return null;
                const catTitle = getCategoryName(modalCat);
                return (
                  <div className="absolute top-3.5 right-4 z-10">
                    <span className="inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-amber-200 border border-white/25 text-xs font-black px-3 py-1 rounded-full shadow-lg">
                      <Sparkles size={11} className="text-amber-400" />
                      <span>{catTitle}</span>
                    </span>
                  </div>
                );
              })()}

              <div className="absolute bottom-3.5 right-4 left-4 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-xl">
                    {getItemName(selectedItemForModal)}
                  </h3>
                  <span className="bg-[#D4A373] text-[#2A1D15] text-sm font-black px-3 py-1 rounded-full shadow-md">
                    {selectedItemForModal.price} {currency}
                  </span>
                </div>
                {language === 'ar' && selectedItemForModal.nameEn && (
                  <p className="text-xs text-stone-300 font-medium mt-0.5" dir="ltr">{selectedItemForModal.nameEn}</p>
                )}
              </div>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                {getItemDesc(selectedItemForModal)}
              </p>

              {selectedItemForModal.calories && (
                <div className="flex items-center gap-2 bg-[#eedec6]/60 p-2.5 rounded-2xl border border-[#dfcdb6] text-xs font-bold text-[#3D271D]">
                  <Flame size={15} className="text-amber-700" />
                  <span>
                    {language === 'en' 
                      ? `Approx. Calories: ${selectedItemForModal.calories} kcal` 
                      : `السعرات الحرارية التقريبية: ${selectedItemForModal.calories} سعرة حرارية`}
                  </span>
                </div>
              )}

              {isViewOnly || isBrowsingOnly ? (
                <div className="pt-2 flex flex-col gap-2 w-full">
                  <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl text-center space-y-1">
                    <p className="text-xs font-bold text-amber-900">
                      👀 هذا المنيو مخصص للاستعراض ومعرفة الأسعار فقط
                    </p>
                    <p className="text-[11px] text-amber-700">
                      وضع المشاهدة مخصص لتصفح القائمة والأسعار والتفاصيل دون إمكانية الطلب
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedItemForModal(null)}
                    className="w-full py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                  >
                    <span>إغلاق ومتابعة التصفح</span>
                  </button>
                </div>
              ) : (
                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    disabled={selectedItemForModal.available === false}
                    onClick={() => {
                      handleAddToCart(selectedItemForModal);
                      setSelectedItemForModal(null);
                    }}
                    className={`flex-1 py-3 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-all ${
                      selectedItemForModal.available !== false 
                        ? 'bg-[#3D271D] hover:bg-[#2A1D15] text-white active:scale-98' 
                        : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <Plus size={16} />
                    <span>
                      {selectedItemForModal.available !== false 
                        ? (language === 'en' ? 'Add to Cart' : 'إضافة إلى سلة الطلبات') 
                        : (language === 'en' ? 'Currently Unavailable' : 'غير متوفر حالياً')}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Welcome Popup Ad Modal */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative bg-[#fffdfa] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-stone-300 text-center">
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            >
              <X size={16} />
            </button>

            <div className="relative h-44 w-full">
              <img 
                src={popupAd.image} 
                alt={popupAd.title} 
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </div>

            <div className="p-5 space-y-2">
              <h3 className="font-black text-lg text-[#2D1E18]">{popupAd.title}</h3>
              <p className="text-xs text-stone-600 leading-relaxed">{popupAd.content}</p>
              
              <button
                onClick={() => setShowPopup(false)}
                className="w-full mt-3 py-2.5 rounded-xl bg-[#3D271D] text-white font-bold text-xs shadow hover:bg-[#2A1D15]"
              >
                تصفح المنيو الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Electronic Digital Check / Receipt Modal (الشيك الإلكتروني الذكي للعميل) */}
      {showDigitalCheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#fffdfa] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-stone-300 max-h-[92vh] flex flex-col relative">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#2A1D15] via-[#3D271D] to-[#2A1D15] text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#D4A373] text-[#2A1D15] flex items-center justify-center font-black">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base text-amber-100">
                    {language === 'en' ? 'Live Digital Check' : 'الشيك الإلكتروني المباشر'}
                  </h3>
                  <p className="text-[11px] text-stone-300">{tableLabel} &bull; {settings.systemName}</p>
                </div>
              </div>

              <button
                onClick={() => setShowDigitalCheck(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              
              {/* Receipt Top Identity Box */}
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-center space-y-1">
                <h4 className="font-black text-sm text-[#2D1E18]">{settings.systemName}</h4>
                <div className="flex items-center justify-center gap-3 text-[11px] text-stone-500 font-medium">
                  <span>{language === 'en' ? 'Table:' : 'طاولة:'} <strong>{currentTableNum}</strong></span>
                  <span>&bull;</span>
                  <span>{language === 'en' ? 'Date:' : 'التاريخ:'} {new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG')}</span>
                </div>
                {customerName && (
                  <p className="text-[11px] text-stone-600 font-bold">
                    {language === 'en' ? 'Guest:' : 'العميل:'} {customerName}
                  </p>
                )}
              </div>

              {/* Status Alert Badge */}
              {isBillRequested ? (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 flex items-center gap-2.5 animate-pulse">
                  <Clock size={16} className="text-amber-700 flex-shrink-0" />
                  <span className="text-[11px] font-bold">
                    {language === 'en' 
                      ? 'Bill request sent to cashier! Our waiter is on their way with the invoice.' 
                      : 'تم إرسال طلب الشيك للكاشير بنجاح، والويتر في طريقه إليك الآن بالفاتورة وجهاز الدفع.'}
                  </span>
                </div>
              ) : activeTableOrders.length === 0 && sessionSubtotal === 0 ? (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-700 flex-shrink-0" />
                  <span className="text-[11px] font-bold">
                    {language === 'en' 
                      ? 'No unpaid active orders for this table. Bill is settled successfully.' 
                      : 'لا توجد طلبات معلقة لهذه الطاولة حالياً. تم سداد الفاتورة أو لم يتم تقديم طلبات بعد.'}
                  </span>
                </div>
              ) : null}

              {/* Ordered Items Breakdown */}
              <div>
                <h5 className="font-black text-xs text-stone-800 mb-2 flex items-center justify-between">
                  <span>{language === 'en' ? 'Item & Order Breakdown:' : 'تفاصيل الأصناف والطلبات:'}</span>
                  <span className="text-[10px] text-stone-500">({aggregatedSessionItems.length} {language === 'en' ? 'items' : 'صنف'})</span>
                </h5>

                {aggregatedSessionItems.length > 0 ? (
                  <div className="space-y-1.5 border border-stone-200 rounded-2xl p-2 bg-stone-50/70 max-h-52 overflow-y-auto">
                    {aggregatedSessionItems.map((item, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-2 bg-white rounded-xl border border-stone-150 text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-lg bg-[#EEDEC6] text-[#3D271D] font-black flex items-center justify-center text-[10px]">
                            {item.quantity}×
                          </span>
                          <span className="font-bold text-stone-800">
                            {language === 'en' && item.menuItem?.nameEn ? item.menuItem.nameEn : (item.menuItem?.name || 'صنف')}
                          </span>
                        </div>
                        <span className="font-black text-stone-800">
                          {(item.menuItem?.price || 0) * (item.quantity || 1)} {currency}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-stone-400 text-xs">
                    {language === 'en' ? 'No items ordered yet.' : 'لا توجد عناصر مضافة بعد.'}
                  </p>
                )}
              </div>

              {/* Financial Calculation Box */}
              <div className="bg-stone-100 p-3.5 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between text-stone-600 text-xs">
                  <span>{language === 'en' ? 'Subtotal:' : 'المجموع الفرعي:'}</span>
                  <span className="font-bold text-stone-800">{sessionSubtotal} {currency}</span>
                </div>

                {isTaxActive ? (
                  <div className="flex items-center justify-between text-stone-600 text-xs">
                    <span>{language === 'en' ? `VAT Tax (${settings.taxRate}%):` : `ضريبة القيمة المضافة (${settings.taxRate}%):`}</span>
                    <span className="font-bold text-stone-800">{sessionTax} {currency}</span>
                  </div>
                ) : null}

                <div className="pt-2 border-t border-stone-300 flex items-center justify-between font-black text-sm text-[#2D1E18]">
                  <span>{language === 'en' ? 'Total Amount Due:' : 'المبلغ الإجمالي المستحق:'}</span>
                  <span className="text-base text-[#3D271D] font-black">{sessionTotal} {currency}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-2 flex-shrink-0">
              {isBillRequested ? (
                <div className="space-y-2">
                  <div className="w-full py-3 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 font-black text-xs shadow-xs flex items-center justify-center gap-2 animate-pulse">
                    <Clock size={16} className="text-amber-700" />
                    <span>
                      {language === 'en' 
                        ? 'Bill request sent! Our waiter is on their way ✓' 
                        : 'تم إرسال طلب الحساب للكاشير والويتر في الطريق إليك ✓'}
                    </span>
                  </div>
                </div>
              ) : sessionSubtotal > 0 ? (
                <button
                  onClick={handleSendBillRequest}
                  className="w-full py-3 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <Receipt size={16} />
                  <span>
                    {language === 'en' 
                      ? `Request Bill & Call Waiter Now (${sessionTotal} ${currency})` 
                      : `طلب الحساب واستدعاء الويتر الآن (${sessionTotal} {currency})`}
                  </span>
                </button>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePrintDigitalCheck}
                  className="py-2.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Printer size={14} />
                  <span>{language === 'en' ? 'Print Bill Receipt' : 'طباعة الشيك الحراري'}</span>
                </button>

                <button
                  onClick={() => setShowDigitalCheck(false)}
                  className="py-2.5 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-xs transition-colors"
                >
                  {language === 'en' ? 'Close Window' : 'إغلاق النافذة'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Switch Table Selector Modal - Never rendered in view/browsing only mode */}
      {showTableChangeModal && !isViewOnly && !isBrowsingOnly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" style={{ direction: 'rtl' }}>
          <div className="bg-[#fffdfa] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-stone-300 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#3D271D] text-[#FAF7F2] flex items-center justify-center font-bold">
                  <CircleDot size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#2D1E18]">
                    {currentTableNum > 0 ? 'تغيير رقم الطاولة' : 'اختر رقم طاولتك للبدء'}
                  </h3>
                  <p className="text-[11px] text-stone-500 font-medium">
                    {currentTableNum > 0 ? 'اختر طاولة أخرى متاحة للانتقال إليها' : 'يرجى تحديد طاولتك لتحميل القائمة ومتابعة طلبك'}
                  </p>
                </div>
              </div>
              {Boolean(currentTableNum > 0) && (
                <button 
                  onClick={() => setShowTableChangeModal(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 flex items-center justify-center transition-colors"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* View Only / Browse Menu Option */}
            <button
              type="button"
              onClick={() => {
                setIsBrowsingOnly(true);
                setShowTableChangeModal(false);
              }}
              className="w-full p-3.5 rounded-2xl bg-amber-50/80 hover:bg-amber-100/80 border border-amber-300 text-[#2D1E18] flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center font-bold text-sm">
                  👁️
                </div>
                <div className="text-right">
                  <p className="font-black text-xs text-[#2D1E18]">استعراض المنيو والأسعار فقط (للمشاهدة)</p>
                  <p className="text-[10px] text-stone-500">تصفح كافة الأصناف والأسعار دون حجز طاولة</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-200/80 text-amber-950">
                تصفح فقط
              </span>
            </button>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-stone-600 px-1">
                <span>طاولات الصالة المتاحة:</span>
                <span className="text-[11px] text-stone-400 font-normal">
                  (اضغط على طاولتك للبدء)
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-60 overflow-y-auto p-1">
                {(tables || []).filter(t => Number(t.tableNumber) !== 0).map((t) => {
                  const isCurrent = Number(t.tableNumber) === Number(currentTableNum);
                  const isOccupied = isTableTrulyOccupied(t);
                  const isBusyByOther = isOccupied && Boolean(t.activeSessionDeviceId) && t.activeSessionDeviceId !== deviceId;

                  return (
                    <button
                      key={t.tableNumber}
                      type="button"
                      disabled={isBusyByOther}
                      onClick={() => {
                        if (isBusyByOther) return;
                        setCurrentTableNum(t.tableNumber);
                        onTableChange(t.tableNumber);
                        setIsBrowsingOnly(false);
                        setShowTableChangeModal(false);
                      }}
                      className={`p-3 rounded-2xl border text-center font-bold text-xs transition-all relative ${
                        isCurrent && !isBrowsingOnly
                          ? 'bg-[#3D271D] text-white border-[#3D271D] shadow-md scale-102 cursor-default'
                          : isBusyByOther
                          ? 'bg-stone-100 text-stone-400 border-stone-200 opacity-60 cursor-not-allowed'
                          : isOccupied
                          ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                          : 'bg-emerald-50/60 text-emerald-950 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                      }`}
                    >
                      <div className="text-sm font-black flex items-center justify-center gap-1">
                        <span>طاولة {t.tableNumber}</span>
                        {isBusyByOther && <Lock size={12} className="text-rose-500" />}
                      </div>
                      <div className="text-[10px] mt-1 font-bold">
                        {isCurrent && !isBrowsingOnly ? (
                          <span className="text-amber-300">طاولتك الحالية</span>
                        ) : isBusyByOther ? (
                          <span className="text-rose-600">مشغولة 🔒</span>
                        ) : (
                          <span className="text-emerald-700">متاحة ✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {Boolean(currentTableNum > 0) && (
              <button
                type="button"
                onClick={() => setShowTableChangeModal(false)}
                className="w-full py-3 rounded-2xl bg-stone-100 text-stone-700 font-bold text-xs hover:bg-stone-200 transition-colors"
              >
                إلغاء وإبقاء طاولتي الحالية
              </button>
            )}
          </div>
        </div>
      )}

      {/* 8. Footer (Social links & Developer rights, without lock button) */}
      <footer className="max-w-4xl mx-auto px-4 pt-10 pb-8 text-center text-stone-500 text-xs flex flex-col items-center gap-3 border-t border-[#dfcdb6] mt-12">
        <p className="font-bold text-stone-700 text-sm">
          {settings.systemName} &bull; نظام المنيو الذكي للطاولات
        </p>

        {/* Social Icons in footer */}
        {settings.socialLinks?.enabled && (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {settings.socialLinks.whatsapp && (
              <a
                href={`https://wa.me/${settings.socialLinks.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center hover:bg-emerald-100 border border-emerald-200 transition-colors"
                title="واتساب"
              >
                <MessageCircle size={15} />
              </a>
            )}
            {settings.socialLinks.instagram && (
              <a
                href={settings.socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center hover:bg-rose-100 border border-rose-200 transition-colors"
                title="إنستغرام"
              >
                <Instagram size={15} />
              </a>
            )}
            {settings.socialLinks.facebook && (
              <a
                href={settings.socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center hover:bg-blue-100 border border-blue-200 transition-colors"
                title="فيسبوك"
              >
                <Facebook size={15} />
              </a>
            )}
            {settings.socialLinks.phone && (
              <a
                href={`tel:${settings.socialLinks.phone}`}
                className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center hover:bg-amber-100 border border-amber-200 transition-colors"
                title="اتصال هاتف"
              >
                <Phone size={15} />
              </a>
            )}
            {settings.socialLinks.locationUrl && (
              <a
                href={settings.socialLinks.locationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-red-50 text-red-700 flex items-center justify-center hover:bg-red-100 border border-red-200 transition-colors"
                title="خرائط جوجل"
              >
                <MapPin size={15} />
              </a>
            )}
          </div>
        )}

        {/* Developer Rights */}
        {settings.developerRights?.enabled && (
          <div className="pt-2 border-t border-stone-200/60 w-full max-w-md flex flex-col items-center gap-1.5 text-[11px] text-stone-500">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span>{language === 'ar' ? 'تصميم وبرمجة:' : 'Design & Development:'}</span>
              <button
                type="button"
                onClick={() => setShowDevModal(true)}
                className="font-black text-[#8C6D48] hover:text-[#3D271D] underline decoration-dotted underline-offset-4 cursor-pointer flex items-center gap-1 transition-colors"
                title={language === 'ar' ? 'عرض بيانات ومعلومات المطور' : 'View Developer Profile'}
              >
                <span>{settings.developerRights.developerName || (language === 'ar' ? 'المطور' : 'Developer')}</span>
                <Sparkles size={11} className="text-[#D4A373]" />
              </button>
              <button
                type="button"
                onClick={() => setShowDevModal(true)}
                className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[10px] transition-colors cursor-pointer"
                title={language === 'ar' ? 'عرض كارت المطور' : 'Developer Profile Card'}
              >
                <MessageCircle size={11} />
                <span>{language === 'ar' ? 'كارت وتواصل المطور' : 'Developer Info'}</span>
              </button>
            </div>
            {settings.developerRights.copyrightText && (
              <p className="text-[10px] text-stone-400">
                {settings.developerRights.copyrightText}
              </p>
            )}
          </div>
        )}
      </footer>

      {/* Developer Profile Modal */}
      {showDevModal && (
        <DeveloperModal
          developerRights={settings.developerRights}
          onClose={() => setShowDevModal(false)}
          lang={language}
        />
      )}

      {/* Cashier Bill Settled / Confirmed Celebration Notification */}
      {showBillSettledNotification && (
        <div className="fixed top-5 inset-x-4 max-w-md mx-auto z-50 bg-emerald-800 text-white p-4 rounded-3xl shadow-2xl flex items-center gap-3 border border-emerald-500/50 animate-in slide-in-from-top duration-300">
          <div className="w-10 h-10 rounded-2xl bg-white text-emerald-800 flex items-center justify-center font-black flex-shrink-0 shadow-sm">
            <CheckCircle2 size={22} />
          </div>
          <div className="flex-1 text-right">
            <h4 className="font-black text-sm text-emerald-100">تم تأكيد وسداد الشيك من الكاشير بنجاح ✓</h4>
            <p className="text-xs text-emerald-200 mt-0.5">شكراً لزيارتكم ونسعد دائماً بخدمتكم في {settings.systemName}.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowBillSettledNotification(false)}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex-shrink-0 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Printable Thermal Receipt for Customer Browser */}
      {clientPrintReceipt && (
        <ThermalReceipt 
          type={clientPrintReceipt.type}
          order={clientPrintReceipt.order}
          tableBill={clientPrintReceipt.tableBill}
          settings={settings}
          currency={currency}
        />
      )}

    </div>
  );
};
