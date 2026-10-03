import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  Sparkles,
  Users,
  Wrench,
  X,
  Send,
  Loader2,
  GitBranch
} from 'lucide-react';
import { CampusEvent, ImpactAnalysisResult } from '../../shared/types.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface HeroImpactModalProps {
  event: CampusEvent;
  isOpen: boolean;
  onClose: () => void;
  onApplied: () => void;
}

const VENUE_OPTIONS = [
  'Seminar Hall, Campus 6',
  'Campus 15 Lab Complex',
  'Open Air Amphitheatre, Campus 3',
  'Auditorium, Campus 7',
  'Main Auditorium',
  'Conference Room B, KSAC',
];

export const HeroImpactModal: React.FC<HeroImpactModalProps> = ({
  event,
  isOpen,
  onClose,
  onApplied,
}) => {
  const { profile, role } = useAuth();
  const [selectedVenue, setSelectedVenue] = useState(
    event.venue === 'Main Auditorium' ? 'Seminar Hall, Campus 6' : 'Main Auditorium'
  );
  const [reason, setReason] = useState('Logistics optimization and stage seating capacity realignment.');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [impact, setImpact] = useState<ImpactAnalysisResult | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunImpactAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      setAppliedSuccess(false);

      const res = await fetch(`/api/v1/events/${event.id}/impact/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newVenue: selectedVenue,
          reason,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to compute impact analysis.');
      }

      const data = await res.json();
      setImpact(data.impact);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyChanges = async () => {
    try {
      setApplying(true);
      setError(null);

      const res = await fetch(`/api/v1/events/${event.id}/impact/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newVenue: selectedVenue,
          reason,
          actorUid: profile?.uid || 'lead_user',
          actorEmail: profile?.email || 'lead@kiit.ac.in',
          actorRole: role,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to apply venue changes.');
      }

      setAppliedSuccess(true);
      setTimeout(() => {
        onApplied();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  const getRiskBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-3 py-1 bg-red-100 text-red-800 border border-red-300 rounded-full font-bold text-xs uppercase tracking-wide">CRITICAL RISK</span>;
      case 'HIGH':
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full font-bold text-xs uppercase tracking-wide">HIGH OPERATIONAL RISK</span>;
      case 'MEDIUM':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-full font-bold text-xs uppercase tracking-wide">MEDIUM RISK</span>;
      default:
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full font-bold text-xs uppercase tracking-wide">LOW RISK</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a0908] rounded-3xl shadow-2xl border border-[#a9927d]/30 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#141210] border-b border-[#a9927d]/20 text-[#f2f4f3] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#49111c]/60 text-[#a9927d] border border-[#a9927d]/40">
              <GitBranch className="w-5 h-5 text-[#a9927d]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-[#a9927d]">Dependency Graph Engine</span>
                <span className="text-[10px] bg-[#49111c]/60 text-[#f2f4f3] border border-[#a9927d]/30 px-2 py-0.5 rounded-full">Core Architecture</span>
              </div>
              <h2 className="text-lg font-bold text-[#f2f4f3] tracking-tight">Venue Change Impact Analysis</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#a9927d] hover:text-[#f2f4f3] hover:bg-[#5e503f]/30 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {appliedSuccess ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <h3 className="text-2xl font-bold text-[#f2f4f3]">Venue Change Applied Successfully!</h3>
              <p className="text-[#a9927d] max-w-md mx-auto text-sm">
                Operational records updated, 3 follow-up logistics tasks generated, registered student notifications queued, and Notion knowledge base synchronized.
              </p>
            </div>
          ) : (
            <>
              {/* Step 1: Venue Configuration */}
              <div className="bg-[#141210] border border-[#a9927d]/20 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#f2f4f3] uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#a9927d]" />
                  Target Venue Simulation
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#a9927d] mb-1">Current Event Venue</label>
                    <div className="p-3 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-[#f2f4f3] font-semibold text-sm flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#a9927d]"></div>
                      {event.venue}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a9927d] mb-1">New Target Venue</label>
                    <select
                      value={selectedVenue}
                      onChange={(e) => setSelectedVenue(e.target.value)}
                      className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/40 rounded-xl text-[#f2f4f3] font-semibold text-sm focus:border-[#a9927d] outline-none cursor-pointer"
                    >
                      {VENUE_OPTIONS.filter((v) => v !== event.venue).map((v) => (
                        <option key={v} value={v} className="bg-[#0a0908] text-[#f2f4f3]">{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a9927d] mb-1">Operational Reason for Relocation</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-[#f2f4f3] placeholder-[#a9927d]/40 text-sm focus:border-[#a9927d] outline-none"
                    placeholder="Enter administrative rationale..."
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleRunImpactAnalysis}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#49111c] hover:bg-[#631726] border border-[#a9927d]/40 disabled:opacity-50 text-[#f2f4f3] rounded-xl font-bold text-sm shadow-lg transition-all cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#a9927d]" />
                        Traversing Dependency Graph...
                      </>
                    ) : (
                      <>
                        <GitBranch className="w-4 h-4 text-[#a9927d]" />
                        Run Impact Analysis
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Step 2: Computed Impact Analysis Output */}
              {impact && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Risk Banner */}
                  <div className="p-4 rounded-2xl bg-[#141210] border border-[#a9927d]/30 text-[#f2f4f3] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-mono tracking-wider text-[#a9927d]">Operational Risk Rating:</span>
                        {getRiskBadge(impact.calculatedRisk)}
                      </div>
                      <p className="text-xs text-[#a9927d]">
                        {impact.riskReasons.join(' ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-xs text-[#a9927d] block font-mono">Affected Entities</span>
                        <span className="text-xl font-black text-[#f2f4f3]">
                          {impact.affectedSessions.length + impact.affectedResources.length + impact.affectedTasks.length + impact.affectedVolunteers.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Impact Breakdown Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Affected Sessions */}
                    <div className="p-4 rounded-2xl border border-[#a9927d]/20 bg-[#141210] shadow-sm space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#a9927d] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-[#a9927d]" />
                          Affected Sessions ({impact.affectedSessions.length})
                        </span>
                        <span className="text-[10px] font-mono text-[#a9927d]/70">Stage Re-calibration</span>
                      </h4>
                      {impact.affectedSessions.length === 0 ? (
                        <p className="text-xs text-[#a9927d]/60 italic">No scheduled sessions directly affected.</p>
                      ) : (
                        <ul className="space-y-2">
                          {impact.affectedSessions.map((s) => (
                            <li key={s.id} className="p-2.5 rounded-xl bg-[#0a0908] border border-[#a9927d]/20 text-xs">
                              <p className="font-bold text-[#f2f4f3]">{s.title}</p>
                              <p className="text-[#a9927d] text-[11px] mt-0.5">Time: {s.time}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Affected Resources & Equipment */}
                    <div className="p-4 rounded-2xl border border-[#a9927d]/20 bg-[#141210] shadow-sm space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#a9927d] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Wrench className="w-4 h-4 text-[#a9927d]" />
                          Affected Resources ({impact.affectedResources.length})
                        </span>
                        <span className="text-[10px] font-mono text-[#a9927d]/70">Relocation Check</span>
                      </h4>
                      {impact.affectedResources.length === 0 ? (
                        <p className="text-xs text-[#a9927d]/60 italic">No hardware resources assigned.</p>
                      ) : (
                        <ul className="space-y-2">
                          {impact.affectedResources.map((r) => (
                            <li key={r.id} className="p-2.5 rounded-xl bg-[#0a0908] border border-[#a9927d]/20 text-xs">
                              <div className="flex justify-between font-bold text-[#f2f4f3]">
                                <span>{r.name}</span>
                                <span className="text-[#a9927d]">Qty: {r.quantity}</span>
                              </div>
                              <p className="text-amber-400 text-[11px] mt-0.5">{r.issue}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Affected Volunteers */}
                    <div className="p-4 rounded-2xl border border-[#a9927d]/20 bg-[#141210] shadow-sm space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#a9927d] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-[#a9927d]" />
                          Affected Volunteers ({impact.affectedVolunteers.length})
                        </span>
                        <span className="text-[10px] font-mono text-[#a9927d]/70">Shift Re-briefing</span>
                      </h4>
                      {impact.affectedVolunteers.length === 0 ? (
                        <p className="text-xs text-[#a9927d]/60 italic">No volunteer shifts in current venue.</p>
                      ) : (
                        <ul className="space-y-2">
                          {impact.affectedVolunteers.map((v) => (
                            <li key={v.id} className="p-2.5 rounded-xl bg-[#0a0908] border border-[#a9927d]/20 text-xs flex justify-between items-center">
                              <div>
                                <p className="font-bold text-[#f2f4f3]">{v.name}</p>
                                <p className="text-[#a9927d] text-[11px]">Role: {v.role}</p>
                              </div>
                              <span className="font-mono text-[10px] bg-[#5e503f]/50 border border-[#a9927d]/30 text-[#f2f4f3] px-2 py-0.5 rounded">
                                {v.shift}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Affected Tasks */}
                    <div className="p-4 rounded-2xl border border-[#a9927d]/20 bg-[#141210] shadow-sm space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#a9927d] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-[#a9927d]" />
                          Affected Tasks ({impact.affectedTasks.length})
                        </span>
                        <span className="text-[10px] font-mono text-[#a9927d]/70">Downstream Impact</span>
                      </h4>
                      {impact.affectedTasks.length === 0 ? (
                        <p className="text-xs text-[#a9927d]/60 italic">No dependent tasks affected.</p>
                      ) : (
                        <ul className="space-y-2">
                          {impact.affectedTasks.map((t) => (
                            <li key={t.id} className="p-2.5 rounded-xl bg-[#0a0908] border border-[#a9927d]/20 text-xs">
                              <p className="font-bold text-[#f2f4f3]">{t.title}</p>
                              <div className="flex justify-between text-[#a9927d] text-[11px] mt-0.5">
                                <span>Owner: {t.owner}</span>
                                <span className="font-semibold text-rose-400">{t.priority}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Required Communication Actions */}
                  <div className="p-4 rounded-2xl border border-[#a9927d]/30 bg-[#49111c]/20 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#f2f4f3] flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-[#a9927d]" />
                      Required Automated & Protocol Communications ({impact.requiredCommunicationActions.length})
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-[#a9927d]">
                      {impact.requiredCommunicationActions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Gemini AI Explanation Section */}
                  {impact.aiExplanation && (
                    <div className="p-4 rounded-2xl border border-[#a9927d]/30 bg-[#141210] space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#a9927d]" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#f2f4f3]">
                          Gemini Operations Intelligence Briefing
                        </h4>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#49111c] text-[#f2f4f3] border border-[#a9927d]/40">
                          AI-Verified
                        </span>
                      </div>
                      <div className="text-xs text-[#a9927d] leading-relaxed whitespace-pre-line font-normal">
                        {impact.aiExplanation}
                      </div>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#a9927d]/20">
                    <button
                      onClick={() => setImpact(null)}
                      className="px-4 py-2 border border-[#a9927d]/40 rounded-xl text-[#a9927d] hover:text-[#f2f4f3] hover:bg-[#5e503f]/20 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Cancel & Re-evaluate
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleApplyChanges}
                        disabled={applying}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#49111c] hover:bg-[#631726] border border-[#a9927d]/40 disabled:opacity-50 text-[#f2f4f3] rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer"
                      >
                        {applying ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-[#a9927d]" />
                            Applying & Syncing to Notion...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Apply Changes & Trigger Operations
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
