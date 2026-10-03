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
  FileCheck,
  Image as ImageIcon,
  Wand2,
  Building,
  Check
} from 'lucide-react';
import { Society } from '../../shared/types.ts';
import { AIExtractorModal } from '../components/AIExtractorModal.tsx';

export const EventCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const [societies, setSocieties] = useState<Society[]>([]);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatingBanner, setGeneratingBanner] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [societyId, setSocietyId] = useState('');
  const [category, setCategory] = useState('Technical');
  const [venue, setVenue] = useState('Campus 6 Auditorium');
  const [capacity, setCapacity] = useState(250);
  const [posterPath, setPosterPath] = useState('/src/assets/images/tech_event_banner_1791005048820.jpg');

  function toLocalDatetimeInput(d?: Date | string): string {
    if (!d) return '';
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    const YYYY = dateObj.getFullYear();
    const MM = pad(dateObj.getMonth() + 1);
    const DD = pad(dateObj.getDate());
    const hh = pad(dateObj.getHours());
    const mm = pad(dateObj.getMinutes());
    return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
  }

  const defaultStart = new Date(Date.now() + 86400000 * 7);
  defaultStart.setHours(10, 0, 0, 0);
  const defaultEnd = new Date(defaultStart.getTime() + 1000 * 60 * 60 * 6);
  const defaultRegClose = new Date(defaultStart.getTime() - 1000 * 60 * 60 * 12);
  const defaultRegOpen = new Date(Date.now());

  const [startAt, setStartAt] = useState(toLocalDatetimeInput(defaultStart));
  const [endAt, setEndAt] = useState(toLocalDatetimeInput(defaultEnd));
  const [duration, setDuration] = useState('6 hours');
  const [registrationOpenAt, setRegistrationOpenAt] = useState(toLocalDatetimeInput(defaultRegOpen));
  const [registrationCloseAt, setRegistrationCloseAt] = useState(toLocalDatetimeInput(defaultRegClose));

  const [eligibility, setEligibility] = useState('Open to all registered KIIT students across batches.');
  const [rules, setRules] = useState('Standard university code of conduct applies. Valid KIIT ID card required.');
  const [contactDetails, setContactDetails] = useState('convenor@kiit.ac.in | Student Activity Centre');

  // Thematic banner presets
  const thematicPresets = [
    { label: 'Technical', path: '/src/assets/images/tech_event_banner_1791005048820.jpg', cat: 'Technical' },
    { label: 'Cultural', path: '/src/assets/images/cultural_event_banner_1791005060884.jpg', cat: 'Cultural' },
    { label: 'Workshop', path: '/src/assets/images/workshop_event_banner_1791005072133.jpg', cat: 'Workshop' },
    { label: 'Sports', path: '/src/assets/images/sports_event_banner_1791005084694.jpg', cat: 'Sports' },
    { label: 'Literary', path: '/src/assets/images/kiit_lit_banner_1791004918526.jpg', cat: 'Literary' },
    { label: 'Hackathon', path: '/src/assets/images/kiit_tech_banner_1791004884179.jpg', cat: 'Technical' },
  ];

  useEffect(() => {
    async function loadSocieties() {
      try {
        const res = await fetch('/api/v1/societies');
        if (res.ok) {
          const data = await res.json();
          const all: Society[] = data.societies || [];
          
          // Rule 2: A lead can ONLY create events for societies to which they have been assigned
          if (role !== 'ADMIN') {
            const userEmail = (profile?.email || '').toLowerCase().trim();
            const mySocs = all.filter((s: any) => {
              const emails = Array.isArray(s.leadEmails) ? s.leadEmails.map((e: string) => e.toLowerCase().trim()) : [];
              const uids = Array.isArray(s.leadUids) ? s.leadUids : [];
              return (userEmail && emails.includes(userEmail)) ||
                     (profile?.uid && uids.includes(profile.uid)) ||
                     (profile?.assignedSocieties?.includes(s.id));
            });
            setSocieties(mySocs);
            if (mySocs.length > 0) {
              setSocietyId(mySocs[0].id);
            }
          } else {
            setSocieties(all);
            if (all.length > 0) {
              setSocietyId(all[0].id);
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadSocieties();
  }, [profile?.uid, profile?.email, profile?.assignedSocieties, role]);

  // When category changes, auto-select appropriate default banner if not manually overridden
  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const matched = thematicPresets.find((p) => p.cat.toLowerCase() === newCat.toLowerCase());
    if (matched) {
      setPosterPath(matched.path);
    }
  };

  // Generate Thematic Header Image using AI Image Tool
  const handleGenerateBanner = async () => {
    try {
      setGeneratingBanner(true);
      setBannerNotice(null);
      const res = await fetch('/api/v1/ai/generate-thematic-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: name || 'KIIT Campus Event',
          category,
          description,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.bannerUrl) {
          setPosterPath(data.bannerUrl);
          setBannerNotice(`Generated thematic banner aligned with ${category} theme.`);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setGeneratingBanner(false);
    }
  };

  const handleApplyExtractedData = (extracted: any) => {
    if (extracted.name) setName(extracted.name);
    if (extracted.description) setDescription(extracted.description);
    if (extracted.category) handleCategoryChange(extracted.category);
    if (extracted.venue) setVenue(extracted.venue);
    if (extracted.capacity) setCapacity(extracted.capacity);
    if (extracted.duration) setDuration(extracted.duration);
    if (extracted.eligibility) setEligibility(extracted.eligibility);
    if (extracted.rules) setRules(extracted.rules);
    if (extracted.contactDetails) setContactDetails(extracted.contactDetails);
    if (extracted.startAt) {
      try {
        setStartAt(toLocalDatetimeInput(new Date(extracted.startAt)));
      } catch {}
    }
    if (extracted.endAt) {
      try {
        setEndAt(toLocalDatetimeInput(new Date(extracted.endAt)));
      } catch {}
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!societyId) {
      setError('Please select an authorized host society.');
      return;
    }

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
          posterPath: posterPath.trim(),
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
    <div className="min-h-screen bg-[#0a0908] text-[#f2f4f3] py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#a9927d]/20 pb-4">
          <div>
            <Link
              to="/lead"
              className="inline-flex items-center gap-1.5 text-xs text-[#a9927d] hover:text-[#f2f4f3] font-semibold mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to My Lead Workspace
            </Link>
            <h1 className="text-3xl font-black text-[#f2f4f3] tracking-tight">Draft Event Proposal</h1>
            <p className="text-xs text-[#a9927d]">
              Draft an official campus event proposal and generate institutional thematic banner assets for governance review.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-[#a9927d]" />
            Extract Circular with AI
          </button>
        </div>

        {error && (
          <div className="p-4 bg-[#49111c]/60 border border-rose-500/50 text-rose-200 text-xs rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Creation Form */}
        <form onSubmit={handleSubmit} className="bg-[#0a0908] rounded-3xl border border-[#a9927d]/25 p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#a9927d]">Core Event Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#a9927d] mb-1">Event Name / Title</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. KIIT Robotics Conclave 2026"
                  className="w-full p-3 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs font-semibold text-[#f2f4f3] focus:border-[#a9927d] outline-none"
                  required
                />
              </div>

              {/* Host Society Dropdown (Filtered to Lead's Authorized Societies) */}
              <div>
                <label className="block text-xs font-bold text-[#a9927d] mb-1 flex items-center justify-between">
                  <span>Host Society</span>
                  <span className="text-[10px] text-[#a9927d]/70 font-mono">
                    {societies.length} Authorized
                  </span>
                </label>
                {societies.length === 0 ? (
                  <div className="p-2.5 bg-[#49111c]/40 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                    No societies assigned to your account. Contact the platform administrator.
                  </div>
                ) : (
                  <select
                    value={societyId}
                    onChange={(e) => setSocietyId(e.target.value)}
                    className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs font-medium text-[#f2f4f3] focus:border-[#a9927d] outline-none"
                    required
                  >
                    {societies.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#0a0908] text-[#f2f4f3]">
                        {s.name} ({s.category})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#a9927d] mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs font-medium text-[#f2f4f3] focus:border-[#a9927d] outline-none"
                >
                  <option value="Technical" className="bg-[#0a0908]">Technical</option>
                  <option value="Cultural" className="bg-[#0a0908]">Cultural</option>
                  <option value="Literary" className="bg-[#0a0908]">Literary</option>
                  <option value="Sports" className="bg-[#0a0908]">Sports</option>
                  <option value="Workshop" className="bg-[#0a0908]">Workshop</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#a9927d] mb-1">Detailed Description</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide an overview of objectives, schedule, activities, and faculty sponsors..."
                  className="w-full p-3 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs text-[#f2f4f3] focus:border-[#a9927d] outline-none"
                  required
                />
              </div>

              {/* Thematic Event Header Banner Generator (Image Tool) */}
              <div className="sm:col-span-2 p-5 rounded-2xl bg-[#0a0908] border border-[#a9927d]/30 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#a9927d] flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#a9927d]" />
                      Thematic Event Header Banner (16:9)
                    </span>
                    <p className="text-xs text-[#f2f4f3] font-medium mt-0.5">
                      Generate thematic artwork using AI based on event title & category, or choose curated campus presets.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateBanner}
                    disabled={generatingBanner}
                    className="flex items-center gap-2 px-4 py-2 bg-[#49111c] hover:bg-[#631726] disabled:opacity-50 text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold cursor-pointer transition-all shadow shrink-0"
                  >
                    {generatingBanner ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#f2f4f3]" />
                    ) : (
                      <Wand2 className="w-3.5 h-3.5 text-[#a9927d]" />
                    )}
                    Generate Thematic Header
                  </button>
                </div>

                {bannerNotice && (
                  <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {bannerNotice}
                  </p>
                )}

                {/* Live Banner Preview */}
                <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden border border-[#a9927d]/30 bg-black shadow-lg">
                  <img
                    src={posterPath}
                    alt="Event Header Banner Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0908] via-transparent to-transparent opacity-80" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#a9927d] bg-[#0a0908]/90 px-2 py-0.5 rounded border border-[#a9927d]/30">
                        {category} Theme &bull; 16:9 Institutional Banner
                      </span>
                      <h4 className="text-base font-black text-[#f2f4f3] tracking-tight mt-1 truncate max-w-md drop-shadow">
                        {name || 'Event Title Preview'}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Preset Themes Selector */}
                <div className="space-y-2">
                  <span className="text-[10px] text-[#a9927d] font-semibold block uppercase">
                    Select Thematic Banner Preset
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {thematicPresets.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setPosterPath(p.path)}
                        className={`p-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                          posterPath === p.path
                            ? 'bg-[#49111c] border-[#a9927d] text-[#f2f4f3] font-bold shadow'
                            : 'bg-[#0a0908] border-[#a9927d]/20 text-[#a9927d] hover:border-[#a9927d]/50'
                        }`}
                      >
                        <span className="block font-bold truncate">{p.label}</span>
                        <span className="text-[9px] opacity-70">Curated 16:9</span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2">
                    <label className="block text-[11px] font-semibold text-[#a9927d] mb-1">
                      Or Custom Image URL / Path
                    </label>
                    <input
                      type="text"
                      value={posterPath}
                      onChange={(e) => setPosterPath(e.target.value)}
                      placeholder="/src/assets/images/... or https://..."
                      className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs text-[#f2f4f3] font-mono outline-none focus:border-[#a9927d]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule & Location */}
          <div className="space-y-4 pt-4 border-t border-[#a9927d]/20">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#a9927d]">Schedule & Capacity</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#a9927d] mb-1">Campus Venue</label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Campus 6 Auditorium"
                  className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs text-[#f2f4f3] focus:border-[#a9927d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#a9927d] mb-1">Capacity Limit</label>
                <input
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs text-[#f2f4f3] focus:border-[#a9927d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#a9927d] mb-1">Event Start Time</label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs text-[#f2f4f3] focus:border-[#a9927d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#a9927d] mb-1">Event End Time</label>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs text-[#f2f4f3] focus:border-[#a9927d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#a9927d] mb-1">Approximate Duration</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 6 hours"
                  className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs text-[#f2f4f3] focus:border-[#a9927d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#a9927d] mb-1">Registration Closes</label>
                <input
                  type="datetime-local"
                  value={registrationCloseAt}
                  onChange={(e) => setRegistrationCloseAt(e.target.value)}
                  className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs text-[#f2f4f3] focus:border-[#a9927d] outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Governance & Logistics */}
          <div className="space-y-4 pt-4 border-t border-[#a9927d]/20">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#a9927d]">Governance & Participant Rules</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#a9927d] mb-1">Student Eligibility</label>
                <input
                  type="text"
                  value={eligibility}
                  onChange={(e) => setEligibility(e.target.value)}
                  className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs text-[#f2f4f3] focus:border-[#a9927d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#a9927d] mb-1">Event Rules & Disciplinary Guidelines</label>
                <textarea
                  rows={2}
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs text-[#f2f4f3] focus:border-[#a9927d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#a9927d] mb-1">Contact Details & Convenor Email</label>
                <input
                  type="text"
                  value={contactDetails}
                  onChange={(e) => setContactDetails(e.target.value)}
                  className="w-full p-2.5 bg-[#0a0908] border border-[#a9927d]/30 rounded-xl text-xs text-[#f2f4f3] focus:border-[#a9927d] outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#a9927d]/20">
            <Link
              to="/lead"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#a9927d] hover:text-[#f2f4f3] transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading || societies.length === 0}
              className="px-6 py-2.5 bg-[#49111c] hover:bg-[#631726] disabled:opacity-50 text-[#f2f4f3] border border-[#a9927d]/40 rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin text-[#a9927d]" />}
              Save Proposal & Initialize Command Center
            </button>
          </div>
        </form>
      </div>

      <AIExtractorModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onApply={handleApplyExtractedData}
      />
    </div>
  );
};
