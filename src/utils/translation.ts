// Dictionary and Auto-Translation Helper for Café & Restaurant Menu System

export interface TranslationDict {
  [key: string]: string;
}

// Common Food & Drink Terms Dictionary (Arabic -> English)
export const foodTermsArToEn: TranslationDict = {
  // Coffee & Hot Drinks
  'اسبريسو': 'Espresso',
  'إسبريسو': 'Espresso',
  'دبل اسبريسو': 'Double Espresso',
  'سنجل اسبريسو': 'Single Espresso',
  'كابتشينو': 'Cappuccino',
  'لاتيه': 'Latte',
  'ايس لاتيه': 'Iced Latte',
  'آيس لاتيه': 'Iced Latte',
  'موكا': 'Mocha',
  'ايس موكا': 'Iced Mocha',
  'آيس موكا': 'Iced Mocha',
  'فلات وايت': 'Flat White',
  'كورتادو': 'Cortado',
  'ماكياتو': 'Macchiato',
  'ميكياتو': 'Macchiato',
  'كراميل ماكياتو': 'Caramel Macchiato',
  'سبانش لاتيه': 'Spanish Latte',
  'ايس سبانش لاتيه': 'Iced Spanish Latte',
  'ايس سبانش': 'Iced Spanish Latte',
  'آيس سبانش': 'Iced Spanish Latte',
  'فانيلا لاتيه': 'Vanilla Latte',
  'ايس فانيلا لاتيه': 'Iced Vanilla Latte',
  'بستاشيو لاتيه': 'Pistachio Latte',
  'ايس بستاشيو لاتيه': 'Iced Pistachio Latte',
  'ايس بستاشيو': 'Iced Pistachio',
  'قهوة تركي': 'Turkish Coffee',
  'قهوة تركية': 'Turkish Coffee',
  'قهوة فرنسي': 'French Coffee',
  'قهوة فرنسية': 'French Coffee',
  'قهوة عربي': 'Arabic Coffee',
  'قهوة عربية': 'Arabic Coffee',
  'قهوة مقطرة': 'Filter Coffee',
  'قهوة بالبندق': 'Hazelnut Coffee',
  'قهوة بالهيل': 'Cardamom Coffee',
  'كولد برو': 'Cold Brew',
  'قهوة مثلجة': 'Iced Coffee',
  'امريكانو': 'Americano',
  'أمريكانو': 'Americano',
  'ايس امريكانو': 'Iced Americano',
  'آيس امريكانو': 'Iced Americano',
  'فرابيه': 'Frappe',
  'فرابتشينو': 'Frappuccino',
  'ماتشا': 'Matcha',
  'ماتشا لاتيه': 'Matcha Latte',
  'ايس ماتشا لاتيه': 'Iced Matcha Latte',
  'ايس ماتشا': 'Iced Matcha',
  'ماتشا مثلج': 'Iced Matcha',
  'شاي': 'Tea',
  'شاي اخضر': 'Green Tea',
  'شاي أخضر': 'Green Tea',
  'شاي أحمر': 'Red Tea',
  'شاي احمر': 'Red Tea',
  'شاي أسود': 'Black Tea',
  'شاي اسود': 'Black Tea',
  'شاي بالنعناع': 'Mint Tea',
  'شاي بالليمون': 'Lemon Tea',
  'شاي كرك': 'Karak Tea',
  'شاي انجليزي': 'English Breakfast Tea',
  'ايرل جراي': 'Earl Grey Tea',
  'بابونج': 'Chamomile Tea',
  'يانسون': 'Anise Tea',
  'كركديه': 'Hibiscus',
  'كركديه مثلج': 'Iced Hibiscus',
  'قرفة': 'Cinnamon Drink',
  'جنزبيل': 'Ginger Drink',
  'ليمون دافئ': 'Warm Lemonade',
  'هوت شوكليت': 'Hot Chocolate',
  'شوكولاتة ساخنة': 'Hot Chocolate',
  'شوكولاته ساخنه': 'Hot Chocolate',
  'سحلب': 'Sahlab',
  'سحلب بالمكسرات': 'Sahlab with Nuts',

  // Boba & Cold Drinks
  'بوبا': 'Boba',
  'شاي بوبا': 'Boba Tea',
  'شاي البوبا': 'Boba Tea',
  'ميلك تي': 'Milk Tea',
  'شاي الحليب': 'Milk Tea',
  'بوبا براون شوجر': 'Brown Sugar Boba',
  'براون شوجر بوبا': 'Brown Sugar Boba',
  'بوبا تايجر': 'Tiger Boba',
  'تايجر بوبا': 'Tiger Boba',
  'بوبا فراولة': 'Strawberry Boba',
  'بوبا مانجو': 'Mango Boba',
  'بوبا تارو': 'Taro Boba',
  'بوبا ماتشا': 'Matcha Boba',
  'بوبا شوكولاتة': 'Chocolate Boba',
  'موهيتو': 'Mojito',
  'موهيتو كلاسيك': 'Classic Mojito',
  'موهيتو فراولة': 'Strawberry Mojito',
  'موهيتو توت': 'Blueberry Mojito',
  'موهيتو بلوبيري': 'Blueberry Mojito',
  'موهيتو ليمون نعناع': 'Lemon Mint Mojito',
  'موهيتو بلو اوشن': 'Blue Ocean Mojito',
  'موهيتو رمان': 'Pomegranate Mojito',
  'موهيتو باشن فروت': 'Passion Fruit Mojito',
  'موهيتو ريد بول': 'Red Bull Mojito',
  'ريد بول': 'Red Bull',
  'عصير مانجو': 'Fresh Mango Juice',
  'عصير فراولة': 'Fresh Strawberry Juice',
  'عصير برتقال': 'Fresh Orange Juice',
  'عصير ليمون نعناع': 'Fresh Lemon Mint Juice',
  'عصير ليمون بالنعناع': 'Fresh Lemon Mint Juice',
  'عصير ليمون': 'Fresh Lemon Juice',
  'عصير بطيخ': 'Fresh Watermelon Juice',
  'عصير جوافة': 'Fresh Guava Juice',
  'عصير رمان': 'Fresh Pomegranate Juice',
  'عصير كيوي': 'Fresh Kiwi Juice',
  'عصير اناناس': 'Fresh Pineapple Juice',
  'عصير افوكادو': 'Avocado Smoothie',
  'عصير أفوكادو بالعسل': 'Avocado Honey Smoothie',
  'سموذي': 'Smoothie',
  'سموذي توت': 'Berry Smoothie',
  'سموذي مانجو': 'Mango Smoothie',
  'سموذي فراولة': 'Strawberry Smoothie',
  'سموذي باشن فروت': 'Passion Fruit Smoothie',
  'ميلك شيك': 'Milkshake',
  'ميلك شيك فانيليا': 'Vanilla Milkshake',
  'ميلك شيك شوكولاتة': 'Chocolate Milkshake',
  'ميلك شيك فراولة': 'Strawberry Milkshake',
  'ميلك شيك اوريو': 'Oreo Milkshake',
  'ميلك شيك لوتس': 'Lotus Milkshake',
  'ميلك شيك كيندر': 'Kinder Milkshake',
  'ميلك شيك نوتيلا': 'Nutella Milkshake',
  'ميلك شيك بستاشيو': 'Pistachio Milkshake',
  'ميلك شيك كراميل': 'Caramel Milkshake',
  'ايس تي': 'Iced Tea',
  'آيس تي': 'Iced Tea',
  'ايس تي خوخ': 'Peach Iced Tea',
  'ايس تي ليمون': 'Lemon Iced Tea',
  'مياه معدنية': 'Mineral Water',
  'مياه غازية': 'Sparkling Water',
  'مياه فوارة': 'Sparkling Water',
  'بيبسي': 'Pepsi',
  'كوكاكولا': 'Coca Cola',
  'سبرايت': 'Sprite',
  'سفن اب': '7Up',

  // Desserts & Pastries
  'تشيز كيك': 'Cheesecake',
  'تشيز كيك سان سيباستيان': 'San Sebastian Cheesecake',
  'تشيز كيك توت': 'Blueberry Cheesecake',
  'تشيز كيك فراولة': 'Strawberry Cheesecake',
  'تشيز كيك لوتس': 'Lotus Cheesecake',
  'تشيز كيك كراميل': 'Caramel Cheesecake',
  'تشيز كيك بستاشيو': 'Pistachio Cheesecake',
  'كيك': 'Cake',
  'كيكة الشوكولاتة': 'Chocolate Cake',
  'كيكة العسل': 'Honey Cake',
  'كيكة الجزر': 'Carrot Cake',
  'كيكة رد فيلفيت': 'Red Velvet Cake',
  'كيكة زعفران': 'Saffron Cake',
  'مولتن كيك': 'Molten Lava Cake',
  'فوندان شوكولاتة': 'Chocolate Fondant',
  'تيراميسو': 'Tiramisu',
  'وافل': 'Waffle',
  'وافل نوتيلا': 'Nutella Waffle',
  'وافل لوتس': 'Lotus Waffle',
  'وافل بلجيكي': 'Belgian Waffle',
  'وافل مكس': 'Mixed Toppings Waffle',
  'كريب': 'Crepe',
  'كريب نوتيلا': 'Nutella Crepe',
  'كريب لوتس': 'Lotus Crepe',
  'كريب كيندر': 'Kinder Crepe',
  'كريب شوكولاتة بيضاء': 'White Chocolate Crepe',
  'كريب موز': 'Banana Crepe',
  'كريب مكس': 'Mix Crepe',
  'بان كيك': 'Pancake',
  'بان كيك نوتيلا': 'Nutella Pancakes',
  'بان كيك لوتس': 'Lotus Pancakes',
  'ميني بان كيك': 'Mini Pancakes',
  'كرواسون': 'Croissant',
  'كرواسون سادة': 'Plain Croissant',
  'كرواسون جبنة': 'Cheese Croissant',
  'كرواسون جبن': 'Cheese Croissant',
  'كرواسون شوكولاتة': 'Chocolate Croissant',
  'كرواسون نوتيلا': 'Nutella Croissant',
  'كرواسون لوز': 'Almond Croissant',
  'كرواسون زعتر': 'Zaatar Croissant',
  'كرواسون تركي وجبنة': 'Turkey & Cheese Croissant',
  'سينابون': 'Cinnamon Roll',
  'سينابون كلاسيك': 'Classic Cinnamon Roll',
  'سينابون كراميل': 'Caramel Cinnamon Roll',
  'براونيز': 'Brownies',
  'براونيز شوكولاتة': 'Chocolate Brownies',
  'كوكيز': 'Cookies',
  'كوكيز شوكولاتة': 'Chocolate Chip Cookies',
  'كوكيز نوتيلا': 'Nutella Cookies',
  'دونات': 'Donut',
  'دونات شوكولاتة': 'Chocolate Donut',
  'دونات سكر': 'Glazed Donut',
  'دونات لوتس': 'Lotus Donut',
  'ام علي': 'Om Ali',
  'أم علي': 'Om Ali',
  'كنافة': 'Kunafa',
  'بسبوسة': 'Basbousa',
  'ايس كريم': 'Ice Cream',
  'آيس كريم': 'Ice Cream',

  // Bakery, Meals & Sandwiches
  'ساندوتش': 'Sandwich',
  'ساندوتش كلوب': 'Club Sandwich',
  'كلوب ساندوتش': 'Club Sandwich',
  'ساندوتش تونة': 'Tuna Sandwich',
  'ساندوتش دجاج': 'Chicken Sandwich',
  'ساندوتش لحم': 'Beef Sandwich',
  'ساندوتش تركي': 'Smoked Turkey Sandwich',
  'ساندوتش حلوم': 'Halloumi Sandwich',
  'ساندوتش جبنة': 'Cheese Sandwich',
  'ساندوتش بيض': 'Egg Sandwich',
  'توست': 'Toast',
  'توست افوكادو': 'Avocado Toast',
  'بانيني': 'Panini',
  'بانيني دجاج': 'Chicken Panini',
  'بانيني لحم': 'Beef Panini',
  'بانيني جبنة': 'Cheese Panini',
  'برجر': 'Burger',
  'برجر لحم': 'Beef Burger',
  'برجر دجاج': 'Chicken Burger',
  'برجر دجاج مقرمش': 'Crispy Chicken Burger',
  'تشيز برجر': 'Cheeseburger',
  'بيتزا': 'Pizza',
  'بيتزا مارجريتا': 'Margherita Pizza',
  'بيتزا بيبروني': 'Pepperoni Pizza',
  'بيتزا دجاج': 'Chicken Pizza',
  'بيتزا خضار': 'Vegetable Pizza',
  'بيتزا جبن': 'Four Cheese Pizza',
  'باستا': 'Pasta',
  'باستا وايت صوص': 'White Sauce Pasta',
  'باستا ريد صوص': 'Red Sauce Pasta',
  'بيني الفريدو': 'Penne Alfredo',
  'فيتوتشيني': 'Fettuccine Alfredo',
  'بطاطس مقلية': 'French Fries',
  'بطاطس ودجز': 'Potato Wedges',
  'حلقات بصل': 'Onion Rings',
  'اصابع موزاريلا': 'Mozzarella Sticks',
  'ناجتس دجاج': 'Chicken Nuggets',
  'سلطة سيزر': 'Caesar Salad',
  'سلطة يونانية': 'Greek Salad',
  'سلطة خضراء': 'Green Salad',

  // Modifiers & Add-ons
  'اكسترا شوت اسبريسو': 'Extra Espresso Shot',
  'شوت اسبريسو': 'Espresso Shot',
  'حليب شوفان': 'Oat Milk',
  'حليب لوز': 'Almond Milk',
  'حليب صويا': 'Soy Milk',
  'حليب خالي الدسم': 'Skimmed Milk',
  'صوص كراميل': 'Caramel Sauce',
  'صوص شوكولاتة': 'Chocolate Sauce',
  'صوص لوتس': 'Lotus Sauce',
  'صوص نوتيلا': 'Nutella Sauce',
  'سيرب فانيليا': 'Vanilla Syrup',
  'سيرب كراميل': 'Caramel Syrup',
  'سيرب بندق': 'Hazelnut Syrup',
  'كريمة مخفوقة': 'Whipped Cream',
  'مكسرات': 'Nuts',
  'عسل': 'Honey',

  // Categories
  'مشروبات ساخنة': 'Hot Drinks',
  'قهوة إيطالي وساخنة': 'Italian & Hot Coffee',
  'قهوة و مشروبات ساخنة': 'Coffee & Hot Drinks',
  'مشروبات باردة ومثلجة': 'Cold & Iced Drinks',
  'مشروبات باردة': 'Cold Drinks',
  'عصائر وموهيتو': 'Fresh Juices & Mojitos',
  'عصائر طازجة': 'Fresh Juices',
  'حلويات ومعجنات': 'Desserts & Pastries',
  'حلويات': 'Desserts',
  'وجبات وساندوتشات': 'Meals & Sandwiches',
  'ساندوتشات': 'Sandwiches',
  'وجبات خفيفة': 'Snacks & Appetizers',
  'مقبلات': 'Appetizers',
  'فطور': 'Breakfast',
  'إضافات': 'Add-ons'
};

