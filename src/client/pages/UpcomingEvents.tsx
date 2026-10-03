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
    <div className="min-h-screen bg-[#0a0908] text-[#f2f4f3] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="space-y-2 border-b border-[#a9927d]/20 pb-6">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#a9927d] bg-[#49111c]/80 px-2.5 py-0.5 rounded-full border border-[#a9927d]/30">
            University Lineup
          </span>
          <h1 className="text-3xl font-black text-[#f2f4f3] tracking-tight mt-1">Upcoming Campus Events</h1>
          <p className="text-xs text-[#a9927d]">Scheduled campus symposia, competitions, and seminars</p>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center items-center gap-2 text-xs font-semibold text-[#a9927d]">
            <Loader2 className="w-5 h-5 animate-spin text-[#a9927d]" />
            Loading upcoming schedule...
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 bg-[#0a0908] rounded-3xl border border-[#a9927d]/20 text-center shadow-xl space-y-3">
            <Calendar className="w-12 h-12 text-[#a9927d]/40 mx-auto" />
            <p className="font-semibold text-[#f2f4f3] text-sm">No upcoming events found.</p>
            <p className="text-xs text-[#a9927d]">Check back soon for newly published society events.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="bg-[#0a0908] rounded-3xl border border-[#a9927d]/25 overflow-hidden shadow-xl hover:border-[#a9927d]/60 transition-all flex flex-col justify-between"
              >
                <div className="h-44 bg-black relative overflow-hidden">
                  <img
                    src={evt.posterPath || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80'}
                    alt={evt.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0908] via-transparent to-transparent opacity-80" />
                  <div className="absolute top-3 right-3 px-2.5 py-1 bg-[#49111c]/90 border border-[#a9927d]/40 backdrop-blur-md rounded-lg text-[#f2f4f3] font-bold text-[10px] uppercase tracking-wider">
                    {evt.category}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#a9927d] block">
                      {evt.societyName}
                    </span>
                    <h3 className="font-bold text-base text-[#f2f4f3] line-clamp-1">{evt.name}</h3>
                    <p className="text-xs text-[#a9927d] line-clamp-2">{evt.description}</p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-[#a9927d]/15 text-xs text-[#a9927d]">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#a9927d]" />
                        {new Date(evt.startAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1 truncate max-w-[130px]">
                        <MapPin className="w-3.5 h-3.5 text-[#a9927d]" />
                        {evt.venue}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-[#a9927d]">
                        {evt.registeredCount || 0} / {evt.capacity} registered
                      </span>
                      <Link
                        to={`/events/${evt.id}`}
                        className="px-3.5 py-1.5 bg-[#49111c] hover:bg-[#631726] border border-[#a9927d]/40 text-[#f2f4f3] rounded-xl text-xs font-bold transition-all shadow"
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
