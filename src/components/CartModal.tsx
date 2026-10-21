import React, { useState } from 'react';
import { CartItem } from '../types';
import { Trash2, Plus, Minus, ShoppingBag, Send, FileText, X } from 'lucide-react';
import { autoTranslateArabicToEnglish } from '../utils/translation';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (menuItemId: string, delta: number) => void;
  onRemoveItem: (menuItemId: string) => void;
  onUpdateNotes: (menuItemId: string, notes: string) => void;
  onSubmitOrder: () => void;
  onRequestBill: () => void;
  tableNumber: number | null;
  language?: 'ar' | 'en';
}

export const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateNotes,
  onSubmitOrder,
  onRequestBill,
  tableNumber,
  language = 'ar'
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [billRequestedLocal, setBillRequestedLocal] = useState(false);

  if (!isOpen) return null;

  const totalAmount = cart.reduce((sum, item) => sum + ((item.menuItem?.price || (item as any).price || 0) * (item.quantity || 1)), 0);

  const getItemName = (item?: { name?: string; nameEn?: string }) => {
    if (!item) return '';
    const name = item.name || '';
    if (language === 'en') {
      if (item.nameEn && item.nameEn.trim()) return item.nameEn.trim();
      return autoTranslateArabicToEnglish(name) || name;
    }
    return name;
  };

  const handleSend = () => {
    setSubmitting(true);
    setTimeout(() => {
      onSubmitOrder();
      setSubmitting(false);
      onClose();
    }, 600);
  };

  const handleBill = () => {
    onRequestBill();
    setBillRequestedLocal(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div 
        className="w-full sm:max-w-lg bg-[#fdfaf3] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-[#e5d5bc]"
        style={{ backgroundColor: '#fdfaf3' }}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#eedec6] border-b border-[#dfcfb4] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#8c6d48] text-white flex items-center justify-center shadow-md">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#3d3020]">سلة الطلبات</h3>
              <p className="text-xs text-[#6b563d]">
                {tableNumber ? `طاولة رقم ${tableNumber}` : 'يرجى تحديد الطاولة'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#e3d1b4] text-[#4a3924] hover:bg-[#d4c0a0] flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#eedec6] flex items-center justify-center text-[#8c6d48]">
                <ShoppingBag size={32} />
              </div>
              <p className="text-[#6b563d] font-medium text-lg">سلتك فارغة حالياً</p>
              <p className="text-xs text-[#8c6d48]">اختر ما تحب من المنيو لإضافته هنا</p>
            </div>
          ) : (
            cart.map((item, idx) => {
              const itemId = item.menuItem?.id || (item as any).id || `cart-${idx}`;
              const itemPrice = item.menuItem?.price || (item as any).price || 0;
              const itemQty = item.quantity || 1;
              return (
                <div 
                  key={itemId} 
                  className="bg-white rounded-2xl p-4 shadow-sm border border-[#f0e4d0] flex flex-col gap-3"
                >
                  <div className="flex items-center gap-4">
                    <img 
                      src={item.menuItem?.image || (item as any).image || ''} 
                      alt={getItemName(item.menuItem)} 
                      className="w-16 h-16 rounded-xl object-cover shadow-sm border border-[#eee]"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[#3d3020] text-base truncate">{getItemName(item.menuItem)}</h4>
                      <p className="text-[#8c6d48] font-bold text-sm mt-0.5">
                        {itemPrice * itemQty} ج.م
                      </p>
                    </div>
                    <button 
                      onClick={() => onRemoveItem(itemId)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="حذف الصنف"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Quantity & Notes */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 bg-[#fdfaf3] px-2 py-1 rounded-xl border border-[#eedec6]">
                      <button 
                        onClick={() => onUpdateQuantity(itemId, -1)}
                        className="w-7 h-7 rounded-lg bg-white text-[#3d3020] shadow-sm flex items-center justify-center hover:bg-[#eedec6] transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center font-bold text-sm text-[#3d3020]">{itemQty}</span>
                      <button 
                        onClick={() => onUpdateQuantity(itemId, 1)}
                        className="w-7 h-7 rounded-lg bg-white text-[#3d3020] shadow-sm flex items-center justify-center hover:bg-[#eedec6] transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <input 
                      type="text" 
                      placeholder="ملاحظات (بدون سكر، زيادة ثلج...)" 
                      value={item.notes || ''}
                      onChange={(e) => onUpdateNotes(itemId, e.target.value)}
                      className="text-xs bg-[#f9f5ec] border border-[#ebdcc4] rounded-xl px-3 py-1.5 w-1/2 focus:outline-none focus:ring-1 focus:ring-[#8c6d48]"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary & Actions */}
        {cart.length > 0 && (
          <div className="p-5 bg-[#f5ecdc] border-t border-[#ebdcc4] space-y-4">
            <div className="flex items-center justify-between text-base font-bold text-[#3d3020]">
              <span>إجمالي الطلب:</span>
              <span className="text-xl text-[#8c6d48]">{totalAmount} ج.م</span>
            </div>

            <div className={Number(tableNumber) === 0 ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"}>
              {Number(tableNumber) !== 0 && (
                <button
                  onClick={handleBill}
                  disabled={billRequestedLocal}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-sm shadow-sm transition-all ${
                    billRequestedLocal 
                      ? 'bg-green-600 text-white cursor-default' 
                      : 'bg-white text-[#5c4731] border border-[#d8c4a4] hover:bg-[#faf4ec]'
                  }`}
                >
                  <FileText size={18} />
                  {billRequestedLocal ? 'تم طلب الشيك ✓' : 'طلب الشيك وحساب'}
                </button>
              )}

              <button
                onClick={handleSend}
                disabled={submitting}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-sm text-white bg-[#5c4731] hover:bg-[#433323] shadow-lg transition-all w-full"
              >
                <Send size={18} />
                {submitting ? 'جاري الإرسال...' : 'إرسال الطلب للآدمن'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