// UI Translations dictionary for full bilingual customer interface
export const clientUiTranslations = {
  ar: {
    table: 'طاولة',
    tableNumber: 'طاولة رقم',
    changeTable: 'تغيير',
    openForOrders: 'مفتوح للطلبات',
    requestBill: 'طلب الحساب',
    billRequested: 'الشيك مطلوب',
    callWaiter: 'استدعاء الويتر',
    waiterRequested: 'تم استدعاء الويتر',
    callWaiterPrompt: 'ما الخدمة التي تحتاجها من الويتر؟',
    water: 'ماء بارد',
    napkins: 'مناديل إضافية',
    cleanTable: 'تنظيف الطاولة',
    otherAssistance: 'مساعدة واستفسار',
    sendRequest: 'إرسال الطلب للويتر',
    lockedByOther: 'محجوزة لهاتف آخر',
    digitalCheck: 'الشيك الإلكتروني',
    searchPlaceholder: 'ابحث عن قهوة، مشروب، كيك، أو وجبة...',
    popularSection: 'الأكثر طلباً وشهرة ⭐',
    popularSub: 'الأصناف الأكثر تميزاً وإقبالاً ومحبة من ضيوفنا',
    allCategories: 'الكل',
    add: 'أضف',
    added: 'تمت الإضافة',
    unavailable: 'غير متوفر حالياً',
    calories: 'سعرة',
    currency: 'ج.م',
    cart: 'سلة الطلبات',
    cartSummary: 'ملخص السلة',
    emptyCart: 'سلتك فارغة',
    emptyCartMsg: 'تصفح الأصناف واضغط على "+ أضف" لاختيار طلباتك',
    items: 'أصناف',
    total: 'المجموع الإجمالي',
    subtotal: 'المجموع الفرعي',
    tax: 'ضريبة القيمة المضافة',
    notes: 'ملاحظات خاصة للطلب (اختياري)',
    notesPlaceholder: 'مثال: بدون سكر، حليب شوفان، ثلج زيادة...',
    customerName: 'الاسم (اختياري)',
    customerPhone: 'رقم الهاتف (اختياري)',
    paymentMethod: 'طريقة الدفع المفضلة',
    cash: 'كاش عند الاستلام',
    card: 'بطاقة بنكية / فيزا',
    confirmOrder: 'إرسال وتأكيد الطلب الآن',
    orderPlacedTitle: 'تم إرسال طلبك للمطبخ بنجاح! 🎉',
    orderPlacedMsg: 'طلبك قيد التجهيز الآن وسنحضره لطاولتك في أقرب وقت.',
    billRequestedTitle: 'تم استلام طلب الشيك! 🧾',
    billRequestedMsg: 'الويتر في طريقه إليك الآن بالفاتورة وجهاز الدفع.',
    digitalCheckTitle: 'الشيك الإلكتروني المباشر',
    noActiveOrders: 'لا توجد طلبات معلقة لهذه الطاولة حالياً. تم سداد الفاتورة بنجاح.',
    currentDueTotal: 'المبلغ الإجمالي المستحق:',
    close: 'إغلاق',
    viewMenu: 'تصفح المنيو الآن',
    specialOffer: 'عرض خاص',
    pendingKitchen: 'بانتظار الاستلام',
    preparingKitchen: 'جاري التحضير بالمطبخ',
    readyToServe: 'جاهز للتقديم',
    deliveredTable: 'تم التسليم لطاولتك',
    completedOrder: 'تم إغلاق الحساب',
    cancelledOrder: 'تم إلغاء الطلب',
    orderNum: 'طلب',
    cancelOrder: 'إلغاء الطلب',
    deleteItem: 'حذف',
    customerInfo: 'بيانات العميل (الاسم ورقم الهاتف)',
    switchLangTitle: 'Switch to English',
    zoomImage: 'تكبير الصورة',
    zoomControls: 'تكبير / تصغير',
    resetZoom: 'إعادة الضبط',
    doubleClickToZoom: 'انقر مرتين لتكبير وتصغير الصورة',
    reviewTitle: 'تقييم تجربتك',
    writeReview: 'اكتب رأيك وانطباعك هنا...',
    submitReview: 'إرسال التقييم',
    chatbotTitle: 'المساعد الذكي',
    typeMessage: 'اكتب رسالتك هنا...',
    askAnything: 'اسأل عن المنيو وتوصيات الأصناف',
    tableSelectPrompt: 'اختر رقم طاولتك للبدء',
    allRightsReserved: 'جميع الحقوق محفوظة',
    poweredBy: 'تطوير وتشغيل'
  },
  en: {
    table: 'Table',
    tableNumber: 'Table No.',
    changeTable: 'Change',
    openForOrders: 'Open for Orders',
    requestBill: 'Request Bill',
    billRequested: 'Bill Requested',
    callWaiter: 'Call Waiter',
    waiterRequested: 'Waiter Called',
    callWaiterPrompt: 'How can our waiter assist you?',
    water: 'Cold Water',
    napkins: 'Extra Napkins',
    cleanTable: 'Clean Table',
    otherAssistance: 'Other Assistance',
    sendRequest: 'Send Request',
    lockedByOther: 'Locked by another device',
    digitalCheck: 'Digital Check',
    searchPlaceholder: 'Search coffee, drinks, cakes, or meals...',
    popularSection: 'Most Popular & Best Sellers ⭐',
    popularSub: 'Our guest favorites and most ordered selections',
    allCategories: 'All',
    add: 'Add',
    added: 'Added',
    unavailable: 'Out of Stock',
    calories: 'kcal',
    currency: 'EGP',
    cart: 'My Order Cart',
    cartSummary: 'Cart Summary',
    emptyCart: 'Your cart is empty',
    emptyCartMsg: 'Browse the menu and tap "+ Add" to pick your favorites',
    items: 'items',
    total: 'Total Amount',
    subtotal: 'Subtotal',
    tax: 'VAT Tax',
    notes: 'Special Requests / Notes (Optional)',
    notesPlaceholder: 'e.g. No sugar, oat milk, extra ice...',
    customerName: 'Your Name (Optional)',
    customerPhone: 'Phone Number (Optional)',
    paymentMethod: 'Payment Method',
    cash: 'Cash upon delivery',
    card: 'Credit / Debit Card',
    confirmOrder: 'Confirm & Send Order',
    orderPlacedTitle: 'Order sent to the kitchen! 🎉',
    orderPlacedMsg: 'Your order is being freshly prepared and will be served shortly.',
    billRequestedTitle: 'Bill request received! 🧾',
    billRequestedMsg: 'Our server is heading to your table with the invoice and POS device.',
    digitalCheckTitle: 'Live Digital Check',
    noActiveOrders: 'No active unpaid orders for this table. Bill is settled.',
    currentDueTotal: 'Total Due Amount:',
    close: 'Close',
    viewMenu: 'Browse Menu Now',
    specialOffer: 'Special Offer',
    pendingKitchen: 'Pending Receipt',
    preparingKitchen: 'Preparing in Kitchen',
    readyToServe: 'Ready to Serve',
    deliveredTable: 'Delivered to Table',
    completedOrder: 'Check Settled',
    cancelledOrder: 'Order Cancelled',
    orderNum: 'Order',
    cancelOrder: 'Cancel Order',
    deleteItem: 'Delete',
    customerInfo: 'Customer Info (Name & Phone)',
    switchLangTitle: 'التحويل للعربية',
    zoomImage: 'Enlarge Image',
    zoomControls: 'Zoom Controls',
    resetZoom: 'Reset Zoom',
    doubleClickToZoom: 'Double click/tap to zoom image',
    reviewTitle: 'Rate Your Experience',
    writeReview: 'Write your thoughts & review here...',
    submitReview: 'Submit Review',
    chatbotTitle: 'AI Assistant',
    typeMessage: 'Type a message...',
    askAnything: 'Ask about the menu or recommendations',
    tableSelectPrompt: 'Select Your Table Number',
    allRightsReserved: 'All Rights Reserved',
    poweredBy: 'Powered by'
  }
};

