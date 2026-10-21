import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Order, 
  OrderStatus, 
  MenuItem, 
  Category, 
  TableInfo, 
  BillRequest, 
  SystemSettings 
} from '../../types';
import { playNotificationSound } from '../../utils/sound';
import { 
  ClipboardList, 
  ChefHat, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Printer, 
  RefreshCw, 
  Trash2, 
  Search, 
  Filter, 
  Receipt, 
  Plus, 
  Volume2, 
  VolumeX, 
  Sliders, 
  UtensilsCrossed, 
  ShoppingBag, 
  DollarSign, 
  Phone, 
  User, 
  AlertCircle, 
  Percent, 
  Check, 
  X,
  CreditCard,
  Banknote,
  Sparkles,
  ChevronLeft,
  Mic,
  ArrowUpDown
} from 'lucide-react';

interface OrdersReceptionPageProps {
  orders: Order[];
  safeOrders: Order[];
  menuItems: MenuItem[];
  categories: Category[];
  tables: TableInfo[];
  setTables: React.Dispatch<React.SetStateAction<TableInfo[]>>;
  billRequests?: BillRequest[];
  setBillRequests?: React.Dispatch<React.SetStateAction<BillRequest[]>>;
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  updateOrderStatus?: (orderId: string, status: OrderStatus) => Promise<boolean>;
  updatingOrderIds?: Set<string>;
  deleteOrderPermanently?: (orderId: string) => void;
  clearAllOrdersAndStats: (isFromStats?: boolean) => void;
  onRefreshOrders: () => Promise<void>;
  isRefreshingOrders: boolean;
  printThermalOrder: (order: Order) => void;
  onSettleAndSendCheck: (tableNumber: number) => void;
  onCompleteTakeawayOrder: (orderId: string) => void;
  onToggleTaxQuick: () => void;
  onNavigateToTab: (tab: any) => void;
  currency?: string;
  currentLang?: 'ar' | 'en';
  onPlaceManualOrder?: (newOrder: Order) => Promise<boolean>;
}

