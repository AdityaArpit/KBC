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
  Building
} from 'lucide-react';
import { CampusEvent, Society } from '../../shared/types.ts';

export const LeadDashboard: React.FC = () => {
  const { profile, role } = useAuth();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [evRes, socRes] = await Promise.all([
          fetch(`/api/v1/events?callerRole=${role}&callerUid=${profile?.uid || ''}`),
          fetch('/api/v1/societies'),
        ]);

        if (evRes.ok) {
          const evData = await evRes.json();
          setEvents(evData.events || []);
        }

        if (socRes.ok) {
          const socData = await socRes.json();
          const allSocs: Society[] = socData.societies || [];
          if (role === 'ADMIN') {
            setSocieties(allSocs);
          } else {
            // Filter to societies assigned to this lead
            setSocieties(
              allSocs.filter(
                (s) => Array.isArray(s.leadUids) && profile?.uid && s.leadUids.includes(profile.uid)
              )
            );
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile?.uid, role]);

  const getStatusBadge = (status: CampusEvent['status']) => {
    switch (status) {
      case 'PUBLISHED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">PUBLISHED</span>;
      case 'PENDING_REVIEW':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">PENDING ADMIN REVIEW</span>;
      case 'CHANGES_REQUESTED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">CHANGES REQUESTED</span>;
      case 'DRAFT':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">DRAFT</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">REJECTED</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">COMPLETED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Workspace Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Society Lead Workspace
              </span>
              <span className="text-xs text-slate-400 font-mono">KIIT Event Ops</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">Lead Command Operations</h1>
            <p className="text-xs text-slate-500">
              Manage authorized societies, create proposals, revise feedback, and orchestrate live event logistics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/lead/events/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Event Proposal
            </Link>
          </div>
        </div>

        {/* Assigned Societies Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-600" />
            My Managed Societies ({societies.length})
          </h2>

          {societies.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No assigned societies found. Administrators assign leads through governance portal.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {societies.map((s) => (
                <div key={s.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <img
                    src={s.logoPath || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=300&q=80'}
                    alt={s.name}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                  />
                  <div>
                    <h3 className="font-bold text-xs text-slate-900">{s.name}</h3>
                    <span className="text-[10px] text-indigo-700 font-semibold uppercase">{s.category}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Events Lifecycle Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Event Proposals & Live Operations</h2>
            <span className="text-xs text-slate-500 font-mono">{events.length} Total Records</span>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center items-center gap-2 text-xs font-semibold text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              Loading operations portfolio...
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
              <Layers className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-800 text-sm">No events found in your portfolio.</p>
              <p className="text-xs text-slate-500">Draft a proposal to begin the university review cycle.</p>
              <Link
                to="/lead/events/new"
                className="inline-block mt-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
              >
                Create Event Proposal
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      {getStatusBadge(evt.status)}
                      <span className="text-[11px] font-semibold text-slate-400">{evt.societyName}</span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 line-clamp-1">{evt.name}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2">{evt.description}</p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Venue: <strong className="text-slate-800">{evt.venue}</strong></span>
                      <span>Registered: <strong className="text-slate-800">{evt.registeredCount || 0}</strong> / {evt.capacity}</span>
                    </div>

                    {evt.status === 'CHANGES_REQUESTED' && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Admin requested changes. Revise and resubmit.</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        evt.health === 'HEALTHY' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {evt.health}
                      </span>

                      <Link
                        to={`/lead/events/${evt.id}/operations`}
                        className="flex items-center gap-1 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                      >
                        Command Center <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
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
