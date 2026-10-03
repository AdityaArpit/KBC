import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { Shield, Lock, Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const success = await adminLogin(email, password);
      if (success) {
        navigate('/admin');
      } else {
        setError('Invalid administrator credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoAdmin = () => {
    setEmail('admin@kiit.ac.in');
    setPassword('AdminSecret2026!');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-white">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-400/30 flex items-center justify-center mx-auto shadow-inner">
            <Shield className="w-7 h-7" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400">
            Platform Governance Boundary
          </span>
          <h1 className="text-2xl font-black tracking-tight">Admin Authentication</h1>
          <p className="text-xs text-slate-400">
            Server-enforced administrative credentials. Never stored in Firestore or exposed to client.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Admin Identifier
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kiit.ac.in"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:ring-2 focus:ring-rose-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Admin Secret / Key
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:ring-2 focus:ring-rose-500 outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Authenticate Admin Session
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleFillDemoAdmin}
            className="text-slate-400 hover:text-rose-400 underline text-[11px]"
          >
            Auto-fill demo credentials
          </button>

          <Link to="/" className="text-slate-400 hover:text-white text-[11px]">
            Return to Campus Portal
          </Link>
        </div>
      </div>
    </div>
  );
};