export function getCategoryName(category?: { name: string; nameEn?: string } | null, lang: 'ar' | 'en' = 'ar'): string {
  if (!category) return '';
  if (lang === 'en') {
    if (category.nameEn && category.nameEn.trim()) return category.nameEn.trim();
    return autoTranslateArabicToEnglish(category.name);
  }
  return category.name || '';
}

export function getItemName(item?: { name: string; nameEn?: string } | null, lang: 'ar' | 'en' = 'ar'): string {
  if (!item) return '';
  if (lang === 'en') {
    if (item.nameEn && item.nameEn.trim()) return item.nameEn.trim();
    return autoTranslateArabicToEnglish(item.name);
  }
  return item.name || '';
}

export function getItemDesc(item?: { description?: string; descriptionEn?: string } | null, lang: 'ar' | 'en' = 'ar'): string {
  if (!item) return '';
  if (lang === 'en') {
    if (item.descriptionEn && item.descriptionEn.trim()) return item.descriptionEn.trim();
    return item.description ? autoTranslateArabicToEnglish(item.description) : '';
  }
  return item.description || '';
}

export const adminUiTranslations = {
  ar: {
    dashboardTitle: 'لوحة الإدارة الشاملة',
    dashboardSub: 'التحكم المتكامل في الطلبات، الطاولات، التقارير، والمنيو',
    ordersTab: 'الطلبات',
    billsTab: 'طلب الشيك والحساب',
    tablesTab: 'الطاولات والجلسات',
    menuTab: 'إدارة المنيو',
    splashTab: 'شاشة التحميل والترحيب',
    adsTab: 'نظام الإعلانات',
    customersTab: 'العملاء والولاء',
    statsTab: 'التقارير والمبيعات',
    logsTab: 'سجل الأحداث واللوج',
    developerTab: 'خزانة المطور والسيستم',
    settingsTab: 'إعدادات النظام',
    previewAsClient: 'معاينة كعميل',
    lockAdmin: 'قفل الحماية',
    totalSales: 'مبيعات اليوم',
    totalOrders: 'إجمالي الطلبات',
    activeTablesCount: 'طاولة مشغولة',
    pendingOrdersCount: 'طلب معلق',
    billRequestsCount: 'طلب شيك',
    systemLanguage: 'لغة النظام المفضلة (Preferred Language)',
    systemLanguageSub: 'اختر اللغة الافتراضية للسيستم والتي تظهر للعملاء وفي لوحة التحكم',
    arabicLanguage: 'اللغة العربية (Arabic)',
    englishLanguage: 'English (الإنجليزية)',
    saveLanguage: 'حفظ لغة النظام',
    bulkPriceUpdate: 'تحديث الأسعار جماعياً',
    addCategory: 'إضافة قسم جديد',
    addItem: 'إضافة صنف جديد',
    allCategories: 'جميع الأقسام',
    search: 'بحث...',
    status: 'الحالة',
    actions: 'الإجراءات',
    price: 'السعر',
    available: 'متوفر',
    unavailable: 'غير متوفر',
    popular: 'مميز / مشهور',
    edit: 'تعديل',
    delete: 'حذف',
    save: 'حفظ',
    cancel: 'إلغاء',
    active: 'نشط',
    disabled: 'معطل',
  },
  en: {
    dashboardTitle: 'Admin Dashboard',
    dashboardSub: 'Complete control over orders, tables, reports, and menu',
    ordersTab: 'Orders',
    billsTab: 'Bill Requests',
    tablesTab: 'Tables & Sessions',
    menuTab: 'Menu Management',
    splashTab: 'Splash Screen',
    adsTab: 'Ads & Banners',
    customersTab: 'Customers & Loyalty',
    statsTab: 'Sales & Reports',
    logsTab: 'System Audit Logs',
    developerTab: 'Developer Console',
    settingsTab: 'System Settings',
    previewAsClient: 'Preview as Client',
    lockAdmin: 'Lock Protection',
    totalSales: "Today's Sales",
    totalOrders: 'Total Orders',
    activeTablesCount: 'Active Tables',
    pendingOrdersCount: 'Pending Orders',
    billRequestsCount: 'Bill Requests',
    systemLanguage: 'Preferred System Language',
    systemLanguageSub: 'Select default system language for customer menu & admin dashboard',
    arabicLanguage: 'Arabic (العربية)',
    englishLanguage: 'English',
    saveLanguage: 'Save System Language',
    bulkPriceUpdate: 'Bulk Price Update',
    addCategory: 'Add Category',
    addItem: 'Add Menu Item',
    allCategories: 'All Categories',
    search: 'Search...',
    status: 'Status',
    actions: 'Actions',
    price: 'Price',
    available: 'Available',
    unavailable: 'Out of Stock',
    popular: 'Popular / Best Seller',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    active: 'Active',
    disabled: 'Disabled',
  }
};

