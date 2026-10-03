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
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-8 text-[#f2f4f3]">
        <p className="text-[#a9927d] text-xs">Please sign in with your verified @kiit.ac.in account to view your registered events.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0908] text-[#f2f4f3] py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="border-b border-[#a9927d]/20 pb-6">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#a9927d] bg-[#49111c]/80 px-2.5 py-0.5 rounded-full border border-[#a9927d]/30">
            Student Identity Ledger
          </span>
          <h1 className="text-3xl font-black text-[#f2f4f3] tracking-tight mt-1">My Event Passes & Registrations</h1>
          <p className="text-xs text-[#a9927d] mt-1">Confirmed event registrations associated with your verified KIIT identity</p>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center items-center gap-2 text-xs font-semibold text-[#a9927d]">
            <Loader2 className="w-5 h-5 animate-spin text-[#a9927d]" />
            Verifying registrations in university ledger...
          </div>
        ) : registeredEvents.length === 0 ? (
          <div className="p-12 bg-[#0a0908] rounded-3xl border border-[#a9927d]/20 text-center space-y-3 shadow-xl">
            <FileCheck className="w-12 h-12 text-[#a9927d]/40 mx-auto" />
            <h3 className="font-bold text-[#f2f4f3] text-sm">No Active Registrations Found</h3>
            <p className="text-xs text-[#a9927d]">Explore the campus directory and reserve passes for upcoming events.</p>
            <Link to="/events" className="inline-block mt-2 px-5 py-2.5 bg-[#49111c] hover:bg-[#631726] border border-[#a9927d]/40 text-[#f2f4f3] rounded-xl text-xs font-bold shadow">
              Browse Events
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {registeredEvents.map((evt) => (
              <div
                key={evt.id}
                className="bg-[#0a0908] rounded-3xl border border-[#a9927d]/25 p-6 shadow-xl hover:border-[#a9927d]/60 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] uppercase tracking-wider">
                      Pass Confirmed
                    </span>
                    <span className="text-xs text-[#a9927d] font-semibold">{evt.societyName}</span>
                  </div>
                  <h3 className="font-bold text-base text-[#f2f4f3]">{evt.name}</h3>
                  <div className="space-y-1 text-xs text-[#a9927d]">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#a9927d]" />
                      {new Date(evt.startAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#a9927d]" />
                      {evt.venue}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#a9927d]/15 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#a9927d] font-bold">
                    Roll: <strong className="text-[#f2f4f3]">{profile.rollNumber || 'FACULTY'}</strong>
                  </span>
                  <Link
                    to={`/events/${evt.id}`}
                    className="px-3.5 py-1.5 bg-[#49111c] hover:bg-[#631726] border border-[#a9927d]/40 text-[#f2f4f3] rounded-xl text-xs font-bold transition-all shadow"
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
