import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  CampusEvent,
  EventSession,
  EventTask,
  EventResource,
  EventDependency,
  AttendanceSession,
  AuditLogEntry
} from '../../shared/types.ts';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  GitBranch,
  Layers,
  MapPin,
  QrCode,
  Radio,
  Send,
  Shield,
  Sparkles,
  Users,
  Wrench,
  Loader2,
  RefreshCw,
  Plus
} from 'lucide-react';
import { HeroImpactModal } from '../components/HeroImpactModal.tsx';
import { AttendanceModal } from '../components/AttendanceModal.tsx';
import { AICopilotDrawer } from '../components/AICopilotDrawer.tsx';

export const EventCommandCenter: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile, role } = useAuth();

  const [event, setEvent] = useState<CampusEvent | null>(null);
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [resources, setResources] = useState<EventResource[]>([]);
  const [dependencies, setDependencies] = useState<EventDependency[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'sessions'
    | 'tasks'
    | 'resources'
    | 'registrations'
    | 'attendance'
    | 'dependencies'
    | 'risks'
    | 'audit'
  >('overview');

  const [heroModalOpen, setHeroModalOpen] = useState(false);
  const [activeAttendanceModal, setActiveAttendanceModal] = useState<AttendanceSession | null>(null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [notionSyncing, setNotionSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!id) return;

    // 1. Event listener
    const unsubEvent = onSnapshot(
      doc(db, 'events', id),
      (snap) => {
        if (snap.exists()) {
          setEvent({ id: snap.id, ...snap.data() } as CampusEvent);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `events/${id}`)
    );

    // 2. Sessions listener
    const unsubSessions = onSnapshot(
      collection(db, `events/${id}/sessions`),
      (snap) => {
        setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventSession)));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `events/${id}/sessions`)
    );

    // 3. Tasks listener
    const unsubTasks = onSnapshot(
      collection(db, `events/${id}/tasks`),
      (snap) => {
        setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventTask)));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `events/${id}/tasks`)
    );

    // 4. Resources listener
    const unsubResources = onSnapshot(
      collection(db, `events/${id}/resources`),
      (snap) => {
        setResources(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventResource)));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `events/${id}/resources`)
    );

    // 5. Dependencies listener
    const unsubDeps = onSnapshot(
      collection(db, `events/${id}/dependencies`),
      (snap) => {
        setDependencies(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventDependency)));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `events/${id}/dependencies`)
    );

    // 6. Attendance Sessions listener
    const unsubAtt = onSnapshot(
      collection(db, `events/${id}/attendanceSessions`),
      (snap) => {
        setAttendanceSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceSession)));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `events/${id}/attendanceSessions`)
    );

    // 7. Registrations listener
    const unsubRegs = onSnapshot(
      collection(db, `events/${id}/registrations`),
      (snap) => {
        setRegistrations(snap.docs.map((d) => d.data()));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `events/${id}/registrations`)
    );

    // 8. Audit logs listener
    const unsubAudit = onSnapshot(
      collection(db, 'auditLogs'),
      (snap) => {
        const logs = snap.docs
          .map((d) => d.data() as AuditLogEntry)
          .filter((l) => l.eventId === id);
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAuditLogs(logs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
    );

    return () => {
      unsubEvent();
      unsubSessions();
      unsubTasks();
      unsubResources();
      unsubDeps();
      unsubAtt();
      unsubRegs();
      unsubAudit();
    };
  }, [id]);

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  // Calculate metrics
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const blockedTasks = tasks.filter((t) => t.status === 'BLOCKED').length;
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 100;

  const totalAttendance = attendanceSessions.reduce((acc, s) => acc + (s.presentCount || 0), 0);
  const attendanceRate =
    event.registeredCount > 0
      ? Math.round((totalAttendance / event.registeredCount) * 100)
      : 100;

  // Submit for Admin Review handler
  const handleSubmitReview = async () => {
    if (!profile) return;
    try {
      setSubmittingReview(true);
      const res = await fetch(`/api/v1/events/${event.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorUid: profile.uid,
          actorEmail: profile.email,
          actorRole: role,
        }),
      });
      if (!res.ok) throw new Error('Submission failed');
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Trigger Notion Sync handler
  const handleNotionSync = async () => {
    try {
      setNotionSyncing(true);
      setSyncStatusMsg(null);
      const res = await fetch(`/api/v1/notion/sync/${event.id}`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'SYNCED') {
        setSyncStatusMsg('Successfully synchronized to Notion workspace.');
      } else if (data.status === 'PENDING') {
        setSyncStatusMsg('Notion integration mapped. Ready once workspace keys are configured.');
      } else {
        setSyncStatusMsg(`Notion sync recorded: ${data.error || 'Status recorded'}`);
      }
    } catch (err: any) {
      setSyncStatusMsg(`Sync notice: ${err.message}`);
    } finally {
      setNotionSyncing(false);
    }
  };

  // Start new Attendance Session handler
  const handleStartAttendance = async () => {
    if (!profile) return;
    try {
      const res = await fetch(`/api/v1/events/${event.id}/attendance/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${event.name} - Ingress Attendance`,
          description: 'Live QR verification at venue entrance.',
          durationMinutes: 90,
          actorUid: profile.uid,
          actorEmail: profile.email,
          actorRole: role,
        }),
      });
      if (!res.ok) throw new Error('Failed to start attendance');
      const data = await res.json();
      setActiveAttendanceModal(data.session);
    } catch (err: any) {
      alert(`Error starting attendance: ${err.message}`);
    }
  };

  // Toggle task status
  const handleToggleTaskStatus = async (task: EventTask) => {
    const nextStatus: EventTask['status'] =
      task.status === 'TODO' ? 'IN_PROGRESS' : task.status === 'IN_PROGRESS' ? 'COMPLETED' : 'TODO';
    const nextProgress = nextStatus === 'COMPLETED' ? 100 : nextStatus === 'IN_PROGRESS' ? 50 : 0;

    await updateDoc(doc(db, `events/${event.id}/tasks`, task.id), {
      status: nextStatus,
      progress: nextProgress,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      
      {/* Top Operations Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto space-y-4">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Title & Society */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link to="/lead" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Workspace
                </Link>
                <span className="text-slate-600">/</span>
                <span className="text-xs font-mono text-emerald-400 uppercase font-bold tracking-wider">
                  Command Center
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                  {event.status}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                {event.name}
              </h1>
              <p className="text-xs text-slate-400">
                {event.societyName} &bull; Primary Venue: <strong className="text-emerald-400">{event.venue}</strong> &bull; Schedule: {new Date(event.startAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* HERO FEATURE BUTTON */}
              <button
                onClick={() => setHeroModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer border border-indigo-400/30"
              >
                <GitBranch className="w-4 h-4 text-indigo-300" />
                Change Venue & Analyze Impact
              </button>

              {/* Start Attendance */}
              <button
                onClick={handleStartAttendance}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                Start Attendance
              </button>

              {/* Submit for Review (if Draft or Changes Requested) */}
              {(event.status === 'DRAFT' || event.status === 'CHANGES_REQUESTED') && (
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer"
                >
                  {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit for Admin Review
                </button>
              )}

              {/* Notion Knowledge Sync */}
              <button
                onClick={handleNotionSync}
                disabled={notionSyncing}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                title="Synchronize structured event knowledge to Notion"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${notionSyncing ? 'animate-spin' : ''}`} />
                Sync Notion
              </button>

              {/* AI Copilot Toggle */}
              <button
                onClick={() => setCopilotOpen(!copilotOpen)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-purple-200" />
                Copilot AI
              </button>
            </div>
          </div>

          {syncStatusMsg && (
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 flex items-center justify-between">
              <span>{syncStatusMsg}</span>
              <button onClick={() => setSyncStatusMsg(null)} className="text-slate-500 hover:text-white text-xs ml-4">Dismiss</button>
            </div>
          )}

          {/* Operational Metrics Counter Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            
            {/* Metric 1: Registrations */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Registrations</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-white font-mono">{event.registeredCount || 0}</span>
                <span className="text-xs text-slate-500">/ {event.capacity} seats</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(100, (((event.registeredCount || 0) / event.capacity) * 100))}%` }}
                ></div>
              </div>
            </div>

            {/* Metric 2: Live Attendance */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Present Checked-In</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-teal-400 font-mono">{totalAttendance}</span>
                <span className="text-xs text-slate-500">{attendanceRate}% of registered</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full"
                  style={{ width: `${Math.min(100, attendanceRate)}%` }}
                ></div>
              </div>
            </div>

            {/* Metric 3: Tasks Progress */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tasks Completed</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-indigo-400 font-mono">{completedTasks}/{tasks.length}</span>
                <span className={`text-xs ${blockedTasks > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                  {blockedTasks} blocked
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${taskProgress}%` }}
                ></div>
              </div>
            </div>

            {/* Metric 4: Health Status */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Event Health</span>
              <div className="flex items-center gap-2 pt-0.5">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wider ${
                  event.health === 'HEALTHY'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : event.health === 'AT_RISK'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {event.health}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-1">{event.healthReason || 'Operational'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-slate-900/50 border-b border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto text-xs font-semibold py-2">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'sessions', label: `Sessions (${sessions.length})` },
            { id: 'tasks', label: `Tasks (${tasks.length})` },
            { id: 'resources', label: `Resources (${resources.length})` },
            { id: 'registrations', label: `Registrations (${registrations.length})` },
            { id: 'attendance', label: `Attendance (${attendanceSessions.length})` },
            { id: 'dependencies', label: `Dependency Graph (${dependencies.length})` },
            { id: 'risks', label: 'Risks & Health' },
            { id: 'audit', label: `Activity Audit (${auditLogs.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-white font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Event Specification Box */}
              <div className="lg:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Operational Overview</h3>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{event.description}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 block">Registration Window</span>
                    <p className="text-slate-200 font-semibold mt-0.5">
                      {new Date(event.registrationOpenAt).toLocaleDateString()} to {new Date(event.registrationCloseAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Assigned Student Leads</span>
                    <p className="text-slate-200 font-semibold mt-0.5">
                      {event.leadNames && event.leadNames.length > 0 ? event.leadNames.join(', ') : 'Rahul Sharma'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Notion Snapshot */}
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Knowledge Integration</h3>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Notion API Status</span>
                    <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Bi-directional schema ready
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Syncs verified events, sessions, tasks, and operational decisions to Notion workspace.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setHeroModalOpen(true)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <GitBranch className="w-4 h-4" />
                  Hero Demo: Venue Change
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SESSIONS */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Event Schedule & Sessions</h2>
            </div>

            {sessions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No scheduled sessions recorded.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sessions.map((s) => (
                  <div key={s.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm text-white">{s.title}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {s.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">{s.description || 'Session schedule item.'}</p>

                    <div className="space-y-1 pt-2 border-t border-slate-800 text-xs text-slate-400">
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(s.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(s.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        Venue: <strong className="text-slate-200">{s.venue}</strong>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        Speaker: <strong className="text-slate-200">{s.speaker || 'TBD'}</strong>
                        {s.speakerConfirmed ? (
                          <span className="text-[10px] text-emerald-400 font-bold ml-1">(Confirmed)</span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-bold ml-1">(Unconfirmed)</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TASKS */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Operational Tasks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map((task) => (
                <div key={task.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        task.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : task.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {task.priority}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{task.team}</span>
                    </div>

                    <h4 className="font-bold text-xs text-white leading-snug">{task.title}</h4>
                    {task.blocker && (
                      <p className="text-[11px] text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-900/50">
                        Blocker: {task.blocker}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Owner: {task.owner}</span>
                      <span>Due: {new Date(task.due).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </div>

                    <button
                      onClick={() => handleToggleTaskStatus(task)}
                      className={`w-full py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                        task.status === 'COMPLETED'
                          ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/40'
                          : task.status === 'IN_PROGRESS'
                          ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 hover:bg-indigo-600/40'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Status: {task.status} (Click to toggle)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: RESOURCES */}
        {activeTab === 'resources' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Event Resources & AV Rigs</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {resources.map((r) => (
                <div key={r.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500 font-bold uppercase">{r.type}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.status === 'ALLOCATED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white">{r.name}</h4>
                  <p className="text-xs text-slate-400">Quantity: <strong className="text-slate-200">{r.quantity}</strong></p>
                  <p className="text-xs text-slate-400">Location: {r.location}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: REGISTRATIONS */}
        {activeTab === 'registrations' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Authorized Registrations ({registrations.length})</h2>
              <span className="text-xs text-slate-400 font-mono">Immutable profile snapshots</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-4">Name</th>
                    <th className="p-4">Roll Number</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Accommodation</th>
                    <th className="p-4">Registered At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {registrations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 italic">No registrations yet.</td>
                    </tr>
                  ) : (
                    registrations.map((reg, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-4 font-semibold text-white">{reg.nameSnapshot}</td>
                        <td className="p-4 font-mono text-emerald-400">{reg.rollNumberSnapshot || 'N/A'}</td>
                        <td className="p-4 font-mono text-slate-400">{reg.emailSnapshot}</td>
                        <td className="p-4">{reg.personTypeSnapshot}</td>
                        <td className="p-4">
                          {reg.accommodationSnapshot} {reg.hostelSnapshot ? `(${reg.hostelSnapshot})` : ''}
                        </td>
                        <td className="p-4 text-slate-500">
                          {new Date(reg.registeredAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white">Live Attendance Windows</h2>
                <p className="text-xs text-slate-400">Launch short-lived QR tokens and export official Excel workbooks</p>
              </div>

              <button
                onClick={handleStartAttendance}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow"
              >
                <QrCode className="w-4 h-4" />
                Launch New Attendance Window
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attendanceSessions.map((session) => (
                <div key={session.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-white">{session.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{session.description}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      session.status === 'ACTIVE' ? 'bg-teal-500/20 text-teal-400 animate-pulse' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {session.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 px-3 bg-slate-950 rounded-xl text-xs">
                    <span className="text-slate-400">Present Count:</span>
                    <strong className="text-teal-400 font-mono text-sm">{session.presentCount || 0}</strong>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <button
                      onClick={() => setActiveAttendanceModal(session)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Display QR Code
                    </button>

                    <a
                      href={`/api/v1/events/${event.id}/attendance/${session.id}/export`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Export XLSX
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: DEPENDENCY GRAPH */}
        {activeTab === 'dependencies' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white">Dependency Model & Graph Traversal</h2>
                <p className="text-xs text-slate-400">Operational relationships powering the BFS/DFS impact analysis engine</p>
              </div>

              <button
                onClick={() => setHeroModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <GitBranch className="w-4 h-4" />
                Simulate Venue Change
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dependencies.map((dep) => (
                <div key={dep.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-indigo-300">
                        {dep.sourceType}
                      </span>
                      <span className="font-bold text-slate-200">{dep.sourceLabel || dep.sourceId}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono pl-2 border-l border-slate-700">
                      &rarr; {dep.relationshipType} &rarr;
                    </div>
                    <div className="flex items-center gap-2 pl-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-emerald-300">
                        {dep.targetType}
                      </span>
                      <span className="font-bold text-slate-200">{dep.targetLabel || dep.targetId}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    dep.severity === 'CRITICAL' || dep.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {dep.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: RISKS */}
        {activeTab === 'risks' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Deterministic Risk Engine Evaluation</h2>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  event.health === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  Current Status: {event.health}
                </span>
                <span className="text-xs text-slate-400">{event.healthReason}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 block">Blocked Tasks</span>
                  <span className="text-lg font-bold text-rose-400 font-mono">{blockedTasks}</span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 block">Resource Conflicts</span>
                  <span className="text-lg font-bold text-amber-400 font-mono">
                    {resources.filter((r) => r.status === 'CONFLICT').length}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 block">Unconfirmed Speakers</span>
                  <span className="text-lg font-bold text-indigo-400 font-mono">
                    {sessions.filter((s) => !s.speakerConfirmed).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Immutable Event Activity Audit Trail</h2>
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-emerald-400 font-bold text-[11px]">{log.action}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{log.actorRole}</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">Actor: {log.actorEmail}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hero Venue Change Impact Analysis Modal */}
      <HeroImpactModal
        event={event}
        isOpen={heroModalOpen}
        onClose={() => setHeroModalOpen(false)}
        onApplied={() => {
          setHeroModalOpen(false);
          setActiveTab('overview');
        }}
      />

      {/* Live Attendance Session Modal */}
      {activeAttendanceModal && (
        <AttendanceModal
          event={event}
          session={activeAttendanceModal}
          isOpen={!!activeAttendanceModal}
          onClose={() => setActiveAttendanceModal(null)}
          onSessionUpdated={() => {}}
        />
      )}

      {/* AI Operations Copilot Drawer */}
      <AICopilotDrawer
        event={event}
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />
    </div>
  );
};
