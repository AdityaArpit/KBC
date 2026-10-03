import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Layers,
  Plus,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileEdit,
  ArrowRight,
  Loader2,
  Send,
  Building,
  Filter
} from 'lucide-react';
import { CampusEvent, Society } from '../../shared/types.ts';

export const LeadDashboard: React.FC = () => {
  const { profile, role } = useAuth();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [evRes, socRes] = await Promise.all([
          fetch(`/api/v1/events?callerRole=${role}&callerUid=${profile?.uid || ''}&callerEmail=${encodeURIComponent(profile?.email || '')}`),
          fetch('/api/v1/societies'),
        ]);

        let allSocs: Society[] = [];
        if (socRes.ok) {
          const socData = await socRes.json();
          const fetchedSocs: Society[] = socData.societies || [];
          if (role === 'ADMIN') {
            allSocs = fetchedSocs;
          } else {
            // Rule 2: A lead can ONLY manage societies to which they have been assigned (by UID or Email)
            const userEmail = profile?.email ? profile.email.toLowerCase().trim() : '';
            allSocs = fetchedSocs.filter(
              (s) =>
                (Array.isArray(profile?.assignedSocieties) && profile.assignedSocieties.includes(s.id)) ||
                (Array.isArray(s.leadUids) && profile?.uid && s.leadUids.includes(profile.uid)) ||
                (Array.isArray(s.leadEmails) && userEmail && s.leadEmails.map((e: string) => e.toLowerCase().trim()).includes(userEmail))
            );
          }
          setSocieties(allSocs);
        }

        if (evRes.ok) {
          const evData = await evRes.json();
          const allEvents: CampusEvent[] = evData.events || [];
          
          // Rule 2: Lead of a society shouldn't be able to see other societies commands only their own society command
          if (role === 'ADMIN') {
            setEvents(allEvents);
          } else {
            const mySocIds = new Set(allSocs.map((s) => s.id));
            const userEmail = profile?.email ? profile.email.toLowerCase().trim() : '';
            const myEvents = allEvents.filter(
              (e) =>
                mySocIds.has(e.societyId) ||
                (Array.isArray(e.leadUids) && profile?.uid && e.leadUids.includes(profile.uid)) ||
                (Array.isArray(e.leadEmails) && userEmail && e.leadEmails.map((em: string) => em.toLowerCase().trim()).includes(userEmail))
            );
            setEvents(myEvents);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile?.uid, profile?.email, role]);

  const filteredEvents = selectedSocietyId === 'ALL'
    ? events
    : events.filter((e) => e.societyId === selectedSocietyId);

  const getStatusBadge = (status: CampusEvent['status']) => {
    switch (status) {
      case 'PUBLISHED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PUBLISHED</span>;
      case 'PENDING_REVIEW':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">PENDING REVIEW</span>;
      case 'CHANGES_REQUESTED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">CHANGES REQUESTED</span>;
      case 'DRAFT':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#5e503f]/40 text-[#a9927d] border border-[#a9927d]/30">DRAFT</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">REJECTED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0a0908] text-[#a9927d] border border-[#a9927d]/20">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0908] text-[#f2f4f3] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Workspace Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#a9927d]/20 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#a9927d] bg-[#49111c]/80 px-2.5 py-0.5 rounded-full border border-[#a9927d]/30">
                Society Lead Command Workspace
              </span>
              <span className="text-xs text-[#a9927d] font-mono">KIIT Event Ops</span>
            </div>
            <h1 className="text-3xl font-black text-[#f2f4f3] tracking-tight mt-1">Lead Operations Center</h1>
            <p className="text-xs text-[#a9927d]">
              Manage authorized societies, create proposals, inspect administrative review feedback, and orchestrate live commands.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/lead/events/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#a9927d]" />
              Create Event Proposal
            </Link>
          </div>
        </div>

        {/* Managed Societies & Dropdown Selector */}
        <div className="bg-[#0a0908] rounded-3xl border border-[#a9927d]/25 p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#f2f4f3] flex items-center gap-2">
                <Building className="w-4 h-4 text-[#a9927d]" />
                My Managed Societies ({societies.length})
              </h2>
              <p className="text-[11px] text-[#a9927d] mt-0.5">
                One lead can manage multiple societies. Commands are strictly restricted to your authorized societies.
              </p>
            </div>

            {/* Society Filter Dropdown */}
            {societies.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <Filter className="w-3.5 h-3.5 text-[#a9927d]" />
                <select
                  value={selectedSocietyId}
                  onChange={(e) => setSelectedSocietyId(e.target.value)}
                  className="px-3 py-1.5 bg-[#0a0908] border border-[#a9927d]/40 text-[#f2f4f3] text-xs font-medium rounded-xl outline-none cursor-pointer focus:border-[#a9927d]"
                >
                  <option value="ALL">All My Societies ({societies.length})</option>
                  {societies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {societies.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#49111c]/20 border border-[#a9927d]/20 text-center">
              <p className="text-xs text-[#a9927d]">
                No assigned societies found for this student account. Administrators assign leads through the institutional governance panel.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {societies.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSocietyId(s.id === selectedSocietyId ? 'ALL' : s.id)}
                  className={`p-4 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer ${
                    selectedSocietyId === s.id
                      ? 'bg-[#49111c]/60 border-[#a9927d] shadow-md'
                      : 'bg-[#0a0908] border-[#a9927d]/20 hover:border-[#a9927d]/50'
                  }`}
                >
                  <img
                    src={s.logoPath || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=300&q=80'}
                    alt={s.name}
                    className="w-10 h-10 rounded-xl object-cover border border-[#a9927d]/30"
                    referrerPolicy="no-referrer"
                  />
                  <div className="truncate">
                    <h3 className="font-bold text-xs text-[#f2f4f3] truncate">{s.name}</h3>
                    <span className="text-[10px] text-[#a9927d] font-semibold uppercase">{s.category}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Events Operations Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#f2f4f3]">Authorized Society Command Operations</h2>
              <span className="text-xs text-[#a9927d]">
                Showing {filteredEvents.length} events {selectedSocietyId !== 'ALL' ? '(Filtered by society)' : ''}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center items-center gap-2 text-xs font-semibold text-[#a9927d]">
              <Loader2 className="w-5 h-5 animate-spin text-[#a9927d]" />
              Loading operations commands...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 bg-[#0a0908] rounded-3xl border border-[#a9927d]/20 text-center space-y-3">
              <Layers className="w-12 h-12 text-[#a9927d]/40 mx-auto" />
              <p className="font-bold text-[#f2f4f3] text-sm">No events found in this society command.</p>
              <p className="text-xs text-[#a9927d]">Draft an event proposal to start university governance workflow.</p>
              <Link
                to="/lead/events/new"
                className="inline-block mt-2 px-4 py-2 bg-[#49111c] border border-[#a9927d]/40 text-[#f2f4f3] rounded-xl text-xs font-bold"
              >
                Create Event Proposal
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-[#0a0908] rounded-3xl border border-[#a9927d]/25 overflow-hidden shadow-xl hover:border-[#a9927d]/60 transition-all flex flex-col justify-between"
                >
                  {/* Event Poster Header */}
                  {evt.posterPath && (
                    <div className="w-full h-36 relative overflow-hidden bg-black">
                      <img
                        src={evt.posterPath}
                        alt={evt.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0908] via-transparent to-transparent opacity-80" />
                      <div className="absolute top-3 right-3">
                        {getStatusBadge(evt.status)}
                      </div>
                      <div className="absolute bottom-2 left-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#a9927d] bg-[#0a0908]/90 px-2 py-0.5 rounded border border-[#a9927d]/30">
                          {evt.societyName}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      {!evt.posterPath && (
                        <div className="flex items-center justify-between">
                          {getStatusBadge(evt.status)}
                          <span className="text-[11px] font-semibold text-[#a9927d]">{evt.societyName}</span>
                        </div>
                      )}

                      <h3 className="font-bold text-base text-[#f2f4f3] line-clamp-1">{evt.name}</h3>
                      <p className="text-xs text-[#a9927d] line-clamp-2">{evt.description}</p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-[#a9927d]/15 text-xs">
                      <div className="flex justify-between text-[#a9927d] text-[11px]">
                        <span>Venue: <strong className="text-[#f2f4f3]">{evt.venue}</strong></span>
                        <span>Registered: <strong className="text-[#f2f4f3]">{evt.registeredCount || 0}</strong> / {evt.capacity}</span>
                      </div>

                      {/* Rule 2: Highlight changes requested feedback */}
                      {evt.status === 'CHANGES_REQUESTED' && (
                        <div className="p-3 rounded-xl bg-[#49111c]/50 border border-rose-500/40 text-rose-200 text-[11px] space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-rose-300">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Revisions Requested by Admin</span>
                          </div>
                          <p className="text-[10px] opacity-90">Open command center to view reviewer notes, edit parameters, and resubmit.</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          evt.health === 'HEALTHY'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {evt.health}
                        </span>

                        <Link
                          to={`/lead/events/${evt.id}/operations`}
                          className="flex items-center gap-1 px-3.5 py-1.5 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold shadow transition-all"
                        >
                          Command Center <ArrowRight className="w-3.5 h-3.5 text-[#a9927d]" />
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
    </div>
  );
};
