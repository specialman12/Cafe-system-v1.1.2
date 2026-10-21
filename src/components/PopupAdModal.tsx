import React from 'react';
import { PopupAd } from '../types';
import { X, Sparkles } from 'lucide-react';

interface PopupAdModalProps {
  ad: PopupAd;
  isOpen: boolean;
  onClose: () => void;
}

export const PopupAdModal: React.FC<PopupAdModalProps> = ({ ad, isOpen, onClose }) => {
  if (!isOpen || !ad.active) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md bg-[#fdfaf3] rounded-3xl shadow-2xl overflow-hidden border border-[#e5d5bc] transform animate-in fade-in zoom-in duration-200"
        style={{ backgroundColor: '#fdfaf3' }}
      >
        <div className="relative h-48 w-full overflow-hidden">
          <img 
            src={ad.image} 
            alt={ad.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm bg-black/40 backdrop-blur-md px-3 py-1 rounded-full">
              <Sparkles size={16} />
              إعلان حصري
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/50 text-white hover:bg-black/70 flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 text-center space-y-4">
          <h3 className="font-bold text-xl text-[#3d3020]">{ad.title}</h3>
          <p className="text-sm text-[#6b563d] leading-relaxed">{ad.content}</p>
          
          <button 
            onClick={onClose}
            className="w-full py-3 px-6 rounded-2xl bg-[#5c4731] hover:bg-[#433323] text-white font-bold text-base shadow-lg transition-all"
          >
            {ad.buttonText || 'حسناً، فهمت'}
          </button>
        </div>
      </div>
    </div>
  );
};
