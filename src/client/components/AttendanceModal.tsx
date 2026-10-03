import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  FileSpreadsheet,
  CheckCircle,
  Users,
  QrCode,
  AlertCircle,
  Loader2,
  Copy,
  Check
} from 'lucide-react';
import { AttendanceSession, CampusEvent } from '../../shared/types.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface AttendanceModalProps {
  event: CampusEvent;
  session: AttendanceSession;
  isOpen: boolean;
  onClose: () => void;
  onSessionUpdated: () => void;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  event,
  session,
  isOpen,
  onClose,
  onSessionUpdated,
}) => {
  const { user, profile } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [marking, setMarking] = useState(false);
  const [markedSuccess, setMarkedSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presentCount, setPresentCount] = useState(session.presentCount || 0);

  const checkinUrl = `${window.location.origin}/attendance/${session.tokenHash}?eventId=${event.id}&sessionId=${session.id}`;

  useEffect(() => {
    if (isOpen && canvasRef.current && session.tokenHash) {
      QRCode.toCanvas(canvasRef.current, checkinUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }, (err) => {
        if (err) console.error('QR code generation error:', err);
      });
    }
  }, [isOpen, session.tokenHash, checkinUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(checkinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickMarkAttendance = async () => {
    if (!profile) {
      setError('Please sign in with your verified KIIT account first.');
      return;
    }

    try {
      setMarking(true);
      setError(null);

      const res = await fetch(`/api/v1/events/${event.id}/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          token: session.tokenHash,
          uid: profile.uid,
          email: profile.email,
          emailVerified: profile.emailVerified,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to mark attendance.');
      }

      const data = await res.json();
      setPresentCount(data.presentCount);
      setMarkedSuccess(true);
      onSessionUpdated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMarking(false);
    }
  };

  const handleExportExcel = () => {
    window.open(`/api/v1/events/${event.id}/attendance/${session.id}/export`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-400/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{session.name}</h3>
              <p className="text-xs text-slate-400">Live Attendance Session</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Live Metrics Card */}
          <div className="flex items-center justify-between p-4 bg-teal-50 border border-teal-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-teal-800 uppercase tracking-wider block">Present Count</span>
                <span className="text-2xl font-black text-teal-950">{presentCount}</span>
                <span className="text-xs text-teal-700 ml-1">/ {event.registeredCount || 0} registered</span>
              </div>
            </div>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
              title="Download real XLSX attendance spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </button>
          </div>

          {/* QR Code Presentation */}
          <div className="text-center space-y-3">
            <div className="inline-block p-4 bg-white border-2 border-dashed border-slate-300 rounded-2xl shadow-inner">
              <canvas ref={canvasRef} className="mx-auto rounded-lg"></canvas>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Students scan this QR code with their mobile device to authenticate with Google and mark attendance.
            </p>
          </div>

          {/* Deep Link Copy Bar */}
          <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-xl border border-slate-200">
            <input
              type="text"
              readOnly
              value={checkinUrl}
              className="bg-transparent text-xs text-slate-600 px-2 py-1 w-full outline-none font-mono truncate"
            />
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* One-Click Student Check-In Simulator for Demo */}
          {profile && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Signed-in Attendee Check-In:</span>
                <span className="text-[11px] font-mono text-emerald-700 font-semibold">{profile.email}</span>
              </div>
              <button
                onClick={handleQuickMarkAttendance}
                disabled={marking || markedSuccess}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                {marking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recording Verified Attendance...
                  </>
                ) : markedSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Attendance Successfully Marked!
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Mark My Attendance Now
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
