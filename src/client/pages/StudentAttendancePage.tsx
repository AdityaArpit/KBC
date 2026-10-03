import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { QrCode, CheckCircle2, AlertCircle, Loader2, User, ArrowRight, Calendar, MapPin, Building } from 'lucide-react';
import { CampusEvent } from '../../shared/types.ts';

export const StudentAttendancePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const paramEventId = searchParams.get('eventId');
  const paramSessionId = searchParams.get('sessionId');

  const { profile, signInWithGoogle } = useAuth();
  const [event, setEvent] = useState<CampusEvent | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(paramSessionId);
  const [sessionName, setSessionName] = useState<string>('Live Session Check-In');
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAttendanceContext() {
      setLoading(true);
      setError(null);
      try {
        // Priority 1: Universal token lookup
        if (token) {
          const lookupRes = await fetch(`/api/v1/attendance/lookup/${encodeURIComponent(token)}`);
          if (lookupRes.ok) {
            const data = await lookupRes.json();
            setEvent(data.event);
            setSessionId(data.session.id);
            setSessionName(data.session.name);
            setLoading(false);
            return;
          }
        }

        // Priority 2: Query param fallback
        if (paramEventId) {
          const res = await fetch(`/api/v1/events/${paramEventId}`);
          if (res.ok) {
            const data = await res.json();
            setEvent(data.event);
            if (paramSessionId) setSessionId(paramSessionId);
          }
        }
      } catch (err: any) {
        console.error('Failed to resolve attendance context:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAttendanceContext();
  }, [token, paramEventId, paramSessionId]);

  const handleMarkAttendance = async () => {
    if (!profile || !event?.id || !sessionId) {
      setError('Unable to verify attendance session parameters. Please rescan the QR code.');
      return;
    }

    try {
      setMarking(true);
      setError(null);

      const res = await fetch(`/api/v1/events/${event.id}/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          token,
          uid: profile.uid,
          email: profile.email,
          emailVerified: profile.emailVerified,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to mark attendance');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#0a0908] border border-[#a9927d]/30 rounded-3xl overflow-hidden shadow-2xl space-y-6 text-center text-[#f2f4f3]">
        
        {/* Event Header Banner if available */}
        {event?.posterPath && (
          <div className="w-full h-36 relative overflow-hidden bg-black border-b border-[#a9927d]/20">
            <img src={event.posterPath} alt={event.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0908] via-transparent to-transparent opacity-90" />
            <div className="absolute bottom-2 left-4 text-left">
              <span className="text-[10px] uppercase font-bold text-[#a9927d] bg-[#0a0908]/90 px-2 py-0.5 rounded border border-[#a9927d]/30">
                {event.societyName}
              </span>
              <h3 className="font-bold text-sm text-[#f2f4f3] truncate">{event.name}</h3>
            </div>
          </div>
        )}

        <div className="p-6 pt-0 space-y-5">
          {!event?.posterPath && (
            <div className="w-16 h-16 rounded-2xl bg-[#49111c] text-[#a9927d] border border-[#a9927d]/30 flex items-center justify-center mx-auto shadow-inner mt-6">
              <QrCode className="w-8 h-8" />
            </div>
          )}

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#a9927d] bg-[#49111c]/60 px-3 py-1 rounded-full border border-[#a9927d]/30">
              KIIT Official Gate Ingress
            </span>
            <h1 className="text-2xl font-black text-[#f2f4f3] tracking-tight pt-2">Attendance Check-In</h1>
            <p className="text-xs text-[#a9927d] font-semibold">{sessionName}</p>
            <p className="text-[11px] text-[#a9927d]/80">Presence recorded directly to immutable campus event ledger</p>
          </div>

          {loading && (
            <div className="py-6 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#a9927d]" />
              <p className="text-xs text-[#a9927d]">Connecting to university session ledger...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-[#49111c]/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
              </div>
              <h2 className="text-lg font-bold text-[#f2f4f3]">Verified Attendance Logged!</h2>
              <div className="p-4 rounded-2xl bg-[#49111c]/30 border border-[#a9927d]/30 text-xs text-left space-y-1 font-mono">
                <p className="text-[#a9927d] font-sans text-[10px] uppercase font-bold">Digital Pass Confirmation</p>
                <p className="text-[#f2f4f3] font-bold">{profile?.displayName}</p>
                <p className="text-[#a9927d]">Roll: <strong className="text-[#f2f4f3]">{profile?.rollNumber || 'Verified KIIT'}</strong></p>
                <p className="text-[#a9927d]">Recorded: {new Date().toLocaleTimeString()}</p>
              </div>
              <div className="pt-2">
                <Link
                  to="/events"
                  className="inline-block px-5 py-2.5 bg-[#49111c] hover:bg-[#631726] border border-[#a9927d]/40 text-[#f2f4f3] rounded-xl text-xs font-bold shadow"
                >
                  Return to Campus Portal
                </Link>
              </div>
            </div>
          ) : !profile ? (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-[#a9927d]">
                Authentication required: You must sign in with your official @kiit.ac.in Google account to verify attendance.
              </p>
              <button
                onClick={signInWithGoogle}
                className="w-full py-3 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4 bg-white rounded-full p-0.5" />
                Sign In with KIIT Google Account
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-[#0a0908] rounded-2xl border border-[#a9927d]/30 text-left text-xs space-y-1 font-mono">
                <p className="text-[#a9927d] font-sans text-[10px] font-bold uppercase">Verified KIIT Student Identity:</p>
                <p className="font-bold text-[#f2f4f3] text-sm">{profile.displayName}</p>
                <p className="text-[#a9927d]">{profile.email}</p>
                <p className="text-[#f2f4f3] font-bold">Roll Number: {profile.rollNumber || 'N/A'}</p>
                <p className="text-[#a9927d] text-[11px]">Accommodation: {profile.accommodationType} {profile.hostelName ? `(${profile.hostelName})` : ''}</p>
              </div>

              <button
                onClick={handleMarkAttendance}
                disabled={marking}
                className="w-full py-3.5 bg-[#49111c] hover:bg-[#631726] disabled:opacity-50 text-[#f2f4f3] border border-[#a9927d]/40 rounded-2xl text-xs font-black shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all uppercase tracking-wider"
              >
                {marking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#a9927d]" />
                    Logging Attendance...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#a9927d]" />
                    Confirm My Attendance
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
