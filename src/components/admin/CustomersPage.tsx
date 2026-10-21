import React, { useState } from 'react';
import { Customer, SystemSettings } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { autoTranslateCustomerName } from '../../utils/translation';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  MessageCircle, 
  Trash2, 
  Edit3, 
  DollarSign, 
  ShoppingBag, 
  Calendar, 
  Download, 
  UserCheck, 
  Check, 
  X,
  Star,
  Sparkles
} from 'lucide-react';

interface CustomersPageProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  currencySymbol?: string;
  settings?: SystemSettings;
  setSettings?: React.Dispatch<React.SetStateAction<SystemSettings>>;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  customers = [],
  setCustomers,
  currencySymbol = 'ج.م',
  settings,
  setSettings
}) => {
  const { isEn } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'spent' | 'orders' | 'recent'>('recent');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // New customer form state
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  // Stats calculation
  const totalCustomers = customers.length;
  const returningCustomers = customers.filter(c => c.totalOrders > 1).length;
  const totalSpend = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
  const avgSpend = totalCustomers > 0 ? Math.round(totalSpend / totalCustomers) : 0;

  // Filter & sort
  const filteredCustomers = customers
    .filter(c => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'spent') return (b.totalSpent || 0) - (a.totalSpent || 0);
      if (sortBy === 'orders') return (b.totalOrders || 0) - (a.totalOrders || 0);
      return new Date(b.lastVisit || 0).getTime() - new Date(a.lastVisit || 0).getTime();
    });

  // Add Customer
  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: nameInput.trim(),
      phone: phoneInput.trim(),
      notes: notesInput.trim(),
      customDiscountRate: 0,
      discountEligible: false,
      totalOrders: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
      lastVisit: new Date().toISOString()
    };

    setCustomers(prev => [newCust, ...prev]);
    setNameInput('');
    setPhoneInput('');
    setNotesInput('');
    setShowAddModal(false);
  };

  // Edit Customer
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? editingCustomer : c));
    setEditingCustomer(null);
  };

  // Delete Customer
  const handleDeleteCustomer = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا العميل من السجل؟')) {
      setCustomers(prev => prev.filter(c => c.id !== id));
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (customers.length === 0) {
      alert('لا توجد بيانات عملاء للتصدير.');
      return;
    }

    const headers = ['الاسم', 'رقم الهاتف', 'عدد الطلبات', 'إجمالي الإنفاق', 'آخر طاولة', 'تاريخ آخر زيارة', 'ملاحظات'];
    const rows = customers.map(c => [
      `"${c.name}"`,
      `"${c.phone || ''}"`,
      c.totalOrders,
      c.totalSpent,
      c.lastTable || '',
      c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('ar-EG') : '',
      `"${c.notes || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customers-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8" style={{ direction: 'rtl' }}>
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E5D5BC] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#eedec6] text-[#3D271D] flex items-center justify-center font-bold flex-shrink-0">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#2D1E18]">بيانات وسجل العملاء (CRM)</h2>
            <p className="text-xs text-stone-500">حفظ ومتابعة بيانات الزبائن، أرقام التواصل، تكرار الزيارات، وبرامج الولاء</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all border border-stone-200 shadow-xs"
          >
            <Download size={14} />
            <span>تصدير Excel/CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-[#3D271D] hover:bg-[#2A1D15] text-white px-5 py-2.5 rounded-2xl font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Plus size={16} />
            <span>إضافة عميل جديد</span>
          </button>
        </div>
      </div>

      {/* Quick VIP Customer Banner Control */}
      {settings && setSettings && (
        <div className="bg-gradient-to-r from-amber-50/90 via-[#FFFDF5] to-orange-50/90 p-5 rounded-3xl border border-amber-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
              <Star size={22} className="fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-black text-sm text-[#2D1E18]">بنر ترحيب العميل المميز في المنيو (VIP Welcome Banner)</h4>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                  settings.showVipCustomerBanner !== false 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-stone-100 text-stone-600 border border-stone-300'
                }`}>
                  {settings.showVipCustomerBanner !== false ? 'مفعّل حالياً ويظهر للعملاء' : 'معطّل ومخفي من المنيو'}
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                إظهار بطاقة الترحيب الفاخرة للعملاء العائدين بأعلى المنيو وبسلة الطلب: (أهلاً بك مجدداً، فلان! 🌟 عميل مميز وتذكير بمشروبه المفضل)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
            <span className="text-xs font-black text-stone-700">
              {settings.showVipCustomerBanner !== false ? 'تشغيل' : 'إيقاف'}
            </span>
            <button
              type="button"
              onClick={() => setSettings(prev => ({ ...prev, showVipCustomerBanner: !(prev.showVipCustomerBanner !== false) }))}
              className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out relative flex items-center cursor-pointer ${
                settings.showVipCustomerBanner !== false ? 'bg-emerald-600 justify-end' : 'bg-stone-300 justify-start'
              }`}
              title={settings.showVipCustomerBanner !== false ? 'اضغط لتعطيل البنر' : 'اضغط لتفعيل البنر'}
            >
              <span className="w-6 h-6 rounded-full bg-white shadow-md block transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Customers */}
        <div className="bg-white p-5 rounded-3xl border border-[#E5D5BC] shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center flex-shrink-0">
            <Users size={20} />
          </div>
          <div>
            <span className="text-xs text-stone-500 block font-medium">إجمالي العملاء</span>
            <span className="text-xl font-black text-[#2D1E18]">{totalCustomers}</span>
          </div>
        </div>

        {/* Loyal Customers */}
        <div className="bg-white p-5 rounded-3xl border border-[#E5D5BC] shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center flex-shrink-0">
            <UserCheck size={20} />
          </div>
          <div>
            <span className="text-xs text-stone-500 block font-medium">عملاء متكررين (ولاء)</span>
            <span className="text-xl font-black text-emerald-700">{returningCustomers}</span>
          </div>
        </div>

        {/* Total Spent */}
        <div className="bg-white p-5 rounded-3xl border border-[#E5D5BC] shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-800 flex items-center justify-center flex-shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <span className="text-xs text-stone-500 block font-medium">إجمالي المشتريات</span>
            <span className="text-xl font-black text-[#2D1E18]">{totalSpend.toLocaleString()} {currencySymbol}</span>
          </div>
        </div>

        {/* Average Spend */}
        <div className="bg-white p-5 rounded-3xl border border-[#E5D5BC] shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-800 flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={20} />
          </div>
          <div>
            <span className="text-xs text-stone-500 block font-medium">متوسط إنفاق العميل</span>
            <span className="text-xl font-black text-[#2D1E18]">{avgSpend} {currencySymbol}</span>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#E5D5BC] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
          />
          <Search size={15} className="absolute right-3 top-3 text-stone-400" />
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <span className="text-xs text-stone-500 font-bold">ترتيب حسب:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'spent' | 'orders' | 'recent')}
            className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
          >
            <option value="recent">أحدث زيارة</option>
            <option value="spent">الأكثر إنفاقاً</option>
            <option value="orders">الأكثر طلباً</option>
          </select>
        </div>
      </div>

      {/* Customers Cards / Table */}
      <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 className="font-black text-base text-[#2D1E18]">
            سجل العملاء ({filteredCustomers.length})
          </h3>
          <span className="text-xs text-stone-500">
            يتم حفظ بيانات العملاء تلقائياً عند طلبهم من المنيو
          </span>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="text-center py-14 border-2 border-dashed border-stone-200 rounded-3xl">
            <Users size={40} className="mx-auto text-stone-300 mb-2" />
            <p className="font-bold text-sm text-stone-600">لم يتم العثور على عملاء مطابقين</p>
            <p className="text-xs text-stone-400 mt-1">تأكد من كتابة الاسم أو رقم الهاتف بدقة، أو قم بإضافة عميل جديد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-700 border-b border-stone-200">
                  <th className="py-3 px-4 rounded-r-2xl">العميل</th>
                  <th className="py-3 px-3">رقم الهاتف</th>
                  <th className="py-3 px-3 text-center">الطلبات</th>
                  <th className="py-3 px-3">إجمالي الإنفاق</th>
                  <th className="py-3 px-3">آخر طاولة</th>
                  <th className="py-3 px-3">آخر زيارة</th>
                  <th className="py-3 px-4 text-center rounded-l-2xl">إجراءات التواصل والتحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredCustomers.map(customer => {
                  const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, '') : '';
                  const isVIP = customer.totalOrders >= 5 || customer.totalSpent > 500;
                  const displayName = autoTranslateCustomerName(customer.name, isEn);

                  return (
                    <tr key={customer.id} className="hover:bg-amber-50/40 transition-colors">
                      {/* Name & Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#eedec6] text-[#3D271D] flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {displayName.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-stone-800 text-sm">{displayName}</span>
                              {isVIP && (
                                <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-amber-200">
                                  <Star size={10} className="fill-amber-500 text-amber-500" />
                                  <span>VIP</span>
                                </span>
                              )}
                            </div>
                            {customer.notes && (
                              <p className="text-[10px] text-stone-500 line-clamp-1">{customer.notes}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-3">
                        {customer.phone ? (
                          <span className="font-mono text-stone-700 font-bold">{customer.phone}</span>
                        ) : (
                          <span className="text-stone-400">غير مسجل</span>
                        )}
                      </td>

                      {/* Orders Count */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-block bg-stone-100 text-stone-800 font-black px-2.5 py-1 rounded-xl">
                          {customer.totalOrders}
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="py-3.5 px-3 font-bold text-[#3D271D]">
                        {customer.totalSpent.toLocaleString()} {currencySymbol}
                      </td>

                      {/* Last Table */}
                      <td className="py-3.5 px-3">
                        {customer.lastTable ? (
                          <span className="bg-amber-50 text-amber-900 border border-amber-200 font-bold px-2 py-0.5 rounded-md text-[11px]">
                            طاولة {customer.lastTable}
                          </span>
                        ) : (
                          <span className="text-stone-400">-</span>
                        )}
                      </td>

                      {/* Last Visit */}
                      <td className="py-3.5 px-3 text-stone-500 text-[11px]">
                        {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString('ar-EG') : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {cleanPhone && (
                            <>
                              <a
                                href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`أهلاً بك يا ${customer.name} في ${'كافيه ومطعم'}! يسعدنا تقديم أفضل الخدمات لك دائماً.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition-colors border border-emerald-200"
                                title="مراسلة واتساب"
                              >
                                <MessageCircle size={14} />
                              </a>

                              <a
                                href={`tel:${cleanPhone}`}
                                className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center justify-center transition-colors border border-blue-200"
                                title="اتصال هاتفي"
                              >
                                <Phone size={14} />
                              </a>
                            </>
                          )}

                          <button
                            onClick={() => setEditingCustomer(customer)}
                            className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 flex items-center justify-center transition-colors"
                            title="تعديل الملاحظات"
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            onClick={() => handleDeleteCustomer(customer.id)}
                            className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors border border-rose-200"
                            title="حذف العميل"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Customer */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-[#E5D5BC] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-lg text-[#2D1E18]">إضافة عميل جديد لسجل المكان</h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-stone-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">اسم العميل الكريم</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد مصطفى"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">رقم الهاتف / الواتساب</label>
                <input
                  type="tel"
                  placeholder="01012345678"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">ملاحظات / تفضيلات العميل</label>
                <textarea
                  rows={2}
                  placeholder="مثال: يفضل قهوة بدون سكر، عميل VIP..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-bold shadow"
                >
                  حفظ العميل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Customer */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-[#E5D5BC] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-lg text-[#2D1E18]">تعديل بيانات العميل</h3>
              <button onClick={() => setEditingCustomer(null)} className="text-stone-400 hover:text-stone-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">اسم العميل</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  value={editingCustomer.phone || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">ملاحظات</label>
                <textarea
                  rows={3}
                  value={editingCustomer.notes || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#3D271D] text-white text-xs font-bold shadow"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
