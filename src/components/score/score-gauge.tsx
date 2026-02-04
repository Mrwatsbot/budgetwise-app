'use client';

import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Types ─────────────────────────────────────── */

interface ScoreGaugeProps {
  score: number;
  levelTitle: string;
  level: number;
  previousScore: number | null;
}

/* ─── Arc Geometry ──────────────────────────────── */

const CX = 150;
const CY = 140;
const R = 115;          // main arc radius
const R_INNER = 100;    // inner decorative ring
const SW = 12;          // stroke width
const SW_BG = 12;       // background arc stroke
const ARC_DEG = 240;    // sweep angle
const C = 2 * Math.PI * R;
const ARC = C * (ARC_DEG / 360);
const GAP = C - ARC;
const ROT = 150;        // rotation offset so gap is at bottom

const C_INNER = 2 * Math.PI * R_INNER;
const ARC_INNER = C_INNER * (ARC_DEG / 360);
const GAP_INNER = C_INNER - ARC_INNER;

const TICKS = [0, 200, 400, 600, 800, 1000];

/* ─── Geometry Helpers ──────────────────────────── */

function s2rad(s: number) {
  return ((ROT + (s / 1000) * ARC_DEG) * Math.PI) / 180;
}

function xy(rad: number, r = R) {
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

/* ─── Score Theming ─────────────────────────────── */

function scoreTheme(s: number) {
  if (s >= 900) return {
    grad: ['#34d399', '#10b981', '#059669'] as const,
    glow: '#10b981',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    label: 'Exceptional',
    msg: 'Exceptional financial health',
  };
  if (s >= 750) return {
    grad: ['#60a5fa', '#3b82f6', '#2563eb'] as const,
    glow: '#3b82f6',
    text: 'text-blue-400',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    label: 'Strong',
    msg: 'Strong financial foundation',
  };
  if (s >= 600) return {
    grad: ['#fbbf24', '#eab308', '#ca8a04'] as const,
    glow: '#eab308',
    text: 'text-yellow-400',
    badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    label: 'Good',
    msg: 'Solid ground, room to grow',
  };
  if (s >= 400) return {
    grad: ['#2dd4bf', '#1a7a6d', '#115e59'] as const,
    glow: '#1a7a6d',
    text: 'text-teal-400',
    badge: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    label: 'Building',
    msg: 'Building momentum — keep going',
  };
  return {
    grad: ['#fb923c', '#ef4444', '#dc2626'] as const,
    glow: '#ef4444',
    text: 'text-red-400',
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    label: 'Starting',
    msg: 'Your journey starts here',
  };
}

/* ─── Animated Counter ──────────────────────────── */

function useCounter(end: number, dur = 2000, delay = 600) {
  const [v, setV] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    let t0: number | null = null;

    const tick = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / dur, 1);
      const eased = 1 - (1 - p) ** 3;
      setV(Math.round(eased * end));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };

    const id = setTimeout(() => {
      raf.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(id);
      cancelAnimationFrame(raf.current);
    };
  }, [end, dur, delay]);

  return v;
}

/* ─── Component ─────────────────────────────────── */

