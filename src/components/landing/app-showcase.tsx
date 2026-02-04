'use client';

import { useState, useRef, useCallback } from 'react';
import {
  TrendingUp,
  PiggyBank,
  CreditCard,
  Receipt,
  BarChart3,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Flame,
  Target,
  Shield,
  ArrowDown,
  ArrowUp,
  Wallet,
} from 'lucide-react';

/* ─── page mockup data ─── */
const PAGES = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Your financial command center',
    color: '#1a7a6d',
    content: <DashboardMockup />,
  },
  {
    id: 'score',
    title: 'Health Score',
    subtitle: '0–1,000 with full breakdown',
    color: '#10b981',
    content: <ScoreMockup />,
  },
  {
    id: 'budgets',
    title: 'Budgets',
    subtitle: 'AI-powered budget planning',
    color: '#06b6d4',
    content: <BudgetsMockup />,
  },
  {
    id: 'debts',
    title: 'Debt Crusher',
    subtitle: 'Payoff planner with strategies',
    color: '#f59e0b',
    content: <DebtsMockup />,
  },
  {
    id: 'transactions',
    title: 'Transactions',
    subtitle: 'Auto-categorized spending',
    color: '#8b5cf6',
    content: <TransactionsMockup />,
  },
  {
    id: 'reports',
    title: 'Reports',
    subtitle: 'Spending flow & what-if analysis',
    color: '#3b82f6',
    content: <ReportsMockup />,
  },
];

