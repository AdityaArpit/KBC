import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Shield,
  Loader2,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { Society } from '../../shared/types.ts';
import { AIExtractorModal } from '../components/AIExtractorModal.tsx';

export const EventCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const [societies, setSocieties] = useState<Society[]>([]);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [societyId, setSocietyId] = useState('');
  const [category, setCategory] = useState('Technical');
  const [venue, setVenue] = useState('Main Auditorium');
  const [capacity, setCapacity] = useState(250);

  const defaultStart = new Date(Date.now() + 86400000 * 7);
  defaultStart.setHours(10, 0, 0, 0);
  const defaultEnd = new Date(defaultStart.getTime() + 1000 * 60 * 60 * 6);
  const defaultRegClose = new Date(defaultStart.getTime() - 1000 * 60 * 60 * 12);
  const defaultRegOpen = new Date(Date.now());

  const toInputFormat = (d: Date) => d.toISOString().slice(0, 16);

  const [startAt, setStartAt] = useState(toInputFormat(defaultStart));
  const [endAt, setEndAt] = useState(toInputFormat(defaultEnd));
  const [duration, setDuration] = useState('6 hours');
  const [registrationOpenAt, setRegistrationOpenAt] = useState(toInputFormat(defaultRegOpen));
  const [registrationCloseAt, setRegistrationCloseAt] = useState(toInputFormat(defaultRegClose));

  const [eligibility, setEligibility] = useState('Open to all registered KIIT students across batches.');
  const [rules, setRules] = useState('Standard university code of conduct applies. Valid KIIT ID card required.');
  const [contactDetails, setContactDetails] = useState('convenor@kiit.ac.in | Student Activity Centre');

  useEffect(() => {
    async function loadSocieties() {
      try {
        const res = await fetch('/api/v1/societies');
        if (res.ok) {
          const data = await res.json();
          const all: Society[] = data.societies || [];
          setSocieties(all);
          if (all.length > 0) {
            setSocietyId(all[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadSocieties();
  }, []);

  const handleApplyExtractedData = (extracted: any) => {
    if (extracted.name) setName(extracted.name);
    if (extracted.description) setDescription(extracted.description);
    if (extracted.category) setCategory(extracted.category);
    if (extracted.venue) setVenue(extracted.venue);
    if (extracted.capacity) setCapacity(extracted.capacity);
    if (extracted.duration) setDuration(extracted.duration);
    if (extracted.eligibility) setEligibility(extracted.eligibility);
    if (extracted.rules) setRules(extracted.rules);
    if (extracted.contactDetails) setContactDetails(extracted.contactDetails);
    if (extracted.startAt) {
      try {
        setStartAt(toInputFormat(new Date(extracted.startAt)));
      } catch {}
    }
    if (extracted.endAt) {
      try {
        setEndAt(toInputFormat(new Date(extracted.endAt)));
      } catch {}
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setLoading(true);
      setError(null);

      const startIso = new Date(startAt).toISOString();
      const endIso = new Date(endAt).toISOString();
      const regOpenIso = new Date(registrationOpenAt).toISOString();
      const regCloseIso = new Date(registrationCloseAt).toISOString();

      if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
        throw new Error('Event end date/time must be strictly after start date/time.');
      }

      if (new Date(regCloseIso).getTime() > new Date(startIso).getTime()) {
        throw new Error('Registration closing date/time cannot be after event start.');
      }

      const res = await fetch('/api/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          societyId,
          category,
          venue,
          capacity: Number(capacity),
          duration,
          startAt: startIso,
          endAt: endIso,
          registrationOpenAt: regOpenIso,
          registrationCloseAt: regCloseIso,
          eligibility,
          rules,
          contactDetails,
          actorUid: profile.uid,
          actorEmail: profile.email,
          actorRole: role,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to create event draft');
      }

      const data = await res.json();
      navigate(`/lead/events/${data.event.id}/operations`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link to="/lead" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-semibold mb-2">
              <ArrowLeft className="w-4 h-4" /> Back to Lead Workspace
            </Link>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create Event Proposal</h1>
            <p className="text-xs text-slate-500">Draft an event and submit to platform administrators for governance review</p>
          </div>

          <button
            type="button"
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            Paste Circular with Gemini
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Creation Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Core Event Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Event Name / Title</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. KIIT Robotics Conclave 2026"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Host Society</label>
                <select
                  value={societyId}
                  onChange={(e) => setSocietyId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                >
                  {societies.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Technical">Technical</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Literary">Literary</option>
                  <option value="Sports">Sports</option>
                  <option value="Workshop">Workshop</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Description</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide an overview of objectives, activities, and faculty sponsors..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Schedule & Logistics */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Schedule & Logistics</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">End Date & Time</label>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Duration</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 6 hours, 2 Days"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Primary Venue</label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Attendee Capacity Limit</label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  min={1}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Registration Windows */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Registration Configuration</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Registration Opens At</label>
                <input
                  type="datetime-local"
                  value={registrationOpenAt}
                  onChange={(e) => setRegistrationOpenAt(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Registration Closes At</label>
                <input
                  type="datetime-local"
                  value={registrationCloseAt}
                  onChange={(e) => setRegistrationCloseAt(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Guidelines & Rules */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Compliance & Contact</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Eligibility</label>
                <input
                  type="text"
                  value={eligibility}
                  onChange={(e) => setEligibility(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rules & Guidelines</label>
                <input
                  type="text"
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Details</label>
                <input
                  type="text"
                  value={contactDetails}
                  onChange={(e) => setContactDetails(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              Draft will be saved privately in Firestore and will not be visible on public campus pages until approved.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition-all"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Draft & Open Command Center
            </button>
          </div>
        </form>

        {/* AI Extractor Modal */}
        <AIExtractorModal
          isOpen={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          onExtracted={handleApplyExtractedData}
        />
      </div>
    </div>
  );
};
