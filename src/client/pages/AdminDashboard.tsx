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
  History,
  X,
  ExternalLink,
  RefreshCw,
  Database,
  Check,
  UserCheck,
  FileSpreadsheet,
  Eye
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

  // Lead assignment state - Takes ONLY student email (UID removed as requested)
  const [assignModalSocId, setAssignModalSocId] = useState<string | null>(null);
  const [leadEmail, setLeadEmail] = useState('');
  const [assigningLead, setAssigningLead] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [removingLeadTarget, setRemovingLeadTarget] = useState<string | null>(null);

  // Notion Integration state
  const [notionApiKey, setNotionApiKey] = useState('');
  const [notionEventsDb, setNotionEventsDb] = useState('');
  const [notionDecisionsDb, setNotionDecisionsDb] = useState('');
  const [notionStatus, setNotionStatus] = useState<any>(null);
  const [notionRecords, setNotionRecords] = useState<any[]>([]);
  const [testingNotion, setTestingNotion] = useState(false);
  const [notionTestMsg, setNotionTestMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [savingNotionConfig, setSavingNotionConfig] = useState(false);
  const [syncingAllNotion, setSyncingAllNotion] = useState(false);

  // Event Operations & Attendance Inspection Modal
  const [inspectingEvent, setInspectingEvent] = useState<CampusEvent | null>(null);
  const [eventRegistrations, setEventRegistrations] = useState<any[]>([]);
  const [eventAttendanceSessions, setEventAttendanceSessions] = useState<any[]>([]);
  const [inspectLoading, setInspectLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'reviews' | 'events' | 'societies' | 'notion' | 'audit'>('reviews');

  const handleInspectEvent = async (evt: CampusEvent) => {
    setInspectingEvent(evt);
    setInspectLoading(true);
    setEventRegistrations([]);
    setEventAttendanceSessions([]);
    try {
      const [regRes, sessRes] = await Promise.all([
        fetch(`/api/v1/events/${evt.id}/registrations?callerRole=ADMIN`),
        fetch(`/api/v1/events/${evt.id}/attendance/sessions?callerRole=ADMIN`),
      ]);
      if (regRes.ok) {
        const regData = await regRes.json();
        setEventRegistrations(regData.registrations || []);
      }
      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setEventAttendanceSessions(sessData.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load event inspection details:', err);
    } finally {
      setInspectLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [evRes, socRes, audRes, notRes, notRecRes] = await Promise.all([
        fetch('/api/v1/events?callerRole=ADMIN'),
        fetch('/api/v1/societies'),
        fetch('/api/v1/audit?limit=30'),
        fetch('/api/v1/notion/status'),
        fetch('/api/v1/notion/records'),
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
      if (notRes.ok) {
        const notData = await notRes.json();
        setNotionStatus(notData);
        if (notData.databases) {
          setNotionEventsDb(notData.databases.events || '');
          setNotionDecisionsDb(notData.databases.decisions || '');
        }
      }
      if (notRecRes.ok) {
        const notRecData = await notRecRes.json();
        setNotionRecords(notRecData.records || []);
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
    if (!leadEmail.trim()) {
      alert('Student KIIT email is required.');
      return;
    }

    try {
      setAssigningLead(true);
      const res = await fetch(`/api/v1/societies/${socId}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: leadEmail.trim().toLowerCase(),
          actorRole: 'ADMIN',
          actorUid: profile?.uid || 'admin_sys',
          actorEmail: profile?.email || 'admin@kiit.ac.in',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lead assignment failed');
      }
      setAssignModalSocId(null);
      setLeadEmail('');
      await loadData();
    } catch (err: any) {
      alert(`Error assigning lead: ${err.message}`);
    } finally {
      setAssigningLead(false);
    }
  };

  const handleRemoveLead = async (socId: string, leadIdentifier: string) => {
    if (!window.confirm(`Revoke lead command access for ${leadIdentifier}?`)) return;

    try {
      setRemovingLeadTarget(leadIdentifier);
      const res = await fetch(`/api/v1/societies/${socId}/leads/${encodeURIComponent(leadIdentifier)}?actorRole=ADMIN&actorUid=${profile?.uid || 'admin_sys'}&actorEmail=${profile?.email || 'admin@kiit.ac.in'}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to remove lead');
      await loadData();
    } catch (err: any) {
      alert(`Error removing lead: ${err.message}`);
    } finally {
      setRemovingLeadTarget(null);
    }
  };

  // Rule 3: Admin is the ONLY authority who can delete approved/published events
  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    if (!window.confirm(`Permanently remove event "${eventName}" from university records? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingEventId(eventId);
      const res = await fetch(`/api/v1/events/${eventId}?actorRole=ADMIN&actorUid=${profile?.uid || 'admin_sys'}&actorEmail=${profile?.email || 'admin@kiit.ac.in'}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to delete event');
      }
      await loadData();
    } catch (err: any) {
      alert(`Error deleting event: ${err.message}`);
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleTestNotion = async () => {
    try {
      setTestingNotion(true);
      setNotionTestMsg(null);
      const res = await fetch('/api/v1/notion/test-connection', { method: 'POST' });
      const data = await res.json();
      setNotionTestMsg({ success: data.success, text: data.message });
    } catch (err: any) {
      setNotionTestMsg({ success: false, text: err.message });
    } finally {
      setTestingNotion(false);
    }
  };

  const handleSaveNotionConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingNotionConfig(true);
      const res = await fetch('/api/v1/notion/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: notionApiKey || undefined,
          databases: {
            events: notionEventsDb,
            decisions: notionDecisionsDb,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotionStatus(data.status);
        alert('Notion database settings saved and persisted to Firestore configuration.');
      }
    } catch (err: any) {
      alert(`Error saving Notion settings: ${err.message}`);
    } finally {
      setSavingNotionConfig(false);
    }
  };

  const handleSyncAllNotion = async () => {
    try {
      setSyncingAllNotion(true);
      const res = await fetch('/api/v1/notion/sync-all', { method: 'POST' });
      const data = await res.json();
      alert(`Notion full synchronization complete. ${data.syncedCount} entities processed.`);
      const notRecRes = await fetch('/api/v1/notion/records');
      if (notRecRes.ok) {
        const notRecData = await notRecRes.json();
        setNotionRecords(notRecData.records || []);
      }
    } catch (err: any) {
      alert(`Notion sync error: ${err.message}`);
    } finally {
      setSyncingAllNotion(false);
    }
  };

  const [quickApprovingId, setQuickApprovingId] = useState<string | null>(null);

  const handleQuickApprove = async (eventId: string) => {
    if (!profile) return;
    try {
      setQuickApprovingId(eventId);
      const res = await fetch(`/api/v1/events/${eventId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          actorRole: 'ADMIN',
          actorUid: profile.uid,
          actorEmail: profile.email,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to approve event');
      }
      await loadData();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setQuickApprovingId(null);
    }
  };

  const pendingReviews = events.filter(
    (e) => e.status === 'PENDING_REVIEW' || e.status === 'DRAFT' || e.status === 'CHANGES_REQUESTED'
  );

  return (
    <div className="min-h-screen bg-[#0a0908] text-[#f2f4f3] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Governance Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#a9927d]/20 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#f2f4f3] bg-[#49111c] px-2.5 py-0.5 rounded-full border border-[#a9927d]/40">
                Institutional Authority
              </span>
              <span className="text-xs text-[#a9927d] font-mono">KIIT Platform Governance</span>
            </div>
            <h1 className="text-3xl font-black text-[#f2f4f3] tracking-tight mt-1">Platform Governance Panel</h1>
            <p className="text-xs text-[#a9927d]">
              Review event proposals, provision campus societies, assign student leads by email, manage Notion sync, and inspect audit logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 bg-[#0a0908] hover:bg-[#49111c]/30 text-[#a9927d] border border-[#a9927d]/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="px-3.5 py-2 bg-[#49111c]/80 border border-[#a9927d]/40 rounded-xl text-xs font-bold text-[#f2f4f3] flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-300" />
              <span>Admin Session Active</span>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-[#a9927d]/20 pb-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'reviews'
                ? 'bg-[#49111c] text-[#f2f4f3] border border-[#a9927d]/50'
                : 'text-[#a9927d] hover:text-[#f2f4f3]'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Pending Reviews
            {pendingReviews.length > 0 && (
              <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-black animate-pulse">
                {pendingReviews.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'events'
                ? 'bg-[#49111c] text-[#f2f4f3] border border-[#a9927d]/50'
                : 'text-[#a9927d] hover:text-[#f2f4f3]'
            }`}
          >
            <Clock className="w-4 h-4" />
            Registry & Deletion ({events.length})
          </button>

          <button
            onClick={() => setActiveTab('societies')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'societies'
                ? 'bg-[#49111c] text-[#f2f4f3] border border-[#a9927d]/50'
                : 'text-[#a9927d] hover:text-[#f2f4f3]'
            }`}
          >
            <Building className="w-4 h-4" />
            Societies & Student Leads ({societies.length})
          </button>

          <button
            onClick={() => setActiveTab('notion')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'notion'
                ? 'bg-[#49111c] text-[#f2f4f3] border border-[#a9927d]/50'
                : 'text-[#a9927d] hover:text-[#f2f4f3]'
            }`}
          >
            <Database className="w-4 h-4" />
            Notion Knowledge Hub ({notionRecords.length})
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'bg-[#49111c] text-[#f2f4f3] border border-[#a9927d]/50'
                : 'text-[#a9927d] hover:text-[#f2f4f3]'
            }`}
          >
            <History className="w-4 h-4" />
            Audit Ledger ({auditLogs.length})
          </button>
        </div>

        {/* TAB 1: PENDING PROPOSAL REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#f2f4f3]">Proposals Awaiting Administrative Review</h2>
                <p className="text-xs text-[#a9927d]">
                  Verify venue capacity, safety requirements, schedule alignment, and lead-submitted thematic banners.
                </p>
              </div>
            </div>

            {pendingReviews.length === 0 ? (
              <div className="p-12 text-center bg-[#0a0908] border border-[#a9927d]/20 rounded-3xl space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="font-bold text-sm text-[#f2f4f3]">All Proposals Up to Date</h3>
                <p className="text-xs text-[#a9927d] max-w-sm mx-auto">
                  No events currently waiting in the review queue. Student lead submissions will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingReviews.map((evt) => (
                  <div key={evt.id} className="p-6 bg-[#0a0908] border border-[#a9927d]/25 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#a9927d] bg-[#49111c]/80 px-2.5 py-0.5 rounded-full border border-[#a9927d]/30">
                          {evt.category} &bull; {evt.societyName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            evt.status === 'PENDING_REVIEW'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : evt.status === 'DRAFT'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {evt.status === 'DRAFT' ? 'New Proposal' : evt.status.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] font-mono text-[#a9927d]">{evt.currentRevisionId || 'Rev 1'}</span>
                        </div>
                      </div>

                      <h3 className="font-bold text-lg text-[#f2f4f3]">{evt.name}</h3>
                      <p className="text-xs text-[#a9927d] line-clamp-2">{evt.description}</p>
                      
                      {/* Banner Preview */}
                      {evt.posterPath && (
                        <div className="w-full h-32 rounded-xl overflow-hidden border border-[#a9927d]/20 relative">
                          <img src={evt.posterPath} alt={evt.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          <div className="absolute bottom-1 right-2 px-2 py-0.5 bg-[#0a0908]/90 text-[10px] text-[#a9927d] rounded font-bold">
                            Lead Banner
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-[#a9927d]">
                        <div>Venue: <strong className="text-[#f2f4f3]">{evt.venue}</strong></div>
                        <div>Capacity: <strong className="text-[#f2f4f3]">{evt.capacity} seats</strong></div>
                        <div>Schedule: <strong className="text-[#f2f4f3]">{new Date(evt.startAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</strong></div>
                        <div>Duration: <strong className="text-[#f2f4f3]">{evt.duration}</strong></div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#a9927d]/20 flex flex-wrap items-center justify-between gap-2.5">
                      <button
                        onClick={() => handleQuickApprove(evt.id)}
                        disabled={quickApprovingId === evt.id}
                        className="px-4 py-2 bg-emerald-600/90 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer border border-emerald-500/50"
                      >
                        {quickApprovingId === evt.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Publishing Live...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                            Approve & Publish Live
                          </>
                        )}
                      </button>

                      <Link
                        to={`/admin/events/${evt.id}/review`}
                        className="px-4 py-2 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all"
                      >
                        Inspect & Review
                        <ArrowRight className="w-3.5 h-3.5 text-[#a9927d]" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EVENTS & SOLE ADMIN DELETION */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#f2f4f3]">Master Event Registry & Deletion Governance</h2>
                <p className="text-xs text-[#a9927d]">
                  Platform Administrators possess sole authority to delete accepted/published events.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((evt) => (
                <div key={evt.id} className="p-5 bg-[#0a0908] border border-[#a9927d]/25 rounded-3xl space-y-3 flex flex-col justify-between shadow-xl">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        evt.status === 'PUBLISHED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : evt.status === 'PENDING_REVIEW'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : evt.status === 'CHANGES_REQUESTED'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-[#5e503f]/40 text-[#a9927d]'
                      }`}>
                        {evt.status}
                      </span>
                      <span className="text-[10px] text-[#a9927d]">{evt.category}</span>
                    </div>

                    <h3 className="font-bold text-base text-[#f2f4f3] line-clamp-1">{evt.name}</h3>
                    <p className="text-xs text-[#a9927d] line-clamp-2 mt-1">{evt.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#a9927d]/20 text-[11px] text-[#a9927d]">
                      <div>Venue: <strong className="text-[#f2f4f3]">{evt.venue}</strong></div>
                      <div>Passes: <strong className="text-[#f2f4f3]">{evt.registeredCount || 0}</strong> / {evt.capacity}</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#a9927d]/20 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleInspectEvent(evt)}
                      className="px-3 py-1.5 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#a9927d]" />
                      Registrations & Attendance
                    </button>

                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/lead/events/${evt.id}/operations`}
                        className="px-2.5 py-1.5 bg-[#5e503f] hover:bg-[#78644e] text-[#f2f4f3] rounded-xl text-xs font-bold"
                      >
                        Command Hub
                      </Link>

                      {/* Rule 3: Admin is the ONLY authority who can delete events */}
                      <button
                        onClick={() => handleDeleteEvent(evt.id, evt.name)}
                        disabled={deletingEventId === evt.id}
                        className="p-1.5 bg-[#49111c] hover:bg-rose-950 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-bold cursor-pointer transition-all"
                        title="Delete event permanently from campus registry"
                      >
                        {deletingEventId === evt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-rose-400" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SOCIETIES & LEADS (EMAIL-ONLY) */}
        {activeTab === 'societies' && (
          <div className="space-y-6">
            
            {/* Create Society Form */}
            <form onSubmit={handleCreateSociety} className="p-6 bg-[#0a0908] border border-[#a9927d]/25 rounded-3xl space-y-4 shadow-xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#a9927d] flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Provision New Campus Society
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#a9927d] mb-1">Society Name</label>
                  <input
                    type="text"
                    value={newSocName}
                    onChange={(e) => setNewSocName(e.target.value)}
                    placeholder="e.g. KIIT Aerospace Society"
                    className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs text-[#f2f4f3] outline-none focus:border-[#a9927d]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a9927d] mb-1">Category</label>
                  <select
                    value={newSocCat}
                    onChange={(e) => setNewSocCat(e.target.value)}
                    className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs text-[#f2f4f3] outline-none focus:border-[#a9927d]"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Literary">Literary</option>
                    <option value="Sports">Sports</option>
                    <option value="Apex Body">Apex Body</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-[#a9927d] mb-1">Mandate / Description</label>
                  <input
                    type="text"
                    value={newSocDesc}
                    onChange={(e) => setNewSocDesc(e.target.value)}
                    placeholder="Official club description..."
                    className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs text-[#f2f4f3] outline-none focus:border-[#a9927d]"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creatingSoc}
                  className="px-5 py-2.5 bg-[#49111c] hover:bg-[#631726] disabled:opacity-50 text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow"
                >
                  {creatingSoc && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Society
                </button>
              </div>
            </form>

            {/* Societies List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {societies.map((s) => {
                const leadEmails = (s as any).leadEmails || [];
                const leadNames = s.leadNames || [];
                const displayLeads = leadEmails.length > 0 ? leadEmails : leadNames;

                return (
                  <div key={s.id} className="p-5 bg-[#0a0908] border border-[#a9927d]/25 rounded-3xl space-y-3 flex flex-col justify-between shadow-xl">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#a9927d] bg-[#49111c]/80 px-2.5 py-0.5 rounded-full border border-[#a9927d]/30">
                          {s.category}
                        </span>
                        <span className="text-[11px] text-[#a9927d] font-mono">ID: {s.id}</span>
                      </div>

                      <h4 className="font-bold text-base text-[#f2f4f3]">{s.name}</h4>
                      <p className="text-xs text-[#a9927d] line-clamp-2">{s.description}</p>
                    </div>

                    <div className="pt-3 border-t border-[#a9927d]/20 space-y-3 text-xs">
                      <div>
                        <span className="text-[#a9927d] text-[11px] block font-semibold mb-1">
                          Assigned Student Leads ({displayLeads.length}):
                        </span>
                        
                        {displayLeads.length === 0 ? (
                          <p className="text-[#a9927d] italic text-xs">No student leads assigned yet</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {displayLeads.map((item: string, idx: number) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#5e503f]/40 border border-[#a9927d]/30 rounded-lg text-[11px] text-[#f2f4f3] font-mono"
                              >
                                {item}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLead(s.id, item)}
                                  disabled={removingLeadTarget === item}
                                  className="text-[#a9927d] hover:text-rose-400 ml-1 cursor-pointer"
                                  title="Remove lead"
                                >
                                  {removingLeadTarget === item ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setAssignModalSocId(s.id)}
                        className="w-full py-2.5 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] border border-[#a9927d]/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow transition-all"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-[#a9927d]" />
                        Assign Student Lead (By Email)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: NOTION KNOWLEDGE HUB */}
        {activeTab === 'notion' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#f2f4f3]">Notion Workspace Knowledge Hub</h2>
                <p className="text-xs text-[#a9927d]">
                  Configure your team's Notion API key and database IDs to sync events, sessions, and operational decisions directly to Notion.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestNotion}
                  disabled={testingNotion}
                  className="px-4 py-2 bg-[#5e503f] hover:bg-[#78644e] text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
                >
                  {testingNotion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-[#a9927d]" />}
                  Test Connection
                </button>
                <button
                  onClick={handleSyncAllNotion}
                  disabled={syncingAllNotion}
                  className="px-4 py-2 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
                >
                  {syncingAllNotion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-[#a9927d]" />}
                  Sync All to Notion
                </button>
              </div>
            </div>

            {notionTestMsg && (
              <div className={`p-4 rounded-2xl text-xs border ${
                notionTestMsg.success
                  ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-600 text-rose-300'
              }`}>
                {notionTestMsg.text}
              </div>
            )}

            {/* Notion Settings Form */}
            <form onSubmit={handleSaveNotionConfig} className="p-6 bg-[#0a0908] border border-[#a9927d]/25 rounded-3xl space-y-4 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#a9927d]">Notion Integration Credentials</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#a9927d] mb-1">Notion Integration Token</label>
                  <input
                    type="password"
                    value={notionApiKey}
                    onChange={(e) => setNotionApiKey(e.target.value)}
                    placeholder={notionStatus?.apiKeyMasked || 'secret_...'}
                    className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs text-[#f2f4f3] font-mono outline-none focus:border-[#a9927d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a9927d] mb-1">Events Database ID</label>
                  <input
                    type="text"
                    value={notionEventsDb}
                    onChange={(e) => setNotionEventsDb(e.target.value)}
                    placeholder="e.g. 32-character Notion database id"
                    className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs text-[#f2f4f3] font-mono outline-none focus:border-[#a9927d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a9927d] mb-1">Decisions Database ID</label>
                  <input
                    type="text"
                    value={notionDecisionsDb}
                    onChange={(e) => setNotionDecisionsDb(e.target.value)}
                    placeholder="e.g. 32-character Notion database id"
                    className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs text-[#f2f4f3] font-mono outline-none focus:border-[#a9927d]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingNotionConfig}
                  className="px-5 py-2.5 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold shadow cursor-pointer"
                >
                  {savingNotionConfig ? 'Saving...' : 'Save Notion Credentials'}
                </button>
              </div>
            </form>

            {/* Synced Notion Records Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#a9927d]">
                Synchronized Notion Database Entries ({notionRecords.length})
              </h3>
              
              <div className="bg-[#0a0908] border border-[#a9927d]/25 rounded-3xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0a0908] text-[#a9927d] uppercase text-[10px] font-mono border-b border-[#a9927d]/20">
                    <tr>
                      <th className="p-4">Entity</th>
                      <th className="p-4">Title / Label</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Last Synced</th>
                      <th className="p-4 text-right">Notion Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#a9927d]/15 text-[#f2f4f3]">
                    {notionRecords.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-[#a9927d] italic">
                          No Notion sync records yet. Click "Sync All to Notion" or approve events to initiate sync.
                        </td>
                      </tr>
                    ) : (
                      notionRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-[#49111c]/20">
                          <td className="p-4 font-mono font-bold text-[#a9927d]">{rec.entityType}</td>
                          <td className="p-4 font-semibold">{rec.title || rec.entityId}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold">
                              {rec.syncStatus}
                            </span>
                          </td>
                          <td className="p-4 text-[#a9927d] font-mono text-[11px]">
                            {new Date(rec.lastSyncedAt).toLocaleString()}
                          </td>
                          <td className="p-4 text-right">
                            <a
                              href={rec.notionPageUrl || 'https://notion.so'}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-[#a9927d] hover:text-[#f2f4f3] underline font-semibold"
                            >
                              Open in Notion
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#f2f4f3]">System-Wide Immutable Audit Trail</h2>
            <div className="bg-[#0a0908] border border-[#a9927d]/25 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0a0908] text-[#a9927d] uppercase text-[10px] font-mono border-b border-[#a9927d]/20">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Actor</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Entity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#a9927d]/15 text-[#f2f4f3] font-mono text-xs">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#49111c]/20">
                      <td className="p-4 text-[#a9927d]">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="p-4 text-emerald-400 font-bold">{log.action}</td>
                      <td className="p-4 text-[#f2f4f3] font-sans">{log.actorEmail}</td>
                      <td className="p-4">{log.actorRole}</td>
                      <td className="p-4 text-[#a9927d]">{log.entity} ({log.entityId})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Event Registrations & Attendance Inspection Modal for Admin */}
      {inspectingEvent && (
        <div className="fixed inset-0 z-50 bg-[#0a0908]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0a0908] border border-[#a9927d]/30 rounded-3xl p-6 sm:p-8 max-w-4xl w-full my-8 space-y-6 shadow-2xl text-[#f2f4f3]">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#a9927d]/20 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#a9927d] bg-[#49111c]/80 px-2.5 py-0.5 rounded-full border border-[#a9927d]/30">
                    {inspectingEvent.societyName} &bull; {inspectingEvent.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    inspectingEvent.status === 'PUBLISHED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {inspectingEvent.status}
                  </span>
                </div>
                <h3 className="text-xl font-black text-[#f2f4f3]">{inspectingEvent.name}</h3>
                <p className="text-xs text-[#a9927d] mt-0.5">
                  Venue: <strong className="text-[#f2f4f3]">{inspectingEvent.venue}</strong> &bull; Date: <strong className="text-[#f2f4f3]">{new Date(inspectingEvent.startAt).toLocaleDateString()}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/lead/events/${inspectingEvent.id}/operations`}
                  className="px-3 py-1.5 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold"
                >
                  Open Command Center
                </Link>
                <button
                  onClick={() => setInspectingEvent(null)}
                  className="p-1.5 rounded-lg text-[#a9927d] hover:text-[#f2f4f3] hover:bg-[#49111c]/30"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Metrics Overview Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-[#0a0908] border border-[#a9927d]/20 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#a9927d] block">Registrations</span>
                <span className="text-xl font-black text-[#f2f4f3] font-mono">{eventRegistrations.length}</span>
                <span className="text-[10px] text-[#a9927d] block">/ {inspectingEvent.capacity} seats</span>
              </div>
              <div className="p-3.5 bg-[#0a0908] border border-[#a9927d]/20 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#a9927d] block">Attendance Sessions</span>
                <span className="text-xl font-black text-amber-300 font-mono">{eventAttendanceSessions.length}</span>
                <span className="text-[10px] text-[#a9927d] block">Gate ingress sessions</span>
              </div>
              <div className="p-3.5 bg-[#0a0908] border border-[#a9927d]/20 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#a9927d] block">Total Present</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {eventAttendanceSessions.reduce((acc, s) => acc + (s.presentCount || 0), 0)}
                </span>
                <span className="text-[10px] text-[#a9927d] block">Verified attendees</span>
              </div>
              <div className="p-3.5 bg-[#0a0908] border border-[#a9927d]/20 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#a9927d] block">Fill Ratio</span>
                <span className="text-xl font-black text-[#f2f4f3] font-mono">
                  {inspectingEvent.capacity > 0 ? Math.round((eventRegistrations.length / inspectingEvent.capacity) * 100) : 0}%
                </span>
                <span className="text-[10px] text-[#a9927d] block">Capacity occupancy</span>
              </div>
            </div>

            {inspectLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#a9927d]" />
                <p className="text-xs text-[#a9927d]">Loading registrations and attendance rosters...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Registrations Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#a9927d] flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#a9927d]" />
                      Confirmed Student Registrations ({eventRegistrations.length})
                    </h4>
                    <span className="text-[11px] text-[#a9927d]">Verified @kiit.ac.in IDs</span>
                  </div>

                  {eventRegistrations.length === 0 ? (
                    <div className="p-6 text-center bg-[#0a0908] rounded-2xl border border-[#a9927d]/20 text-xs text-[#a9927d]">
                      No student registrations recorded yet for this event.
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto rounded-2xl border border-[#a9927d]/20">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0a0908] border-b border-[#a9927d]/20 text-[#a9927d] uppercase text-[10px] sticky top-0">
                          <tr>
                            <th className="p-3">Student Name</th>
                            <th className="p-3">Roll Number</th>
                            <th className="p-3">KIIT Email</th>
                            <th className="p-3">Accommodation</th>
                            <th className="p-3">Registered At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#a9927d]/15 text-[#f2f4f3]">
                          {eventRegistrations.map((reg, idx) => (
                            <tr key={idx} className="hover:bg-[#49111c]/20">
                              <td className="p-3 font-semibold">{reg.nameSnapshot}</td>
                              <td className="p-3 font-mono text-[#a9927d]">{reg.rollNumberSnapshot || 'N/A'}</td>
                              <td className="p-3 font-mono text-[#a9927d] text-[11px]">{reg.emailSnapshot}</td>
                              <td className="p-3">{reg.accommodationSnapshot} {reg.hostelSnapshot ? `(${reg.hostelSnapshot})` : ''}</td>
                              <td className="p-3 text-[#a9927d] text-[11px]">{new Date(reg.registeredAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 2. Attendance Sessions List */}
                <div className="space-y-3 pt-2 border-t border-[#a9927d]/20">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#a9927d] flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-[#a9927d]" />
                      Attendance Sessions & Ingress Logs ({eventAttendanceSessions.length})
                    </h4>
                  </div>

                  {eventAttendanceSessions.length === 0 ? (
                    <div className="p-6 text-center bg-[#0a0908] rounded-2xl border border-[#a9927d]/20 text-xs text-[#a9927d]">
                      No attendance sessions have been initiated yet for this event.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {eventAttendanceSessions.map((session) => (
                        <div key={session.id} className="p-4 bg-[#0a0908] border border-[#a9927d]/20 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#f2f4f3] truncate">{session.name}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              session.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-[#5e503f]/40 text-[#a9927d]'
                            }`}>
                              {session.status}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-[#a9927d]">
                            <span>Attendees Checked In:</span>
                            <strong className="text-base text-[#f2f4f3] font-mono">{session.presentCount || 0}</strong>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[#a9927d]/15">
                            <a
                              href={`/api/v1/events/${inspectingEvent.id}/attendance/${session.id}/export`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-[#5e503f] hover:bg-[#78644e] text-[#f2f4f3] border border-[#a9927d]/30 rounded-xl text-xs font-bold flex items-center gap-1.5"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-[#a9927d]" />
                              Download XLSX
                            </a>
                            <Link
                              to={`/lead/events/${inspectingEvent.id}/attendance`}
                              className="text-xs text-[#a9927d] hover:text-[#f2f4f3] underline"
                            >
                              Open Gate Console &rarr;
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign Lead Modal - Takes ONLY Student Email (No UID field anywhere!) */}
      {assignModalSocId && (
        <div className="fixed inset-0 z-50 bg-[#0a0908]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a0908] border border-[#a9927d]/30 rounded-3xl p-6 max-w-md w-full space-y-4 text-[#f2f4f3] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#a9927d]/20 pb-3">
              <h3 className="font-bold text-base text-[#f2f4f3]">Assign Student Lead</h3>
              <button
                onClick={() => { setAssignModalSocId(null); setLeadEmail(''); }}
                className="text-[#a9927d] hover:text-[#f2f4f3]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-[#a9927d]">
              Enter the student's KIIT University email address. Their account will be granted student lead command authority for this society.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#a9927d] mb-1">Student University Email</label>
                <input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  placeholder="e.g. 220123456@kiit.ac.in"
                  className="w-full p-3 bg-[#0a0908] border border-[#a9927d]/40 rounded-xl text-xs text-[#f2f4f3] outline-none focus:border-[#a9927d] font-mono"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#a9927d]/20">
              <button
                onClick={() => { setAssignModalSocId(null); setLeadEmail(''); }}
                className="px-4 py-2 text-xs text-[#a9927d] hover:text-[#f2f4f3]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAssignLead(assignModalSocId)}
                disabled={assigningLead || !leadEmail.trim()}
                className="px-5 py-2.5 bg-[#49111c] hover:bg-[#631726] disabled:opacity-50 text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold cursor-pointer transition-all shadow"
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
