import type { 
  Category, 
  MenuItem, 
  Order, 
  TableInfo, 
  Banner, 
  PopupAd, 
  SystemSettings,
  Customer,
  SystemLog,
  Coupon,
  CustomerReview
} from '../types.ts';

// Initial seed data
export const initialCategories: Category[] = [
  {
    "id": "cat-hot-drinks",
    "name": "هوت درينك",
    "nameEn": "Hot Drinks",
    "description": "شاي، قهوة تركي، سحلب ومشروبات دافئة",
    "descriptionEn": "Teas, Turkish coffee, and warm beverages",
    "icon": "Flame",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "order": 1
  },
  {
    "id": "cat-italian-coffee",
    "name": "قهوة ايطالي",
    "nameEn": "Italian Coffee",
    "description": "إسبرسو، كابتشينو، فلات وايت، لاتيه وموكا",
    "descriptionEn": "Espresso, Cappuccino, Flat White, Latte & Mocha",
    "icon": "Coffee",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "order": 2
  },
  {
    "id": "cat-fresh-juice",
    "name": "عصير فريش",
    "nameEn": "Fresh Juice",
    "description": "عصائر فواكه طبيعية طازجة 100%",
    "descriptionEn": "100% fresh natural fruit juices",
    "icon": "GlassWater",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "order": 3
  },
  {
    "id": "cat-soda",
    "name": "صودا",
    "nameEn": "Soda",
    "description": "مشروبات صودا منعشة وموهيتو بنكهات متعددة",
    "descriptionEn": "Refreshing flavored sodas and mojitos",
    "icon": "GlassWater",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "order": 4
  },
  {
    "id": "cat-smoothie",
    "name": "سموزي",
    "nameEn": "Smoothie",
    "description": "سموزي مثلج بمختلف الفواكه الطازجة",
    "descriptionEn": "Blended fruit smoothies and refreshes",
    "icon": "GlassWater",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "order": 5
  },
  {
    "id": "cat-boba",
    "name": "بوبا",
    "nameEn": "Boba Drinks",
    "description": "مشروبات بوبا بحبيبات التابيوكا المميزة",
    "descriptionEn": "Tapioca pearl boba drinks",
    "icon": "GlassWater",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "order": 6
  },
  {
    "id": "cat-milkshake",
    "name": "ميلك شيك",
    "nameEn": "Milkshakes",
    "description": "مخفوق حليب كريمي وغني بالنكهات الفاخرة",
    "descriptionEn": "Rich and creamy flavored milkshakes",
    "icon": "Milk",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "order": 7
  },
  {
    "id": "cat-ice-coffee",
    "name": "ايس كوفي",
    "nameEn": "Ice Coffee",
    "description": "قهوة مثلجة، ايس لاتيه وايس موكا",
    "descriptionEn": "Iced espresso & cold coffee creations",
    "icon": "Coffee",
    "image": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    "order": 8
  },
  {
    "id": "cat-ice-frappe",
    "name": "ايس فرابيه",
    "nameEn": "Ice Frappe",
    "description": "فرابيه مثلج مخفوق بالكريمة والنكهات",
    "descriptionEn": "Blended iced coffee frappes",
    "icon": "Coffee",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "order": 9
  },
  {
    "id": "cat-ice-tea",
    "name": "ايس تي",
    "nameEn": "Ice Tea",
    "description": "شاي مثلج بنكهات الفواكه والزهور",
    "descriptionEn": "Chilled brewed iced teas",
    "icon": "GlassWater",
    "image": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80",
    "order": 10
  },
  {
    "id": "cat-ice-matcha",
    "name": "ايس ماتشا",
    "nameEn": "Ice Matcha",
    "description": "ماتشا يابانية مثلجة مع الحليب والفواكه",
    "descriptionEn": "Artisanal iced Japanese matcha drinks",
    "icon": "GlassWater",
    "image": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80",
    "order": 11
  },
  {
    "id": "cat-soft-drinks",
    "name": "سوفت درينك",
    "nameEn": "Soft Drinks",
    "description": "مشروبات طاقة ومياه غازية ومعدنية",
    "descriptionEn": "Energy drinks, sodas & water",
    "icon": "GlassWater",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "order": 12
  },
  {
    "id": "cat-waffle",
    "name": "وافل",
    "nameEn": "Waffles",
    "description": "وافل مقرمش مع أشهى أنواع الشوكولاتة والصوصات",
    "descriptionEn": "Crispy waffles with sweet toppings",
    "icon": "Cake",
    "image": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80",
    "order": 13
  },
  {
    "id": "cat-pancake",
    "name": "بان كيك",
    "nameEn": "Pancakes",
    "description": "ميني بان كيك طازج (12 قطعة / 25 قطعة) مع صوصات فاخرة",
    "descriptionEn": "Fresh mini pancakes (12 pcs / 25 pcs)",
    "icon": "Cake",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "order": 14
  },
  {
    "id": "cat-taro",
    "name": "تارو",
    "nameEn": "Taro Drinks",
    "description": "مشروبات التارو اللذيذة بنكهة مميزة",
    "descriptionEn": "Unique and flavorful Taro blends",
    "icon": "GlassWater",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "order": 15
  },
  {
    "id": "cat-dessert",
    "name": "ديزيرت",
    "nameEn": "Desserts",
    "description": "تشكيلة فاخرة من الكيك، الموس والمولتن",
    "descriptionEn": "Cakes, mousse, and gourmet desserts",
    "icon": "Cake",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "order": 16
  },
  {
    "id": "cat-toast",
    "name": "توست",
    "nameEn": "Toast",
    "description": "سندوتشات توست ساخنة وجبن ولحوم مدخنة",
    "descriptionEn": "Hot toasted sandwiches with cheese and meats",
    "icon": "Utensils",
    "image": "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
    "order": 17
  },
  {
    "id": "cat-croissant",
    "name": "كرواسون",
    "nameEn": "Croissants",
    "description": "كرواسون فرنسي هش حادق وحلو",
    "descriptionEn": "Flaky fresh sweet and savory croissants",
    "icon": "Utensils",
    "image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    "order": 18
  },
  {
    "id": "cat-cold-cuts",
    "name": "كولد كات(سندوتش)",
    "nameEn": "Cold Cuts Sandwiches",
    "description": "سندوتشات كولد كات فاخرة",
    "descriptionEn": "Premium cold cuts deli sandwiches",
    "icon": "Utensils",
    "image": "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80",
    "order": 19
  },
  {
    "id": "cat-wraps",
    "name": "راب سيليو(تورتيلا)",
    "nameEn": "Celio Wraps (Tortilla)",
    "description": "رول تورتيلا بحشوات الجبن واللحوم المدخنة",
    "descriptionEn": "Tortilla wraps with cheeses and meats",
    "icon": "Utensils",
    "image": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80",
    "order": 20
  },
  {
    "id": "cat-extras",
    "name": "اضافات",
    "nameEn": "Extras & Add-ons",
    "description": "إضافات فليفر، مكسرات، بوبا وبذور الريحان",
    "descriptionEn": "Toppings, flavors, nuts & boba",
    "icon": "Sparkles",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "order": 21
  }
];

