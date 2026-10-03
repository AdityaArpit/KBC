import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Shield,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Send,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { CampusEvent } from '../../shared/types.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile, role, signInWithGoogle } = useAuth();
  const [event, setEvent] = useState<CampusEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/events/${id}?callerRole=${role}&callerUid=${profile?.uid || ''}`);
        if (!res.ok) {
          throw new Error('Event not found or access restricted.');
        }
        const data = await res.json();
        setEvent(data.event);

        // Check if user is registered
        if (profile?.uid) {
          const regRes = await fetch(`/api/v1/events/${id}/registrations/my?uid=${profile.uid}`);
          if (regRes.ok) {
            const regData = await regRes.json();
            setIsRegistered(regData.isRegistered);
            setRegistrationData(regData.registration);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchEvent();
    }
  }, [id, profile?.uid, role]);

  const handleRegister = async () => {
    if (!profile) {
      signInWithGoogle();
      return;
    }

    try {
      setRegistering(true);
      setError(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/v1/events/${id}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: profile.uid,
          email: profile.email,
          emailVerified: profile.emailVerified,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to complete registration.');
      }

      const data = await res.json();
      setIsRegistered(true);
      setRegistrationData(data.registration);
      setSuccessMsg('Registration confirmed! Your student profile snapshot has been linked.');
      if (event) {
        setEvent({ ...event, registeredCount: data.newCount });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-emerald-700 font-semibold">
          <Loader2 className="w-6 h-6 animate-spin" />
          Loading campus event records...
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Event Unavailable</h2>
          <p className="text-xs text-slate-600">{error || 'This event could not be found or is currently private.'}</p>
          <Link to="/events" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  const isLeadOrAdmin =
    role === 'ADMIN' ||
    (Array.isArray(event.leadUids) && profile?.uid && event.leadUids.includes(profile.uid));

  const capacityFull = (event.registeredCount || 0) >= event.capacity;
  const now = Date.now();
  const regClosed = now > new Date(event.registrationCloseAt).getTime();
  const regNotStarted = now < new Date(event.registrationOpenAt).getTime();

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Navigation Breadcrumb & Lead Bar */}
        <div className="flex items-center justify-between">
          <Link to="/events" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Back to Events
          </Link>

          {isLeadOrAdmin && (
            <Link
              to={`/lead/events/${event.id}/operations`}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              Open Event Command Center
            </Link>
          )}
        </div>

        {/* Hero Banner */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-64 sm:h-80 relative overflow-hidden bg-slate-900">
            <img
              src={event.posterPath || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80'}
              alt={event.name}
              className="w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

            <div className="absolute bottom-6 left-6 right-6 space-y-2 text-white">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-emerald-500/80 backdrop-blur-md text-white font-bold text-xs">
                  {event.category}
                </span>
                <span className="text-xs text-slate-300 font-semibold">{event.societyName}</span>
                <span className="px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-mono">
                  Status: {event.status}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight">{event.name}</h1>
            </div>
          </div>

          {/* Details & Registration Grid */}
          <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Event Specification */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">About This Event</h3>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{event.description}</p>
              </div>

              {/* Schedule and Logistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Date & Schedule
                  </div>
                  <p className="text-xs font-semibold text-slate-900 mt-1">
                    {new Date(event.startAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  <p className="text-[11px] text-slate-500">Duration: {event.duration}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Event Venue
                  </div>
                  <p className="text-xs font-semibold text-slate-900 mt-1">{event.venue}</p>
                  <p className="text-[11px] text-slate-500">Campus Security & Estate Verified</p>
                </div>
              </div>

              {/* Eligibility & Guidelines */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Eligibility Criteria</h4>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {event.eligibility}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Rules & Regulations</h4>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {event.rules}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Contact & Inquiries</h4>
                  <p className="text-xs text-slate-700">{event.contactDetails}</p>
                </div>
              </div>
            </div>

            {/* Right Column: Registration Card */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border-2 border-slate-200 bg-slate-50/50 space-y-5">
                <h3 className="font-extrabold text-slate-900 text-base">Participation Pass</h3>

                {/* Live Capacity Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">Registered Capacity</span>
                    <span className="text-slate-900 font-mono">
                      {event.registeredCount || 0} / {event.capacity}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        capacityFull ? 'bg-rose-500' : 'bg-emerald-600'
                      }`}
                      style={{
                        width: `${Math.min(100, (((event.registeredCount || 0) / event.capacity) * 100))}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-slate-500 text-right">
                    {event.capacity - (event.registeredCount || 0)} seats remaining
                  </p>
                </div>

                {/* Registration Alerts */}
                {successMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* State: Registered */}
                {isRegistered ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Registration Confirmed
                    </div>
                    <div className="text-[11px] text-emerald-900 space-y-1 font-mono">
                      <p>Attendee: {profile?.displayName}</p>
                      <p>Roll: {profile?.rollNumber || 'N/A'}</p>
                      <p>Email: {profile?.email}</p>
                      <p>Accommodation: {profile?.accommodationType} {profile?.hostelName ? `(${profile.hostelName})` : ''}</p>
                    </div>
                    <p className="text-[10px] text-emerald-700 italic">
                      Show your KIIT ID card or scan the event attendance QR code at the entrance.
                    </p>
                  </div>
                ) : (
                  /* State: Register Button */
                  <div className="space-y-3">
                    {!profile ? (
                      <div className="space-y-3 text-center">
                        <p className="text-xs text-slate-500">
                          Sign in with your verified @kiit.ac.in Google account to register for this event.
                        </p>
                        <button
                          onClick={signInWithGoogle}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4 bg-white rounded-full p-0.5" />
                          KIIT Sign-In to Register
                        </button>
                      </div>
                    ) : capacityFull ? (
                      <button
                        disabled
                        className="w-full py-3 bg-slate-300 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed"
                      >
                        Registration Full
                      </button>
                    ) : regClosed ? (
                      <button
                        disabled
                        className="w-full py-3 bg-slate-300 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed"
                      >
                        Registration Closed
                      </button>
                    ) : regNotStarted ? (
                      <button
                        disabled
                        className="w-full py-3 bg-slate-300 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed"
                      >
                        Registration Opens Soon
                      </button>
                    ) : (
                      <button
                        onClick={handleRegister}
                        disabled={registering}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        {registering ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Confirming Transaction...
                          </>
                        ) : (
                          <>
                            <FileCheck className="w-4 h-4" />
                            Register with KIIT Profile
                          </>
                        )}
                      </button>
                    )}

                    <div className="text-[11px] text-slate-500 space-y-1 pt-2">
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Deadline: {new Date(event.registrationCloseAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        Strictly @kiit.ac.in verified participants
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
