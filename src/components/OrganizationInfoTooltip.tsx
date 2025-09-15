"use client";

import { useState } from 'react';
import { Info } from 'lucide-react';

export function OrganizationInfoTooltip() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative inline-block">
      <button 
        className="text-white/50 hover:text-white/80 transition-colors p-1 rounded-full"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Şirket/Kuruluş hakkında bilgi"
      >
        <Info size={14} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 w-72 p-4 mt-2 -left-4 transform -translate-x-1/2 glass rounded-xl border border-white/10 shadow-glow-sm">
          <h4 className="font-medium text-white mb-2">Şirket/Kuruluş Nedir?</h4>
          <p className="text-sm text-white/80 mb-3 leading-relaxed">
            Şirket/Kuruluş seçeneği, birden fazla şirket veya kuruluş için karbon emisyon verilerini ayrı ayrı yönetmenize olanak tanır.
          </p>
          <p className="text-sm text-white/80 leading-relaxed">
            Her şirket kendi projelerini, kayıtlarını ve raporlarını içerir. Farklı şirketler arasında geçiş yaparak verilerinizi organize edebilirsiniz.
          </p>
        </div>
      )}
    </div>
  );
}