export const initialMenuItems: MenuItem[] = [
  {
    "id": "m-1",
    "categoryId": "cat-hot-drinks",
    "name": "شاي",
    "price": 30,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-2",
    "categoryId": "cat-hot-drinks",
    "name": "شاي فواكه",
    "price": 40,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-3",
    "categoryId": "cat-hot-drinks",
    "name": "شاي كرك",
    "price": 60,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-4",
    "categoryId": "cat-hot-drinks",
    "name": "هوت سيزر",
    "price": 50,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-5",
    "categoryId": "cat-hot-drinks",
    "name": "قهوه تركي ساده سنجل",
    "price": 40,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-6",
    "categoryId": "cat-hot-drinks",
    "name": "قهوة تركي ساده دبل",
    "price": 55,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-7",
    "categoryId": "cat-hot-drinks",
    "name": "قهوة تركي محوج سنجل",
    "price": 45,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-8",
    "categoryId": "cat-hot-drinks",
    "name": "قهوة تركي محوج دبل",
    "price": 60,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-9",
    "categoryId": "cat-hot-drinks",
    "name": "قهوة محوج مستكة",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-10",
    "categoryId": "cat-hot-drinks",
    "name": "قهوة فرنساوي",
    "price": 50,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-11",
    "categoryId": "cat-hot-drinks",
    "name": "قهوة بندق",
    "price": 60,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-12",
    "categoryId": "cat-hot-drinks",
    "name": "قهوة كراميل",
    "price": 60,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-13",
    "categoryId": "cat-hot-drinks",
    "name": "قهوة شوكلت",
    "price": 60,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-14",
    "categoryId": "cat-hot-drinks",
    "name": "سحلب",
    "price": 60,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-15",
    "categoryId": "cat-hot-drinks",
    "name": "اعشاب",
    "price": 40,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-16",
    "categoryId": "cat-hot-drinks",
    "name": "مكس اعشاب",
    "price": 50,
    "description": "",
    "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-17",
    "categoryId": "cat-italian-coffee",
    "name": "اسبرسو سنجل",
    "price": 45,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-18",
    "categoryId": "cat-italian-coffee",
    "name": "اسبرسو دابل",
    "price": 65,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-19",
    "categoryId": "cat-italian-coffee",
    "name": "ميكاتو",
    "price": 60,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-20",
    "categoryId": "cat-italian-coffee",
    "name": "كورتادو",
    "price": 65,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-21",
    "categoryId": "cat-italian-coffee",
    "name": "فلات وايت",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-22",
    "categoryId": "cat-italian-coffee",
    "name": "لاتيه",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-23",
    "categoryId": "cat-italian-coffee",
    "name": "كابتشينو",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-24",
    "categoryId": "cat-italian-coffee",
    "name": "افوجاتو",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-25",
    "categoryId": "cat-italian-coffee",
    "name": "موكا",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-26",
    "categoryId": "cat-italian-coffee",
    "name": "نسكافيه",
    "price": 50,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-27",
    "categoryId": "cat-italian-coffee",
    "name": "نسكافية حليب",
    "price": 65,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-28",
    "categoryId": "cat-italian-coffee",
    "name": "هوت اسبانش لاتيه",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-29",
    "categoryId": "cat-fresh-juice",
    "name": "مانجو",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-30",
    "categoryId": "cat-fresh-juice",
    "name": "جوافه",
    "price": 65,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-31",
    "categoryId": "cat-fresh-juice",
    "name": "فراوله",
    "price": 65,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-32",
    "categoryId": "cat-fresh-juice",
    "name": "كيوي",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-33",
    "categoryId": "cat-fresh-juice",
    "name": "اناناس",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-34",
    "categoryId": "cat-fresh-juice",
    "name": "خوخ",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-35",
    "categoryId": "cat-fresh-juice",
    "name": "برتقال",
    "price": 65,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-36",
    "categoryId": "cat-fresh-juice",
    "name": "افوكادو",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-37",
    "categoryId": "cat-fresh-juice",
    "name": "افوكادو مكسرات",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-38",
    "categoryId": "cat-fresh-juice",
    "name": "موز بلبن",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-39",
    "categoryId": "cat-fresh-juice",
    "name": "موز فرولة",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-40",
    "categoryId": "cat-fresh-juice",
    "name": "بطيخ",
    "price": 65,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-41",
    "categoryId": "cat-fresh-juice",
    "name": "بطيخ نعناع",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-42",
    "categoryId": "cat-fresh-juice",
    "name": "ليمون",
    "price": 50,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-43",
    "categoryId": "cat-fresh-juice",
    "name": "ليموناده",
    "price": 55,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-44",
    "categoryId": "cat-fresh-juice",
    "name": "اليكتريك",
    "price": 60,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-45",
    "categoryId": "cat-fresh-juice",
    "name": "بلاك ليمون",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-46",
    "categoryId": "cat-fresh-juice",
    "name": "فروت كوكتيل",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-47",
    "categoryId": "cat-soda",
    "name": "بلو بيري",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-48",
    "categoryId": "cat-soda",
    "name": "فرولة",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-49",
    "categoryId": "cat-soda",
    "name": "باشون",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-50",
    "categoryId": "cat-soda",
    "name": "مانجو",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-51",
    "categoryId": "cat-soda",
    "name": "خوخ",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-52",
    "categoryId": "cat-soda",
    "name": "رسبري بري",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-53",
    "categoryId": "cat-soda",
    "name": "شري كولا",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-54",
    "categoryId": "cat-soda",
    "name": "جيلي كولا",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-55",
    "categoryId": "cat-soda",
    "name": "بينا كولادا",
    "price": 85,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-56",
    "categoryId": "cat-soda",
    "name": "بلو سكاي",
    "price": 85,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-57",
    "categoryId": "cat-soda",
    "name": "موهيتو",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-58",
    "categoryId": "cat-soda",
    "name": "موهيتو فليفر",
    "price": 85,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-59",
    "categoryId": "cat-smoothie",
    "name": "مانجو",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-60",
    "categoryId": "cat-smoothie",
    "name": "كيوي",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-61",
    "categoryId": "cat-smoothie",
    "name": "خوخ",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-62",
    "categoryId": "cat-smoothie",
    "name": "اناناس",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-63",
    "categoryId": "cat-smoothie",
    "name": "بطيخ",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-64",
    "categoryId": "cat-smoothie",
    "name": "بطيخ نعناع",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-65",
    "categoryId": "cat-smoothie",
    "name": "فراوله",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-66",
    "categoryId": "cat-smoothie",
    "name": "ليمون نعناع",
    "price": 75,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-67",
    "categoryId": "cat-smoothie",
    "name": "بلو بيري",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-68",
    "categoryId": "cat-smoothie",
    "name": "ميكس بيري",
    "price": 80,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-69",
    "categoryId": "cat-smoothie",
    "name": "سيليو (كيوي باشون)",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-70",
    "categoryId": "cat-boba",
    "name": "ايس لاتيه",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-71",
    "categoryId": "cat-boba",
    "name": "ايس اسبانش لاتيه",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-72",
    "categoryId": "cat-boba",
    "name": "ايس موكا",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-73",
    "categoryId": "cat-boba",
    "name": "ماتشا",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-74",
    "categoryId": "cat-boba",
    "name": "تارو",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-75",
    "categoryId": "cat-milkshake",
    "name": "ڤانيليا",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-76",
    "categoryId": "cat-milkshake",
    "name": "كراميل",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-77",
    "categoryId": "cat-milkshake",
    "name": "بندق",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-78",
    "categoryId": "cat-milkshake",
    "name": "تيراميسيو",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-79",
    "categoryId": "cat-milkshake",
    "name": "شوكليت",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-80",
    "categoryId": "cat-milkshake",
    "name": "كوكيز",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-81",
    "categoryId": "cat-milkshake",
    "name": "براونيز",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-82",
    "categoryId": "cat-milkshake",
    "name": "لوتس",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-83",
    "categoryId": "cat-milkshake",
    "name": "فسدق",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-84",
    "categoryId": "cat-milkshake",
    "name": "بلاك بيري",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-85",
    "categoryId": "cat-milkshake",
    "name": "سيليو (كاجو كراميل قرفه)",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-86",
    "categoryId": "cat-ice-coffee",
    "name": "ايس اسبانش لاتيه",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-87",
    "categoryId": "cat-ice-coffee",
    "name": "ايس لاتيه",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-88",
    "categoryId": "cat-ice-coffee",
    "name": "ايس موكا",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-89",
    "categoryId": "cat-ice-coffee",
    "name": "ايس ميكاتو كراميل",
    "price": 105,
    "description": "",
    "image": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-90",
    "categoryId": "cat-ice-coffee",
    "name": "ايس لاتيه روز",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-91",
    "categoryId": "cat-ice-coffee",
    "name": "ايس امريكانو",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-92",
    "categoryId": "cat-ice-frappe",
    "name": "فانيليا",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-93",
    "categoryId": "cat-ice-frappe",
    "name": "شوكليت",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-94",
    "categoryId": "cat-ice-frappe",
    "name": "بندق",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-95",
    "categoryId": "cat-ice-frappe",
    "name": "بستاشيو",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-96",
    "categoryId": "cat-ice-frappe",
    "name": "تيراميسيو",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-97",
    "categoryId": "cat-ice-frappe",
    "name": "فرابتشينو",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-98",
    "categoryId": "cat-ice-frappe",
    "name": "ايلي كريم",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-99",
    "categoryId": "cat-ice-tea",
    "name": "فواكه",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-100",
    "categoryId": "cat-ice-tea",
    "name": "لافندر",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-101",
    "categoryId": "cat-ice-tea",
    "name": "روزي",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-102",
    "categoryId": "cat-ice-tea",
    "name": "كلاسيك",
    "price": 50,
    "description": "",
    "image": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-103",
    "categoryId": "cat-ice-matcha",
    "name": "لاتيه",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-104",
    "categoryId": "cat-ice-matcha",
    "name": "بيري لاتيه",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-105",
    "categoryId": "cat-ice-matcha",
    "name": "فراوله لاتيه",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-106",
    "categoryId": "cat-ice-matcha",
    "name": "اسبانش لاتيه",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-107",
    "categoryId": "cat-soft-drinks",
    "name": "ريد بول اطعم",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-108",
    "categoryId": "cat-soft-drinks",
    "name": "ريد بول",
    "price": 85,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-109",
    "categoryId": "cat-soft-drinks",
    "name": "موسي اطعم",
    "price": 50,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-110",
    "categoryId": "cat-soft-drinks",
    "name": "بيبسي كانز",
    "price": 35,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-111",
    "categoryId": "cat-soft-drinks",
    "name": "سفن كانز",
    "price": 35,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-112",
    "categoryId": "cat-soft-drinks",
    "name": "مياه فوارة",
    "price": 25,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-113",
    "categoryId": "cat-soft-drinks",
    "name": "مياه فلو",
    "price": 25,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-114",
    "categoryId": "cat-soft-drinks",
    "name": "مياه معدنية صغير",
    "price": 15,
    "description": "",
    "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-115",
    "categoryId": "cat-waffle",
    "name": "شوكلت",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-116",
    "categoryId": "cat-waffle",
    "name": "نوتيلا",
    "price": 140,
    "description": "",
    "image": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-117",
    "categoryId": "cat-waffle",
    "name": "وايت",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-118",
    "categoryId": "cat-waffle",
    "name": "كيندر",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-119",
    "categoryId": "cat-waffle",
    "name": "فيرو روشيه",
    "price": 140,
    "description": "",
    "image": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-120",
    "categoryId": "cat-waffle",
    "name": "دبي",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-121",
    "categoryId": "cat-waffle",
    "name": "لوتس",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-122",
    "categoryId": "cat-waffle",
    "name": "اسبشيال",
    "price": 180,
    "description": "",
    "image": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-123",
    "categoryId": "cat-pancake",
    "name": "بان كيك شوكلت (12 قطعة)",
    "price": 80,
    "description": "12 قطعة ميني بان كيك مع صوص شوكولاتة فاخر",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-124",
    "categoryId": "cat-pancake",
    "name": "بان كيك شوكلت (25 قطعة)",
    "price": 150,
    "description": "25 قطعة ميني بان كيك مع صوص شوكولاتة فاخر",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-125",
    "categoryId": "cat-pancake",
    "name": "بان كيك نوتيلا (12 قطعة)",
    "price": 100,
    "description": "12 قطعة مع نوتيلا أصلية",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-126",
    "categoryId": "cat-pancake",
    "name": "بان كيك نوتيلا (25 قطعة)",
    "price": 190,
    "description": "25 قطعة مع نوتيلا أصلية",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-127",
    "categoryId": "cat-pancake",
    "name": "بان كيك وايت (12 قطعة)",
    "price": 80,
    "description": "12 قطعة مع صوص شوكولاتة بيضاء",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-128",
    "categoryId": "cat-pancake",
    "name": "بان كيك وايت (25 قطعة)",
    "price": 150,
    "description": "25 قطعة مع صوص شوكولاتة بيضاء",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-129",
    "categoryId": "cat-pancake",
    "name": "بان كيك كيندر (12 قطعة)",
    "price": 90,
    "description": "12 قطعة مع صوص كيندر",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-130",
    "categoryId": "cat-pancake",
    "name": "بان كيك كيندر (25 قطعة)",
    "price": 170,
    "description": "25 قطعة مع صوص كيندر",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-131",
    "categoryId": "cat-pancake",
    "name": "بان كيك فيرو روشيه (12 قطعة)",
    "price": 90,
    "description": "12 قطعة مع صوص روشيه وبندق",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-132",
    "categoryId": "cat-pancake",
    "name": "بان كيك فيرو روشيه (25 قطعة)",
    "price": 170,
    "description": "25 قطعة مع صوص روشيه وبندق",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-133",
    "categoryId": "cat-pancake",
    "name": "بان كيك دبي (12 قطعة)",
    "price": 90,
    "description": "12 قطعة بنكهة كنافة وشوكولاتة دبي",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-134",
    "categoryId": "cat-pancake",
    "name": "بان كيك دبي (25 قطعة)",
    "price": 170,
    "description": "25 قطعة بنكهة كنافة وشوكولاتة دبي",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-135",
    "categoryId": "cat-pancake",
    "name": "بان كيك لوتس (12 قطعة)",
    "price": 90,
    "description": "12 قطعة مع زبدة وبسكويت لوتس",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-136",
    "categoryId": "cat-pancake",
    "name": "بان كيك لوتس (25 قطعة)",
    "price": 170,
    "description": "25 قطعة مع زبدة وبسكويت لوتس",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-137",
    "categoryId": "cat-pancake",
    "name": "بان كيك فواكه (12 قطعة)",
    "price": 80,
    "description": "12 قطعة مع قطع فواكه مشكلة وصوص عسل",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-138",
    "categoryId": "cat-pancake",
    "name": "بان كيك فواكه (25 قطعة)",
    "price": 150,
    "description": "25 قطعة مع قطع فواكه مشكلة وصوص عسل",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-139",
    "categoryId": "cat-pancake",
    "name": "بان كيك اسبشيال (12 قطعة)",
    "price": 95,
    "description": "12 قطعة ميكس صوصات وتوبينج فاخر",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-140",
    "categoryId": "cat-pancake",
    "name": "بان كيك اسبشيال (25 قطعة)",
    "price": 180,
    "description": "25 قطعة ميكس صوصات وتوبينج فاخر",
    "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-141",
    "categoryId": "cat-taro",
    "name": "سبانش لاتية",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-142",
    "categoryId": "cat-taro",
    "name": "لاتية",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-143",
    "categoryId": "cat-taro",
    "name": "شوكلت",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-144",
    "categoryId": "cat-taro",
    "name": "فرولة",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-145",
    "categoryId": "cat-taro",
    "name": "بلو بيري",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-146",
    "categoryId": "cat-taro",
    "name": "ماتشا",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1558857563-b37cf0f18835?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-147",
    "categoryId": "cat-dessert",
    "name": "موس جلاكسي",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-148",
    "categoryId": "cat-dessert",
    "name": "موس كيندر",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-149",
    "categoryId": "cat-dessert",
    "name": "كيندر كيك",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-150",
    "categoryId": "cat-dessert",
    "name": "موس روشية",
    "price": 140,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-151",
    "categoryId": "cat-dessert",
    "name": "روشية فادج",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-152",
    "categoryId": "cat-dessert",
    "name": "نوتيلا كيك",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-153",
    "categoryId": "cat-dessert",
    "name": "فانتازيا",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-154",
    "categoryId": "cat-dessert",
    "name": "ميجا دور",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-155",
    "categoryId": "cat-dessert",
    "name": "شوكلت بستاشيو",
    "price": 140,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-156",
    "categoryId": "cat-dessert",
    "name": "نوتيلا دبي",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-157",
    "categoryId": "cat-dessert",
    "name": "كوكي باي",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-158",
    "categoryId": "cat-dessert",
    "name": "كاروت كيك",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-159",
    "categoryId": "cat-dessert",
    "name": "ريد فلفت",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-160",
    "categoryId": "cat-dessert",
    "name": "تشيز كيك",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-161",
    "categoryId": "cat-dessert",
    "name": "سان سباستيان",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-162",
    "categoryId": "cat-dessert",
    "name": "مولتن كيك",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-163",
    "categoryId": "cat-dessert",
    "name": "براونيز",
    "price": 70,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-164",
    "categoryId": "cat-dessert",
    "name": "اكلير",
    "price": 85,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-165",
    "categoryId": "cat-toast",
    "name": "ميكس تشيز",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-166",
    "categoryId": "cat-toast",
    "name": "بسطرمة",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-167",
    "categoryId": "cat-toast",
    "name": "سموك تركي",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-168",
    "categoryId": "cat-toast",
    "name": "سموك بيف",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-169",
    "categoryId": "cat-toast",
    "name": "كفيار رومي",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-170",
    "categoryId": "cat-croissant",
    "name": "ميكس تشيز",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-171",
    "categoryId": "cat-croissant",
    "name": "بسطرمة",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-172",
    "categoryId": "cat-croissant",
    "name": "سموك تركي",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-173",
    "categoryId": "cat-croissant",
    "name": "سموك بيف",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-174",
    "categoryId": "cat-croissant",
    "name": "ميكس شوكلت",
    "price": 130,
    "description": "",
    "image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-175",
    "categoryId": "cat-croissant",
    "name": "سادة",
    "price": 90,
    "description": "",
    "image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-176",
    "categoryId": "cat-cold-cuts",
    "name": "رستو رومي",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-177",
    "categoryId": "cat-cold-cuts",
    "name": "روز بيف",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-178",
    "categoryId": "cat-cold-cuts",
    "name": "سموك سالمون",
    "price": 220,
    "description": "",
    "image": "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-179",
    "categoryId": "cat-wraps",
    "name": "ميكس تشيز",
    "price": 100,
    "description": "",
    "image": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-180",
    "categoryId": "cat-wraps",
    "name": "بسطرمة",
    "price": 110,
    "description": "",
    "image": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-181",
    "categoryId": "cat-wraps",
    "name": "سموك تركي",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-182",
    "categoryId": "cat-wraps",
    "name": "سموك بيف",
    "price": 120,
    "description": "",
    "image": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-183",
    "categoryId": "cat-extras",
    "name": "فليفر",
    "price": 25,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-184",
    "categoryId": "cat-extras",
    "name": "مكسرات",
    "price": 30,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-185",
    "categoryId": "cat-extras",
    "name": "ايس كريم",
    "price": 25,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-186",
    "categoryId": "cat-extras",
    "name": "بوبا",
    "price": 30,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  },
  {
    "id": "m-187",
    "categoryId": "cat-extras",
    "name": "بذور الريحان",
    "price": 25,
    "description": "",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "available": true
  }
];

