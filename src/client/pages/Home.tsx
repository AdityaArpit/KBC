import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Users,
  Radio,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  GitBranch,
  QrCode,
  RefreshCw,
  BookOpen,
  ArrowUpRight,
  Clock,
  Compass,
  CheckCircle2
} from 'lucide-react';
import { CampusEvent, Society } from '../../shared/types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Hero } from '../../components/ui/animated-hero.tsx';
import Velaris from '../../components/ui/velaris.tsx';
import { GlowCard } from '../../components/ui/spotlight-card.tsx';
import { SqueezeCarousel, SqueezeSlide } from '../../components/ui/carousel-squeeze.tsx';
import { BentoGrid, BentoCard } from '../../components/ui/bento-grid.tsx';

export const Home: React.FC = () => {
  const { profile, role, signInWithGoogle } = useAuth();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [evRes, socRes] = await Promise.all([
          fetch('/api/v1/events'),
          fetch('/api/v1/societies'),
        ]);

        if (evRes.ok) {
          const evData = await evRes.json();
          setEvents(evData.events || []);
        }

        if (socRes.ok) {
          const socData = await socRes.json();
          setSocieties(socData.societies || []);
        }
      } catch (err) {
        console.error('Failed to load portal data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const ongoingEvents = events.filter((e) => {
    const now = Date.now();
    return new Date(e.startAt).getTime() <= now && new Date(e.endAt).getTime() >= now;
  });

  const upcomingEvents = events.filter((e) => {
    return new Date(e.startAt).getTime() > Date.now();
  });

  // Prepare slides for SqueezeCarousel
  const carouselSlides: SqueezeSlide[] = (upcomingEvents.length > 0 ? upcomingEvents : events).map((evt) => ({
    id: evt.id,
    title: evt.name,
    societyName: evt.societyName,
    venue: evt.venue,
    dateStr: new Date(evt.startAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
    description: evt.description,
    image: evt.posterPath || '/src/assets/images/tech_event_banner_1791005048820.jpg',
    action: 'Event Details & Passes',
    href: `/events/${evt.id}`,
  }));

  return (
    <div className="min-h-screen bg-[#0a0908] text-[#f2f4f3] flex flex-col relative overflow-hidden">
      
      {/* 1. HERO SECTION WITH LIVING MOTION VELARIS WEBGL BACKGROUND */}
      <section className="relative w-full overflow-hidden border-b border-[#a9927d]/20">
        <Velaris
          bg="#0a0908"
          colors={["#49111c", "#5e503f", "#a9927d", "#0a0908"]}
          speed={1.4}
          grain={0.16}
          height="auto"
          className="w-full pb-10"
        >
          <div className="pt-6 sm:pt-10">
            <Hero />
          </div>
        </Velaris>
      </section>

      {/* 2. MAIN OPERATIONAL BODY */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20 w-full relative z-10">
        
        {/* SECTION A: HAPPENING NOW / LIVE GATE INGRESS */}
        {ongoingEvents.length > 0 && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#a9927d]/20 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#f2f4f3] tracking-tight flex items-center gap-2">
                    Live Operations On Campus
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase tracking-widest font-mono">
                      Gate Open
                    </span>
                  </h2>
                  <p className="text-xs text-[#a9927d]">
                    Live attendance check-in, real-time gate ingress, and continuous operations ledger
                  </p>
                </div>
              </div>

              <Link
                to="/ongoing"
                className="text-xs font-bold text-[#a9927d] hover:text-[#f2f4f3] flex items-center gap-1.5 transition-colors"
              >
                View Live Directory <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ongoingEvents.map((evt) => (
                <GlowCard
                  key={evt.id}
                  glowColor="red"
                  customSize
                  className="p-6 border border-[#a9927d]/30 rounded-3xl bg-[#0a0908]/90 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 bg-[#49111c] text-[#f2f4f3] rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border border-[#a9927d]/40">
                        <Radio className="w-3 h-3 animate-pulse text-rose-300" />
                        LIVE NOW
                      </span>
                      <span className="text-xs font-mono text-[#a9927d] font-semibold">{evt.societyName}</span>
                    </div>

                    <h3 className="text-xl font-bold text-[#f2f4f3] leading-snug">{evt.name}</h3>
                    <p className="text-xs text-[#a9927d] line-clamp-2 leading-relaxed">{evt.description}</p>
                  </div>

                  <div className="pt-4 border-t border-[#a9927d]/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-[#a9927d]">
                      <MapPin className="w-4 h-4 text-[#a9927d]" />
                      {evt.venue}
                    </span>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/events/${evt.id}`}
                        className="px-4 py-2 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] rounded-xl font-bold transition-all shadow border border-[#a9927d]/30"
                      >
                        Event Ingress & Details
                      </Link>
                    </div>
                  </div>
                </GlowCard>
              ))}
            </div>
          </section>
        )}

        {/* SECTION B: UPCOMING EVENTS SQUEEZE CAROUSEL (AUTOMATED & MANUAL, SEPARATE POSTER & DETAILS) */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#a9927d]/20 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#49111c]/60 text-[#a9927d] border border-[#a9927d]/30">
                  Automated Stage Spotlight
                </span>
                <span className="text-xs text-[#a9927d] font-mono">16:9 Architectural Squeeze</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#f2f4f3] tracking-tight mt-1">
                Upcoming University Events
              </h2>
              <p className="text-xs text-[#a9927d]">
                Hover or cycle through featured institutional events. Artwork is framed separately from event details to ensure visual clarity.
              </p>
            </div>

            <Link
              to="/events"
              className="text-xs font-bold text-[#a9927d] hover:text-[#f2f4f3] flex items-center gap-1 shrink-0"
            >
              Browse Complete Schedule <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="h-72 rounded-3xl bg-[#0a0908] border border-[#a9927d]/20 animate-pulse flex items-center justify-center text-xs text-[#a9927d]">
              Loading upcoming event schedule...
            </div>
          ) : carouselSlides.length === 0 ? (
            <div className="text-center py-16 bg-[#0a0908] rounded-3xl border border-[#a9927d]/20 p-8 space-y-3">
              <Calendar className="w-12 h-12 text-[#a9927d]/40 mx-auto" />
              <p className="text-sm font-semibold text-[#f2f4f3]">No upcoming events published at this moment.</p>
              <p className="text-xs text-[#a9927d]">Check back soon or explore student societies.</p>
            </div>
          ) : (
            <div className="p-4 sm:p-6 rounded-3xl liquid-glass-card border border-[#a9927d]/25 shadow-2xl">
              <SqueezeCarousel
                slides={carouselSlides}
                autoplay={true}
                interval={5000}
                hoverGrow={true}
                controls={true}
                height="clamp(220px, 30vw, 340px)"
                radius={16}
                gap={16}
                slatGap={10}
                slatWidth={12}
                accent="#49111c"
                accentForeground="#f2f4f3"
                label="Upcoming KIIT Campus Events"
              />
            </div>
          )}
        </section>

        {/* SECTION C: INSTITUTIONAL ARCHITECTURE BENTO GRID */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#a9927d] bg-[#49111c]/60 px-3 py-1 rounded-full border border-[#a9927d]/30">
              KBC Operational Blueprint
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#f2f4f3] tracking-tight">
              Enterprise Event Governance
            </h2>
            <p className="text-xs sm:text-sm text-[#a9927d] leading-relaxed">
              Designed for zero-fail student event execution, high-density gate ingress, and transparent administrative oversight.
            </p>
          </div>

          <BentoGrid className="pt-4">
            {/* Bento Card 1: Dependency Graph Engine */}
            <BentoCard
              title="Graph-Based Dependency Engine"
              description="Real-time BFS traversal models sessions, speakers, VIP convoys, AV rigs, and venue allocations with automated circularity prevention."
              badge="Deterministic Engine"
              icon={<GitBranch className="w-5 h-5 text-[#a9927d]" />}
              className="md:col-span-2"
              header={
                <div className="w-full h-full bg-gradient-to-tr from-[#49111c]/40 via-[#0a0908] to-[#5e503f]/20 p-4 flex flex-col justify-between rounded-2xl border border-[#a9927d]/20">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#a9927d]">
                    <span>Node Traversal: Old Venue &rarr; Target Hall</span>
                    <span className="text-emerald-400 font-bold">&check; 0 Cycle Violations</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="p-2 rounded-xl bg-[#0a0908]/80 border border-[#a9927d]/30">Keynote Sessions</div>
                    <div className="p-2 rounded-xl bg-[#0a0908]/80 border border-[#a9927d]/30">AV Rig Logistics</div>
                    <div className="p-2 rounded-xl bg-[#0a0908]/80 border border-[#a9927d]/30">Student Broadcasts</div>
                  </div>
                </div>
              }
            />

            {/* Bento Card 2: Live Gate Attendance */}
            <BentoCard
              title="Timed QR Ingress & Excel Export"
              description="Cryptographic attendance tokens, roll-number ingress, and streaming .xlsx workbooks formatted for institutional submission."
              badge="Gate Ops"
              icon={<QrCode className="w-5 h-5 text-[#a9927d]" />}
              className="md:col-span-1"
            />

            {/* Bento Card 3: Dual Notion & Firestore Mirroring */}
            <BentoCard
              title="Notion Workspace Knowledge Sync"
              description="Continuous bidirectional synchronization connecting Firestore operational documents to institutional Notion databases."
              badge="Knowledge Hub"
              icon={<BookOpen className="w-5 h-5 text-[#a9927d]" />}
              className="md:col-span-1"
            />

            {/* Bento Card 4: Administrative Governance */}
            <BentoCard
              title="Strict University Governance & RBAC"
              description="Role-isolated commands where student leads command only assigned societies, and administrators maintain review approval and deletion sovereignty."
              badge="Authority Boundary"
              icon={<Shield className="w-5 h-5 text-[#a9927d]" />}
              className="md:col-span-2"
              header={
                <div className="w-full h-full bg-gradient-to-r from-[#0a0908] via-[#49111c]/30 to-[#0a0908] p-4 rounded-2xl border border-[#a9927d]/20 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#a9927d] uppercase font-bold">University Verification</span>
                    <h4 className="text-sm font-bold text-[#f2f4f3]">Verified @kiit.ac.in Multi-Tenant Boundaries</h4>
                  </div>
                  <div className="px-3 py-1 rounded-xl bg-[#49111c] text-[#f2f4f3] font-bold text-xs border border-[#a9927d]/40">
                    Active RBAC
                  </div>
                </div>
              }
            />
          </BentoGrid>
        </section>

        {/* SECTION D: SOCIETIES SPOTLIGHT WITH GLOW CARDS */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#a9927d]/20 pb-4">
            <div>
              <h2 className="text-2xl font-black text-[#f2f4f3] tracking-tight">KIIT Student Societies</h2>
              <p className="text-xs text-[#a9927d]">
                Apex governance, technical collectives, cultural clubs, and literary wings
              </p>
            </div>
            <Link
              to="/societies"
              className="text-xs font-bold text-[#a9927d] hover:text-[#f2f4f3] flex items-center gap-1.5 transition-colors"
            >
              Explore All Societies <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {societies.map((soc) => (
              <GlowCard
                key={soc.id}
                glowColor="red"
                customSize
                className="p-5 rounded-3xl border border-[#a9927d]/25 bg-[#0a0908] hover:border-[#a9927d]/60 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <img
                      src={soc.logoPath || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=300&q=80'}
                      alt={soc.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-[#a9927d]/30 group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#a9927d] bg-[#49111c]/60 px-2.5 py-0.5 rounded-full border border-[#a9927d]/30">
                      {soc.category}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-[#f2f4f3] group-hover:text-[#a9927d] transition-colors line-clamp-1">
                      {soc.name}
                    </h3>
                    <p className="text-xs text-[#a9927d] line-clamp-2 mt-1 leading-relaxed">
                      {soc.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#a9927d]/20 flex items-center justify-between text-xs text-[#a9927d] group-hover:text-[#f2f4f3] font-semibold">
                  <Link to={`/societies/${soc.id}`} className="flex items-center justify-between w-full">
                    <span>View Mandate & Events</span>
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </Link>
                </div>
              </GlowCard>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
