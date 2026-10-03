import React from "react";
import { Link } from "react-router-dom";
import { MoveLeft, Radio, Compass } from "lucide-react";
import { Button } from "./button.tsx";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0a0908] text-[#f2f4f3] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow in palette colors */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#49111c]/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-md w-full text-center space-y-6 relative z-10 liquid-glass-card p-10 rounded-3xl border border-[#a9927d]/20">
        <div className="w-16 h-16 rounded-2xl bg-[#49111c]/40 border border-[#a9927d]/30 text-[#a9927d] flex items-center justify-center mx-auto shadow-inner">
          <Compass className="w-8 h-8 animate-spin" style={{ animationDuration: '10s' }} />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono tracking-widest text-[#a9927d] uppercase font-bold">
            HTTP 404 &bull; Command Route Missing
          </span>
          <h1 className="text-4xl font-black text-[#f2f4f3] tracking-tight">Out of Operational Scope</h1>
          <p className="text-xs text-[#a9927d] leading-relaxed">
            The event, operations desk, or society route you requested has been relocated or is not published yet.
          </p>
        </div>

        <div className="pt-2 flex justify-center">
          <Link to="/">
            <Button size="default" className="gap-2 bg-[#49111c] hover:bg-[#631726] text-[#f2f4f3] border border-[#a9927d]/30 rounded-xl">
              <MoveLeft className="w-4 h-4" /> Return to Campus Portal
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