export const initialTables: TableInfo[] = Array.from({ length: 12 }, (_, i) => ({
  tableNumber: i + 1,
  name: `طاولة ${i + 1}`,
  capacity: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
  section: i < 4 ? 'الصالة الرئيسية' : i < 8 ? 'التراس الخارجي' : 'قسم العائلات VIP',
  status: 'available'
}));

export const initialCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'أحمد محمود',
    phone: '01012345678',
    notes: 'عميل مميز دائم - يفضل القهوة بدون سكر',
    lastTable: 1,
    totalOrders: 6,
    totalSpent: 850,
    lastVisit: new Date(Date.now() - 2 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    favoriteItemName: 'ايس اسبانش لاتيه',
    favoriteItemId: 'c-cold',
    favoriteOrderCount: 5,
    discountEligible: false,
    customDiscountRate: 0
  },
  {
    id: 'cust-2',
    name: 'سارة خالد',
    phone: '01123456789',
    notes: 'تفضل الجلوس في التراس الخارجي',
    lastTable: 4,
    totalOrders: 3,
    totalSpent: 420,
    lastVisit: new Date(Date.now() - 5 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    favoriteItemName: 'وافل لوتس بلجيكي',
    favoriteItemId: 'c-waffle',
    favoriteOrderCount: 3,
    discountEligible: false,
    customDiscountRate: 0
  }
];

