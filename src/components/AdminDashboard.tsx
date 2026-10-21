// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Category, 
  MenuItem, 
  Order, 
  TableInfo, 
  Banner, 
  PopupAd, 
  SystemSettings,
  OrderStatus,
  Customer,
  CustomerReview,
  SystemLog,
  Coupon,
  ChatbotSettings,
  ChatbotQA,
  BillRequest
} from '../types';
import { syncHub } from '../lib/syncHub';
import { normalizeOrders, normalizeOrder } from '../utils/orderUtils';
import { playNotificationSound } from '../utils/sound';
import { compressAndResizeImage, fileToBase64 } from '../utils/fileUpload';
import { autoTranslateArabicToEnglish, autoTranslateEnglishToArabic, adminUiTranslations } from '../utils/translation';
import { AdsPage } from './admin/AdsPage';
import { CustomersPage } from './admin/CustomersPage';
import { ThemePage } from './admin/ThemePage';
import { SocialPage } from './admin/SocialPage';
import { OrdersReceptionPage } from './admin/OrdersReceptionPage';
import { ThermalReceipt } from './ThermalReceipt';
import { 
  ClipboardList, 
  BarChart3, 
  UtensilsCrossed, 
  Volume2, 
  Settings as SettingsIcon, 
  CheckCircle, 
  Clock, 
  ChefHat, 
  XCircle, 
  Plus, 
  Trash2, 
  Pencil,
  QrCode, 
  Image as ImageIcon, 
  Lock,
  Upload,
  Play,
  RotateCcw,
  Check,
  Shield,
  Layers,
  Sparkles,
  DollarSign,
  Copy,
  ExternalLink,
  Store,
  ShoppingBag,
  Music,
  Sliders,
  ChevronLeft,
  User, UserPlus,
  KeyRound,
  Hash,
  Eye,
  EyeOff,
  LogOut,
  RefreshCw,
  AlertCircle,
  Receipt,
  CircleDot,
  CheckCircle2,
  Printer,
  Smartphone,
  Info,
  Flame,
  CreditCard,
  Banknote,
  Download,
  Percent,
  CheckCheck,
  TrendingUp,
  Award,
  Users,
  Calendar,
  X,
  FolderPlus,
  Palette,
  Share2,
  Megaphone,
  Globe,
  FileText,
  Terminal,
  Activity,
  Filter,
  Trash,
  LockKeyhole,
  Search,
  Code,
  Tag,
  MessageSquare,
  Bot,
  Send,
  Database,
  Server,
  Cloud,
  Star
} from 'lucide-react';
import { fetchMongoStatus, triggerMongoSync, MongoStatusResponse } from '../lib/mongoClient';
import { PushNotificationsSettings } from './admin/PushNotificationsSettings';

