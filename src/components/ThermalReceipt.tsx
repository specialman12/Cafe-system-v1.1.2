import React from 'react';
import { Order, TableInfo, SystemSettings, Coupon } from '../types';

interface ThermalReceiptProps {
  type: 'order' | 'table-bill' | 'qr-stands';
  order?: Order | null;
  tableBill?: {
    tableNumber: number;
    orders: Order[];
    items?: Array<{ name: string; nameEn?: string; quantity: number; price: number }>;
    subtotal: number;
    tax?: number;
    discount?: number;
    total: number;
    customerName?: string;
    customerPhone?: string;
    settledAt?: string;
  } | null;
  qrStands?: TableInfo[] | null;
  settings: SystemSettings;
  currency?: string;
  onClose?: () => void;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  type,
  order,
  tableBill,
  qrStands,
  settings,
  currency = 'ج.م'
}) => {
  const systemName = settings.systemName || 'Smart Café & Restaurant';
  const systemNameEn = settings.systemNameEn;
  const isTaxActive = settings.taxEnabled !== false && (settings.taxRate ?? 0) > 0;
  const taxRate = isTaxActive ? (settings.taxRate ?? 0) : 0;

  if (type === 'order' && order) {
    const orderDate = new Date(order.createdAt || Date.now());
    const orderDateStr = orderDate.toLocaleDateString('ar-EG');
    const orderTimeStr = orderDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const subtotal = order.items.reduce((sum, it) => sum + ((it.menuItem?.price || (it as any).price || 0) * (it.quantity || 1)), 0);
    const taxAmount = taxRate > 0 ? Math.round((subtotal * taxRate) / 100) : 0;

    return (
      <div className="thermal-receipt-printable hidden print:block">
        <div className="thermal-receipt">
          {/* Header */}
          <div className="text-center">
            {settings.logoUrl && (
              <img 
                src={settings.logoUrl} 
                alt="Logo" 
                className="w-12 h-12 object-contain mx-auto mb-1 filter grayscale contrast-200" 
              />
            )}
            <h1 className="thermal-title">{systemName}</h1>
            {systemNameEn && <p className="thermal-subtitle">{systemNameEn}</p>}
            <p className="font-bold text-xs mt-1">🧾 فاتورة طلب - صالة</p>
          </div>

          <div className="thermal-divider-double" />

          {/* Meta Info */}
          <div className="space-y-0.5 text-[11px] font-bold">
            <div className="flex justify-between">
              <span>رقم الطلب: #{order.id.slice(-5)}</span>
              <span>طاولة: ({order.tableNumber})</span>
            </div>
            <div className="flex justify-between">
              <span>التاريخ: {orderDateStr}</span>
              <span>الوقت: {orderTimeStr}</span>
            </div>
            {(order.customerName || order.customerPhone) && (
              <div className="flex justify-between">
                <span>العميل: {order.customerName || 'عميل'}</span>
                {order.customerPhone && <span>{order.customerPhone}</span>}
              </div>
            )}
            <div className="flex justify-between">
              <span>طريقة الدفع:</span>
              <span>{order.paymentMethod === 'card' ? 'بطاقة / فيزا' : 'نقداً (كاش)'}</span>
            </div>
          </div>

          <div className="thermal-divider" />

          {/* Items Table */}
          <table className="thermal-table">
            <thead>
              <tr>
                <th className="text-right">الصنف</th>
                <th className="text-center w-12">الكمية</th>
                <th className="text-left w-16">السعر</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((ci, idx) => {
                const name = ci?.menuItem?.name || (ci as any)?.name || 'صنف';
                const nameEn = ci?.menuItem?.nameEn || (ci as any)?.nameEn || '';
                const price = ci?.menuItem?.price ?? (ci as any)?.price ?? 0;
                const quantity = ci?.quantity || 1;

                return (
                  <tr key={idx}>
                    <td className="text-right py-1">
                      <span className="font-bold">{name}</span>
                      {nameEn && (
                        <span className="block text-[9px] text-stone-700">{nameEn}</span>
                      )}
                    </td>
                    <td className="text-center font-bold py-1">×{quantity}</td>
                    <td className="text-left font-bold py-1">{price * quantity} {currency}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="thermal-divider" />

          {/* Financial Breakdown */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>المجموع الفرعي:</span>
              <span className="font-bold">{subtotal} {currency}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between">
                <span>ضريبة القيمة المضافة ({taxRate}%):</span>
                <span>{taxAmount} {currency}</span>
              </div>
            )}
            {order.discountAmount && order.discountAmount > 0 ? (
              <div className="flex justify-between">
                <span>الخصم (كوبون):</span>
                <span className="font-bold">-{order.discountAmount} {currency}</span>
              </div>
            ) : null}
            <div className="thermal-divider-double" />
            <div className="flex justify-between thermal-total text-base">
              <span>الإجمالي الكلي:</span>
              <span className="font-black">{order.total} {currency}</span>
            </div>
          </div>

          {order.notes && (
            <>
              <div className="thermal-divider" />
              <div className="text-[10px] font-bold">
                <span>ملاحظات الزبون: </span>
                <span>{order.notes}</span>
              </div>
            </>
          )}

          <div className="thermal-divider-double" />

          {/* Footer */}
          <div className="text-center text-[10px] space-y-0.5 mt-2">
            <p className="font-bold">شكراً لزيارتكم ونسعد بخدمتكم دائماً!</p>
            <p className="text-[9px]">{systemName} &bull; نظام المنيو الذكي للطاولات</p>
            {settings.socialLinks?.phone && (
              <p className="text-[9px]">للحجز والاستفسار: {settings.socialLinks.phone}</p>
            )}
            <div className="mt-2 text-center text-[8px] tracking-widest font-mono">
              *** {order.id.toUpperCase()} ***
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'table-bill' && tableBill) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG');
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    return (
      <div className="thermal-receipt-printable hidden print:block">
        <div className="thermal-receipt">
          {/* Header */}
          <div className="text-center">
            {settings.logoUrl && (
              <img 
                src={settings.logoUrl} 
                alt="Logo" 
                className="w-12 h-12 object-contain mx-auto mb-1 filter grayscale contrast-200" 
              />
            )}
            <h1 className="thermal-title">{systemName}</h1>
            {systemNameEn && <p className="thermal-subtitle">{systemNameEn}</p>}
            <p className="font-bold text-xs mt-1">🧾 كشف حساب وإغلاق طاولة</p>
          </div>

          <div className="thermal-divider-double" />

          {/* Meta Info */}
          <div className="space-y-0.5 text-[11px] font-bold">
            <div className="flex justify-between">
              <span className="text-sm font-black">
                طاولة رقم: ({tableBill.tableNumber})
              </span>
              <span>عدد الطلبات: {tableBill.orders.length}</span>
            </div>
            <div className="flex justify-between">
              <span>التاريخ: {dateStr}</span>
              <span>الوقت: {timeStr}</span>
            </div>
            {(tableBill.customerName || tableBill.customerPhone) && (
              <div className="flex justify-between">
                <span>العميل: {tableBill.customerName || 'عميل'}</span>
                {tableBill.customerPhone && <span>{tableBill.customerPhone}</span>}
              </div>
            )}
          </div>

          <div className="thermal-divider" />

          {/* Items breakdown */}
          {tableBill.items && tableBill.items.length > 0 ? (
            <table className="thermal-table">
              <thead>
                <tr>
                  <th className="text-right">الصنف</th>
                  <th className="text-center w-12">الكمية</th>
                  <th className="text-left w-16">السعر</th>
                </tr>
              </thead>
              <tbody>
                {tableBill.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="text-right py-1">
                      <span className="font-bold">{it.name}</span>
                      {it.nameEn && <span className="block text-[9px] text-stone-700">{it.nameEn}</span>}
                    </td>
                    <td className="text-center font-bold py-1">×{it.quantity}</td>
                    <td className="text-left font-bold py-1">{it.price * it.quantity} {currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="thermal-table">
              <thead>
                <tr>
                  <th className="text-right">رقم الطلب</th>
                  <th className="text-center">الأصناف</th>
                  <th className="text-left">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {tableBill.orders.map((ord) => (
                  <tr key={ord.id}>
                    <td className="py-1 font-bold">#{ord.id.slice(-4)}</td>
                    <td className="text-center py-1">{ord.items.length} أصناف</td>
                    <td className="text-left font-bold py-1">{ord.total} {currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="thermal-divider" />

          {/* Financials */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>المجموع الفرعي:</span>
              <span className="font-bold">{tableBill.subtotal} {currency}</span>
            </div>
            {tableBill.tax !== undefined && tableBill.tax > 0 && (
              <div className="flex justify-between">
                <span>ضريبة القيمة المضافة:</span>
                <span>{tableBill.tax} {currency}</span>
              </div>
            )}
            {tableBill.discount !== undefined && tableBill.discount > 0 && (
              <div className="flex justify-between font-bold">
                <span>الخصم المطبق:</span>
                <span>-{tableBill.discount} {currency}</span>
              </div>
            )}
            <div className="thermal-divider-double" />
            <div className="flex justify-between thermal-total text-base">
              <span>المجموع النهائي المستحق:</span>
              <span className="font-black">{tableBill.total} {currency}</span>
            </div>
          </div>

          <div className="thermal-divider-double" />

          {/* Footer */}
          <div className="text-center text-[10px] space-y-0.5 mt-2">
            <p className="font-bold">تمت تسوية حساب الطاولة وإغلاق الجلسة</p>
            <p className="text-[9px]">شكراً لزيارتكم ونتمنى لكم يوماً سعيداً!</p>
            <p className="text-[9px]">{systemName}</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