export const initialBanners: Banner[] = [
  {
    id: 'b1',
    title: 'عرض الفطور الصباحي الراقي ☕🥐',
    subtitle: 'كرواسون طازج + كابتشينو إيطالي بخصم 20% طوال فترة الصباح',
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
    active: true,
    badgeText: 'عرض الصباح',
    mealTime: 'breakfast',
    scheduleEnabled: true,
    scheduleStartTime: '06:00',
    scheduleEndTime: '12:00',
    autoHideOutsideSchedule: true
  },
  {
    id: 'b2',
    title: 'مهرجان الحلويات والوافل البلجيكي 🧇',
    subtitle: 'اطلب 2 وافل نوتيلا أو لوتس واحصل على قهوة مجانية أو مشروب صودا منعش.',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80',
    active: true,
    badgeText: 'كومبو الأسبوع',
    mealTime: 'all',
    scheduleEnabled: false
  },
  {
    id: 'b3',
    title: 'عصائر وسموذي الفواكه الطازجة 🍓',
    subtitle: 'انتعاش طبيعي 100% بدون إضافات سكرية - تشكيلة عصائر الموسم المميزة.',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1200&q=80',
    active: true,
    badgeText: 'انتعاش الصيف',
    mealTime: 'lunch',
    scheduleEnabled: true,
    scheduleStartTime: '12:00',
    scheduleEndTime: '18:00',
    autoHideOutsideSchedule: true
  }
];

