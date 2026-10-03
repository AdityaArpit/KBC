import React from 'react';
import { Link } from 'react-router-dom';
import { Radio, Shield, Sparkles, BookOpen } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 text-xs py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-white text-sm">KBC Event Command Center</span>
              <p className="text-[11px] text-slate-500">KBC-NOTION-03 Campus Event Operations & Nervous System</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400">
            <Link to="/events" className="hover:text-white transition-colors">Directory</Link>
            <Link to="/ongoing" className="hover:text-white transition-colors">Ongoing</Link>
            <Link to="/societies" className="hover:text-white transition-colors">Societies</Link>
            <Link to="/calendar" className="hover:text-white transition-colors">Calendar</Link>
            <Link to="/admin/login" className="hover:text-rose-400 transition-colors">Admin Gateway</Link>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>
            KIIT Deemed to be University &bull; Student Activity Centre (KSAC) &bull; Campus 6, Bhubaneswar, Odisha
          </p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-500" /> Firebase Security & ABAC
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Gemini Intelligence
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
