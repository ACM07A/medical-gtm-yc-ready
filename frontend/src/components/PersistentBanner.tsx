import React from 'react';
import { Sparkles } from 'lucide-react';

export function PersistentBanner() {
  return (
    <div className="bg-[#070F1A] text-slate-300 py-2 px-4 text-xs font-medium border-b border-teal-500/20 flex items-center justify-center gap-2.5 text-center">
      <span className="bg-[#0D9488] text-white px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-wider font-bold shrink-0 shadow-xs">
        PLATFORM
      </span>
      <span className="text-slate-300 text-xs max-w-4xl line-clamp-1 sm:line-clamp-none">
        Cross-border medical travel facilitation engine • Synthetic sandbox mode • No real patient records
      </span>
      <a href="#yc-application" className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono text-[#FF6600] hover:underline font-semibold shrink-0 ml-2">
        <span>YC Application Deck</span> →
      </a>
    </div>
  );
}
