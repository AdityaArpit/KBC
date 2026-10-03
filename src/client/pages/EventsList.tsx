import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Search, Filter, ArrowRight, Loader2 } from 'lucide-react';
import { CampusEvent, Society } from '../../shared/types.ts';

export const EventsList: React.FC = () => {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSociety, setSelectedSociety] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
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
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories = ['ALL', 'Technical', 'Cultural', 'Literary', 'Sports', 'Workshop'];

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.venue.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || e.category === selectedCategory;
    const matchesSociety = selectedSociety === 'ALL' || e.societyId === selectedSociety;

    return matchesSearch && matchesCategory && matchesSociety;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">University Event Directory</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Browse verified and published campus hackathons, technical conferences, cultural fests, and workshops.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Search Input */}
            <div className="relative sm:col-span-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search event name, venue..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Category Select */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>
                ))}
              </select>
            </div>

            {/* Society Select */}
            <div>
              <select
                value={selectedSociety}
                onChange={(e) => setSelectedSociety(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Societies</option>
                {societies.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results List */}
        {loading ? (
          <div className="text-center py-16 flex items-center justify-center gap-2 text-slate-500 text-xs font-semibold">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            Loading events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-2">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-semibold text-sm text-slate-700">No events matched your filter criteria.</p>
            <p className="text-xs text-slate-400">Try adjusting your search terms or category selection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
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
                  <div className="space-y-1.5">
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
                      <span className="flex items-center gap-1 font-medium truncate max-w-[140px]">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {evt.venue}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-600">
                        Passes: <strong className="text-slate-900">{evt.registeredCount || 0}</strong> / {evt.capacity}
                      </span>
                      <Link
                        to={`/events/${evt.id}`}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors"
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
      </div>
    </div>
  );
};
