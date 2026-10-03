import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Loader2, ArrowRight } from 'lucide-react';
import { CampusEvent } from '../../shared/types.ts';

export const UpcomingEvents: React.FC = () => {
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
          setEvents(all.filter((e: CampusEvent) => new Date(e.startAt).getTime() > now));
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
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Upcoming Campus Events</h1>
          <p className="text-xs text-slate-500">Scheduled campus symposia, competitions, and seminars</p>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center items-center gap-2 text-xs font-semibold text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            Loading upcoming schedule...
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700 text-sm">No upcoming events found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="h-44 bg-slate-100 relative overflow-hidden">
                  <img
                    src={evt.posterPath || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80'}
                    alt={evt.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 px-2.5 py-1 bg-slate-900/80 backdrop-blur-md rounded-lg text-white font-bold text-[11px]">
                    {evt.category}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                      {evt.societyName}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 line-clamp-1">{evt.name}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2">{evt.description}</p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(evt.startAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1 truncate max-w-[130px]">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {evt.venue}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-600">
                        {evt.registeredCount || 0} / {evt.capacity} registered
                      </span>
                      <Link
                        to={`/events/${evt.id}`}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Register
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
