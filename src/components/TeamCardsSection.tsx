'use client';

import React from 'react';
import { TeamCard, defaultTeamCards } from '@/lib/homepageSettings';
import { Quote, Sparkles, Crown } from 'lucide-react';

interface TeamCardsSectionProps {
  cards?: TeamCard[];
}

export default function TeamCardsSection({ cards }: TeamCardsSectionProps) {
  const baseCards = Array.isArray(cards) && cards.length > 0 ? cards : defaultTeamCards;

  if (!baseCards || baseCards.length === 0) return null;

  // Duplicate cards multiple times to create a smooth, continuous horizontal loop
  const loopedCards = [...baseCards, ...baseCards, ...baseCards, ...baseCards, ...baseCards, ...baseCards];

  return (
    <div className="w-full space-y-3 relative z-10 select-none overflow-hidden py-1">
      {/* Continuous marquee animation keyframes (moving Right to Left) */}
      <style jsx>{`
        @keyframes marqueeRightToLeft {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-700 text-xs font-black tracking-wide uppercase">
        <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
        <span>ทีมงาน & สมาชิกสายลุย</span>
      </div>

      {/* Full-width continuous horizontal strip running from Right to Left */}
      <div className="relative w-full overflow-hidden rounded-3xl group/marquee py-2">
        {/* Left & Right Gradient Fade Overlays */}
        <div className="absolute top-0 bottom-0 left-0 w-8 sm:w-16 bg-gradient-to-r from-slate-900/80 via-slate-900/30 to-transparent z-20 pointer-events-none" />
        <div className="absolute top-0 bottom-0 right-0 w-8 sm:w-16 bg-gradient-to-l from-slate-900/80 via-slate-900/30 to-transparent z-20 pointer-events-none" />

        <div
          className="flex items-center gap-5 w-max hover:[animation-play-state:paused]"
          style={{
            animation: 'marqueeRightToLeft 26s linear infinite',
          }}
        >
          {loopedCards.map((card, idx) => (
            <div
              key={`${card.id}-${idx}`}
              className="w-[330px] sm:w-[420px] shrink-0 group/card relative bg-gradient-to-r from-[#1c1033] via-[#170c2c] to-[#0e071e] p-4 sm:p-5 rounded-3xl border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.25)] hover:border-purple-400/80 hover:shadow-[0_0_35px_rgba(168,85,247,0.45)] transition-all duration-300 flex items-center gap-4 overflow-hidden"
            >
              {/* Mountain Silhouette / Glow Background Decor */}
              <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-purple-600/20 rounded-full blur-2xl group-hover/card:bg-purple-600/35 transition-all" />
              <Quote className="absolute bottom-2 right-3 w-14 h-14 text-purple-500/20 pointer-events-none group-hover/card:text-purple-400/30 transition-all" />

              {/* Avatar Image (Left Side) */}
              <div className="relative shrink-0 z-10">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-cyan-400/90 shadow-[0_0_18px_rgba(6,182,212,0.7)] group-hover/card:scale-105 transition duration-500 bg-slate-950 flex items-center justify-center">
                  <img
                    src={card.image || '/logo/logov2.png'}
                    alt={card.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Card Details (Right Side) */}
              <div className="flex-1 min-w-0 space-y-2 relative z-10">
                {/* Name */}
                <h4 className="text-base sm:text-lg font-black text-white tracking-tight truncate drop-shadow">
                  {card.name}
                </h4>

                {/* Role Capsule Badge with Crown Icon */}
                {card.role && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-400/50 shadow-inner max-w-full">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shrink-0 shadow">
                      <Crown className="w-3 h-3 text-white fill-white" />
                    </div>
                    <span className="text-xs font-extrabold text-purple-100 truncate">
                      {card.role}
                    </span>
                  </div>
                )}

                {/* Motto with Vertical Accent Line */}
                <div className="border-l-2 border-purple-500/40 pl-2.5 pt-0.5">
                  <p className="text-xs sm:text-sm text-purple-100 font-medium italic leading-snug line-clamp-2 before:content-['“'] after:content-['”'] before:text-purple-400 after:text-purple-400">
                    {card.motto}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
