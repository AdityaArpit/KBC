import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MoveRight, Radio, Shield, Sparkles, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/src/client/context/AuthContext.tsx";

interface HeroProps {
  onExploreClick?: () => void;
}

function Hero({ onExploreClick }: HeroProps) {
  const [titleNumber, setTitleNumber] = useState(0);
  const { profile, role, signInWithGoogle } = useAuth();

  const titles = useMemo(
    () => ["dependency-aware", "live-synchronized", "verified KIIT", "zero-trust", "intelligent"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2400);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="w-full relative z-10">
      <div className="container mx-auto px-4">
        <div className="flex gap-6 py-12 lg:py-24 items-center justify-center flex-col text-center">
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#49111c]/30 border border-[#a9927d]/40 text-[#a9927d] text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#a9927d] animate-pulse"></span>
              KBC-NOTION-03 Campus Architecture
            </div>
          </motion.div>

          {/* Main Title with Animated Words */}
          <div className="flex gap-3 flex-col max-w-4xl">
            <h1 className="text-4xl sm:text-6xl md:text-7xl tracking-tighter text-center font-extrabold text-[#f2f4f3] leading-tight">
              <span>Campus events powered by</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-2 md:pt-1">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-black bg-gradient-to-r from-[#a9927d] via-[#f2f4f3] to-[#a9927d] bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: "-100%" }}
                    transition={{ type: "spring", stiffness: 60, damping: 15 }}
                    animate={
                      titleNumber === index
                        ? {
                            y: "0%",
                            opacity: 1,
                          }
                        : {
                            y: titleNumber > index ? "-120%" : "120%",
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
              <span className="text-[#a9927d]">operations intelligence.</span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg leading-relaxed tracking-tight text-[#a9927d]/90 max-w-2xl mx-auto pt-2">
              The authoritative command center for KIIT University societies. Featuring automated dependency impact analysis, instant QR attendance, and bidirectional Notion knowledge orchestration.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link to="/events">
              <Button size="lg" className="gap-2 bg-[#49111c] text-[#f2f4f3] hover:bg-[#631726] border border-[#a9927d]/40 shadow-xl shadow-[#49111c]/30 rounded-2xl">
                Explore Events <MoveRight className="w-4 h-4" />
              </Button>
            </Link>

            {role === 'LEAD' ? (
              <Link to="/lead">
                <Button size="lg" variant="outline" className="gap-2 border-[#a9927d]/40 text-[#f2f4f3] bg-[#0a0908]/70 hover:bg-[#5e503f]/40 rounded-2xl">
                  <Layers className="w-4 h-4 text-[#a9927d]" /> Open Lead Centre
                </Button>
              </Link>
            ) : role === 'ADMIN' ? (
              <Link to="/admin">
                <Button size="lg" variant="outline" className="gap-2 border-[#a9927d]/40 text-[#f2f4f3] bg-[#0a0908]/70 hover:bg-[#49111c]/40 rounded-2xl">
                  <Shield className="w-4 h-4 text-rose-400" /> Admin Governance
                </Button>
              </Link>
            ) : !profile ? (
              <Button
                onClick={signInWithGoogle}
                size="lg"
                variant="outline"
                className="gap-2 border-[#a9927d]/40 text-[#f2f4f3] bg-[#0a0908]/70 hover:bg-[#5e503f]/40 rounded-2xl"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-4 h-4 bg-white rounded-full p-0.5" />
                KIIT Account Sign-In
              </Button>
            ) : (
              <Link to="/profile">
                <Button size="lg" variant="outline" className="gap-2 border-[#a9927d]/40 text-[#f2f4f3] bg-[#0a0908]/70 hover:bg-[#5e503f]/40 rounded-2xl">
                  Roll: #{profile.rollNumber || 'VERIFIED'}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { Hero };