// Automatic Intelligent Translation function
export function autoTranslateArabicToEnglish(text: string): string {
  if (!text || !text.trim()) return '';
  const trimmed = text.trim();

  // If text is already mostly Latin/English characters, return as is
  if (/^[a-zA-Z0-9\s.,'"+#()&/%-]+$/.test(trimmed)) {
    return trimmed;
  }

  // 1. Direct dictionary lookup (exact match)
  if (foodTermsArToEn[trimmed]) {
    return foodTermsArToEn[trimmed];
  }

  // 2. Case-insensitive or normalized Arabic matching
  const normalizeAr = (s: string) => s
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim()
    .toLowerCase();

  const normInput = normalizeAr(trimmed);

  for (const [arKey, enVal] of Object.entries(foodTermsArToEn)) {
    if (normalizeAr(arKey) === normInput) {
      return enVal;
    }
  }

  // 3. Substring / Multi-word intelligent replacement (sorted by length descending)
  let workingText = trimmed;
  const sortedDictEntries = Object.entries(foodTermsArToEn).sort((a, b) => b[0].length - a[0].length);

  for (const [arKey, enVal] of sortedDictEntries) {
    if (arKey.length > 2 && workingText.includes(arKey)) {
      const regex = new RegExp(arKey, 'g');
      workingText = workingText.replace(regex, ` ${enVal} `);
    }
  }

  // 4. Common particles & connectors
  const particles: Record<string, string> = {
    'مع': 'with',
    'بالـ': 'with',
    'بال': 'with',
    'بـ': 'with',
    'و': '&',
    'حجم كبير': 'Large',
    'كبير': 'Large',
    'حجم وسط': 'Medium',
    'وسط': 'Medium',
    'حجم صغير': 'Small',
    'صغير': 'Small',
    'دبل': 'Double',
    'سنجل': 'Single',
    'سادة': 'Plain',
    'مثلج': 'Iced',
    'بارد': 'Cold',
    'ساخن': 'Hot',
    'طازج': 'Fresh',
    'بدون سكر': 'Sugar-free',
    'زيادة': 'Extra',
    'مكس': 'Mix',
    'مشكل': 'Mixed'
  };

  for (const [arP, enP] of Object.entries(particles)) {
    if (workingText.includes(arP)) {
      const regex = new RegExp(`\\b${arP}\\b`, 'g');
      workingText = workingText.replace(regex, ` ${enP} `);
    }
  }

  // Clean extra spaces
  const cleaned = workingText.replace(/\s+/g, ' ').trim();
  if (cleaned && cleaned !== trimmed) {
    return cleaned;
  }

  // Check if it's a customer name or non-food Arabic string and auto-transliterate
  if (/[\u0600-\u06FF]/.test(trimmed)) {
    const translatedName = autoTranslateCustomerName(trimmed);
    if (translatedName && translatedName !== trimmed) {
      return translatedName;
    }
  }

  // Word-by-word fallback
  const words = trimmed.split(/\s+/);
  const translatedWords = words.map(word => {
    const cleanWord = word.replace(/[،,.]/g, '');
    return foodTermsArToEn[cleanWord] || foodTermsArToEn[word] || word;
  });

  const reconstructed = translatedWords.join(' ');
  return reconstructed || trimmed;
}

// Arabic Names Dictionary for precise name translation
export const arabicNamesDict: Record<string, string> = {
  'محمود': 'Mahmoud',
  'محمد': 'Mohamed',
  'أحمد': 'Ahmed',
  'احمد': 'Ahmed',
  'مصطفى': 'Mostafa',
  'مصفى': 'Mostafa',
  'علي': 'Ali',
  'على': 'Ali',
  'حسن': 'Hassan',
  'حسين': 'Hussein',
  'إبراهيم': 'Ibrahim',
  'ابراهيم': 'Ibrahim',
  'يوسف': 'Youssef',
  'عمر': 'Omar',
  'عمرو': 'Amr',
  'خالد': 'Khaled',
  'طارق': 'Tarek',
  'زياد': 'Ziad',
  'كريم': 'Kareem',
  'حمزة': 'Hamza',
  'ياسين': 'Yassin',
  'آدم': 'Adam',
  'ادم': 'Adam',
  'سارة': 'Sara',
  'مريم': 'Maryam',
  'نور': 'Nour',
  'فاطمة': 'Fatma',
  'عائشة': 'Aisha',
  'منى': 'Mona',
  'سلمى': 'Salma',
  'دعاء': 'Doaa',
  'شيماء': 'Shaimaa',
  'هدى': 'Hoda',
  'هبة': 'Heba',
  'رانيا': 'Rania',
  'داليا': 'Dalia',
  'ياسمين': 'Yasmine',
  'نورهان': 'Nourhan',
  'روان': 'Rawan',
  'منة': 'Menna',
  'منه': 'Menna',
  'فرح': 'Farah',
  'شهد': 'Shahd',
  'جود': 'Joud',
  'ندى': 'Nada',
  'دينا': 'Dina',
  'ريم': 'Reem',
  'لمياء': 'Lamiaa',
  'بسمة': 'Basma',
  'أميرة': 'Amira',
  'اميرة': 'Amira',
  'إسراء': 'Esraa',
  'اسراء': 'Esraa',
  'آية': 'Aya',
  'اية': 'Aya',
  'خديجة': 'Khadija',
  'جودي': 'Judy',
  'فريدة': 'Farida',
  'ليلى': 'Laila',
  'يارا': 'Yara',
  'مي': 'Mai',
  'نسرين': 'Nesrine',
  'هالة': 'Hala',
  'نجلاء': 'Naglaa',
  'أمل': 'Amal',
  'امل': 'Amal',
  'هنا': 'Hana',
  'نورا': 'Nora',
  'جنى': 'Jana',
  'أروى': 'Arwa',
  'اروى': 'Arwa',
  'نانسي': 'Nancy',
  'مارينا': 'Marina',
  'نيفين': 'Nevin',
  'سهيلة': 'Sohaila',
  'بسنت': 'Basant',
  'شرين': 'Sherine',
  'شيرين': 'Sherine',
  'انجي': 'Engy',
  'علا': 'Ola',
  'رباب': 'Rabab',
  'غادة': 'Ghada',
  'إيمان': 'Eman',
  'ايمان': 'Eman',
  'وفاء': 'Wafaa',
  'سمر': 'Samar',
  'أماني': 'Amani',
  'سلوى': 'Salwa',
  'شادية': 'Shadia',
  'زينب': 'Zainab',
  'نهى': 'Noha',
  'نجوى': 'Nagwa',
  'مايسة': 'Maysa',
  'جيهان': 'Gehan',
  'عزة': 'Azza',
  'أحلام': 'Ahlam',
  'سحر': 'Sahar',
  'عبير': 'Abeer',
  'حنان': 'Hanan',
  'نادية': 'Nadia',
  'فادية': 'Fadia',
  'صفاء': 'Safaa',
  'كاميليا': 'Camelia',
  'ماجدة': 'Magda',
  'سامية': 'Samia',
  'سناء': 'Sanaa',
  'رجاء': 'Ragaa',
  'سعاد': 'Soad',
  'كوثر': 'Kawsar',
  'نفيسة': 'Nafisa',
  'وداد': 'Wedad',
  'ثريا': 'Thoraya',
  'العفري': 'Elafy',
  'عفري': 'El-Afry',
  'العطار': 'El-Attar',
  'عطار': 'Attar',
  'الشافعي': 'El-Shafei',
  'النجار': 'El-Naggar',
  'الحداد': 'El-Haddad',
  'السعيد': 'El-Sayed',
  'السيد': 'El-Sayed',
  'سيد': 'Sayed',
  'المصري': 'El-Masry',
  'الشريف': 'El-Sherif',
  'شريف': 'Sherif',
  'العلي': 'El-Ali',
  'العربي': 'El-Araby',
  'صقر': 'Sakr',
  'زكي': 'Zaki',
  'سليمان': 'Soliman',
  'عثمان': 'Othman',
  'فاروق': 'Farouk',
  'مراد': 'Mourad',
  'ناصر': 'Nasser',
  'الشاذلي': 'El-Shazly',
  'القاضي': 'El-Kady',
  'مهران': 'Mehran',
  'رضوان': 'Radwan',
  'فهمي': 'Fahmy',
  'رمزي': 'Ramzy',
  'زاهر': 'Zaher',
  'حلمي': 'Helmy',
  'لطفي': 'Lotfy',
  'فوزي': 'Fawzy',
  'فكري': 'Fekry',
  'بدوي': 'Badawy',
  'حجازي': 'Hegazy',
  'طاهر': 'Taher',
  'صابر': 'Saber',
  'راغب': 'Ragheb',
  'ممدوح': 'Mamdouh',
  'نبيل': 'Nabil',
  'شفيق': 'Shafik',
  'وفيق': 'Wafik',
  'سامي': 'Samy',
  'رامي': 'Ramy',
  'هاني': 'Hany',
  'مجدي': 'Magdy',
  'عادل': 'Adel',
  'أشرف': 'Ashraf',
  'اشرف': 'Ashraf',
  'أيمن': 'Ayman',
  'ايمن': 'Ayman',
  'شادي': 'Shady',
  'فادي': 'Fady',
  'نادر': 'Nader',
  'تامر': 'Tamer',
  'وليد': 'Waleed',
  'وائل': 'Wael',
  'باسم': 'Bassem',
  'بسام': 'Bassam',
  'باسل': 'Basel',
  'حاتم': 'Hatem',
  'هشام': 'Hisham',
  'عصام': 'Essam',
  'حسام': 'Hossam',
  'إيهاب': 'Ehab',
  'ايهاب': 'Ehab',
  'ماجد': 'Maged',
  'ماهر': 'Maher',
  'ياسر': 'Yasser',
  'علاء': 'Alaa',
  'بهاء': 'Bahaa',
  'ضياء': 'Diaa',
  'مدحت': 'Medhat',
  'منير': 'Mounir',
  'سمير': 'Samir',
  'عاطف': 'Atef',
  'رفعت': 'Rifaat',
  'شحاتة': 'Shehata',
  'طلعت': 'Talaat',
  'رأفت': 'Raafat',
  'رافت': 'Raafat',
  'عزت': 'Ezzat',
  'شوكت': 'Shawkat',
  'نشأت': 'Nashaat',
  'عصمت': 'Essmat',
  'صبري': 'Sabry',
  'شكري': 'Shokry',
  'يسري': 'Yosry',
  'حمدي': 'Hamdy',
  'وجدي': 'Wagdy',
  'فتحي': 'Fathy',
  'مرسي': 'Morsi',
  'بكر': 'Bakr',
  'عامر': 'Amer',
  'سالم': 'Salem',
  'سلامة': 'Salama',
  'منصور': 'Mansour',
  'فرج': 'Farag',
  'مبروك': 'Mabrouk',
  'سعد': 'Saad',
  'سعيد': 'Said',
  'مسعود': 'Masoud',
  'شعبان': 'Shaaban',
  'رمضان': 'Ramadan',
  'رجب': 'Ragab',
  'خليل': 'Khalil',
  'إسماعيل': 'Ismail',
  'اسماعيل': 'Ismail',
  'يعقوب': 'Yacoub',
  'مؤمن': 'Moamen',
  'ممت': 'Moamen',
  'متولي': 'Metwally',
  'مصيلحي': 'Moselhy',
  'عميل كافيه': 'Café Guest',
  'عميل': 'Guest',
  'زائر': 'Visitor'
};

// Rule-Based Arabic Phonetic Transliteration Engine
export function transliterateArabicText(arabicText: string): string {
  if (!arabicText) return '';
  const charMap: Record<string, string> = {
    'أ': 'A', 'إ': 'I', 'آ': 'A', 'ا': 'a',
    'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'g',
    'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z',
    'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
    'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z',
    'ع': 'A', 'غ': 'gh', 'ف': 'f', 'ق': 'k',
    'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
    'ه': 'h', 'و': 'o', 'ي': 'y', 'ى': 'a',
    'ة': 'h', 'ء': '', 'ئ': 'e', 'ؤ': 'o'
  };

  return arabicText.split(/\s+/).map(word => {
    let clean = word.trim();
    if (!clean) return '';
    
    // Check direct dictionary first
    if (arabicNamesDict[clean]) return arabicNamesDict[clean];
    
    // Normalize & check dictionary
    const norm = clean.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
    if (arabicNamesDict[norm]) return arabicNamesDict[norm];

    // Handle "ال" prefix
    let prefix = '';
    if (clean.startsWith('ال') && clean.length > 3) {
      prefix = 'El-';
      clean = clean.slice(2);
    } else if (clean.startsWith('عبد') && clean.length > 4) {
      return 'Abdel' + transliterateArabicText(clean.slice(3));
    }

    let result = '';
    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      if (charMap[char]) {
        let mapped = charMap[char];
        // Double letters or vowels
        if (i === 0) mapped = mapped.toUpperCase();
        result += mapped;
      } else {
        result += char;
      }
    }

    if (!result) return word;
    const capitalized = result.charAt(0).toUpperCase() + result.slice(1);
    return prefix + capitalized;
  }).join(' ');
}

// Automatic Customer Name Translator
export function autoTranslateCustomerName(rawName?: string, isEn: boolean = true): string {
  if (!rawName || !rawName.trim()) {
    return isEn ? 'Café Guest' : 'عميل كافيه';
  }
  const trimmed = rawName.trim();

  // If language is Arabic, return original
  if (!isEn) return trimmed;

  // If name is already in Latin script, return as is (capitalized)
  if (/^[a-zA-Z0-9\s.,'"+#()&/%-]+$/.test(trimmed)) {
    return trimmed.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // Check name dictionary per word
  const words = trimmed.split(/\s+/);
  const translatedWords = words.map(word => {
    if (arabicNamesDict[word]) return arabicNamesDict[word];
    const norm = word.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
    if (arabicNamesDict[norm]) return arabicNamesDict[norm];
    return transliterateArabicText(word);
  });

  return translatedWords.filter(Boolean).join(' ') || trimmed;
}

export function autoTranslateEnglishToArabic(text: string): string {
  if (!text || !text.trim()) return '';
  const trimmed = text.trim().toLowerCase();

  for (const [arKey, enVal] of Object.entries(foodTermsArToEn)) {
    if (enVal.toLowerCase() === trimmed) {
      return arKey;
    }
  }
  return text;
}
