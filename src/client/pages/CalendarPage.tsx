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
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">University Events Calendar</h1>
            <p className="text-xs text-slate-500 mt-1">Official operational calendar of all published campus events</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm text-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm text-slate-800 font-mono">
              {currentMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm text-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Timeline Event List for current view */}
        {loading ? (
          <div className="py-20 flex justify-center items-center gap-2 text-xs font-semibold text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            Loading calendar events...
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Scheduled Events ({events.length})
            </h2>

            <div className="space-y-4">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center shrink-0 shadow-sm min-w-[70px]">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                        {new Date(evt.startAt).toLocaleDateString([], { month: 'short' })}
                      </span>
                      <span className="text-xl font-black text-slate-900 block leading-tight">
                        {new Date(evt.startAt).getDate()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          {evt.category}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">{evt.societyName}</span>
                      </div>
                      <h3 className="font-bold text-base text-slate-900">{evt.name}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(evt.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(evt.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {evt.venue}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end sm:justify-center">
                    <Link
                      to={`/events/${evt.id}`}
                      className="px-4 py-2 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
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