export function AppShowcase() {
  const [active, setActive] = useState(0);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const next = useCallback(() => {
    setActive((i) => (i + 1) % PAGES.length);
  }, []);

  const prev = useCallback(() => {
    setActive((i) => (i - 1 + PAGES.length) % PAGES.length);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchRef.current) return;
      const dx = e.changedTouches[0].clientX - touchRef.current.x;
      const dy = e.changedTouches[0].clientY - touchRef.current.y;
      // only trigger if horizontal swipe > vertical
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) next();
        else prev();
      }
      touchRef.current = null;
    },
    [next, prev],
  );

  return (
    <div className="showcase-wrapper">
      {/* card stack */}
      <div
        ref={containerRef}
        className="showcase-stack"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {PAGES.map((page, i) => {
          const offset = (i - active + PAGES.length) % PAGES.length;
          return (
            <div
              key={page.id}
              className="showcase-card"
              style={getCardStyle(offset)}
              onClick={offset === 0 ? next : undefined}
            >
              {/* tablet frame */}
              <div className="tablet-frame">
                {/* status bar */}
                <div className="tablet-statusbar">
                  <span className="tablet-time">9:41</span>
                  <div className="tablet-notch" />
                  <div className="tablet-indicators">
                    <div className="tablet-signal" />
                    <div className="tablet-wifi" />
                    <div className="tablet-battery" />
                  </div>
                </div>
                {/* page header */}
                <div className="tablet-header">
                  <span className="tablet-page-title">{page.title}</span>
                </div>
                {/* content */}
                <div className="tablet-content">{page.content}</div>
                {/* bottom nav */}
                <div className="tablet-nav">
                  {['Home', 'Budget', 'Score', 'Debts', 'More'].map((label) => (
                    <div
                      key={label}
                      className={`tablet-nav-item ${
                        (label === 'Home' && page.id === 'dashboard') ||
                        (label === 'Budget' && page.id === 'budgets') ||
                        (label === 'Score' && page.id === 'score') ||
                        (label === 'Debts' && page.id === 'debts') ||
                        (label === 'More' && (page.id === 'transactions' || page.id === 'reports'))
                          ? 'active'
                          : ''
                      }`}
                    >
                      <div className="tablet-nav-dot" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* controls + label */}
      <div className="showcase-controls">
        <button className="showcase-btn" onClick={prev} aria-label="Previous">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="showcase-label">
          <span className="showcase-label-title">{PAGES[active].title}</span>
          <span className="showcase-label-sub">{PAGES[active].subtitle}</span>
        </div>
        <button className="showcase-btn" onClick={next} aria-label="Next">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* pagination dots */}
      <div className="showcase-dots">
        {PAGES.map((page, i) => (
          <button
            key={page.id}
            className={`showcase-dot ${i === active ? 'active' : ''}`}
            onClick={() => setActive(i)}
            aria-label={`Go to ${page.title}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── card positioning ─── */
function getCardStyle(offset: number): React.CSSProperties {
  // offset 0 = front, 1 = behind, 2 = further behind, etc.
  const maxVisible = 3;
  if (offset >= maxVisible && offset <= PAGES.length - 1) {
    // cards far in the back or wrapping around — hide
    if (offset > PAGES.length / 2) {
      // coming from left (previous cards)
      return {
        transform: `translateX(-120%) scale(0.8) rotateY(15deg)`,
        opacity: 0,
        zIndex: 0,
        pointerEvents: 'none',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      };
    }
    return {
      transform: `translateX(${offset * 30}px) translateY(${-offset * 8}px) scale(${1 - offset * 0.06}) rotateY(-3deg)`,
      opacity: 0,
      zIndex: PAGES.length - offset,
      pointerEvents: 'none',
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  }

  // wrapping previous card (came from front, going to back)
  if (offset > PAGES.length / 2) {
    return {
      transform: `translateX(-80px) translateY(10px) scale(0.92) rotateY(8deg)`,
      opacity: 0,
      zIndex: 0,
      pointerEvents: 'none',
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  }

  return {
    transform: `translateX(${offset * 24}px) translateY(${-offset * 12}px) scale(${1 - offset * 0.05}) rotateY(${-offset * 2}deg)`,
    opacity: offset === 0 ? 1 : 0.6 - offset * 0.15,
    zIndex: PAGES.length - offset,
    pointerEvents: offset === 0 ? 'auto' : 'none',
    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  };
}

/* ══════════════════════════════════════════════════
   MOCKUP COMPONENTS — styled representations
   ══════════════════════════════════════════════════ */

function DashboardMockup() {
  return (
    <div className="mockup">
      {/* Monthly Pulse */}
      <div className="mock-card mock-pulse">
        <div className="mock-pulse-header">
          <span className="mock-small-label">February 2026</span>
          <span className="mock-tiny-badge">On Track</span>
        </div>
        <div className="mock-pulse-amount">$1,847</div>
        <div className="mock-small-label">left to spend</div>
        <div className="mock-pulse-stats">
          <div className="mock-stat">
            <span className="mock-stat-value">$4,200</span>
            <span className="mock-stat-label">Budgeted</span>
          </div>
          <div className="mock-stat">
            <span className="mock-stat-value">$2,353</span>
            <span className="mock-stat-label">Spent</span>
          </div>
          <div className="mock-stat">
            <span className="mock-stat-value">$12,400</span>
            <span className="mock-stat-label">Balance</span>
          </div>
        </div>
      </div>
      {/* Score widget */}
      <div className="mock-card mock-score-mini">
        <div className="mock-score-ring-small">
          <svg viewBox="0 0 60 60" className="w-full h-full">
            <circle cx="30" cy="30" r="24" stroke="#1a2826" strokeWidth="4" fill="none" />
            <circle cx="30" cy="30" r="24" stroke="#1a7a6d" strokeWidth="4" fill="none"
              strokeDasharray={`${2 * Math.PI * 24 * 0.738} ${2 * Math.PI * 24}`}
              strokeLinecap="round" transform="rotate(-90 30 30)" />
            <text x="30" y="33" textAnchor="middle" fill="#e0f2f0" fontSize="12" fontWeight="700">738</text>
          </svg>
        </div>
        <div>
          <div className="mock-score-title">Solid Ground</div>
          <div className="mock-score-change">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400">+23 this month</span>
          </div>
        </div>
      </div>
      {/* Budget bars preview */}
      <div className="mock-card">
        <div className="mock-section-title">Budget Overview</div>
        {[
          { name: 'Housing', pct: 95, color: '#1a7a6d' },
          { name: 'Food & Dining', pct: 72, color: '#1a7a6d' },
          { name: 'Transport', pct: 45, color: '#1a7a6d' },
        ].map((b) => (
          <div key={b.name} className="mock-bar-row">
            <div className="mock-bar-label">{b.name}</div>
            <div className="mock-bar-track">
              <div className="mock-bar-fill" style={{ width: `${b.pct}%`, background: b.color }} />
            </div>
            <span className="mock-bar-pct">{b.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreMockup() {
  return (
    <div className="mockup">
      {/* score gauge */}
      <div className="mock-card mock-score-hero">
        <svg viewBox="0 0 180 180" className="mock-score-gauge">
          <circle cx="90" cy="90" r="72" stroke="#1a2826" strokeWidth="10" fill="none" />
          <circle cx="90" cy="90" r="72" stroke="url(#mockGrad)" strokeWidth="10" fill="none"
            strokeDasharray={`${2 * Math.PI * 72 * 0.738} ${2 * Math.PI * 72}`}
            strokeLinecap="round" transform="rotate(-90 90 90)" />
          <defs>
            <linearGradient id="mockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2aaa9a" />
              <stop offset="100%" stopColor="#1a7a6d" />
            </linearGradient>
          </defs>
          <text x="90" y="85" textAnchor="middle" fill="#e0f2f0" fontSize="36" fontWeight="700" fontFamily="serif">738</text>
          <text x="90" y="105" textAnchor="middle" fill="#1a7a6d" fontSize="11" fontWeight="600">Solid Ground</text>
        </svg>
      </div>
      {/* pillars */}
      <div className="mock-pillars">
        <div className="mock-pillar">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <div className="mock-pillar-info">
            <span className="mock-pillar-name">Trajectory</span>
            <div className="mock-bar-track small">
              <div className="mock-bar-fill" style={{ width: '68%', background: '#10b981' }} />
            </div>
          </div>
          <span className="mock-pillar-pts">238/350</span>
        </div>
        <div className="mock-pillar">
          <Target className="w-4 h-4 text-blue-400" />
          <div className="mock-pillar-info">
            <span className="mock-pillar-name">Behavior</span>
            <div className="mock-bar-track small">
              <div className="mock-bar-fill" style={{ width: '78%', background: '#3b82f6' }} />
            </div>
          </div>
          <span className="mock-pillar-pts">273/350</span>
        </div>
        <div className="mock-pillar">
          <Shield className="w-4 h-4 text-teal-400" />
          <div className="mock-pillar-info">
            <span className="mock-pillar-name">Position</span>
            <div className="mock-bar-track small">
              <div className="mock-bar-fill" style={{ width: '76%', background: '#1a7a6d' }} />
            </div>
          </div>
          <span className="mock-pillar-pts">227/300</span>
        </div>
      </div>
      {/* achievements */}
      <div className="mock-card">
        <div className="mock-section-title">
          <Trophy className="w-3.5 h-3.5 text-amber-400 inline mr-1" />
          Achievements
        </div>
        <div className="mock-badges">
          {['Budget Starter', 'Debt Crusher', '7-Day Streak'].map((a) => (
            <div key={a} className="mock-badge">
              <Flame className="w-3 h-3" />
              <span>{a}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BudgetsMockup() {
  const cats = [
    { name: 'Housing', budgeted: '$1,500', spent: '$1,425', pct: 95, status: 'warn' },
    { name: 'Food & Dining', budgeted: '$600', spent: '$432', pct: 72, status: 'ok' },
    { name: 'Transportation', budgeted: '$350', spent: '$158', pct: 45, status: 'ok' },
    { name: 'Entertainment', budgeted: '$200', spent: '$67', pct: 34, status: 'ok' },
    { name: 'Subscriptions', budgeted: '$120', spent: '$120', pct: 100, status: 'over' },
  ];
  return (
    <div className="mockup">
      <div className="mock-card">
        <div className="mock-section-title">February Budgets</div>
        {cats.map((c) => (
          <div key={c.name} className="mock-budget-row">
            <div className="mock-budget-top">
              <span className="mock-budget-name">{c.name}</span>
              <span className="mock-budget-amounts">{c.spent} / {c.budgeted}</span>
            </div>
            <div className="mock-bar-track">
              <div
                className={`mock-bar-fill ${c.status === 'over' ? 'over' : c.status === 'warn' ? 'warn' : ''}`}
                style={{ width: `${Math.min(c.pct, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mock-ai-btn">
        <Wallet className="w-3.5 h-3.5" />
        <span>AI Auto-Budget</span>
      </div>
    </div>
  );
}

function DebtsMockup() {
  const debts = [
    { name: 'Chase Sapphire', type: 'Credit Card', balance: '$3,420', apr: '24.9%', pct: 34 },
    { name: 'Student Loan', type: 'Federal', balance: '$18,200', apr: '5.5%', pct: 72 },
    { name: 'Auto Loan', type: 'Auto', balance: '$8,100', apr: '6.2%', pct: 55 },
  ];
  return (
    <div className="mockup">
      <div className="mock-card">
        <div className="mock-section-title">Active Debts</div>
        <div className="mock-debt-total">
          <span className="mock-debt-total-label">Total Owed</span>
          <span className="mock-debt-total-amount">$29,720</span>
        </div>
        {debts.map((d) => (
          <div key={d.name} className="mock-debt-item">
            <div className="mock-debt-top">
              <div>
                <span className="mock-debt-name">{d.name}</span>
                <span className="mock-debt-type">{d.type} · {d.apr} APR</span>
              </div>
              <span className="mock-debt-balance">{d.balance}</span>
            </div>
            <div className="mock-bar-track">
              <div className="mock-bar-fill debt" style={{ width: `${d.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mock-card mock-debt-free">
        <ArrowDown className="w-4 h-4 text-emerald-400" />
        <div>
          <div className="mock-debt-free-title">Debt-free by March 2028</div>
          <div className="mock-debt-free-sub">Avalanche strategy saves $2,340 in interest</div>
        </div>
      </div>
    </div>
  );
}

function TransactionsMockup() {
  const txns = [
    { name: 'Whole Foods', cat: 'Groceries', amount: '-$67.42', icon: Receipt },
    { name: 'Shell Gas', cat: 'Transportation', amount: '-$45.00', icon: CreditCard },
    { name: 'Netflix', cat: 'Subscriptions', amount: '-$15.99', icon: Receipt },
    { name: 'Paycheck', cat: 'Income', amount: '+$2,100.00', icon: ArrowUp, income: true },
  ];

  // Spending calendar matching the real app: month header, day labels, calendar grid with heat colors
  const calendarDays = [
    // Feb 2026: starts on Sunday (0)
    // week 1: Feb 1-7
    { day: 1, heat: 'green' as const },
    { day: 2, heat: 'none' as const },
    { day: 3, heat: 'yellow' as const },
    { day: 4, heat: 'orange' as const },
    { day: 5, heat: 'green' as const },
    { day: 6, heat: 'none' as const },
    { day: 7, heat: 'red' as const },
    // week 2
    { day: 8, heat: 'none' as const },
    { day: 9, heat: 'green' as const },
    { day: 10, heat: 'yellow' as const },
    { day: 11, heat: 'none' as const },
    { day: 12, heat: 'orange' as const },
    { day: 13, heat: 'green' as const },
    { day: 14, heat: 'red' as const },
    // week 3
    { day: 15, heat: 'green' as const },
    { day: 16, heat: 'yellow' as const },
    { day: 17, heat: 'none' as const },
    { day: 18, heat: 'green' as const },
    { day: 19, heat: 'orange' as const },
    { day: 20, heat: 'none' as const },
    { day: 21, heat: 'green' as const },
    // week 4
    { day: 22, heat: 'yellow' as const },
    { day: 23, heat: 'red' as const },
    { day: 24, heat: 'green' as const },
    { day: 25, heat: 'none' as const },
    { day: 26, heat: 'orange' as const },
    { day: 27, heat: 'green' as const },
    { day: 28, heat: 'none' as const },
  ];

  const heatColors = {
    none: 'rgba(26, 40, 38, 0.4)',
    green: 'rgba(109, 181, 85, 0.15)',
    yellow: 'rgba(234, 179, 8, 0.15)',
    orange: 'rgba(26, 122, 109, 0.2)',
    red: 'rgba(239, 68, 68, 0.15)',
  };
  const heatBorders = {
    none: 'rgba(255, 255, 255, 0.03)',
    green: 'rgba(109, 181, 85, 0.25)',
    yellow: 'rgba(234, 179, 8, 0.25)',
    orange: 'rgba(26, 122, 109, 0.3)',
    red: 'rgba(239, 68, 68, 0.25)',
  };

  return (
    <div className="mockup">
      {/* Spending Calendar — matches real app layout */}
      <div className="mock-card">
        <div className="mock-calendar-header">
          <ChevronLeft className="w-3 h-3 text-muted-foreground" />
          <span className="mock-calendar-month">February 2026</span>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        </div>
        {/* summary */}
        <div className="mock-calendar-summary">
          <div className="mock-calendar-stat">
            <span className="mock-calendar-stat-val">$2,353</span>
            <span className="mock-calendar-stat-lbl">Total Spent</span>
          </div>
          <div className="mock-calendar-stat">
            <span className="mock-calendar-stat-val">$84.04</span>
            <span className="mock-calendar-stat-lbl">Daily Avg</span>
          </div>
          <div className="mock-calendar-stat">
            <span className="mock-calendar-stat-val">18</span>
            <span className="mock-calendar-stat-lbl">Active Days</span>
          </div>
        </div>
        {/* day-of-week labels */}
        <div className="mock-calendar-grid">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="mock-cal-dow">{d}</div>
          ))}
          {calendarDays.map((d) => (
            <div
              key={d.day}
              className="mock-cal-day"
              style={{
                background: heatColors[d.heat],
                borderColor: heatBorders[d.heat],
              }}
            >
              <span className="mock-cal-day-num">{d.day}</span>
            </div>
          ))}
        </div>
        {/* legend */}
        <div className="mock-calendar-legend">
          <span className="mock-legend-label">Less</span>
          {(['none', 'green', 'yellow', 'orange', 'red'] as const).map((h) => (
            <div key={h} className="mock-legend-swatch" style={{ background: heatColors[h], borderColor: heatBorders[h] }} />
          ))}
          <span className="mock-legend-label">More</span>
        </div>
      </div>
      {/* Recent transactions below calendar */}
      <div className="mock-card">
        <div className="mock-section-title">Recent Transactions</div>
        {txns.map((t, i) => (
          <div key={i} className="mock-txn">
            <div className="mock-txn-icon">
              <t.icon className="w-3.5 h-3.5" />
            </div>
            <div className="mock-txn-info">
              <span className="mock-txn-name">{t.name}</span>
              <span className="mock-txn-cat">{t.cat}</span>
            </div>
            <span className={`mock-txn-amount ${t.income ? 'income' : ''}`}>{t.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsMockup() {
  /*
   * Sankey with REAL curves — Income fans out to categories.
   * The trick: source bands are packed tight on the Income node,
   * but target nodes are spread with more padding, forcing the
   * bezier paths to visibly curve up/down to reach their targets.
   */
  const W = 280;
  const H = 190;
  const srcNodeW = 12;
  const tgtNodeW = 10;

  const cats = [
    { name: 'Housing', val: 1820, color: '#1a7a6d' },
    { name: 'Savings', val: 1040, color: '#3b82f6' },
    { name: 'Food', val: 780, color: '#10b981' },
    { name: 'Debt', val: 624, color: '#f59e0b' },
    { name: 'Transport', val: 416, color: '#06b6d4' },
    { name: 'Other', val: 520, color: '#8b5cf6' },
  ];

  const srcX0 = 2;
  const srcX1 = srcX0 + srcNodeW;
  const tgtX0 = W - tgtNodeW - 48;
  const tgtX1 = tgtX0 + tgtNodeW;

  const totalVal = cats.reduce((s, c) => s + c.val, 0);

  // Source: pack bands tightly together (small gap) on the Income node
  // This makes Income one dense column
  const srcPad = 1;
  const srcTotalPad = (cats.length - 1) * srcPad;
  const srcAvailH = H - 20 - srcTotalPad;

  // Target: spread nodes with more padding so they span the full height
  // This forces flows to curve up/down to reach their target
  const tgtPad = 8;
  const tgtTotalPad = (cats.length - 1) * tgtPad;
  const tgtAvailH = H - 10 - tgtTotalPad;

  let srcY = 10;
  let tgtY = 5;

  const flows = cats.map((cat) => {
    const frac = cat.val / totalVal;
    const srcH = frac * srcAvailH;
    const tgtH = frac * tgtAvailH;

    const flow = {
      ...cat,
      sy0: srcY,
      sy1: srcY + srcH,
      ty0: tgtY,
      ty1: tgtY + tgtH,
      srcH,
      tgtH,
      label: `$${(cat.val / 1000).toFixed(1)}k`,
    };

    srcY += srcH + srcPad;
    tgtY += tgtH + tgtPad;
    return flow;
  });

  // Control points for bezier — stronger curve
  const hDist = tgtX0 - srcX1;
  const cp1x = srcX1 + hDist * 0.4;
  const cp2x = tgtX0 - hDist * 0.4;

  // Income node bounds
  const incomeY0 = flows[0].sy0;
  const incomeY1 = flows[flows.length - 1].sy1;

  return (
    <div className="mockup">
      <div className="mock-card" style={{ padding: '0.5rem 0.3rem' }}>
        <div className="mock-section-title" style={{ padding: '0 0.4rem', marginBottom: '0.25rem' }}>
          <BarChart3 className="w-3.5 h-3.5 text-blue-400 inline mr-1" />
          Money Flow — February
        </div>
        <div className="mock-sankey-svg-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} className="mock-sankey-svg">
            {/* Income source node — one tall bar */}
            <rect x={srcX0} y={incomeY0} width={srcNodeW}
              height={incomeY1 - incomeY0} rx={3} fill="#2aaa9a" />

            {/* Flow bands with real curves */}
            {flows.map((f) => {
              // Filled band: top edge curves src→tgt, bottom edge curves back
              const d = [
                `M ${srcX1} ${f.sy0}`,
                `C ${cp1x} ${f.sy0}, ${cp2x} ${f.ty0}, ${tgtX0} ${f.ty0}`,
                `L ${tgtX0} ${f.ty1}`,
                `C ${cp2x} ${f.ty1}, ${cp1x} ${f.sy1}, ${srcX1} ${f.sy1}`,
                'Z',
              ].join(' ');

              return (
                <g key={f.name}>
                  {/* flow band */}
                  <path d={d} fill={f.color} opacity={0.35} />
                  {/* target node */}
                  <rect x={tgtX0} y={f.ty0} width={tgtNodeW} height={f.tgtH} rx={2} fill={f.color} />
                  {/* label */}
                  <text x={tgtX1 + 4} y={f.ty0 + f.tgtH / 2 - 2}
                    fontSize="6.5" fill="#e0f2f0" fontWeight="600" dominantBaseline="middle">
                    {f.name}
                  </text>
                  <text x={tgtX1 + 4} y={f.ty0 + f.tgtH / 2 + 6}
                    fontSize="5.5" fill="#6b8884" dominantBaseline="middle">
                    {f.label}
                  </text>
                </g>
              );
            })}

            {/* Income label (on top of flows, positioned to left of midpoint) */}
            <text x={srcX1 + 6} y={incomeY0 + (incomeY1 - incomeY0) * 0.35}
              fontSize="8" fill="#e0f2f0" fontWeight="700">Income</text>
            <text x={srcX1 + 6} y={incomeY0 + (incomeY1 - incomeY0) * 0.35 + 10}
              fontSize="6" fill="#6b8884">$5,200</text>
          </svg>
        </div>
      </div>
      {/* What-If */}
      <div className="mock-card">
        <div className="mock-section-title">What-If Scenarios</div>
        <div className="mock-whatif">
          <div className="mock-whatif-row">
            <span>Cut dining by 20%</span>
            <span className="text-emerald-400">+$120/mo</span>
          </div>
          <div className="mock-whatif-row">
            <span>Cancel 2 subscriptions</span>
            <span className="text-emerald-400">+$30/mo</span>
          </div>
          <div className="mock-whatif-row">
            <span>Negotiate rent down $100</span>
            <span className="text-emerald-400">+$100/mo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
