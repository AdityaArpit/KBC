import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Users,
  Radio,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { CampusEvent, Society } from '../../shared/types.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const Home: React.FC = () => {
  const { profile, role, signInWithGoogle } = useAuth();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [evRes, socRes] = await Promise.all([
          fetch('/api/v1/events'),
          fetch('/api/v1/societies'),
        ]);

        if (evRes.ok) {
          const evData = await evRes.json();
          setEvents(evData.events || []);
        }

        if (socRes.ok) {
          const socData = await socRes.json();
          setSocieties(socData.societies || []);
        }
      } catch (err) {
        console.error('Failed to load portal data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const ongoingEvents = events.filter((e) => {
    const now = Date.now();
    return new Date(e.startAt).getTime() <= now && new Date(e.endAt).getTime() >= now;
  });

  const upcomingEvents = events.filter((e) => {
    return new Date(e.startAt).getTime() > Date.now();
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white py-16 lg:py-24">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              KBC-NOTION-03 Campus Architecture
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white">
              Intelligent Team Operations & <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">Event Command Center</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
              KIIT University’s official campus event portal and operational nervous system. Featuring dependency-aware impact analysis, automated attendance verification, and synchronized Notion knowledge systems.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/events"
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all"
              >
                Browse Published Events
                <ArrowRight className="w-4 h-4" />
              </Link>

              {!profile ? (
                <button
                  onClick={signInWithGoogle}
                  className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm backdrop-blur-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4 bg-white rounded-full p-0.5" />
                  KIIT Student Sign-In
                </button>
              ) : (
                <Link
                  to={role === 'ADMIN' ? '/admin' : role === 'LEAD' ? '/lead' : '/my-registrations'}
                  className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-sm flex items-center gap-2 transition-all"
                >
                  {role === 'ADMIN' ? 'Go to Admin Governance' : role === 'LEAD' ? 'Go to Lead Command Center' : 'View My Registrations'}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 w-full">
        
        {/* Ongoing Live Events Banner */}
        {ongoingEvents.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Happening Now on Campus</h2>
              </div>
              <Link to="/ongoing" className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1">
                View All Ongoing <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ongoingEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-white rounded-2xl p-6 border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/5 hover:border-emerald-500 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Radio className="w-3 h-3 animate-pulse text-emerald-600" />
                        LIVE NOW
                      </span>
                      <span className="text-xs font-semibold text-slate-500">{evt.societyName}</span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 leading-snug">{evt.name}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2">{evt.description}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1.5 font-medium">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      {evt.venue}
                    </span>
                    <Link
                      to={`/events/${evt.id}`}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm"
                    >
                      Event Details & Check-In
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Events Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Upcoming Campus Events</h2>
              <p className="text-xs text-slate-500 mt-1">Verified and approved university event schedule</p>
            </div>
            <Link to="/events" className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1">
              Browse Directory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">No upcoming public events scheduled currently.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col group"
                >
                  <div className="h-44 bg-slate-100 relative overflow-hidden">
                    <img
                      src={evt.posterPath || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80'}
                      alt={evt.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3 px-2.5 py-1 bg-slate-900/80 backdrop-blur-md rounded-lg text-white font-bold text-[11px]">
                      {evt.category}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                        {evt.societyName}
                      </span>
                      <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                        {evt.name}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {evt.description}
                      </p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(evt.startAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {evt.venue}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-600">
                          Capacity: <strong className="text-slate-900">{evt.registeredCount || 0}</strong> / {evt.capacity}
                        </span>
                        <Link
                          to={`/events/${evt.id}`}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          View & Register
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Societies Directory Spotlight */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">KIIT Student Societies</h2>
              <p className="text-xs text-slate-500 mt-1">Apex governance, technical collectives, and cultural bodies</p>
            </div>
            <Link to="/societies" className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1">
              View All Societies <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {societies.map((soc) => (
              <Link
                key={soc.id}
                to={`/societies/${soc.id}`}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <img
                    src={soc.logoPath || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=300&q=80'}
                    alt={soc.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                  />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      {soc.category}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors mt-0.5 line-clamp-1">
                      {soc.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {soc.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-emerald-700 font-semibold">
                  <span>Explore Society</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
