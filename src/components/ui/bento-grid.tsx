import React from "react";
import { GitBranch, QrCode, Sparkles, BookOpen, Shield, ArrowUpRight } from "lucide-react";
import { GlowCard } from "./spotlight-card.tsx";
import { cn } from "@/lib/utils";

export interface BentoItem {
  title: string;
  description: string;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  badge?: string;
}

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-5 max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoCard = ({
  className,
  title,
  description,
  header,
  icon,
  badge,
}: BentoItem) => {
  return (
    <div
      className={cn(
        "row-span-1 rounded-3xl group/bento hover:shadow-2xl transition duration-300 p-6 liquid-glass-card justify-between flex flex-col space-y-4 border border-[#a9927d]/20 relative overflow-hidden",
        className
      )}
    >
      {header && <div className="w-full flex-1 overflow-hidden rounded-2xl">{header}</div>}
      
      <div className="group-hover/bento:translate-x-1 transition duration-200 space-y-2">
        <div className="flex items-center justify-between">
          <div className="p-2.5 rounded-xl bg-[#49111c]/40 border border-[#a9927d]/30 text-[#f2f4f3] w-fit">
            {icon}
          </div>
          {badge && (
            <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-[#5e503f]/50 border border-[#a9927d]/40 text-[#a9927d]">
              {badge}
            </span>
          )}
        </div>

        <div className="font-bold text-[#f2f4f3] text-lg mt-2">
          {title}
        </div>
        <p className="font-normal text-[#a9927d]/90 text-xs leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};

export default BentoGrid;
