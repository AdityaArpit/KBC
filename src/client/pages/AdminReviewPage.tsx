import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Shield,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Calendar,
  MapPin,
  Users,
  Loader2,
  FileText,
  History
} from 'lucide-react';
import { CampusEvent, EventRevision } from '../../shared/types.ts';

export const AdminReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, role } = useAuth();

  const [event, setEvent] = useState<CampusEvent | null>(null);
  const [revisions, setRevisions] = useState<EventRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review Feedback input
  const [feedback, setFeedback] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedAction, setSelectedAction] = useState<'APPROVE' | 'REQUEST_CHANGES' | 'REJECT'>('APPROVE');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [evRes, revRes] = await Promise.all([
          fetch(`/api/v1/events/${id}?callerRole=ADMIN`),
          fetch(`/api/v1/events/${id}/revisions`),
        ]);

        if (evRes.ok) {
          const evData = await evRes.json();
          setEvent(evData.event);
        }
        if (revRes.ok) {
          const revData = await revRes.json();
          setRevisions(revData.revisions || []);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (selectedAction === 'REQUEST_CHANGES' && !feedback.trim()) {
      setError('Actionable feedback is required when requesting changes.');
      return;
    }

    if (selectedAction === 'REJECT' && !rejectionReason.trim()) {
      setError('Rejection reason is required.');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const res = await fetch(`/api/v1/events/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction,
          feedback: selectedAction === 'REQUEST_CHANGES' ? feedback : undefined,
          rejectionReason: selectedAction === 'REJECT' ? rejectionReason : undefined,
          actorRole: 'ADMIN',
          actorUid: profile.uid,
          actorEmail: profile.email,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to submit review');
      }

      navigate('/admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 text-white">
        <div className="text-center space-y-3">
          <p className="text-sm font-bold text-slate-300">Event proposal not found.</p>
          <Link to="/admin" className="text-xs text-rose-400 underline">Back to Governance Panel</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div>
          <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-semibold mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Governance Panel
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
              Administrative Review Portal
            </span>
            <span className="text-xs text-slate-500 font-mono">ID: {event.id}</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mt-1">{event.name}</h1>
        </div>

        {error && (
          <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-2xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Proposal Details & Revisions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Proposal Summary</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">{event.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
                <div className="space-y-1">
                  <span className="text-slate-500">Host Society</span>
                  <p className="text-slate-200 font-semibold">{event.societyName}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500">Requested Primary Venue</span>
                  <p className="text-emerald-400 font-semibold">{event.venue}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500">Date & Duration</span>
                  <p className="text-slate-200 font-semibold">
                    {new Date(event.startAt).toLocaleDateString()} ({event.duration})
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500">Max Attendee Capacity</span>
                  <p className="text-slate-200 font-semibold">{event.capacity} seats</p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] block">Eligibility Criteria</span>
                  <p className="text-slate-300 mt-0.5">{event.eligibility}</p>
                </div>

                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] block">Campus Code & Rules</span>
                  <p className="text-slate-300 mt-0.5">{event.rules}</p>
                </div>
              </div>
            </div>

            {/* Revision History */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <History className="w-4 h-4 text-rose-400" />
                Preserved Revision History ({revisions.length})
              </h3>

              {revisions.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No previous revisions recorded.</p>
              ) : (
                <div className="space-y-3">
                  {revisions.map((rev) => (
                    <div key={rev.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white font-mono">Revision #{rev.revisionNumber}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rev.reviewStatus === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' : rev.reviewStatus === 'CHANGES_REQUESTED' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {rev.reviewStatus}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Submitted on {new Date(rev.submittedAt).toLocaleString()} by {rev.submittedByName || rev.submittedBy}
                      </p>
                      {rev.feedback && (
                        <p className="text-amber-300 bg-amber-950/40 p-2.5 rounded-xl border border-amber-900/50 text-[11px]">
                          Admin Feedback: {rev.feedback}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Review Action Box */}
          <div className="space-y-6">
            <form onSubmit={handleReviewSubmit} className="bg-slate-900 border-2 border-rose-500/40 rounded-3xl p-6 space-y-5 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-rose-400" />
                Administrative Determination
              </h3>

              {/* Action Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400">Review Action</label>
                
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAction('APPROVE')}
                    className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                      selectedAction === 'APPROVE'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      APPROVE & PUBLISH
                    </span>
                    <span className="text-[10px] uppercase font-mono opacity-80">Public</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAction('REQUEST_CHANGES')}
                    className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                      selectedAction === 'REQUEST_CHANGES'
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      REQUEST CHANGES
                    </span>
                    <span className="text-[10px] uppercase font-mono opacity-80">Iterate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAction('REJECT')}
                    className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                      selectedAction === 'REJECT'
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      REJECT PROPOSAL
                    </span>
                    <span className="text-[10px] uppercase font-mono opacity-80">Decline</span>
                  </button>
                </div>
              </div>

              {/* Conditional Feedback Inputs */}
              {selectedAction === 'REQUEST_CHANGES' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <label className="block text-xs font-bold text-amber-400">
                    Actionable Review Feedback (Required)
                  </label>
                  <textarea
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Specify what modifications are required (e.g. adjust capacity, submit estate clearance)..."
                    className="w-full p-3 bg-slate-950 border border-amber-500/50 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              )}

              {selectedAction === 'REJECT' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <label className="block text-xs font-bold text-rose-400">
                    Rejection Reason (Required)
                  </label>
                  <textarea
                    rows={4}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="State administrative justification for declining proposal..."
                    className="w-full p-3 bg-slate-950 border border-rose-500/50 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recording Determination...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Commit Decision
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