export const initialPopupAd: PopupAd = {
  id: 'p1',
  title: 'أهلاً بك في كافيهنا الراقي',
  content: 'استمتع بأجمل الأجواء وألذ المشروبات والوجبات. تصفح القائمة واطلب مباشرة من طاولتك.',
  image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
  active: true,
  buttonText: 'تصفح المنيو الآن'
};

export const initialReviews: CustomerReview[] = [];

export const initialSettings: SystemSettings = {
  systemName: 'Smart Café & Resto',
  systemNameEn: 'Smart Café & Resto',
  systemSubtitle: 'نظام المنيو الذكي للطاولات',
  systemSubtitleEn: 'Smart Table Menu System',
  logoUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=200&q=80',
  coverImageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1400&q=80',
  adminSoundVolume: 0.9,
  clientSoundVolume: 0.8,
  adminSoundType: 'chime',
  clientSoundType: 'bell',
  soundNotificationMode: 'all',
  billSoundEnabled: true,
  orderSoundEnabled: true,
  billSoundType: 'bill',
  qrTableEnforced: true,
  qrMode: 'per_table',
  bannerEnabled: true,
  popupAdEnabled: true,
  adminUsername: 'admin',
  adminPassword: 'admin123',
  adminPin: '1234',
  currencySymbol: 'ج.م',
  taxEnabled: true,
  taxRate: 14,
  loyaltyDiscountEnabled: false,
  loyaltyDiscountRate: 0,
  loyaltyMinOrders: 0,
  enableReviews: false,
  promptReviewAfterBill: false,
  reviewPromptTitle: 'شاركنا رأيك في تجربتك اليوم!',
  reviewPromptSubtitle: 'يسعدنا معرفة رأيك في الأطباق والخدمة بينما يقوم الويتر بتجهيز الشيك لك',
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
  customBrowserTitle: 'Smart Menu System - نظام المنيو الذكي',
  customFaviconUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=200&q=80',
  adminPageTitle: 'لوحة الإدارة والتحكم - Smart Café',
  adminFaviconUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=200&q=80',
  menuPageTitle: 'Smart Café & Resto - المنيو الإلكتروني',
  menuFaviconUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=200&q=80',
  defaultLanguage: 'ar',
  allowDirectTableSelection: true,
  allowTakeawayOrder: false,
  developerPassword: '1234',
  socialLinks: {
    enabled: true,
    whatsapp: '201000000000',
    instagram: 'https://instagram.com',
    facebook: 'https://facebook.com',
    tiktok: 'https://tiktok.com',
    snapchat: '',
    phone: '01000000000',
    locationUrl: 'https://maps.google.com',
    website: ''
  },
  developerRights: {
    enabled: true,
    developerName: 'محمود العفوري',
    developerTitle: 'مهندس برمجيات ومطور أنظمة ذكية سحابية',
    developerAvatar: '',
    developerBio: 'تطوير وتصميم الأنظمة السحابية المتقدمة ومنصات المنيو التفاعلية للمطاعم والكافيهات بأحدث التقنيات السريعة والمستقرة.',
    developerNote: 'متاح لتنفيذ المشاريع البرمجية المخصصة، وتطوير الأنظمة والتطبيقات السحابية الحديثة.',
    developerWhatsApp: '01000000000',
    developerPhone: '01000000000',
    developerWebsite: '',
    developerGithub: '',
    developerLinkedin: '',
    developerEmail: 'mahmoud.eliafory115@gmail.com',
    developerPassword: '1234',
    copyrightText: 'جميع الحقوق محفوظة © 2026 - تم التطوير بواسطة المهندس محمود العفوري'
  },
  themeSettings: {
    preset: 'classic-cafe',
    primaryColor: '#3D271D',
    accentColor: '#D4A373',
    backgroundColor: '#FAF7F2',
    cardBgColor: '#FFFFFF',
    textColor: '#2D1E18'
  }
};