export const OrdersReceptionPage: React.FC<OrdersReceptionPageProps> = ({
  orders = [],
  safeOrders = [],
  menuItems = [],
  categories = [],
  tables = [],
  setTables,
  billRequests = [],
  setBillRequests,
  settings,
  setSettings,
  updateOrderStatus,
  updatingOrderIds,
  deleteOrderPermanently,
  clearAllOrdersAndStats,
  onRefreshOrders,
  isRefreshingOrders,
  printThermalOrder,
  onSettleAndSendCheck,
  onCompleteTakeawayOrder,
  onToggleTaxQuick,
  onNavigateToTab,
  currency = 'ج.م',
  currentLang = 'ar',
  onPlaceManualOrder
}) => {
  // State for filter tab
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'preparing' | 'delivered' | 'completed' | 'cancelled'>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'dine-in' | 'takeaway'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest-price'>('newest');

  // Elapsed time state ticker to refresh wait times dynamically
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  // Voice Speech Announcement Toggle
  const [speechEnabled, setSpeechEnabled] = useState(() => {
    return localStorage.getItem('smart_menu_admin_speech_enabled') === 'true';
  });

  const toggleSpeech = () => {
    const nextVal = !speechEnabled;
    setSpeechEnabled(nextVal);
    localStorage.setItem('smart_menu_admin_speech_enabled', String(nextVal));
    if (nextVal && 'speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance(currentLang === 'en' ? 'Voice announcements activated' : 'تم تفعيل التنبيه الصوتي للطلبات');
      msg.lang = currentLang === 'en' ? 'en-US' : 'ar-SA';
      window.speechSynthesis.speak(msg);
    }
  };

  // Sound volume and test popover
  const [showSoundControls, setShowSoundControls] = useState(false);

  // New Manual Order Modal State
  const [isManualOrderModalOpen, setIsManualOrderModalOpen] = useState(false);
  const [manualTableNumber, setManualTableNumber] = useState<number>(1);
  const [manualIsTakeaway, setManualIsTakeaway] = useState<boolean>(false);
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualCustomerPhone, setManualCustomerPhone] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualPaymentMethod, setManualPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [manualCart, setManualCart] = useState<Array<{ menuItem: MenuItem; quantity: number; notes?: string }>>([]);
  const [manualSearchItem, setManualSearchItem] = useState('');
  const [isSubmittingManualOrder, setIsSubmittingManualOrder] = useState(false);

  // Play voice announcement when a new pending order arrives
  const prevPendingOrderIdsRef = useRef<Set<string>>(new Set(orders.filter(o => o.status === 'pending').map(o => o.id)));
  useEffect(() => {
    const currentPending = orders.filter(o => o.status === 'pending');
    const newArrivals = currentPending.filter(o => !prevPendingOrderIdsRef.current.has(o.id));

    if (newArrivals.length > 0 && speechEnabled && 'speechSynthesis' in window) {
      newArrivals.forEach(o => {
        const isTakeaway = Number(o.tableNumber) === 0;
        const text = currentLang === 'en'
          ? (isTakeaway ? `New takeaway order` : `New order for table ${o.tableNumber}`)
          : (isTakeaway ? `طلب سفري تيك أواي جديد` : `طلب جديد لطاولة رقم ${o.tableNumber}`);
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = currentLang === 'en' ? 'en-US' : 'ar-SA';
        utter.rate = 1.0;
        window.speechSynthesis.speak(utter);
      });
    }

    prevPendingOrderIdsRef.current = new Set(currentPending.map(o => o.id));
  }, [orders, speechEnabled, currentLang]);

  // Derived statistics
  const pendingOrders = useMemo(() => safeOrders.filter(o => o.status === 'pending'), [safeOrders]);
  const preparingOrders = useMemo(() => safeOrders.filter(o => o.status === 'preparing'), [safeOrders]);
  const deliveredOrders = useMemo(() => safeOrders.filter(o => o.status === 'delivered' || o.status === 'ready'), [safeOrders]);
  const activeOrders = useMemo(() => safeOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled'), [safeOrders]);
  const completedOrders = useMemo(() => safeOrders.filter(o => o.status === 'completed'), [safeOrders]);
  const cancelledOrders = useMemo(() => safeOrders.filter(o => o.status === 'cancelled'), [safeOrders]);

  // Today's revenue calculation
  const todayRevenue = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return safeOrders
      .filter(o => o.status !== 'cancelled' && (o.createdAt || '').slice(0, 10) === todayStr)
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [safeOrders]);

  // Bill requests calculation
  const pendingBillRequests = useMemo(() => {
    return (billRequests || []).filter(b => b.status === 'pending' && Number(b.tableNumber) !== 0);
  }, [billRequests]);

  const billRequestTableNums = useMemo(() => {
    const fromBills = new Set(pendingBillRequests.map(b => Number(b.tableNumber)));
    tables.forEach(t => {
      if (Number(t.tableNumber) !== 0 && (t.status === 'bill_requested' || t.billRequested)) {
        fromBills.add(Number(t.tableNumber));
      }
    });
    return fromBills;
  }, [pendingBillRequests, tables]);

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    return safeOrders.filter(order => {
      // 1. Status Filter
      if (orderFilter === 'all') {
        if (order.status === 'completed' || order.status === 'cancelled') return false;
      } else if (orderFilter === 'delivered') {
        if (order.status !== 'delivered' && order.status !== 'ready') return false;
      } else if (order.status !== orderFilter) {
        return false;
      }

      // 2. Type Filter (Dine-in vs Takeaway)
      const isTakeaway = Number(order.tableNumber) === 0;
      if (orderTypeFilter === 'dine-in' && isTakeaway) return false;
      if (orderTypeFilter === 'takeaway' && !isTakeaway) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = order.id.toLowerCase().includes(q);
        const matchesTable = String(order.tableNumber).includes(q);
        const matchesName = (order.customerName || '').toLowerCase().includes(q);
        const matchesPhone = (order.customerPhone || '').toLowerCase().includes(q);
        const matchesItems = Array.isArray(order.items) && order.items.some(it => 
          (it?.menuItem?.name || '').toLowerCase().includes(q) || 
          (it?.menuItem?.nameEn || '').toLowerCase().includes(q)
        );
        if (!matchesId && !matchesTable && !matchesName && !matchesPhone && !matchesItems) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      } else if (sortBy === 'oldest') {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeA - timeB;
      } else if (sortBy === 'highest-price') {
        return (Number(b.total) || 0) - (Number(a.total) || 0);
      }
      return 0;
    });
  }, [safeOrders, orderFilter, orderTypeFilter, searchQuery, sortBy]);

  // Order Elapsed Time Formatter
  const getElapsedTimeBadge = (createdAtStr: string) => {
    if (!createdAtStr) return null;
    const createdTime = new Date(createdAtStr).getTime();
    if (isNaN(createdTime)) return null;

    const diffMinutes = Math.floor((Date.now() - createdTime) / 60000);

    let colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    let label = `منذ ${diffMinutes} دقيقة`;
    if (diffMinutes < 1) {
      label = 'الآن (جديد)';
      colorClass = 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse font-black';
    } else if (diffMinutes >= 20) {
      colorClass = 'bg-rose-100 text-rose-900 border-rose-400 font-black animate-pulse';
      label = `⚠️ متأخر (${diffMinutes} د)`;
    } else if (diffMinutes >= 10) {
      colorClass = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
      label = `منذ ${diffMinutes} دقيقة`;
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] border ${colorClass}`}>
        <Clock size={11} />
        <span>{label}</span>
      </span>
    );
  };

  // Status transitions
  const handleStatusChange = async (orderId: string, targetStatus: OrderStatus) => {
    if (updateOrderStatus) {
      await updateOrderStatus(orderId, targetStatus);
    }
  };

  // Add Item to Manual Order Cart
  const handleAddManualItem = (item: MenuItem) => {
    setManualCart(prev => {
      const existing = prev.find(i => i.menuItem.id === item.id);
      if (existing) {
        return prev.map(i => i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const handleUpdateManualQty = (itemId: string, delta: number) => {
    setManualCart(prev => {
      return prev.map(i => {
        if (i.menuItem.id === itemId) {
          const newQty = i.quantity + delta;
          return newQty > 0 ? { ...i, quantity: newQty } : null;
        }
        return i;
      }).filter(Boolean) as Array<{ menuItem: MenuItem; quantity: number; notes?: string }>;
    });
  };

  const manualSubtotal = useMemo(() => {
    return manualCart.reduce((sum, it) => sum + (it.menuItem.price * it.quantity), 0);
  }, [manualCart]);

  const manualTaxRate = settings.taxEnabled !== false ? (settings.taxRate ?? 14) : 0;
  const manualTax = Math.round((manualSubtotal * manualTaxRate) / 100);
  const manualTotal = manualSubtotal + manualTax;

  // Submit Manual Order
  const handleSubmitManualOrder = async () => {
    if (manualCart.length === 0) {
      alert('يرجى اختيار صنف واحد على الأقل للطلب');
      return;
    }

    setIsSubmittingManualOrder(true);
    const finalTable = manualIsTakeaway ? 0 : Number(manualTableNumber) || 1;
    const nowIso = new Date().toISOString();
    const newOrderId = `ord_manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newOrder: Order = {
      id: newOrderId,
      tableNumber: finalTable,
      items: manualCart.map(ci => ({
        menuItem: { ...ci.menuItem, image: '' },
        quantity: ci.quantity,
        notes: ci.notes
      })),
      total: manualTotal,
      subtotal: manualSubtotal,
      status: 'preparing', // Directly preparing since cashier entered it
      createdAt: nowIso,
      notes: manualNotes.trim() || undefined,
      paymentMethod: manualPaymentMethod,
      customerName: manualCustomerName.trim() || undefined,
      customerPhone: manualCustomerPhone.trim() || undefined
    };

    try {
      if (onPlaceManualOrder) {
        await onPlaceManualOrder(newOrder);
      } else {
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newOrder)
        });
      }

      // Close modal & reset
      setIsManualOrderModalOpen(false);
      setManualCart([]);
      setManualNotes('');
      setManualCustomerName('');
      setManualCustomerPhone('');
      alert('✅ تم إنشاء الطلب وإرساله للنظام بنجاح!');
    } catch (e) {
      alert('حدث خطأ أثناء إرسال الطلب');
    } finally {
      setIsSubmittingManualOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Toolbar & Quick Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-[#E5D5BC] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-[#3D271D] text-white flex items-center justify-center font-black shadow-md">
              <ClipboardList size={22} className="text-[#D4A373]" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-[#2D1E18]">استقبال ومتابعة الطلبات المباشرة</h2>
                <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>متصل لحظياً</span>
                </span>
              </div>
              <p className="text-xs text-[#7A614A] mt-0.5">
                تظهر الطلبات لحظياً مع تشغيل صوت التنبيه التلقائي، إدارة مراحل المطبخ، والتسليم
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Create Manual POS Order Button */}
          <button
            type="button"
            onClick={() => setIsManualOrderModalOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-800/20 active:scale-95 transition-all cursor-pointer"
            title="إنشاء طلب كاشير يدوي جديد سريع"
          >
            <Plus size={16} />
            <span>+ طلب كاشير يدوي</span>
          </button>

          {/* Voice Announcement Toggle */}
          <button
            type="button"
            onClick={toggleSpeech}
            className={`px-3 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
              speechEnabled 
                ? 'bg-purple-100 hover:bg-purple-200 border-purple-300 text-purple-900' 
                : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-500'
            }`}
            title={speechEnabled ? 'إيقاف النطق الصوتي للطلبات' : 'تفعيل النطق الصوتي التلقائي للطلبات الجديدة'}
          >
            <Mic size={14} className={speechEnabled ? 'text-purple-700' : 'text-stone-400'} />
            <span className="hidden sm:inline">نطق الطلبات:</span>
            <span>{speechEnabled ? 'مفعّل 🔊' : 'معطّل'}</span>
          </button>

          {/* Sound Notification Quick Tester */}
          <button
            type="button"
            onClick={() => playNotificationSound(settings.adminSoundVolume, settings.adminSoundType, settings.customAdminAudio)}
            className="px-3 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="تجربة صوت إشعار الطلب الجديد"
          >
            <Volume2 size={14} className="text-amber-700" />
            <span>تجربة الصوت 🔔</span>
          </button>

          {/* Quick Tax Indicator & Toggle */}
          <button
            type="button"
            onClick={onToggleTaxQuick}
            className={`px-3 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
              settings.taxEnabled !== false
                ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-500 line-through'
            }`}
            title="تفعيل أو تعطيل حساب الضريبة على الطلبات"
          >
            <Percent size={13} />
            <span>الضريبة: {settings.taxEnabled !== false ? `${settings.taxRate ?? 14}%` : 'معطلة'}</span>
          </button>

          {/* Refresh Orders Button */}
          <button
            type="button"
            onClick={onRefreshOrders}
            className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-stone-50 border border-[#D5C2A5] text-[#3D271D] text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            title="تحديث قائمة الطلبات من السيرفر فوراً"
          >
            <RefreshCw size={14} className={isRefreshingOrders ? 'animate-spin text-[#3D271D]' : 'text-[#3D271D]'} />
            <span>{isRefreshingOrders ? 'جاري التحديث...' : 'تحديث الطلبات'}</span>
          </button>

          {/* Delete All Orders Button */}
          <button
            type="button"
            onClick={() => clearAllOrdersAndStats(false)}
            className="px-3 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
            title="حذف وتفريغ كافة بيانات الطلبات نهائياً"
          >
            <Trash2 size={14} className="text-rose-600" />
            <span className="hidden sm:inline">مسح السجلات</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Pending Orders Metric */}
        <div 
          onClick={() => setOrderFilter('pending')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer ${
            pendingOrders.length > 0 
              ? 'bg-gradient-to-br from-rose-500 to-rose-700 text-white border-rose-600 shadow-md shadow-rose-600/20 animate-pulse'
              : 'bg-white text-stone-800 border-[#E5D5BC]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-black ${pendingOrders.length > 0 ? 'text-rose-100' : 'text-stone-500'}`}>
              بانتظار الاستلام
            </span>
            <Clock size={16} className={pendingOrders.length > 0 ? 'text-rose-200' : 'text-rose-500'} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black">{pendingOrders.length}</span>
            <span className={`text-[10px] ${pendingOrders.length > 0 ? 'text-rose-200' : 'text-stone-400'}`}>
              طلبات جديدة
            </span>
          </div>
        </div>

        {/* Preparing Metric */}
        <div 
          onClick={() => setOrderFilter('preparing')}
          className="p-4 rounded-3xl bg-white border border-[#E5D5BC] hover:border-blue-400 transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-stone-500">جاري التحضير</span>
            <ChefHat size={16} className="text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-900">{preparingOrders.length}</span>
            <span className="text-[10px] text-stone-400">في المطبخ</span>
          </div>
        </div>

        {/* Delivered Metric */}
        <div 
          onClick={() => setOrderFilter('delivered')}
          className="p-4 rounded-3xl bg-white border border-[#E5D5BC] hover:border-emerald-400 transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-stone-500">تم التسليم / جاهز</span>
            <UtensilsCrossed size={16} className="text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-900">{deliveredOrders.length}</span>
            <span className="text-[10px] text-stone-400">على الطاولات</span>
          </div>
        </div>

        {/* Bill Requests Metric */}
        <div 
          onClick={() => onNavigateToTab('bills')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer ${
            billRequestTableNums.size > 0 
              ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-md shadow-amber-500/25 font-black' 
              : 'bg-white text-stone-800 border-[#E5D5BC]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-black ${billRequestTableNums.size > 0 ? 'text-amber-950' : 'text-stone-500'}`}>
              طلبات الشيك
            </span>
            <Receipt size={16} className={billRequestTableNums.size > 0 ? 'text-amber-950' : 'text-amber-600'} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black">{billRequestTableNums.size}</span>
            <span className={`text-[10px] ${billRequestTableNums.size > 0 ? 'text-amber-900' : 'text-stone-400'}`}>
              طاولة تطلب الحساب
            </span>
          </div>
        </div>

        {/* Today's Revenue Metric */}
        <div className="p-4 rounded-3xl bg-white border border-[#E5D5BC] shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-stone-500">مبيعات اليوم</span>
            <DollarSign size={16} className="text-[#3D271D]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-[#3D271D]">{todayRevenue.toLocaleString()}</span>
            <span className="text-xs font-bold text-stone-500">{currency}</span>
          </div>
        </div>
      </div>

      {/* 3. Urgent Pending Alert Banner */}
      {pendingOrders.length > 0 && (
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 text-white p-4 sm:p-5 rounded-3xl border-2 border-rose-400 shadow-lg flex items-center justify-between gap-4 flex-wrap animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white text-rose-700 flex items-center justify-center font-black shadow-md flex-shrink-0 animate-bounce">
              <ClipboardList size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <h3 className="font-black text-base text-white">
                  يوجد ({pendingOrders.length}) طلب جديد بانتظار التأكيد وبدء التحضير!
                </h3>
              </div>
              <p className="text-xs text-rose-100 mt-0.5">
                اضغط على زر &quot;قبول وبدء التحضير&quot; فوراً لإشعار العميل بأن طلبه قيد التنفيذ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOrderFilter('pending')}
            className="px-4 py-2.5 bg-white text-rose-800 hover:bg-rose-50 rounded-2xl font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer"
          >
            عرض الطلبات الجديدة فقط ➔
          </button>
        </div>
      )}

      {/* 4. Urgent Bill Requests Notification Banner */}
      {billRequestTableNums.size > 0 && (
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-white p-4 sm:p-5 rounded-3xl border-2 border-amber-400 shadow-lg space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-md">
                <Receipt size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <h3 className="font-black text-sm sm:text-base text-amber-200">
                    تنبيه: يوجد ({billRequestTableNums.size}) طاولة تطلب الشيك والحساب الآن!
                  </h3>
                </div>
                <p className="text-xs text-amber-100/90 mt-0.5">
                  العملاء بانتظار الفاتورة وإجراء المحاسبة. يمكنك التصفية والمحاسبة بضغطة زر واحدة أدناه:
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToTab('bills')}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-2xl font-black text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>عرض صفحة الشيكات والحسابات</span>
              <ChevronLeft size={14} />
            </button>
          </div>

          {/* Quick Action Cards for each table requesting bill */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {Array.from(billRequestTableNums).map(tNum => {
              const tableObj = tables.find(t => Number(t.tableNumber) === tNum);
              const tOrders = safeOrders.filter(o => Number(o.tableNumber) === tNum && o.status !== 'cancelled');
              const tTotal = tOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
              const custName = tableObj?.activeSessionCustomerName || tOrders[0]?.customerName;

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

                  <button
                    type="button"
                    onClick={() => onSettleAndSendCheck(tNum)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-black shadow-xs transition-all active:scale-95 cursor-pointer"
                    title="تصفية الحساب وتفريغ الطاولة فوراً"
                  >
                    تصفية وتفريغ ✓
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Filter & Search Control Panel */}
      <div className="bg-white/80 p-4 rounded-3xl border border-[#E5D5BC] space-y-3 shadow-xs">
        {/* Status Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'الطلبات النشطة (الكل)', count: activeOrders.length },
            { id: 'pending', label: 'بانتظار الاستلام', count: pendingOrders.length, highlight: pendingOrders.length > 0 },
            { id: 'preparing', label: 'المرحلة 1: جاري التحضير', count: preparingOrders.length },
            { id: 'delivered', label: 'المرحلة 2: تم التسليم / جاهز', count: deliveredOrders.length },
            { id: 'completed', label: 'أرشيف المحاسبة', count: completedOrders.length },
            { id: 'cancelled', label: 'الطلبات الملغية', count: cancelledOrders.length }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setOrderFilter(f.id as any)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                orderFilter === f.id
                  ? 'bg-[#3D271D] text-white shadow-md'
                  : 'bg-white text-stone-700 hover:bg-[#EBDCC4] border border-[#E5D5BC]'
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                orderFilter === f.id 
                  ? 'bg-[#D4A373] text-[#2D1E18]' 
                  : f.highlight 
                    ? 'bg-rose-500 text-white animate-pulse' 
                    : 'bg-stone-100 text-stone-600'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search, Type Filter, and Sorting */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الطلب، الطاولة، العميل..."
              className="w-full pr-10 pl-4 py-2 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3D271D]/20 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* Dine-in vs Takeaway Toggle */}
            <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200">
              <button
                onClick={() => setOrderTypeFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  orderTypeFilter === 'all' ? 'bg-white text-[#3D271D] shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setOrderTypeFilter('dine-in')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  orderTypeFilter === 'dine-in' ? 'bg-white text-[#3D271D] shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <UtensilsCrossed size={12} />
                <span>صالة</span>
              </button>
              <button
                onClick={() => setOrderTypeFilter('takeaway')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  orderTypeFilter === 'takeaway' ? 'bg-white text-[#3D271D] shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <ShoppingBag size={12} />
                <span>سفري</span>
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-2xl text-xs font-bold text-stone-700">
              <ArrowUpDown size={13} className="text-stone-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-none focus:outline-none cursor-pointer text-stone-800 font-bold"
              >
                <option value="newest">الأحدث أولاً</option>
                <option value="oldest">الأقدم أولاً</option>
                <option value="highest-price">الأعلى قيمة</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Orders Grid List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white/90 rounded-3xl p-12 text-center border border-[#E5D5BC] space-y-3 shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-[#EEDEC6]/40 flex items-center justify-center text-[#3D271D]">
            <ClipboardList size={30} />
          </div>
          <h3 className="font-black text-stone-800 text-lg">لا توجد طلبات مطابقة</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {searchQuery 
              ? 'لم نجد أي طلب يطابق معايير البحث الحالية، جرّب تعديل كلمة البحث.' 
              : 'الطلبات الجديدة تظهر هنا لحظياً فور إرسالها من الطاولات أو تطبيق المنيو.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrders.map(order => {
            const isUpdating = updatingOrderIds?.has(order.id);
            const isTakeaway = Number(order.tableNumber) === 0;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-3xl p-5 shadow-sm border ${
                  order.status === 'pending'
                    ? 'border-rose-400 ring-2 ring-rose-400/40'
                    : order.billRequested && !isTakeaway
                      ? 'border-amber-400 ring-2 ring-amber-400/40'
                      : 'border-[#E5D5BC]'
                } flex flex-col justify-between space-y-4 hover:shadow-md transition-all relative overflow-hidden`}
              >
                {/* Pending Flashing Top Bar Indicator */}
                {order.status === 'pending' && (
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-rose-600 to-red-500 animate-pulse" />
                )}

                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-stone-100 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0 ${
                        isTakeaway 
                          ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                          : 'bg-[#3D271D] text-white'
                      }`}>
                        {isTakeaway ? '🛍️' : order.tableNumber}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-black text-sm text-[#2D1E18]">
                            {isTakeaway ? 'تيك أواي (Takeaway)' : `طاولة رقم (${order.tableNumber})`}
                          </h3>
                        </div>
                        {order.customerName && (
                          <p className="text-[11px] font-bold text-amber-900 truncate">
                            {order.customerName} {order.customerPhone ? `(${order.customerPhone})` : ''}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-stone-500">
                            {new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} &bull; #{order.id.slice(-4)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {/* Live Wait Time Badge */}
                      {getElapsedTimeBadge(order.createdAt)}

                      {/* Print Receipt Button */}
                      <button
                        onClick={() => printThermalOrder(order)}
                        className="p-1.5 rounded-xl bg-stone-100 hover:bg-[#EEDEC6] text-stone-700 transition-colors cursor-pointer"
                        title="طباعة إيصال حراري"
                      >
                        <Printer size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Customer Notes */}
                  {order.notes && (
                    <div className="mt-2.5 p-2.5 bg-[#eedec6]/30 rounded-2xl border border-[#D5C2A5] text-xs text-stone-800">
                      <span className="font-bold text-[#8C6D48]">ملاحظة العميل: </span>
                      <span>{order.notes}</span>
                    </div>
                  )}

                  {/* Items List */}
                  <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {(order.items || []).map((ci, idx) => {
                      const name = ci?.menuItem?.name || (ci as any)?.name || 'صنف';
                      const price = ci?.menuItem?.price ?? (ci as any)?.price ?? 0;
                      const quantity = ci?.quantity || 1;
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs bg-stone-50 p-2 rounded-2xl border border-stone-100">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="w-5 h-5 rounded-md bg-[#EEDEC6] text-[#3D271D] font-black flex items-center justify-center text-[10px] flex-shrink-0">
                              {quantity}x
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-stone-800 truncate block">{name}</span>
                              {ci.notes && (
                                <p className="text-[10px] text-amber-800 font-medium truncate mt-0.5">
                                  ملاحظة: {ci.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="font-black text-stone-800 whitespace-nowrap mr-2">
                            {price * quantity} {currency}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total and Interactive Sequential Lifecycle Action Bar */}
                <div className="pt-3 border-t border-stone-100 space-y-3">
                  <div className="flex items-center justify-between font-black text-sm text-[#2D1E18]">
                    <span>إجمالي الطلب:</span>
                    <span className="text-[#3D271D] text-lg font-black">{order.total} {currency}</span>
                  </div>

                  {/* Sequential 2-Stage Lifecycle Progress Indicator */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-stone-50 rounded-2xl text-[10px] font-bold text-stone-500 border border-stone-200/60">
                    <span className={order.status === 'pending' ? 'text-rose-700 font-black ring-1 ring-rose-300 bg-rose-100/70 px-2 py-0.5 rounded-lg' : 'text-emerald-700 font-black'}>
                      1. بدء التحضير {order.status !== 'pending' && order.status !== 'cancelled' ? '✓' : ''}
                    </span>
                    <span className="text-stone-300 font-black">←</span>
                    <span className={(order.status === 'delivered' || order.status === 'ready' || order.status === 'completed') ? 'text-emerald-800 font-black ring-1 ring-emerald-300 bg-emerald-100/70 px-2 py-0.5 rounded-lg' : 'text-stone-400'}>
                      2. تم التسليم {(order.status === 'delivered' || order.status === 'ready' || order.status === 'completed') ? '✓' : ''}
                    </span>
                  </div>

                  {/* STAGE 1: Pending */}
                  {order.status === 'pending' && (
                    <div className="space-y-1.5">
                      <button
                        onClick={() => handleStatusChange(order.id, 'preparing')}
                        disabled={isUpdating}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 active:scale-98 transition-all cursor-pointer disabled:opacity-60"
                      >
                        {isUpdating ? <RefreshCw size={16} className="animate-spin" /> : <ChefHat size={16} />}
                        <span>المرحلة 1: قبول الطلب وبدء التحضير (اضغط للبدء)</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm('تأكيد رفض أو إلغاء هذا الطلب؟')) {
                            handleStatusChange(order.id, 'cancelled');
                          }
                        }}
                        disabled={isUpdating}
                        className="w-full py-1.5 rounded-xl hover:bg-rose-50 text-stone-500 hover:text-rose-600 font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <XCircle size={13} />
                        <span>رفض / إلغاء الطلب</span>
                      </button>
                    </div>
                  )}

                  {/* STAGE 2: Preparing */}
                  {order.status === 'preparing' && (
                    <div className="space-y-1.5">
                      <button
                        onClick={() => handleStatusChange(order.id, 'delivered')}
                        disabled={isUpdating}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer disabled:opacity-60"
                      >
                        {isUpdating ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        <span>المرحلة 2: تم تجهيز الطلب وتسليمه ✓</span>
                      </button>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => printThermalOrder(order)}
                          className="flex-1 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Printer size={13} />
                          <span>إيصال المطبخ</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('تأكيد إلغاء هذا الطلب؟')) {
                              handleStatusChange(order.id, 'cancelled');
                            }
                          }}
                          disabled={isUpdating}
                          className="px-3 py-1.5 rounded-xl hover:bg-rose-50 text-stone-500 hover:text-rose-600 font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <XCircle size={13} />
                          <span>إلغاء</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STAGE 3: Delivered / Ready */}
                  {(order.status === 'delivered' || order.status === 'ready') && (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-black text-emerald-800">
                          <CheckCircle2 size={15} className="text-emerald-600" />
                          <span>تم تجهيز الطلب وتسليمه للطاولة ✓</span>
                        </span>
                        {order.deliveredAt && (
                          <span className="text-[10px] text-emerald-700">
                            {new Date(order.deliveredAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => printThermalOrder(order)}
                          className="flex-1 py-2 px-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Printer size={13} />
                          <span>طباعة الفاتورة</span>
                        </button>

                        {isTakeaway ? (
                          <button
                            onClick={() => onCompleteTakeawayOrder(order.id)}
                            disabled={isUpdating}
                            className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title="إغلاق الطلب والجلسة"
                          >
                            <CheckCircle2 size={13} />
                            <span>إغلاق الطلب ✓</span>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStatusChange(order.id, 'completed')}
                              disabled={isUpdating}
                              className="py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-black text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              title="محاسبة وإغلاق الطلب نهائياً"
                            >
                              <CheckCircle2 size={13} />
                              <span>محاسبة وإغلاق ✓</span>
                            </button>
                            <button
                              onClick={() => onNavigateToTab('bills')}
                              className="py-2 px-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
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

                  {/* STAGE: Completed */}
                  {order.status === 'completed' && (
                    <div className="space-y-1.5">
                      <div className="py-2.5 px-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black flex items-center justify-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span>تم تجهيز وتسليم الطلب ومحاسبته بنجاح ✓</span>
                      </div>
                      <button
                        onClick={() => printThermalOrder(order)}
                        className="w-full py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Printer size={13} />
                        <span>إعادة طباعة الفاتورة</span>
                      </button>
                      {deleteOrderPermanently && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`حذف هذا الطلب المكتمل (#${order.id.slice(-4)}) نهائياً من الأرشيف؟`)) {
                              deleteOrderPermanently(order.id);
                            }
                          }}
                          className="w-full py-1.5 rounded-xl hover:bg-rose-50 text-stone-400 hover:text-rose-600 font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={12} />
                          <span>حذف من الأرشيف نهائياً</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* STAGE: Cancelled */}
                  {order.status === 'cancelled' && (
                    <div className="space-y-1.5">
                      <div className="py-2 px-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-center gap-1.5">
                        <XCircle size={14} className="text-rose-600" />
                        <span>تم إلغاء هذا الطلب</span>
                      </div>
                      <button
                        onClick={() => handleStatusChange(order.id, 'pending')}
                        className="w-full py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>استعادة كطلب جديد</span>
                      </button>
                      {deleteOrderPermanently && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`حذف هذا الطلب الملغي (#${order.id.slice(-4)}) نهائياً؟`)) {
                              deleteOrderPermanently(order.id);
                            }
                          }}
                          className="w-full py-1.5 rounded-xl hover:bg-rose-50 text-stone-400 hover:text-rose-600 font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={12} />
                          <span>حذف الطلب نهائياً</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 7. New Manual POS Order Modal */}
      {isManualOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-[#FAF7F2] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-[#E5D5BC] shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#3D271D] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-[#D4A373] text-[#2A1D15] flex items-center justify-center font-black">
                  <Plus size={18} />
                </span>
                <div>
                  <h3 className="font-black text-base text-white">إنشاء طلب كاشير يدوي جديد</h3>
                  <p className="text-xs text-amber-200/80">إدخال طلب مباشر من داخل لوحة الإدارة</p>
                </div>
              </div>
              <button
                onClick={() => setIsManualOrderModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Order Type & Table Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-stone-200">
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1.5">نوع الطلب:</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setManualIsTakeaway(false)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        !manualIsTakeaway ? 'bg-[#3D271D] text-white shadow-xs' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      <UtensilsCrossed size={14} />
                      <span>صالة (طاولة)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualIsTakeaway(true)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        manualIsTakeaway ? 'bg-[#3D271D] text-white shadow-xs' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      <ShoppingBag size={14} />
                      <span>سفري (تيك أواي)</span>
                    </button>
                  </div>
                </div>

                {!manualIsTakeaway && (
                  <div>
                    <label className="block text-xs font-black text-stone-700 mb-1.5">رقم الطاولة:</label>
                    <select
                      value={manualTableNumber}
                      onChange={(e) => setManualTableNumber(Number(e.target.value))}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-black text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#3D271D]/20 cursor-pointer"
                    >
                      {tables.filter(t => Number(t.tableNumber) !== 0).map(t => (
                        <option key={t.tableNumber} value={t.tableNumber}>
                          طاولة رقم #{t.tableNumber} {t.status === 'busy' ? '(مشغولة)' : '(متاحة)'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Customer Info (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-stone-200">
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">اسم العميل (اختياري):</label>
                  <input
                    type="text"
                    value={manualCustomerName}
                    onChange={(e) => setManualCustomerName(e.target.value)}
                    placeholder="مثال: أحمد مصطفى"
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">رقم الهاتف (اختياري):</label>
                  <input
                    type="text"
                    value={manualCustomerPhone}
                    onChange={(e) => setManualCustomerPhone(e.target.value)}
                    placeholder="مثال: 010xxxxxxxx"
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Items Picker */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs text-stone-800">أصناف الطلب:</h4>
                  <div className="relative w-48">
                    <Search size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={manualSearchItem}
                      onChange={(e) => setManualSearchItem(e.target.value)}
                      placeholder="بحث عن صنف..."
                      className="w-full pr-8 pl-2 py-1 text-[11px] bg-stone-50 border border-stone-200 rounded-lg text-stone-800 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Items selection scroll list */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1 border border-stone-100 rounded-xl">
                  {menuItems
                    .filter(it => !manualSearchItem || it.name.toLowerCase().includes(manualSearchItem.toLowerCase()))
                    .slice(0, 30)
                    .map(it => (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => handleAddManualItem(it)}
                        className="p-2 text-right bg-stone-50 hover:bg-[#EEDEC6]/40 border border-stone-200 rounded-xl transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <span className="font-bold text-xs text-stone-800 truncate block">{it.name}</span>
                        <div className="flex items-center justify-between mt-1 text-[10px]">
                          <span className="text-amber-800 font-black">{it.price} {currency}</span>
                          <span className="text-emerald-700 font-bold">+ إضافة</span>
                        </div>
                      </button>
                    ))}
                </div>

                {/* Selected Items Cart */}
                {manualCart.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-stone-100">
                    <h5 className="text-[11px] font-black text-stone-600">الأصناف المختارة:</h5>
                    {manualCart.map(ci => (
                      <div key={ci.menuItem.id} className="flex items-center justify-between bg-stone-50 p-2 rounded-xl border border-stone-200 text-xs">
                        <div className="flex-1 min-w-0 pr-2">
                          <span className="font-black text-stone-800 truncate block">{ci.menuItem.name}</span>
                          <span className="text-[10px] text-stone-500">{ci.menuItem.price} &times; {ci.quantity} = {ci.menuItem.price * ci.quantity} {currency}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateManualQty(ci.menuItem.id, -1)}
                            className="w-6 h-6 rounded-lg bg-stone-200 hover:bg-stone-300 flex items-center justify-center font-black cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-black text-xs w-5 text-center">{ci.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateManualQty(ci.menuItem.id, 1)}
                            className="w-6 h-6 rounded-lg bg-[#3D271D] text-white flex items-center justify-center font-black cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Notes & Payment */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3">
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">ملاحظات التحضير (اختياري):</label>
                  <input
                    type="text"
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="مثال: بدون سكر، تسوية زيادة..."
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">طريقة الدفع:</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setManualPaymentMethod('cash')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        manualPaymentMethod === 'cash' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      <Banknote size={14} />
                      <span>نقداً (كاش)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualPaymentMethod('card')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        manualPaymentMethod === 'card' ? 'bg-blue-700 text-white shadow-xs' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      <CreditCard size={14} />
                      <span>فيزا / بطاقة</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer with Total and Submit */}
            <div className="px-6 py-4 bg-white border-t border-stone-200 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] text-stone-500">إجمالي الطلب:</p>
                <p className="text-xl font-black text-[#3D271D]">
                  {manualTotal} {currency}
                  {manualTax > 0 && <span className="text-[10px] font-normal text-stone-400 mr-1">(شامل {manualTax} ضريبة)</span>}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualOrderModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSubmitManualOrder}
                  disabled={isSubmittingManualOrder || manualCart.length === 0}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs shadow-md shadow-emerald-700/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingManualOrder ? 'جاري الإرسال...' : 'إرسال وتأكيد الطلب فوراً ✓'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