export function ScoreGauge({ score, levelTitle, level, previousScore }: ScoreGaugeProps) {
  const [mounted, setMounted] = useState(false);
  const num = useCounter(score);
  const theme = scoreTheme(score);
  const change = previousScore !== null ? score - previousScore : 0;

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(id);
  }, []);

  const dashOff = mounted ? ARC * (1 - score / 1000) : ARC;
  const ep = xy(s2rad(score));
  const gradId = '_sg_grad';
  const glowId = '_sg_glow';
  const bgGlowId = '_sg_bg_glow';

  return (
    <>
      <style>{`
        @keyframes _sgPulse { 0%,100% { opacity:.6 } 50% { opacity:1 } }
        @keyframes _sgBreathe { 0%,100% { opacity:.25; transform: scale(1) } 50% { opacity:.45; transform: scale(1.02) } }
        @keyframes _sgSpin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes _sgFadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      <div className="flex flex-col items-center relative select-none pt-4 pb-6">

        {/* ── Ambient background glow ── */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(ellipse 65% 55% at 50% 38%, ${theme.glow}25, transparent 70%)`,
            animation: '_sgBreathe 6s ease-in-out infinite',
          }}
        />

        {/* ── SVG Gauge ── */}
        <div className="relative w-[280px] sm:w-[300px]">
          <svg viewBox="0 0 300 260" className="w-full" aria-hidden="true">
            <defs>
              {/* Main progress gradient */}
              <linearGradient id={gradId} x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor={theme.grad[0]} />
                <stop offset="50%" stopColor={theme.grad[1]} />
                <stop offset="100%" stopColor={theme.grad[2]} />
              </linearGradient>

              {/* Glow blur filter */}
              <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Background arc subtle glow */}
              <filter id={bgGlowId}>
                <feGaussianBlur stdDeviation="2" />
              </filter>
            </defs>

            {/* ── Background arc ── */}
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={SW_BG}
              strokeLinecap="round"
              strokeDasharray={`${ARC} ${GAP}`}
              transform={`rotate(${ROT} ${CX} ${CY})`}
            />

            {/* ── Inner decorative ring (very subtle) ── */}
            <circle
              cx={CX} cy={CY} r={R_INNER}
              fill="none"
              stroke="rgba(255,255,255,0.02)"
              strokeWidth={1.5}
              strokeDasharray={`${ARC_INNER} ${GAP_INNER}`}
              transform={`rotate(${ROT} ${CX} ${CY})`}
            />

            {/* ── Tick marks ── */}
            {TICKS.map((t) => {
              const rad = s2rad(t);
              const outer = xy(rad, R + 14);
              const inner = xy(rad, R + 8);
              const isEndpoint = t === 0 || t === 1000;
              return (
                <g key={t}>
                  <line
                    x1={inner.x} y1={inner.y}
                    x2={outer.x} y2={outer.y}
                    stroke={isEndpoint ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)'}
                    strokeWidth={isEndpoint ? 1.5 : 1}
                    strokeLinecap="round"
                  />
                  {!isEndpoint && (
                    <text
                      x={xy(rad, R + 22).x}
                      y={xy(rad, R + 22).y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="rgba(255,255,255,0.18)"
                      fontSize="9"
                      fontWeight="500"
                      fontFamily="var(--font-source-sans-3), system-ui"
                    >
                      {t}
                    </text>
                  )}
                </g>
              );
            })}

            {/* ── Glow layer (blurred copy of progress) ── */}
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={theme.glow}
              strokeWidth={SW + 6}
              strokeLinecap="round"
              strokeDasharray={`${ARC} ${GAP}`}
              strokeDashoffset={dashOff}
              transform={`rotate(${ROT} ${CX} ${CY})`}
              filter={`url(#${glowId})`}
              opacity={0.3}
              style={{ transition: 'stroke-dashoffset 2s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />

            {/* ── Main progress arc ── */}
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={SW}
              strokeLinecap="round"
              strokeDasharray={`${ARC} ${GAP}`}
              strokeDashoffset={dashOff}
              transform={`rotate(${ROT} ${CX} ${CY})`}
              style={{ transition: 'stroke-dashoffset 2s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />

            {/* ── Endpoint glow dot ── */}
            {mounted && score > 0 && (
              <circle
                cx={ep.x} cy={ep.y} r={7}
                fill={theme.glow}
                opacity={0.9}
                style={{ animation: '_sgPulse 3s ease-in-out infinite' }}
              >
                <animate attributeName="r" values="6;8;6" dur="3s" repeatCount="indefinite" />
              </circle>
            )}
            {mounted && score > 0 && (
              <circle
                cx={ep.x} cy={ep.y} r={4}
                fill="white"
                opacity={0.9}
              />
            )}

            {/* ── Center score number ── */}
            <text
              x={CX} y={CY - 14}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--foreground)"
              fontSize="54"
              fontWeight="700"
              fontFamily="var(--font-playfair-display), serif"
              letterSpacing="-0.03em"
              style={{ textShadow: `0 0 40px ${theme.glow}40` }}
            >
              {num}
            </text>

            {/* ── "/ 1,000" subtitle ── */}
            <text
              x={CX} y={CY + 18}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.25)"
              fontSize="13"
              fontWeight="500"
              fontFamily="var(--font-source-sans-3), system-ui"
              letterSpacing="0.08em"
            >
              of 1,000
            </text>
          </svg>
        </div>

        {/* ── Info section below gauge ── */}
        <div
          className="flex flex-col items-center gap-3 mt-1 relative z-10"
          style={{ animation: mounted ? '_sgFadeUp 0.8s ease-out 1s both' : 'none' }}
        >
          {/* Level badge */}
          <div className={cn(
            'px-4 py-1.5 rounded-full border text-xs font-semibold tracking-wide flex items-center gap-2',
            theme.badge
          )}>
            <Zap className="w-3 h-3" />
            <span>Level {level}</span>
            <span className="opacity-30">·</span>
            <span>{levelTitle}</span>
          </div>

          {/* Score momentum badge — prominent, inside hero */}
          {previousScore !== null && (
            <div className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold',
              change > 0
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                : change < 0
                ? 'bg-red-500/10 text-red-400 border-red-500/25'
                : 'bg-white/5 text-muted-foreground border-white/10'
            )}>
              {change > 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : change < 0 ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
              <span>
                {change > 0 ? `↑ Rising · +${change} pts`
                  : change < 0 ? `↓ Declining · ${change} pts`
                  : '→ Steady'}
              </span>
            </div>
          )}

          {/* Motivational message */}
          <p className="text-xs text-muted-foreground/70 text-center max-w-[240px]">
            {theme.msg}
          </p>
        </div>
      </div>
    </>
  );
}
