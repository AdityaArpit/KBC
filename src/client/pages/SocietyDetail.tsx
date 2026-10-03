import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Loader2, ArrowRight } from 'lucide-react';
import { CampusEvent, Society } from '../../shared/types.ts';

export const SocietyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [society, setSociety] = useState<Society | null>(null);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [socRes, evRes] = await Promise.all([
          fetch('/api/v1/societies'),
          fetch(`/api/v1/events?societyId=${id}`),
        ]);

        if (socRes.ok) {
          const socData = await socRes.json();
          const found = (socData.societies || []).find((s: Society) => s.id === id);
          setSociety(found || null);
        }

        if (evRes.ok) {
          const evData = await evRes.json();
          setEvents(evData.events || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!society) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <p className="font-bold text-slate-800">Society not found.</p>
          <Link to="/societies" className="text-xs text-emerald-700 underline">Back to Directory</Link>
        </div>
      </div>
    );
  }

  const upcoming = events.filter((e) => new Date(e.startAt).getTime() > Date.now());
  const past = events.filter((e) => new Date(e.endAt).getTime() < Date.now());

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <Link to="/societies" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to Societies
        </Link>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col sm:flex-row items-start gap-6">
          <img
            src={society.logoPath || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=300&q=80'}
            alt={society.name}
            className="w-20 h-20 rounded-2xl object-cover border border-slate-100 shrink-0"
          />
          <div className="space-y-2 flex-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
              {society.category}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{society.name}</h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{society.description}</p>
            {society.leadNames && society.leadNames.length > 0 && (
              <p className="text-xs text-slate-500 font-medium pt-2">
                Student Leads: <strong className="text-slate-800">{society.leadNames.join(', ')}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Upcoming Events from {society.name}</h2>
          {upcoming.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No upcoming events scheduled at this moment.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcoming.map((evt) => (
                <div key={evt.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{evt.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(evt.startAt).toLocaleDateString()} at {evt.venue}
                    </p>
                  </div>
                  <Link to={`/events/${evt.id}`} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm">
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past Events */}
        {past.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Archived & Concluded Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {past.map((evt) => (
                <div key={evt.id} className="p-4 bg-white/70 rounded-2xl border border-slate-200 text-xs space-y-1">
                  <h3 className="font-bold text-slate-800">{evt.name}</h3>
                  <p className="text-slate-500">Concluded on {new Date(evt.endAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
