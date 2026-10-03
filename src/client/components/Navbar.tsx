import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Calendar,
  Layers,
  Shield,
  User,
  LogOut,
  Sparkles,
  Menu,
  X,
  Compass,
  Radio,
  FileCheck,
  ChevronDown
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, profile, role, signInWithGoogle, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Title */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">KIIT University</span>
                <span className="font-extrabold text-slate-900 tracking-tight text-lg group-hover:text-emerald-700 transition-colors">
                  KBC <span className="font-light text-slate-500">Command Center</span>
                </span>
              </div>
            </Link>

            {/* Role Badge */}
            {profile && (
              <span className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                role === 'ADMIN'
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : role === 'LEAD'
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {role === 'ADMIN' && <Shield className="w-3 h-3 mr-1 inline" />}
                {role === 'LEAD' && <Sparkles className="w-3 h-3 mr-1 inline" />}
                {role}
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/events"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/events') ? 'text-emerald-700 bg-emerald-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Browse Events
            </Link>

            <Link
              to="/ongoing"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isActive('/ongoing') ? 'text-emerald-700 bg-emerald-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
              Live
            </Link>

            <Link
              to="/societies"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/societies') ? 'text-emerald-700 bg-emerald-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Societies
            </Link>

            <Link
              to="/calendar"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isActive('/calendar') ? 'text-emerald-700 bg-emerald-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Calendar
            </Link>

            {/* Lead Workspace Links */}
            {(role === 'LEAD' || role === 'ADMIN') && (
              <Link
                to="/lead"
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  location.pathname.startsWith('/lead') ? 'text-indigo-700 bg-indigo-50 border border-indigo-200' : 'text-indigo-600 hover:bg-indigo-50/50'
                }`}
              >
                <Layers className="w-4 h-4" />
                Lead Center
              </Link>
            )}

            {/* Admin Governance Links */}
            {role === 'ADMIN' && (
              <Link
                to="/admin"
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  location.pathname.startsWith('/admin') ? 'text-rose-700 bg-rose-50 border border-rose-200' : 'text-rose-600 hover:bg-rose-50/50'
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </Link>
            )}
          </nav>

          {/* User Controls */}
          <div className="flex items-center gap-3">
            {profile ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : 'K'}
                  </div>
                  <div className="hidden lg:block text-xs">
                    <p className="font-semibold text-slate-800 leading-tight">{profile.displayName}</p>
                    <p className="text-slate-500">{profile.rollNumber ? `Roll: ${profile.rollNumber}` : profile.role}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-900">{profile.displayName}</p>
                      <p className="text-xs text-slate-500 truncate">{profile.email}</p>
                      {profile.rollNumber && (
                        <p className="text-xs text-emerald-700 font-mono mt-1 font-semibold">Roll: {profile.rollNumber}</p>
                      )}
                      <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {profile.accommodationType} {profile.hostelName ? `(${profile.hostelName})` : ''}
                      </span>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      KIIT Identity & Profile
                    </Link>

                    <Link
                      to="/my-registrations"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <FileCheck className="w-4 h-4 text-slate-400" />
                      My Registrations
                    </Link>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        signOut();
                      }}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 border-t border-slate-100"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/admin/login"
                  className="hidden sm:inline-flex text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1"
                >
                  Admin Portal
                </Link>
                <button
                  onClick={signInWithGoogle}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm hover:shadow transition-all"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4 bg-white rounded-full p-0.5" />
                  KIIT Sign-In
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          <Link
            to="/events"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Browse Events
          </Link>
          <Link
            to="/ongoing"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Live Events
          </Link>
          <Link
            to="/societies"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Societies
          </Link>
          <Link
            to="/calendar"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Calendar
          </Link>
          {(role === 'LEAD' || role === 'ADMIN') && (
            <Link
              to="/lead"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-indigo-700 bg-indigo-50"
            >
              Lead Operations
            </Link>
          )}
          {role === 'ADMIN' && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-rose-700 bg-rose-50"
            >
              Admin Governance
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
