export interface Category {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  icon: string;
  image: string;
  order?: number; // ترتيب القسم المخصص
  scheduleEnabled?: boolean; // تفعيل ظهور القسم في أوقات مخصصة (مثل الفطور / الغداء)
  scheduleStartTime?: string; // وقت البداية مثل "07:00"
  scheduleEndTime?: string; // وقت النهاية مثل "12:00"
  scheduleAction?: 'pin_to_top' | 'show_only' | 'pin_top' | 'hide_outside'; // إما تثبيت في الأعلى أثناء الفترة أو الظهور حصراً في هذه الفترة
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  nameEn?: string;
  price: number;
  description: string;
  descriptionEn?: string;
  image: string;
  available: boolean;
  isPopular?: boolean;
  isNew?: boolean;
  calories?: number;
  order?: number;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  tableNumber: number;
  items: CartItem[];
  total: number;
  subtotal?: number;
  couponCode?: string;
  discountAmount?: number;
  status: OrderStatus;
  createdAt: string;
  billRequested?: boolean;
  notes?: string;
  paymentMethod?: 'cash' | 'card';
  customerName?: string;
  customerPhone?: string;
  deliveredAt?: string;
  checkSent?: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  active: boolean;
  usageCount?: number;
  maxUses?: number;
  expiresAt?: string;
}

