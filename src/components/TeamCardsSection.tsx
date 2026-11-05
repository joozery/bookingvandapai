'use client';

import React, { useState } from 'react';
import { TeamCard, defaultTeamCards } from '@/lib/homepageSettings';
import { Quote, Sparkles } from 'lucide-react';

interface TeamCardsSectionProps {
  cards?: TeamCard[];
}

export default function TeamCardsSection({ cards }: TeamCardsSectionProps) {
  const baseCards = Array.isArray(cards) && cards.length > 0 ? cards : defaultTeamCards;
  const [paused, setPaused] = useState(false);

  if (!baseCards || baseCards.length === 0) return null;

  // One "set" must be at least as wide as the screen; the strip renders the set twice
  // and slides exactly one set width (-50%) so the loop is seamless.
  const repeat = Math.max(1, Math.ceil(5 / baseCards.length));
  const set = Array.from({ length: repeat }, () => baseCards).flat();
  const strip = [...set, ...set];
  const duration = `${set.length * 7}s`;

  const hold = () => setPaused(true);
  const release = () => setPaused(false);

  return (
    <div className="relative z-10 w-full select-none space-y-3">
      <style>{`
        @keyframes teamMarquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        /* Short fixed-width edge fade so cards only soften right at the edge */
        .team-edge-fade {
          --fade: 20px;
          -webkit-mask-image: linear-gradient(to right, transparent, #000 var(--fade), #000 calc(100% - var(--fade)), transparent);
          mask-image: linear-gradient(to right, transparent, #000 var(--fade), #000 calc(100% - var(--fade)), transparent);
        }
        @media (min-width: 640px) { .team-edge-fade { --fade: 40px; } }
        .team-marquee { animation: teamMarquee var(--team-duration, 40s) linear infinite; }
        .team-marquee.is-paused { animation-play-state: paused; }
      `}</style>

      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-black tracking-wide text-purple-700">
          <Sparkles className="h-3.5 w-3.5 text-purple-600" />
          <span>แนะนำทีมแอดมิน</span>
        </div>
        <span className="hidden text-[11px] font-medium text-purple-700/60 sm:inline">
          {paused ? 'หยุดอยู่ • ปล่อยเพื่อเลื่อนต่อ' : 'แตะค้างเพื่อหยุดดู'}
        </span>
      </div>

      <div
        className="team-edge-fade relative -mx-4 overflow-hidden py-2 sm:-mx-6 lg:mx-0"
        style={{
          cursor: paused ? 'grabbing' : 'grab',
        }}
        onMouseDown={hold}
        onMouseUp={release}
        onMouseLeave={release}
        onTouchStart={hold}
        onTouchEnd={release}
        onTouchCancel={release}
      >
        <div
          className={`team-marquee flex w-max${paused ? " is-paused" : ""}`}
          style={{ "--team-duration": duration } as React.CSSProperties}
        >
          {strip.map((card, idx) => (
            <div key={`${card.id}-${idx}`} className="shrink-0 pr-4" aria-hidden={idx >= set.length || undefined}>
              <article className="relative flex h-full w-[min(300px,78vw)] flex-col overflow-hidden rounded-3xl border-2 border-purple-500 bg-gradient-to-br from-[#2e1065] via-[#3b0764] to-[#0b0620] p-5 shadow-[0_14px_34px_-10px_rgba(59,7,100,0.7)] sm:w-[340px]">
                <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-fuchsia-600/25 blur-3xl" />
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-14 -left-10 h-36 w-36 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="relative flex items-center gap-3.5">
                  <img
                    src={card.image || '/logo/logov2.webp'}
                    alt={card.name}
                    className="h-14 w-14 shrink-0 rounded-2xl bg-purple-950 object-cover ring-2 ring-cyan-300/60 ring-offset-2 ring-offset-[#2e1065]"
                    loading="lazy"
                    decoding="async"
                    width={56}
                    height={56}
                    draggable={false}
                  />
                  <div className="min-w-0">
                    <h4 className="truncate text-base font-black leading-tight text-white">{card.name}</h4>
                    {card.role && (
                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-purple-300">{card.role}</p>
                    )}
                  </div>
                </div>

                {card.motto && (
                  <div className="relative mt-4 flex flex-1 gap-2 border-t border-white/10 pt-3.5">
                    <Quote aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 fill-purple-400 text-purple-400" />
                    <p className="line-clamp-3 text-sm leading-relaxed text-purple-100">{card.motto}</p>
                  </div>
                )}
              </article>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
