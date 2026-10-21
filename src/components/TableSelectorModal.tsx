import React from 'react';
import { TableInfo } from '../types';
import { QrCode, CheckCircle2 } from 'lucide-react';

interface TableSelectorModalProps {
  isOpen: boolean;
  tables: TableInfo[];
  onSelectTable: (tableNum: number) => void;
}

export const TableSelectorModal: React.FC<TableSelectorModalProps> = ({
  isOpen,
  tables,
  onSelectTable
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div 
        className="w-full max-w-lg bg-[#fdfaf3] rounded-3xl shadow-2xl overflow-hidden border border-[#e5d5bc] p-6 text-center space-y-6"
        style={{ backgroundColor: '#fdfaf3' }}
      >
        <div className="w-16 h-16 mx-auto rounded-full bg-[#eedec6] text-[#5c4731] flex items-center justify-center shadow-inner">
          <QrCode size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="font-bold text-2xl text-[#3d3020]">اختر رقم طاولتك للبدء</h2>
          <p className="text-sm text-[#6b563d]">
            يرجى تحديد الطاولة التي تجلس عليها لتتمكن من إرسال الطلبات وطلب الخدمة بسهولة.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto p-2">
          {tables.filter(t => Number(t.tableNumber) !== 0).map((table) => (
            <button
              key={table.tableNumber}
              onClick={() => onSelectTable(table.tableNumber)}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-[#ebdcc4] hover:bg-[#5c4731] hover:text-white text-[#3d3020] shadow-sm transition-all group"
            >
              <span className="text-xs text-[#8c6d48] group-hover:text-amber-200">طاولة</span>
              <span className="text-xl font-black mt-0.5">{table.tableNumber}</span>
              <span className={`text-[10px] mt-1 px-2 py-0.5 rounded-full ${
                table.status === 'busy' 
                  ? 'bg-amber-100 text-amber-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {table.status === 'busy' ? 'مشغولة' : 'متاحة'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