export interface TableTransferRequest {
  fromDeviceId: string;
  fromCustomerName?: string;
  requestedAt: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface BillRequest {
  id: string;
  tableNumber: number;
  customerName?: string;
  customerPhone?: string;
  deviceId?: string;
  requestedAt: string;
  status: 'pending' | 'served' | 'settled';
  totalAmount?: number;
  itemsCount?: number;
  notes?: string;
  settledAt?: string;
}

export interface TableInfo {
  tableNumber: number;
  status: 'available' | 'busy' | 'bill_requested';
  currentOrderId?: string;
  seatedAt?: string;
  firstOrderAt?: string;
  name?: string;
  capacity?: number;
  section?: string;
  activeSessionDeviceId?: string;
  activeSessionCustomerName?: string;
  lastActiveHeartbeat?: number;
  billRequestedAt?: string;
  billRequested?: boolean;
  tableDelivered?: boolean;
  deliveredAt?: string;
  sessionTransferRequest?: TableTransferRequest;
}

export interface SocialLinks {
  enabled: boolean;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  snapchat?: string;
  phone?: string;
  locationUrl?: string;
  website?: string;
}

export interface DeveloperRights {
  enabled: boolean;
  developerName: string;
  developerTitle?: string;
  developerAvatar?: string;
  developerBio?: string;
  developerNote?: string;
  developerWhatsApp?: string;
  developerPhone?: string;
  developerWebsite?: string;
  developerGithub?: string;
  developerLinkedin?: string;
  developerEmail?: string;
  copyrightText?: string;
  developerPassword?: string;
}

export interface ThemeSettings {
  preset: string; // 'classic-cafe' | 'royal-dark' | 'emerald' | 'crimson' | 'ocean-blue' | 'custom'
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  cardBgColor: string;
  textColor: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  notes?: string;
  lastTable?: number;
  totalOrders: number;
  totalSpent: number;
  lastVisit: string;
  createdAt: string;
  favoriteItemName?: string;
  favoriteItemId?: string;
  favoriteOrderCount?: number;
  favoriteItem?: string;
  discountEligible?: boolean;
  customDiscountRate?: number;
}

export interface CustomerReview {
  id: string;
  orderId?: string;
  tableNumber: number;
  customerName?: string;
  customerPhone?: string;
  rating: number; // 1 to 5
  foodRating?: number;
  serviceRating?: number;
  speedRating?: number;
  placeRating?: number;
  tags?: string[];
  comment: string;
  createdAt: string;
  status: 'published' | 'hidden' | 'pending' | 'approved';
  adminReply?: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  active: boolean;
  badgeText?: string;
  badge?: string;
  linkUrl?: string;
  linkType?: 'none' | 'category' | 'coupon' | 'meal_time' | 'external';
  targetCategoryId?: string;
  targetCouponCode?: string;
  targetDiscountPercent?: number;
  mealTime?: 'all' | 'breakfast' | 'lunch' | 'dinner' | 'late_night' | 'custom';
  scheduleEnabled?: boolean;
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  autoHideOutsideSchedule?: boolean;
}

export interface PopupAd {
  id: string;
  title: string;
  content: string;
  image: string;
  active: boolean;
  buttonText?: string;
  buttonLink?: string;
}

export interface SystemSettings {
  systemName: string;
  systemNameEn?: string;
  systemSubtitle?: string;
  systemSubtitleEn?: string;
  logoUrl: string;
  coverImageUrl?: string;
  adminSoundVolume: number;
  clientSoundVolume: number;
  adminSoundType: string;
  clientSoundType: string;
  soundNotificationMode?: 'bill_only' | 'all' | 'orders_only' | 'none'; // نمط التنبيه الصوتي (افتراضي: bill_only لطلب الشيك فقط)
  billSoundEnabled?: boolean; // تشغيل صوت إشعار عند طلب الشيك / الفاتورة
  orderSoundEnabled?: boolean; // تشغيل صوت إشعار عند وصول طلب طعام جديد
  billSoundType?: string; // نغمة طلب الشيك الفندقي / الكاشير
  customAdminAudio?: string;
  customAdminAudioName?: string;
  customClientAudio?: string;
  customClientAudioName?: string;
  qrTableEnforced: boolean;
  qrMode?: 'per_table' | 'unified';
  bannerEnabled: boolean;
  popupAdEnabled: boolean;
  adminUsername?: string;
  adminPassword?: string;
  adminPin?: string;
  currencySymbol?: string;
  taxEnabled?: boolean; // تفعيل أو إلغاء احتساب الضريبة
  taxRate?: number;
  loyaltyDiscountEnabled?: boolean; // تفعيل خصم الولاء للعملاء العائدين
  loyaltyDiscountRate?: number; // نسبة خصم الولاء للعميل (مثل 10%)
  loyaltyDiscountPercent?: number; // نسبة خصم الولاء
  loyaltyMinOrders?: number; // الحد الأدنى للطلبات السابقة لاستحقاق الخصم (افتراضي 1)
  enableReviews?: boolean; // تفعيل نظام تقييمات العملاء
  promptReviewAfterBill?: boolean; // إظهار نافذة التقييم تلقائياً للعميل بمجرد طلب الشيك / الفاتورة
  reviewPromptTitle?: string; // عنوان نافذة التقييم (مثلاً: شاركنا رأيك في تجربتك اليوم!)
  reviewPromptSubtitle?: string; // النص الفرعي لنافذة التقييم
  reviewShowFoodRating?: boolean; // تفعيل تقييم جودة الطعام والمشروبات
  reviewShowServiceRating?: boolean; // تفعيل تقييم سرعة وجودة الخدمة
  reviewShowPlaceRating?: boolean; // تفعيل تقييم نظافة وأجواء المكان
  reviewRequireComment?: boolean; // إلزامية كتابة ملاحظة أو تعليق
  autoApproveReviews?: boolean; // نشر واعتماد التقييمات تلقائياً
  profitMargin?: number;
  socialLinks?: SocialLinks;
  developerRights?: DeveloperRights;
  themeSettings?: ThemeSettings;
  showVipCustomerBanner?: boolean; // تفعيل أو إلغاء بنر العميل المميز في المنيو (VIP Welcome Banner)
  // Lock Screen & Mobile Web Push Notifications (إشعارات الهاتف وقفل الشاشة)
  pushNotificationsEnabled?: boolean; // التفعيل الشامل لإشعارات قفل الشاشة (Web Push)
  pushAdminNewOrder?: boolean; // إشعار هاتف الأدمن عند وصول طلب جديد (والشاشة مقفلة)
  pushAdminBillRequest?: boolean; // إشعار هاتف الأدمن عند طلب الحساب / الشيك
  pushAdminWaiterCall?: boolean; // إشعار هاتف الأدمن عند استدعاء الويتر
  pushClientOrderStatus?: boolean; // إشعار هاتف العميل عند تحديث حالة طلبه (المرحلة 1 والمرحلة 2)
  pushClientBillSettled?: boolean; // إشعار هاتف العميل عند إتمام وتأكيد حسابه
  requireCustomerName?: boolean;
  enableCustomerData?: boolean; // Toggle to enable/disable collecting customer info
  singleActiveSessionEnabled?: boolean; // تفعيل قفل الجلسة الفردية للطاولة
  lockOnFirstOrderOnly?: boolean; // حجز وقفل الطاولة عند أول طلب فقط
  autoReleaseOnExit?: boolean; // تحرير الطاولة تلقائياً عند الخروج
  splashScreenEnabled?: boolean; // تفعيل صفحة البداية / التحميل
  splashDuration?: number; // مدة ظهور صفحة التحميل بالثواني (افتراضي 2)
  splashDurationMs?: number; // مدة ظهور صفحة التحميل بالميلي ثانية
  splashSubtitle?: string; // النص الترحيبي أو الشعار في صفحة التحميل
  splashSlogan?: string; // الشعار الإعلاني المخصص
  splashLogoUrl?: string; // لوجو مخصص لصفحة البداية (اختياري)
  splashStyle?: 'dark-luxury' | 'light-clean' | 'emerald-botanical' | 'sunset-modern'; // شكل صفحة التحميل
  showPopularSection?: boolean; // تفعيل/إلغاء إظهار قسم الأكثر طلباً وشهرة في المنيو
  customBrowserTitle?: string; // عنوان تبويب المتصفح المخصص
  customFaviconUrl?: string; // أيقونة المتصفح المخصصة (Favicon)
  adminPageTitle?: string; // عنوان تبويب صفحة الأدمن في المتصفح
  adminFaviconUrl?: string; // أيقونة تبويب صفحة الأدمن في المتصفح
  menuPageTitle?: string; // عنوان تبويب صفحة المنيو للعملاء في المتصفح
  menuFaviconUrl?: string; // أيقونة تبويب صفحة المنيو للعملاء في المتصفح
  defaultLanguage?: 'ar' | 'en'; // اللغة الافتراضية
  enableBilingualMenu?: boolean; // تفعيل المنيو والأسعار باللغتين العربية والإنجليزية
  autoDetectBrowserLanguage?: boolean; // التبديل التلقائي بناءً على إعدادات متصفح العميل
  showLanguageToggleInMenu?: boolean; // إظهار زر تبديل اللغة في واجهة العميل
  allowDirectTableSelection?: boolean; // إمكانية اختيار الطاولة يدويًا للعملاء عند الدخول بدون QR code
  allowTakeawayOrder?: boolean; // تفعيل طلبات التيك أواي للعملاء بدون طاولة
  developerPassword?: string; // كلمة سر خانة المطور واللوج المعقد (افتراضي 1234)
}

export interface SystemLog {
  id: string;
  timestamp: string;
  category: 'orders' | 'tables' | 'menu' | 'settings' | 'developer' | 'security' | 'system';
  level: 'info' | 'success' | 'warning' | 'danger';
  message: string;
  messageEn?: string;
  actor?: string; // e.g., 'العميل (طاولة 3)', 'الأدمن', 'المطور'
  details?: string;
}

export interface ChatbotQA {
  id: string;
  question: string;
  reply: string;
  active: boolean;
}

export interface ChatbotSettings {
  enabled: boolean;
  botName: string;
  botAvatar: string;
  welcomeMessage: string;
  fallbackMessage: string;
  disableAnimation?: boolean;
}