interface AdminDashboardProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  menuItems: MenuItem[];
  setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  updateOrderStatus?: (orderId: string, status: OrderStatus) => Promise<boolean>;
  updatingOrderIds?: Set<string>;
  tables: TableInfo[];
  setTables: React.Dispatch<React.SetStateAction<TableInfo[]>>;
  customers?: Customer[];
  setCustomers?: React.Dispatch<React.SetStateAction<Customer[]>>;
  banners: Banner[];
  setBanners: React.Dispatch<React.SetStateAction<Banner[]>>;
  popupAd: PopupAd;
  setPopupAd: React.Dispatch<React.SetStateAction<PopupAd>>;
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  coupons?: Coupon[];
  setCoupons?: React.Dispatch<React.SetStateAction<Coupon[]>>;
  systemLogs?: SystemLog[];
  setSystemLogs?: React.Dispatch<React.SetStateAction<SystemLog[]>>;
  addSystemLog?: (
    category: SystemLog['category'],
    level: SystemLog['level'],
    message: string,
    details?: string,
    actor?: string,
    messageEn?: string
  ) => void;
  onSwitchToClient: () => void;
  onLockAdmin?: () => void;
  reviews?: CustomerReview[];
  setReviews?: React.Dispatch<React.SetStateAction<CustomerReview[]>>;
  billRequests?: BillRequest[];
  setBillRequests?: React.Dispatch<React.SetStateAction<BillRequest[]>>;
  mergeIncomingBills?: (incoming: any[], meta?: any) => void;
  mergeIncomingOrders?: (incoming: any[], meta?: any) => void;
  deleteOrderPermanently?: (orderId: string) => void;
  clearAllOrders?: () => Promise<any> | any;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  categories = [],
  setCategories,
  menuItems = [],
  setMenuItems,
  orders = [],
  setOrders,
  updateOrderStatus,
  updatingOrderIds,
  tables = [],
  setTables,
  customers = [],
  setCustomers,
  reviews = [],
  setReviews,
  billRequests = [],
  setBillRequests,
  mergeIncomingBills,
  mergeIncomingOrders,
  deleteOrderPermanently,
  clearAllOrders,
  banners = [],
  setBanners,
  popupAd,
  setPopupAd,
  settings,
  setSettings,
  coupons = [],
  setCoupons,
  systemLogs = [],
  setSystemLogs,
  addSystemLog,
  onSwitchToClient,
  onLockAdmin
}) => {
  // Modular Independent Admin Pages
  const [activeTab, setActiveTab] = useState<
    'orders' | 'bills' | 'tables' | 'tables-tracking' | 'menu' | 'ads' | 'customers' | 'theme' | 'social' | 'qr' | 'settings' | 'logs' | 'developer' | 'coupons'
  >('orders');

  // Global Save Notification State
  const [saveToast, setSaveToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });

  const safeAddSystemLog = useCallback((..._args: any[]) => {
    // Audit logs completely removed
  }, []);

  const handleTriggerSaveToast = useCallback((msg: string = 'تم حفظ التعديلات وتطبيق التغييرات بنجاح في النظام!') => {
    setSaveToast({ show: true, msg });
    setTimeout(() => {
      setSaveToast({ show: false, msg: '' });
    }, 3500);
  }, []);

  // Realtime Backend Sync Status & Direct Order Fetching
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'connecting' | 'disconnected'>(syncHub.getStatus());

  // MongoDB Atlas Database Status
  const [mongoStatus, setMongoStatus] = useState<MongoStatusResponse | null>(null);
  const [isSyncingMongo, setIsSyncingMongo] = useState(false);

  const checkMongoStatus = useCallback(async () => {
    try {
      const status = await fetchMongoStatus();
      setMongoStatus(status);
    } catch (e) {}
  }, []);

  const handleManualMongoSync = async () => {
    setIsSyncingMongo(true);
    try {
      const res = await triggerMongoSync();
      if (res.success) {
        alert('✅ ' + (res.message || 'تمت المزامنة بنجاح مع MongoDB Atlas!'));
        checkMongoStatus();
      } else {
        alert('ℹ️ ' + (res.message || 'يعمل السيستم في وضع التخزين الهجين مع حفظ البيانات محلياً.'));
      }
    } catch (e) {
      alert('حدث خطأ أثناء محاولة المزامنة.');
    } finally {
      setIsSyncingMongo(false);
    }
  };

  // Listen to realtime connection status & fast sync poll for bill requests & orders
  useEffect(() => {
    checkMongoStatus();
    const unsubStatus = syncHub.onStatusChange((status) => {
      setSyncStatus(status);
    });

    const pollInterval = setInterval(async () => {
      try {
        const resBills = await fetch('/api/sync/bill_requests');
        if (resBills.ok) {
          const json = await resBills.json();
          if (json && Array.isArray(json.data)) {
            if (mergeIncomingBills) {
              mergeIncomingBills(json.data, { senderId: 'poll' });
            } else if (setBillRequests) {
              setBillRequests(json.data);
            }
          }
        }
        const resOrders = await fetch('/api/orders');
        if (resOrders.ok) {
          const ordersList = await resOrders.json();
          if (Array.isArray(ordersList) && mergeIncomingOrders) {
            mergeIncomingOrders(ordersList, { senderId: 'poll' });
          }
        }
        const resTables = await fetch('/api/sync/tables');
        if (resTables.ok) {
          const json = await resTables.json();
          if (json && Array.isArray(json.data)) {
            setTables(json.data);
          }
        }
      } catch (e) {}
    }, 4000);

    return () => {
      unsubStatus();
      clearInterval(pollInterval);
    };
  }, [checkMongoStatus, mergeIncomingBills, mergeIncomingOrders, setBillRequests, setTables]);

  // Safe normalized orders (includes all orders: tables and takeaway)
  const safeOrders = React.useMemo(() => {
    return normalizeOrders(orders, menuItems);
  }, [orders, menuItems]);

  // Fetch orders directly from Express Server API (/api/orders) for manual refresh
  const fetchOrdersDirectly = useCallback(async () => {
    setIsRefreshingOrders(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const serverOrders = await res.json();
        if (Array.isArray(serverOrders)) {
          setOrders(normalizeOrders(serverOrders, menuItems));
        }
      }
    } catch (err) {
      console.warn('[Admin] Failed to fetch orders directly:', err);
    } finally {
      setTimeout(() => setIsRefreshingOrders(false), 400);
    }
  }, [setOrders, menuItems]);

  // Sound notification for Bill Requests (طلب الشيك / الفاتورة) - "صوت إشعار لطلب الشيك"
  const prevBillKeysRef = useRef<Set<string>>(new Set((billRequests || []).filter(b => b.status === 'pending').map(b => `${b.id || b.tableNumber}`)));
  const prevBillTablesRef = useRef<Set<number>>(new Set((tables || []).filter(t => t.status === 'bill_requested' || t.billRequested).map(t => Number(t.tableNumber))));
  const lastBillSoundPlayedAtRef = useRef<number>(0);

  useEffect(() => {
    const currentPendingBills = (billRequests || []).filter(b => b.status === 'pending');
    const currentBillTables = (tables || []).filter(t => Number(t.tableNumber) !== 0 && (t.status === 'bill_requested' || t.billRequested));
    
    const prevBillKeys = prevBillKeysRef.current;
    const prevBillTables = prevBillTablesRef.current;

    const hasNewBillRequest = currentPendingBills.some(b => !prevBillKeys.has(`${b.id || b.tableNumber}`)) ||
      currentBillTables.some(t => !prevBillTables.has(Number(t.tableNumber)));

    // Bill sound is active if billSoundEnabled !== false and mode is not 'orders_only' or 'none'
    const isBillSoundActive = settings.billSoundEnabled !== false && settings.soundNotificationMode !== 'orders_only' && settings.soundNotificationMode !== 'none';

    const now = Date.now();
    if (hasNewBillRequest && isBillSoundActive && (now - lastBillSoundPlayedAtRef.current > 5000)) {
      lastBillSoundPlayedAtRef.current = now;
      try {
        playNotificationSound(settings.adminSoundVolume, settings.billSoundType || 'bill', settings.customAdminAudio);
      } catch (e) {}
    }

    prevBillKeysRef.current = new Set(currentPendingBills.map(b => `${b.id || b.tableNumber}`));
    prevBillTablesRef.current = new Set(currentBillTables.map(t => Number(t.tableNumber)));
  }, [billRequests, tables, settings.adminSoundVolume, settings.billSoundType, settings.billSoundEnabled, settings.soundNotificationMode, settings.customAdminAudio]);

  // Sound notification for new incoming pending orders on Admin Dashboard (respects "صوت اشعار لطلب الشيك بس")
  const prevOrderIdsRef = useRef<Set<string>>(new Set((orders || []).map(o => o.id)));
  useEffect(() => {
    const currentOrders = orders || [];
    const prevIds = prevOrderIdsRef.current;
    const hasNewPending = currentOrders.some(o => o.status === 'pending' && !prevIds.has(o.id));
    
    // Sound is active for new orders unless specifically turned off
    const isOrderSoundActive = settings.orderSoundEnabled !== false && settings.soundNotificationMode !== 'bill_only' && settings.soundNotificationMode !== 'none';

    if (hasNewPending && isOrderSoundActive) {
      try {
        playNotificationSound(settings.adminSoundVolume, settings.adminSoundType, settings.customAdminAudio);
      } catch (e) {}
    }
    prevOrderIdsRef.current = new Set(currentOrders.map(o => o.id));
  }, [orders, settings.adminSoundVolume, settings.adminSoundType, settings.customAdminAudio, settings.orderSoundEnabled, settings.soundNotificationMode]);

  // Orders filter
  const [orderFilter, setOrderFilter] = useState<'all' | 'takeaway' | 'tables' | 'pending' | 'preparing' | 'ready' | 'delivered' | 'completed'>('all');

  // System Logs filter states
  const [logCategoryFilter, setLogCategoryFilter] = useState<string>('all');
  const [logLevelFilter, setLogLevelFilter] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const setPreviewSplash = (_val: boolean) => {};
  const chatbotSettings = { enabled: false, botName: 'Bot', botAvatar: '', welcomeMessage: '', fallbackMessage: '', disableAnimation: false };
  const chatbotQAs: any[] = [];
  const setChatbotSettings: any = (_arg: any) => {};
  const setChatbotQAs: any = (_arg: any) => {};
  const handleBotAvatarUpload = (_e: any) => {};

  // Menu folder view: active category
  const [managingCategoryId, setManagingCategoryId] = useState<string | null>(null);

  // Scroll to top when opening category in menu manager
  useEffect(() => {
    if (managingCategoryId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [managingCategoryId]);

  // New Category form state
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatNameEn, setNewCatNameEn] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatDescEn, setNewCatDescEn] = useState('');
  const [newCatImage, setNewCatImage] = useState('');
  const [newCatScheduleEnabled, setNewCatScheduleEnabled] = useState(false);
  const [newCatScheduleStartTime, setNewCatScheduleStartTime] = useState('07:00');
  const [newCatScheduleEndTime, setNewCatScheduleEndTime] = useState('12:00');
  const [newCatScheduleAction, setNewCatScheduleAction] = useState<'pin_top' | 'hide_outside'>('pin_top');
  const [isUploadingCatImg, setIsUploadingCatImg] = useState(false);

  // Edit Category state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatNameEn, setEditCatNameEn] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');
  const [editCatDescEn, setEditCatDescEn] = useState('');
  const [editCatImage, setEditCatImage] = useState('');
  const [editCatScheduleEnabled, setEditCatScheduleEnabled] = useState(false);
  const [editCatScheduleStartTime, setEditCatScheduleStartTime] = useState('07:00');
  const [editCatScheduleEndTime, setEditCatScheduleEndTime] = useState('12:00');
  const [editCatScheduleAction, setEditCatScheduleAction] = useState<'pin_top' | 'hide_outside'>('pin_top');
  const [isUploadingEditCatImg, setIsUploadingEditCatImg] = useState(false);

  // Bulk Price Update State
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [bulkCatId, setBulkCatId] = useState<string>('all');
  const [bulkPercentage, setBulkPercentage] = useState<string>('10');
  const [bulkOperation, setBulkOperation] = useState<'increase' | 'decrease'>('increase');
  const [bulkRounding, setBulkRounding] = useState<'nearest_integer' | 'round_5' | 'none'>('nearest_integer');
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);

  const handleApplyBulkPriceUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseFloat(bulkPercentage);
    if (isNaN(pct) || pct <= 0) {
      alert('برجاء إدخال نسبة مئوية صحيحة أصلها أكبر من 0');
      return;
    }

    const factor = bulkOperation === 'increase' ? (1 + pct / 100) : (1 - pct / 100);

    setMenuItems(prev => prev.map(item => {
      if (bulkCatId === 'all' || item.categoryId === bulkCatId) {
        let rawPrice = item.price * factor;
        let finalPrice = rawPrice;

        if (bulkRounding === 'nearest_integer') {
          finalPrice = Math.round(rawPrice);
        } else if (bulkRounding === 'round_5') {
          finalPrice = Math.ceil(rawPrice / 5) * 5;
        } else {
          finalPrice = Math.round(rawPrice * 100) / 100;
        }

        finalPrice = Math.max(1, finalPrice);
        return { ...item, price: finalPrice };
      }
      return item;
    }));

    const targetItemsCount = bulkCatId === 'all' 
      ? menuItems.length 
      : menuItems.filter(m => m.categoryId === bulkCatId).length;
    
    const catName = bulkCatId === 'all' 
      ? 'جميع الأقسام' 
      : categories.find(c => c.id === bulkCatId)?.name || 'القسم المحدد';

    setBulkSuccessMsg(`تم ${bulkOperation === 'increase' ? 'زيادة' : 'تخفيض'} أسعار (${targetItemsCount}) صنف بنجاح بنسبة ${pct}% في قسم "${catName}"!`);
    setTimeout(() => setBulkSuccessMsg(null), 5000);
    setShowBulkPriceModal(false);
  };

  // New Item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemNameEn, setNewItemNameEn] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemDescEn, setNewItemDescEn] = useState('');
  const [newItemImage, setNewItemImage] = useState('');
  const [newItemCalories, setNewItemCalories] = useState('');
  const [newItemIsPopular, setNewItemIsPopular] = useState(false);
  const [newItemIsNew, setNewItemIsNew] = useState(false);
  const [isUploadingItemImg, setIsUploadingItemImg] = useState(false);

  // Edit Item state
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemNameEn, setEditItemNameEn] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');
  const [editItemDesc, setEditItemDesc] = useState('');
  const [editItemDescEn, setEditItemDescEn] = useState('');
  const [editItemImage, setEditItemImage] = useState('');
  const [editItemCalories, setEditItemCalories] = useState('');
  const [editItemIsPopular, setEditItemIsPopular] = useState(false);
  const [editItemIsNew, setEditItemIsNew] = useState(false);
  const [editItemCategoryId, setEditItemCategoryId] = useState('');
  const [isUploadingEditItemImg, setIsUploadingEditItemImg] = useState(false);

  // Security Credentials state
  const [usernameInput, setUsernameInput] = useState(settings.adminUsername || 'admin');
  const [passwordInput, setPasswordInput] = useState(settings.adminPassword || 'admin123');
  const [pinInput, setPinInput] = useState(settings.adminPin || '1234');
  const [showPassword, setShowPassword] = useState(false);
  const [securitySavedMsg, setSecuritySavedMsg] = useState(false);

  // Developer Password Protection & Console State
  const [isDeveloperUnlocked, setIsDeveloperUnlocked] = useState(false);
  const [devPasswordInput, setDevPasswordInput] = useState('');
  const [devPasswordError, setDevPasswordError] = useState<string | null>(null);
  const [newDevPassword, setNewDevPassword] = useState(settings.developerPassword || '1234');
  const [devPasswordSavedMsg, setDevPasswordSavedMsg] = useState(false);

  // Coupon Promotion System Form States
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCouponValue, setNewCouponValue] = useState<string>('');
  const [newCouponMinOrder, setNewCouponMinOrder] = useState<string>('');
  const [newCouponMaxDiscount, setNewCouponMaxDiscount] = useState<string>('');
  const [newCouponMaxUses, setNewCouponMaxUses] = useState<string>('');
  const [newCouponExpiresAt, setNewCouponExpiresAt] = useState<string>('');
  const [newCouponActive, setNewCouponActive] = useState<boolean>(true);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [couponErrorMsg, setCouponErrorMsg] = useState<string | null>(null);
  const [couponSuccessMsg, setCouponSuccessMsg] = useState<string | null>(null);

  // Multi-language system state
  const [currentLang, setCurrentLang] = useState<'ar' | 'en'>(() => {
    return (settings.defaultLanguage as 'ar' | 'en') || 'ar';
  });
  const [langSavedMsg, setLangSavedMsg] = useState(false);

  useEffect(() => {
    if (settings.defaultLanguage) {
      setCurrentLang(settings.defaultLanguage);
    }
  }, [settings.defaultLanguage]);

  const handleSaveLanguage = (newLang: 'ar' | 'en') => {
    setCurrentLang(newLang);
    setSettings(prev => ({ ...prev, defaultLanguage: newLang }));
    setLangSavedMsg(true);
    setTimeout(() => setLangSavedMsg(false), 3000);
  };

  const tAdmin = adminUiTranslations[currentLang] || adminUiTranslations.ar;


  const [systemNameInput, setSystemNameInput] = useState(settings.systemName || '');
  const [systemNameEnInput, setSystemNameEnInput] = useState(settings.systemNameEn || '');
  const [identitySavedMsg, setIdentitySavedMsg] = useState(false);
  
  const [splashSloganInput, setSplashSloganInput] = useState(settings.splashSlogan || 'أهلاً بكم في أرقى تجربة ضيافة');
  const [splashSavedMsg, setSplashSavedMsg] = useState(false);

  const handleSaveIdentity = () => {
    setSettings(prev => ({ ...prev, systemName: systemNameInput, systemNameEn: systemNameEnInput }));
    setIdentitySavedMsg(true);
    setTimeout(() => setIdentitySavedMsg(false), 3000);
  };
  
  const handleSaveSplashSlogan = () => {
    setSettings(prev => ({ ...prev, splashSlogan: splashSloganInput }));
    setSplashSavedMsg(true);
    setTimeout(() => setSplashSavedMsg(false), 3000);
  };

  // Settings inputs
  const [taxEnabledInput, setTaxEnabledInput] = useState(settings.taxEnabled ?? true);
  const [taxRateInput, setTaxRateInput] = useState(settings.taxRate ?? 14);
  const [profitMarginInput, setProfitMarginInput] = useState(settings.profitMargin ?? 65);
  const [currencyInput, setCurrencyInput] = useState(settings.currencySymbol || 'ج.م');
  const [financialSavedMsg, setFinancialSavedMsg] = useState(false);

  // Browser Tab Title and Favicon Branding inputs
  const [adminPageTitleInput, setAdminPageTitleInput] = useState(settings.adminPageTitle || `لوحة الإدارة والتحكم - ${settings.systemName || 'Smart Café'}`);
  const [adminFaviconInput, setAdminFaviconInput] = useState(settings.adminFaviconUrl || settings.logoUrl || '');
  const [menuPageTitleInput, setMenuPageTitleInput] = useState(settings.menuPageTitle || settings.customBrowserTitle || `${settings.systemName || 'Smart Café'} - المنيو الإلكتروني`);
  const [menuFaviconInput, setMenuFaviconInput] = useState(settings.menuFaviconUrl || settings.customFaviconUrl || settings.logoUrl || '');
  const [browserBrandSavedMsg, setBrowserBrandSavedMsg] = useState(false);
  const [isUploadingAdminFavicon, setIsUploadingAdminFavicon] = useState(false);
  const [isUploadingMenuFavicon, setIsUploadingMenuFavicon] = useState(false);
  const adminFaviconFileRef = useRef<HTMLInputElement>(null);
  const menuFaviconFileRef = useRef<HTMLInputElement>(null);

  // Developer Signature Inputs
  const [developerNameInput, setDeveloperNameInput] = useState(settings.developerRights?.developerName || 'المطور المسئول');
  const [developerWhatsAppInput, setDeveloperWhatsAppInput] = useState(settings.developerRights?.developerWhatsApp || '');
  const [copyrightTextInput, setCopyrightTextInput] = useState(settings.developerRights?.copyrightText || '');
  const [developerSavedMsg, setDeveloperSavedMsg] = useState(false);

  // Keep state in sync with external settings updates
  useEffect(() => {
    if (settings.systemName !== undefined) setSystemNameInput(settings.systemName);
    if (settings.systemNameEn !== undefined) setSystemNameEnInput(settings.systemNameEn || '');
    if (settings.splashSlogan !== undefined) setSplashSloganInput(settings.splashSlogan);
    if (settings.taxEnabled !== undefined) setTaxEnabledInput(settings.taxEnabled);
    if (settings.taxRate !== undefined) setTaxRateInput(settings.taxRate);
    if (settings.profitMargin !== undefined) setProfitMarginInput(settings.profitMargin);
    if (settings.currencySymbol !== undefined) setCurrencyInput(settings.currencySymbol);
  }, [
    settings.systemName,
    settings.systemNameEn,
    settings.splashSlogan,
    settings.taxEnabled,
    settings.taxRate,
    settings.profitMargin,
    settings.currencySymbol
  ]);

  useEffect(() => {
    if (settings.adminPageTitle !== undefined) setAdminPageTitleInput(settings.adminPageTitle);
    if (settings.adminFaviconUrl !== undefined) setAdminFaviconInput(settings.adminFaviconUrl || settings.logoUrl || '');
    if (settings.menuPageTitle !== undefined) setMenuPageTitleInput(settings.menuPageTitle);
    if (settings.menuFaviconUrl !== undefined) setMenuFaviconInput(settings.menuFaviconUrl || settings.logoUrl || '');
  }, [settings.adminPageTitle, settings.adminFaviconUrl, settings.menuPageTitle, settings.menuFaviconUrl, settings.logoUrl]);

  useEffect(() => {
    if (settings.developerRights) {
      if (settings.developerRights.developerName !== undefined) setDeveloperNameInput(settings.developerRights.developerName);
      if (settings.developerRights.developerWhatsApp !== undefined) setDeveloperWhatsAppInput(settings.developerRights.developerWhatsApp);
      if (settings.developerRights.copyrightText !== undefined) setCopyrightTextInput(settings.developerRights.copyrightText);
    }
  }, [settings.developerRights]);

  useEffect(() => {
    if (settings.developerPassword !== undefined) {
      setNewDevPassword(settings.developerPassword);
    }
  }, [settings.developerPassword]);

  const handleSaveBrowserBrand = () => {
    const trimmedAdminTitle = adminPageTitleInput.trim() || `لوحة الإدارة - ${settings.systemName || 'Smart Café'}`;
    const trimmedAdminFavicon = adminFaviconInput.trim() || settings.logoUrl;
    const trimmedMenuTitle = menuPageTitleInput.trim() || `${settings.systemName || 'Smart Café'} - المنيو الإلكتروني`;
    const trimmedMenuFavicon = menuFaviconInput.trim() || settings.logoUrl;

    setSettings(prev => ({
      ...prev,
      adminPageTitle: trimmedAdminTitle,
      adminFaviconUrl: trimmedAdminFavicon,
      menuPageTitle: trimmedMenuTitle,
      menuFaviconUrl: trimmedMenuFavicon,
      customBrowserTitle: trimmedMenuTitle,
      customFaviconUrl: trimmedMenuFavicon
    }));


    setBrowserBrandSavedMsg(true);
    setTimeout(() => setBrowserBrandSavedMsg(false), 3000);
    if (addSystemLog) {
      addSystemLog('settings', 'info', 'تم تحديث أيقونات وعناوين المتصفح لصفحة الأدمن والمنيو الإلكتروني');
    }
  };

  const handleAdminFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAdminFavicon(true);
    try {
      const base64 = await compressAndResizeImage(file, 256);
      setAdminFaviconInput(base64);
    } catch (err) {
      console.error('Error processing admin favicon image', err);
      alert('حدث خطأ أثناء معالجة صورة الأيقونة');
    } finally {
      setIsUploadingAdminFavicon(false);
    }
  };

  const handleMenuFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingMenuFavicon(true);
    try {
      const base64 = await compressAndResizeImage(file, 256);
      setMenuFaviconInput(base64);
    } catch (err) {
      console.error('Error processing menu favicon image', err);
      alert('حدث خطأ أثناء معالجة صورة الأيقونة');
    } finally {
      setIsUploadingMenuFavicon(false);
    }
  };

  // File upload refs
  const audioInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const catImgInputRef = useRef<HTMLInputElement>(null);
  const editCatImgInputRef = useRef<HTMLInputElement>(null);
  const itemImgInputRef = useRef<HTMLInputElement>(null);
  const editItemImgInputRef = useRef<HTMLInputElement>(null);
  const botAvatarInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const [isUploadingBotAvatar, setIsUploadingBotAvatar] = useState(false);
  const [backupRestoreMsg, setBackupRestoreMsg] = useState<string | null>(null);
  const [backupExportMsg, setBackupExportMsg] = useState<string | null>(null);
  const [analyticsDayFilter, setAnalyticsDayFilter] = useState<number>(-1);

  // Thermal Print State
  const [printableOrder, setPrintableOrder] = useState<Order | null>(null);
  const [printableTableBill, setPrintableTableBill] = useState<{ 
    tableNumber: number; 
    orders: Order[]; 
    items?: Array<{ name: string; nameEn?: string; quantity: number; price: number }>;
    subtotal: number;
    tax?: number;
    discount?: number;
    total: number;
  } | null>(null);
  const [printableQRStands, setPrintableQRStands] = useState<TableInfo[] | null>(null);
  const [showBatchTableModal, setShowBatchTableModal] = useState(false);
  const [batchTableCountInput, setBatchTableCountInput] = useState<number>(5);

  const printThermalOrder = (order: Order) => {
    setPrintableOrder(order);
    setPrintableTableBill(null);
    setPrintableQRStands(null);
    setTimeout(() => window.print(), 250);
  };

  const printThermalTable = (tNum: number) => {
    const tableInfo = tables.find(t => Number(t.tableNumber) === Number(tNum));
    const tableOrders = (tableInfo && tableInfo.status === 'available')
      ? []
      : safeOrders.filter(o => Number(o.tableNumber) === Number(tNum) && o.status !== 'completed' && o.status !== 'cancelled');
    const total = tableOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    const itemMap = new Map<string, { name: string; nameEn?: string; quantity: number; price: number }>();
    tableOrders.forEach(ord => {
      (ord.items || []).forEach((ci, idx) => {
        const id = ci?.menuItem?.id || (ci as any)?.menuItemId || (ci as any)?.id || `item_${idx}`;
        const name = ci?.menuItem?.name || (ci as any)?.name || 'صنف';
        const nameEn = ci?.menuItem?.nameEn || (ci as any)?.nameEn || '';
        const price = ci?.menuItem?.price ?? (ci as any)?.price ?? 0;
        const quantity = ci?.quantity || 1;
        const existing = itemMap.get(id);
        if (existing) {
          existing.quantity += quantity;
        } else {
          itemMap.set(id, {
            name,
            nameEn,
            quantity,
            price
          });
        }
      });
    });

    const items = Array.from(itemMap.values());
    const subtotal = items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
    const isTaxActive = settings.taxEnabled !== false && (settings.taxRate ?? 0) > 0;
    const tax = isTaxActive ? Math.round((subtotal * (settings.taxRate ?? 0)) / 100) : 0;

    setPrintableTableBill({ 
      tableNumber: tNum, 
      orders: tableOrders, 
      items,
      subtotal,
      tax,
      total 
    });
    setPrintableOrder(null);
    setPrintableQRStands(null);
    setTimeout(() => window.print(), 250);
  };

  const printAllQRStands = () => {
    const filteredTables = tables.filter(t => Number(t.tableNumber) !== 0);
    setPrintableQRStands(filteredTables);
    setPrintableOrder(null);
    setPrintableTableBill(null);
    setTimeout(() => window.print(), 250);
  };

  const handleAddBatchTables = (count: number) => {
    if (count <= 0) return;
    setTables(prev => {
      const existingNums = new Set(prev.map(t => t.tableNumber));
      const newTables: TableInfo[] = [...prev];
      let current = 1;
      let added = 0;
      while (added < count) {
        if (!existingNums.has(current)) {
          newTables.push({ tableNumber: current, status: 'available' });
          existingNums.add(current);
          added++;
        }
        current++;
      }
      return newTables.sort((a, b) => a.tableNumber - b.tableNumber);
    });
  };

  // Export Data Backup
  const handleExportBackup = () => {
    try {
      const backupData = {
        categories,
        menuItems,
        orders,
        tables,
        settings,
        chatbotSettings,
        chatbotQAs,
        customers,
        banners,
        popupAd,
        coupons,
        exportTimestamp: Date.now(),
        version: '1.0'
      };
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `coffee_shop_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      addSystemLog?.('system', 'info', 'تم تصدير نسخة احتياطية من بيانات النظام بنجاح', undefined, 'المدير');
      alert('تم تصدير وحفظ نسخة الاحتياط لبيانات النظام بنجاح!');
    } catch (err) {
      console.error(err);
      alert('فشل تصدير البيانات الاحتياطية. يرجى المحاولة مرة أخرى.');
    }
  };

  // Import Data Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json || typeof json !== 'object') {
          throw new Error('ملف غير صالح');
        }
        
        if (json.categories) setCategories(json.categories);
        if (json.menuItems) setMenuItems(json.menuItems);
        if (json.orders) setOrders(json.orders);
        if (json.tables) setTables(json.tables);
        if (json.settings) setSettings(json.settings);
        if (json.customers && setCustomers) setCustomers(json.customers);
        if (json.banners) setBanners(json.banners);
        if (json.popupAd) setPopupAd(json.popupAd);
        if (json.coupons && setCoupons) setCoupons(json.coupons);
        
        addSystemLog?.('system', 'warning', 'تم استعادة نسخة احتياطية لبيانات النظام بنجاح', undefined, 'المدير');
        alert('🎉 تم استيراد واستعادة نسخة البيانات الاحتياطية للسيستم بنجاح تام! تم تحديث كافة الأقسام والمبيعات والمنيو.');
      } catch (err) {
        console.error(err);
        alert('❌ خطأ: لم نتمكن من قراءة ملف النسخة الاحتياطية. يرجى التأكد من اختيار ملف .json صحيح تم تصديره مسبقاً من هذا النظام.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Clean data reset & replacement handler
  const handleResetAllDataClean = async () => {
    const confirmReset = window.confirm(
      '⚠️ هل أنت متأكد من رغبتك في تبديل وإعادة ضبط البيانات للوضع النظيف والصحيح؟\n\n' +
      '• سيتم تفريغ كافة الطلبات القديمة والمعلقة والبدء من الصفر.\n' +
      '• سيتم تحرير جميع الطاولات وجعلها متاحة بدون جلسات أو أجهزة معلقة.\n' +
      '• سيتم تثبيت هيكل البيانات النظيف على السيرفر والسحابة.\n\n' +
      'هل تود المتابعة؟'
    );
    if (!confirmReset) return;

    try {
      if (clearAllOrders) {
        await clearAllOrders();
      }
      await fetch('/api/reset-data', { method: 'POST' });
      setOrders([]);
      if (setBillRequests) setBillRequests([]);
      const freshTables: TableInfo[] = Array.from({ length: 12 }, (_, i) => ({
        tableNumber: i + 1,
        name: `طاولة ${i + 1}`,
        capacity: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
        section: i < 4 ? 'الصالة الرئيسية' : i < 8 ? 'التراس الخارجي' : 'قسم العائلات VIP',
        status: 'available'
      }));
      setTables(freshTables);

      try {
        localStorage.removeItem('smart_menu_orders');
        localStorage.removeItem('smart_menu_sync_orders');
        localStorage.removeItem('smart_menu_orders_vault_v1');
        localStorage.removeItem('smart_menu_deleted_order_ids_v1');
        localStorage.removeItem('smart_orders_vault');
        localStorage.removeItem('smart_menu_tables');
        localStorage.removeItem('smart_menu_sync_tables');
        localStorage.removeItem('smart_menu_sync_bill_requests');
      } catch (e) {}

      addSystemLog?.('system', 'success', 'تم تبديل وإعادة تهيئة بيانات النظام بنجاح', undefined, 'المدير');
      alert('✅ تم تبديل وإعادة تهيئة البيانات بنجاح تام!\nالسيستم الآن في وضع نظيف تماماً وخالٍ من أي تعليق، وجاهز للعمل واستقبال الطلبات فوراً.');
    } catch (e) {
      console.error('Error resetting data:', e);
      alert('حدث خطأ أثناء محاولة تهيئة البيانات.');
    }
  };

  // Clear all orders and reset statistics completely
  const handleClearAllOrdersAndStats = async (isFromStats = false) => {
    const confirmMessage = isFromStats 
      ? 'هل أنت متأكد من مسح وتصفير كافة إحصائيات المبيعات والأرباح والطلبات؟\n\n' +
        '• سيتم تفريغ كافة سجلات وبيانات الطلبات السابقة والحالية.\n' +
        '• ستعود أرقام الإحصائيات والأرباح لليوم والشهر إلى الصفر.\n' +
        '• لا يمكن التراجع عن هذه الخطوة.\n\n' +
        'هل تود المتابعة وتصفير الإحصائيات الآن؟'
      : 'هل أنت متأكد من حذف وتفريغ كافة بيانات وسجلات الطلبات؟\n\n' +
        '• سيتم مسح قائمة الطلبات النشطة والأرشيف بالكامل.\n' +
        '• سيتم تصفير الإحصائيات المرتبطة بالطلبات لتبدأ من الصفر.\n' +
        '• لا يمكن التراجع عن هذه العملية.\n\n' +
        'هل تود المتابعة ومسح بيانات الطلبات؟';

    if (!window.confirm(confirmMessage)) return;

    try {
      if (clearAllOrders) {
        await clearAllOrders();
      } else {
        setOrders([]);
        if (setBillRequests) setBillRequests([]);
        try {
          localStorage.removeItem('smart_menu_orders_vault_v1');
          localStorage.removeItem('smart_menu_deleted_order_ids_v1');
          localStorage.removeItem('smart_menu_sync_orders');
          localStorage.removeItem('smart_orders_vault');
          localStorage.removeItem('smart_menu_orders');
          localStorage.removeItem('smart_menu_sync_bill_requests');
        } catch (e) {}
        try {
          await fetch('/api/orders/clear', { method: 'POST' });
        } catch (err) {}
      }

      addSystemLog?.(
        'orders',
        'warning',
        isFromStats ? 'تم تصفير ومسح كافة إحصائيات المبيعات والطلبات' : 'تم حذف وتفريغ كافة بيانات الطلبات من النظام',
        'تم مسح وتصفير سجلات الطلبات من التخزين وقاعدة البيانات',
        'المدير'
      );

      alert(isFromStats ? '✅ تم مسح وتصفير كافة الإحصائيات وسجلات الطلبات بنجاح!' : '✅ تم حذف وتفريغ كافة بيانات الطلبات بنجاح!');
    } catch (err) {
      console.error('Error clearing orders and stats:', err);
      alert('حدث خطأ أثناء محاولة مسح البيانات.');
    }
  };

  // Order status transitions (API-driven with optimistic lock)
  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const targetOrder = orders.find(o => o.id === orderId);
    const nowIso = new Date().toISOString();

    if (targetOrder) {
      const tableNum = targetOrder.tableNumber;
      if (status === 'delivered') {
        setTables(tPrev => tPrev.map(t => {
          if (Number(t.tableNumber) === Number(tableNum)) {
            return { ...t, tableDelivered: true, deliveredAt: nowIso };
          }
          return t;
        }));
      } else if (status === 'completed' || status === 'cancelled') {
        const remainingActive = orders.filter(o => o.id !== orderId && Number(o.tableNumber) === Number(tableNum) && (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready' || o.status === 'delivered'));
        if (remainingActive.length === 0) {
          setTables(tPrev => tPrev.map(t => {
            if (Number(t.tableNumber) === Number(tableNum)) {
              if (t.billRequested || t.status === 'bill_requested') {
                return t;
              }
              return { 
                ...t, 
                status: 'available',
                activeSessionDeviceId: undefined, 
                lastActiveHeartbeat: undefined,
                tableDelivered: false,
                deliveredAt: undefined,
                sessionTransferRequest: undefined,
                billRequested: false,
                billRequestedAt: undefined
              };
            }
            return t;
          }));
        }
      }
    }

    if (updateOrderStatus) {
      await updateOrderStatus(orderId, status);
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      }).catch(() => {});
    }
  };

  const handlePlaceManualOrder = async (newOrder: Order): Promise<boolean> => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.orders)) {
          if (mergeIncomingOrders) {
            mergeIncomingOrders(json.orders, { senderId: 'manual-admin' });
          } else {
            setOrders(json.orders);
          }
        }
        if (json && Array.isArray(json.tables)) {
          setTables(json.tables);
        }
        return true;
      }
    } catch (e) {
      console.error('Failed to post manual order:', e);
    }
    return false;
  };

  // Table recognition & management
  const handleAddTable = () => {
    fetch('/api/tables/add', {
      method: 'POST'
    })
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.tables)) {
          setTables(json.tables);
          handleTriggerSaveToast('تم إضافة الطاولة الجديدة وحفظها بنجاح!');
        }
      })
      .catch(() => {});
  };

  const handleDeleteTable = (tNum: number) => {
    if (confirm(`تأكيد حذف طاولة رقم (${tNum}) من النظام؟`)) {
      fetch('/api/tables/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNumber: tNum })
      })
        .then(res => res.json())
        .then(json => {
          if (json.success && Array.isArray(json.tables)) {
            setTables(json.tables);
            handleTriggerSaveToast('تم حذف الطاولة وحفظ التعديل بنجاح!');
          }
        })
        .catch(() => {});
    }
  };

  // Coupon CRUD Handler Functions
  const handleSaveCoupon = () => {
    setCouponErrorMsg(null);
    setCouponSuccessMsg(null);

    if (!newCouponCode.trim()) {
      setCouponErrorMsg(currentLang === 'en' ? 'Coupon code is required' : 'يرجى إدخال رمز الكوبون');
      return;
    }
    const valNum = parseFloat(newCouponValue);
    if (isNaN(valNum) || valNum <= 0) {
      setCouponErrorMsg(currentLang === 'en' ? 'Discount value must be a positive number' : 'قيمة الخصم يجب أن تكون رقم أكبر من الصفر');
      return;
    }
    if (newCouponType === 'percentage' && valNum > 100) {
      setCouponErrorMsg(currentLang === 'en' ? 'Percentage discount cannot exceed 100%' : 'النسبة المئوية للخصم لا يمكن أن تتجاوز 100%');
      return;
    }

    const minOrder = newCouponMinOrder.trim() ? parseFloat(newCouponMinOrder) : undefined;
    const maxDiscount = newCouponMaxDiscount.trim() ? parseFloat(newCouponMaxDiscount) : undefined;
    const maxUses = newCouponMaxUses.trim() ? parseInt(newCouponMaxUses) : undefined;
    const expiresAt = newCouponExpiresAt.trim() ? new Date(newCouponExpiresAt).toISOString() : undefined;

    if (setCoupons) {
      setCoupons(prev => {
        if (editingCouponId) {
          // Edit mode
          return prev.map(c => c.id === editingCouponId ? {
            ...c,
            code: newCouponCode.trim().toUpperCase(),
            discountType: newCouponType,
            discountValue: valNum,
            minOrderAmount: minOrder,
            maxDiscountAmount: maxDiscount,
            maxUses,
            expiresAt,
            active: newCouponActive
          } : c);
        } else {
          // Create mode
          const exists = prev.some(c => c.code.toUpperCase() === newCouponCode.trim().toUpperCase());
          if (exists) {
            setCouponErrorMsg(currentLang === 'en' ? 'Coupon code already exists' : 'رمز الكوبون هذا موجود مسبقاً');
            return prev;
          }
          const newC: Coupon = {
            id: `coup-${Date.now()}`,
            code: newCouponCode.trim().toUpperCase(),
            discountType: newCouponType,
            discountValue: valNum,
            minOrderAmount: minOrder,
            maxDiscountAmount: maxDiscount,
            maxUses,
            expiresAt,
            active: newCouponActive,
            usageCount: 0
          };
          return [...prev, newC];
        }
      });

      setCouponSuccessMsg(
        editingCouponId 
          ? (currentLang === 'en' ? 'Coupon updated successfully!' : 'تم تحديث الكوبون بنجاح!')
          : (currentLang === 'en' ? 'Coupon created successfully!' : 'تم إنشاء الكوبون بنجاح!')
      );
      
      // Clear form
      setNewCouponCode('');
      setNewCouponType('percentage');
      setNewCouponValue('');
      setNewCouponMinOrder('');
      setNewCouponMaxDiscount('');
      setNewCouponMaxUses('');
      setNewCouponExpiresAt('');
      setNewCouponActive(true);
      setEditingCouponId(null);
      
      setTimeout(() => setCouponSuccessMsg(null), 4000);
    }
  };

  const handleEditCouponClick = (coupon: Coupon) => {
    setEditingCouponId(coupon.id);
    setNewCouponCode(coupon.code);
    setNewCouponType(coupon.discountType);
    setNewCouponValue(coupon.discountValue.toString());
    setNewCouponMinOrder(coupon.minOrderAmount?.toString() || '');
    setNewCouponMaxDiscount(coupon.maxDiscountAmount?.toString() || '');
    setNewCouponMaxUses(coupon.maxUses?.toString() || '');
    setNewCouponExpiresAt(coupon.expiresAt ? coupon.expiresAt.substring(0, 16) : '');
    setNewCouponActive(coupon.active);
    setCouponErrorMsg(null);
    setCouponSuccessMsg(null);
  };

  const handleDeleteCoupon = (couponId: string) => {
    if (confirm(currentLang === 'en' ? 'Are you sure you want to delete this coupon?' : 'هل أنت متأكد من حذف هذا الكوبون؟')) {
      if (setCoupons) {
        setCoupons(prev => prev.filter(c => c.id !== couponId));
        setCouponSuccessMsg(currentLang === 'en' ? 'Coupon deleted' : 'تم حذف الكوبون بنجاح');
        setTimeout(() => setCouponSuccessMsg(null), 3000);
      }
    }
  };

  const handleCancelEditCoupon = () => {
    setEditingCouponId(null);
    setNewCouponCode('');
    setNewCouponType('percentage');
    setNewCouponValue('');
    setNewCouponMinOrder('');
    setNewCouponMaxDiscount('');
    setNewCouponMaxUses('');
    setNewCouponExpiresAt('');
    setNewCouponActive(true);
    setCouponErrorMsg(null);
  };

  // Chatbot Admin tab state
  const [newBotQuestion, setNewBotQuestion] = useState('');
  const [newBotReply, setNewBotReply] = useState('');
  const [editingQAId, setEditingQAId] = useState<string | null>(null);
  const [chatPreviewHistory, setChatPreviewHistory] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    { sender: 'bot', text: chatbotSettings?.welcomeMessage || 'أهلاً بك! كيف يمكنني مساعدتك اليوم؟' }
  ]);
  const [chatPreviewInput, setChatPreviewInput] = useState('');

  // Live timer tick for real-time sitting duration updates
  const [currentTick, setCurrentTick] = useState(Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTick(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const getSittingDurationInfo = (table: TableInfo) => {
    const startTimeStr = table.firstOrderAt || table.seatedAt;
    if (!startTimeStr || table.status === 'available') return null;
    const startTime = new Date(startTimeStr).getTime();
    if (isNaN(startTime)) return null;
    const diffMs = Math.max(0, currentTick - startTime);
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    let durationText = '';
    if (hours > 0) {
      durationText = `${hours} س و ${mins} د`;
    } else {
      durationText = `${mins} دقيقة`;
    }

    let badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    if (totalMinutes >= 90) {
      badgeClass = 'bg-rose-100 text-rose-900 border-rose-400 animate-pulse';
    } else if (totalMinutes >= 45) {
      badgeClass = 'bg-amber-100 text-amber-900 border-amber-400';
    }

    return { totalMinutes, durationText, badgeClass };
  };

  const handleToggleItemPopular = (itemId: string) => {
    setMenuItems(prev => prev.map(m => m.id === itemId ? { ...m, isPopular: !m.isPopular } : m));
  };

  const handleUnlockTableSession = (tNum: number) => {
    fetch('/api/tables/release-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableNumber: tNum })
    }).catch(() => {});

    setTables(prev => prev.map(t => {
      if (t.tableNumber === tNum) {
        return {
          ...t,
          activeSessionDeviceId: undefined,
          activeSessionCustomerName: undefined,
          lastActiveHeartbeat: undefined
        };
      }
      return t;
    }));
    alert(`تم فك قفل الجلسة لهاتف طاولة (${tNum}) بنجاح.`);
  };

  const handleFreeUpTable = (tNum: number) => {
    fetch('/api/tables/release-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableNumber: tNum })
    }).catch(() => {});

    setTables(prev => prev.map(t => {
      if (Number(t.tableNumber) === Number(tNum)) {
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
          sessionTransferRequest: undefined
        };
      }
      return t;
    }));
    // Also mark active orders for this table as completed and settled
    setOrders(prev => prev.map(o => {
      if (Number(o.tableNumber) === Number(tNum) && o.status !== 'cancelled' && !(o as any).settled) {
        return { ...o, status: 'completed', checkSent: true, settled: true } as any;
      }
      return o;
    }));

    if (setBillRequests) {
      setBillRequests(prev => prev.map(b => 
        Number(b.tableNumber) === Number(tNum) && b.status !== 'settled'
          ? { ...b, status: 'settled', settledAt: new Date().toISOString() }
          : b
      ));
    }
  };

  // Action: Deliver Table & its active orders
  const handleDeliverTable = (tNum: number) => {
    const nowIso = new Date().toISOString();
    setTables(prev => prev.map(t => {
      if (Number(t.tableNumber) === Number(tNum)) {
        return {
          ...t,
          tableDelivered: true,
          deliveredAt: nowIso
        };
      }
      return t;
    }));

    setOrders(prev => prev.map(o => {
      if (Number(o.tableNumber) === Number(tNum) && (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready')) {
        return { ...o, status: 'delivered', deliveredAt: nowIso };
      }
      return o;
    }));

    safeAddSystemLog(
      'tables',
      'success',
      `${Number(tNum) === 0 ? "تم تسليم طلب التيك أواي" : `تم تسليم طلبات طاولة رقم ${tNum}`} للعميل بنجاح`,
      `تم نقل الطلبات إلى مرحلة (تم التسليم للطاولة)`,
      `الكاشير / الإدارة`,
      `Table #${tNum} marked delivered`
    );
  };

  // Takeaway Action: Complete Order & Release Takeaway Session
  const handleCompleteTakeawayOrder = (orderId: string) => {
    const nowIso = new Date().toISOString();
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed', deliveredAt: nowIso, billRequested: false } : o));
    
    fetch('/api/tables/release-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableNumber: 0 })
    }).catch(() => {});

    setTables(prev => prev.map(t => Number(t.tableNumber) === 0 ? {
      ...t,
      status: 'available',
      currentOrderId: undefined,
      activeSessionCustomerName: undefined,
      activeSessionDeviceId: undefined,
      seatedAt: undefined,
      firstOrderAt: undefined,
      billRequested: false,
      billRequestedAt: undefined
    } : t));

    if (setBillRequests) {
      setBillRequests(prev => prev.filter(b => Number(b.tableNumber) !== 0));
    }

    safeAddSystemLog(
      'orders',
      'success',
      `تم تسليم طلب التيك أواي وإغلاق الجلسة بنجاح`,
      `تم استلام قيمة الطلب وتسليمه للعميل وإغلاق جلسة التيك أواي بالكامل ✓`,
      `الكاشير / الإدارة`,
      `Takeaway order ${orderId} completed & closed`
    );
  };
  const handleSettleAndSendCheck = (tNum: number) => {
    handleFreeUpTable(tNum);
    safeAddSystemLog(
      'orders',
      'success',
      `تمت تصفية وإرسال الشيك ${Number(tNum) === 0 ? "لتيك أواي" : `طاولة رقم ${tNum}`}`,
      `تم إغلاق الحساب وتحصيل المبلغ وتفريغ الطاولة بالكامل للزبائن الجدد`,
      `الكاشير / الإدارة`,
      `Table #${tNum} check settled & released`
    );
  };

  // Batch Settlement: Free up and close all tables at the end of the day
  const handleBatchSettlement = () => {
    if (confirm('تأكيد التسوية الجماعية؟ سيتم تسوية وإغلاق كافة الجلسات وتفريغ جميع الطاولات لتصبح متاحة فوراً.')) {
      fetch('/api/tables/release-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      }).catch(() => {});

      setTables(prev => prev.map(t => ({
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
        sessionTransferRequest: undefined
      })));
      setOrders(prev => prev.map(o => {
        if (o.status !== 'completed' && o.status !== 'cancelled') {
          return { ...o, status: 'completed' };
        }
        return o;
      }));
      if (setBillRequests) {
        setBillRequests(prev => prev.map(b => ({ ...b, status: 'settled', settledAt: new Date().toISOString() })));
      }
      alert('تمت التسوية الجماعية وتفريغ كافة الطاولات بنجاح!');
    }
  };

  // System Data Backup (Export to JSON)
  const handleRestoreDefaultMenu = async () => {
    if (confirm('هل تريد استعادة واستراد المنيو والقوائم والأصناف الافتراضية كاملة (21 قسم و 180+ صنف)؟')) {
      try {
        const res = await fetch('/api/restore-default-menu', { method: 'POST' });
        if (res.ok) {
          const json = await res.json();
          alert(json.message || 'تمت استعادة كافة بيانات المنيو الافتراضية بنجاح!');
          window.location.reload();
        } else {
          alert('حدث خطأ أثناء استعادة البيانات');
        }
      } catch (err) {
        alert('تعذر الاتصال بالسيرفر');
      }
    }
  };

  const handleExportSystemBackup = () => {
    try {
      const backupData = {
        version: '1.0',
        systemName: settings.systemName || 'Restaurant POS',
        exportedAt: new Date().toISOString(),
        categories,
        menuItems,
        orders,
        tables,
        customers,
        banners,
        popupAd,
        settings,
        coupons
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.href = url;
      downloadAnchor.download = `restaurant_backup_${dateStr}.json`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);

      setBackupExportMsg('تم تصدير وحفظ نسخة بيانات النظام بنجاح!');
      setTimeout(() => setBackupExportMsg(null), 4000);

      safeAddSystemLog(
        'settings',
        'success',
        'تم تصدير وحفظ نسخة احتياطية من بيانات النظام بنجاح (JSON)',
        'تم حفظ ملف JSON متكامل يحتوي على كافة القوائم والطلبات والإعدادات وسجلات المطعم',
        'الإدارة',
        'System backup exported successfully'
      );
    } catch (err) {
      console.error('Export error:', err);
      alert('حدث خطأ أثناء تصدير النسخة الاحتياطية');
    }
  };

  // System Data Restore (Import from JSON)
  const handleImportSystemBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        if (!data || typeof data !== 'object') {
          throw new Error('الملف لا يحتوي على صيغة JSON صالحة');
        }

        if (confirm(`تأكيد استعادة النسخة الاحتياطية من الملف (${file.name})؟\nسيتم تحديث كافة بيانات القوائم والطلبات والإعدادات بالبيانات المحفوظة في هذا الملف.`)) {
          if (Array.isArray(data.categories)) setCategories(data.categories);
          if (Array.isArray(data.menuItems)) setMenuItems(data.menuItems);
          if (Array.isArray(data.orders)) setOrders(data.orders);
          if (Array.isArray(data.tables)) setTables(data.tables);
          if (Array.isArray(data.customers) && setCustomers) setCustomers(data.customers);
          if (Array.isArray(data.banners)) setBanners(data.banners);
          if (data.popupAd !== undefined) setPopupAd(data.popupAd);
          if (data.settings && typeof data.settings === 'object') setSettings(data.settings);
          if (Array.isArray(data.coupons) && setCoupons) setCoupons(data.coupons);

          setBackupRestoreMsg('تمت استعادة كافة بيانات النظام بنجاح من النسخة الاحتياطية!');
          setTimeout(() => setBackupRestoreMsg(null), 5000);

          safeAddSystemLog(
            'settings',
            'warning',
            'تمت استعادة بيانات النظام من نسخة احتياطية JSON',
            `تم بنجاح تحديث بيانات القوائم والإعدادات والطلبات من الملف: ${file.name}`,
            'الإدارة',
            'System data restored from backup'
          );
        }
      } catch (err: any) {
        alert('فشل استيراد النسخة الاحتياطية: ' + (err?.message || 'الملف غير صالح'));
      }
      if (backupFileInputRef.current) backupFileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // Category file upload
  const handleCatImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCatImg(true);
    try {
      const base64 = await compressAndResizeImage(file, 800);
      setNewCatImage(base64);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء معالجة الصورة، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsUploadingCatImg(false);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const maxOrder = categories.reduce((max, c) => Math.max(max, typeof c.order === 'number' ? c.order : 0), 0);

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      nameEn: newCatNameEn.trim() || undefined,
      description: newCatDesc.trim() || 'تشكيلة مختارة بعناية',
      descriptionEn: newCatDescEn.trim() || undefined,
      icon: 'Coffee',
      image: newCatImage.trim() || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
      order: maxOrder + 1,
      scheduleEnabled: newCatScheduleEnabled,
      scheduleStartTime: newCatScheduleEnabled ? newCatScheduleStartTime : undefined,
      scheduleEndTime: newCatScheduleEnabled ? newCatScheduleEndTime : undefined,
      scheduleAction: newCatScheduleEnabled ? newCatScheduleAction : undefined
    };

    setCategories([...categories, newCat]);
    setNewCatName('');
    setNewCatNameEn('');
    setNewCatDesc('');
    setNewCatDescEn('');
    setNewCatImage('');
    setNewCatScheduleEnabled(false);
    setNewCatScheduleStartTime('07:00');
    setNewCatScheduleEndTime('12:00');
    setNewCatScheduleAction('pin_top');
    setShowAddCatModal(false);
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setEditCatName(cat.name || '');
    setEditCatNameEn(cat.nameEn || '');
    setEditCatDesc(cat.description || '');
    setEditCatDescEn(cat.descriptionEn || '');
    setEditCatImage(cat.image || '');
    setEditCatScheduleEnabled(Boolean(cat.scheduleEnabled));
    setEditCatScheduleStartTime(cat.scheduleStartTime || '07:00');
    setEditCatScheduleEndTime(cat.scheduleEndTime || '12:00');
    setEditCatScheduleAction((cat.scheduleAction === 'hide_outside') ? 'hide_outside' : 'pin_top');
  };

  const handleEditCatImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingEditCatImg(true);
    try {
      const base64 = await compressAndResizeImage(file, 800);
      setEditCatImage(base64);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء معالجة الصورة، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsUploadingEditCatImg(false);
    }
  };

  const handleUpdateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCatName.trim()) return;

    setCategories(prev => prev.map(c => {
      if (c.id === editingCategory.id) {
        return {
          ...c,
          name: editCatName.trim(),
          nameEn: editCatNameEn.trim() || undefined,
          description: editCatDesc.trim(),
          descriptionEn: editCatDescEn.trim() || undefined,
          image: editCatImage.trim() || c.image,
          scheduleEnabled: editCatScheduleEnabled,
          scheduleStartTime: editCatScheduleEnabled ? editCatScheduleStartTime : undefined,
          scheduleEndTime: editCatScheduleEnabled ? editCatScheduleEndTime : undefined,
          scheduleAction: editCatScheduleEnabled ? editCatScheduleAction : undefined
        };
      }
      return c;
    }));

    setEditingCategory(null);
  };

  const handleMoveCategory = (catId: string, direction: 'up' | 'down') => {
    setCategories(prev => {
      const sorted = [...prev].sort((a, b) => {
        const oA = typeof a.order === 'number' ? a.order : 0;
        const oB = typeof b.order === 'number' ? b.order : 0;
        return oA - oB;
      });

      const idx = sorted.findIndex(c => c.id === catId);
      if (idx === -1) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === sorted.length - 1) return prev;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      const temp = sorted[idx];
      sorted[idx] = sorted[targetIdx];
      sorted[targetIdx] = temp;

      // Re-assign contiguous order indices
      return sorted.map((cat, i) => ({
        ...cat,
        order: i + 1
      }));
    });
  };

  const handleDeleteCategory = (catId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا القسم وكافة أصنافه؟')) {
      setCategories(prev => prev.filter(c => c.id !== catId));
      setMenuItems(prev => prev.filter(m => m.categoryId !== catId));
      if (managingCategoryId === catId) setManagingCategoryId(null);
    }
  };

  // Item file upload
  const handleItemImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingItemImg(true);
    try {
      const base64 = await compressAndResizeImage(file, 800);
      setNewItemImage(base64);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء معالجة الصورة');
    } finally {
      setIsUploadingItemImg(false);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingCategoryId || !newItemName.trim() || !newItemPrice) return;

    const newItem: MenuItem = {
      id: `item-${Date.now()}`,
      categoryId: managingCategoryId,
      name: newItemName.trim(),
      nameEn: newItemNameEn.trim() || undefined,
      price: parseFloat(newItemPrice) || 0,
      description: newItemDesc.trim() || '',
      descriptionEn: newItemDescEn.trim() || undefined,
      image: newItemImage.trim() || 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=600&q=80',
      available: true,
      isPopular: newItemIsPopular,
      isNew: newItemIsNew,
      calories: newItemCalories ? parseInt(newItemCalories, 10) : undefined
    };

    setMenuItems([...menuItems, newItem]);
    setNewItemName('');
    setNewItemNameEn('');
    setNewItemPrice('');
    setNewItemDesc('');
    setNewItemDescEn('');
    setNewItemImage('');
    setNewItemCalories('');
    setNewItemIsPopular(false);
    setNewItemIsNew(false);
  };

  const handleStartEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setEditItemName(item.name || '');
    setEditItemNameEn(item.nameEn || '');
    setEditItemPrice(item.price.toString());
    setEditItemDesc(item.description || '');
    setEditItemDescEn(item.descriptionEn || '');
    setEditItemImage(item.image || '');
    setEditItemCalories(item.calories ? item.calories.toString() : '');
    setEditItemIsPopular(!!item.isPopular);
    setEditItemIsNew(!!item.isNew);
    setEditItemCategoryId(item.categoryId);
  };

  const handleEditItemImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingEditItemImg(true);
    try {
      const base64 = await compressAndResizeImage(file, 800);
      setEditItemImage(base64);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء معالجة الصورة');
    } finally {
      setIsUploadingEditItemImg(false);
    }
  };

  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editItemName.trim() || !editItemPrice) return;

    setMenuItems(prev => prev.map(m => {
      if (m.id === editingItem.id) {
        return {
          ...m,
          name: editItemName.trim(),
          nameEn: editItemNameEn.trim() || undefined,
          price: parseFloat(editItemPrice) || 0,
          description: editItemDesc.trim(),
          descriptionEn: editItemDescEn.trim() || undefined,
          image: editItemImage.trim() || m.image,
          calories: editItemCalories ? parseInt(editItemCalories, 10) : undefined,
          isPopular: editItemIsPopular,
          isNew: editItemIsNew,
          categoryId: editItemCategoryId || m.categoryId
        };
      }
      return m;
    }));

    setEditingItem(null);
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
      setMenuItems(prev => prev.filter(m => m.id !== itemId));
    }
  };

  const handleToggleItemStock = (itemId: string) => {
    setMenuItems(prev => prev.map(m => m.id === itemId ? { ...m, available: !m.available } : m));
  };

  // Audio Upload
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الملف الصوتي كبير. يرجى اختيار ملف أقل من 5 ميجابايت.');
      return;
    }

    try {
      const base64Audio = await fileToBase64(file);
      setSettings(prev => ({
        ...prev,
        customAdminAudio: base64Audio,
        customAdminAudioName: file.name
      }));
      playNotificationSound(settings.adminSoundVolume, 'chime', base64Audio);
      alert(`تم رفع الصوت بنجاح (${file.name})`);
    } catch (err) {
      console.error('Audio upload error:', err);
      alert('حدث خطأ أثناء قراءة الملف الصوتي.');
    }
  };

  const handleResetAudio = () => {
    setSettings(prev => ({
      ...prev,
      customAdminAudio: undefined,
      customAdminAudioName: undefined
    }));
    playNotificationSound(settings.adminSoundVolume, settings.adminSoundType);
    alert('تمت استعادة النغمة الافتراضية.');
  };

  // Logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressAndResizeImage(file, 400);
      setSettings(prev => ({ ...prev, logoUrl: base64 }));
    } catch (err) {
      console.error(err);
      alert('تعذر رفع الشعار');
    }
  };

  // Cover photo upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressAndResizeImage(file, 1200);
      setSettings(prev => ({ ...prev, coverImageUrl: base64 }));
    } catch (err) {
      console.error(err);
      alert('تعذر رفع صورة الغلاف');
    }
  };

  // Security Credentials Save
  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput.trim() || !pinInput.trim()) {
      alert('يرجى ملء جميع حقول الأمان');
      return;
    }

    const newUsername = usernameInput.trim();
    const newPassword = passwordInput.trim();
    const newPin = pinInput.trim();

    try {
      localStorage.setItem('smart_menu_admin_creds', JSON.stringify({
        username: newUsername,
        password: newPassword,
        pin: newPin
      }));
    } catch (e) {}

    setSettings(prev => ({
      ...prev,
      adminUsername: newUsername,
      adminPassword: newPassword,
      adminPin: newPin
    }));

    setSecuritySavedMsg(true);
    setTimeout(() => setSecuritySavedMsg(false), 3500);
  };

  // Save financial settings (currency, tax, profit margin)
  const handleSaveFinancialSettings = () => {
    setSettings(prev => ({
      ...prev,
      currencySymbol: currencyInput.trim() || 'ج.م',
      taxEnabled: taxEnabledInput,
      taxRate: Number(taxRateInput) || 0,
      profitMargin: Number(profitMarginInput) || 65
    }));
    setFinancialSavedMsg(true);
    setTimeout(() => setFinancialSavedMsg(false), 3000);
    addSystemLog?.('system', 'info', `تم حفظ الإعدادات المالية (الضريبة: ${taxEnabledInput ? `${taxRateInput}%` : 'معطلة'} - نسبة الربح: ${profitMarginInput}%)`, undefined, 'المدير');
  };

  // Quick toggle for tax (اضافة ضريبة علي الطلبات او لاء)
  const handleToggleTaxQuick = (newVal?: boolean) => {
    const nextVal = newVal !== undefined ? newVal : !(settings.taxEnabled ?? true);
    setTaxEnabledInput(nextVal);
    setSettings(prev => ({
      ...prev,
      taxEnabled: nextVal
    }));
    addSystemLog?.('system', 'info', nextVal ? `تم تفعيل إضافة الضريبة على الطلبات بنسبة ${settings.taxRate ?? 14}%` : 'تم إيقاف وتعطيل إضافة الضريبة على الطلبات تماماً', undefined, 'المدير');
  };

  // Interactive control for net profit margin percentage (نسبة صافي الربح أتحكم فيها كلو)
  const handleUpdateProfitMargin = (newMargin: number) => {
    const clamped = Math.max(1, Math.min(100, Math.round(newMargin)));
    setProfitMarginInput(clamped);
    setSettings(prev => ({
      ...prev,
      profitMargin: clamped
    }));
    addSystemLog?.('system', 'info', `تم تعديل نسبة تقدير صافي الربح إلى ${clamped}%`, undefined, 'المدير');
  };

  // Analytics calculations
  const safeTables = (tables || []).filter(t => Number(t.tableNumber) !== 0);
  const safeMenuItems = menuItems || [];
  const safeCategories = categories || [];

  const totalOrdersCount = safeOrders.length;
  const totalRevenue = safeOrders.reduce((sum, o) => o.status !== 'cancelled' ? sum + o.total : sum, 0);
  const profitMarginPercent = settings.profitMargin ?? 65;
  const netProfitToday = Math.round(totalRevenue * (profitMarginPercent / 100));
  const activeTablesCount = safeTables.filter(t => t.status === 'busy' || t.status === 'bill_requested').length;
  const pendingBillRequests = (billRequests || []).filter(b => b.status === 'pending' && Number(b.tableNumber) !== 0 && (b.totalAmount > 0 || safeOrders.some(o => Number(o.tableNumber) === Number(b.tableNumber) && o.status !== 'cancelled' && !(o as any).settled)));
  const tableBillRequests = safeTables.filter(t => Number(t.tableNumber) !== 0 && (t.status === 'bill_requested' || t.billRequested) && safeOrders.some(o => Number(o.tableNumber) === Number(t.tableNumber) && o.status !== 'cancelled' && !(o as any).settled));
  const billRequestTableNums = new Set([
    ...pendingBillRequests.map(b => Number(b.tableNumber)),
    ...tableBillRequests.map(t => Number(t.tableNumber))
  ]);
  billRequestTableNums.delete(0);
  const billRequestsCount = billRequestTableNums.size;
  const pendingOrdersCount = safeOrders.filter(o => Number(o.tableNumber) !== 0 && o.status === 'pending').length;
  const takeawayOrders = safeOrders.filter(o => Number(o.tableNumber) === 0 && o.status !== 'completed' && o.status !== 'cancelled');
  const takeawayOrdersCount = takeawayOrders.length;
  const currency = settings.currencySymbol || 'ج.م';

  // Calculate Top Items of the Month
  const itemCounts: Record<string, { count: number; totalRevenue: number; item: MenuItem }> = {};
  safeOrders.forEach(o => {
    if (o.status !== 'cancelled') {
      (o.items || []).forEach(ci => {
        if (ci && ci.menuItem && ci.menuItem.id) {
          if (!itemCounts[ci.menuItem.id]) {
            itemCounts[ci.menuItem.id] = { count: 0, totalRevenue: 0, item: ci.menuItem };
          }
          itemCounts[ci.menuItem.id].count += ci.quantity || 1;
          itemCounts[ci.menuItem.id].totalRevenue += (ci.menuItem.price || 0) * (ci.quantity || 1);
        }
      });
    }
  });

  const topItems = Object.values(itemCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  // Filtered Orders
  const filteredOrders = safeOrders.filter(o => {
    if (orderFilter === 'takeaway') {
      return Number(o.tableNumber) === 0 && o.status !== 'completed' && o.status !== 'cancelled';
    }
    if (orderFilter === 'tables') {
      return Number(o.tableNumber) !== 0 && o.status !== 'completed' && o.status !== 'cancelled';
    }
    if (orderFilter === 'all') {
      return o.status !== 'completed' && o.status !== 'cancelled';
    }
    if (orderFilter === 'delivered') {
      return o.status === 'delivered' || o.status === 'ready';
    }
    return o.status === orderFilter;
  });

  // Host URL for QR generation (always generates clean client URLs without admin keywords)
  const getTableUrl = (tNum: number) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    let path = typeof window !== 'undefined' ? window.location.pathname : '';
    // Strip /admin or any admin subpath
    path = path.replace(/\/admin\/?$/i, '').replace(/\/admin/gi, '');
    if (!path.startsWith('/')) path = '/' + path;
    const basePath = path === '/' ? '' : path;

    if (settings.qrMode === 'unified') {
      return `${origin}${basePath}/`;
    }
    return `${origin}${basePath}/?table=${tNum}`;
  };

  const getViewOnlyUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    let path = typeof window !== 'undefined' ? window.location.pathname : '';
    path = path.replace(/\/admin\/?$/i, '').replace(/\/admin/gi, '');
    if (!path.startsWith('/')) path = '/' + path;
    const basePath = path === '/' ? '' : path;
    return `${origin}${basePath}/?mode=view`;
  };

  const getQRImageUrl = (text: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}&color=2A1D15&bgcolor=FFFFFF&margin=10`;
  };

  // Arabic names for days
  const dayNamesArabic = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  // Aggregate Days demand
  const daysDemand = dayNamesArabic.map((name, index) => {
    const dayOrders = orders.filter(o => {
      if (o.status === 'cancelled') return false;
      const d = new Date(o.createdAt);
      return d.getDay() === index;
    });
    const orderCount = dayOrders.length;
    const revenue = dayOrders.reduce((sum, o) => sum + o.total, 0);
    return { index, name, orderCount, revenue };
  });

  // Sort days from highest to lowest demand
  const sortedDaysDemand = [...daysDemand].sort((a, b) => b.orderCount - a.orderCount || b.revenue - a.revenue);

  // Aggregate Hours demand filtered by selected day index (analyticsDayFilter)
  const hoursDemand = Array.from({ length: 24 }, (_, hour) => {
    const hourOrders = orders.filter(o => {
      if (o.status === 'cancelled') return false;
      const date = new Date(o.createdAt);
      const dayMatches = analyticsDayFilter === -1 || date.getDay() === analyticsDayFilter;
      const hourMatches = date.getHours() === hour;
      return dayMatches && hourMatches;
    });
    const orderCount = hourOrders.length;
    const revenue = hourOrders.reduce((sum, o) => sum + o.total, 0);
    return { hour, orderCount, revenue };
  });

  // Sort hours from highest to lowest demand
  const sortedHoursDemand = [...hoursDemand]
    .filter(h => h.orderCount > 0)
    .sort((a, b) => b.orderCount - a.orderCount || b.revenue - a.revenue);

  return (
    <div className="min-h-screen pb-24 bg-[#EEDEC6] text-[#2D1E18] w-full max-w-full overflow-x-hidden" style={{ direction: currentLang === 'en' ? 'ltr' : 'rtl' }}>
      
      {/* Sticky Navigation Stack: Header & Tabs stay seamlessly glued without overlapping on all screen sizes */}
      <div className="sticky top-0 z-40 shadow-md no-print w-full bg-[#2A1D15]">
        {/* Top Header Bar */}
        <header className="bg-gradient-to-r from-[#211610] via-[#2F1F17] to-[#1F140D] text-[#FDFBF7] border-b border-[#D4A373]/30 shadow-md">
          <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2.5 sm:py-3.5 flex items-center justify-between gap-3">
            
            {/* Left: Brand Identity & Status */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <img 
                  src={settings.logoUrl} 
                  alt={settings.systemName}
                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl object-cover border-2 border-[#D4A373]/60 shadow-md bg-stone-900"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#211610] rounded-full" title="متصل بالسيرفر وقاعدة بيانات MongoDB" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-black text-sm sm:text-base md:text-lg text-white truncate max-w-[150px] sm:max-w-xs">
                    {currentLang === 'en' ? (settings.systemNameEn || settings.systemName) : settings.systemName}
                  </h1>
                  <span className="bg-[#D4A373]/25 text-[#E6C28B] border border-[#D4A373]/40 text-[10px] font-black px-2 py-0.5 rounded-lg flex-shrink-0">
                    {tAdmin.dashboardTitle}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-stone-300">
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span>سحابي متزامن</span>
                  </span>
                  <span className="text-stone-500">•</span>
                  <span className="text-stone-300 hidden sm:inline">{tAdmin.dashboardSub}</span>
                </div>
              </div>
            </div>

            {/* Middle: Live Quick Metrics for Desktop */}
            <div className="hidden lg:flex items-center gap-2">
              {/* Pending Orders Pill */}
              <button
                type="button"
                onClick={() => { setActiveTab('orders'); setManagingCategoryId(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  pendingOrdersCount > 0
                    ? 'bg-rose-950/80 text-rose-200 border border-rose-600/60 animate-pulse'
                    : 'bg-stone-900/60 text-stone-300 border border-stone-800'
                }`}
                title="الطلبات الجديدة قيد الانتظار"
              >
                <ClipboardList size={13} className={pendingOrdersCount > 0 ? 'text-rose-400' : 'text-stone-400'} />
                <span>طلبات جديدة:</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[11px] ${pendingOrdersCount > 0 ? 'bg-rose-600 text-white font-black' : 'text-stone-400'}`}>
                  {pendingOrdersCount}
                </span>
              </button>

              {/* Bill Requests Pill */}
              <button
                type="button"
                onClick={() => { setActiveTab('bills'); setManagingCategoryId(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  billRequestsCount > 0
                    ? 'bg-amber-950/80 text-amber-200 border border-amber-500/60 animate-pulse'
                    : 'bg-stone-900/60 text-stone-300 border border-stone-800'
                }`}
                title="طلبات الحساب والشيك"
              >
                <Receipt size={13} className={billRequestsCount > 0 ? 'text-amber-400' : 'text-stone-400'} />
                <span>شيكات:</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[11px] ${billRequestsCount > 0 ? 'bg-amber-600 text-white font-black' : 'text-stone-400'}`}>
                  {billRequestsCount}
                </span>
              </button>

              {/* Active Tables Pill */}
              <button
                type="button"
                onClick={() => { setActiveTab('tables-tracking'); setManagingCategoryId(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  activeTablesCount > 0
                    ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-600/60'
                    : 'bg-stone-900/60 text-stone-300 border border-stone-800'
                }`}
                title="الطاولات المشغولة حالياً"
              >
                <CircleDot size={13} className={activeTablesCount > 0 ? 'text-emerald-400' : 'text-stone-400'} />
                <span>طاولات مشغولة:</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[11px] ${activeTablesCount > 0 ? 'bg-emerald-600 text-white font-black' : 'text-stone-400'}`}>
                  {activeTablesCount}
                </span>
              </button>
            </div>

            {/* Right: Actions (Language Switcher, Lock Dashboard, Preview Client Menu) */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Language Switcher Pill */}
              <button
                type="button"
                onClick={() => {
                  const nextLang = currentLang === 'ar' ? 'en' : 'ar';
                  handleSaveLanguage(nextLang);
                }}
                className="flex items-center gap-1.5 bg-[#8C6D48]/30 hover:bg-[#8C6D48]/60 text-amber-100 border border-[#D4A373]/40 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95"
                title={currentLang === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
              >
                <Globe size={13} className="text-[#D4A373]" />
                <span className="hidden sm:inline">{currentLang === 'ar' ? 'English' : 'عربي'}</span>
                <span className="sm:hidden">{currentLang === 'ar' ? 'EN' : 'عربي'}</span>
              </button>

              {/* Lock Admin Screen Button */}
              <button
                type="button"
                onClick={onLockAdmin || onSwitchToClient}
                className="flex items-center gap-1.5 bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-700/50 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95"
                title={currentLang === 'en' ? 'Lock admin dashboard' : 'قفل لوحة الإدارة وتأمين السيستم'}
              >
                <Lock size={13} className="text-rose-400" />
                <span className="hidden sm:inline">{tAdmin.lockAdmin}</span>
                <span className="sm:hidden">قفل</span>
              </button>

              {/* Explicit Save Changes Button */}
              <button
                type="button"
                onClick={() => {
                  handleTriggerSaveToast('تم حفظ وتطبيق جميع تعديلات النظام وقاعدة البيانات بنجاح! ✔️');
                }}
                className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500/60 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                title="حفظ وتأكيد التغييرات فوراً"
              >
                <CheckCircle size={14} className="text-emerald-300" />
                <span className="hidden sm:inline">حفظ التغييرات</span>
                <span className="sm:hidden">حفظ</span>
              </button>

              {/* Copy View-Only Link Quick Button */}
              <button
                type="button"
                onClick={() => {
                  const viewUrl = getViewOnlyUrl();
                  try {
                    navigator.clipboard.writeText(viewUrl);
                    alert('تم نسخ رابط منيو المشاهدة فقط بنجاح! 📋\n\nالرابط: ' + viewUrl + '\n\nيمكنك وضعه في بايو انستجرام أو فيسبوك أو إرساله للعملاء للاطلاع على الأسعار والمنيو دون إمكانية الطلب.');
                  } catch (e) {}
                }}
                className="flex items-center gap-1.5 bg-amber-800/80 hover:bg-amber-700 text-amber-100 border border-amber-500/40 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                title="نسخ رابط المنيو للمشاهدة والأسعار فقط (للسوشيال ميديا وبدون ربط بطاولة)"
              >
                <Eye size={14} className="text-amber-300" />
                <span className="hidden sm:inline">رابط المشاهدة فقط</span>
                <span className="sm:hidden">رابط</span>
              </button>

              {/* Switch to Client View */}
              <button
                type="button"
                onClick={onSwitchToClient}
                className="flex items-center gap-1.5 bg-gradient-to-r from-[#D4A373] to-[#E6C28B] hover:from-[#c59362] hover:to-[#D4A373] text-[#2A1D15] px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-black text-xs shadow-md transition-all active:scale-95"
              >
                <Smartphone size={14} />
                <span className="hidden sm:inline">{tAdmin.previewAsClient}</span>
                <span className="sm:hidden">المنيو</span>
              </button>
            </div>
          </div>
        </header>

        {/* Modular Dedicated Pages Navigation Tabs */}
        <div className="bg-[#F5ECDC] border-b border-[#E5D5BC]">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 flex gap-1.5 sm:gap-2 overflow-x-auto py-2 scrollbar-none touch-pan-x">
          
          {/* 1. Orders Tab */}
          <button
            onClick={() => { setActiveTab('orders'); setManagingCategoryId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === 'orders' 
                ? 'bg-[#3D271D] text-white shadow-md' 
                : 'bg-white text-[#3D271D] hover:bg-[#EBDCC4] border border-[#E5D5BC]'
            }`}
          >
            <ClipboardList size={16} />
            <span>الطلبات</span>
            {pendingOrdersCount > 0 && (
              <span className="bg-rose-600 text-white px-2 py-0.5 rounded-full text-[10px] animate-pulse">
                {pendingOrdersCount}
              </span>
            )}
          </button>

          {/* 2. Bill Requests Dedicated Tab */}
          <button
            onClick={() => { setActiveTab('bills'); setManagingCategoryId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === 'bills' 
                ? 'bg-[#8C6D48] text-white shadow-md' 
                : 'bg-white text-[#3D271D] hover:bg-[#EBDCC4] border border-[#E5D5BC]'
            }`}
          >
            <Receipt size={16} />
            <span>طلب الشيك والحساب</span>
            {billRequestsCount > 0 ? (
              <span className="bg-amber-600 text-white px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse">
                {billRequestsCount} شيك
              </span>
            ) : (
              <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full text-[10px]">
                0
              </span>
            )}
          </button>

          {/* 3. Tables Management Tab */}
          <button
            onClick={() => { setActiveTab('tables'); setManagingCategoryId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === 'tables' 
                ? 'bg-[#3D271D] text-white shadow-md' 
                : 'bg-white text-[#3D271D] hover:bg-[#EBDCC4] border border-[#E5D5BC]'
            }`}
          >
            <CircleDot size={16} />
            <span>عداد وإدارة الطاولات</span>
          </button>

          {/* Tables Tracking and Orders Dashboard Tab */}
          <button
            onClick={() => { setActiveTab('tables-tracking'); setManagingCategoryId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === 'tables-tracking' 
                ? 'bg-emerald-800 text-white shadow-md' 
                : 'bg-white text-[#3D271D] hover:bg-[#EBDCC4] border border-[#E5D5BC]'
            }`}
          >
            <UtensilsCrossed size={16} className="text-emerald-500" />
            <span>متابعة طلبات الطاولات</span>
            {activeTablesCount > 0 && (
              <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse">
                {activeTablesCount} نشط
              </span>
            )}
          </button>



          {/* 4. Menu Management Tab */}
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === 'menu' 
                ? 'bg-[#3D271D] text-white shadow-md' 
                : 'bg-white text-[#3D271D] hover:bg-[#EBDCC4] border border-[#E5D5BC]'
            }`}
          >
            <UtensilsCrossed size={16} />
            <span>إدارة المنيو</span>
          </button>

          {/* 5. Ads & Offers Tab */}
          <button
            onClick={() => { setActiveTab('ads'); setManagingCategoryId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === 'ads' 
                ? 'bg-[#3D271D] text-white shadow-md' 
                : 'bg-white text-[#3D271D] hover:bg-[#EBDCC4] border border-[#E5D5BC]'
            }`}
          >
            <Megaphone size={16} />
            <span>نظام الإعلانات</span>
            {banners.filter(b => b.active).length > 0 && (
              <span className="bg-[#D4A373] text-[#2A1D15] px-2 py-0.5 rounded-full text-[10px] font-black">
                {banners.filter(b => b.active).length}
              </span>
            )}
          </button>

          {/* 5. Customers CRM Tab */}
          <button
            onClick={() => { setActiveTab('customers'); setManagingCategoryId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === 'customers' 
                ? 'bg-[#3D271D] text-white shadow-md' 
                : 'bg-white text-[#3D271D] hover:bg-[#EBDCC4] border border-[#E5D5BC]'
            }`}
          >
            <Users size={16} />
            <span>سجل العملاء CRM</span>
            {customers.length > 0 && (
              <span className="bg-stone-200 text-stone-800 px-2 py-0.5 rounded-full text-[10px]">
                {customers.length}
              </span>
            )}
          </button>

          {/* 6. Theme & Colors Tab */}
          <button
            onClick={() => { setActiveTab('theme'); setManagingCategoryId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === 'theme' 
                ? 'bg-[#3D271D] text-white shadow-md' 
                : 'bg-white text-[#3D271D] hover:bg-[#EBDCC4] border border-[#E5D5BC]'
            }`}
          >
            <Palette size={16} />
            <span>تخصيص الألوان</span>
          </button>

          {/* 7. Social Links & Developer Rights Tab */}
          <button
            onClick={() => { setActiveTab('social'); setManagingCategoryId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === 'social' 
                ? 'bg-[#3D271D] text-white shadow-md' 
                : 'bg-white text-[#3D271D] hover:bg-[#EBDCC4] border border-[#E5D5BC]'
            }`}
          >
            <Share2 size={16} />
            <span>السوشيال والمطور</span>
          </button>

          {/* 8. QR System Tab */}
          <button
            onClick={() => { setActiveTab('qr'); setManagingCategoryId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === 'qr' 
                ? 'bg-[#3D271D] text-white shadow-md' 
                : 'bg-white text-[#3D271D] hover:bg-[#EBDCC4] border border-[#E5D5BC]'
            }`}
          >
            <QrCode size={16} />
            <span>باركود الطاولات</span>
          </button>

          {/* 10. Settings Tab */}
          <button
            onClick={() => { setActiveTab('settings'); setManagingCategoryId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === 'settings' 
                ? 'bg-[#3D271D] text-white shadow-md' 
                : 'bg-white text-[#3D271D] hover:bg-[#EBDCC4] border border-[#E5D5BC]'
            }`}
          >
            <SettingsIcon size={16} />
            <span>الإعدادات والأمان</span>
          </button>

          {/* Coupons Discount Management Tab */}
          <button
            onClick={() => { setActiveTab('coupons'); setManagingCategoryId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === 'coupons' 
                ? 'bg-amber-800 text-white shadow-md' 
                : 'bg-white text-[#3D271D] hover:bg-[#EBDCC4] border border-[#E5D5BC]'
            }`}
          >
            <Tag size={16} />
            <span>كوبونات الخصم</span>
            {coupons.length > 0 && (
              <span className="bg-amber-600 text-white px-2 py-0.5 rounded-full text-[10px] font-black">
                {coupons.length}
              </span>
            )}
          </button>

          {/* 12. Developer Locked Console Tab */}
          <button
            onClick={() => { setActiveTab('developer'); setManagingCategoryId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === 'developer' 
                ? 'bg-amber-900 text-amber-100 shadow-md border border-amber-600' 
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <LockKeyhole size={16} className={isDeveloperUnlocked ? 'text-emerald-500' : 'text-amber-600'} />
            <span>خزانة المطور</span>
            {isDeveloperUnlocked ? (
              <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">مفتوحة</span>
            ) : (
              <span className="bg-amber-700 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">محمية 🔒</span>
            )}
          </button>
        </div>
      </div>
    </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6 no-print w-full">
        
        {/* ================= 1️⃣ PAGE 1: ORDERS ================= */}
        {activeTab === 'orders' && (
          <OrdersReceptionPage
            orders={orders}
            safeOrders={safeOrders}
            menuItems={menuItems}
            categories={categories}
            tables={tables}
            setTables={setTables}
            billRequests={billRequests}
            setBillRequests={setBillRequests}
            settings={settings}
            setSettings={setSettings}
            updateOrderStatus={handleUpdateOrderStatus}
            updatingOrderIds={updatingOrderIds}
            deleteOrderPermanently={deleteOrderPermanently}
            clearAllOrdersAndStats={handleClearAllOrdersAndStats}
            onRefreshOrders={fetchOrdersDirectly}
            isRefreshingOrders={isRefreshingOrders}
            printThermalOrder={printThermalOrder}
            onSettleAndSendCheck={handleSettleAndSendCheck}
            onCompleteTakeawayOrder={handleCompleteTakeawayOrder}
            onToggleTaxQuick={handleToggleTaxQuick}
            onNavigateToTab={setActiveTab}
            currency={currency}
            currentLang={currentLang}
            onPlaceManualOrder={handlePlaceManualOrder}
          />
        )}

        {false && activeTab === 'orders' && (
          <div className="space-y-6">
            
            {/* Orders Header & Live Sound Tester */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 p-4 rounded-3xl border border-[#E5D5BC]">
              <div>
                <h2 className="text-xl font-black text-[#2D1E18]">استقبال ومتابعة الطلبات المباشرة</h2>
                <p className="text-xs text-[#7A614A]">تظهر الطلبات لحظياً مع تشغيل صوت تنبيه الكاشير</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Bill sound test button */}
                <button
                  type="button"
                  onClick={() => playNotificationSound(settings.adminSoundVolume, settings.billSoundType || 'bill', settings.customAdminAudio)}
                  className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-xs font-black text-amber-900 flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  title="تجربة صوت إشعار طلب الشيك / الفاتورة"
                >
                  <Receipt size={14} className="text-amber-700" />
                  <span>صوت الشيك 🔔</span>
                </button>

                {/* Quick Tax Indicator & Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleTaxQuick()}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                    settings.taxEnabled !== false
                      ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                      : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-500 line-through'
                  }`}
                  title="الضغط لتفعيل أو إيقاف إضافة الضريبة على الطلبات فوراً"
                >
                  <Percent size={13} />
                  <span>الضريبة: {settings.taxEnabled !== false ? `${settings.taxRate ?? 14}%` : 'معطلة'}</span>
                </button>

                {/* Direct Manual Order Refresh */}
                <button
                  type="button"
                  onClick={fetchOrdersDirectly}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-stone-50 border border-[#D5C2A5] text-xs font-bold text-[#3D271D] flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  title="جلب وتحديث أحدث الطلبات من الخادم فوراً"
                >
                  <RefreshCw size={14} className={isRefreshingOrders ? 'animate-spin text-[#3D271D]' : 'text-[#3D271D]'} />
                  <span>{isRefreshingOrders ? 'جاري التحديث...' : 'تحديث الطلبات'}</span>
                </button>

                {/* Delete / Clear All Orders Data Button */}
                <button
                  type="button"
                  onClick={() => handleClearAllOrdersAndStats(false)}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                  title="حذف وتفريغ كافة بيانات وسجلات الطلبات نهائياً من السيستم"
                >
                  <Trash2 size={14} className="text-rose-600" />
                  <span>حذف بيانات الطلبات</span>
                </button>

                <div className="bg-[#3D271D] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm">
                  الطلبات النشطة: {orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length}
                </div>
              </div>
            </div>

            {/* Status Filter Bar */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { 
                  id: 'all', 
                  label: 'الطلبات النشطة (الكل)', 
                  count: safeOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length 
                },
                { 
                  id: 'pending', 
                  label: 'بانتظار الاستلام', 
                  count: safeOrders.filter(o => o.status === 'pending').length 
                },
                { 
                  id: 'preparing', 
                  label: 'المرحلة 1: تم استلام الطلب وبدء التحضير', 
                  count: safeOrders.filter(o => o.status === 'preparing').length 
                },
                { 
                  id: 'delivered', 
                  label: 'المرحلة 2: تم تجهيز الطلب وتسليمه', 
                  count: safeOrders.filter(o => o.status === 'delivered' || o.status === 'ready').length 
                },
                { 
                  id: 'completed', 
                  label: 'أرشيف المحاسبة', 
                  count: safeOrders.filter(o => o.status === 'completed').length 
                },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setOrderFilter(f.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    orderFilter === f.id
                      ? 'bg-[#3D271D] text-white shadow-sm'
                      : 'bg-white text-stone-700 hover:bg-[#EBDCC4] border border-[#E5D5BC]'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    orderFilter === f.id ? 'bg-[#D4A373] text-[#2D1E18]' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Live Urgent Bill Requests Notification Banner */}
            {billRequestsCount > 0 && (
              <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-white p-4 sm:p-5 rounded-3xl border-2 border-amber-400 shadow-xl space-y-3 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-md animate-bounce">
                      <Receipt size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                        <h3 className="font-black text-sm sm:text-base text-amber-200">
                          تنبيه فوري: يوجد ({billRequestsCount}) طاولة تطلب الشيك والحساب الآن!
                        </h3>
                      </div>
                      <p className="text-xs text-amber-100/90 mt-0.5">
                        العملاء بانتظار الفاتورة وإجراء المحاسبة. يمكنك التصفية والمحاسبة بضغطة زر واحدة أدناه:
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('bills')}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-2xl font-black text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>عرض صفحة الشيكات والحسابات الحية</span>
                    <ChevronLeft size={14} />
                  </button>
                </div>

                {/* Quick Action Cards for each table requesting bill */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {Array.from(billRequestTableNums).map(tNum => {
                    const tableObj = tables.find(t => Number(t.tableNumber) === tNum);
                    const tOrders = safeOrders.filter(o => Number(o.tableNumber) === tNum && o.status !== 'cancelled' && !(o as any).settled);
                    const calcOrdersTotal = tOrders.reduce((sum, o) => {
                      let ordTotal = typeof o.total === 'number' ? o.total : parseFloat(o.total as any);
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
                      return sum + ordTotal;
                    }, 0);
                    const pendingBillObj = (billRequests || []).find(b => Number(b.tableNumber) === tNum && b.status === 'pending');
                    const pendingBillTotal = typeof pendingBillObj?.totalAmount === 'number' ? pendingBillObj.totalAmount : (parseFloat(pendingBillObj?.totalAmount as any) || 0);
                    const tTotal = calcOrdersTotal > 0 ? calcOrdersTotal : pendingBillTotal;
                    const custName = tableObj?.activeSessionCustomerName || pendingBillObj?.customerName || tOrders[0]?.customerName;

                    return (
                      <div key={tNum} className="bg-amber-950/70 border border-amber-500/50 p-3 rounded-2xl flex items-center justify-between gap-2 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black text-xs">
                            {tNum}
                          </span>
                          <div>
                            <p className="font-black text-xs text-white">طاولة رقم #{tNum}</p>
                            <p className="text-[10px] text-amber-200">
                              {custName ? `${custName} • ` : ''}المبلغ: {tTotal} {currency}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSettleAndSendCheck(tNum)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-black shadow-xs transition-all active:scale-95 cursor-pointer"
                            title="تصفية الحساب وإرسال الشيك وتفريغ الطاولة فوراً"
                          >
                            تصفية وتفريغ ✓
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Orders Grid */}
            {filteredOrders.length === 0 ? (
              <div className="bg-white/80 rounded-3xl p-12 text-center border border-[#E5D5BC] space-y-2">
                <p className="font-bold text-stone-600 text-base">لا توجد طلبات مطابقة للفلتر المحدد</p>
                <p className="text-xs text-stone-500">الطلبات الجديدة تظهر هنا فور إرسالها من الطاولات</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredOrders.map((order) => {
                  const statusColors: Record<OrderStatus, string> = {
                    pending: 'bg-amber-100 text-amber-900 border-amber-300',
                    preparing: 'bg-blue-100 text-blue-900 border-blue-300',
                    ready: 'bg-purple-100 text-purple-900 border-purple-300',
                    delivered: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                    completed: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                    cancelled: 'bg-stone-200 text-stone-700 border-stone-300'
                  };

                  const statusLabels: Record<OrderStatus, string> = {
                    pending: 'قيد الانتظار',
                    preparing: 'جاري التحضير',
                    ready: 'جاهز للتسليم',
                    delivered: 'تم التسليم للطاولة',
                    completed: 'مكتمل ومحسوب',
                    cancelled: 'ملغي'
                  };

                  return (
                    <div 
                      key={order.id} 
                      className={`bg-white rounded-3xl p-5 shadow-sm border ${
                        order.billRequested && Number(order.tableNumber) !== 0 ? 'border-amber-400 ring-2 ring-amber-400/40 animate-pulse-subtle' : 'border-[#E5D5BC]'
                      } flex flex-col justify-between space-y-4 hover:shadow-md transition-all`}
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                          <div className="flex items-center gap-2">
                            <span className="w-10 h-10 rounded-2xl bg-[#3D271D] text-white flex items-center justify-center font-black text-sm shadow">
                              {Number(order.tableNumber) === 0 ? '🛍️' : order.tableNumber}
                            </span>
                            <div>
                              <h3 className="font-black text-sm text-[#2D1E18]">
                                {Number(order.tableNumber) === 0 ? 'تيك أواي (Takeaway)' : `طاولة رقم (${order.tableNumber})`}
                              </h3>
                              {order.customerName && (
                                <p className="text-[11px] font-bold text-amber-900">
                                  العميل: {order.customerName} {order.customerPhone ? `(${order.customerPhone})` : ''}
                                </p>
                              )}
                              <p className="text-[10px] text-stone-500">
                                {new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} &bull; #{order.id.slice(-4)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Thermal Receipt Print Button */}
                            <button
                              onClick={() => printThermalOrder(order)}
                              className="p-1.5 rounded-xl bg-stone-100 hover:bg-[#eedec6] text-stone-700 transition-colors"
                              title="طباعة فاتورة حرارية للطلب"
                            >
                              <Printer size={15} />
                            </button>

                            {/* Delete Individual Order Button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`هل أنت متأكد من حذف الطلب رقم #${order.id.slice(-4)} نهائياً من السجل؟`)) {
                                  if (deleteOrderPermanently) {
                                    deleteOrderPermanently(order.id);
                                  } else {
                                    setOrders(prev => prev.filter(o => o.id !== order.id));
                                    fetch(`/api/orders/${encodeURIComponent(order.id)}`, { method: 'DELETE' }).catch(() => {});
                                  }
                                  addSystemLog?.('orders', 'warning', `تم حذف الطلب #${order.id.slice(-4)} نهائياً`, undefined, 'المدير');
                                }
                              }}
                              className="p-1.5 rounded-xl hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-colors"
                              title="حذف هذا الطلب نهائياً من السجل"
                            >
                              <Trash2 size={15} />
                            </button>

                            <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${statusColors[order.status]}`}>
                              {statusLabels[order.status]}
                            </span>
                          </div>
                        </div>

                        {/* Bill Request Alert */}
                        {(order.billRequested || billRequestTableNums.has(Number(order.tableNumber))) && Number(order.tableNumber) !== 0 && (
                          <div className="mt-3 bg-amber-50 border-2 border-amber-400 p-3 rounded-2xl flex items-center justify-between gap-2 text-xs text-amber-950 font-black shadow-xs animate-pulse">
                            <div className="flex items-center gap-2">
                              <Receipt size={18} className="text-amber-700 shrink-0" />
                              <span>العميل يطلب الحساب والشيك لهذه الطاولة الآن!</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSettleAndSendCheck(order.tableNumber)}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black shrink-0 shadow-2xs transition-all cursor-pointer"
                            >
                              تصفية الشيك ✓
                            </button>
                          </div>
                        )}

                        {/* Payment Method Badge */}
                        <div className="mt-2.5 flex items-center gap-2 text-xs text-stone-600">
                          <span className="font-bold">طريقة الدفع:</span>
                          <span className="bg-stone-100 text-[#3D271D] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            {order.paymentMethod === 'card' ? <CreditCard size={12} /> : <Banknote size={12} />}
                            <span>{order.paymentMethod === 'card' ? 'بطاقة بنكية / فيزا' : 'نقداً (كاش)'}</span>
                          </span>
                        </div>

                        {/* Order Notes */}
                        {order.notes && (
                          <div className="mt-2 p-2.5 bg-[#eedec6]/30 rounded-xl border border-[#D5C2A5] text-xs text-stone-800">
                            <span className="font-bold text-[#8C6D48]">ملاحظة العميل: </span>
                            <span>{order.notes}</span>
                          </div>
                        )}

                        {/* Items ordered */}
                        <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {(order.items || []).map((ci, idx) => {
                            const name = ci?.menuItem?.name || (ci as any)?.name || 'صنف';
                            const price = ci?.menuItem?.price ?? (ci as any)?.price ?? 0;
                            const quantity = ci?.quantity || 1;
                            return (
                              <div key={idx} className="flex items-center justify-between text-xs bg-stone-50 p-2 rounded-2xl border border-stone-100">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-5 h-5 rounded-md bg-[#EEDEC6] text-[#3D271D] font-black flex items-center justify-center text-[10px] flex-shrink-0">
                                        {quantity}x
                                      </span>
                                      <span className="font-bold text-stone-800 truncate">{name}</span>
                                    </div>
                                    {ci.notes && (
                                      <p className="text-[10px] text-amber-800 font-medium truncate mt-0.5">
                                        ملاحظة: {ci.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <span className="font-bold text-stone-800 whitespace-nowrap mr-2">
                                  {price * quantity} {currency}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Total and Action Buttons */}
                      <div className="pt-3 border-t border-stone-100 space-y-3">
                        <div className="flex items-center justify-between font-black text-base text-[#2D1E18]">
                          <span>إجمالي الطلب:</span>
                          <span className="text-[#3D271D] text-lg font-black">{order.total} {currency}</span>
                        </div>

                        {/* 2-Stage Sequential Lifecycle Workflow Pipeline */}
                        <div className="space-y-2.5 pt-1">
                          {/* 2-Stage Progress Indicator */}
                          <div className="flex items-center justify-between px-3 py-2 bg-stone-50 rounded-2xl text-[11px] font-bold text-stone-500 overflow-x-auto border border-stone-200/60">
                            <span className={order.status === 'pending' ? 'text-amber-800 font-black ring-1 ring-amber-300 bg-amber-100/70 px-2 py-0.5 rounded-lg' : 'text-emerald-700 font-black'}>
                              1. تم استلام الطلب وبدء التحضير {order.status !== 'pending' && order.status !== 'cancelled' ? '✓' : ''}
                            </span>
                            <span className="text-stone-300 font-black">←</span>
                            <span className={(order.status === 'delivered' || order.status === 'ready' || order.status === 'completed') ? 'text-emerald-800 font-black ring-1 ring-emerald-300 bg-emerald-100/70 px-2 py-0.5 rounded-lg' : 'text-stone-400'}>
                              2. تم تجهيز الطلب وتسليمه {(order.status === 'delivered' || order.status === 'ready' || order.status === 'completed') ? '✓' : ''}
                            </span>
                          </div>

                          {/* Stage 1: Pending -> Admin clicks to receive and start preparing */}
                          {order.status === 'pending' && (
                            <div className="space-y-1.5">
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                                disabled={updatingOrderIds?.has(order.id)}
                                className={`w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 active:scale-98 transition-all cursor-pointer ${
                                  updatingOrderIds?.has(order.id) ? 'opacity-70 cursor-not-allowed' : ''
                                }`}
                              >
                                {updatingOrderIds?.has(order.id) ? (
                                  <RefreshCw size={17} className="animate-spin" />
                                ) : (
                                  <ChefHat size={17} />
                                )}
                                <span>{updatingOrderIds?.has(order.id) ? 'جاري بدء التحضير...' : 'المرحلة 1: تم استلام الطلب وبدء التحضير (اضغط للبدء)'}</span>
                              </button>
                              
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                                disabled={updatingOrderIds?.has(order.id)}
                                className="w-full py-1.5 rounded-xl hover:bg-rose-50 text-stone-500 hover:text-rose-600 font-bold text-[11px] transition-colors flex items-center justify-center gap-1"
                              >
                                <XCircle size={13} />
                                <span>رفض / إلغاء الطلب</span>
                              </button>
                            </div>
                          )}

                          {/* Stage 2: Preparing -> Admin clicks to complete preparation and deliver */}
                          {order.status === 'preparing' && (
                            <div className="space-y-1.5">
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                                disabled={updatingOrderIds?.has(order.id)}
                                className={`w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer ${
                                  updatingOrderIds?.has(order.id) ? 'opacity-70 cursor-not-allowed' : ''
                                }`}
                              >
                                {updatingOrderIds?.has(order.id) ? (
                                  <RefreshCw size={17} className="animate-spin" />
                                ) : (
                                  <CheckCircle2 size={17} />
                                )}
                                <span>{updatingOrderIds?.has(order.id) ? 'جاري تأكيد التسليم...' : 'المرحلة 2: تم تجهيز الطلب وتسليمه (اضغط للتسليم) ✓'}</span>
                              </button>

                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => printThermalOrder(order)}
                                  className="flex-1 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                                >
                                  <Printer size={13} />
                                  <span>طباعة إيصال المطبخ</span>
                                </button>
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                                  disabled={updatingOrderIds?.has(order.id)}
                                  className="px-3 py-2 rounded-xl hover:bg-rose-50 text-stone-500 hover:text-rose-600 font-bold text-[11px] transition-colors flex items-center justify-center gap-1"
                                >
                                  <XCircle size={13} />
                                  <span>إلغاء</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Completed Delivery State (delivered / ready) */}
                          {(order.status === 'delivered' || order.status === 'ready') && (
                            <div className="space-y-2">
                              <div className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 text-xs font-bold flex items-center justify-between">
                                <span className="flex items-center gap-1.5 font-black text-emerald-800">
                                  <UtensilsCrossed size={15} className="text-emerald-600" />
                                  <span>المرحلة 2: تم تجهيز الطلب وتسليمه بنجاح ✓</span>
                                </span>
                                {order.deliveredAt && (
                                  <span className="text-[10px] text-emerald-700 font-bold">
                                    {new Date(order.deliveredAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>

                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => printThermalOrder(order)}
                                  className="flex-1 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                                >
                                  <Printer size={13} />
                                  <span>طباعة الإيصال</span>
                                </button>
                                {Number(order.tableNumber) === 0 ? (
                                  <button
                                    onClick={() => handleCompleteTakeawayOrder(order.id)}
                                    disabled={updatingOrderIds?.has(order.id)}
                                    className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] flex items-center justify-center gap-1 transition-colors"
                                    title="إغلاق الطلب والجلسة"
                                  >
                                    <CheckCircle2 size={13} />
                                    <span>إغلاق الطلب ✓</span>
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                                      disabled={updatingOrderIds?.has(order.id)}
                                      className="py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-black text-[11px] flex items-center justify-center gap-1 transition-colors"
                                      title="محاسبة وإغلاق الطلب نهائياً"
                                    >
                                      <CheckCircle2 size={13} />
                                      <span>محاسبة وإغلاق ✓</span>
                                    </button>
                                    <button
                                      onClick={() => setActiveTab('bills')}
                                      className="py-2 px-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                                      title="الانتقال إلى قسم الشيكات"
                                    >
                                      <Receipt size={13} />
                                      <span>الشيك</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Stage Completed & Settled */}
                          {order.status === 'completed' && (
                            <div className="space-y-1.5">
                              <div className="py-2.5 px-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black flex items-center justify-center gap-1.5">
                                <CheckCircle2 size={14} className="text-emerald-600" />
                                <span>تم تجهيز وتسليم الطلب ومحاسبته بنجاح ✓</span>
                              </div>
                              <button
                                onClick={() => printThermalOrder(order)}
                                className="w-full py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Printer size={13} />
                                <span>إعادة طباعة الفاتورة</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`هل أنت متأكد من حذف هذا الطلب المكتمل (#${order.id.slice(-4)}) نهائياً من الأرشيف؟`)) {
                                    if (deleteOrderPermanently) {
                                      deleteOrderPermanently(order.id);
                                    } else {
                                      setOrders(prev => prev.filter(o => o.id !== order.id));
                                      fetch(`/api/orders/${encodeURIComponent(order.id)}`, { method: 'DELETE' }).catch(() => {});
                                    }
                                    addSystemLog?.('orders', 'warning', `تم حذف الطلب #${order.id.slice(-4)} نهائياً`, undefined, 'المدير');
                                  }
                                }}
                                className="w-full py-1.5 rounded-xl hover:bg-rose-50 text-stone-400 hover:text-rose-600 font-bold text-[11px] transition-colors flex items-center justify-center gap-1"
                              >
                                <Trash2 size={12} />
                                <span>حذف من الأرشيف نهائياً</span>
                              </button>
                            </div>
                          )}

                          {/* Stage 5: Cancelled Order */}
                          {order.status === 'cancelled' && (
                            <div className="space-y-1.5">
                              <div className="py-2 px-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-center gap-1.5">
                                <XCircle size={14} className="text-rose-600" />
                                <span>تم إلغاء هذا الطلب</span>
                              </div>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'pending')}
                                className="w-full py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                              >
                                <span>استعادة كطلب جديد</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`هل أنت متأكد من حذف هذا الطلب الملغي (#${order.id.slice(-4)}) نهائياً من السجل؟`)) {
                                    if (deleteOrderPermanently) {
                                      deleteOrderPermanently(order.id);
                                    } else {
                                      setOrders(prev => prev.filter(o => o.id !== order.id));
                                      fetch(`/api/orders/${encodeURIComponent(order.id)}`, { method: 'DELETE' }).catch(() => {});
                                    }
                                    addSystemLog?.('orders', 'warning', `تم حذف الطلب الملغي #${order.id.slice(-4)} نهائياً`, undefined, 'المدير');
                                  }
                                }}
                                className="w-full py-1.5 rounded-xl hover:bg-rose-50 text-stone-400 hover:text-rose-600 font-bold text-[11px] transition-colors flex items-center justify-center gap-1"
                              >
                                <Trash2 size={12} />
                                <span>حذف الطلب الملغي نهائياً</span>
                              </button>
                            </div>
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

        {/* ================= 2️⃣ PAGE 2: BILL REQUESTS (طلبات الشيك والحساب) ================= */}
        {activeTab === 'bills' && (
          <div className="space-y-6">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 p-4 rounded-3xl border border-[#E5D5BC]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-[#2D1E18]">طلبات الشيك والحسابات الحية</h2>
                  {billRequestsCount > 0 && (
                    <span className="bg-amber-600 text-white text-xs font-black px-3 py-1 rounded-full animate-pulse shadow-sm">
                      {billRequestsCount} طاولة تطلب الشيك الآن
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#7A614A]">
                  تصنيف مخصص لمتابعة طلبات الفواتير فور إرسالها من الطاولات، مراجعة الأصناف المصورة، وتحصيل الحساب بضغطة زر
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('tables')}
                  className="px-4 py-2.5 rounded-2xl bg-white hover:bg-stone-50 border border-[#D5C2A5] text-[#3D271D] text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
                >
                  <CircleDot size={15} />
                  <span>عرض خريطة الطاولات</span>
                </button>
              </div>
            </div>

            {/* Bill Requests Cards Grid */}
            {(() => {
              const pendingBillTableNums = new Set(
                (billRequests || [])
                  .filter(b => b.status === 'pending' && Number(b.tableNumber) !== 0)
                  .map(b => Number(b.tableNumber))
              );

              const existingRequestingTables = tables.filter(t => 
                Number(t.tableNumber) !== 0 && (
                  t.status === 'bill_requested' || 
                  t.billRequested || 
                  pendingBillTableNums.has(Number(t.tableNumber))
                )
              );

              // If any pending bill belongs to a table not in `tables`, create a placeholder so it is never dropped
              const knownTableNums = new Set(existingRequestingTables.map(t => Number(t.tableNumber)));
              const extraTables: TableInfo[] = [];
              pendingBillTableNums.forEach(tNum => {
                if (!knownTableNums.has(tNum) && tNum !== 0) {
                  const billObj = (billRequests || []).find(b => Number(b.tableNumber) === tNum && b.status === 'pending');
                  extraTables.push({
                    tableNumber: tNum,
                    status: 'bill_requested',
                    billRequested: true,
                    billRequestedAt: billObj?.requestedAt || new Date().toISOString(),
                    activeSessionCustomerName: billObj?.customerName,
                    activeSessionDeviceId: billObj?.deviceId
                  });
                }
              });

              const rawTablesRequestingBill = [...existingRequestingTables, ...extraTables];
              const tablesRequestingBill = rawTablesRequestingBill.filter(table => {
                const tableOrders = safeOrders.filter(o => Number(o.tableNumber) === Number(table.tableNumber) && o.status !== 'cancelled' && !(o as any).settled);
                const billObj = (billRequests || []).find(b => Number(b.tableNumber) === Number(table.tableNumber) && b.status === 'pending');
                const billAmount = typeof billObj?.totalAmount === 'number' ? billObj.totalAmount : (parseFloat(billObj?.totalAmount as any) || 0);
                const calcTotal = tableOrders.reduce((sum, o) => sum + (o.total || 0), 0);
                return tableOrders.length > 0 || billAmount > 0 || calcTotal > 0;
              });
              const otherBusyTables = tables.filter(t => Number(t.tableNumber) !== 0 && t.status === 'busy' && !t.billRequested && !pendingBillTableNums.has(Number(t.tableNumber)));

              if (tablesRequestingBill.length === 0 && otherBusyTables.length === 0) {
                return (
                  <div className="bg-white/80 rounded-3xl p-12 text-center border border-[#E5D5BC] space-y-3">
                    <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-700 mx-auto flex items-center justify-center border border-amber-200">
                      <Receipt size={30} />
                    </div>
                    <h3 className="font-black text-base text-[#2D1E18]">لا توجد طلبات شيك معلقة حالياً</h3>
                    <p className="text-xs text-stone-500 max-w-md mx-auto">
                      بمجرد ضغط أي عميل على زر "طلب الحساب" من هاتفه، ستظهر بطاقة الطاولة هنا فوراً مصحوبة بتنبيه صوتي وكشف حساب كامل بالأصناف المصورة.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  {/* Urgent: Tables that requested Bill */}
                  {tablesRequestingBill.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                        <h3 className="font-black text-base text-[#2D1E18]">طاولات طلبت الحساب الآن ({tablesRequestingBill.length})</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {tablesRequestingBill.map((table) => {
                          const isAvailable = table.status === 'available';
                          const tableOrders = isAvailable ? [] : safeOrders.filter(o => Number(o.tableNumber) === Number(table.tableNumber) && o.status !== 'cancelled' && !(o as any).settled);
                          const activeOrders = tableOrders;
                          const relevantOrders = tableOrders;
                          const calcOrdersTotal = relevantOrders.reduce((sum, o) => {
                            let ordTotal = typeof o.total === 'number' ? o.total : parseFloat(o.total as any);
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
                            return sum + ordTotal;
                          }, 0);
                          const billObj = (billRequests || []).find(b => Number(b.tableNumber) === Number(table.tableNumber) && b.status === 'pending');
                          const billAmount = typeof billObj?.totalAmount === 'number' ? billObj.totalAmount : (parseFloat(billObj?.totalAmount as any) || 0);
                          const totalDue = calcOrdersTotal > 0 ? calcOrdersTotal : billAmount;
                          const durationInfo = getSittingDurationInfo(table);

                          // Aggregate all items ordered across relevant orders
                          const itemMap: Record<string, { menuItem: MenuItem; quantity: number; total: number; notes?: string }> = {};
                          relevantOrders.forEach(order => {
                            (order.items || []).forEach((ci, idx) => {
                              const id = ci?.menuItem?.id || (ci as any)?.menuItemId || (ci as any)?.id || `item_${idx}`;
                              const rawP = ci?.menuItem?.price ?? (ci as any)?.price ?? 0;
                              const numP = typeof rawP === 'number' ? rawP : (parseFloat(String(rawP)) || 0);
                              const itemPrice = !isNaN(numP) && numP >= 0 ? numP : 0;
                              const qty = typeof ci?.quantity === 'number' && ci.quantity > 0 ? ci.quantity : (parseInt(String(ci?.quantity), 10) || 1);

                              const resolvedMenuItem: MenuItem = ci?.menuItem ? {
                                ...ci.menuItem,
                                price: itemPrice
                              } : {
                                id,
                                name: (ci as any)?.name || 'صنف',
                                description: '',
                                image: '',
                                price: itemPrice,
                                categoryId: '',
                                available: true
                              };

                              if (!itemMap[id]) {
                                itemMap[id] = {
                                  menuItem: resolvedMenuItem,
                                  quantity: 0,
                                  total: 0,
                                  notes: ci.notes
                                };
                              }
                              itemMap[id].quantity += qty;
                              itemMap[id].total += itemPrice * qty;
                            });
                          });

                          const aggregatedItems = Object.values(itemMap);

                          return (
                            <div 
                              key={table.tableNumber}
                              className="bg-white rounded-3xl p-5 shadow-md border-2 border-amber-400 ring-4 ring-amber-400/20 flex flex-col justify-between space-y-4 hover:shadow-lg transition-all"
                            >
                              <div className="space-y-3">
                                {/* Card Header */}
                                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-black text-lg shadow-md animate-bounce-subtle">
                                      {table.tableNumber}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <h4 className="font-black text-base text-[#2D1E18]">طاولة ({table.tableNumber})</h4>
                                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                                          طلب الشيك
                                        </span>
                                      </div>
                                      {durationInfo && (
                                        <div className="flex items-center gap-1 mt-1 text-xs text-stone-500">
                                          <Clock size={12} className="text-amber-700" />
                                          <span>مدة الجلوس: </span>
                                          <span className="font-bold text-stone-800">{durationInfo.durationText}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Print Table Bill */}
                                  <button
                                    onClick={() => printThermalTable(table.tableNumber)}
                                    className="p-2 rounded-xl bg-[#eedec6] hover:bg-[#e2ceb0] text-[#3D271D] transition-colors shadow-xs"
                                    title="طباعة الفاتورة الحرارية"
                                  >
                                    <Printer size={16} />
                                  </button>
                                </div>

                                {/* Seating Timing & Session Details */}
                                <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200 text-xs space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-stone-600 font-medium">عدد الطلبات المقدمة:</span>
                                    <span className="font-bold text-[#2D1E18]">{activeOrders.length} طلبات</span>
                                  </div>
                                  {table.firstOrderAt && (
                                    <div className="flex justify-between items-center text-[11px] text-stone-500">
                                      <span>وقت أول طلب:</span>
                                      <span>{new Date(table.firstOrderAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Aggregated Items List with Images */}
                                <div className="space-y-1.5">
                                  <label className="text-xs font-black text-stone-700 block">الأصناف المطلوب محاسبتها:</label>
                                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                                    {aggregatedItems.map((item, idx) => {
                                      const mName = item.menuItem?.name || 'صنف';
                                      const mPrice = item.menuItem?.price ?? 0;

                                      return (
                                        <div key={idx} className="flex items-center justify-between text-xs bg-stone-50 p-2.5 rounded-2xl border border-stone-100">
                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-md bg-[#3D271D] text-white font-black flex items-center justify-center text-[10px] flex-shrink-0">
                                                  {item.quantity}x
                                                </span>
                                                <span className="font-bold text-stone-800 truncate">{mName}</span>
                                              </div>
                                              <span className="text-[10px] text-stone-500 mr-7 block">{mPrice} {currency} للقطعة</span>
                                            </div>
                                          </div>
                                          <span className="font-black text-stone-900 whitespace-nowrap mr-2">
                                            {item.total} {currency}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

                              {/* Total and Settle Action */}
                              <div className="pt-3 border-t border-stone-100 space-y-3">
                                <div className="flex items-center justify-between bg-[#2A1D15] text-white p-3.5 rounded-2xl shadow-sm">
                                  <span className="text-xs font-bold text-stone-300">المبلغ الإجمالي للشيك:</span>
                                  <span className="text-lg font-black text-amber-300">
                                    {totalDue} {currency}
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  {/* Direct Single-Action Bill Settlement */}
                                  <button
                                    onClick={() => handleSettleAndSendCheck(table.tableNumber)}
                                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-98 transition-all"
                                  >
                                    <CheckCircle2 size={18} />
                                    <span>✓ تم تسليم الشيك وتفريغ الطاولة</span>
                                  </button>

                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      onClick={() => printThermalTable(table.tableNumber)}
                                      className="py-2.5 rounded-2xl bg-[#eedec6] hover:bg-[#e2ceb0] text-[#3D271D] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                      <Printer size={14} />
                                      <span>طباعة الشيك</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeliverTable(table.tableNumber)}
                                      className="py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                      <UtensilsCrossed size={14} />
                                      <span>{table.tableDelivered ? 'تم تسليم الأطباق ✓' : 'تسليم الأطباق أولاً'}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Other Busy Tables (Can also request check) */}
                  {otherBusyTables.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-[#E5D5BC]">
                      <h3 className="font-black text-base text-[#2D1E18]">طاولات مشغولة أخرى في الصالة ({otherBusyTables.length})</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {otherBusyTables.map((table) => {
                          const isAvailable = table.status === 'available';
                          const tableOrders = isAvailable ? [] : orders.filter(o => Number(o.tableNumber) === Number(table.tableNumber) && o.status !== 'completed' && o.status !== 'cancelled');
                          const activeOrders = tableOrders;
                          const relevantOrders = tableOrders;
                          const totalDue = relevantOrders.reduce((sum, o) => sum + (o.total || 0), 0);
                          const durationInfo = getSittingDurationInfo(table);

                          return (
                            <div 
                              key={table.tableNumber}
                              className="bg-white rounded-3xl p-4 border border-[#E5D5BC] shadow-xs flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-[#3D271D] text-white flex items-center justify-center font-black text-sm">
                                  {table.tableNumber}
                                </div>
                                <div>
                                  <h4 className="font-black text-sm text-[#2D1E18]">طاولة ({table.tableNumber})</h4>
                                  <p className="text-[11px] text-stone-500">
                                    {activeOrders.length} طلبات &bull; {totalDue} {currency}
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => handleFreeUpTable(table.tableNumber)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors"
                              >
                                تحصيل الحساب
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ================= 3️⃣ PAGE 3: TABLES MANAGEMENT ================= */}
        {activeTab === 'tables' && (
          <div className="space-y-6">
            
            {/* Top Bar: Tables Control & Batch Settlement */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 p-4 rounded-3xl border border-[#E5D5BC]">
              <div>
                <h2 className="text-xl font-black text-[#2D1E18]">خريطة الطاولات والجلسات الحية</h2>
                <p className="text-xs text-[#7A614A]">
                  متابعة حالة الطاولات لحظياً: فارغة (رمادي/أبيض)، مشغولة (أخضر)، أو تطلب الحساب (وامض)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Batch Settlement Button */}
                <button
                  onClick={handleBatchSettlement}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  title="تفريغ وتسوية كافة الطاولات بنهاية اليوم بضغطة زر واحدة"
                >
                  <CheckCheck size={15} className="text-amber-400" />
                  <span>التسوية الجماعية لليوم</span>
                </button>

                {/* Print All QR Stands */}
                <button
                  onClick={printAllQRStands}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 border border-[#D5C2A5] text-xs font-bold text-[#3D271D] flex items-center gap-1.5 shadow-sm"
                >
                  <Printer size={15} />
                  <span>طباعة بطاقات الطاولات</span>
                </button>

                {/* Add Table */}
                <button
                  onClick={handleAddTable}
                  className="px-3.5 py-2 rounded-xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={15} />
                  <span>إضافة طاولة</span>
                </button>
              </div>
            </div>

            {/* Live Tables Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tables.filter(t => Number(t.tableNumber) !== 0).map((table) => {
                const tableNum = Number(table.tableNumber);
                const tableOrders = safeOrders.filter(o => Number(o.tableNumber) === tableNum && o.status !== 'cancelled' && !(o as any).settled && o.status !== 'completed');
                const hasActiveOrders = tableOrders.length > 0;
                const pendingBillObj = (billRequests || []).find(b => Number(b.tableNumber) === tableNum && b.status === 'pending');
                const isBillReq = table.status === 'bill_requested' || Boolean(table.billRequested) || Boolean(pendingBillObj);
                const isBusy = table.status === 'busy' || hasActiveOrders;
                const effectiveStatus = isBillReq ? 'bill_requested' : (isBusy ? 'busy' : 'available');

                const activeOrders = tableOrders;
                const relevantOrders = tableOrders;
                const calcTotal = relevantOrders.reduce((sum, o) => {
                  let ordTotal = typeof o.total === 'number' ? o.total : parseFloat(o.total as any);
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
                  return sum + ordTotal;
                }, 0);
                const pendingBillAmount = typeof pendingBillObj?.totalAmount === 'number' ? pendingBillObj.totalAmount : (parseFloat(pendingBillObj?.totalAmount as any) || 0);
                const totalDue = calcTotal > 0 ? calcTotal : pendingBillAmount;

                let statusBadge = {
                  bg: 'bg-stone-100 text-stone-700 border-stone-300',
                  label: 'فارغة ومتاحة',
                  dot: 'bg-stone-400'
                };

                if (effectiveStatus === 'bill_requested') {
                  statusBadge = {
                    bg: 'bg-amber-100 text-amber-900 border-amber-400 animate-pulse',
                    label: 'تطلب الحساب والشيك',
                    dot: 'bg-amber-600'
                  };
                } else if (effectiveStatus === 'busy') {
                  statusBadge = {
                    bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                    label: 'مشغولة بالعميل',
                    dot: 'bg-emerald-600'
                  };
                }

                const durationInfo = getSittingDurationInfo(table);

                return (
                  <div 
                    key={table.tableNumber}
                    className={`bg-white rounded-3xl p-5 shadow-sm border ${
                      effectiveStatus === 'bill_requested' 
                        ? 'border-amber-400 ring-2 ring-amber-400/40' 
                        : effectiveStatus === 'busy' 
                        ? 'border-emerald-300' 
                        : 'border-[#E5D5BC]'
                    } flex flex-col justify-between space-y-4 hover:shadow-md transition-all`}
                  >
                    <div>
                      {/* Top Header of Table Card */}
                      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-11 h-11 rounded-2xl bg-[#3D271D] text-white flex items-center justify-center font-black text-base shadow">
                            {table.tableNumber}
                          </div>
                          <div>
                            <h3 className="font-black text-sm text-[#2D1E18]">طاولة ({table.tableNumber})</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
                              <span className="text-[11px] font-bold text-stone-600">{statusBadge.label}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteTable(table.tableNumber)}
                          className="text-stone-300 hover:text-rose-600 p-1 transition-colors"
                          title="حذف الطاولة"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Sitting Duration Live Timer Highlight */}
                      {durationInfo && (
                        <div className="mt-3 p-2.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-stone-700">
                            <Clock size={14} className="text-[#8C6D48]" />
                            <span>مدة الجلوس:</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full font-black text-[11px] border ${durationInfo.badgeClass}`}>
                            {durationInfo.durationText}
                          </span>
                        </div>
                      )}

                      {/* Single Session Device Lock State */}
                      {table.activeSessionDeviceId && (
                        <div className="mt-2 p-2 rounded-xl bg-purple-50/70 border border-purple-200 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1 text-purple-900 font-bold">
                            <Lock size={12} className="text-purple-700" />
                            <span>مقفلة لهاتف عميل</span>
                          </div>
                          <button
                            onClick={() => handleUnlockTableSession(table.tableNumber)}
                            className="text-[10px] text-purple-700 hover:text-purple-900 font-black hover:underline"
                            title="إلغاء قفل الجهاز والسماح لأي هاتف بطلب جديد"
                          >
                            فك القفل
                          </button>
                        </div>
                      )}

                      {/* Session Details */}
                      <div className="mt-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-stone-600">
                          <span>الطلبات النشطة:</span>
                          <span className="font-bold text-[#2D1E18]">{activeOrders.length} طلب</span>
                        </div>

                        <div className="flex items-center justify-between text-stone-600">
                          <span>المبلغ المستحق حالياً:</span>
                          <span className="font-black text-base text-[#3D271D]">
                            {totalDue} {currency}
                          </span>
                        </div>

                        {table.firstOrderAt ? (
                          <div className="flex items-center justify-between text-stone-500 text-[11px]">
                            <span>أول طلب تم استلامه:</span>
                            <span>{new Date(table.firstOrderAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : table.seatedAt ? (
                          <div className="flex items-center justify-between text-stone-500 text-[11px]">
                            <span>بدء الجلسة:</span>
                            <span>{new Date(table.seatedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Table Actions */}
                    <div className="pt-3 border-t border-stone-100 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Print Bill Statement */}
                        <button
                          onClick={() => printThermalTable(table.tableNumber)}
                          className="py-2 rounded-xl bg-stone-100 hover:bg-[#eedec6] text-[#3D271D] font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                          title="طباعة كشف حساب الطاولة"
                        >
                          <Printer size={13} />
                          <span>فاتورة الطاولة</span>
                        </button>

                        {/* Free Up Table Button */}
                        <button
                          onClick={() => handleFreeUpTable(table.tableNumber)}
                          className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                            table.status !== 'available'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                              : 'bg-stone-100 text-stone-400 cursor-default'
                          }`}
                          disabled={table.status === 'available'}
                        >
                          <Check size={13} />
                          <span>تفريغ الطاولة</span>
                        </button>
                      </div>

                      {/* Quick direct link test */}
                      <a
                        href={getTableUrl(table.tableNumber)}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-[11px] font-bold text-stone-600 flex items-center justify-center gap-1 transition-colors"
                      >
                        <ExternalLink size={12} />
                        <span>فتح منيو الطاولة</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= 3️⃣ PAGE 3: ANALYTICS & PROFITS (REMOVED) ================= */}
        {false && (
          <div className="space-y-6">
            
            {/* Header & Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[#2D1E18]">الإحصائيات والأرباح المالية</h2>
                <p className="text-xs text-[#7A614A]">نظرة دقيقة على المبيعات، الطلبات، وصافي الأرباح لليوم والشهر</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Delete / Clear Statistics Button */}
                <button
                  type="button"
                  onClick={() => handleClearAllOrdersAndStats(true)}
                  className="px-4 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
                  title="مسح وتصفير كافة إحصائيات المبيعات والأرباح والطلبات"
                >
                  <RotateCcw size={14} className="text-amber-700" />
                  <span>مسح وتصفير الإحصائيات</span>
                </button>

                {/* Delete Orders Data Button */}
                <button
                  type="button"
                  onClick={() => handleClearAllOrdersAndStats(false)}
                  className="px-4 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
                  title="حذف وتفريغ كافة بيانات وسجلات الطلبات نهائياً"
                >
                  <Trash2 size={14} className="text-rose-600" />
                  <span>حذف بيانات الطلبات</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('هل أنت متأكد من مسح كافة معلومات وسجل العملاء (CRM)؟ لا يمكن التراجع عن هذا الإجراء.')) {
                      if (setCustomers) setCustomers([]);
                      try {
                        localStorage.removeItem('smart_menu_customers');
                        localStorage.removeItem('smart_menu_sync_customers');
                      } catch (e) {}
                      try {
                        await fetch('/api/sync/customers', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ data: [], senderId: 'admin-clear-customers' })
                        });
                      } catch (err) {
                        console.warn('Clear customers API error:', err);
                      }
                      addSystemLog?.('system', 'warning', 'تم مسح سجل ومعلومات العملاء', undefined, 'المدير');
                      alert('تم مسح كافة معلومات وسجل العملاء بنجاح.');
                    }
                  }}
                  className="px-4 py-2 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Trash2 size={14} />
                  <span>مسح معلومات العملاء</span>
                </button>
              </div>
            </div>

            {/* Top 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 1. Daily Income */}
              <div className="bg-white rounded-3xl p-5 border border-[#E5D5BC] shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#eedec6] text-[#3D271D] flex items-center justify-center font-black">
                  <DollarSign size={26} />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-500">دخل كام (إجمالي مبيعات اليوم)</p>
                  <h3 className="text-2xl font-black text-[#2D1E18] mt-1">
                    {totalRevenue} <span className="text-xs font-bold text-stone-500">{currency}</span>
                  </h3>
                </div>
              </div>

              {/* 2. Orders Count */}
              <div className="bg-white rounded-3xl p-5 border border-[#E5D5BC] shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#eedec6] text-[#3D271D] flex items-center justify-center font-black">
                  <ClipboardList size={26} />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-500">الطلبات المطلوبة اليوم</p>
                  <h3 className="text-2xl font-black text-[#2D1E18] mt-1">
                    {totalOrdersCount} <span className="text-xs font-bold text-stone-500">طلب</span>
                  </h3>
                </div>
              </div>

              {/* 3. Net Profit Today */}
              <div className="bg-white rounded-3xl p-5 border border-[#E5D5BC] shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <TrendingUp size={26} />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-500">صافي النهاردة (الأرباح الصافية)</p>
                  <h3 className="text-2xl font-black text-emerald-800 mt-1">
                    {netProfitToday} <span className="text-xs font-bold text-emerald-700">{currency}</span>
                  </h3>
                  <p className="text-[10px] text-stone-400 mt-0.5">بنسبة ربح صافية مقدرة {profitMarginPercent}%</p>
                </div>
              </div>
            </div>

            {/* Quick Interactive Financial Controller: نسبة صافي الربح وزر إضافة الضريبة */}
            <div className="bg-white rounded-3xl p-5 border border-[#E5D5BC] shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E5D5BC]/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-[#2D1E18]">
                      التحكم المالي الفوري: نسبة صافي الربح والضريبة
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      تحكم فوري في نسبة تقدير أرباحك وتفعيل/تعطيل الضريبة على الطلبات وتحديث الأرقام لحظياً.
                    </p>
                  </div>
                </div>

                {/* Quick Tax Toggle Button (زر إضافة ضريبة على الطلبات أو لاء) */}
                <div className="flex items-center gap-2 bg-[#FAF6F0] p-1.5 rounded-2xl border border-[#E5D5BC]">
                  <span className="text-xs font-bold text-stone-600 px-2">إضافة الضريبة:</span>
                  <button
                    type="button"
                    onClick={() => handleToggleTaxQuick(false)}
                    className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                      settings.taxEnabled === false
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-white text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    لا (معطلة)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleTaxQuick(true)}
                    className={`px-3.5 py-1 rounded-xl text-xs font-black transition-all ${
                      settings.taxEnabled !== false
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'bg-white text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    ✓ نعم ({settings.taxRate ?? 14}%)
                  </button>
                </div>
              </div>

              {/* Profit Margin Slider & Controls */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-stone-700">نسبة صافي الربح الحالية:</span>
                    <span className="text-sm font-black px-3 py-0.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {profitMarginPercent}%
                    </span>
                    <span className="text-[11px] text-stone-400">
                      (الصافي المحسوب اليوم: <strong className="text-emerald-800">{netProfitToday} {currency}</strong> من إجمالي {totalRevenue} {currency})
                    </span>
                  </div>

                  {/* Direct Number Input */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs font-bold text-stone-500">تعديل مباشر:</span>
                    <input 
                      type="number"
                      min="1"
                      max="100"
                      value={profitMarginPercent}
                      onChange={(e) => handleUpdateProfitMargin(Number(e.target.value))}
                      className="w-16 p-1.5 bg-stone-50 rounded-xl border border-stone-300 text-xs font-black text-center text-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                    <span className="text-xs font-bold text-stone-500">%</span>
                  </div>
                </div>

                {/* Range Slider */}
                <input 
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={profitMarginPercent}
                  onChange={(e) => handleUpdateProfitMargin(Number(e.target.value))}
                  className="w-full accent-emerald-700 cursor-pointer"
                />

                {/* Fast Preset Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-stone-500 ml-1">اختر نسبة سريعة:</span>
                  {[30, 40, 50, 60, 65, 70, 75, 80, 85, 90].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleUpdateProfitMargin(pct)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        profitMarginPercent === pct
                          ? 'bg-emerald-700 text-white shadow-sm font-black ring-2 ring-emerald-200'
                          : 'bg-[#FAF6F0] text-stone-700 border border-[#E5D5BC] hover:bg-stone-100'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>


            {/* Top Items of the Month */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award size={20} className="text-[#8C6D48]" />
                  <h3 className="font-black text-base text-[#2D1E18]">الأكثر طلباً هذا الشهر</h3>
                </div>
                <span className="text-xs text-stone-500 font-bold">بناءً على طلبات الطاولات</span>
              </div>

              {topItems.length === 0 ? (
                <p className="text-stone-500 text-xs text-center py-6">لم يتم تسجيل طلبات كافية لحساب الأصناف الأكثر طلباً</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {topItems.map((entry, idx) => (
                    <div 
                      key={entry.item.id}
                      className="bg-stone-50 rounded-2xl p-3 border border-stone-200 flex items-center gap-3"
                    >
                      <img 
                        src={entry.item.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80'} 
                        alt={entry.item.name || 'صنف'} 
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80'; }}
                        className="w-14 h-14 rounded-xl object-cover border border-stone-200"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] bg-[#eedec6] text-[#3D271D] font-black px-2 py-0.5 rounded-md">
                          المركز #{idx + 1}
                        </span>
                        <h4 className="font-black text-xs text-[#2D1E18] truncate mt-1">{entry.item.name}</h4>
                        <p className="text-[11px] text-stone-500 font-bold">
                          {entry.count} مرات &bull; {entry.totalRevenue} {currency}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visual Analytics Charts: Category Breakdown & Peak Hours */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* Category Breakdown */}
              <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
                <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2">
                  <Layers size={17} className="text-[#8C6D48]" />
                  <span>توزيع المبيعات حسب أقسام المنيو</span>
                </h3>

                <div className="space-y-3">
                  {categories.map((cat) => {
                    const catItems = menuItems.filter(m => m.categoryId === cat.id).map(m => m.id);
                    const catOrdersTotal = safeOrders
                      .filter(o => o.status !== 'cancelled')
                      .reduce((sum, o) => {
                        const sub = (o.items || [])
                          .filter(ci => {
                            const id = ci?.menuItem?.id || (ci as any)?.menuItemId || (ci as any)?.id;
                            return id && catItems.includes(id);
                          })
                          .reduce((s, ci) => s + (((ci?.menuItem?.price ?? (ci as any)?.price) || 0) * (ci?.quantity || 1)), 0);
                        return sum + sub;
                      }, 0);

                    const percentage = totalRevenue > 0 ? Math.round((catOrdersTotal / totalRevenue) * 100) : 0;

                    return (
                      <div key={cat.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>{cat.name}</span>
                          <span>{catOrdersTotal} {currency} ({percentage}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#3D271D] rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Methods & Summary */}
              <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
                <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2">
                  <CreditCard size={17} className="text-[#8C6D48]" />
                  <span>طرق الدفع المستخدمة</span>
                </h3>

                {(() => {
                  const cashOrders = orders.filter(o => o.status !== 'cancelled' && o.paymentMethod !== 'card');
                  const cardOrders = orders.filter(o => o.status !== 'cancelled' && o.paymentMethod === 'card');
                  const cashTotal = cashOrders.reduce((s, o) => s + o.total, 0);
                  const cardTotal = cardOrders.reduce((s, o) => s + o.total, 0);
                  const total = cashTotal + cardTotal;
                  const cashPercent = total > 0 ? Math.round((cashTotal / total) * 100) : 100;
                  const cardPercent = total > 0 ? 100 - cashPercent : 0;

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                          <div className="flex items-center gap-1.5 text-xs text-stone-600 font-bold mb-1">
                            <Banknote size={15} />
                            <span>نقداً (كاش):</span>
                          </div>
                          <p className="text-base font-black text-[#2D1E18]">{cashTotal} {currency}</p>
                          <span className="text-[11px] text-stone-400">{cashPercent}% من المبيعات</span>
                        </div>

                        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                          <div className="flex items-center gap-1.5 text-xs text-stone-600 font-bold mb-1">
                            <CreditCard size={15} />
                            <span>بطاقات وفيزا:</span>
                          </div>
                          <p className="text-base font-black text-[#2D1E18]">{cardTotal} {currency}</p>
                          <span className="text-[11px] text-stone-400">{cardPercent}% من المبيعات</span>
                        </div>
                      </div>

                      <div className="pt-2 text-xs text-stone-500 leading-relaxed border-t border-stone-100">
                        يمكنك ضبط نسبة ضريبة القيمة المضافة ونسبة حساب الأرباح الصافية في صفحة **الإعدادات الشاملة** لحساب التكاليف بدقة متناهية.
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* NEW SECTION: Demand Peak Analysis (Hours & Days) */}
              <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-6">
                <div className="border-b border-stone-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right">
                  <div className="text-right">
                    <h3 className="font-black text-sm text-[#2D1E18] flex items-center justify-end gap-2">
                      <span>تحليل الطلبات وساعات الذروة (من الأعلى للـ أقل طلباً)</span>
                      <TrendingUp size={18} className="text-[#8C6D48]" />
                    </h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">معدلات طلب الزبائن مقسمة حسب أيام الأسبوع وساعات اليوم لتنظيم فترات العمل والموظفين</p>
                  </div>

                  {/* Day Filter dropdown */}
                  <div className="flex items-center gap-2 justify-end self-end sm:self-center">
                    <span className="text-[11px] text-stone-600 font-bold whitespace-nowrap">فلترة ساعات اليوم:</span>
                    <select
                      value={analyticsDayFilter}
                      onChange={(e) => setAnalyticsDayFilter(Number(e.target.value))}
                      className="p-2 bg-stone-50 border border-stone-200 rounded-xl text-[11px] font-bold text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#8C6D48] text-right"
                    >
                      <option value={-1}>جميع أيام الأسبوع</option>
                      {dayNamesArabic.map((name, idx) => (
                        <option key={idx} value={idx}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 1. Days Demand Analysis (Sorted highest to lowest) */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-[#2D1E18] flex items-center gap-1.5 border-b border-stone-50 pb-2 justify-end">
                      <span>أيام الأسبوع الأكثر طلباً ورواجاً</span>
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    </h4>

                    <div className="space-y-3">
                      {sortedDaysDemand.map((d, index) => {
                        const maxDayOrders = Math.max(...daysDemand.map(x => x.orderCount), 1);
                        const barPercent = Math.round((d.orderCount / maxDayOrders) * 100);

                        return (
                          <div key={d.index} className="p-3 bg-stone-50/50 rounded-2xl border border-stone-200/40 flex items-center gap-3 text-right">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center flex-shrink-0">
                              #{index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center text-xs font-black text-[#2D1E18] mb-1">
                                <span className="text-stone-500 font-bold text-[10px]">{d.orderCount} طلب &bull; {d.revenue} {currency}</span>
                                <span>يوم {d.name}</span>
                              </div>
                              <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                                  style={{ width: `${barPercent}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Hourly Demand Analysis (Sorted highest to lowest) */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-[#2D1E18] flex items-center gap-1.5 border-b border-stone-50 pb-2 justify-end">
                      <span>ساعات النشاط والذروة (من الأعلى للـ أقل)</span>
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                    </h4>

                    {sortedHoursDemand.length === 0 ? (
                      <div className="text-center py-10 text-stone-400 text-xs font-medium">
                        لا يوجد مبيعات مسجلة في هذا اليوم لتمثيل الذروة بالساعات
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[380px] overflow-y-auto scrollbar-none pr-1">
                        {sortedHoursDemand.map((h, index) => {
                          const maxHourOrders = Math.max(...hoursDemand.map(x => x.orderCount), 1);
                          const barPercent = Math.round((h.orderCount / maxHourOrders) * 100);
                          
                          const displayHour = h.hour === 0 ? '12:00 ص' : h.hour === 12 ? '12:00 م' : h.hour > 12 ? `${h.hour - 12}:00 م` : `${h.hour}:00 ص`;

                          return (
                            <div key={h.hour} className="p-3 bg-[#FCFBF9] rounded-2xl border border-stone-200/40 flex items-center gap-3 text-right">
                              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 font-black text-xs flex items-center justify-center flex-shrink-0">
                                #{index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center text-xs font-black text-[#2D1E18] mb-1">
                                  <span className="text-stone-500 font-bold text-[10px]">{h.orderCount} طلب &bull; {h.revenue} {currency}</span>
                                  <span>الساعة {displayHour}</span>
                                </div>
                                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-600 rounded-full transition-all duration-300"
                                    style={{ width: `${barPercent}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ================= 4️⃣ PAGE 4: MENU MANAGEMENT (CARD FOLDERS) ================= */}
        {activeTab === 'menu' && (
          <div className="space-y-6">

            {bulkSuccessMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 font-bold text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                  <span>{bulkSuccessMsg}</span>
                </div>
                <button onClick={() => setBulkSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 font-black text-xs">✕</button>
              </div>
            )}
            
            {/* Quick Toggle: Popular Items Section */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E5D5BC] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-black flex-shrink-0">
                  <Award size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-[#2D1E18]">قسم «الأكثر طلباً وشهرة» في المنيو</h3>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                      settings.showPopularSection !== false ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-stone-100 text-stone-600 border border-stone-200'
                    }`}>
                      {settings.showPopularSection !== false ? 'مفعل ويظهر للعملاء' : 'معطل ومخفي'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    إظهار شريط وقائمة المنتجات والمشروبات المميزة والأكثر طلباً بأعلى الصفحة الرئيسية للعميل بتصميم الكروت الحديثة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, showPopularSection: prev.showPopularSection === false ? true : false }))}
                className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out relative flex items-center flex-shrink-0 self-end sm:self-auto ${
                  settings.showPopularSection !== false ? 'bg-emerald-600 justify-end' : 'bg-stone-300 justify-start'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-white shadow-md block transition-transform" />
              </button>
            </div>
            
            {!managingCategoryId ? (
              /* VIEW A: All Category Card Folders */
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 p-4 rounded-3xl border border-[#E5D5BC]">
                  <div>
                    <h2 className="text-xl font-black text-[#2D1E18]">أقسام المنيو (نظام الكروت المنظم)</h2>
                    <p className="text-xs text-[#7A614A]">اضغط على أي كرت قسم لفتح صفحته المستقلة وإدارة أصنافه بالكامل</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => { setBulkCatId('all'); setShowBulkPriceModal(true); }}
                      className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
                      title="زيادة أو تعديل أسعار الأصناف بنسبة مئوية بضغطة زر واحدة"
                    >
                      <TrendingUp size={16} className="text-amber-200" />
                      <span>تحديث الأسعار جماعياً</span>
                    </button>

                    <button
                      onClick={() => setShowAddCatModal(true)}
                      className="px-4 py-2.5 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
                    >
                      <FolderPlus size={16} className="text-[#D4A373]" />
                      <span>+ إضافة قسم جديد</span>
                    </button>

                    <span className="bg-white px-3.5 py-2 rounded-xl border border-[#D5C2A5] text-xs font-bold text-[#3D271D]">
                      {categories.length} أقسام
                    </span>
                  </div>
                </div>

                {/* Categories Grid as Folders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Quick Add Category Card */}
                  <div
                    onClick={() => setShowAddCatModal(true)}
                    className="bg-[#FAF7F2] hover:bg-[#F3EDE2] border-2 border-dashed border-[#D5C2A5] hover:border-[#8C6D48] rounded-3xl p-6 min-h-[200px] flex flex-col items-center justify-center text-center cursor-pointer transition-all group active:scale-98"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white group-hover:bg-[#3D271D] text-[#8C6D48] group-hover:text-white flex items-center justify-center shadow-sm transition-all mb-3">
                      <FolderPlus size={26} />
                    </div>
                    <span className="font-black text-sm text-[#2D1E18]">إضافة قسم جديد</span>
                    <span className="text-[11px] text-stone-500 mt-1">انقر هنا لإنشاء قسم جديد للمنيو فوراً</span>
                  </div>

                  {/* Sort categories by order for admin view */}
                  {[...categories].sort((a, b) => {
                    const oA = typeof a.order === 'number' ? a.order : 0;
                    const oB = typeof b.order === 'number' ? b.order : 0;
                    return oA - oB;
                  }).map((cat, index, arr) => {
                    const count = menuItems.filter(m => m.categoryId === cat.id).length;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => setManagingCategoryId(cat.id)}
                        className="bg-white rounded-3xl overflow-hidden border border-[#E5D5BC] shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col group active:scale-98"
                      >
                        <div className="relative h-36 w-full overflow-hidden bg-stone-100">
                          <img 
                            src={cat.image} 
                            alt={cat.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-between p-3">
                            <span className="bg-white/95 text-[#2D1E18] text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                              {count} أصناف
                            </span>

                            {/* Order Number Badge */}
                            <span className="bg-[#3D271D] text-amber-200 text-[10px] font-black px-2 py-0.5 rounded-full shadow border border-amber-400/30" title="الترتيب في المنيو">
                              #{index + 1}
                            </span>
                          </div>

                          {/* Category Schedule Badge if Enabled */}
                          {cat.scheduleEnabled && (
                            <div className="absolute top-2 right-2 z-10">
                              <span className="bg-amber-900/90 backdrop-blur-md text-amber-200 border border-amber-400/40 text-[9px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                                <Clock size={10} />
                                <span>{cat.scheduleStartTime} - {cat.scheduleEndTime}</span>
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-black text-sm text-[#2D1E18] group-hover:text-[#8C6D48] transition-colors line-clamp-1">
                                  {cat.name}
                                </h3>
                                {cat.nameEn && (
                                  <p className="text-[11px] text-stone-400 font-semibold truncate" dir="ltr">
                                    {cat.nameEn}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                {/* Move Up / Down Buttons for Category Order */}
                                <button
                                  type="button"
                                  onClick={() => handleMoveCategory(cat.id, 'up')}
                                  disabled={index === 0}
                                  className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-[#3D271D] hover:text-white text-stone-600 disabled:opacity-30 disabled:hover:bg-stone-100 disabled:hover:text-stone-600 transition-colors flex items-center justify-center shadow-2xs font-bold text-xs"
                                  title="تحريك القسم للأعلى / البداية"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveCategory(cat.id, 'down')}
                                  disabled={index === arr.length - 1}
                                  className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-[#3D271D] hover:text-white text-stone-600 disabled:opacity-30 disabled:hover:bg-stone-100 disabled:hover:text-stone-600 transition-colors flex items-center justify-center shadow-2xs font-bold text-xs"
                                  title="تحريك القسم للأسفل / النهاية"
                                >
                                  ▼
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditCategory(cat)}
                                  className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-[#3D271D] hover:text-white text-stone-600 transition-colors flex items-center justify-center shadow-2xs"
                                  title="تعديل القسم ومواعيده (الاسم بالعربية والإنجليزية)"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-rose-600 hover:text-white text-stone-600 transition-colors flex items-center justify-center shadow-2xs"
                                  title="حذف القسم"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            <p className="text-[11px] text-stone-500 line-clamp-2 mt-1.5 leading-relaxed">
                              {cat.description}
                            </p>
                            {cat.descriptionEn && (
                              <p className="text-[10px] text-stone-400 line-clamp-1 mt-0.5" dir="ltr">
                                {cat.descriptionEn}
                              </p>
                            )}
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-[#3D271D]">
                            <span>إدارة أصناف القسم</span>
                            <ChevronLeft size={14} className="transform group-hover:-translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add New Category Form */}
                <div className="bg-white rounded-3xl p-5 border border-[#E5D5BC] shadow-sm space-y-3">
                  <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2">
                    <Plus size={16} className="text-[#8C6D48]" />
                    <span>إضافة قسم رئيسي جديد للمنيو (بالعربية والإنجليزية)</span>
                  </h3>

                  <form onSubmit={handleAddCategory} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-700 block">اسم القسم (بالعربية) *</label>
                        <input 
                          type="text"
                          placeholder="مثال: موالح ومقبلات، بيتزا ومعجنات"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-700 block">اسم القسم (بالإنجليزية / English Name)</label>
                        <input 
                          type="text"
                          placeholder="e.g. Appetizers & Snacks, Pizza"
                          value={newCatNameEn}
                          onChange={(e) => setNewCatNameEn(e.target.value)}
                          className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-700 block">وصف القسم (بالعربية)</label>
                        <input 
                          type="text"
                          placeholder="مختصر جذاب يظهر للزبون تحت اسم القسم"
                          value={newCatDesc}
                          onChange={(e) => setNewCatDesc(e.target.value)}
                          className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-700 block">وصف القسم (بالإنجليزية / English Description)</label>
                        <input 
                          type="text"
                          placeholder="Brief description in English"
                          value={newCatDescEn}
                          onChange={(e) => setNewCatDescEn(e.target.value)}
                          className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <div className="flex-1 flex gap-2">
                        <input 
                          type="text"
                          placeholder="رابط صورة القسم أو ارفعها من جهازك"
                          value={newCatImage}
                          onChange={(e) => setNewCatImage(e.target.value)}
                          className="flex-1 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                        />

                        <input 
                          type="file"
                          accept="image/*"
                          ref={catImgInputRef}
                          onChange={handleCatImageFile}
                          className="hidden"
                        />

                        <button
                          type="button"
                          onClick={() => catImgInputRef.current?.click()}
                          disabled={isUploadingCatImg}
                          className="px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-stone-200 flex-shrink-0"
                          title="رفع صورة من الجهاز"
                        >
                          <Upload size={14} />
                          <span>{isUploadingCatImg ? 'جاري...' : 'رفع صورة'}</span>
                        </button>
                      </div>

                      <button
                        type="submit"
                        className="px-6 py-3 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 flex-shrink-0"
                      >
                        <Plus size={16} />
                        <span>حفظ وتثبيت القسم</span>
                      </button>
                    </div>
                  </form>
                </div>
              </>
            ) : (
              /* VIEW B: Dedicated Category Items Page */
              (() => {
                const currentCat = categories.find(c => c.id === managingCategoryId);
                const currentItems = menuItems.filter(m => m.categoryId === managingCategoryId);

                return (
                  <div className="space-y-6">
                    {/* Header with Back Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 p-4 rounded-3xl border border-[#E5D5BC]">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setManagingCategoryId(null)}
                          className="w-9 h-9 rounded-2xl bg-[#eedec6] hover:bg-[#e2ceb0] text-[#3D271D] flex items-center justify-center transition-colors"
                          title="الرجوع لكافة الأقسام"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <div>
                          <h2 className="text-xl font-black text-[#2D1E18]">
                            إدارة أصناف: {currentCat?.name}
                          </h2>
                          <p className="text-xs text-[#7A614A]">{currentItems.length} صنف مسجل في هذا القسم</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => currentCat && handleStartEditCategory(currentCat)}
                          className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs border border-stone-200"
                          title="تعديل اسم القسم ووصفه بالعربية والإنجليزية"
                        >
                          <Pencil size={13} className="text-[#8C6D48]" />
                          <span>تعديل بيانات القسم</span>
                        </button>

                        <button
                          onClick={() => { setBulkCatId(managingCategoryId || 'all'); setShowBulkPriceModal(true); }}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                          title="تعديل أسعار أصناف هذا القسم بنسبة مئوية"
                        >
                          <TrendingUp size={14} className="text-amber-200" />
                          <span>تحديث أسعار هذا القسم</span>
                        </button>

                        <button
                          onClick={() => setShowAddCatModal(true)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <FolderPlus size={14} className="text-[#D4A373]" />
                          <span>+ إضافة قسم آخر</span>
                        </button>

                        <button
                          onClick={() => currentCat && handleDeleteCategory(currentCat.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={13} />
                          <span>حذف هذا القسم</span>
                        </button>

                        <button
                          onClick={() => setManagingCategoryId(null)}
                          className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold"
                        >
                          العودة للأقسام
                        </button>
                      </div>
                    </div>

                    {/* Add New Item to this Category Form */}
                    <div className="bg-white rounded-3xl p-5 border border-[#E5D5BC] shadow-sm space-y-3">
                      <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2">
                        <Plus size={16} className="text-[#8C6D48]" />
                        <span>إضافة صنف جديد لقسم ({currentCat?.name}) - يدعم العربية والإنجليزية</span>
                      </h3>

                      <form onSubmit={handleAddItem} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-700 block">الاسم بالعربية *</label>
                            <input 
                              type="text"
                              placeholder="مثال: كابتشينو إيطالي"
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-700 block">الاسم بالإنجليزية (English Name)</label>
                            <input 
                              type="text"
                              placeholder="e.g. Italian Cappuccino"
                              value={newItemNameEn}
                              onChange={(e) => setNewItemNameEn(e.target.value)}
                              className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                              dir="ltr"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-700 block">السعر ({currency}) *</label>
                            <input 
                              type="number"
                              step="any"
                              placeholder={`السعر بـ ${currency}`}
                              value={newItemPrice}
                              onChange={(e) => setNewItemPrice(e.target.value)}
                              className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-700 block">الوصف بالعربية</label>
                            <input 
                              type="text"
                              placeholder="الوصف والمكونات بالعربية"
                              value={newItemDesc}
                              onChange={(e) => setNewItemDesc(e.target.value)}
                              className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-700 block">الوصف بالإنجليزية (English)</label>
                            <input 
                              type="text"
                              placeholder="Ingredients & details in English"
                              value={newItemDescEn}
                              onChange={(e) => setNewItemDescEn(e.target.value)}
                              className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                              dir="ltr"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-700 block">السعرات الحرارية (اختياري)</label>
                            <input 
                              type="number"
                              placeholder="كالوري (اختياري)"
                              value={newItemCalories}
                              onChange={(e) => setNewItemCalories(e.target.value)}
                              className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                          <div className="flex-1 flex gap-2">
                            <input 
                              type="text"
                              placeholder="رابط صورة الصنف أو ارفعها من جهازك"
                              value={newItemImage}
                              onChange={(e) => setNewItemImage(e.target.value)}
                              className="flex-1 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                            />

                            <input 
                              type="file"
                              accept="image/*"
                              ref={itemImgInputRef}
                              onChange={handleItemImageFile}
                              className="hidden"
                            />

                            <button
                              type="button"
                              onClick={() => itemImgInputRef.current?.click()}
                              disabled={isUploadingItemImg}
                              className="px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-stone-200 flex-shrink-0"
                              title="رفع صورة"
                            >
                              <Upload size={14} />
                              <span>{isUploadingItemImg ? 'جاري...' : 'رفع صورة'}</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-3 text-xs font-bold text-stone-700 px-2">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={newItemIsPopular}
                                  onChange={(e) => setNewItemIsPopular(e.target.checked)}
                                  className="rounded text-[#3D271D]"
                                />
                                <span>الأكثر طلباً</span>
                              </label>

                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={newItemIsNew}
                                  onChange={(e) => setNewItemIsNew(e.target.checked)}
                                  className="rounded text-[#3D271D]"
                                />
                                <span>صنف جديد</span>
                              </label>
                            </div>

                            <button
                              type="submit"
                              className="px-6 py-3 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 flex-shrink-0"
                            >
                              <Plus size={16} />
                              <span>إضافة الصنف للمنيو</span>
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>

                    {/* Items in this Category Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currentItems.map((item) => (
                        <div 
                          key={item.id}
                          className="bg-white rounded-3xl p-4 border border-[#E5D5BC] shadow-sm flex flex-col justify-between space-y-3"
                        >
                          <div className="flex gap-3">
                            <img 
                              src={item.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80'} 
                              alt={item.name || 'صنف'} 
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80'; }}
                              className="w-20 h-20 rounded-2xl object-cover border border-stone-200 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="font-black text-sm text-[#2D1E18] truncate">{item.name}</h4>
                                <span className="font-black text-xs text-[#3D271D] flex-shrink-0">
                                  {item.price} {currency}
                                </span>
                              </div>
                              {item.nameEn && (
                                <p className="text-[10px] text-stone-400 font-semibold truncate" dir="ltr">{item.nameEn}</p>
                              )}
                              <p className="text-[11px] text-stone-500 line-clamp-2 mt-1 leading-relaxed">{item.description}</p>
                              {item.descriptionEn && (
                                <p className="text-[10px] text-stone-400 line-clamp-1 mt-0.5" dir="ltr">{item.descriptionEn}</p>
                              )}
                              {item.calories && (
                                <span className="text-[10px] text-amber-800 font-bold mt-1 inline-block">
                                  {item.calories} كالوري
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Controls: In Stock / Out of Stock Toggle & Popular Star & Edit & Delete */}
                          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleToggleItemStock(item.id)}
                                className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 transition-colors ${
                                  item.available !== false 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                    : 'bg-rose-50 text-rose-800 border-rose-300'
                                }`}
                              >
                                <CircleDot size={12} className={item.available !== false ? 'text-emerald-600' : 'text-rose-600'} />
                                <span>{item.available !== false ? 'متوفر' : 'نافد'}</span>
                              </button>

                              {/* Star toggle button for Most Popular / Best Seller */}
                              <button
                                type="button"
                                onClick={() => handleToggleItemPopular(item.id)}
                                className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 transition-all ${
                                  item.isPopular 
                                    ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs' 
                                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                                }`}
                                title="تمييز أو إلغاء تمييز الصنف في قائمة الأكثر طلباً وشهرة"
                              >
                                <Award size={13} className={item.isPopular ? 'text-amber-600 fill-amber-500' : 'text-stone-400'} />
                                <span>{item.isPopular ? 'الأكثر طلباً ⭐' : 'عادي'}</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditItem(item)}
                                className="text-stone-600 hover:text-[#3D271D] p-1.5 rounded-lg hover:bg-stone-100 transition-colors flex items-center gap-1 text-[11px] font-bold"
                                title="تعديل الصنف (الاسم بالعربي والإنجليزي، السعر، الوصف)"
                              >
                                <Pencil size={13} />
                                <span>تعديل</span>
                              </button>

                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                title="حذف الصنف"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}

          </div>
        )}

        {/* ================= 4.5 PAGE: SPLASH SCREEN & LOADING CONTROL (REMOVED) ================= */}
        {false && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8C6D48] to-[#3D271D] text-white flex items-center justify-center shadow-md flex-shrink-0">
                  <Sparkles size={28} className="text-amber-300 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black text-[#2D1E18]">التحكم في شاشة الدخول والتحميل (Splash Screen)</h2>
                    <span className={`text-xs font-black px-3 py-1 rounded-full ${
                      settings.splashScreenEnabled !== false ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-stone-100 text-stone-600 border border-stone-200'
                    }`}>
                      {settings.splashScreenEnabled !== false ? 'مفعلة وتظهر للعميل' : 'معطلة ومخفية'}
                    </span>
                  </div>
                  <p className="text-xs text-[#7A614A] mt-1">
                    صفحة التحميل والترحيب الفاخرة تظهر للزبون عند فتح المنيو مع شعار الكافيه واسمه وتأثيرات بصرية مميزة.
                  </p>
                </div>
              </div>

              {/* Test Splash Button */}
              <button
                type="button"
                onClick={() => setPreviewSplash(true)}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#BA8E58] to-[#8C6D48] hover:from-[#A87C47] hover:to-[#7A5B37] text-white text-xs font-black shadow-md transition-all flex items-center gap-2 active:scale-95 flex-shrink-0"
              >
                <Play size={16} />
                <span>تجربة ومعاينة شاشة التحميل الآن</span>
              </button>
            </div>

            {/* Main Configuration Card */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-6">
              
              {/* 1. Main On/Off Switch */}
              <div className="flex items-center justify-between p-5 bg-[#FAF4EA] rounded-2xl border border-[#E5D7C2]">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-[#2D1E18]">
                      زر القفل والتشغيل الرئيسي لشاشة التحميل
                    </h3>
                    <span className="text-[11px] font-bold text-[#8C6D48]">
                      ({settings.splashScreenEnabled !== false ? 'حالة التشغيل: مفعل' : 'حالة التشغيل: معطل'})
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    عند التفعيل، سيرى كل عميل يفتح المنيو شاشة ترحيبية أنيقة بشعار كافيهك وعداد تحميل ذكي قبل الدخول للمنيو.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, splashScreenEnabled: prev.splashScreenEnabled === false ? true : false }))}
                  className={`w-16 h-9 rounded-full p-1 transition-colors duration-200 ease-in-out relative flex items-center flex-shrink-0 ${
                    settings.splashScreenEnabled !== false ? 'bg-emerald-600 justify-end' : 'bg-stone-300 justify-start'
                  }`}
                >
                  <span className="w-7 h-7 rounded-full bg-white shadow-md block transition-transform" />
                </button>
              </div>

              {/* 2. Parameters (Duration, Slogan, Logo) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Duration Control */}
                <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                      <Clock size={15} className="text-[#8C6D48]" />
                      <span>مدة ظهور شاشة التحميل (بالثواني)</span>
                    </label>
                    <span className="text-sm font-black text-[#3D271D] bg-white px-3 py-1 rounded-xl border border-stone-200 shadow-2xs">
                      {settings.splashDuration || 2} ثوانٍ
                    </span>
                  </div>

                  <input 
                    type="range"
                    min="1"
                    max="6"
                    step="1"
                    value={settings.splashDuration || 2}
                    onChange={(e) => setSettings(prev => ({ ...prev, splashDuration: parseInt(e.target.value, 10) || 2 }))}
                    className="w-full accent-[#3D271D] cursor-pointer"
                  />

                  <div className="flex justify-between text-[11px] text-stone-500 font-bold">
                    <span>1 ثانية (سريع جداً)</span>
                    <span>2 ثانية (موصى به)</span>
                    <span>6 ثوانٍ (عرض هادئ)</span>
                  </div>
                </div>

                {/* Slogan / Subtitle Control */}
                <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <label className="text-xs font-black text-stone-800 block">
                    العبارة الترحيبية أو السلوجان أسفل الشعار
                  </label>
                  <input 
                    type="text"
                    value={settings.splashSubtitle || ''}
                    placeholder="مثال: مرحباً بكم في تجربة القهوة الفاخرة"
                    onChange={(e) => setSettings(prev => ({ ...prev, splashSubtitle: e.target.value }))}
                    className="w-full p-3 bg-white rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                  />
                  <p className="text-[11px] text-stone-500">تظهر هذه الرسالة الترحيبية أسفل اسم الكافيه أثناء التحميل</p>
                </div>

                {/* Splash Logo URL & Customization */}
                <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 md:col-span-2">
                  <label className="text-xs font-black text-stone-800 block">
                    لوجو شاشة التحميل (افتراضياً يستخدم لوجو الكافيه الرئيسي)
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <img 
                      src={settings.splashLogoUrl || settings.logoUrl} 
                      alt="Splash Logo" 
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-[#D4A373] shadow-md bg-stone-900 flex-shrink-0"
                    />
                    <input 
                      type="text"
                      value={settings.splashLogoUrl || ''}
                      placeholder="رابط صورة لوجو مخصص لشاشة البداية (اختياري - اتركه فارغاً لاستخدام لوجو الكافيه)"
                      onChange={(e) => setSettings(prev => ({ ...prev, splashLogoUrl: e.target.value }))}
                      className="flex-1 p-3 bg-white rounded-xl border border-stone-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                    />
                    {settings.splashLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, splashLogoUrl: undefined }))}
                        className="px-4 py-3 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold transition-colors whitespace-nowrap"
                      >
                        استعادة اللوجو الرئيسي
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Action Preview */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between flex-wrap gap-3">
                <span className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>يتم حفظ جميع التعديلات تلقائياً وفورياً</span>
                </span>

                <button
                  type="button"
                  onClick={() => setPreviewSplash(true)}
                  className="px-6 py-2.5 rounded-xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-black shadow-md flex items-center gap-2"
                >
                  <Play size={14} />
                  <span>معاينة شاشة البداية مباشرة</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ================= 5️⃣ PAGE 5: QR SYSTEM ================= */}
        {activeTab === 'qr' && (
          <div className="space-y-6">
            
            {/* Main Mode Toggle Switch */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-[#2D1E18]">نظام باركود الطاولات (QR Codes)</h2>
                  <p className="text-xs text-[#7A614A]">اختر بين توليد كود مخصص لكل طاولة أو كود موحد لكافة الطاولات</p>
                </div>

                {/* The Main Toggle Switch */}
                <div className="flex items-center gap-3 bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, qrMode: 'per_table' }))}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      settings.qrMode !== 'unified'
                        ? 'bg-[#3D271D] text-white shadow-sm'
                        : 'text-stone-600 hover:text-black'
                    }`}
                  >
                    <CircleDot size={13} className={settings.qrMode !== 'unified' ? 'text-emerald-400' : ''} />
                    <span>QR مخصص لكل طاولة</span>
                  </button>

                  <button
                    onClick={() => setSettings(prev => ({ ...prev, qrMode: 'unified' }))}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      settings.qrMode === 'unified'
                        ? 'bg-[#3D271D] text-white shadow-sm'
                        : 'text-stone-600 hover:text-black'
                    }`}
                  >
                    <QrCode size={13} />
                    <span>QR موحد عام</span>
                  </button>
                </div>
              </div>

              {/* Status Explanation */}
              <div className="p-3.5 bg-[#eedec6]/40 rounded-2xl border border-[#D5C2A5] text-xs text-[#3D271D]">
                {settings.qrMode !== 'unified' ? (
                  <p className="leading-relaxed">
                    <strong>الوضع النشط: QR مخصص لكل طاولة</strong> &bull; عند مسح العميل للباركود بكاميرا هاتفه، يتم فتح المنيو وتثبيت رقم طاولته تلقائياً دون أي حاجة للإدخال اليدوي.
                  </p>
                ) : (
                  <p className="leading-relaxed">
                    <strong>الوضع النشط: QR موحد عام</strong> &bull; يتم طباعة باركود واحد مشترك لكافة الطاولات، وعند فتح المنيو يختار العميل رقم طاولته بسهولة من قائمة منسدلة.
                  </p>
                )}
              </div>
            </div>

            {/* QR Tools & Table Creation Controls */}
            <div className="bg-white rounded-3xl p-5 border border-[#E5D5BC] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Printer size={18} className="text-[#8C6D48]" />
                  <div>
                    <h3 className="font-black text-sm text-[#2D1E18]">أدوات إنشاء وطباعة الستاندات (QR Stands)</h3>
                    <p className="text-[11px] text-stone-500">الطاولات محفوظة بشكل دائم ومزامنة آلياً مع قواعد البيانات</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleAddTable}
                    className="px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-[#3D271D] font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Plus size={14} />
                    <span>إضافة طاولة مفردة</span>
                  </button>

                  <button
                    onClick={() => setShowBatchTableModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Layers size={14} />
                    <span>إنشاء دفعة طاولات</span>
                  </button>

                  <button
                    onClick={printAllQRStands}
                    className="px-4 py-2 rounded-xl bg-[#3D271D] hover:bg-[#2A1D15] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <Printer size={15} />
                    <span>طباعة جميع ستاندات الطاولات</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Individual QR Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* 👁️ VIEW-ONLY / PREVIEW MENU CARD (FOR SOCIAL MEDIA / INSTAGRAM BIO) */}
              {(() => {
                const previewUrl = getViewOnlyUrl();
                const previewQrImage = getQRImageUrl(previewUrl);

                return (
                  <div className="bg-gradient-to-br from-amber-50 via-white to-amber-100/50 rounded-3xl p-5 border-2 border-amber-400 shadow-md flex flex-col items-center text-center space-y-3 relative">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-black text-sm text-[#2D1E18] flex items-center gap-1.5">
                        <Eye size={16} className="text-amber-700" />
                        <span>منيو المشاهدة فقط</span>
                      </span>
                      <span className="text-[10px] bg-amber-600 text-white font-black px-2.5 py-0.5 rounded-full shadow-xs">
                        بدون ربط بطاولة 🌐
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-600 leading-snug">
                      رابط مخصص لنشره على إنستجرام، واتساب، وسوشيال ميديا لمشاهدة الأسعار والمنيو دون إمكانية الطلب
                    </p>

                    {/* QR Code Graphic */}
                    <div className="p-3 bg-white rounded-2xl border-2 border-amber-300 shadow-inner">
                      <img 
                        src={previewQrImage} 
                        alt="QR منيو المشاهدة فقط"
                        className="w-40 h-40 object-contain mx-auto"
                      />
                    </div>

                    <p className="text-[11px] text-stone-500 max-w-xs break-all line-clamp-1 font-mono">{previewUrl}</p>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 w-full pt-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(previewUrl);
                          alert('تم نسخ رابط استعراض المنيو (للمشاهدة فقط بدون طلب) بنجاح! يمكنك نشره في البايو أو السوشيال ميديا ✓');
                        }}
                        className="py-2.5 rounded-xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                      >
                        <Copy size={13} />
                        <span>نسخ الرابط</span>
                      </button>

                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <ExternalLink size={13} />
                        <span>تجربة الرابط</span>
                      </a>
                    </div>
                  </div>
                );
              })()}

              {/* TABLE QR CARDS */}
              {tables.filter(t => Number(t.tableNumber) !== 0).map((table) => {
                const url = getTableUrl(table.tableNumber);
                const qrImage = getQRImageUrl(url);

                return (
                  <div 
                    key={table.tableNumber}
                    className="bg-white rounded-3xl p-5 border border-[#E5D5BC] shadow-sm flex flex-col items-center text-center space-y-3 relative"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-black text-sm text-[#2D1E18]">طاولة رقم ({table.tableNumber})</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] bg-[#eedec6] text-[#3D271D] font-bold px-2 py-0.5 rounded-full">
                          {settings.qrMode === 'unified' ? 'كود عام' : `طاولة ${table.tableNumber}`}
                        </span>
                        <button
                          onClick={() => handleDeleteTable(table.tableNumber)}
                          className="text-stone-400 hover:text-red-600 transition-colors p-1"
                          title="حذف الطاولة"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* QR Code Graphic */}
                    <div className="p-3 bg-white rounded-2xl border-2 border-stone-200 shadow-inner">
                      <img 
                        src={qrImage} 
                        alt={`QR طاولة ${table.tableNumber}`}
                        className="w-40 h-40 object-contain mx-auto"
                      />
                    </div>

                    <p className="text-[11px] text-stone-500 max-w-xs break-all line-clamp-1">{url}</p>

                    {/* Actions: Copy Link & Download Image */}
                    <div className="grid grid-cols-2 gap-2 w-full pt-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(url);
                          alert(`تم نسخ رابط طاولة (${table.tableNumber}) بنجاح!`);
                        }}
                        className="py-2 rounded-xl bg-stone-100 hover:bg-[#eedec6] text-[#3D271D] text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Copy size={13} />
                        <span>نسخ الرابط</span>
                      </button>

                      <a
                        href={qrImage}
                        target="_blank"
                        rel="noreferrer"
                        download={`table-${table.tableNumber}-qr.png`}
                        className="py-2 rounded-xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Download size={13} />
                        <span>تحميل PNG</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ================= 6️⃣ PAGE 6: SETTINGS ================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            
            {/* Header */}
            <div>
              <h2 className="text-xl font-black text-[#2D1E18]">
                {currentLang === 'en' ? 'System & Venue Settings' : 'الإعدادات الشاملة للمكان'}
              </h2>
              <p className="text-xs text-[#7A614A]">
                {currentLang === 'en' ? 'Customize language, identity, currency, notifications, and security' : 'تخصيص لغة النظام والهوية، العملة والضرائب، نغمات التنبيه، وأمان لوحة الإدارة'}
              </p>
            </div>

            {/* SECTION: MongoDB Atlas Cloud & Hybrid Database */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                    <Database size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm text-[#2D1E18]">
                        قاعدة بيانات MongoDB Atlas والسحابة الهجينة
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                        mongoStatus?.connected
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {mongoStatus?.connected ? '🟢 متصل بسحابة MongoDB Atlas' : '🟠 وضع التخزين الهجين (محلي + سحابي جاهز)'}
                      </span>
                    </div>
                    <p className="text-xs text-[#7A614A] mt-0.5">
                      قاعدة بيانات سحابية متقدمة مع مرونة عدم انقطاع الخدمة (Offline-First) لضمان عدم ضياع أي طلبات حتى عند بطء أو انقطاع الإنترنت.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    type="button"
                    onClick={checkMongoStatus}
                    className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#3D271D] text-xs font-bold flex items-center gap-1.5 transition-all"
                    title="فحص حالة الاتصال بقاعدة البيانات"
                  >
                    <RefreshCw size={13} />
                    <span>فحص الاتصال</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleManualMongoSync}
                    disabled={isSyncingMongo}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Cloud size={14} className={isSyncingMongo ? 'animate-bounce' : ''} />
                    <span>{isSyncingMongo ? 'جاري المزامنة...' : 'مزامنة السحابة الآن'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#F2EADB] text-xs">
                <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#EDE4D5]">
                  <span className="text-[#8C6D48] text-[10px] block font-bold">اسم قاعدة البيانات (Database):</span>
                  <span className="font-black text-[#2D1E18] text-xs">{mongoStatus?.dbName || 'smart_menu_db'}</span>
                </div>
                <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#EDE4D5]">
                  <span className="text-[#8C6D48] text-[10px] block font-bold">نوع البنية والمزامنة:</span>
                  <span className="font-black text-[#2D1E18] text-xs">Hybrid Storage + Real-Time SSE</span>
                </div>
                <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#EDE4D5]">
                  <span className="text-[#8C6D48] text-[10px] block font-bold">حالة التوافقية والأمان:</span>
                  <span className="font-black text-emerald-800 text-xs">مؤمّنة ومعزولة بالكامل 100%</span>
                </div>
              </div>
            </div>

            {/* SECTION: Mobile Lock Screen Web Push Notifications */}
            <PushNotificationsSettings settings={settings} setSettings={setSettings} />

            {/* SECTION: System Data Backup and Recovery */}
            <div className="bg-gradient-to-br from-[#FCFBF9] to-[#F5EFEB] rounded-3xl p-6 border-2 border-dashed border-[#E5D5BC] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right">
                <div className="text-right">
                  <h3 className="font-black text-sm text-[#2D1E18] flex items-center justify-end gap-2">
                    <span>النسخ الاحتياطي وإدارة بيانات السيستم</span>
                    <Shield size={18} className="text-[#8C6D48]" />
                  </h3>
                  <p className="text-[11px] text-[#7A614A]">قم بتصدير وحفظ نسخة من بيانات الكافيه (الأصناف، المبيعات، الطلبات، الإعدادات، والشات بوت) واستعادتها بضغطة زر عند الحاجة لتجنب حدوث أي مشاكل بالبيانات</p>
                </div>

                <div className="flex gap-2.5 justify-end flex-wrap sm:flex-nowrap">
                  {/* Export Button */}
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Download size={14} />
                    <span>تصدير وحفظ نسخة الاحتياط</span>
                  </button>

                  {/* Import Button */}
                  <label className="px-4 py-2.5 rounded-xl bg-[#3D271D] hover:bg-[#2D1D15] text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition-all">
                    <Upload size={14} />
                    <span>استيراد واستعادة البيانات</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>

                  {/* Clean Rebuild / Replace Data Button */}
                  <button
                    type="button"
                    onClick={handleResetAllDataClean}
                    className="px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
                    title="تفريغ الطلبات القديمة وتحرير كافة الطاولات وتهيئة الداتا"
                  >
                    <RefreshCw size={14} />
                    <span>تبديل وبناء البيانات (وضع نظيف)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 0: System Language Setting */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2">
                  <Globe size={18} className="text-[#8C6D48]" />
                  <span>{tAdmin.systemLanguage} وتخصيص المنيو ثنائي اللغة</span>
                </h3>
                {langSavedMsg && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 flex items-center gap-1 animate-in fade-in">
                    <Check size={14} />
                    <span>{currentLang === 'en' ? 'Language Saved!' : 'تم حفظ اللغة المفضلة!'}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600">
                {tAdmin.systemLanguageSub}
              </p>

              {/* Default Language Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Arabic Option */}
                <button
                  type="button"
                  onClick={() => handleSaveLanguage('ar')}
                  className={`p-4 rounded-2xl border-2 text-right transition-all flex items-center justify-between cursor-pointer ${
                    currentLang === 'ar'
                      ? 'bg-amber-50/80 border-[#3D271D] shadow-sm'
                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🇸🇦</span>
                    <div>
                      <h4 className="font-black text-sm text-[#2D1E18]">{tAdmin.arabicLanguage}</h4>
                      <p className="text-[11px] text-stone-500">من اليمين إلى اليسار (RTL)</p>
                    </div>
                  </div>
                  {currentLang === 'ar' && (
                    <div className="w-6 h-6 rounded-full bg-[#3D271D] text-white flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                  )}
                </button>

                {/* English Option */}
                <button
                  type="button"
                  onClick={() => handleSaveLanguage('en')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between cursor-pointer ${
                    currentLang === 'en'
                      ? 'bg-amber-50/80 border-[#3D271D] shadow-sm'
                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🇬🇧</span>
                    <div>
                      <h4 className="font-black text-sm text-[#2D1E18]">{tAdmin.englishLanguage}</h4>
                      <p className="text-[11px] text-stone-500">Left-to-Right (LTR)</p>
                    </div>
                  </div>
                  {currentLang === 'en' && (
                    <div className="w-6 h-6 rounded-full bg-[#3D271D] text-white flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                  )}
                </button>
              </div>

              {/* Bilingual Menu & Auto Browser Detection Toggles */}
              <div className="pt-3 border-t border-stone-200/80 space-y-3">
                <h4 className="font-black text-xs text-[#2D1E18]">إعدادات العرض ثنائي اللغة ومطابقة المتصفح للزبائن:</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Enable Bilingual Menu */}
                  <label className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between cursor-pointer hover:bg-stone-100/80 transition-all">
                    <div>
                      <span className="font-bold text-xs text-[#2D1E18] block">دعم القائمة والأسعار باللغتين</span>
                      <span className="text-[10px] text-stone-500">إتاحة الترجمة التلقائية والأسعار ثنائية اللغة (EGP / ج.م)</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={settings.enableBilingualMenu !== false}
                      onChange={(e) => {
                        setSettings(prev => ({ ...prev, enableBilingualMenu: e.target.checked }));
                      }}
                      className="w-5 h-5 rounded-md text-amber-700 focus:ring-amber-500 accent-[#3D271D]"
                    />
                  </label>

                  {/* Auto Browser Detection */}
                  <label className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between cursor-pointer hover:bg-stone-100/80 transition-all">
                    <div>
                      <span className="font-bold text-xs text-[#2D1E18] block">تبديل تلقائي بناءً على متصفح الزبون</span>
                      <span className="text-[10px] text-stone-500">اكتشاف لغة الهاتف/المتصفح وعرض المنيو بها تلقائياً</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={settings.autoDetectBrowserLanguage !== false}
                      onChange={(e) => {
                        setSettings(prev => ({ ...prev, autoDetectBrowserLanguage: e.target.checked }));
                      }}
                      className="w-5 h-5 rounded-md text-amber-700 focus:ring-amber-500 accent-[#3D271D]"
                    />
                  </label>

                  {/* Show Language Toggle in Menu */}
                  <label className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between cursor-pointer hover:bg-stone-100/80 transition-all">
                    <div>
                      <span className="font-bold text-xs text-[#2D1E18] block">زر تبديل اللغة للعملاء</span>
                      <span className="text-[10px] text-stone-500">إظهار كبسة (🌐 English / العربية) في أعلى صفحة المنيو</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={settings.showLanguageToggleInMenu !== false}
                      onChange={(e) => {
                        setSettings(prev => ({ ...prev, showLanguageToggleInMenu: e.target.checked }));
                      }}
                      className="w-5 h-5 rounded-md text-amber-700 focus:ring-amber-500 accent-[#3D271D]"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* SECTION 1: Cafe Identity & Visuals */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
              <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2">
                <Store size={17} className="text-[#8C6D48]" />
                <span>الهوية، اللوجو، واسم المكان</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">اسم المطعم/الكافيه (بالعربية)</label>
                  <input 
                    type="text"
                    value={systemNameInput}
                    onChange={(e) => setSystemNameInput(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">الاسم بالإنجليزية (اختياري)</label>
                  <input 
                    type="text"
                    value={systemNameEnInput || ''}
                    placeholder="Smart Café & Resto"
                    onChange={(e) => setSystemNameEnInput(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                  />
                </div>
              </div>

              
              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleSaveIdentity}
                  className="px-5 py-2.5 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-bold shadow-sm transition-all"
                >
                  حفظ اسم المكان
                </button>
                {identitySavedMsg && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 flex items-center gap-1">
                    <Check size={14} />
                    <span>تم الحفظ!</span>
                  </span>
                )}
              </div>

              {/* Logo & Cover Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex items-center gap-3">
                  <img 
                    src={settings.logoUrl} 
                    alt="Logo" 
                    className="w-16 h-16 rounded-xl object-cover border border-stone-300"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-[#2D1E18] block mb-1">شعار المكان (Logo)</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={logoInputRef} 
                      onChange={handleLogoUpload} 
                      className="hidden" 
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 text-xs font-bold text-[#3D271D] flex items-center gap-1"
                    >
                      <Upload size={12} />
                      <span>رفع لوجو جديد</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex items-center gap-3">
                  <img 
                    src={settings.coverImageUrl || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80'} 
                    alt="Cover" 
                    className="w-20 h-16 rounded-xl object-cover border border-stone-300"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-[#2D1E18] block mb-1">صورة الغلاف (Header Banner)</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={coverInputRef} 
                      onChange={handleCoverUpload} 
                      className="hidden" 
                    />
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 text-xs font-bold text-[#3D271D] flex items-center gap-1"
                    >
                      <Upload size={12} />
                      <span>رفع صورة غلاف</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 1.5: Browser Titles & Favicons (Admin & Client Menu) */}
            <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#E5D5BC] shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#eedec6] text-[#3D271D] flex items-center justify-center font-bold">
                    <Globe size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-[#2D1E18]">
                      أيقونات وعناوين المتصفح (Favicon & Browser Tab Titles)
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      تحكم بأيقونة واسم التبويب الظاهر للعميل في شريط المتصفح، ولأيقونة واسم تبويب لوحة الإدارة
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleSaveBrowserBrand}
                    className="px-4 py-2 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-black shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Check size={14} />
                    <span>حفظ وتطبيق إعدادات المتصفح</span>
                  </button>
                </div>
              </div>

              {browserBrandSavedMsg && (
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <Check size={16} className="text-emerald-600" />
                  <span>تم حفظ وتطبيق عناوين وأيقونات المتصفح بنجاح! تم تحديث التبويب الحالي فوراً.</span>
                </div>
              )}

              {/* Hidden file inputs for favicon uploads */}
              <input
                type="file"
                accept="image/*"
                ref={adminFaviconFileRef}
                onChange={handleAdminFaviconUpload}
                className="hidden"
              />
              <input
                type="file"
                accept="image/*"
                ref={menuFaviconFileRef}
                onChange={handleMenuFaviconUpload}
                className="hidden"
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* 1. Client Menu Tab Branding */}
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/40 border border-[#E5D5BC] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📱</span>
                      <h4 className="font-black text-xs sm:text-sm text-[#2D1E18]">
                        صفحة المنيو للعملاء (Customer Menu)
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                      تظهر للزبائن
                    </span>
                  </div>

                  {/* Simulated Browser Tab Preview */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-stone-500 block">معاينة شكل التبويب في متصفح الزبون:</span>
                    <div className="bg-stone-200 p-1.5 rounded-t-xl flex items-center">
                      <div className="bg-white rounded-t-lg px-3 py-1.5 flex items-center gap-2 shadow-xs border-t border-x border-stone-300 max-w-xs">
                        <img 
                          src={menuFaviconInput || settings.logoUrl} 
                          alt="Menu Favicon" 
                          className="w-4 h-4 rounded-full object-cover border border-stone-200 flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).src = settings.logoUrl; }}
                        />
                        <span className="text-xs font-bold text-stone-800 truncate max-w-[160px]">
                          {menuPageTitleInput || `${settings.systemName || 'Smart Café'} - المنيو`}
                        </span>
                        <span className="text-[10px] text-stone-400 font-bold ml-1 hover:text-stone-700 cursor-pointer">✕</span>
                      </div>
                    </div>
                  </div>

                  {/* Title Input */}
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      عنوان تبويب صفحة المنيو (Browser Title)
                    </label>
                    <input 
                      type="text"
                      value={menuPageTitleInput}
                      onChange={(e) => setMenuPageTitleInput(e.target.value)}
                      placeholder="مثال: كافيه الأندلس - المنيو الإلكتروني الذكي"
                      className="w-full p-2.5 bg-white rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                    />
                  </div>

                  {/* Favicon Control */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-700 block">
                      أيقونة متصفح المنيو (Menu Favicon)
                    </label>
                    <div className="flex items-center gap-3">
                      <img 
                        src={menuFaviconInput || settings.logoUrl} 
                        alt="Menu Favicon" 
                        className="w-12 h-12 rounded-xl object-cover border border-stone-300 shadow-xs bg-stone-100 flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = settings.logoUrl; }}
                      />
                      <div className="flex-1 space-y-1.5">
                        <input 
                          type="text"
                          value={menuFaviconInput}
                          onChange={(e) => setMenuFaviconInput(e.target.value)}
                          placeholder="رابط صورة مباشر للأيقونة (URL)"
                          className="w-full p-2 bg-white rounded-xl border border-stone-200 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => menuFaviconFileRef.current?.click()}
                            disabled={isUploadingMenuFavicon}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                          >
                            <Upload size={11} />
                            <span>{isUploadingMenuFavicon ? 'جاري التحميل...' : 'رفع أيقونة من الجهاز'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMenuFaviconInput(settings.logoUrl)}
                            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-bold"
                          >
                            استخدام لوجو المكان
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Admin Dashboard Tab Branding */}
                <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">💼</span>
                      <h4 className="font-black text-xs sm:text-sm text-[#2D1E18]">
                        صفحة لوحة الإدارة (Admin Dashboard)
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-stone-700 bg-stone-200 px-2 py-0.5 rounded-md">
                      خاص بالإدارة والكاشير
                    </span>
                  </div>

                  {/* Simulated Browser Tab Preview */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-stone-500 block">معاينة شكل التبويب في متصفح الأدمن:</span>
                    <div className="bg-stone-200 p-1.5 rounded-t-xl flex items-center">
                      <div className="bg-white rounded-t-lg px-3 py-1.5 flex items-center gap-2 shadow-xs border-t border-x border-stone-300 max-w-xs">
                        <img 
                          src={adminFaviconInput || settings.logoUrl} 
                          alt="Admin Favicon" 
                          className="w-4 h-4 rounded-full object-cover border border-stone-200 flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).src = settings.logoUrl; }}
                        />
                        <span className="text-xs font-bold text-stone-800 truncate max-w-[160px]">
                          {adminPageTitleInput || `لوحة الإدارة - ${settings.systemName || 'Smart Café'}`}
                        </span>
                        <span className="text-[10px] text-stone-400 font-bold ml-1 hover:text-stone-700 cursor-pointer">✕</span>
                      </div>
                    </div>
                  </div>

                  {/* Title Input */}
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      عنوان تبويب لوحة الإدارة (Browser Title)
                    </label>
                    <input 
                      type="text"
                      value={adminPageTitleInput}
                      onChange={(e) => setAdminPageTitleInput(e.target.value)}
                      placeholder="مثال: لوحة الإدارة والتحكم - كافيه الأندلس"
                      className="w-full p-2.5 bg-white rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                    />
                  </div>

                  {/* Favicon Control */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-700 block">
                      أيقونة متصفح الإدارة (Admin Favicon)
                    </label>
                    <div className="flex items-center gap-3">
                      <img 
                        src={adminFaviconInput || settings.logoUrl} 
                        alt="Admin Favicon" 
                        className="w-12 h-12 rounded-xl object-cover border border-stone-300 shadow-xs bg-stone-100 flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = settings.logoUrl; }}
                      />
                      <div className="flex-1 space-y-1.5">
                        <input 
                          type="text"
                          value={adminFaviconInput}
                          onChange={(e) => setAdminFaviconInput(e.target.value)}
                          placeholder="رابط صورة مباشر للأيقونة (URL)"
                          className="w-full p-2 bg-white rounded-xl border border-stone-200 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => adminFaviconFileRef.current?.click()}
                            disabled={isUploadingAdminFavicon}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                          >
                            <Upload size={11} />
                            <span>{isUploadingAdminFavicon ? 'جاري التحميل...' : 'رفع أيقونة من الجهاز'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdminFaviconInput(settings.logoUrl)}
                            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-bold"
                          >
                            استخدام لوجو المكان
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleSaveBrowserBrand}
                  className="px-6 py-2.5 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-black shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Check size={14} />
                  <span>حفظ وتطبيق إعدادات المتصفح الفورية</span>
                </button>

                {browserBrandSavedMsg && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 flex items-center gap-1">
                    <Check size={14} />
                    <span>تم التحديث فوراً!</span>
                  </span>
                )}
              </div>
            </div>

            {/* SECTION 2: Currency, Taxes & Profit Calculations */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5D5BC]/60 pb-4">
                <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2">
                  <DollarSign size={18} className="text-[#8C6D48]" />
                  <span>العملة، الضرائب، وحساب صافي الأرباح</span>
                </h3>
                {financialSavedMsg && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5 animate-in fade-in">
                    <Check size={14} />
                    <span>تم حفظ الإعدادات المالية والضريبية بنجاح!</span>
                  </span>
                )}
              </div>

              {/* 1. Tax Toggle: إضافة ضريبة علي الطلبات أو لاء */}
              <div className="bg-[#FAF6F0] rounded-2xl p-4 border border-[#E5D5BC] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#2D1E18]">زر إضافة ضريبة على الطلبات أو لا</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${taxEnabledInput ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-stone-200 text-stone-700'}`}>
                        {taxEnabledInput ? 'الضريبة مفعّلة (نعم)' : 'الضريبة معطّلة (لا)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">
                      تحكم فوري في إضافة نسبة الضريبة على فواتير وطلبات الزبائن أو إلغائها تماماً.
                    </p>
                  </div>

                  {/* Toggle button */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleToggleTaxQuick(false)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                        !taxEnabledInput
                          ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-200'
                          : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      لا (إلغاء الضريبة)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleTaxQuick(true)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                        taxEnabledInput
                          ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-200'
                          : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      ✓ نعم (إضافة ضريبة)
                    </button>
                  </div>
                </div>

                {taxEnabledInput ? (
                  <div className="pt-2 border-t border-[#E5D5BC]/60 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-stone-700">نسبة الضريبة (%):</label>
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        value={taxRateInput}
                        onChange={(e) => setTaxRateInput(Math.max(0, Number(e.target.value)))}
                        className="w-24 p-2 bg-white rounded-xl border border-stone-300 text-xs font-black text-center focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                      />
                    </div>
                    <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      يتم احتساب {taxRateInput}% ضريبة قيمة مضافة على إجمالي الطلب في الفاتورة والمنيو.
                    </span>
                  </div>
                ) : (
                  <div className="pt-1 text-[11px] text-stone-500 bg-white/60 p-2.5 rounded-xl border border-stone-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-stone-400"></span>
                    <span>الضريبة متوقفة حالياً: لن يتم احتساب أو إظهار أي نسبة ضريبة على الطلبات للعميل.</span>
                  </div>
                )}
              </div>

              {/* 2. Profit Margin: نسبة صافي الربح أتحكم فيها كلو */}
              <div className="bg-[#FAF6F0] rounded-2xl p-4 border border-[#E5D5BC] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-emerald-700" />
                      <span className="text-xs font-black text-[#2D1E18]">التحكم في نسبة صافي الربح (%)</span>
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200">
                        {profitMarginInput}% صافي ربح
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">
                      تحكم كامل في نسبة تقدير صافي الأرباح لحساب دخل المكان بدقة عبر لوحة الإحصائيات والرسوم البيانية.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-600">النسبة المئوية:</span>
                    <input 
                      type="number"
                      min="1"
                      max="100"
                      value={profitMarginInput}
                      onChange={(e) => handleUpdateProfitMargin(Number(e.target.value))}
                      className="w-20 p-2 bg-white rounded-xl border border-stone-300 text-sm font-black text-center text-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                    <span className="text-xs font-bold text-stone-500">%</span>
                  </div>
                </div>

                {/* Range Slider for immediate tactile control */}
                <div className="pt-1 space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-stone-400">
                    <span>1% (أدنى)</span>
                    <span className="text-emerald-800 font-black">{profitMarginInput}% صافي ربح مقدر</span>
                    <span>100% (أعلى)</span>
                  </div>
                  <input 
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={profitMarginInput}
                    onChange={(e) => handleUpdateProfitMargin(Number(e.target.value))}
                    className="w-full accent-emerald-700 cursor-pointer"
                  />
                </div>

                {/* Quick preset percentage buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-stone-500 ml-1">نسب سريعة:</span>
                  {[30, 40, 50, 60, 65, 70, 75, 80, 85, 90].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleUpdateProfitMargin(pct)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        profitMarginInput === pct
                          ? 'bg-emerald-700 text-white shadow-sm font-black ring-2 ring-emerald-200'
                          : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                {/* Visual Ratio Bar & Live Example */}
                <div className="bg-white rounded-xl p-3 border border-stone-200 space-y-2">
                  <div className="h-2.5 rounded-full overflow-hidden bg-amber-100 flex">
                    <div 
                      className="bg-emerald-600 transition-all duration-300" 
                      style={{ width: `${Math.min(100, Math.max(1, profitMarginInput))}%` }} 
                      title={`صافي الربح: ${profitMarginInput}%`}
                    />
                    <div 
                      className="bg-amber-400 transition-all duration-300" 
                      style={{ width: `${Math.max(0, 100 - Math.min(100, Math.max(1, profitMarginInput)))}%` }} 
                      title={`تكلفة التشغيل والخامات: ${100 - profitMarginInput}%`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                      صافي الأرباح: {profitMarginInput}% ({Math.round(1000 * (profitMarginInput / 100))} {currencyInput} لكل 1,000 {currencyInput})
                    </span>
                    <span className="text-amber-700 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                      تكلفة الخامات والتشغيل: {100 - profitMarginInput}% ({Math.round(1000 * ((100 - profitMarginInput) / 100))} {currencyInput})
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Currency Symbol */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">رمز العملة المالي</label>
                  <input 
                    type="text"
                    value={currencyInput}
                    onChange={(e) => setCurrencyInput(e.target.value)}
                    placeholder="ج.م أو ريال أو $"
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">يظهر في جميع الفواتير، أسعار الأصناف، والتقارير المالية.</p>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveFinancialSettings}
                  className="px-6 py-2.5 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-bold shadow-sm transition-all"
                >
                  حفظ كافة الإعدادات المالية
                </button>
              </div>
            </div>

            {/* SECTION 2.5: Customer Data & Fast Checkout Preferences */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
              <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2">
                <Users size={17} className="text-[#8C6D48]" />
                <span>تجربة طلب العميل وجمع البيانات (الاسم ورقم الهاتف)</span>
              </h3>

              <div className="space-y-3">
                {/* Toggle Enable/Disable Customer Data */}
                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <div className="space-y-0.5 max-w-lg">
                    <label className="text-xs font-black text-stone-800 block">
                      تشغيل جمع بيانات العميل (الاسم ورقم الهاتف)
                    </label>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      عند التفعيل، يظهر للعميل حقل لكتابة اسمه ورقم الواتساب لاكتساب نقاط الولاء. عند التعطيل، يرسل الطلب مباشرة بنقرة واحدة (الطلب السريع).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, enableCustomerData: !(prev.enableCustomerData ?? true) }))}
                    className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out relative flex items-center ${
                      (settings.enableCustomerData ?? true) ? 'bg-emerald-600 justify-end' : 'bg-stone-300 justify-start'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-white shadow-md block transition-transform" />
                  </button>
                </div>

                {/* Sub-toggle: Require Customer Name */}
                {(settings.enableCustomerData ?? true) && (
                  <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-2xl border border-amber-200/70">
                    <div className="space-y-0.5 max-w-lg">
                      <label className="text-xs font-black text-amber-900 block">
                        إلزام العميل بإدخال اسمه قبل إرسال الطلب
                      </label>
                      <p className="text-[11px] text-amber-800/80 leading-relaxed">
                        يمنع العميل من إرسال الطلب بدون إدخال اسمه لتسهيل النداء والخدمة.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, requireCustomerName: !prev.requireCustomerName }))}
                      className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out relative flex items-center ${
                        settings.requireCustomerName ? 'bg-amber-600 justify-end' : 'bg-stone-300 justify-start'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-full bg-white shadow-md block transition-transform" />
                    </button>
                  </div>
                )}

                {/* VIP Customer Banner Toggle */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50/80 via-[#FFFDF5] to-orange-50/80 rounded-2xl border border-amber-300/80 shadow-2xs">
                  <div className="space-y-0.5 max-w-lg">
                    <label className="text-xs font-black text-amber-950 block flex items-center gap-1.5">
                      <Star size={14} className="fill-amber-500 text-amber-600" />
                      <span>بنر ترحيب العميل المميز في المنيو (VIP Customer Banner)</span>
                    </label>
                    <p className="text-[11px] text-stone-600 leading-relaxed font-medium">
                      عند التفعيل، تظهر للعميل المسجل بطاقة ترحيب فاخرة بأعلى المنيو وبسلة الطلبات (أهلاً بك مجدداً، فلان! 🌟 عميل مميز ومشروبك المفضل). عند الإيقاف، يتم إخفاء هذا البنر تماماً من المنيو.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, showVipCustomerBanner: !(prev.showVipCustomerBanner !== false) }))}
                    className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out relative flex items-center ${
                      settings.showVipCustomerBanner !== false ? 'bg-emerald-600 justify-end' : 'bg-stone-300 justify-start'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-white shadow-md block transition-transform" />
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 2.6: Table Single Active Session & Anti-Overlap Security */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
              <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2">
                <Shield size={17} className="text-[#8C6D48]" />
                <span>حماية وتأمين جلسات الطاولات (منع تداخل الأجهزة وتكرار الطلبات)</span>
              </h3>

              <div className="space-y-3">
                {/* 1. Single Active Session Toggle */}
                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <div className="space-y-0.5 max-w-lg">
                    <label className="text-xs font-black text-stone-800 block">
                      تفعيل قفل الجلسة الفردية للطاولة (Single Active Session)
                    </label>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      عند التفعيل، يتم قفل الطاولة لهاتف العميل الأول لمنع تداخل أجهزة أخرى على نفس الطاولة حتى إتمام الطلب أو طلب الشيك.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, singleActiveSessionEnabled: !prev.singleActiveSessionEnabled }))}
                    className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out relative flex items-center ${
                      settings.singleActiveSessionEnabled ? 'bg-emerald-600 justify-end' : 'bg-stone-300 justify-start'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-white shadow-md block transition-transform" />
                  </button>
                </div>

                {/* 2. Lock on First Order Only */}
                {settings.singleActiveSessionEnabled && (
                  <div className="flex items-center justify-between p-4 bg-stone-50/80 rounded-2xl border border-stone-200">
                    <div className="space-y-0.5 max-w-lg">
                      <label className="text-xs font-black text-stone-800 block">
                        قفل الطاولة عند تقديم أول طلب فقط (Lock on First Order Only)
                      </label>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        يسمح لأي شخص بتصفح المنيو بحرية، ولا يتم حجز وقفل الطاولة للهاتف إلا لحظة تأكيد وإرسال أول طلب للمطبخ.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, lockOnFirstOrderOnly: !prev.lockOnFirstOrderOnly }))}
                      className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out relative flex items-center ${
                        settings.lockOnFirstOrderOnly ? 'bg-emerald-600 justify-end' : 'bg-stone-300 justify-start'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-full bg-white shadow-md block transition-transform" />
                    </button>
                  </div>
                )}

                {/* 3. Auto-Release on Exit */}
                {settings.singleActiveSessionEnabled && (
                  <div className="flex items-center justify-between p-4 bg-stone-50/80 rounded-2xl border border-stone-200">
                    <div className="space-y-0.5 max-w-lg">
                      <label className="text-xs font-black text-stone-800 block">
                        تحرير الطاولة تلقائياً عند مغادرة العميل للموقع (Auto-Release on Exit)
                      </label>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        في حال إغلاق العميل للمتصفح دون وجود طلبات نشطة قيد التحضير، يتم تحرير الطاولة فوراً لتصبح متاحة للعميل التالي.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, autoReleaseOnExit: !prev.autoReleaseOnExit }))}
                      className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out relative flex items-center ${
                        settings.autoReleaseOnExit ? 'bg-emerald-600 justify-end' : 'bg-stone-300 justify-start'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-full bg-white shadow-md block transition-transform" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 3: Notification Sounds */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5D5BC]/60 pb-3">
                <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2">
                  <Volume2 size={18} className="text-[#8C6D48]" />
                  <span>نظام التنبيهات الصوتية ونغمات الكاشير</span>
                </h3>
                <span className="text-[11px] font-bold text-[#8C6D48] bg-[#FAF6F0] px-3 py-1 rounded-xl border border-[#E5D5BC]">
                  صوت تنبيه خاص لطلب الشيك والفاتورة
                </span>
              </div>

              {/* Mode Selector: صوت إشعار لطلب الشيك بس أو غيره */}
              <div className="bg-[#FAF6F0] rounded-2xl p-4 border border-[#E5D5BC] space-y-3">
                <div>
                  <label className="text-xs font-black text-[#2D1E18] block mb-1">
                    نمط التنبيه الصوتي للكاشير والإدارة
                  </label>
                  <p className="text-[11px] text-stone-500">
                    حدد متى ترغب في صدور صوت تنبيه من الجهاز أثناء وجودك في لوحة الإدارة.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* Option 1: Bill Only (The Requested Mode) */}
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ 
                      ...prev, 
                      soundNotificationMode: 'bill_only',
                      billSoundEnabled: true,
                      orderSoundEnabled: false 
                    }))}
                    className={`p-3.5 rounded-2xl text-right transition-all flex flex-col justify-between border ${
                      (settings.soundNotificationMode === 'bill_only' || (!settings.soundNotificationMode && !settings.orderSoundEnabled))
                        ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-300/50 shadow-sm'
                        : 'bg-white border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xl">🔔</span>
                      {(settings.soundNotificationMode === 'bill_only' || (!settings.soundNotificationMode && !settings.orderSoundEnabled)) && (
                        <span className="text-[10px] font-black bg-amber-600 text-white px-2 py-0.5 rounded-full">المفعل حالياً</span>
                      )}
                    </div>
                    <span className="text-xs font-black text-[#2D1E18] block">لطلب الشيك فقط</span>
                    <span className="text-[10px] text-stone-500 mt-1 block leading-tight">
                      رنين تنبيه فوري فقط عندما تطلب طاولة الشيك/الفاتورة.
                    </span>
                  </button>

                  {/* Option 2: Both Bill and Orders */}
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ 
                      ...prev, 
                      soundNotificationMode: 'all',
                      billSoundEnabled: true,
                      orderSoundEnabled: true 
                    }))}
                    className={`p-3.5 rounded-2xl text-right transition-all flex flex-col justify-between border ${
                      settings.soundNotificationMode === 'all'
                        ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-300/50 shadow-sm'
                        : 'bg-white border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xl">🔔+🛎️</span>
                      {settings.soundNotificationMode === 'all' && (
                        <span className="text-[10px] font-black bg-amber-600 text-white px-2 py-0.5 rounded-full">المفعل حالياً</span>
                      )}
                    </div>
                    <span className="text-xs font-black text-[#2D1E18] block">الشيك + كل الطلبات</span>
                    <span className="text-[10px] text-stone-500 mt-1 block leading-tight">
                      تنبيه صوتي للشيك ولكل طلب طعام ومشروب جديد.
                    </span>
                  </button>

                  {/* Option 3: Orders Only */}
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ 
                      ...prev, 
                      soundNotificationMode: 'orders_only',
                      billSoundEnabled: false,
                      orderSoundEnabled: true 
                    }))}
                    className={`p-3.5 rounded-2xl text-right transition-all flex flex-col justify-between border ${
                      settings.soundNotificationMode === 'orders_only'
                        ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-300/50 shadow-sm'
                        : 'bg-white border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xl">🛎️</span>
                      {settings.soundNotificationMode === 'orders_only' && (
                        <span className="text-[10px] font-black bg-amber-600 text-white px-2 py-0.5 rounded-full">المفعل حالياً</span>
                      )}
                    </div>
                    <span className="text-xs font-black text-[#2D1E18] block">للطلبات فقط</span>
                    <span className="text-[10px] text-stone-500 mt-1 block leading-tight">
                      رنين عند وصول طلبات أصناف جديدة فقط دون الشيك.
                    </span>
                  </button>

                  {/* Option 4: None */}
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ 
                      ...prev, 
                      soundNotificationMode: 'none',
                      billSoundEnabled: false,
                      orderSoundEnabled: false 
                    }))}
                    className={`p-3.5 rounded-2xl text-right transition-all flex flex-col justify-between border ${
                      settings.soundNotificationMode === 'none'
                        ? 'bg-rose-100/70 border-rose-400 ring-2 ring-rose-300/50 shadow-sm'
                        : 'bg-white border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xl">🔕</span>
                      {settings.soundNotificationMode === 'none' && (
                        <span className="text-[10px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full">المفعل حالياً</span>
                      )}
                    </div>
                    <span className="text-xs font-black text-[#2D1E18] block">كتم الصوت تماماً</span>
                    <span className="text-[10px] text-stone-500 mt-1 block leading-tight">
                      إلغاء الأصوات تماماً (تنبيه مرئي فقط على الشاشة).
                    </span>
                  </button>
                </div>
              </div>

              {/* Sound Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Bill Sound Tone */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                      <Receipt size={14} className="text-amber-700" />
                      <span>نغمة إشعار طلب الشيك</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => playNotificationSound(settings.adminSoundVolume, settings.billSoundType || 'bill', settings.customAdminAudio)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black flex items-center gap-1 transition-colors"
                      title="تجربة رنين الشيك"
                    >
                      <Play size={12} />
                      <span>تجربة الشيك</span>
                    </button>
                  </div>
                  <select
                    value={settings.billSoundType || 'bill'}
                    onChange={(e) => setSettings(prev => ({ ...prev, billSoundType: e.target.value }))}
                    className="w-full p-2.5 bg-white rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                  >
                    <option value="bill">🔔 نغمة رنين كاشير مزدوج نقي (Chime & Bell)</option>
                    <option value="bell">🛎️ نغمة جرس فندقي كلاسيكي (Bell)</option>
                    <option value="chime">🎵 نغمة شيم هادئة (Chime)</option>
                    <option value="modern">⚡ نغمة إلكترونية عصرية (Modern)</option>
                  </select>
                  <p className="text-[10px] text-stone-400">هذه هي النغمة المميزة التي تصدر عند طلب الزبون الحساب.</p>
                </div>

                {/* 2. Orders Sound Tone */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                      <ClipboardList size={14} className="text-[#8C6D48]" />
                      <span>نغمة إشعار الطلبات العادية</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => playNotificationSound(settings.adminSoundVolume, settings.adminSoundType || 'chime', settings.customAdminAudio)}
                      className="px-2.5 py-1 rounded-lg bg-stone-600 hover:bg-stone-700 text-white text-[11px] font-black flex items-center gap-1 transition-colors"
                      title="تجربة رنين الطلبات"
                    >
                      <Play size={12} />
                      <span>تجربة الطلب</span>
                    </button>
                  </div>
                  <select
                    value={settings.adminSoundType || 'chime'}
                    onChange={(e) => setSettings(prev => ({ ...prev, adminSoundType: e.target.value }))}
                    className="w-full p-2.5 bg-white rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                  >
                    <option value="chime">نغمة جرس رنين كلاسيكي (Chime)</option>
                    <option value="bell">نغمة تنبيه فندقي نقي (Bell)</option>
                    <option value="modern">نغمة إلكترونية عصرية (Modern)</option>
                    <option value="bill">نغمة كاشير مزدوجة (Bill)</option>
                  </select>
                  <p className="text-[10px] text-stone-400">النغمة المخصصة لطلبات الطعام والمشروبات الجديدة.</p>
                </div>

                {/* 3. Volume Slider */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-stone-800">
                      مستوى الصوت العام ({Math.round(settings.adminSoundVolume * 100)}%)
                    </label>
                    <span className="text-[10px] font-bold text-stone-400">
                      {settings.adminSoundVolume === 0 ? 'مكتوم' : settings.adminSoundVolume > 0.7 ? 'مرتفع' : 'متوسط'}
                    </span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.adminSoundVolume}
                    onChange={(e) => setSettings(prev => ({ ...prev, adminSoundVolume: parseFloat(e.target.value) }))}
                    className="w-full accent-[#3D271D] cursor-pointer mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 pt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Custom Audio Upload & Test Controls */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => playNotificationSound(settings.adminSoundVolume, settings.billSoundType || 'bill', settings.customAdminAudio)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Play size={14} />
                  <span>تجربة صوت إشعار طلب الشيك 🔔</span>
                </button>

                <input 
                  type="file" 
                  accept="audio/*" 
                  ref={audioInputRef} 
                  onChange={handleAudioUpload} 
                  className="hidden" 
                />

                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-[#3D271D] text-xs font-bold flex items-center gap-1.5"
                >
                  <Upload size={14} />
                  <span>رفع نغمة صوتية خاصة من الجهاز (MP3/WAV)</span>
                </button>

                {settings.customAdminAudio && (
                  <button
                    type="button"
                    onClick={handleResetAudio}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1"
                  >
                    <RotateCcw size={13} />
                    <span>استعادة النغمة الافتراضية</span>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
              <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2">
                <Shield size={17} className="text-[#8C6D48]" />
                <span>أمان وقفل لوحة الإدارة (اسم المستخدم، كلمة المرور، ورمز الـ PIN)</span>
              </h3>

              <form onSubmit={handleSaveSecurity} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">اسم المستخدم (Username)</label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        className="w-full p-3 pl-9 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                        required
                      />
                      <User size={14} className="absolute left-3 top-3.5 text-stone-400" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">كلمة المرور (Password)</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full p-3 pl-9 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-3.5 text-stone-400 hover:text-stone-700"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">رمز الحماية السريع (PIN Code)</label>
                    <div className="relative">
                      <input 
                        type="password"
                        maxLength={6}
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        className="w-full p-3 pl-9 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                        required
                      />
                      <Hash size={14} className="absolute left-3 top-3.5 text-stone-400" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-bold shadow-sm transition-all"
                  >
                    حفظ بيانات الأمان الجديدة
                  </button>

                  {securitySavedMsg && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 flex items-center gap-1">
                      <Check size={14} />
                      <span>تم تحديث بيانات الأمان بنجاح!</span>
                    </span>
                  )}
                </div>
              </form>
            </div>

            {/* Direct Table Selection & Table Settings */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
              <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2">
                <CircleDot size={17} className="text-[#8C6D48]" />
                <span>إعدادات الطاولات والطلب المباشر للزبائن</span>
              </h3>

              <div className="space-y-4 divide-y divide-stone-100">
                {/* Direct Table Selection Toggle */}
                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5 max-w-xl">
                    <label className="text-xs font-extrabold text-[#2D1E18] block">
                      تخصيص اختيار الطاولة يدوياً (Direct Table Selection)
                    </label>
                    <p className="text-[11px] text-stone-500">
                      عند التفعيل، يظهر للعميل خيار واجهة اختيار الطاولة والمشغول/المتاح عند دخول النظام مباشرة بدون رابط QR.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = settings.allowDirectTableSelection === false ? true : false;
                      setSettings(prev => ({ ...prev, allowDirectTableSelection: updated }));
                      if (addSystemLog) {
                        addSystemLog('settings', 'info', `تم ${updated ? 'تفعيل' : 'تعطيل'} اختيار الطاولة اليدوي للعملاء`);
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.allowDirectTableSelection !== false ? 'bg-emerald-600' : 'bg-stone-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings.allowDirectTableSelection !== false ? 'translate-x-0' : '-translate-x-5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION: Complete System Backup & Restore (JSON Export / Import) */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="space-y-1">
                  <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2">
                    <Download size={18} className="text-[#8C6D48]" />
                    <span>حفظ واستعادة بيانات النظام (System Backup & Restore)</span>
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    حماية بيانات المطعم: قم بتصدير نسخة احتياطية لكافة بيانات النظام (القوائم، الأصناف، الأسعار، الطاولات، سجلات الطلبات، الكوبونات، والإعدادات) إلى ملف JSON، واستعدها في أي وقت عند الحاجة.
                  </p>
                </div>
              </div>

              {/* Status alerts */}
              {backupExportMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800 animate-in fade-in">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>{backupExportMsg} تم تنزيل الملف بنجاح على جهازك.</span>
                </div>
              )}

              {backupRestoreMsg && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-blue-800 animate-in fade-in">
                  <CheckCircle2 size={16} className="text-blue-600 flex-shrink-0" />
                  <span>{backupRestoreMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* 1. Export Action Card */}
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DFC8] space-y-3 text-right">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#3D271D] text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                      <Download size={16} />
                    </div>
                    <div>
                      <h4 className="font-black text-xs text-[#2D1E18]">حفظ وتصدير نسخة احتياطية (Export)</h4>
                      <p className="text-[10px] text-stone-500">حفظ كافة بيانات النظام الحالية في ملف JSON آمن</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    يقوم بإنشاء وتنزيل ملف JSON فوري يحتوي على: {categories.length} أقسام، {menuItems.length} صنف، {orders.length} طلب، {tables.length} طاولة، وكافة الإعدادات المخصصة.
                  </p>
                  <button
                    type="button"
                    onClick={handleExportSystemBackup}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98"
                  >
                    <Download size={14} />
                    <span>تصدير وحفظ ملف النسخة الاحتياطية (JSON)</span>
                  </button>
                </div>

                {/* 2. Import Action Card */}
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DFC8] space-y-3 text-right">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-700 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                      <Upload size={16} />
                    </div>
                    <div>
                      <h4 className="font-black text-xs text-[#2D1E18]">استعادة ورفع نسخة احتياطية (Import)</h4>
                      <p className="text-[10px] text-stone-500">استرجاع كافة بيانات المطعم من ملف JSON سابق</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    اختر ملف نسخة احتياطية تم تصديره مسبقاً لاسترجاع جميع الأصناف والأسعار والجلسات والسجلات بضغطة زر واحدة.
                  </p>

                  <input 
                    type="file" 
                    accept=".json,application/json" 
                    ref={backupFileInputRef} 
                    onChange={handleImportSystemBackup} 
                    className="hidden" 
                  />

                  <button
                    type="button"
                    onClick={() => backupFileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-98"
                  >
                    <Upload size={14} />
                    <span>اختيار ملف JSON واستعادة البيانات</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ================= 7️⃣ PAGE 7: ADS & PROMOTIONS ================= */}
        {activeTab === 'ads' && (
          <AdsPage 
            banners={banners} 
            setBanners={setBanners} 
            popupAd={popupAd} 
            setPopupAd={setPopupAd}
            categories={categories}
            coupons={coupons}
          />
        )}

        {/* ================= 8️⃣ PAGE 8: CUSTOMERS CRM ================= */}
        {activeTab === 'customers' && (
          <CustomersPage 
            customers={customers} 
            setCustomers={setCustomers || (() => {})} 
            currencySymbol={settings.currencySymbol} 
            settings={settings}
            setSettings={setSettings}
          />
        )}

        {/* ================= 9️⃣ PAGE 9: THEME & COLOR CUSTOMIZATION ================= */}
        {activeTab === 'theme' && (
          <ThemePage 
            settings={settings} 
            setSettings={setSettings} 
          />
        )}

        {/* ================= 🔟 PAGE 10: SOCIAL MEDIA & DEVELOPER RIGHTS ================= */}
        {activeTab === 'social' && (
          <SocialPage 
            settings={settings} 
            setSettings={setSettings} 
          />
        )}

        {/* ================= 1️⃣1️⃣ PAGE 11: SYSTEM AUDIT LOGS ================= */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E5D5BC] shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2.5 rounded-2xl bg-slate-900 text-sky-400">
                    <FileText size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-[#2D1E18]">سجل جميع أحداث السيستم (System Audit Logs)</h2>
                    <p className="text-xs text-stone-500 font-medium mt-0.5">
                      تتبع دقيق وشامل لجميع الطلبات، الحسابات، تغيير الأسعار، تفريغ الطاولات، وتحديثات الإعدادات
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Export Logs Button */}
                <button
                  type="button"
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(systemLogs, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `system_audit_logs_${Date.now()}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  }}
                  className="px-4 py-2 rounded-2xl bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Download size={14} />
                  <span>تصدير اللوج (JSON)</span>
                </button>

                {/* Clear Logs Button */}
                {setSystemLogs && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('هل أنت تأكد من رغبتك في مسح جميع سجلات الأحداث من النظام؟')) {
                        setSystemLogs([]);
                        if (addSystemLog) {
                          addSystemLog('system', 'warning', 'تم مسح وتصفية سجلات الأحداث بواسطة الأدمن');
                        }
                      }
                    }}
                    className="px-4 py-2 rounded-2xl bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <Trash size={14} />
                    <span>مسح السجل</span>
                  </button>
                )}
              </div>
            </div>

            {/* Logs Metrics Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
                <p className="text-[11px] font-bold text-stone-500">إجمالي الأحداث المسجلة</p>
                <p className="text-xl font-black text-stone-900 mt-1">{systemLogs.length}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
                <p className="text-[11px] font-bold text-emerald-600">أحداث الطلبات والمطبخ</p>
                <p className="text-xl font-black text-emerald-700 mt-1">
                  {systemLogs.filter(l => l.category === 'orders').length}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
                <p className="text-[11px] font-bold text-amber-600">تعديلات المنيو والأسعار</p>
                <p className="text-xl font-black text-amber-700 mt-1">
                  {systemLogs.filter(l => l.category === 'menu').length}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
                <p className="text-[11px] font-bold text-slate-600">أحداث الإعدادات والمطور</p>
                <p className="text-xl font-black text-slate-700 mt-1">
                  {systemLogs.filter(l => l.category === 'settings' || l.category === 'developer' || l.category === 'system').length}
                </p>
              </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="bg-white p-4 rounded-2xl border border-[#E5D5BC] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <Filter size={15} className="text-stone-400 flex-shrink-0" />
                
                {/* Category Selector */}
                <select
                  value={logCategoryFilter}
                  onChange={(e) => setLogCategoryFilter(e.target.value)}
                  className="bg-stone-50 text-stone-800 text-xs font-bold p-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                >
                  <option value="all">جميع التصنيفات (All Categories)</option>
                  <option value="orders">الطلبات (Orders)</option>
                  <option value="tables">الطاولات (Tables)</option>
                  <option value="menu">المنيو والأسعار (Menu)</option>
                  <option value="settings">إعدادات النظام (Settings)</option>
                  <option value="developer">خزانة المطور (Developer)</option>
                  <option value="system">النظام الأساسي (System)</option>
                </select>

                {/* Level Selector */}
                <select
                  value={logLevelFilter}
                  onChange={(e) => setLogLevelFilter(e.target.value)}
                  className="bg-stone-50 text-stone-800 text-xs font-bold p-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                >
                  <option value="all">جميع المستويات (All Levels)</option>
                  <option value="success">نجاح (Success)</option>
                  <option value="info">معلومات (Info)</option>
                  <option value="warning">تنبيه (Warning)</option>
                  <option value="danger">خطر / إلغاء (Danger)</option>
                </select>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  placeholder="بحث في السجل..."
                  className="w-full pl-8 pr-3 py-2 bg-stone-50 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                />
                <Search size={14} className="absolute left-2.5 top-2.5 text-stone-400" />
              </div>
            </div>

            {/* Logs List Table */}
            <div className="bg-white rounded-3xl border border-[#E5D5BC] shadow-sm overflow-hidden">
              {(() => {
                const filtered = systemLogs.filter(log => {
                  if (logCategoryFilter !== 'all' && log.category !== logCategoryFilter) return false;
                  if (logLevelFilter !== 'all' && log.level !== logLevelFilter) return false;
                  if (logSearchQuery.trim()) {
                    const q = logSearchQuery.toLowerCase();
                    const matchMsg = log.message.toLowerCase().includes(q);
                    const matchEn = log.messageEn?.toLowerCase().includes(q);
                    const matchDetails = log.details?.toLowerCase().includes(q);
                    const matchActor = log.actor?.toLowerCase().includes(q);
                    if (!matchMsg && !matchEn && !matchDetails && !matchActor) return false;
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-12 text-center text-stone-400 space-y-2">
                      <FileText size={40} className="mx-auto text-stone-300" />
                      <p className="font-bold text-stone-600 text-sm">لا توجد سجلات مطابقة للفلاتر المحددة</p>
                      <p className="text-xs">جرب تغيير الفلتر أو كلمة البحث لسرعة العثور على الأحداث.</p>
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-stone-100 max-h-[600px] overflow-y-auto">
                    {filtered.map((entry) => {
                      const levelColors = {
                        success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                        info: 'bg-sky-50 text-sky-800 border-sky-200',
                        warning: 'bg-amber-50 text-amber-900 border-amber-200',
                        danger: 'bg-rose-50 text-rose-800 border-rose-200'
                      }[entry.level] || 'bg-stone-50 text-stone-800 border-stone-200';

                      const levelIcons = {
                        success: <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />,
                        info: <Info size={15} className="text-sky-600 flex-shrink-0" />,
                        warning: <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />,
                        danger: <XCircle size={15} className="text-rose-600 flex-shrink-0" />
                      }[entry.level];

                      return (
                        <div key={entry.id} className="p-4 hover:bg-stone-50/80 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="pt-0.5">{levelIcons}</div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${levelColors}`}>
                                  {entry.level.toUpperCase()}
                                </span>
                                <span className="bg-stone-100 text-stone-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-stone-200">
                                  {entry.category}
                                </span>
                                {entry.actor && (
                                  <span className="bg-amber-50 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                                    المنفذ: {entry.actor}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-stone-800 leading-snug">
                                {entry.message}
                              </p>
                              {entry.messageEn && (
                                <p className="text-[11px] text-stone-500 font-medium dir-ltr text-right">
                                  {entry.messageEn}
                                </p>
                              )}
                              {entry.details && (
                                <div className="mt-1 bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-[11px] text-stone-600 font-mono leading-relaxed">
                                  {entry.details}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-left flex-shrink-0 text-[10px] text-stone-400 font-mono">
                            {new Date(entry.timestamp).toLocaleDateString('ar-EG')}{' '}
                            {new Date(entry.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ================= 1️⃣2️⃣ PAGE 12: DEVELOPER PASSWORD LOCKED CONSOLE ================= */}
        {activeTab === 'developer' && (
          <div className="space-y-6">
            {!isDeveloperUnlocked ? (
              /* Password Protection Modal / Screen */
              <div className="max-w-md mx-auto my-8 bg-white p-8 rounded-3xl border-2 border-amber-300 shadow-xl text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 text-amber-900 flex items-center justify-center border border-amber-300 shadow-inner">
                  <LockKeyhole size={32} />
                </div>

                <div>
                  <h2 className="text-xl font-black text-[#2D1E18]">خزانة المطور محجوبة ومحمية</h2>
                  <p className="text-xs text-stone-500 font-medium mt-1 leading-relaxed">
                    هذا القسم محمي بكلمة سر لمنع تعديل حقوق المطور وسجلات تشخيص السيستم من قبل غير المصرح لهم.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const validPass = settings.developerPassword || '1234';
                    if (devPasswordInput === validPass) {
                      setIsDeveloperUnlocked(true);
                      setDevPasswordError(null);
                      if (addSystemLog) {
                        addSystemLog('developer', 'info', 'تم فتح وتأكيد الدخول إلى خزانة المطور بنجاح');
                      }
                    } else {
                      setDevPasswordError('كلمة سر المطور غير صحيحة!');
                    }
                  }}
                  className="space-y-4 text-right"
                >
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">كلمة سر المطور (Developer Password)</label>
                    <input
                      type="password"
                      value={devPasswordInput}
                      onChange={(e) => {
                        setDevPasswordInput(e.target.value);
                        setDevPasswordError(null);
                      }}
                      placeholder="أدخل كلمة سر المطور (الافتراضية: 1234)"
                      className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                      autoFocus
                    />
                  </div>

                  {devPasswordError && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                      <AlertCircle size={15} />
                      <span>{devPasswordError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white font-black text-xs shadow-md transition-all active:scale-98"
                  >
                    تأكيد وفتح الخزانة 🔓
                  </button>
                </form>

                <div className="pt-2 border-t border-stone-200 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newPass = prompt('أدخل كلمة سر المطور الجديدة (الافتراضية: 1234):', '1234');
                      if (newPass !== null) {
                        const trimmed = newPass.trim() || '1234';
                        setSettings(prev => ({ ...prev, developerPassword: trimmed }));
                        alert(`تم تحديث كلمة سر المطور بنجاح إلى: ${trimmed}`);
                        if (addSystemLog) {
                          addSystemLog('developer', 'warning', 'تم إعادة تعيين وتغيير كلمة سر المطور من شاشة القفل');
                        }
                      }
                    }}
                    className="text-xs font-bold text-[#8C6D48] hover:underline"
                  >
                    نسيت كلمة السر؟ تغيير أو إعادة تعيين كلمة سر المطور فوراً 🔑
                  </button>
                  <p className="text-[10px] text-stone-400">
                    أو يمكنك تغييرها من قائمة الإعدادات والأمان بالأعلى.
                  </p>
                </div>
              </div>
            ) : (
              /* Unlocked Developer Console */
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-950 text-amber-50 p-6 rounded-3xl border border-amber-800 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-amber-800 text-amber-200">
                      <Terminal size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-amber-100">خزانة المطور والنظام (Developer Console)</h2>
                      <p className="text-xs text-amber-300 font-medium mt-0.5">
                        التحكم المتقدم في حقوق الملكية، كلمة السر، وإدارة اللوج المباشر للسيستم
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsDeveloperUnlocked(false)}
                    className="px-4 py-2 rounded-2xl bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-amber-700 self-start sm:self-auto"
                  >
                    <Lock size={14} />
                    <span>قفل الخزانة الآن</span>
                  </button>
                </div>

                {/* Section 1: Developer Rights Form */}
                <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
                  <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2">
                    <Code size={18} className="text-[#8C6D48]" />
                    <span>إعدادات حقوق وبرمجة السيستم (Developer Signature)</span>
                  </h3>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSettings(prev => ({
                        ...prev,
                        developerRights: {
                          ...(prev.developerRights || {}),
                          enabled: prev.developerRights?.enabled ?? true,
                          developerName: developerNameInput.trim() || prev.developerRights?.developerName || 'محمود العفوري',
                          developerWhatsApp: developerWhatsAppInput.trim(),
                          developerPhone: developerWhatsAppInput.trim() || prev.developerRights?.developerPhone || '',
                          developerWebsite: prev.developerRights?.developerWebsite || '',
                          copyrightText: copyrightTextInput.trim()
                        }
                      }));
                      if (addSystemLog) {
                        addSystemLog('developer', 'warning', 'تم تحديث حقوق وبيانات المطور في النظام');
                      }
                      setDeveloperSavedMsg(true);
                      setTimeout(() => setDeveloperSavedMsg(false), 3000);
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-stone-700 block mb-1">اسم المطور / الشركة البرمجية</label>
                        <input
                          type="text"
                          value={developerNameInput}
                          onChange={(e) => setDeveloperNameInput(e.target.value)}
                          placeholder="مثال: المهندس المطور / Smart Menu Devs"
                          className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-stone-700 block mb-1">رقم واتساب المطور للدعم الفني</label>
                        <input
                          type="text"
                          value={developerWhatsAppInput}
                          onChange={(e) => setDeveloperWhatsAppInput(e.target.value)}
                          placeholder="مثال: 01000000000"
                          className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">نص حقوق الملكية والطباعة أسفل الصفحة</label>
                      <input
                        type="text"
                        value={copyrightTextInput}
                        onChange={(e) => setCopyrightTextInput(e.target.value)}
                        placeholder="جميع الحقوق محفوظة © 2026 - تم التطوير والبرمجة بواسطة المطور المعتمد"
                        className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-bold shadow-sm transition-all"
                      >
                        حفظ حقوق وتوقيع المطور
                      </button>
                      {developerSavedMsg && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5 animate-in fade-in">
                          <Check size={14} />
                          <span>تم حفظ التوقيع وحقوق المطور بنجاح!</span>
                        </span>
                      )}
                    </div>
                  </form>
                </div>

                {/* Section 1.5: Developer Password Update Form */}
                <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
                  <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2">
                    <LockKeyhole size={18} className="text-[#8C6D48]" />
                    <span>تغيير كلمة سر خزانة المطور (Developer Console Password)</span>
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    تُستخدم لقفل خزانة المطور وحماية سجلات تشخيص السيستم وحقوق الملكية من أي تعديل غير مصرح به.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const pwd = newDevPassword.trim() || '1234';
                      setSettings(prev => ({ ...prev, developerPassword: pwd }));
                      setDevPasswordSavedMsg(true);
                      setTimeout(() => setDevPasswordSavedMsg(false), 3000);
                      if (addSystemLog) {
                        addSystemLog('developer', 'warning', 'تم تغيير كلمة سر خزانة المطور بنجاح');
                      }
                    }}
                    className="space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="relative flex-1 w-full max-w-sm">
                        <input 
                          type="password"
                          value={newDevPassword}
                          onChange={(e) => setNewDevPassword(e.target.value)}
                          placeholder="كلمة السر الجديدة للمطور (مثل: 1234)"
                          className="w-full p-3 pl-9 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                        />
                        <LockKeyhole size={14} className="absolute left-3 top-3.5 text-stone-400" />
                      </div>
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap self-stretch sm:self-auto"
                      >
                        تحديث كلمة السر
                      </button>
                      {devPasswordSavedMsg && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 flex items-center gap-1 animate-in fade-in">
                          <Check size={14} />
                          <span>تم حفظ كلمة السر الجديدة بنجاح!</span>
                        </span>
                      )}
                    </div>
                  </form>
                </div>

                {/* Section 2: Server & Connection Status & Live Diagnostics (Developer Exclusive) */}
                <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2">
                      <Server size={18} className="text-[#8C6D48]" />
                      <span>اختبار السيرفر ومحرك الربط وقاعدة البيانات (Server Diagnostics & Connection Test)</span>
                    </h3>
                    
                    <button
                      type="button"
                      onClick={fetchOrdersDirectly}
                      className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#3D271D] text-xs font-bold flex items-center gap-1.5 transition-all border border-stone-300 active:scale-95"
                    >
                      <RefreshCw size={13} className={isRefreshingOrders ? 'animate-spin' : ''} />
                      <span>فحص الاتصال وتحديث الطلبات</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Diagnostic Item 1: Realtime Engine */}
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                      <p className="text-xs font-bold text-stone-500">حالة الربط اللحظي (Sync Engine):</p>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          syncStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : syncStatus === 'connecting' ? 'bg-amber-500' : 'bg-rose-500'
                        }`} />
                        <span className="font-black text-xs text-[#2D1E18]">
                          {syncStatus === 'connected' ? 'متصل بنجاح ✓' : syncStatus === 'connecting' ? 'جاري الاتصال...' : 'إعادة الاتصال بالخادم...'}
                        </span>
                      </div>
                    </div>

                    {/* Diagnostic Item 2: Database Storage Engine */}
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                      <p className="text-xs font-bold text-stone-500">محرك قواعد البيانات (Database Mode):</p>
                      <div className="flex items-center gap-2">
                        <Database size={15} className="text-emerald-600" />
                        <span className="font-black text-xs text-[#2D1E18]">MongoDB / Local Realtime Bridge</span>
                      </div>
                    </div>

                    {/* Diagnostic Item 3: Active Orders Pool */}
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                      <p className="text-xs font-bold text-stone-500">مجموع الطلبات المسجلة:</p>
                      <div className="flex items-center gap-2">
                        <Activity size={15} className="text-amber-700" />
                        <span className="font-black text-xs text-[#2D1E18]">{orders.length} طلبات (النشطة: {orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length})</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ================= 13️⃣ PAGE 13: COUPONS ================= */}
        {activeTab === 'coupons' && (
          <div className="space-y-6" style={{ direction: 'rtl' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-950 text-amber-50 p-6 rounded-3xl border border-amber-800 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-800 text-amber-200">
                  <Tag size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-amber-100">كوبونات الخصم والترويج (Discount Coupons)</h2>
                  <p className="text-xs text-amber-300 font-medium mt-0.5">
                    إضافة وتعديل وحذف رموز الخصم والتخفيض لتقديم عروض ترويجية لعملائك لزيادة المبيعات
                  </p>
                </div>
              </div>
            </div>

            {couponErrorMsg && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                <AlertCircle size={16} />
                <span>{couponErrorMsg}</span>
              </div>
            )}

            {couponSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                <Check size={16} />
                <span>{couponSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              {/* Form Column */}
              <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4 h-fit">
                <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2 border-b border-stone-100 pb-3">
                  <Plus size={18} className="text-[#8C6D48]" />
                  <span>{editingCouponId ? 'تعديل الكوبون الحالي' : 'إنشاء كوبون خصم جديد'}</span>
                </h3>

                <div className="space-y-4">
                  {/* Coupon Code */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 block">رمز الكوبون *</label>
                    <input
                      type="text"
                      placeholder="مثال: WELCOME10، COFFEE20"
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-black uppercase font-mono focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                    />
                  </div>

                  {/* Discount Type & Value */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 block">نوع الخصم</label>
                      <select
                        value={newCouponType}
                        onChange={(e) => setNewCouponType(e.target.value as 'percentage' | 'fixed')}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                      >
                        <option value="percentage">نسبة مئوية (%)</option>
                        <option value="fixed">مبلغ ثابت ({currency})</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 block">قيمة الخصم *</label>
                      <input
                        type="number"
                        placeholder={newCouponType === 'percentage' ? 'مثال: 10' : 'مثال: 20'}
                        value={newCouponValue}
                        onChange={(e) => setNewCouponValue(e.target.value)}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                      />
                    </div>
                  </div>

                  {/* Min Order & Max Discount */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 block">الحد الأدنى للطلب (اختياري)</label>
                      <input
                        type="number"
                        placeholder="مثال: 100"
                        value={newCouponMinOrder}
                        onChange={(e) => setNewCouponMinOrder(e.target.value)}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 block">أقصى خصم (اختياري)</label>
                      <input
                        type="number"
                        placeholder="مثال: 50"
                        value={newCouponMaxDiscount}
                        disabled={newCouponType === 'fixed'}
                        onChange={(e) => setNewCouponMaxDiscount(e.target.value)}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#3D271D] disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Max Uses & Expiration */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 block">أقصى مرات استخدام (اختياري)</label>
                      <input
                        type="number"
                        placeholder="مثال: 100"
                        value={newCouponMaxUses}
                        onChange={(e) => setNewCouponMaxUses(e.target.value)}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 block">تاريخ الانتهاء (اختياري)</label>
                      <input
                        type="datetime-local"
                        value={newCouponExpiresAt}
                        onChange={(e) => setNewCouponExpiresAt(e.target.value)}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                      />
                    </div>
                  </div>

                  {/* Active Status Switch */}
                  <div className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-200">
                    <span className="text-xs font-bold text-stone-700">تفعيل الكوبون للعملاء</span>
                    <button
                      type="button"
                      onClick={() => setNewCouponActive(!newCouponActive)}
                      className={`w-12 h-6 rounded-full p-0.5 transition-all duration-300 ${newCouponActive ? 'bg-emerald-600' : 'bg-stone-300'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-all duration-300 transform ${newCouponActive ? 'translate-x-0' : '-translate-x-6'}`} />
                    </button>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveCoupon}
                      className="flex-1 py-3 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      {editingCouponId ? <Check size={14} /> : <Plus size={14} />}
                      <span>{editingCouponId ? 'تعديل وحفظ الكوبون' : 'إضافة الكوبون للنظام'}</span>
                    </button>

                    {editingCouponId && (
                      <button
                        type="button"
                        onClick={handleCancelEditCoupon}
                        className="px-4 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-all"
                      >
                        إلغاء
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Coupons List Column */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
                <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2 border-b border-stone-100 pb-3">
                  <Tag size={18} className="text-[#8C6D48]" />
                  <span>جميع كوبونات الخصم المسجلة ({coupons.length})</span>
                </h3>

                {coupons.length === 0 ? (
                  <div className="text-center py-12 text-stone-400 space-y-2">
                    <Tag size={40} className="mx-auto text-stone-300" />
                    <p className="text-sm font-bold">لم يتم تسجيل أي كوبون خصم بعد</p>
                    <p className="text-xs">استخدم النموذج الجانبي لإضافة الكوبون الأول وتفعيله</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {coupons.map((coupon) => {
                      const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
                      const isLimitReached = coupon.maxUses && coupon.usageCount && coupon.usageCount >= coupon.maxUses;
                      const statusColor = (!coupon.active) 
                        ? 'bg-rose-50 border-rose-200 text-rose-700' 
                        : isExpired 
                          ? 'bg-amber-50 border-amber-200 text-amber-700' 
                          : isLimitReached
                            ? 'bg-orange-50 border-orange-200 text-orange-700'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700';
                            
                      const statusText = (!coupon.active)
                        ? 'معطل ✕'
                        : isExpired
                          ? 'منتهي الصلاحية'
                          : isLimitReached
                            ? 'اكتمل الاستخدام'
                            : 'نشط ومفعّل ✓';

                      return (
                        <div key={coupon.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 relative overflow-hidden flex flex-col justify-between shadow-2xs">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black font-mono tracking-wider text-stone-900 bg-white border px-2.5 py-0.5 rounded-lg shadow-2xs uppercase">
                                  {coupon.code}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(coupon.code);
                                    alert(`تم نسخ الكوبون: ${coupon.code}`);
                                  }}
                                  className="text-[10px] text-stone-500 hover:text-stone-800 bg-white hover:bg-stone-100 p-1 rounded-md border"
                                  title="نسخ رمز الكوبون"
                                >
                                  نسخ 📋
                                </button>
                              </div>
                              <p className="text-xs font-black text-stone-800 pt-1">
                                {coupon.discountType === 'percentage' ? `خصم نسبة مئوية %${coupon.discountValue}` : `خصم ثابت بقيمة ${coupon.discountValue} ${currency}`}
                              </p>
                            </div>

                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${statusColor}`}>
                              {statusText}
                            </span>
                          </div>

                          {/* Restrictions */}
                          <div className="text-[11px] text-stone-600 font-medium space-y-1 border-t border-dashed border-stone-200 pt-2.5">
                            {coupon.minOrderAmount ? (
                              <p>• الحد الأدنى للطلب: <span className="font-bold text-stone-800">{coupon.minOrderAmount} {currency}</span></p>
                            ) : (
                              <p>• لا يوجد حد أدنى لمبلغ الطلب</p>
                            )}
                            
                            {coupon.discountType === 'percentage' && coupon.maxDiscountAmount && (
                              <p>• الحد الأقصى لمبلغ الخصم: <span className="font-bold text-stone-800">{coupon.maxDiscountAmount} {currency}</span></p>
                            )}

                            <p>
                              • مرات الاستخدام: <span className="font-bold text-stone-800">{coupon.usageCount || 0}</span>
                              {coupon.maxUses ? ` من أصل ${coupon.maxUses}` : ' (غير محدود)'}
                            </p>

                            {coupon.expiresAt && (
                              <p>• ينتهي في: <span className="font-bold text-stone-800">{new Date(coupon.expiresAt).toLocaleDateString('ar-EG')} {new Date(coupon.expiresAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span></p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 border-t border-stone-200 pt-2.5 mt-1">
                            <button
                              type="button"
                              onClick={() => handleEditCouponClick(coupon)}
                              className="flex-1 py-1.5 rounded-xl bg-white hover:bg-stone-100 border text-stone-800 font-bold text-xs transition-colors"
                            >
                              تعديل ✍
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCoupon(coupon.id)}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-xs transition-colors"
                              title="حذف الكوبون"
                            >
                              حذف 🗑
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}



        {/* ================= 📊 PAGE: LIVE TABLES TRACKING & ORDERS ================= */}
        {activeTab === 'tables-tracking' && (
          <div className="space-y-6">
            {/* Header with quick stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[#2D1E18]">متابعة طلبات وعداد الطاولات الحية</h2>
                <p className="text-xs text-[#7A614A]">
                  شاشة ذكية لعرض كافة الطاولات مع الطلبات النشطة، مدد الجلوس، والتحكم الفوري بطلبات المطبخ.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleBatchSettlement}
                  className="px-4 py-2.5 rounded-2xl bg-stone-900 hover:bg-black text-white text-xs font-black shadow-sm flex items-center gap-2 transition-all"
                  title="تفريغ وتسوية كافة الطاولات بنهاية اليوم بضغطة زر واحدة"
                >
                  <CheckCheck size={15} className="text-amber-400" />
                  <span>تفريغ كافة الطاولات (تسوية جماعية)</span>
                </button>
              </div>
            </div>

            {/* Smart Counters Block */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-3xl p-5 border border-[#E5D5BC] shadow-xs">
                <p className="text-[10px] font-bold text-stone-500">إجمالي طاولات الصالة</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-[#3D271D]">{tables.length}</span>
                  <span className="text-[10px] text-stone-400">طاولة</span>
                </div>
              </div>

              <div className="bg-[#E8F5E9] rounded-3xl p-5 border border-emerald-200 shadow-xs">
                <p className="text-[10px] font-bold text-emerald-800">مشغول حالياً</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-emerald-700">
                    {tables.filter(t => Number(t.tableNumber) !== 0 && t.status === 'busy').length}
                  </span>
                  <span className="text-[10px] text-emerald-600">طاولة</span>
                </div>
              </div>

              <div className="bg-[#FFF8E1] rounded-3xl p-5 border border-amber-200 shadow-xs animate-pulse">
                <p className="text-[10px] font-bold text-amber-800">يطلبون الشيك / الحساب 🔔</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-amber-600">
                    {tables.filter(t => Number(t.tableNumber) !== 0 && t.status === 'bill_requested').length}
                  </span>
                  <span className="text-[10px] text-amber-600">طاولات</span>
                </div>
              </div>

              <div className="bg-stone-50 rounded-3xl p-5 border border-stone-200 shadow-xs">
                <p className="text-[10px] font-bold text-stone-600">فارغ ومتاح للزبائن</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-stone-500">
                    {tables.filter(t => Number(t.tableNumber) !== 0 && t.status === 'available').length}
                  </span>
                  <span className="text-[10px] text-stone-400">طاولة</span>
                </div>
              </div>
            </div>

            {/* Table Details and Orders Tracking */}
            <div className="space-y-4">
              <h3 className="font-black text-base text-[#2D1E18]">تفاصيل طلبات كل طاولة نشطة</h3>
              
              {tables.filter(t => Number(t.tableNumber) !== 0 && t.status !== 'available').length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-[#E5D5BC] text-center text-stone-500 space-y-3">
                  <CheckCircle className="w-12 h-12 text-stone-300 mx-auto" />
                  <p className="font-bold text-sm">كل الطاولات فارغة تماماً الآن.</p>
                  <p className="text-xs text-stone-400">عندما يقوم العميل بطلب مشروب أو طعام، ستظهر تفاصيل طاولته وطلباته هنا فوراً للتحكم بها.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {tables.filter(t => Number(t.tableNumber) !== 0 && t.status !== 'available').map((table) => {
                    const tableOrders = orders.filter(
                      o => Number(o.tableNumber) === Number(table.tableNumber) && o.status !== 'cancelled' && o.status !== 'completed'
                    );
                    const totalDue = tableOrders.reduce((sum, o) => sum + o.total, 0);
                    const durationInfo = getSittingDurationInfo(table);

                    return (
                      <div 
                        key={table.tableNumber}
                        className={`bg-white rounded-3xl border p-6 space-y-4 shadow-md transition-all ${
                          table.status === 'bill_requested'
                            ? 'border-amber-400 ring-4 ring-amber-400/20'
                            : 'border-emerald-200'
                        }`}
                      >
                        {/* Table Top Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-[#3D271D] text-white flex items-center justify-center font-black text-lg shadow-sm">
                              {table.tableNumber}
                            </div>
                            <div>
                              <h4 className="font-black text-sm text-[#2D1E18]">طاولة رقم ({table.tableNumber})</h4>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`w-2 h-2 rounded-full ${table.status === 'bill_requested' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                                <span className="text-[11px] font-bold text-stone-500">
                                  {table.status === 'bill_requested' ? 'زبون يطلب الشيك الآن 🔔' : 'زبون جالس يطلب'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Seating Timer & Settle Button */}
                          <div className="flex items-center gap-2">
                            {durationInfo && (
                              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border ${durationInfo.badgeClass}`}>
                                {durationInfo.durationText}
                              </span>
                            )}
                            <button
                              onClick={() => handleFreeUpTable(table.tableNumber)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] shadow-xs transition-all"
                            >
                              تسوية وتفريغ الطاولة
                            </button>
                          </div>
                        </div>

                        {/* Customer device lock and details */}
                        <div className="flex items-center justify-between text-[11px] bg-stone-50 p-2.5 rounded-2xl border border-stone-100">
                          <span className="text-stone-600 font-bold">
                            العميل: <strong className="text-stone-800">{table.activeSessionCustomerName || 'ضيف بدون اسم'}</strong>
                          </span>
                          <span className="font-black text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-100 shadow-2xs">
                            إجمالي الحساب المستحق: {totalDue} {currency}
                          </span>
                        </div>

                        {/* Order Items tracking list */}
                        <div className="space-y-3 pt-2">
                          <h5 className="font-black text-xs text-stone-700">متابعة طلبات المطبخ والحالة للطلبات النشطة:</h5>
                          
                          {tableOrders.length === 0 ? (
                            <p className="text-xs text-stone-400 italic">لا توجد طلبات نشطة حالياً (تم تحضير أو إلغاء كل شيء).</p>
                          ) : (
                            <div className="space-y-3">
                              {tableOrders.map((order) => (
                                <div key={order.id} className="p-3 bg-[#FAF4EA]/50 border border-[#E5D7C2]/40 rounded-2xl space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-black text-stone-800">
                                      طلب #{order.id.slice(-4)} ({order.paymentMethod === 'card' ? 'فيزا' : 'كاش'})
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {/* Quick order status updating button controls (2-stage lifecycle) */}
                                      <button
                                        onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                                        disabled={updatingOrderIds?.has(order.id)}
                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all ${
                                          order.status === 'preparing' ? 'bg-blue-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                        } ${updatingOrderIds?.has(order.id) ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        title="المرحلة 1: تم استلام الطلب وبدء التحضير"
                                      >
                                        1. تحضير
                                      </button>
                                      <button
                                        onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                                        disabled={updatingOrderIds?.has(order.id)}
                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all ${
                                          order.status === 'delivered' || order.status === 'ready' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                        } ${updatingOrderIds?.has(order.id) ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        title="المرحلة 2: تم تجهيز الطلب وتسليمه"
                                      >
                                        2. تسليم ✓
                                      </button>
                                      <button
                                        onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                                        disabled={updatingOrderIds?.has(order.id)}
                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black bg-stone-700 text-white hover:bg-stone-800 transition-all ${
                                          updatingOrderIds?.has(order.id) ? 'opacity-60 cursor-not-allowed' : ''
                                        }`}
                                      >
                                        محاسبة ✓
                                      </button>
                                    </div>
                                  </div>

                                  {/* List of items in this single order */}
                                  <div className="space-y-1.5">
                                    {(order.items || []).map((item, idx) => {
                                      const name = item?.menuItem?.name || (item as any)?.name || 'صنف';
                                      const price = item?.menuItem?.price ?? (item as any)?.price ?? 0;
                                      const quantity = item?.quantity || 1;
                                      return (
                                        <div key={idx} className="flex items-center justify-between text-xs bg-white/60 px-2.5 py-1.5 rounded-xl border border-stone-100">
                                          <div className="flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-md bg-[#3D271D] text-white flex items-center justify-center text-[10px] font-bold">
                                              {quantity}x
                                            </span>
                                            <span className="font-bold text-stone-800">{name}</span>
                                            {item.notes && (
                                              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 rounded">
                                                ({item.notes})
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-[10px] text-stone-500">
                                            {price * quantity} {currency}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Settle table receipt button helper */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                          <button
                            onClick={() => printThermalTable(table.tableNumber)}
                            className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#3D271D] text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <Printer size={13} />
                            <span>طباعة الحساب للطاولة</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= 🤖 PAGE: CHATBOT CONFIGURATION (REMOVED) ================= */}
        {false && (
          <div className="space-y-6">
            {/* Header Description */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center justify-center shadow-md flex-shrink-0 animate-bounce">
                  <Bot size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-[#2D1E18]">إدارة وتعديل الشات بوت العائم (Chatbot)</h2>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      chatbotSettings?.enabled ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-stone-100 text-stone-600 border border-stone-200'
                    }`}>
                      {chatbotSettings?.enabled ? 'مفعل ويظهر للزبائن' : 'معطل ومخفي'}
                    </span>
                  </div>
                  <p className="text-xs text-[#7A614A] mt-1">
                    قم بتوفير ردود ذكية وتلقائية على استفسارات الزبائن المتكررة مثل الواي فاي، مواعيد العمل، العروض، والدفع.
                  </p>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => setChatbotSettings?.(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  chatbotSettings?.enabled
                    ? 'bg-[#3D271D] text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <span>{chatbotSettings?.enabled ? 'تعطيل الشات بوت' : 'تشغيل وتفعيل الشات بوت'}</span>
              </button>
            </div>

            {/* Layout Grid: Setup Form + Live Chat Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Form Config & QAs */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 1. Bot Settings Identity Form */}
                <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
                  <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2 border-b border-stone-100 pb-2">
                    <Sliders size={16} className="text-violet-600" />
                    <span>تخصيص هوية وصورة ومظهر المساعد الذكي</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-stone-700 block mb-1">اسم الشات بوت (المساعد)</label>
                      <input 
                        type="text"
                        value={chatbotSettings?.botName || ''}
                        onChange={(e) => setChatbotSettings?.(prev => ({ ...prev, botName: e.target.value }))}
                        className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-violet-500"
                        placeholder="مثال: المساعد الذكي لطلبك"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-stone-700 block mb-1">صورة الأفاتار (رابط أو ارفع من جهازك)</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={chatbotSettings?.botAvatar || ''}
                          onChange={(e) => setChatbotSettings?.(prev => ({ ...prev, botAvatar: e.target.value }))}
                          className="flex-1 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-violet-500"
                          placeholder="رابط صورة الأفاتار أو ارفع من جهازك"
                        />
                        <input 
                          type="file"
                          accept="image/*"
                          ref={botAvatarInputRef}
                          onChange={handleBotAvatarUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => botAvatarInputRef.current?.click()}
                          disabled={isUploadingBotAvatar}
                          className="px-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center transition-colors"
                          title="رفع صورة من الجهاز"
                        >
                          <Upload size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-stone-700 block mb-1">الرسالة الترحيبية الأولى للزبون</label>
                      <textarea 
                        rows={2}
                        value={chatbotSettings?.welcomeMessage || ''}
                        onChange={(e) => setChatbotSettings?.(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                        className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-violet-500"
                        placeholder="الرسالة الترحيبية الافتتاحية عند فتح نافذة الشات بوت..."
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-stone-700 block mb-1">الرد الافتراضي عند عدم الفهم (Fallback)</label>
                      <textarea 
                        rows={2}
                        value={chatbotSettings?.fallbackMessage || ''}
                        onChange={(e) => setChatbotSettings?.(prev => ({ ...prev, fallbackMessage: e.target.value }))}
                        className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-violet-500"
                        placeholder="في حال سأل الزبون سؤالاً غير متطابق مع أي سؤال متوفر في الأسئلة المتكررة..."
                      />
                    </div>
                  </div>

                  {/* Preset Premium Avatars to Pick with one click */}
                  <div className="space-y-1.5 pt-2 border-t border-stone-100">
                    <p className="text-[11px] font-bold text-stone-600">اختر أفاتار بريميوم بضغطة واحدة:</p>
                    <div className="flex gap-2">
                      {[
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
                        'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80',
                        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
                        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80'
                      ].map((presetUrl, presetIdx) => (
                        <button
                          key={presetIdx}
                          type="button"
                          onClick={() => setChatbotSettings?.(prev => ({ ...prev, botAvatar: presetUrl }))}
                          className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${
                            chatbotSettings?.botAvatar === presetUrl ? 'border-violet-600 scale-110 shadow-md' : 'border-stone-200 hover:scale-105'
                          }`}
                        >
                          <img src={presetUrl} alt="preset-avatar" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Animation movement control */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-[#2D1E18]">حركة واهتزاز زر المساعد الذكي (Animation)</h4>
                      <p className="text-[10px] text-stone-500 font-medium">تمكين الحركة الدورية لزر المساعد لجذب انتباه العميل أو إيقاف حركته ليكون ثابتاً</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setChatbotSettings?.(prev => ({ ...prev, disableAnimation: !prev.disableAnimation }))}
                      className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out relative flex items-center flex-shrink-0 ${
                        !chatbotSettings?.disableAnimation ? 'bg-emerald-600 justify-end' : 'bg-stone-300 justify-start'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-full bg-white shadow-md block transition-transform" />
                    </button>
                  </div>
                </div>

                {/* 2. Add / Edit Q&A Forms */}
                <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
                  <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-2 border-b border-stone-100 pb-2">
                    <MessageSquare size={16} className="text-violet-600" />
                    <span>{editingQAId ? 'تعديل سؤال وإجابة' : 'إضافة سؤال وإجابة ذكية جديدة'}</span>
                  </h3>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newBotQuestion.trim() || !newBotReply.trim()) return;
                      const qData: ChatbotQA = {
                        id: editingQAId || `qa-${Date.now()}`,
                        question: newBotQuestion.trim(),
                        reply: newBotReply.trim(),
                        active: true
                      };
                      if (setChatbotQAs) {
                        setChatbotQAs(prev => {
                          if (editingQAId) {
                            return prev.map(q => q.id === editingQAId ? qData : q);
                          } else {
                            return [...prev, qData];
                          }
                        });
                      }
                      setNewBotQuestion('');
                      setNewBotReply('');
                      setEditingQAId(null);
                    }} 
                    className="space-y-4"
                  >
                    <div>
                      <label className="text-[11px] font-bold text-stone-700 block mb-1">السؤال المتوقع من الزبون (مثال: ما هو الباسورد؟)</label>
                      <input 
                        type="text"
                        value={newBotQuestion}
                        onChange={(e) => setNewBotQuestion(e.target.value)}
                        className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-violet-500"
                        placeholder="اكتب السؤال بكلمات واضحة..."
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-stone-700 block mb-1">الرد التلقائي للشات بوت</label>
                      <textarea 
                        rows={3}
                        value={newBotReply}
                        onChange={(e) => setNewBotReply(e.target.value)}
                        className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-violet-500"
                        placeholder="اكتب الإجابة الفورية والشاملة للرد بها على الزبون..."
                        required
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      {editingQAId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQAId(null);
                            setNewBotQuestion('');
                            setNewBotReply('');
                          }}
                          className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all"
                        >
                          إلغاء التعديل
                        </button>
                      )}
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-2xl bg-violet-700 hover:bg-violet-800 text-white text-xs font-black shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <Plus size={14} />
                        <span>{editingQAId ? 'حفظ التعديلات الحالية' : 'إضافة السؤال والجواب لقاعدة الردود'}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* 3. Existing Custom QA List */}
                <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
                  <h3 className="font-black text-sm text-[#2D1E18]">الأسئلة المتكررة وقاعدة الردود النشطة ({chatbotQAs.length})</h3>
                  
                  {chatbotQAs.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">لا توجد ردود مسجلة بعد. يرجى استخدام النموذج أعلاه لإضافة أول رد تلقائي.</p>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {chatbotQAs.map((qa) => (
                        <div 
                          key={qa.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            qa.active ? 'bg-[#FAF4EA]/50 border-[#E5D5BC]' : 'bg-stone-50 border-stone-200 opacity-70'
                          }`}
                        >
                          <div className="space-y-1">
                            <h4 className="font-black text-xs text-[#2D1E18] flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                              <span>س: {qa.question}</span>
                            </h4>
                            <p className="text-[11px] text-stone-600 leading-relaxed">ج: {qa.reply}</p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Toggle active switch */}
                            <button
                              type="button"
                              onClick={() => {
                                if (setChatbotQAs) {
                                  setChatbotQAs(prev => prev.map(item => item.id === qa.id ? { ...item, active: !item.active } : item));
                                }
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
                                qa.active ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-stone-100 text-stone-600 border-stone-300'
                              }`}
                            >
                              {qa.active ? 'نشط ومفعل' : 'موقوف'}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingQAId(qa.id);
                                setNewBotQuestion(qa.question);
                                setNewBotReply(qa.reply);
                              }}
                              className="px-2 py-1 rounded-lg text-[10px] bg-stone-100 text-stone-700 hover:bg-stone-200 font-bold"
                            >
                              تعديل
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('هل أنت متأكد من حذف هذا السؤال والإجابة؟')) {
                                  if (setChatbotQAs) {
                                    setChatbotQAs(prev => prev.filter(item => item.id !== qa.id));
                                  }
                                }
                              }}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: Interactive Chatbot Live Simulator */}
              <div className="lg:col-span-5">
                <div className="sticky top-6 bg-[#2B231F] text-white rounded-3xl p-5 border border-stone-700 shadow-xl space-y-4 flex flex-col justify-between min-h-[500px]">
                  
                  {/* Mock Simulator Header */}
                  <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img 
                          src={chatbotSettings?.botAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'} 
                          alt="Bot avatar preview" 
                          className="w-10 h-10 rounded-full object-cover border border-violet-500 shadow-sm"
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-[#2B231F]" />
                      </div>
                      <div>
                        <h4 className="font-black text-xs text-white">{chatbotSettings?.botName || 'المساعد الذكي لطلبك'}</h4>
                        <p className="text-[9px] text-stone-400">محاكي تجربة العميل (مباشر)</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setChatPreviewHistory([{ sender: 'bot', text: chatbotSettings?.welcomeMessage || 'أهلاً بك! كيف يمكنني مساعدتك اليوم؟' }])}
                      className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
                      title="مسح وتصفير المحادثة"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>

                  {/* Chat Preview Scroll Body */}
                  <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px] max-h-[350px] p-2 bg-stone-900/60 rounded-2xl scrollbar-none">
                    {chatPreviewHistory.map((msg, idx) => (
                      <div 
                        key={idx}
                        className={`flex gap-2 max-w-[85%] ${msg.sender === 'user' ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
                      >
                        {msg.sender === 'bot' && (
                          <img 
                            src={chatbotSettings?.botAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'} 
                            alt="avatar" 
                            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                          />
                        )}
                        <div className={`p-2.5 rounded-2xl text-[11px] leading-relaxed ${
                          msg.sender === 'user' 
                            ? 'bg-violet-700 text-white rounded-tr-none' 
                            : 'bg-stone-800 text-stone-200 rounded-tl-none'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Frequently Asked Q&A Suggestion Pills for easy click-and-ask testing */}
                  <div className="space-y-1 pb-1">
                    <p className="text-[9px] text-stone-500 font-bold">اضغط للاختبار الفوري:</p>
                    <div className="flex flex-wrap gap-1">
                      {chatbotQAs.filter(qa => qa.active).slice(0, 3).map((qa) => (
                        <button
                          key={qa.id}
                          type="button"
                          onClick={() => {
                            const userText = qa.question;
                            setChatPreviewHistory(prev => [...prev, { sender: 'user', text: userText }]);
                            setTimeout(() => {
                              setChatPreviewHistory(prev => [...prev, { sender: 'bot', text: qa.reply }]);
                            }, 400);
                          }}
                          className="bg-stone-800 hover:bg-stone-700 text-[10px] text-stone-300 font-bold px-2 py-1 rounded-lg border border-stone-700 text-right truncate max-w-[150px]"
                        >
                          {qa.question}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat Input Bar */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!chatPreviewInput.trim()) return;
                      const uText = chatPreviewInput.trim();
                      setChatPreviewHistory(prev => [...prev, { sender: 'user', text: uText }]);
                      setChatPreviewInput('');

                      setTimeout(() => {
                        const activeQAs = chatbotQAs.filter(qa => qa.active);
                        let matchRep = chatbotSettings?.fallbackMessage || 'عذراً، لم أفهم سؤالك تماماً. هل يمكنك إعادة صياغته أو الاختيار من الأسئلة المتكررة المتاحة؟';
                        
                        const match = activeQAs.find(q => 
                          uText.toLowerCase().includes(q.question.toLowerCase()) || 
                          q.question.toLowerCase().includes(uText.toLowerCase())
                        );
                        if (match) {
                          matchRep = match.reply;
                        }
                        setChatPreviewHistory(prev => [...prev, { sender: 'bot', text: matchRep }]);
                      }, 400);
                    }}
                    className="flex gap-2"
                  >
                    <input 
                      type="text"
                      value={chatPreviewInput}
                      onChange={(e) => setChatPreviewInput(e.target.value)}
                      className="flex-1 p-2.5 bg-stone-800 rounded-xl border border-stone-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500 text-right"
                      placeholder="اكتب رسالة للتجربة الحية..."
                    />
                    <button
                      type="submit"
                      className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center flex-shrink-0 transition-colors"
                    >
                      <Send size={14} />
                    </button>
                  </form>

                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* ================= PRINTABLE THERMAL RECEIPT / STAND CARD TEMPLATES ================= */}
      {/* 1. Printable Single Order Thermal Receipt */}
      {printableOrder && (
        <ThermalReceipt 
          type="order" 
          order={printableOrder} 
          settings={settings} 
          currency={currency} 
        />
      )}

      {/* 2. Printable Table Bill Summary Receipt */}
      {printableTableBill && (
        <ThermalReceipt 
          type="table-bill" 
          tableBill={printableTableBill} 
          settings={settings} 
          currency={currency} 
        />
      )}

      {/* 3. Printable QR Stand Cards for all tables */}
      {printableQRStands && (
        <div className="hidden print:block p-4 bg-white text-black">
          <div className="grid grid-cols-2 gap-6">
            {printableQRStands.map((t) => (
              <div 
                key={t.tableNumber}
                className="border-2 border-dashed border-stone-800 p-6 rounded-3xl text-center flex flex-col items-center justify-between min-h-[300px]"
              >
                <div>
                  <h2 className="font-black text-lg">{settings.systemName}</h2>
                  <p className="text-xs text-stone-600">امسح الكود لفتح المنيو والطلب مباشرة</p>
                </div>

                <div className="my-3">
                  <img 
                    src={getQRImageUrl(getTableUrl(t.tableNumber))} 
                    alt={`QR طاولة ${t.tableNumber}`}
                    className="w-44 h-44 object-contain mx-auto"
                  />
                </div>

                <div className="bg-stone-900 text-white px-6 py-1.5 rounded-full font-black text-base">
                  {`طاولة رقم (${t.tableNumber})`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Batch Create Tables Dialog Modal */}
      {showBatchTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" style={{ direction: 'rtl' }}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2 text-[#3D271D]">
                <Layers size={20} className="text-[#8C6D48]" />
                <h3 className="font-black text-base">إنشاء مجموعة طاولات دفعة واحدة</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchTableModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-stone-600 leading-relaxed font-medium">
                أدخل عدد الطاولات التي ترغب بإضافتها للنظام دفعة واحدة. سيتم توليد أرقام متسلسلة تلقائياً وتوليد أكواد QR الخاصة بها فوراً.
              </p>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">عدد الطاولات المراد إنشاؤها</label>
                <input 
                  type="number"
                  min="1"
                  max="100"
                  value={batchTableCountInput}
                  onChange={(e) => setBatchTableCountInput(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[11px] font-bold text-stone-500">خيارات سريعة:</span>
                {[5, 10, 15, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setBatchTableCountInput(num)}
                    className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      batchTableCountInput === num
                        ? 'bg-[#3D271D] text-white shadow-xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    +{num}
                  </button>
                ))}
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-900 font-medium">
                💡 الطاولات الجديدة سيتم حفظها بشكل دائم في قاعدة البيانات ويمكنك طباعة أو تحميل أكوادها فوراً.
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleAddBatchTables(batchTableCountInput);
                    setShowBatchTableModal(false);
                  }}
                  className="flex-1 py-3 bg-[#3D271D] hover:bg-[#2A1D15] text-white font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus size={15} />
                  <span>توليد وتفعيل {batchTableCountInput} طاولات الآن</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBatchTableModal(false)}
                  className="px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-2xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Dialog Modal */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" style={{ direction: 'rtl' }}>
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2 text-[#3D271D]">
                <FolderPlus size={20} className="text-[#8C6D48]" />
                <h3 className="font-black text-base">إضافة قسم جديد للمنيو (ثنائي اللغة)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCatModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">اسم القسم (بالعربية) *</label>
                <input 
                  type="text"
                  placeholder="مثال: بيتزا ومعجنات، مشروبات ساخنة، مقبلات"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">اسم القسم (بالإنجليزية / English Name)</label>
                <input 
                  type="text"
                  placeholder="e.g. Pizza & Pastries, Hot Drinks, Starters"
                  value={newCatNameEn}
                  onChange={(e) => setNewCatNameEn(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">وصف القسم (بالعربية)</label>
                <input 
                  type="text"
                  placeholder="مختصر جذاب يظهر للزبون تحت اسم القسم"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">وصف القسم (بالإنجليزية / English Description)</label>
                <input 
                  type="text"
                  placeholder="e.g. Freshly baked artisan pizza and pastries"
                  value={newCatDescEn}
                  onChange={(e) => setNewCatDescEn(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">صورة القسم</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="رابط صورة مباشر أو اضغط زر الرفع"
                    value={newCatImage}
                    onChange={(e) => setNewCatImage(e.target.value)}
                    className="flex-1 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                  />
                  <button
                    type="button"
                    onClick={() => catImgInputRef.current?.click()}
                    disabled={isUploadingCatImg}
                    className="px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors border border-stone-200 flex-shrink-0"
                  >
                    <Upload size={14} />
                    <span>{isUploadingCatImg ? 'جاري...' : 'رفع صورة'}</span>
                  </button>
                </div>
              </div>

              {/* Time Scheduling Configuration */}
              <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E5D5BC] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-[#8C6D48]" />
                    <div>
                      <h4 className="text-xs font-black text-[#2D1E18]">جدول وتوقيت ظهور القسم</h4>
                      <p className="text-[10px] text-stone-500">تحديد أوقات محددة للقسم (مثل قائمة الفطار أو الغداء أو السهرة)</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={newCatScheduleEnabled}
                    onChange={(e) => setNewCatScheduleEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-[#3D271D] focus:ring-[#3D271D] accent-[#3D271D] cursor-pointer"
                  />
                </div>

                {newCatScheduleEnabled && (
                  <div className="space-y-2.5 pt-2 border-t border-[#E5D5BC]/60 animate-in fade-in duration-200">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-stone-600 block mb-1">وقت البدء من الساعة</label>
                        <input 
                          type="time"
                          value={newCatScheduleStartTime}
                          onChange={(e) => setNewCatScheduleStartTime(e.target.value)}
                          className="w-full p-2 bg-white rounded-xl border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-600 block mb-1">وقت الانتهاء حتى الساعة</label>
                        <input 
                          type="time"
                          value={newCatScheduleEndTime}
                          onChange={(e) => setNewCatScheduleEndTime(e.target.value)}
                          className="w-full p-2 bg-white rounded-xl border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-600 block mb-1">طريقة عمل التوقيت:</label>
                      <select
                        value={newCatScheduleAction}
                        onChange={(e) => setNewCatScheduleAction(e.target.value as 'pin_top' | 'hide_outside')}
                        className="w-full p-2 bg-white rounded-xl border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                      >
                        <option value="pin_top">📌 تثبيت القسم في أول القائمة تلقائياً أثناء هذا الوقت</option>
                        <option value="hide_outside">👁️ إخفاء القسم نهائياً من الزبائن خارج هذا الوقت</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddCatModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5"
                >
                  <Plus size={16} />
                  <span>تأكيد إضافة القسم</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Dialog Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" style={{ direction: 'rtl' }}>
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2 text-[#3D271D]">
                <Pencil size={18} className="text-[#8C6D48]" />
                <h3 className="font-black text-base">تعديل بيانات القسم (بالعربية والإنجليزية)</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">اسم القسم (بالعربية) *</label>
                <input 
                  type="text"
                  placeholder="مثال: مشروبات ساخنة"
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">اسم القسم (بالإنجليزية / English Name)</label>
                <input 
                  type="text"
                  placeholder="e.g. Hot Drinks"
                  value={editCatNameEn}
                  onChange={(e) => setEditCatNameEn(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">وصف القسم (بالعربية)</label>
                <input 
                  type="text"
                  placeholder="وصف مختصر للقسم"
                  value={editCatDesc}
                  onChange={(e) => setEditCatDesc(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">وصف القسم (بالإنجليزية / English Description)</label>
                <input 
                  type="text"
                  placeholder="Brief description in English"
                  value={editCatDescEn}
                  onChange={(e) => setEditCatDescEn(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">صورة القسم</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="رابط الصورة أو ارفعها من جهازك"
                    value={editCatImage}
                    onChange={(e) => setEditCatImage(e.target.value)}
                    className="flex-1 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                  />
                  <input 
                    type="file"
                    accept="image/*"
                    ref={editCatImgInputRef}
                    onChange={handleEditCatImageFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => editCatImgInputRef.current?.click()}
                    disabled={isUploadingEditCatImg}
                    className="px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors border border-stone-200 flex-shrink-0"
                  >
                    <Upload size={14} />
                    <span>{isUploadingEditCatImg ? 'جاري...' : 'رفع'}</span>
                  </button>
                </div>
              </div>

              {/* Time Scheduling Configuration */}
              <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E5D5BC] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-[#8C6D48]" />
                    <div>
                      <h4 className="text-xs font-black text-[#2D1E18]">جدول وتوقيت ظهور القسم</h4>
                      <p className="text-[10px] text-stone-500">تحديد أوقات محددة للقسم (مثل قائمة الفطار أو الغداء أو السهرة)</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={editCatScheduleEnabled}
                    onChange={(e) => setEditCatScheduleEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-[#3D271D] focus:ring-[#3D271D] accent-[#3D271D] cursor-pointer"
                  />
                </div>

                {editCatScheduleEnabled && (
                  <div className="space-y-2.5 pt-2 border-t border-[#E5D5BC]/60 animate-in fade-in duration-200">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-stone-600 block mb-1">وقت البدء من الساعة</label>
                        <input 
                          type="time"
                          value={editCatScheduleStartTime}
                          onChange={(e) => setEditCatScheduleStartTime(e.target.value)}
                          className="w-full p-2 bg-white rounded-xl border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-600 block mb-1">وقت الانتهاء حتى الساعة</label>
                        <input 
                          type="time"
                          value={editCatScheduleEndTime}
                          onChange={(e) => setEditCatScheduleEndTime(e.target.value)}
                          className="w-full p-2 bg-white rounded-xl border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-600 block mb-1">طريقة عمل التوقيت:</label>
                      <select
                        value={editCatScheduleAction}
                        onChange={(e) => setEditCatScheduleAction(e.target.value as 'pin_top' | 'hide_outside')}
                        className="w-full p-2 bg-white rounded-xl border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                      >
                        <option value="pin_top">📌 تثبيت القسم في أول القائمة تلقائياً أثناء هذا الوقت</option>
                        <option value="hide_outside">👁️ إخفاء القسم نهائياً من الزبائن خارج هذا الوقت</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check size={16} />
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Dialog Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" style={{ direction: 'rtl' }}>
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2 text-[#3D271D]">
                <Pencil size={18} className="text-[#8C6D48]" />
                <h3 className="font-black text-base">تعديل بيانات الصنف (بالعربية والإنجليزية)</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 block">اسم الصنف (بالعربية) *</label>
                  <input 
                    type="text"
                    placeholder="الاسم بالعربية"
                    value={editItemName}
                    onChange={(e) => setEditItemName(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 block">اسم الصنف (بالإنجليزية / English Name)</label>
                  <input 
                    type="text"
                    placeholder="Name in English"
                    value={editItemNameEn}
                    onChange={(e) => setEditItemNameEn(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 block">السعر ({currency}) *</label>
                  <input 
                    type="number"
                    step="any"
                    placeholder="السعر"
                    value={editItemPrice}
                    onChange={(e) => setEditItemPrice(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 block">السعرات الحرارية</label>
                  <input 
                    type="number"
                    placeholder="كالوري (اختياري)"
                    value={editItemCalories}
                    onChange={(e) => setEditItemCalories(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 block">القسم التابع له</label>
                  <select
                    value={editItemCategoryId}
                    onChange={(e) => setEditItemCategoryId(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D271D] font-bold"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 block">الوصف والمكونات (بالعربية)</label>
                  <textarea 
                    rows={2}
                    placeholder="الوصف بالعربية"
                    value={editItemDesc}
                    onChange={(e) => setEditItemDesc(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 block">الوصف والمكونات (بالإنجليزية / English)</label>
                  <textarea 
                    rows={2}
                    placeholder="Description in English"
                    value={editItemDescEn}
                    onChange={(e) => setEditItemDescEn(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">صورة الصنف</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="رابط الصورة أو ارفعها من جهازك"
                    value={editItemImage}
                    onChange={(e) => setEditItemImage(e.target.value)}
                    className="flex-1 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                  />
                  <input 
                    type="file"
                    accept="image/*"
                    ref={editItemImgInputRef}
                    onChange={handleEditItemImageFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => editItemImgInputRef.current?.click()}
                    disabled={isUploadingEditItemImg}
                    className="px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors border border-stone-200 flex-shrink-0"
                  >
                    <Upload size={14} />
                    <span>{isUploadingEditItemImg ? 'جاري...' : 'رفع'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold text-stone-700 py-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={editItemIsPopular}
                    onChange={(e) => setEditItemIsPopular(e.target.checked)}
                    className="rounded text-[#3D271D]"
                  />
                  <span>تمييز كـ "الأكثر طلباً" ⭐</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={editItemIsNew}
                    onChange={(e) => setEditItemIsNew(e.target.checked)}
                    className="rounded text-[#3D271D]"
                  />
                  <span>تمييز كـ "صنف جديد" ✨</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check size={16} />
                  <span>حفظ تعديلات الصنف</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Price Update Modal */}
      {showBulkPriceModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200" style={{ direction: 'rtl' }}>
          <div className="bg-white border border-[#E5D5BC] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center font-black">
                  <TrendingUp size={22} />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#2D1E18]">تحديث الأسعار بشكل جماعي</h3>
                  <p className="text-xs text-stone-500">زيادة أو تخفيض أسعار أصناف المنيو بنسبة مئوية بضغطة زر</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowBulkPriceModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center font-bold text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyBulkPriceUpdate} className="space-y-4">
              {/* Target Category Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 block">القسم المستهدف للتحديث:</label>
                <select
                  value={bulkCatId}
                  onChange={(e) => setBulkCatId(e.target.value)}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                >
                  <option value="all">كل المنيو (جميع الأقسام - {menuItems.length} صنف)</option>
                  {categories.map(c => {
                    const count = menuItems.filter(m => m.categoryId === c.id).length;
                    return (
                      <option key={c.id} value={c.id}>
                        قسم ({c.name}) — {count} صنف
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Operation Type: Increase or Decrease */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 block">نوع العملية:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkOperation('increase')}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-black border transition-all flex items-center justify-center gap-2 ${
                      bulkOperation === 'increase'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <TrendingUp size={16} />
                    <span>زيادة الأسعار (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkOperation('decrease')}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-black border transition-all flex items-center justify-center gap-2 ${
                      bulkOperation === 'decrease'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Percent size={16} />
                    <span>تخفيض الأسعار (-)</span>
                  </button>
                </div>
              </div>

              {/* Percentage Input & Quick Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 block">النسبة المئوية (%):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    max="500"
                    step="0.5"
                    value={bulkPercentage}
                    onChange={(e) => setBulkPercentage(e.target.value)}
                    placeholder="أدخل النسبة مثل 10 أو 15"
                    className="flex-1 p-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm font-black text-stone-900 text-center focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                    required
                  />
                  <span className="font-black text-sm text-stone-700">%</span>
                </div>

                {/* Quick Percentage Chips */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  {['5', '10', '15', '20', '25', '50'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setBulkPercentage(p)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                        bulkPercentage === p
                          ? 'bg-[#3D271D] text-white border-[#3D271D]'
                          : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Rounding Rules */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 block">قواعد تقريب الأسعار الناتج:</label>
                <select
                  value={bulkRounding}
                  onChange={(e) => setBulkRounding(e.target.value as any)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#3D271D]"
                >
                  <option value="nearest_integer">تقريب لأقرب رقم صحيح (مثال: 52.4 {"->"} 52 ج.م)</option>
                  <option value="round_5">تقريب لأقرب مضاعفات 5 (مثال: 22 {"->"} 25 ج.م)</option>
                  <option value="none">بدون تقريب (كسور عشرية دقيقة)</option>
                </select>
              </div>

              {/* Live Preview Calculation */}
              {(() => {
                const targetItems = bulkCatId === 'all' 
                  ? menuItems 
                  : menuItems.filter(m => m.categoryId === bulkCatId);
                const count = targetItems.length;
                const pct = parseFloat(bulkPercentage) || 0;
                const factor = bulkOperation === 'increase' ? (1 + pct / 100) : (1 - pct / 100);
                const sample = targetItems[0];
                let sampleNew = sample ? sample.price * factor : 0;

                if (bulkRounding === 'nearest_integer') {
                  sampleNew = Math.round(sampleNew);
                } else if (bulkRounding === 'round_5') {
                  sampleNew = Math.ceil(sampleNew / 5) * 5;
                } else {
                  sampleNew = Math.round(sampleNew * 100) / 100;
                }
                sampleNew = Math.max(1, sampleNew);

                return (
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-950 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between font-black">
                      <span>الأصناف المتأثرة بالتعديل:</span>
                      <span className="bg-amber-200/80 px-2 py-0.5 rounded-md">{count} صنف</span>
                    </div>
                    {sample && (
                      <p className="text-[11px] text-amber-900 leading-relaxed font-semibold">
                        💡 مثال للمعاينة: صنف <strong>({sample.name})</strong> سعره الحالي <strong>{sample.price} ج.م</strong> سينتقل إلى <strong>{sampleNew} ج.م</strong> بعد {bulkOperation === 'increase' ? 'الزيادة' : 'التخفيض'}.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Submit Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowBulkPriceModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={menuItems.length === 0}
                  className="px-6 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5"
                >
                  <TrendingUp size={16} />
                  <span>تطبيق وتحديث الأسعار الآن</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Save Changes Toast Notification */}
      {saveToast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-stone-900/95 text-white border border-emerald-500/80 px-6 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-bounce">
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-stone-950 flex items-center justify-center font-black flex-shrink-0 text-sm shadow-md">
            ✓
          </div>
          <div>
            <p className="font-black text-sm text-emerald-300">تم حفظ وتثبيت التغييرات بنجاح!</p>
            <p className="text-xs text-stone-300 font-medium">{saveToast.msg}</p>
          </div>
        </div>
      )}

    </div>
  );
};
