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
    <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4 text-[#f2f4f3]">
      <div className="max-w-md w-full bg-[#0a0908] border border-[#a9927d]/30 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#49111c] text-[#f2f4f3] border border-[#a9927d]/40 flex items-center justify-center mx-auto shadow-inner">
            <Shield className="w-7 h-7 text-[#a9927d]" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#a9927d]">
            Platform Governance Boundary
          </span>
          <h1 className="text-2xl font-black tracking-tight text-[#f2f4f3]">Admin Authentication</h1>
          <p className="text-xs text-[#a9927d]">
            Server-enforced administrative credentials. Never stored in Firestore or exposed to client.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-[#49111c]/60 border border-rose-500/50 text-rose-200 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#a9927d] mb-1">
              Admin Identifier
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#a9927d] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kiit.ac.in"
                className="w-full pl-9 pr-3 py-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs font-mono text-[#f2f4f3] focus:border-[#a9927d] outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#a9927d] mb-1">
              Admin Secret / Key
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#a9927d] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs font-mono text-[#f2f4f3] focus:border-[#a9927d] outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#49111c] hover:bg-[#631726] disabled:opacity-50 text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4 text-[#a9927d]" />}
            Authenticate Admin Session
          </button>
        </form>

        <div className="pt-2 border-t border-[#a9927d]/20 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleFillDemoAdmin}
            className="text-[#a9927d] hover:text-[#f2f4f3] underline text-[11px] cursor-pointer"
          >
            Auto-fill demo credentials
          </button>

          <Link to="/" className="text-[#a9927d] hover:text-[#f2f4f3] text-[11px]">
            Return to Campus Portal
          </Link>
        </div>
      </div>
    </div>
  );
};
