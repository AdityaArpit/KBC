import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio, Calendar, MapPin, Loader2, ArrowRight } from 'lucide-react';
import { CampusEvent } from '../../shared/types.ts';

export const OngoingEvents: React.FC = () => {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/events');
        if (res.ok) {
          const data = await res.json();
          const all = data.events || [];
          const now = Date.now();
          // Filter ongoing
          setEvents(all.filter((e: CampusEvent) => {
            const start = new Date(e.startAt).getTime();
            const end = new Date(e.endAt).getTime();
            return start <= now && end >= now;
          }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0908] text-[#f2f4f3] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center gap-3 border-b border-[#a9927d]/20 pb-6">
          <div className="w-10 h-10 rounded-2xl bg-[#49111c] border border-[#a9927d]/30 flex items-center justify-center text-[#f2f4f3]">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#a9927d] bg-[#49111c]/80 px-2.5 py-0.5 rounded-full border border-[#a9927d]/30">
              Live Operations
            </span>
            <h1 className="text-3xl font-black text-[#f2f4f3] tracking-tight mt-1">Active Ongoing Events</h1>
            <p className="text-xs text-[#a9927d]">Live sessions and check-in desks operating across KIIT campuses</p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center items-center gap-2 text-xs font-semibold text-[#a9927d]">
            <Loader2 className="w-5 h-5 animate-spin text-[#a9927d]" />
            Loading live events...
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 bg-[#0a0908] rounded-3xl border border-[#a9927d]/20 text-center space-y-3 shadow-xl">
            <Radio className="w-10 h-10 text-[#a9927d]/40 mx-auto" />
            <p className="font-semibold text-[#f2f4f3] text-sm">No live events active right now.</p>
            <p className="text-xs text-[#a9927d]">Check upcoming events on the schedule calendar.</p>
            <Link to="/upcoming" className="inline-block mt-3 px-4 py-2 bg-[#49111c] hover:bg-[#631726] border border-[#a9927d]/40 text-[#f2f4f3] rounded-xl text-xs font-bold transition-all shadow">
              View Upcoming Events
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="bg-[#0a0908] rounded-3xl p-6 border-2 border-emerald-500/40 shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                      LIVE ON CAMPUS
                    </span>
                    <span className="text-xs font-semibold text-[#a9927d]">{evt.societyName}</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#f2f4f3]">{evt.name}</h3>
                  <p className="text-xs text-[#a9927d] leading-relaxed">{evt.description}</p>
                </div>

                <div className="pt-4 border-t border-[#a9927d]/15 mt-4 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-[#a9927d] font-medium">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    {evt.venue}
                  </span>
                  <Link
                    to={`/events/${evt.id}`}
                    className="px-4 py-2 bg-[#49111c] hover:bg-[#631726] border border-[#a9927d]/40 text-[#f2f4f3] rounded-xl font-bold transition-all shadow"
                  >
                    Attendance & Check-In
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
