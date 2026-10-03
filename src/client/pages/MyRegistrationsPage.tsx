import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { FileCheck, Calendar, MapPin, QrCode, ArrowRight, Loader2 } from 'lucide-react';
import { CampusEvent } from '../../shared/types.ts';

export const MyRegistrationsPage: React.FC = () => {
  const { profile } = useAuth();
  const [registeredEvents, setRegisteredEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      try {
        const evRes = await fetch('/api/v1/events');
        if (evRes.ok) {
          const evData = await evRes.json();
          const allEvents: CampusEvent[] = evData.events || [];

          // Check registration status for each event for current user
          const myEvents: CampusEvent[] = [];
          for (const ev of allEvents) {
            try {
              const regCheck = await fetch(`/api/v1/events/${ev.id}/registrations/my?uid=${profile.uid}`);
              if (regCheck.ok) {
                const regData = await regCheck.json();
                if (regData.isRegistered) {
                  myEvents.push(ev);
                }
              }
            } catch {
              // ignore
            }
          }
          setRegisteredEvents(myEvents);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <p className="text-slate-600 text-xs">Please sign in to view your registered events.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Event Passes & Registrations</h1>
          <p className="text-xs text-slate-500 mt-1">Confirmed event registrations associated with your verified KIIT identity</p>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center items-center gap-2 text-xs font-semibold text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            Verifying registrations in Firestore...
          </div>
        ) : registeredEvents.length === 0 ? (
          <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
            <FileCheck className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">No Active Registrations Found</h3>
            <p className="text-xs text-slate-500">Explore the campus directory and reserve passes for upcoming events.</p>
            <Link to="/events" className="inline-block mt-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow">
              Browse Events
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {registeredEvents.map((evt) => (
              <div
                key={evt.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
                      Pass Confirmed
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">{evt.societyName}</span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900">{evt.name}</h3>
                  <div className="space-y-1 text-xs text-slate-500">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(evt.startAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {evt.venue}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-emerald-700 font-bold">
                    Roll: {profile.rollNumber || 'FACULTY'}
                  </span>
                  <Link
                    to={`/events/${evt.id}`}
                    className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors"
                  >
                    View Ticket
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
