"use client";

import {
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export type SqueezeSlide = {
  id?: string | number;
  title: string;
  societyName?: string;
  venue?: string;
  dateStr?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  background?: string;
  overlay?: ReactNode;
  action?: string;
  href?: string;
  target?: string;
  onAction?: () => void;
};

type Size = number | string;
const size = (value: Size) => (typeof value === "number" ? `${value}px` : value);
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

const SHARES = [-0.06, 0.61, 0.3, 0.15];
const STRETCHED = [0, 0.71, 0.4, 0.25];
const SQUEEZED = [-0.12, 0.59, 0.28, 0.13];

type Card = { key: number; slide: number };

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(query.matches);
    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);
  return reduced;
}

export type SqueezeCarouselProps = {
  slides: SqueezeSlide[];
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  height?: Size;
  slatWidth?: Size;
  slatGap?: Size;
  gap?: Size;
  radius?: Size;
  duration?: number;
  hoverGrow?: boolean;
  autoplay?: boolean;
  interval?: number;
  controls?: boolean;
  accent?: string;
  accentForeground?: string;
  label?: string;
  panelClassName?: string;
} & Omit<ComponentProps<"div">, "onSelect">;

export function SqueezeCarousel({
  slides,
  defaultIndex = 0,
  onIndexChange,
  height = "clamp(240px, 36cqi, 380px)",
  slatWidth = 10,
  slatGap = 8,
  gap = 16,
  radius = 16,
  duration = 900,
  hoverGrow = true,
  autoplay = true,
  interval = 5000,
  controls = true,
  accent = "#49111c",
  accentForeground = "#f2f4f3",
  label = "Featured Upcoming Events",
  panelClassName,
  className,
  style,
  ...props
}: SqueezeCarouselProps) {
  const count = slides.length;
  const wrap = (i: number) => ((i % count) + count) % count;

  const slats = clamp(count - 4, 1, 3);
  const visible = 4 + slats;

  const reduced = useReducedMotion();
  const ms = reduced ? 0 : duration;

  const ids = useId();
  const seed = useRef(0);
  const strip = useRef<HTMLDivElement>(null);

  const window0 = () =>
    Array.from({ length: visible }, (_, p) => ({
      key: seed.current++,
      slide: wrap(defaultIndex + p),
    }));

  const [cards, setCards] = useState<Card[]>(window0);
  const [column, setColumn] = useState(0);
  const columnRef = useRef(0);
  const forward = useRef(true);
  const [slid, setSlid] = useState(0);
  const [still, setStill] = useState(false);
  const [hover, setHover] = useState(-1);

  const open = cards[-column]?.slide ?? defaultIndex;
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const settle = useCallback(() => {
    setCards((strip) =>
      forward.current ? strip.slice(-visible) : strip.slice(0, visible)
    );
    columnRef.current = 0;
    setColumn(0);
    setSlid(0);
    setStill(true);
  }, [visible]);

  useLayoutEffect(() => {
    if (!still) return;
    const id = requestAnimationFrame(() => setStill(false));
    return () => cancelAnimationFrame(id);
  }, [still]);

  const step = useCallback(
    (by: number) => {
      if (count < 2 || by === 0) return;

      timers.current.forEach(clearTimeout);
      timers.current = [];
      forward.current = by > 0;

      if (by > 0) {
        setCards((strip) => [
          ...strip,
          ...Array.from({ length: by }, (_, k) => ({
            key: seed.current++,
            slide: wrap(strip[strip.length - 1].slide + 1 + k),
          })),
        ]);
        columnRef.current -= by;
        setColumn(columnRef.current);
        setSlid((s) => s - by);
      } else {
        setCards((strip) => [
          ...Array.from({ length: -by }, (_, k) => ({
            key: seed.current++,
            slide: wrap(strip[0].slide - (-by - k)),
          })),
          ...strip,
        ]);
        setSlid((s) => s + by);
        setStill(true);
        timers.current.push(window.setTimeout(() => setSlid(0), 0));
      }

      timers.current.push(window.setTimeout(settle, ms + 20));
    },
    [count, ms, settle]
  );

  useEffect(() => {
    onIndexChange?.(open);
  }, [open, onIndexChange]);

  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!autoplay || paused || reduced || count < 2) return;
    const timer = window.setTimeout(() => step(1), interval);
    return () => clearTimeout(timer);
  }, [autoplay, paused, reduced, count, open, interval, step]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number | undefined> = { ArrowRight: 1, ArrowLeft: -1 };
    const by = moves[event.key];
    if (by === undefined) return;
    event.preventDefault();
    step(by);
  };

  if (!count) return null;

  const slat = size(slatWidth);
  const shares = hoverGrow && hover >= 0 && hover <= 3 && !reduced ? null : SHARES;

  const shareOf = (col: number) => {
    if (shares) return SHARES[col];
    return hover === col ? STRETCHED[col] : SQUEEZED[col];
  };

  const widthOf = (col: number) => {
    if (col < 0 || col > 3) return slat;
    if (col === 0) return `calc(var(--sq-hero) + var(--sq-room) * ${shareOf(0)})`;
    return `calc(var(--sq-room) * ${shareOf(col)})`;
  };

  const vars = {
    "--sq-h": size(height),
    "--sq-gap": size(gap),
    "--sq-slat-gap": size(slatGap),
    "--sq-radius": size(radius),
    "--sq-ms": `${ms}ms`,
    "--sq-ease": "cubic-bezier(0.16, 1, 0.3, 1)",
    "--sq-fill": accent,
    "--sq-on-fill": accentForeground,
    "--sq-hero": "calc(var(--sq-h) * 16 / 9)",
    "--sq-room": `calc(100cqi - var(--sq-hero) - ${slats} * var(--sq-slat-gap) - 3 * var(--sq-gap) - ${slats} * ${slat})`,
  } as CSSProperties;

  const move = `translateX(calc(${slid} * (${slat} + var(--sq-gap))))`;

  return (
    <div
      className={cn("flex w-full flex-col", className)}
      style={{
        containerType: "inline-size",
        ...vars,
        ...style,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        setHover(-1);
      }}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      {...props}
    >
      {controls && count > 1 && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#a9927d] animate-pulse"></span>
            <span className="text-xs uppercase font-bold tracking-widest text-[#a9927d]">
              Live Spotlight Schedule ({count} Active)
            </span>
          </div>

          <div className="flex gap-2">
            <Arrow back label="Previous" onClick={() => step(-1)} />
            <Arrow label="Next" onClick={() => step(1)} />
          </div>
        </div>
      )}

      {/* Visual Slats and Panels */}
      <div className="w-full overflow-hidden rounded-2xl border border-[#a9927d]/20 shadow-2xl" style={{ height: "var(--sq-h)" }}>
        <div
          ref={strip}
          role="tablist"
          aria-label={label}
          aria-orientation="horizontal"
          onKeyDown={onKeyDown}
          className="flex h-full w-max"
          style={{
            transform: move,
            transition: still ? "none" : `transform var(--sq-ms) var(--sq-ease)`,
          }}
        >
          {cards.map((card, place) => {
            const col = place + column;
            const slide = slides[card.slide];
            const front = col === 0;

            return (
              <button
                key={card.key}
                type="button"
                role="tab"
                id={`${ids}-tab-${card.key}`}
                aria-selected={front}
                aria-controls={`${ids}-panel`}
                aria-label={slide.title}
                tabIndex={front ? 0 : -1}
                onMouseMove={() => hoverGrow && setHover(col)}
                onClick={() => col > 0 && step(col)}
                className={cn(
                  "relative isolate h-full shrink-0 cursor-pointer overflow-hidden bg-[#0a0908] p-0 border border-[#a9927d]/20",
                  "outline-none focus-visible:ring-2 focus-visible:ring-[#a9927d]",
                  panelClassName
                )}
                style={{
                  width: widthOf(col),
                  marginLeft:
                    place === 0
                      ? 0
                      : col < 4
                      ? "var(--sq-gap)"
                      : "var(--sq-slat-gap)",
                  borderRadius: `min(var(--sq-radius), calc(${widthOf(col)} / 2))`,
                  transitionProperty: "width, margin-left",
                  transitionDuration: still ? "0s" : "var(--sq-ms)",
                  transitionTimingFunction: "var(--sq-ease)",
                }}
              >
                <Picture slide={slide} />

                {slide.overlay && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end p-4 pt-16 bg-gradient-to-t from-[#0a0908]/90 via-[#0a0908]/40 to-transparent"
                    style={{
                      opacity: front ? 1 : 0,
                      transition: `opacity var(--sq-ms) var(--sq-ease)`,
                    }}
                  >
                    {slide.overlay}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Information Panel — SEPARATE from poster to prevent text merging, exactly as requested */}
      <div id={`${ids}-panel`} role="tabpanel" aria-live="polite" className="mt-5 grid">
        {slides.map((slide, i) => {
          const shown = i === open;

          return (
            <div
              key={slide.id ?? i}
              aria-hidden={!shown}
              className={cn(
                "col-start-1 row-start-1 p-5 rounded-2xl liquid-glass-card flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
              )}
              style={{
                opacity: shown ? 1 : 0,
                visibility: shown ? "visible" : "hidden",
                pointerEvents: shown ? "auto" : "none",
                transition: `opacity var(--sq-ms) var(--sq-ease), visibility var(--sq-ms)`,
              }}
            >
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {slide.societyName && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#49111c] text-[#f2f4f3] font-bold uppercase text-[10px] tracking-wider border border-[#a9927d]/30">
                      {slide.societyName}
                    </span>
                  )}
                  {slide.dateStr && (
                    <span className="text-[#a9927d] font-mono text-[11px] font-semibold">
                      {slide.dateStr}
                    </span>
                  )}
                  {slide.venue && (
                    <span className="text-[#a9927d] text-[11px] flex items-center gap-1">
                      &bull; {slide.venue}
                    </span>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-[#f2f4f3] tracking-tight">
                  {slide.title}
                </h3>

                {slide.description && (
                  <p className="text-xs sm:text-sm text-[#a9927d]/90 line-clamp-2 leading-relaxed">
                    {slide.description}
                  </p>
                )}
              </div>

              {slide.action && (
                <div className="shrink-0 pt-2 md:pt-0">
                  <Action slide={slide} shown={shown} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Picture({ slide }: { slide: SqueezeSlide }) {
  const box = {
    width: "var(--sq-hero)",
    minWidth: "100%",
  } as const;

  if (slide.image) {
    return (
      <img
        src={slide.image}
        alt={slide.imageAlt ?? ""}
        draggable={false}
        className="absolute inset-y-0 left-1/2 h-full max-w-none -translate-x-1/2 object-cover brightness-95 contrast-105"
        style={box}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="absolute inset-y-0 left-1/2 -translate-x-1/2 bg-gradient-to-tr from-[#49111c] to-[#0a0908]"
      style={{ ...box }}
    />
  );
}

function Arrow({
  back = false,
  label,
  onClick,
}: {
  back?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid size-8 cursor-pointer place-items-center rounded-xl",
        "bg-[#49111c] text-[#f2f4f3] border border-[#a9927d]/40 shadow",
        "transition-all hover:bg-[#631726] active:scale-95 outline-none"
      )}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path
          d={
            back
              ? "M9.6 2.6 5.1 7.1h9.1v1.8H5.1l4.5 4.5-1.2 1.2-6-6L1.8 8l.6-.6 6-6 1.2 1.2Z"
              : "M6.4 2.6l4.5 4.5H1.8v1.8h9.1l-4.5 4.5 1.2 1.2 6-6 .6-.6-.6-.6-6-6-1.2 1.2Z"
          }
        />
      </svg>
    </button>
  );
}

function Action({ slide, shown }: { slide: SqueezeSlide; shown: boolean }) {
  const dress = cn(
    "group/sq-action inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl",
    "bg-[#49111c] hover:bg-[#631726] border border-[#a9927d]/40 px-5 py-2.5 text-xs font-bold text-[#f2f4f3]",
    "shadow-lg shadow-[#49111c]/30 transition-all hover:scale-105 active:scale-95 outline-none"
  );

  const inside = (
    <>
      {slide.action}
      <svg
        width="6"
        height="9"
        viewBox="0 0 6 9"
        fill="none"
        aria-hidden="true"
        className="transition-transform duration-200 group-hover/sq-action:translate-x-0.5"
      >
        <path
          d="M1.2 1 4.7 4.5 1.2 8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );

  if (slide.href) {
    return (
      <a
        href={slide.href}
        target={slide.target}
        rel={slide.target === "_blank" ? "noreferrer" : undefined}
        tabIndex={shown ? 0 : -1}
        onClick={slide.onAction}
        className={dress}
      >
        {inside}
      </a>
    );
  }

  return (
    <button type="button" tabIndex={shown ? 0 : -1} onClick={slide.onAction} className={dress}>
      {inside}
    </button>
  );
}

export default SqueezeCarousel;
