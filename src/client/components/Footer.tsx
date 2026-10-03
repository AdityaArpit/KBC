import React from 'react';
import { Link } from 'react-router-dom';
import { Radio, Shield, Sparkles, Building, Calendar, Layers } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0a0908] text-[#a9927d] border-t border-[#a9927d]/20 text-xs py-14 relative overflow-hidden">
      {/* Subtle background ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#49111c]/15 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Brand & Mission */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#49111c] to-[#a9927d] text-[#f2f4f3] flex items-center justify-center font-bold shadow-lg border border-[#a9927d]/40">
              <Radio className="w-5 h-5 text-[#f2f4f3] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-[#f2f4f3] text-base tracking-tight">KBC Event Command Center</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#49111c]/80 text-[#f2f4f3] border border-[#a9927d]/30 font-bold uppercase tracking-wider">
                  Ops v3.2
                </span>
              </div>
              <p className="text-xs text-[#a9927d]/90 mt-0.5">
                KIIT University Autonomous Student Society Orchestration & Nervous System
              </p>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="flex flex-wrap items-center gap-5 text-xs font-bold tracking-wider uppercase text-[#a9927d]">
            <Link to="/events" className="hover:text-[#f2f4f3] transition-colors">Directory</Link>
            <Link to="/ongoing" className="hover:text-[#f2f4f3] transition-colors flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
              Live Now
            </Link>
            <Link to="/societies" className="hover:text-[#f2f4f3] transition-colors">Societies</Link>
            <Link to="/calendar" className="hover:text-[#f2f4f3] transition-colors">Calendar</Link>
            <Link to="/lead" className="hover:text-[#f2f4f3] transition-colors">Lead Centre</Link>
            <Link to="/admin/login" className="text-rose-400/90 hover:text-rose-300 transition-colors">Admin Portal</Link>
          </div>
        </div>

        {/* Accreditation & Architectural Badges */}
        <div className="pt-8 border-t border-[#a9927d]/15 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-[#a9927d]/80">
          <p className="text-center md:text-left leading-relaxed">
            KIIT Deemed to be University &bull; Student Activity Centre (KSAC) &bull; Campus 6, Bhubaneswar, Odisha 751024
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141210] border border-[#a9927d]/25 text-[#f2f4f3]">
              <Shield className="w-3.5 h-3.5 text-rose-400" />
              Role-Governed ABAC
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141210] border border-[#a9927d]/25 text-[#f2f4f3]">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Bidirectional Notion Sync
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141210] border border-[#a9927d]/25 text-[#f2f4f3]">
              <Sparkles className="w-3.5 h-3.5 text-[#a9927d]" />
              Gemini Impact Engine
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
