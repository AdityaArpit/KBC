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
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-8 text-[#f2f4f3]">
        <Loader2 className="w-6 h-6 animate-spin text-[#a9927d]" />
      </div>
    );
  }

  if (!society) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-8 text-[#f2f4f3]">
        <div className="text-center space-y-3">
          <p className="font-bold text-[#f2f4f3]">Society not found.</p>
          <Link to="/societies" className="text-xs text-[#a9927d] underline">Back to Directory</Link>
        </div>
      </div>
    );
  }

  const upcoming = events.filter((e) => new Date(e.startAt).getTime() > Date.now());
  const past = events.filter((e) => new Date(e.endAt).getTime() < Date.now());

  return (
    <div className="min-h-screen bg-[#0a0908] text-[#f2f4f3] py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <Link to="/societies" className="inline-flex items-center gap-1.5 text-xs text-[#a9927d] hover:text-[#f2f4f3] font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Societies
        </Link>

        {/* Profile Card */}
        <div className="bg-[#0a0908] rounded-3xl border border-[#a9927d]/25 p-8 shadow-2xl flex flex-col sm:flex-row items-start gap-6">
          <img
            src={society.logoPath || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=300&q=80'}
            alt={society.name}
            className="w-20 h-20 rounded-2xl object-cover border border-[#a9927d]/30 shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="space-y-2 flex-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#49111c]/80 border border-[#a9927d]/40 text-[#f2f4f3] text-[10px] font-bold uppercase tracking-wider">
              {society.category}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#f2f4f3]">{society.name}</h1>
            <p className="text-xs sm:text-sm text-[#a9927d] leading-relaxed">{society.description}</p>
            {society.leadNames && society.leadNames.length > 0 && (
              <p className="text-xs text-[#a9927d] font-medium pt-2">
                Student Leads: <strong className="text-[#f2f4f3]">{society.leadNames.join(', ')}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#f2f4f3]">Upcoming Events from {society.name}</h2>
          {upcoming.length === 0 ? (
            <p className="text-xs text-[#a9927d] italic">No upcoming events scheduled at this moment.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcoming.map((evt) => (
                <div key={evt.id} className="p-4 bg-[#0a0908] rounded-2xl border border-[#a9927d]/20 shadow flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-[#f2f4f3]">{evt.name}</h3>
                    <p className="text-xs text-[#a9927d] mt-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#a9927d]" />
                      {new Date(evt.startAt).toLocaleDateString()} at {evt.venue}
                    </p>
                  </div>
                  <Link to={`/events/${evt.id}`} className="px-3.5 py-1.5 bg-[#49111c] hover:bg-[#631726] border border-[#a9927d]/40 text-[#f2f4f3] text-xs font-bold rounded-xl shadow transition-all">
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past Events */}
        {past.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-[#a9927d]/20">
            <h2 className="text-xl font-bold text-[#f2f4f3]">Archived & Concluded Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {past.map((evt) => (
                <div key={evt.id} className="p-4 bg-[#0a0908] rounded-2xl border border-[#a9927d]/15 text-xs space-y-1">
                  <h3 className="font-bold text-[#f2f4f3]">{evt.name}</h3>
                  <p className="text-[#a9927d]">Concluded on {new Date(evt.endAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
