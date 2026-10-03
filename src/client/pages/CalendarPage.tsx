import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { CampusEvent } from '../../shared/types.ts';

export const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/events');
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  return (
    <div className="min-h-screen bg-[#0a0908] text-[#f2f4f3] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#a9927d]/20 pb-6">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#a9927d] bg-[#49111c]/80 px-2.5 py-0.5 rounded-full border border-[#a9927d]/30">
              Campus Master Schedule
            </span>
            <h1 className="text-3xl font-black text-[#f2f4f3] tracking-tight mt-1">University Events Calendar</h1>
            <p className="text-xs text-[#a9927d] mt-1">Official operational calendar of all published campus events</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="p-2 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl hover:bg-[#49111c]/40 text-[#f2f4f3] cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm text-[#f2f4f3] font-mono">
              {currentMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl hover:bg-[#49111c]/40 text-[#f2f4f3] cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Timeline Event List for current view */}
        {loading ? (
          <div className="py-20 flex justify-center items-center gap-2 text-xs font-semibold text-[#a9927d]">
            <Loader2 className="w-5 h-5 animate-spin text-[#a9927d]" />
            Loading calendar events...
          </div>
        ) : (
          <div className="bg-[#0a0908] rounded-3xl border border-[#a9927d]/25 p-6 sm:p-8 shadow-xl space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#a9927d]">
              Scheduled Events ({events.length})
            </h2>

            <div className="space-y-4">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-5 rounded-2xl bg-[#0a0908] border border-[#a9927d]/20 hover:border-[#a9927d]/60 hover:bg-[#49111c]/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-[#49111c]/80 border border-[#a9927d]/30 text-center shrink-0 shadow-md min-w-[70px]">
                      <span className="text-[10px] uppercase font-bold text-[#a9927d] block">
                        {new Date(evt.startAt).toLocaleDateString([], { month: 'short' })}
                      </span>
                      <span className="text-xl font-black text-[#f2f4f3] block leading-tight font-mono">
                        {new Date(evt.startAt).getDate()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#49111c]/50 text-[#f2f4f3] border border-[#a9927d]/20">
                          {evt.category}
                        </span>
                        <span className="text-xs text-[#a9927d] font-semibold">{evt.societyName}</span>
                      </div>
                      <h3 className="font-bold text-base text-[#f2f4f3]">{evt.name}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#a9927d] pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#a9927d]" />
                          {new Date(evt.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(evt.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#a9927d]" />
                          {evt.venue}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end sm:justify-center">
                    <Link
                      to={`/events/${evt.id}`}
                      className="px-4 py-2 bg-[#49111c] hover:bg-[#631726] border border-[#a9927d]/40 text-[#f2f4f3] rounded-xl text-xs font-bold transition-all shadow"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
