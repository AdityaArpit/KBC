import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
  AuditLogEntry,
  EventRevision
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
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Lock,
  UserCheck,
  Search,
  Check,
  Copy,
  Image as ImageIcon,
  Wand2,
  MessageSquare,
  X
} from 'lucide-react';
import { HeroImpactModal } from '../components/HeroImpactModal.tsx';
import { AttendanceModal } from '../components/AttendanceModal.tsx';
import { AICopilotDrawer } from '../components/AICopilotDrawer.tsx';

function toLocalDatetimeInput(dateVal?: string | Date): string {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
}

export const EventCommandCenter: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, role } = useAuth();

  const [event, setEvent] = useState<CampusEvent | null>(null);
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [resources, setResources] = useState<EventResource[]>([]);
  const [dependencies, setDependencies] = useState<EventDependency[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [revisions, setRevisions] = useState<EventRevision[]>([]);

  // Attendance live attendee records state
  const [selectedSessionForRoster, setSelectedSessionForRoster] = useState<string | null>(null);
  const [sessionAttendeeRecords, setSessionAttendeeRecords] = useState<any[]>([]);
  const [manualCheckinInput, setManualCheckinInput] = useState('');
  const [manualCheckinLoading, setManualCheckinLoading] = useState(false);
  const [manualCheckinMsg, setManualCheckinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Event Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('Technical');
  const [editVenue, setEditVenue] = useState('');
  const [editCapacity, setEditCapacity] = useState(250);
  const [editDuration, setEditDuration] = useState('');
  const [editStartAt, setEditStartAt] = useState('');
  const [editEndAt, setEditEndAt] = useState('');
  const [editRegOpenAt, setEditRegOpenAt] = useState('');
  const [editRegCloseAt, setEditRegCloseAt] = useState('');
  const [editPosterPath, setEditPosterPath] = useState('');
  const [editEligibility, setEditEligibility] = useState('');
  const [editRules, setEditRules] = useState('');
  const [editContact, setEditContact] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [generatingEditBanner, setGeneratingEditBanner] = useState(false);

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
  const [deletingEvent, setDeletingEvent] = useState(false);

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!id) return;

    // 1. Event listener
    const unsubEvent = onSnapshot(
      doc(db, 'events', id),
      (snap) => {
        if (snap.exists()) {
          const ev = { id: snap.id, ...snap.data() } as CampusEvent;
          setEvent(ev);
          // Pre-populate edit form state
          setEditName(ev.name);
          setEditDescription(ev.description);
          setEditCategory(ev.category || 'Technical');
          setEditVenue(ev.venue);
          setEditCapacity(ev.capacity);
          setEditDuration(ev.duration);
          setEditStartAt(toLocalDatetimeInput(ev.startAt));
          setEditEndAt(toLocalDatetimeInput(ev.endAt));
          setEditRegOpenAt(toLocalDatetimeInput(ev.registrationOpenAt));
          setEditRegCloseAt(toLocalDatetimeInput(ev.registrationCloseAt));
          setEditPosterPath(ev.posterPath || '/src/assets/images/tech_event_banner_1791005048820.jpg');
          setEditEligibility(ev.eligibility || '');
          setEditRules(ev.rules || '');
          setEditContact(ev.contactDetails || '');
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
        const atts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceSession));
        setAttendanceSessions(atts);
        if (atts.length > 0 && !selectedSessionForRoster) {
          setSelectedSessionForRoster(atts[0].id);
        }
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

    // 9. Load revision history to inspect admin review messages/feedback
    async function loadRevisions() {
      try {
        const res = await fetch(`/api/v1/events/${id}/revisions`);
        if (res.ok) {
          const revData = await res.json();
          setRevisions(revData.revisions || []);
        }
      } catch (err) {
        console.error('Failed to load revisions:', err);
      }
    }
    loadRevisions();

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

  // Load live attendee roster whenever selected session changes
  useEffect(() => {
    async function loadRoster() {
      if (!id || !selectedSessionForRoster) return;
      try {
        const queryParams = new URLSearchParams({
          callerRole: role || '',
          callerUid: profile?.uid || '',
          callerEmail: profile?.email || '',
        });
        const res = await fetch(`/api/v1/events/${id}/attendance/${selectedSessionForRoster}/records?${queryParams}`);
        if (res.ok) {
          const data = await res.json();
          setSessionAttendeeRecords(data.records || []);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadRoster();
  }, [id, selectedSessionForRoster, attendanceSessions, role, profile?.uid, profile?.email]);

  if (!event) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-8 text-[#f2f4f3]">
        <Loader2 className="w-8 h-8 animate-spin text-[#a9927d]" />
      </div>
    );
  }

  // Security Check: Rule 2 - A lead should ONLY see their own society's command center
  const normalizedUserEmail = profile?.email ? profile.email.toLowerCase().trim() : '';
  const isAuthorizedLead =
    role === 'ADMIN' ||
    (Array.isArray(event.leadUids) && profile?.uid && event.leadUids.includes(profile.uid)) ||
    (Array.isArray(event.leadEmails) && normalizedUserEmail && event.leadEmails.map(e => e.toLowerCase().trim()).includes(normalizedUserEmail)) ||
    (Array.isArray(profile?.assignedSocieties) && profile.assignedSocieties.includes(event.societyId));

  if (!isAuthorizedLead) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-6 text-[#f2f4f3]">
        <div className="max-w-md w-full bg-[#0a0908] border border-rose-800/40 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <Shield className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-[#f2f4f3]">Access Restricted</h2>
          <p className="text-xs text-[#a9927d]">
            You are not an authorized student lead for <strong>{event.societyName}</strong>. Student leads can only command events within societies to which they have been formally assigned.
          </p>
          <div className="pt-2">
            <Link
              to="/lead"
              className="inline-block px-5 py-2.5 bg-[#49111c] text-[#f2f4f3] rounded-xl text-xs font-bold border border-[#a9927d]/40"
            >
              Back to My Lead Workspace
            </Link>
          </div>
        </div>
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

  // Find latest admin feedback if changes were requested or rejected
  const latestRevision = revisions.length > 0 ? revisions[0] : null;
  const adminFeedbackMessage =
    event.reviewFeedback ||
    event.rejectionReason ||
    latestRevision?.feedback ||
    latestRevision?.rejectionReason ||
    'Please review the schedule, venue capacity, and requirements as specified by the platform administrator.';

  // Rule 3 check: After review of admin, if event accepted no further changes! Admin can delete event only.
  const isAcceptedAndPublished = event.status === 'PUBLISHED' || event.status === 'APPROVED';

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
      const revRes = await fetch(`/api/v1/events/${event.id}/revisions`);
      if (revRes.ok) {
        const revData = await revRes.json();
        setRevisions(revData.revisions || []);
      }
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Rule 2: Save Edited Event Details & optionally resubmit for admin rereview
  const handleSaveEventDetails = async (resubmitForRereview: boolean) => {
    if (!profile) return;
    try {
      setSavingEdit(true);

      if (!editStartAt || !editEndAt) {
        throw new Error('Both Event Start Time and End Time are required.');
      }

      const startD = new Date(editStartAt);
      const endD = new Date(editEndAt);

      if (isNaN(startD.getTime())) {
        throw new Error('Please enter a valid Start Date & Time.');
      }
      if (isNaN(endD.getTime())) {
        throw new Error('Please enter a valid End Date & Time.');
      }
      if (endD.getTime() <= startD.getTime()) {
        throw new Error('Event End Date/Time must be strictly after Start Date/Time.');
      }

      // Automatically calculate duration if not specified
      const diffHours = Math.round(((endD.getTime() - startD.getTime()) / (1000 * 60 * 60)) * 10) / 10;
      const durationVal = editDuration && editDuration.trim()
        ? editDuration.trim()
        : `${diffHours} hour${diffHours === 1 ? '' : 's'}`;

      const regOpenIso = editRegOpenAt && !isNaN(new Date(editRegOpenAt).getTime())
        ? new Date(editRegOpenAt).toISOString()
        : (event.registrationOpenAt || new Date().toISOString());

      let regCloseIso = editRegCloseAt && !isNaN(new Date(editRegCloseAt).getTime())
        ? new Date(editRegCloseAt).toISOString()
        : (event.registrationCloseAt || startD.toISOString());

      // Clamp registration close so it doesn't exceed event start
      if (new Date(regCloseIso).getTime() > startD.getTime()) {
        regCloseIso = startD.toISOString();
      }

      const res = await fetch(`/api/v1/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          category: editCategory,
          venue: editVenue,
          capacity: Number(editCapacity),
          duration: durationVal,
          startAt: startD.toISOString(),
          endAt: endD.toISOString(),
          registrationOpenAt: regOpenIso,
          registrationCloseAt: regCloseIso,
          posterPath: editPosterPath,
          eligibility: editEligibility,
          rules: editRules,
          contactDetails: editContact,
          resubmit: resubmitForRereview,
          actorUid: profile.uid,
          actorEmail: profile.email,
          actorRole: role,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save event modifications');
      }

      setEditModalOpen(false);
      // Reload revisions
      const revRes = await fetch(`/api/v1/events/${event.id}/revisions`);
      if (revRes.ok) {
        const revData = await revRes.json();
        setRevisions(revData.revisions || []);
      }
    } catch (err: any) {
      alert(`Error saving edits: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  // Rule 3: Admin delete event action
  const handleDeleteEvent = async () => {
    if (!window.confirm(`Permanently remove "${event.name}" from university registry? This will cancel all registrations.`)) {
      return;
    }
    try {
      setDeletingEvent(true);
      const res = await fetch(`/api/v1/events/${event.id}?actorRole=ADMIN&actorUid=${profile?.uid || 'admin_sys'}&actorEmail=${profile?.email || 'admin@kiit.ac.in'}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete event');
      }
      navigate('/admin');
    } catch (err: any) {
      alert(`Deletion error: ${err.message}`);
    } finally {
      setDeletingEvent(false);
    }
  };

  // Thematic banner generator inside edit modal
  const handleGenerateEditBanner = async () => {
    try {
      setGeneratingEditBanner(true);
      const res = await fetch('/api/v1/ai/generate-thematic-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editName, category: editCategory }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.bannerUrl) {
          setEditPosterPath(data.bannerUrl);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingEditBanner(false);
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
        setSyncStatusMsg(`Successfully synchronized with Notion Database. Page URL: ${data.pageUrl || 'https://notion.so'}`);
      } else {
        setSyncStatusMsg(`Notion sync recorded (${data.error || 'Saved'})`);
      }
    } catch (err: any) {
      setSyncStatusMsg(`Sync notice: ${err.message}`);
    } finally {
      setNotionSyncing(false);
    }
  };

  // Manual Check-in handler for attendance
  const handleManualCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCheckinInput.trim() || !selectedSessionForRoster) return;

    try {
      setManualCheckinLoading(true);
      setManualCheckinMsg(null);

      const res = await fetch(`/api/v1/events/${event.id}/attendance/manual-mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSessionForRoster,
          studentIdentifier: manualCheckinInput.trim(),
          actorUid: profile?.uid || 'lead_sys',
          actorEmail: profile?.email || 'lead@kiit.ac.in',
          actorRole: role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record manual check-in');
      }

      setManualCheckinMsg({ type: 'success', text: `Verified & checked in: ${data.record.nameSnapshot || manualCheckinInput}` });
      setManualCheckinInput('');

      // Refresh attendee records
      const recRes = await fetch(`/api/v1/events/${event.id}/attendance/${selectedSessionForRoster}/records?callerRole=${role}&callerUid=${profile?.uid || ''}&callerEmail=${encodeURIComponent(profile?.email || '')}`);
      if (recRes.ok) {
        const recData = await recRes.json();
        setSessionAttendeeRecords(recData.records || []);
      }
    } catch (err: any) {
      setManualCheckinMsg({ type: 'error', text: err.message });
    } finally {
      setManualCheckinLoading(false);
    }
  };

  // Cross Option for Attendance: unmark / revoke attendee record
  const handleCrossAttendance = async (attendeeUid: string) => {
    if (!selectedSessionForRoster || !profile) return;
    try {
      const res = await fetch(
        `/api/v1/events/${event.id}/attendance/${selectedSessionForRoster}/records/${attendeeUid}?actorRole=${role}&actorUid=${profile.uid}&actorEmail=${encodeURIComponent(profile.email)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cross out attendance');
      }
      // Refresh attendee records
      const recRes = await fetch(`/api/v1/events/${event.id}/attendance/${selectedSessionForRoster}/records?callerRole=${role}&callerUid=${profile?.uid || ''}&callerEmail=${encodeURIComponent(profile?.email || '')}`);
      if (recRes.ok) {
        const recData = await recRes.json();
        setSessionAttendeeRecords(recData.records || []);
      }
    } catch (err: any) {
      alert(`Error crossing out attendance: ${err.message}`);
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
          description: 'Live QR verification and manual check-in at venue entrance.',
          durationMinutes: 90,
          actorUid: profile.uid,
          actorEmail: profile.email,
          actorRole: role,
        }),
      });
      if (!res.ok) throw new Error('Failed to start attendance session');
      const data = await res.json();
      setActiveAttendanceModal(data.session);
      setSelectedSessionForRoster(data.session.id);
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
    <div className="min-h-screen bg-[#0a0908] text-[#f2f4f3] flex flex-col font-sans">
      
      {/* Top Operations Header */}
      <div className="bg-[#0a0908] border-b border-[#a9927d]/20 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto space-y-4">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Title & Society */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link to="/lead" className="text-xs text-[#a9927d] hover:text-[#f2f4f3] flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Workspace
                </Link>
                <span className="text-[#5e503f]">/</span>
                <span className="text-xs font-mono text-[#a9927d] uppercase font-bold tracking-wider">
                  Command Center
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#49111c] text-[#f2f4f3] border border-[#a9927d]/30">
                  {event.status}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#f2f4f3] tracking-tight flex items-center gap-3">
                {event.name}
              </h1>
              <p className="text-xs text-[#a9927d]">
                {event.societyName} &bull; Primary Venue: <strong className="text-[#f2f4f3]">{event.venue}</strong> &bull; Schedule: {new Date(event.startAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* HERO FEATURE: Change Venue & Analyze Impact */}
              <button
                onClick={() => setHeroModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#49111c] to-[#5e503f] hover:from-[#631726] hover:to-[#78644e] text-[#f2f4f3] rounded-xl text-xs font-extrabold shadow-lg border border-[#a9927d]/40 transition-all cursor-pointer"
              >
                <GitBranch className="w-4 h-4 text-[#a9927d]" />
                Change Venue & Analyze Impact
              </button>

              {/* Start Attendance Session */}
              <button
                onClick={handleStartAttendance}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#5e503f] hover:bg-[#78644e] text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold shadow transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-[#a9927d]" />
                Start Attendance
              </button>

              {/* RULE 2: Edit Event Details & Resubmit button (Available when DRAFT or CHANGES_REQUESTED) */}
              {!isAcceptedAndPublished && (
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold shadow transition-all cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-[#a9927d]" />
                  Edit Event Details
                </button>
              )}

              {/* Submit for Review (if Draft) */}
              {event.status === 'DRAFT' && (
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-600/90 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer"
                >
                  {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit for Admin Review
                </button>
              )}

              {/* RULE 3: If event accepted no further changes .... admin can delete event only */}
              {isAcceptedAndPublished && role === 'ADMIN' && (
                <button
                  onClick={handleDeleteEvent}
                  disabled={deletingEvent}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold shadow transition-all cursor-pointer"
                  title="Sole administrator deletion authority"
                >
                  {deletingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-rose-400" />}
                  Delete Event
                </button>
              )}

              {/* Notion Knowledge Sync */}
              <button
                onClick={handleNotionSync}
                disabled={notionSyncing}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#0a0908] hover:bg-[#49111c]/30 text-[#a9927d] border border-[#a9927d]/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Synchronize structured event knowledge to Notion"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#a9927d] ${notionSyncing ? 'animate-spin' : ''}`} />
                Sync Notion
              </button>

              
            </div>
          </div>

          {/* RULE 2: Prominent Administrative Review Message & Feedback Notice */}
          {(event.status === 'CHANGES_REQUESTED' || event.status === 'REJECTED') && (
            <div className="p-4 rounded-2xl bg-[#49111c]/60 border border-rose-500/50 text-[#f2f4f3] space-y-3 animate-in fade-in duration-300">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 block">
                      {event.status === 'REJECTED' ? 'Platform Governance Rejection Notice' : 'Institutional Governance Review Notice'}
                    </span>
                    <h3 className="font-bold text-sm text-[#f2f4f3]">
                      {event.status === 'REJECTED' ? 'Event Proposal Rejected by Administrator' : 'Revisions Requested by Administrator'}
                    </h3>
                    <p className="text-xs text-[#f2f4f3] leading-relaxed bg-[#0a0908]/60 p-3 rounded-xl border border-[#a9927d]/20 font-mono">
                      "{adminFeedbackMessage}"
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setEditModalOpen(true)}
                  className="px-4 py-2 bg-[#f2f4f3] text-[#0a0908] hover:bg-[#a9927d] rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 shadow-lg cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Parameters & Resubmit
                </button>
              </div>
            </div>
          )}

          {/* RULE 3: Approved & Published lock banner */}
          {isAcceptedAndPublished && (
            <div className="p-3 rounded-2xl bg-[#5e503f]/30 border border-[#a9927d]/40 text-[#a9927d] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#a9927d]" />
                <span>
                  <strong className="text-[#f2f4f3]">Approved & Published:</strong> Event parameters are locked from modifications. Live on public portals.
                </span>
              </div>
              {role === 'ADMIN' && (
                <span className="text-[10px] text-rose-300 font-mono">Admin Deletion Authority Active</span>
              )}
            </div>
          )}

          {syncStatusMsg && (
            <div className="p-2.5 rounded-xl bg-[#0a0908] border border-[#a9927d]/40 text-xs text-[#a9927d] flex items-center justify-between">
              <span>{syncStatusMsg}</span>
              <button onClick={() => setSyncStatusMsg(null)} className="text-[#f2f4f3] hover:text-[#a9927d] text-xs ml-4">Dismiss</button>
            </div>
          )}

          {/* Operational Metrics Counter Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            
            {/* Metric 1: Registrations */}
            <div className="p-3.5 rounded-2xl bg-[#0a0908] border border-[#a9927d]/25 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#a9927d] block">Registrations</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-[#f2f4f3] font-mono">{event.registeredCount || 0}</span>
                <span className="text-xs text-[#a9927d]">/ {event.capacity} seats</span>
              </div>
              <div className="w-full h-1.5 bg-[#49111c]/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#a9927d] rounded-full"
                  style={{ width: `${Math.min(100, (((event.registeredCount || 0) / event.capacity) * 100))}%` }}
                ></div>
              </div>
            </div>

            {/* Metric 2: Live Attendance */}
            <div className="p-3.5 rounded-2xl bg-[#0a0908] border border-[#a9927d]/25 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#a9927d] block">Present Checked-In</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-[#f2f4f3] font-mono">{totalAttendance}</span>
                <span className="text-xs text-[#a9927d]">{attendanceRate}% of registered</span>
              </div>
              <div className="w-full h-1.5 bg-[#49111c]/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: `${Math.min(100, attendanceRate)}%` }}
                ></div>
              </div>
            </div>

            {/* Metric 3: Tasks Progress */}
            <div className="p-3.5 rounded-2xl bg-[#0a0908] border border-[#a9927d]/25 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#a9927d] block">Tasks Completed</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-[#f2f4f3] font-mono">{completedTasks}/{tasks.length}</span>
                <span className={`text-xs ${blockedTasks > 0 ? 'text-rose-400 font-bold' : 'text-[#a9927d]'}`}>
                  {blockedTasks} blocked
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#49111c]/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#5e503f] rounded-full"
                  style={{ width: `${taskProgress}%` }}
                ></div>
              </div>
            </div>

            {/* Metric 4: Health Status */}
            <div className="p-3.5 rounded-2xl bg-[#0a0908] border border-[#a9927d]/25 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#a9927d] block">Event Health</span>
              <div className="flex items-center gap-2 pt-0.5">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wider ${
                  event.health === 'HEALTHY'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : event.health === 'AT_RISK'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {event.health}
                </span>
              </div>
              <p className="text-[10px] text-[#a9927d] truncate mt-1">{event.healthReason || 'Operational'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-[#0a0908] border-b border-[#a9927d]/20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto text-xs font-semibold py-2">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'sessions', label: `Sessions (${sessions.length})` },
            { id: 'tasks', label: `Tasks (${tasks.length})` },
            { id: 'resources', label: `Resources (${resources.length})` },
            { id: 'registrations', label: `Registrations (${registrations.length})` },
            { id: 'attendance', label: `Attendance Flow (${attendanceSessions.length})` },
            { id: 'dependencies', label: `Dependency Graph (${dependencies.length})` },
            { id: 'risks', label: 'Risks & Health' },
            { id: 'audit', label: `Activity Audit (${auditLogs.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#49111c] text-[#f2f4f3] font-bold border border-[#a9927d]/40'
                  : 'text-[#a9927d] hover:text-[#f2f4f3] hover:bg-[#49111c]/20'
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
            
            {/* Event Poster Banner Display */}
            {event.posterPath && (
              <div className="relative w-full h-56 sm:h-72 rounded-3xl overflow-hidden border border-[#a9927d]/30 bg-black shadow-2xl">
                <img
                  src={event.posterPath}
                  alt={event.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0908] via-transparent to-transparent opacity-90" />
                <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#a9927d] bg-[#0a0908]/90 px-3 py-1 rounded-full border border-[#a9927d]/30">
                      {event.category} &bull; {event.societyName}
                    </span>
                    <h2 className="text-2xl font-black text-[#f2f4f3] mt-2 drop-shadow">
                      {event.name}
                    </h2>
                  </div>

                  {!isAcceptedAndPublished && (
                    <button
                      onClick={() => setEditModalOpen(true)}
                      className="px-4 py-2 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#a9927d]" />
                      Update Banner / Info
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Event Specification Box */}
              <div className="lg:col-span-2 p-6 bg-[#0a0908] border border-[#a9927d]/25 rounded-3xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#a9927d]">Operational Overview</h3>
                  {!isAcceptedAndPublished && (
                    <button
                      onClick={() => setEditModalOpen(true)}
                      className="text-xs text-[#a9927d] hover:text-[#f2f4f3] flex items-center gap-1 font-semibold"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Details
                    </button>
                  )}
                </div>

                <p className="text-sm text-[#f2f4f3] leading-relaxed whitespace-pre-line">{event.description}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#a9927d]/20 text-xs">
                  <div>
                    <span className="text-[#a9927d] block font-semibold">Registration Window</span>
                    <p className="text-[#f2f4f3] font-semibold mt-0.5">
                      {new Date(event.registrationOpenAt).toLocaleDateString()} to {new Date(event.registrationCloseAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#a9927d] block font-semibold">Assigned Student Leads</span>
                    <p className="text-[#f2f4f3] font-semibold mt-0.5">
                      {event.leadNames && event.leadNames.length > 0 ? event.leadNames.join(', ') : profile?.displayName || 'Lead'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#a9927d]/20 text-xs space-y-2">
                  <div>
                    <span className="text-[10px] text-[#a9927d] uppercase font-bold block">Eligibility & Rules</span>
                    <p className="text-[#f2f4f3] text-[11px] mt-0.5">{event.eligibility} &bull; {event.rules}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#a9927d] uppercase font-bold block">Contact Information</span>
                    <p className="text-[#f2f4f3] text-[11px] mt-0.5">{event.contactDetails}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Notion Snapshot */}
              <div className="p-6 bg-[#0a0908] border border-[#a9927d]/25 rounded-3xl space-y-4 flex flex-col justify-between shadow-xl">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#a9927d]">Notion Knowledge Integration</h3>
                  
                  <div className="p-3 bg-[#0a0908] border border-[#a9927d]/30 rounded-2xl text-xs space-y-2">
                    <span className="text-[10px] text-[#a9927d] uppercase tracking-wider block">Notion Knowledge Hub</span>
                    <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Bi-directional schema verified
                    </p>
                    <p className="text-[11px] text-[#a9927d]">
                      Event parameters, sessions, tasks, and venue decisions are mirrored to your team's Notion workspace.
                    </p>
                    <div className="pt-1">
                      <button
                        onClick={handleNotionSync}
                        disabled={notionSyncing}
                        className="w-full py-2 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-[#a9927d]/30"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-[#a9927d] ${notionSyncing ? 'animate-spin' : ''}`} />
                        Sync to Notion Database
                      </button>
                    </div>
                  </div>

                  {/* Revision Count Snapshot */}
                  <div className="p-3 bg-[#0a0908] border border-[#a9927d]/20 rounded-2xl text-xs space-y-1">
                    <span className="text-[10px] text-[#a9927d] uppercase font-bold block">Preserved Audit History</span>
                    <p className="text-xs text-[#f2f4f3] font-semibold">{revisions.length} Total Submissions / Revisions</p>
                    {latestRevision && (
                      <p className="text-[10px] text-[#a9927d]">Latest review: {latestRevision.reviewStatus} ({new Date(latestRevision.submittedAt).toLocaleDateString()})</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#a9927d]/20 text-[11px] text-[#a9927d]">
                  KIIT Event Command Center &bull; Authoritative Node
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SESSIONS */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-[#f2f4f3]">Event Sessions Schedule</h2>
                <p className="text-xs text-[#a9927d]">Program flow, speakers, and room allocations</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.map((sess) => (
                <div key={sess.id} className="p-5 bg-[#0a0908] border border-[#a9927d]/25 rounded-2xl space-y-3 shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-[#f2f4f3]">{sess.title}</h4>
                      <p className="text-xs text-[#a9927d] mt-0.5">Speaker: <strong className="text-[#f2f4f3]">{sess.speaker}</strong></p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      sess.speakerConfirmed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {sess.speakerConfirmed ? 'CONFIRMED' : 'PENDING'}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs text-[#a9927d] pt-2 border-t border-[#a9927d]/15">
                    <span>Venue: <strong className="text-[#f2f4f3]">{sess.venue}</strong></span>
                    <span>{sess.startAt ? new Date(sess.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: TASKS */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#f2f4f3]">Task Orchestration & Blocking Engine</h2>
              <span className="text-xs text-[#a9927d]">{completedTasks}/{tasks.length} Completed</span>
            </div>

            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTaskStatus(task)}
                  className="p-4 bg-[#0a0908] border border-[#a9927d]/25 rounded-2xl flex items-center justify-between text-xs cursor-pointer hover:border-[#a9927d]/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                      task.status === 'COMPLETED' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[#a9927d]/40'
                    }`}>
                      {task.status === 'COMPLETED' && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <h4 className={`font-bold ${task.status === 'COMPLETED' ? 'line-through text-[#a9927d]' : 'text-[#f2f4f3]'}`}>
                        {task.title}
                      </h4>
                      <p className="text-[11px] text-[#a9927d]">Owner: {task.ownerName || task.owner || 'Team'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      task.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' : 'bg-[#5e503f]/30 text-[#a9927d]'
                    }`}>
                      {task.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      task.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : task.status === 'BLOCKED' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: RESOURCES */}
        {activeTab === 'resources' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#f2f4f3]">Resource Allocation & Conflicts</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((res) => (
                <div key={res.id} className="p-4 bg-[#0a0908] border border-[#a9927d]/25 rounded-2xl space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-xs text-[#f2f4f3]">{res.name}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      res.status === 'CONFIRMED' || res.status === 'ALLOCATED'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {res.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#a9927d]">Type: {res.type} &bull; Qty: {res.quantity}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: REGISTRATIONS */}
        {activeTab === 'registrations' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-[#f2f4f3]">Attendee Registrations</h2>
                <p className="text-xs text-[#a9927d]">Verified @kiit.ac.in accounts with snapshot profiles</p>
              </div>
              <span className="text-xs font-mono text-[#a9927d]">{registrations.length} Students</span>
            </div>

            <div className="bg-[#0a0908] border border-[#a9927d]/25 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0a0908] border-b border-[#a9927d]/20 text-[#a9927d] uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">Student Name</th>
                    <th className="p-3.5">Roll Number</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Accommodation</th>
                    <th className="p-3.5">Registration Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#a9927d]/15 text-[#f2f4f3]">
                  {registrations.map((reg, idx) => (
                    <tr key={idx} className="hover:bg-[#49111c]/20">
                      <td className="p-3.5 font-bold">{reg.nameSnapshot}</td>
                      <td className="p-3.5 font-mono text-[#a9927d]">{reg.rollNumberSnapshot || 'N/A'}</td>
                      <td className="p-3.5 font-mono text-[#a9927d] text-[11px]">{reg.emailSnapshot}</td>
                      <td className="p-3.5">{reg.accommodationSnapshot} {reg.hostelSnapshot ? `(${reg.hostelSnapshot})` : ''}</td>
                      <td className="p-3.5 text-[#a9927d] text-[11px]">{new Date(reg.registeredAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: ATTENDANCE RECORDING FLOW (ENHANCED AS REQUESTED) */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#a9927d]/20 pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#f2f4f3]">Live Attendance Recording & Gate Operations</h2>
                <p className="text-xs text-[#a9927d]">
                  Execute QR token check-in, rapid manual roll-number ingress, and stream formatted Excel reports.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleStartAttendance}
                  className="px-4 py-2 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#a9927d]" />
                  Launch New Attendance Window
                </button>
              </div>
            </div>

            {/* Attendance Sessions Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {attendanceSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => setSelectedSessionForRoster(session.id)}
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-3 cursor-pointer ${
                    selectedSessionForRoster === session.id
                      ? 'bg-[#49111c]/30 border-[#a9927d] shadow-lg'
                      : 'bg-[#0a0908] border-[#a9927d]/25 hover:border-[#a9927d]/50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm text-[#f2f4f3] truncate">{session.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        session.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-400 animate-pulse border border-emerald-500/30'
                          : 'bg-[#5e503f]/30 text-[#a9927d]'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#a9927d] line-clamp-1">{session.description}</p>
                  </div>

                  <div className="p-3 bg-[#0a0908] border border-[#a9927d]/20 rounded-2xl flex items-center justify-between text-xs">
                    <span className="text-[#a9927d]">Checked-in Attendees:</span>
                    <strong className="text-xl font-black text-[#f2f4f3] font-mono">{session.presentCount || 0}</strong>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#a9927d]/20">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveAttendanceModal(session); }}
                      className="px-3 py-1.5 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] border border-[#a9927d]/30 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#a9927d]" />
                      Presenter QR
                    </button>

                    <a
                      href={`/api/v1/events/${event.id}/attendance/${session.id}/export`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 bg-[#5e503f] hover:bg-[#78644e] text-[#f2f4f3] border border-[#a9927d]/30 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#a9927d]" />
                      Export XLSX
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Manual Check-In Console & Live Roster for Selected Session */}
            {selectedSessionForRoster && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-[#a9927d]/20">
                
                {/* Manual Ingress Form */}
                <div className="p-6 bg-[#0a0908] border border-[#a9927d]/25 rounded-3xl space-y-4 shadow-xl">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#a9927d] flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[#a9927d]" />
                      Manual Ingress Check-In
                    </h3>
                    <p className="text-xs text-[#f2f4f3] mt-1">
                      Direct roll-number entry for students without camera access or on spot arrival
                    </p>
                  </div>

                  <form onSubmit={handleManualCheckin} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#a9927d] mb-1">
                        Student Roll Number or KIIT Email
                      </label>
                      <input
                        type="text"
                        value={manualCheckinInput}
                        onChange={(e) => setManualCheckinInput(e.target.value)}
                        placeholder="e.g. 220123456 or student@kiit.ac.in"
                        className="w-full p-3 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs text-[#f2f4f3] font-mono outline-none focus:border-[#a9927d]"
                      />
                    </div>

                    {manualCheckinMsg && (
                      <div className={`p-3 rounded-xl text-xs ${
                        manualCheckinMsg.type === 'success'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {manualCheckinMsg.text}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={manualCheckinLoading || !manualCheckinInput.trim()}
                      className="w-full py-2.5 bg-[#49111c] hover:bg-[#631726] disabled:opacity-50 text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow transition-all"
                    >
                      {manualCheckinLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-[#a9927d]" />}
                      Confirm Presence Check-In
                    </button>
                  </form>
                </div>

                {/* Live Attendees Roster */}
                <div className="lg:col-span-2 p-6 bg-[#0a0908] border border-[#a9927d]/25 rounded-3xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#a9927d]">
                        Verified Session Attendees ({sessionAttendeeRecords.length})
                      </h3>
                      <p className="text-[11px] text-[#a9927d]">Real-time presence ledger</p>
                    </div>

                    <a
                      href={`/api/v1/events/${event.id}/attendance/${selectedSessionForRoster}/export`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-[#5e503f] hover:bg-[#78644e] text-[#f2f4f3] border border-[#a9927d]/30 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#a9927d]" />
                      Download Workbook (.xlsx)
                    </a>
                  </div>

                  {sessionAttendeeRecords.length === 0 ? (
                    <div className="p-8 text-center bg-[#0a0908] rounded-2xl border border-[#a9927d]/15">
                      <p className="text-xs text-[#a9927d]">No attendees recorded yet for this session window.</p>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto rounded-2xl border border-[#a9927d]/20">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0a0908] border-b border-[#a9927d]/20 text-[#a9927d] uppercase text-[10px] sticky top-0">
                          <tr>
                            <th className="p-3">Attendee Name</th>
                            <th className="p-3">Roll Number</th>
                            <th className="p-3">Accommodation</th>
                            <th className="p-3">Checked-in At</th>
                            <th className="p-3 text-right">Attendance Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#a9927d]/15 text-[#f2f4f3]">
                          {sessionAttendeeRecords.map((r, i) => (
                            <tr key={i} className="hover:bg-[#49111c]/20">
                              <td className="p-3 font-semibold text-[#f2f4f3]">{r.nameSnapshot}</td>
                              <td className="p-3 font-mono text-[#a9927d]">{r.rollNumberSnapshot || 'N/A'}</td>
                              <td className="p-3">{r.accommodationSnapshot} {r.hostelSnapshot ? `(${r.hostelSnapshot})` : ''}</td>
                              <td className="p-3 text-[11px] font-mono text-[#a9927d]">{new Date(r.markedAt).toLocaleTimeString()}</td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleCrossAttendance(r.uid)}
                                  title="Cross out / Revoke attendance mark"
                                  className="px-2.5 py-1 bg-[#49111c]/80 hover:bg-[#631726] border border-rose-500/40 text-rose-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-all shadow"
                                >
                                  <X className="w-3.5 h-3.5 text-rose-400" />
                                  Cross Out
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: DEPENDENCY GRAPH */}
        {activeTab === 'dependencies' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-[#f2f4f3]">Dependency Model & Graph Traversal</h2>
                <p className="text-xs text-[#a9927d]">Operational relationships powering the BFS/DFS impact analysis engine</p>
              </div>

              <button
                onClick={() => setHeroModalOpen(true)}
                className="px-4 py-2 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
              >
                <GitBranch className="w-4 h-4 text-[#a9927d]" />
                Simulate Venue Change
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dependencies.map((dep) => (
                <div key={dep.id} className="p-4 bg-[#0a0908] border border-[#a9927d]/25 rounded-2xl flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#49111c] text-[#f2f4f3]">
                        {dep.sourceType}
                      </span>
                      <span className="font-bold text-[#f2f4f3]">{dep.sourceLabel || dep.sourceId}</span>
                    </div>
                    <div className="text-[11px] text-[#a9927d] font-mono pl-2 border-l border-[#a9927d]/30">
                      &rarr; {dep.relationshipType} &rarr;
                    </div>
                    <div className="flex items-center gap-2 pl-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#5e503f] text-[#f2f4f3]">
                        {dep.targetType}
                      </span>
                      <span className="font-bold text-[#f2f4f3]">{dep.targetLabel || dep.targetId}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    dep.severity === 'CRITICAL' || dep.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-300' : 'bg-[#5e503f]/30 text-[#a9927d]'
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
            <h2 className="text-lg font-bold text-[#f2f4f3]">Deterministic Risk Engine Evaluation</h2>
            <div className="p-5 bg-[#0a0908] border border-[#a9927d]/25 rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  event.health === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  Current Status: {event.health}
                </span>
                <span className="text-xs text-[#a9927d]">{event.healthReason}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 bg-[#0a0908] border border-[#a9927d]/20 rounded-xl">
                  <span className="text-[#a9927d] block">Blocked Tasks</span>
                  <span className="text-lg font-bold text-rose-400 font-mono">{blockedTasks}</span>
                </div>
                <div className="p-3 bg-[#0a0908] border border-[#a9927d]/20 rounded-xl">
                  <span className="text-[#a9927d] block">Resource Conflicts</span>
                  <span className="text-lg font-bold text-amber-300 font-mono">
                    {resources.filter((r) => r.status === 'CONFLICT').length}
                  </span>
                </div>
                <div className="p-3 bg-[#0a0908] border border-[#a9927d]/20 rounded-xl">
                  <span className="text-[#a9927d] block">Unconfirmed Speakers</span>
                  <span className="text-lg font-bold text-[#a9927d] font-mono">
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
            <h2 className="text-lg font-bold text-[#f2f4f3]">Immutable Event Activity Audit Trail</h2>
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 bg-[#0a0908] border border-[#a9927d]/25 rounded-2xl flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#a9927d] font-bold text-[11px]">{log.action}</span>
                      <span className="text-[10px] bg-[#49111c] text-[#f2f4f3] px-1.5 py-0.5 rounded">{log.actorRole}</span>
                    </div>
                    <p className="text-[#a9927d] text-[11px]">Actor: {log.actorEmail}</p>
                  </div>
                  <span className="text-[10px] text-[#a9927d] font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RULE 2: Edit Event Parameters & Send for Rereview Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0a0908]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0a0908] border border-[#a9927d]/30 rounded-3xl p-6 sm:p-8 max-w-3xl w-full my-8 space-y-6 shadow-2xl text-[#f2f4f3]">
            <div className="flex items-center justify-between border-b border-[#a9927d]/20 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#a9927d]">
                  Proposal Revisions
                </span>
                <h3 className="text-xl font-black text-[#f2f4f3]">Edit Event Parameters & Resubmit</h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-[#a9927d] hover:text-[#f2f4f3] text-sm"
              >
                Close
              </button>
            </div>

            {/* If Changes were requested, show the reviewer feedback inside modal */}
            {event.status === 'CHANGES_REQUESTED' && (
              <div className="p-4 rounded-2xl bg-[#49111c]/60 border border-rose-500/40 text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase text-rose-300">Admin Reviewer Message:</span>
                <p className="text-[#f2f4f3] font-mono">{adminFeedbackMessage}</p>
              </div>
            )}

            {/* Edit Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-[#a9927d] font-bold mb-1">Event Name / Title</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-[#f2f4f3] font-semibold outline-none focus:border-[#a9927d]"
                />
              </div>

              <div>
                <label className="block text-[#a9927d] font-bold mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-[#f2f4f3] outline-none"
                >
                  <option value="Technical">Technical</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Literary">Literary</option>
                  <option value="Sports">Sports</option>
                  <option value="Workshop">Workshop</option>
                </select>
              </div>

              <div>
                <label className="block text-[#a9927d] font-bold mb-1">Primary Venue</label>
                <input
                  type="text"
                  value={editVenue}
                  onChange={(e) => setEditVenue(e.target.value)}
                  className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-[#f2f4f3] outline-none"
                />
              </div>

              <div>
                <label className="block text-[#a9927d] font-bold mb-1">Capacity Limit</label>
                <input
                  type="number"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-[#f2f4f3] outline-none"
                />
              </div>

              {/* Schedule & Registration Timeline Card */}
              <div className="sm:col-span-2 p-4 rounded-2xl bg-[#141210] border border-[#a9927d]/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#a9927d] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#a9927d]" />
                    Event Schedule & Registration Timelines
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (editStartAt && editEndAt) {
                        const s = new Date(editStartAt).getTime();
                        const e = new Date(editEndAt).getTime();
                        if (e > s) {
                          const hrs = Math.round(((e - s) / (1000 * 60 * 60)) * 10) / 10;
                          setEditDuration(`${hrs} hour${hrs === 1 ? '' : 's'}`);
                        }
                      }
                    }}
                    className="text-[11px] text-[#a9927d] hover:text-[#f2f4f3] underline flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3" /> Auto-calculate duration
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#a9927d] mb-1">
                      Event Start Date & Time <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={editStartAt}
                      onChange={(e) => {
                        setEditStartAt(e.target.value);
                        if (e.target.value && editEndAt) {
                          const s = new Date(e.target.value).getTime();
                          const endT = new Date(editEndAt).getTime();
                          if (endT > s) {
                            const hrs = Math.round(((endT - s) / (1000 * 60 * 60)) * 10) / 10;
                            setEditDuration(`${hrs} hour${hrs === 1 ? '' : 's'}`);
                          }
                        }
                      }}
                      className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/40 rounded-xl text-[#f2f4f3] outline-none font-mono text-xs focus:border-[#a9927d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a9927d] mb-1">
                      Event End Date & Time <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={editEndAt}
                      onChange={(e) => {
                        setEditEndAt(e.target.value);
                        if (editStartAt && e.target.value) {
                          const s = new Date(editStartAt).getTime();
                          const endT = new Date(e.target.value).getTime();
                          if (endT > s) {
                            const hrs = Math.round(((endT - s) / (1000 * 60 * 60)) * 10) / 10;
                            setEditDuration(`${hrs} hour${hrs === 1 ? '' : 's'}`);
                          }
                        }
                      }}
                      className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/40 rounded-xl text-[#f2f4f3] outline-none font-mono text-xs focus:border-[#a9927d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a9927d] mb-1">
                      Registration Opens At
                    </label>
                    <input
                      type="datetime-local"
                      value={editRegOpenAt}
                      onChange={(e) => setEditRegOpenAt(e.target.value)}
                      className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-[#f2f4f3] outline-none font-mono text-xs focus:border-[#a9927d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a9927d] mb-1">
                      Registration Closes At
                    </label>
                    <input
                      type="datetime-local"
                      value={editRegCloseAt}
                      onChange={(e) => setEditRegCloseAt(e.target.value)}
                      className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-[#f2f4f3] outline-none font-mono text-xs focus:border-[#a9927d]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a9927d] mb-1">Duration Label</label>
                  <input
                    type="text"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    placeholder="e.g. 3 hours, 2 days"
                    className="w-full p-2 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-[#f2f4f3] text-xs outline-none focus:border-[#a9927d]"
                  />
                </div>

                {/* Live validation alerts */}
                {editStartAt && editEndAt && new Date(editEndAt).getTime() <= new Date(editStartAt).getTime() && (
                  <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Warning: Event End Date/Time must be after Start Date/Time.</span>
                  </div>
                )}
                {editStartAt && editRegCloseAt && new Date(editRegCloseAt).getTime() > new Date(editStartAt).getTime() && (
                  <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Notice: Registration will automatically close at or before event start.</span>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[#a9927d] font-bold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-[#f2f4f3] outline-none"
                />
              </div>

              {/* Banner Generator & Input inside Edit */}
              <div className="sm:col-span-2 p-4 rounded-2xl bg-[#0a0908] border border-[#a9927d]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#a9927d]">Thematic Header Banner</span>
                  <button
                    type="button"
                    onClick={handleGenerateEditBanner}
                    disabled={generatingEditBanner}
                    className="px-3 py-1.5 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] rounded-lg text-xs font-bold flex items-center gap-1 border border-[#a9927d]/30"
                  >
                    {generatingEditBanner ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3 text-[#a9927d]" />}
                    Generate Thematic Banner
                  </button>
                </div>

                <div className="w-full h-32 rounded-xl overflow-hidden border border-[#a9927d]/30 bg-black">
                  <img src={editPosterPath} alt="Banner" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </div>

                <input
                  type="text"
                  value={editPosterPath}
                  onChange={(e) => setEditPosterPath(e.target.value)}
                  placeholder="Banner Image URL..."
                  className="w-full p-2 bg-[#0a0908] border border-[#a9927d]/30 rounded-lg text-xs text-[#f2f4f3] font-mono outline-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-[#a9927d]/20">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2.5 text-xs text-[#a9927d] hover:text-[#f2f4f3]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleSaveEventDetails(false)}
                disabled={savingEdit}
                className="px-5 py-2.5 bg-[#5e503f] hover:bg-[#78644e] text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold shadow cursor-pointer"
              >
                {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Draft Edits'}
              </button>

              {/* Send Rereview to Admin */}
              <button
                type="button"
                onClick={() => handleSaveEventDetails(true)}
                disabled={savingEdit}
                className="px-5 py-2.5 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-[#a9927d]" />}
                Save Changes & Resubmit for Review
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Live Attendance Session Modal (Presenter Mode) */}
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
