import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { QrCode, CheckCircle2, AlertCircle, Loader2, User, ArrowRight } from 'lucide-react';

export const StudentAttendancePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const sessionId = searchParams.get('sessionId');

  const { profile, signInWithGoogle } = useAuth();
  const [marking, setMarking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMarkAttendance = async () => {
    if (!profile || !eventId || !sessionId) return;

    try {
      setMarking(true);
      setError(null);

      const res = await fetch(`/api/v1/events/${eventId}/attendance/mark`, {
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <QrCode className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            KIIT University Attendance Portal
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight pt-2">Session Check-In</h1>
          <p className="text-xs text-slate-500">Fast, verified presence registration for campus events</p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Attendance Recorded!</h2>
            <p className="text-xs text-slate-500">
              Your verified attendance has been logged in the official campus database with your student profile snapshot.
            </p>
            <div className="pt-4">
              <Link to="/events" className="inline-block px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow">
                Return to Campus Portal
              </Link>
            </div>
          </div>
        ) : !profile ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              You must sign in with your official @kiit.ac.in Google Workspace account to verify your attendance.
            </p>
            <button
              onClick={signInWithGoogle}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4 bg-white rounded-full p-0.5" />
              Sign In with KIIT Google Account
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-1 font-mono">
              <p className="text-slate-500 font-sans text-[11px] font-semibold">Attendee Snapshot:</p>
              <p className="font-bold text-slate-900">{profile.displayName}</p>
              <p className="text-slate-600">{profile.email}</p>
              <p className="text-emerald-700 font-bold">Roll: {profile.rollNumber || 'N/A'}</p>
              <p className="text-slate-600">Accommodation: {profile.accommodationType} {profile.hostelName ? `(${profile.hostelName})` : ''}</p>
            </div>

            <button
              onClick={handleMarkAttendance}
              disabled={marking}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all uppercase tracking-wider"
            >
              {marking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying Token & Logging Record...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm My Attendance
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