export const initialSystemLogs: SystemLog[] = [];

export const initialCoupons: Coupon[] = [
  {
    id: 'coup-1',
    code: 'WELCOME10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 100,
    maxDiscountAmount: 50,
    active: true,
    usageCount: 12
  },
  {
    id: 'coup-2',
    code: 'SAVE20',
    discountType: 'fixed',
    discountValue: 20,
    minOrderAmount: 80,
    active: true,
    usageCount: 5
  }
];

export const initialOrders: Order[] = [];

// LocalStorage persistence helpers with custom events for cross-tab sync
class LocalStore {
  getStorage<T>(key: string, fallback: T): T {
    try {
      if (typeof window !== 'undefined' && (window as any).__INITIAL_DATA__ && (window as any).__INITIAL_DATA__[key] !== undefined && (window as any).__INITIAL_DATA__[key] !== null) {
        return (window as any).__INITIAL_DATA__[key];
      }
      const syncItem = localStorage.getItem(`smart_menu_sync_${key}`);
      if (syncItem) {
        const parsed = JSON.parse(syncItem);
        const raw = (parsed && parsed.data !== undefined) ? parsed.data : parsed;
        if (raw !== null && raw !== undefined) return raw;
      }
      const item = localStorage.getItem(`smart_menu_${key}`);
      if (!item) return fallback;
      const parsed = JSON.parse(item);
      if (parsed === null || parsed === undefined) return fallback;
      if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
      return parsed;
    } catch {
      return fallback;
    }
  }

