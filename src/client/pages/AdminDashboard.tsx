import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Shield,
  FileCheck,
  Building,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Loader2,
  Trash2,
  UserPlus,
  History
} from 'lucide-react';
import { CampusEvent, Society, AuditLogEntry } from '../../shared/types.ts';

export const AdminDashboard: React.FC = () => {
  const { profile, role } = useAuth();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // New society modal state
  const [newSocName, setNewSocName] = useState('');
  const [newSocCat, setNewSocCat] = useState('Technical');
  const [newSocDesc, setNewSocDesc] = useState('');
  const [creatingSoc, setCreatingSoc] = useState(false);

  // Lead assignment state
  const [assignModalSocId, setAssignModalSocId] = useState<string | null>(null);
  const [leadEmail, setLeadEmail] = useState('');
  const [leadUid, setLeadUid] = useState('');
  const [assigningLead, setAssigningLead] = useState(false);

  const [activeTab, setActiveTab] = useState<'reviews' | 'societies' | 'audit'>('reviews');

  const loadData = async () => {
    try {
      setLoading(true);
      const [evRes, socRes, audRes] = await Promise.all([
        fetch('/api/v1/events?callerRole=ADMIN'),
        fetch('/api/v1/societies'),
        fetch('/api/v1/audit?limit=25'),
      ]);

      if (evRes.ok) {
        const evData = await evRes.json();
        setEvents(evData.events || []);
      }
      if (socRes.ok) {
        const socData = await socRes.json();
        setSocieties(socData.societies || []);
      }
      if (audRes.ok) {
        const audData = await audRes.json();
        setAuditLogs(audData.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSociety = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSocName || !newSocDesc) return;

    try {
      setCreatingSoc(true);
      const res = await fetch('/api/v1/societies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSocName,
          category: newSocCat,
          description: newSocDesc,
          actorRole: 'ADMIN',
          actorUid: profile?.uid || 'admin_sys',
          actorEmail: profile?.email || 'admin@kiit.ac.in',
        }),
      });

      if (!res.ok) throw new Error('Failed to create society');
      setNewSocName('');
      setNewSocDesc('');
      await loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setCreatingSoc(false);
    }
  };

  const handleAssignLead = async (socId: string) => {
    if (!leadUid || !leadEmail) {
      alert('Lead UID and email required.');
      return;
    }

    try {
      setAssigningLead(true);
      const res = await fetch(`/api/v1/societies/${socId}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadUid,
          leadName: leadEmail.split('@')[0],
          actorRole: 'ADMIN',
          actorUid: profile?.uid || 'admin_sys',
          actorEmail: profile?.email || 'admin@kiit.ac.in',
        }),
      });

      if (!res.ok) throw new Error('Lead assignment failed');
      setAssignModalSocId(null);
      setLeadUid('');
      setLeadEmail('');
      await loadData();
    } catch (err: any) {
      alert(`Error assigning lead: ${err.message}`);
    } finally {
      setAssigningLead(false);
    }
  };

  const pendingSubmissions = events.filter((e) => e.status === 'PENDING_REVIEW');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                Institutional Governance
              </span>
              <span className="text-xs text-slate-500">Platform Administrator</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mt-1">Platform Governance Panel</h1>
            <p className="text-xs text-slate-400">
              Review proposals, enforce KIIT publication guidelines, manage societies, and inspect immutable audit logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Admin Session Verified
            </span>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Pending Review</span>
            <span className="text-2xl font-black text-amber-400 block font-mono">{pendingSubmissions.length}</span>
            <span className="text-[11px] text-slate-500">Awaiting validation</span>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Campus Societies</span>
            <span className="text-2xl font-black text-white block font-mono">{societies.length}</span>
            <span className="text-[11px] text-slate-500">Active university bodies</span>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Events</span>
            <span className="text-2xl font-black text-indigo-400 block font-mono">{events.length}</span>
            <span className="text-[11px] text-slate-500">{events.filter(e => e.status === 'PUBLISHED').length} published</span>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Audit Logs</span>
            <span className="text-2xl font-black text-emerald-400 block font-mono">{auditLogs.length}</span>
            <span className="text-[11px] text-slate-500">Immutable records</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'reviews' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Submissions for Review ({pendingSubmissions.length})
          </button>

          <button
            onClick={() => setActiveTab('societies')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'societies' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Societies & Lead Assignments ({societies.length})
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'audit' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Governance Audit Trail ({auditLogs.length})
          </button>
        </div>

        {/* TAB 1: REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Event Proposals Awaiting Administrative Review</h2>
              <span className="text-xs text-slate-400">Strict publishing gateway</span>
            </div>

            {pendingSubmissions.length === 0 ? (
              <div className="p-12 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-sm font-bold text-white">All Submissions Reviewed</h3>
                <p className="text-xs text-slate-400">There are no proposals in PENDING_REVIEW state.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingSubmissions.map((evt) => (
                  <div key={evt.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
                          {evt.status}
                        </span>
                        <span className="text-xs text-slate-400">{evt.societyName}</span>
                      </div>
                      <h3 className="font-bold text-base text-white">{evt.name}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2">{evt.description}</p>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-800">
                      <p>Venue: <strong className="text-slate-200">{evt.venue}</strong></p>
                      <p>Capacity: <strong className="text-slate-200">{evt.capacity} students</strong></p>
                      <p>Schedule: {new Date(evt.startAt).toLocaleDateString()} ({evt.duration})</p>
                    </div>

                    <div className="pt-2">
                      <Link
                        to={`/admin/events/${evt.id}/review`}
                        className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow"
                      >
                        Open Governance Review Portal
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SOCIETIES & LEADS */}
        {activeTab === 'societies' && (
          <div className="space-y-6">
            
            {/* Create Society Form */}
            <form onSubmit={handleCreateSociety} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Provision New Campus Society
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Society Name</label>
                  <input
                    type="text"
                    value={newSocName}
                    onChange={(e) => setNewSocName(e.target.value)}
                    placeholder="e.g. KIIT Aerospace Society"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                  <select
                    value={newSocCat}
                    onChange={(e) => setNewSocCat(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Literary">Literary</option>
                    <option value="Sports">Sports</option>
                    <option value="Apex Body">Apex Body</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Mandate / Description</label>
                  <input
                    type="text"
                    value={newSocDesc}
                    onChange={(e) => setNewSocDesc(e.target.value)}
                    placeholder="Official club description..."
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creatingSoc}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {creatingSoc && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Society
                </button>
              </div>
            </form>

            {/* Societies List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {societies.map((s) => (
                <div key={s.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                        {s.category}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">ID: {s.id}</span>
                    </div>

                    <h4 className="font-bold text-base text-white">{s.name}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2">{s.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Assigned Leads ({s.leadUids?.length || 0}):</span>
                      <p className="text-slate-300 font-medium mt-0.5">
                        {s.leadNames && s.leadNames.length > 0 ? s.leadNames.join(', ') : 'No leads assigned yet'}
                      </p>
                    </div>

                    <button
                      onClick={() => setAssignModalSocId(s.id)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Assign Student Lead
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">System-Wide Immutable Audit Trail</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Actor</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Entity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 font-mono text-xs">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="p-4 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="p-4 text-emerald-400 font-bold">{log.action}</td>
                      <td className="p-4 text-slate-300 font-sans">{log.actorEmail}</td>
                      <td className="p-4">{log.actorRole}</td>
                      <td className="p-4 text-slate-400">{log.entity} ({log.entityId})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Assign Lead Modal */}
      {assignModalSocId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 text-white">
            <h3 className="font-bold text-base">Assign Student Lead to Society</h3>
            <p className="text-xs text-slate-400">
              Enter the Firebase UID and KIIT Email of the student. They will be granted scoped lead privileges.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Student KIIT Email</label>
                <input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  placeholder="220123456@kiit.ac.in"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Student Firebase UID</label>
                <input
                  type="text"
                  value={leadUid}
                  onChange={(e) => setLeadUid(e.target.value)}
                  placeholder="Enter user UID..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setAssignModalSocId(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAssignLead(assignModalSocId)}
                disabled={assigningLead}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {assigningLead ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
