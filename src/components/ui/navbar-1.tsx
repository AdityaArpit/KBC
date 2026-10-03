"use client"

import * as React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, Radio, Shield, Sparkles, User, LogOut, FileCheck, Calendar } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "@/src/client/context/AuthContext.tsx"

export const Navbar1 = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { user, profile, role, signInWithGoogle, signOut } = useAuth()
  const location = useLocation()

  const toggleMenu = () => setIsOpen(!isOpen)
  const isActive = (path: string) => location.pathname === path
  const isAdminPath = location.pathname.startsWith('/admin')

  const navLinks = [
    { label: "Directory", path: "/events" },
    { label: "Live Now", path: "/ongoing", live: true },
    { label: "Societies", path: "/societies" },
    { label: "Calendar", path: "/calendar" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full pointer-events-none bg-[#0a0908]/85 backdrop-blur-md border-b border-[#a9927d]/15 py-3 px-4 flex justify-center transition-all duration-300">
      <div className="pointer-events-auto flex items-center justify-between px-6 py-2.5 rounded-full liquid-morphism w-full max-w-6xl relative z-10 transition-all duration-300">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <motion.div
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#49111c] to-[#a9927d] flex items-center justify-center text-[#f2f4f3] shadow-md border border-[#a9927d]/40"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              whileHover={{ rotate: 10, scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <Radio className="w-4 h-4 text-[#f2f4f3] animate-pulse" />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-widest text-[#a9927d] uppercase">KIIT Command</span>
              <span className="text-sm font-black text-[#f2f4f3] tracking-tight group-hover:text-[#a9927d] transition-colors">
                KBC <span className="font-light text-[#a9927d]/70">Operations</span>
              </span>
            </div>
          </Link>

          {/* Role Pill Badge */}
          {profile && (
            <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
              role === 'ADMIN'
                ? 'bg-[#49111c]/80 text-[#f2f4f3] border-[#a9927d]/50'
                : role === 'LEAD'
                ? 'bg-[#5e503f]/80 text-[#f2f4f3] border-[#a9927d]/40'
                : 'bg-[#0a0908]/80 text-[#a9927d] border-[#a9927d]/30'
            }`}>
              {role === 'ADMIN' && <Shield className="w-3 h-3 mr-1 inline text-rose-300" />}
              {role === 'LEAD' && <Sparkles className="w-3 h-3 mr-1 inline text-amber-300" />}
              {role}
            </span>
          )}
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map((item) => (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              whileHover={{ scale: 1.05 }}
            >
              <Link
                to={item.path}
                className={`text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-1.5 ${
                  isActive(item.path)
                    ? 'text-[#f2f4f3] border-b-2 border-[#a9927d] pb-0.5'
                    : 'text-[#a9927d] hover:text-[#f2f4f3]'
                }`}
              >
                {item.live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>}
                {item.label}
              </Link>
            </motion.div>
          ))}

          {/* Lead Center: ONLY shown if role is LEAD and NOT on admin login / panel */}
          {role === 'LEAD' && !isAdminPath && (
            <motion.div whileHover={{ scale: 1.05 }}>
              <Link
                to="/lead"
                className={`text-xs uppercase tracking-wider font-bold px-3 py-1 rounded-full transition-all border ${
                  location.pathname.startsWith('/lead')
                    ? 'bg-[#5e503f] text-[#f2f4f3] border-[#a9927d]'
                    : 'text-[#a9927d] border-[#5e503f]/50 hover:bg-[#5e503f]/30'
                }`}
              >
                Lead Centre
              </Link>
            </motion.div>
          )}

          {/* Admin Panel: Only shown if role is ADMIN */}
          {role === 'ADMIN' && (
            <motion.div whileHover={{ scale: 1.05 }}>
              <Link
                to="/admin"
                className={`text-xs uppercase tracking-wider font-bold px-3 py-1 rounded-full transition-all border ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-[#49111c] text-[#f2f4f3] border-[#a9927d]'
                    : 'text-[#f2f4f3] border-[#49111c] hover:bg-[#49111c]/40'
                }`}
              >
                Admin Panel
              </Link>
            </motion.div>
          )}
        </nav>

        {/* Right CTA / Auth controls */}
        <div className="hidden md:flex items-center gap-3">
          {profile ? (
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#0a0908]/70 border border-[#a9927d]/30 hover:border-[#a9927d] transition-all text-left"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#49111c] to-[#a9927d] text-white flex items-center justify-center font-bold text-[10px]">
                  {profile.displayName?.charAt(0).toUpperCase() || 'K'}
                </div>
                <div className="text-[11px] leading-tight">
                  <span className="font-bold text-[#f2f4f3] block truncate max-w-[100px]">{profile.displayName}</span>
                  <span className="text-[#a9927d] text-[9px] font-mono">
                    {profile.rollNumber ? `#${profile.rollNumber}` : profile.role}
                  </span>
                </div>
              </Link>

              <button
                onClick={signOut}
                title="Sign Out"
                className="p-1.5 rounded-full text-[#a9927d] hover:text-[#f2f4f3] hover:bg-[#49111c]/30 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/admin/login"
                className="text-[11px] text-[#a9927d] hover:text-[#f2f4f3] font-medium px-2 py-1"
              >
                Admin Access
              </Link>

              <motion.button
                onClick={signInWithGoogle}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center justify-center px-4 py-1.5 text-xs font-bold text-[#f2f4f3] bg-[#49111c] hover:bg-[#631726] border border-[#a9927d]/40 rounded-full shadow-lg transition-all cursor-pointer"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-3.5 h-3.5 mr-1.5 bg-white rounded-full p-0.5" />
                KIIT Sign-In
              </motion.button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <motion.button
          className="md:hidden flex items-center p-1.5 text-[#f2f4f3] cursor-pointer"
          onClick={toggleMenu}
          whileTap={{ scale: 0.9 }}
        >
          {isOpen ? <X className="h-5 w-5 text-[#f2f4f3]" /> : <Menu className="h-5 w-5 text-[#f2f4f3]" />}
        </motion.button>
      </div>

      {/* Mobile Menu Overlay with Liquid Morphism */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 liquid-morphism z-50 pt-24 px-6 md:hidden flex flex-col pointer-events-auto"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <motion.button
              className="absolute top-6 right-6 p-2 text-[#f2f4f3] cursor-pointer"
              onClick={toggleMenu}
              whileTap={{ scale: 0.9 }}
            >
              <X className="h-6 w-6 text-[#f2f4f3]" />
            </motion.button>

            <div className="flex flex-col space-y-6 pt-4">
              {navLinks.map((item, i) => (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 + 0.1 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <Link
                    to={item.path}
                    className="text-lg text-[#f2f4f3] font-semibold hover:text-[#a9927d] transition-colors"
                    onClick={toggleMenu}
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}

              {/* Lead Centre only if role is LEAD and not on admin path */}
              {role === 'LEAD' && !isAdminPath && (
                <Link
                  to="/lead"
                  onClick={toggleMenu}
                  className="text-lg text-[#a9927d] font-bold"
                >
                  Lead Command Centre
                </Link>
              )}

              {role === 'ADMIN' && (
                <Link
                  to="/admin"
                  onClick={toggleMenu}
                  className="text-lg text-rose-300 font-bold"
                >
                  Admin Governance Panel
                </Link>
              )}

              <div className="pt-6 border-t border-[#a9927d]/20">
                {profile ? (
                  <div className="space-y-4">
                    <div className="text-xs text-[#a9927d]">
                      Signed in as <strong className="text-[#f2f4f3]">{profile.displayName}</strong> ({profile.email})
                    </div>
                    <Link
                      to="/profile"
                      onClick={toggleMenu}
                      className="block w-full py-2.5 text-center bg-[#5e503f] text-[#f2f4f3] rounded-xl font-bold text-xs"
                    >
                      My Profile & Roll Number
                    </Link>
                    <button
                      onClick={() => { toggleMenu(); signOut(); }}
                      className="block w-full py-2.5 text-center bg-[#49111c] text-[#f2f4f3] rounded-xl font-bold text-xs cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={() => { toggleMenu(); signInWithGoogle(); }}
                      className="w-full py-3 bg-[#49111c] text-[#f2f4f3] rounded-xl font-bold text-sm shadow-lg cursor-pointer"
                    >
                      Sign In with KIIT Account
                    </button>
                    <Link
                      to="/admin/login"
                      onClick={toggleMenu}
                      className="block text-center text-xs text-[#a9927d] hover:text-[#f2f4f3]"
                    >
                      Administrator Login
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

export default Navbar1;