  setStorage<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`smart_menu_${key}`, JSON.stringify(value));
      localStorage.setItem(`smart_menu_sync_${key}`, JSON.stringify({ data: value, senderId: 'local-store', t: Date.now() }));
      if (typeof window !== 'undefined') {
        if (!(window as any).__INITIAL_DATA__) (window as any).__INITIAL_DATA__ = {};
        (window as any).__INITIAL_DATA__[key] = value;
      }
      window.dispatchEvent(new CustomEvent('smart_menu_update', { detail: { key } }));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }
}

export const dbStore = new LocalStore();

// Getter and Setter APIs used across components (checks SSR bootstrap -> cache -> fallback)
export const getData = {
  categories: (): Category[] => dbStore.getStorage('categories', initialCategories),
  menuItems: (): MenuItem[] => dbStore.getStorage('menu_items', initialMenuItems),
  orders: (): Order[] => dbStore.getStorage('orders', initialOrders),
  tables: (): TableInfo[] => dbStore.getStorage('tables', initialTables),
  customers: (): Customer[] => dbStore.getStorage('customers', initialCustomers),
  banners: (): Banner[] => dbStore.getStorage('banners', initialBanners),
  popupAd: (): PopupAd => dbStore.getStorage('popup_ad', initialPopupAd),
  settings: (): SystemSettings => dbStore.getStorage('settings', initialSettings),
  systemLogs: (): SystemLog[] => dbStore.getStorage('system_logs', initialSystemLogs),
  coupons: (): Coupon[] => dbStore.getStorage('coupons', initialCoupons),
  reviews: (): CustomerReview[] => dbStore.getStorage('reviews', initialReviews),
};

export const saveData = {
  categories: (val: Category[]) => dbStore.setStorage('categories', val),
  menuItems: (val: MenuItem[]) => dbStore.setStorage('menu_items', val),
  orders: (val: Order[]) => dbStore.setStorage('orders', val),
  tables: (val: TableInfo[]) => dbStore.setStorage('tables', val),
  customers: (val: Customer[]) => dbStore.setStorage('customers', val),
  banners: (val: Banner[]) => dbStore.setStorage('banners', val),
  popupAd: (val: PopupAd) => dbStore.setStorage('popup_ad', val),
  settings: (val: SystemSettings) => dbStore.setStorage('settings', val),
  systemLogs: (val: SystemLog[]) => dbStore.setStorage('system_logs', val),
  coupons: (val: Coupon[]) => dbStore.setStorage('coupons', val),
  reviews: (val: CustomerReview[]) => dbStore.setStorage('reviews', val),
};

