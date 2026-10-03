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
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Active Ongoing Events</h1>
            <p className="text-xs text-slate-500">Live sessions and check-in desks operating across KIIT campuses</p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center items-center gap-2 text-xs font-semibold text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            Loading live events...
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
            <p className="font-semibold text-slate-700 text-sm">No live events active right now.</p>
            <p className="text-xs text-slate-400">Check upcoming events on the schedule calendar.</p>
            <Link to="/upcoming" className="inline-block mt-3 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
              View Upcoming Events
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="bg-white rounded-2xl p-6 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
                      LIVE ON CAMPUS
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{evt.societyName}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{evt.name}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{evt.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-slate-600 font-medium">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    {evt.venue}
                  </span>
                  <Link
                    to={`/events/${evt.id}`}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow"
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
