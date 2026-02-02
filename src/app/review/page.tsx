'use client';

import { useMonthReview } from '@/lib/hooks/use-data';
import { useState, useEffect, useRef } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function MonthReviewPage() {
  const { data, isLoading } = useMonthReview();
  const [currentCard, setCurrentCard] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const lastWheel = useRef(0);

  const totalCards = 7;
  const isFreeUser = data?.tier === 'free' || data?.tier === 'basic';
  const showPaywall = isFreeUser && currentCard >= 1;

  useEffect(() => {
    // Set first card as active
    if (!isLoading && data) {
      setTimeout(() => {
        const firstCard = document.querySelector('[data-card="0"]');
        firstCard?.classList.add('active');
      }, 100);
    }
  }, [isLoading, data]);

  const goToCard = (index: number) => {
    if (index < 0 || index >= totalCards || isTransitioning) return;
    
    // Free users can't go past card 1
    if (isFreeUser && index > 1) return;
    
    setIsTransitioning(true);
    setCurrentCard(index);

    if (wrapperRef.current) {
      wrapperRef.current.style.transform = `translateY(-${index * 100}vh)`;
    }

    // Update active class
    document.querySelectorAll('.card').forEach((c, i) => {
      c.classList.toggle('active', i === index);
    });

    setTimeout(() => setIsTransitioning(false), 600);
  };

  // Wheel handler
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheel.current < 700) return;
      lastWheel.current = now;

      if (e.deltaY > 0) goToCard(currentCard + 1);
      else if (e.deltaY < 0) goToCard(currentCard - 1);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [currentCard, isTransitioning, isFreeUser]);

  // Touch handlers
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const delta = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(delta) > 50) {
        if (delta > 0) goToCard(currentCard + 1);
        else goToCard(currentCard - 1);
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentCard, isTransitioning, isFreeUser]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        goToCard(currentCard + 1);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToCard(currentCard - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCard, isTransitioning, isFreeUser]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#0c0f0e] flex items-center justify-center">
        <div className="text-[#2aaa9a] animate-pulse text-xl">Loading your review...</div>
      </div>
    );
  }

  if (!data || data.noData) {
    return (
      <div className="fixed inset-0 bg-[#0c0f0e] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <Sparkles className="w-16 h-16 text-[#2aaa9a] mx-auto mb-6" />
          <h1 className="text-3xl  text-[#e8e6e1] mb-4" style={{ fontFamily: 'var(--font-dm-serif-display, serif)' }}>Not enough data yet</h1>
          <p className="text-[#8a9490] mb-8">
            Come back after your first full month of tracking to see your Month in Review!
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-gradient-to-r from-[#1a7a6d] to-[#146b5f] text-white rounded-lg hover:opacity-90 transition"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { headline, wins, surprises, trends, flow, score, nudge, month } = data;

  return (
    <div className="fixed inset-0 bg-[#0c0f0e] overflow-hidden" style={{ fontFamily: 'var(--font-dm-sans, sans-serif)' }}>
      {/* Watermark */}
      <div className="fixed top-5 left-6 text-[#1a7a6d66] text-lg z-50 tracking-wide" style={{ fontFamily: 'var(--font-dm-serif-display, serif)' }}>
        thallo
      </div>

      {/* Page counter */}
      <div className="fixed top-6 right-10 text-[#5a6560] text-xs z-50 tracking-widest">
        {currentCard + 1} / {totalCards}
      </div>

      {/* Nav dots */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-50">
        {Array.from({ length: isFreeUser ? 2 : totalCards }).map((_, i) => (
          <button
            key={i}
            onClick={() => goToCard(i)}
            className={cn(
              'w-1.5 h-1.5 rounded-full transition-all border-none p-0',
              currentCard === i
                ? 'bg-[#2aaa9a] h-5 rounded-sm'
                : 'bg-[#5a6560]'
            )}
          />
        ))}
      </div>

      {/* Scroll hint (only on first card) */}
      {currentCard === 0 && !isFreeUser && (
        <div className="fixed bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-50 animate-bounce">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#5a6560] opacity-40">
            <path d="M12 5v14M19 12l-7 7-7-7"/>
          </svg>
          <span className="text-[#5a6560] text-[11px] uppercase tracking-wider">Swipe up</span>
        </div>
      )}

      {/* Cards wrapper */}
      <div
        ref={wrapperRef}
        className="h-full flex flex-col transition-transform duration-500 ease-in-out"
        style={{ transform: `translateY(-${currentCard * 100}vh)` }}
      >
        {/* CARD 1: HEADLINE */}
        <div className="min-h-screen p-6 flex flex-col justify-center relative overflow-hidden card" data-card="0" style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(26,122,109,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(26,122,109,0.08) 0%, transparent 50%), #0c0f0e'
        }}>
          <div className="max-w-md mx-auto w-full">
            <div className="animate opacity-0 text-[#2aaa9a] text-[13px] uppercase tracking-[3px] font-medium mb-3">{month}</div>
            <h1 className="animate opacity-0 text-[42px] leading-tight mb-10 text-[#e8e6e1]" style={{ fontFamily: 'var(--font-dm-serif-display, serif)' }}>
              Month in<br/>Review
            </h1>
            <div className="animate opacity-0 text-[72px] leading-none text-[#2aaa9a] mb-2 tracking-tight" style={{ fontFamily: 'var(--font-dm-serif-display, serif)' }}>
              ${headline.totalSpent.toLocaleString()}
            </div>
            <div className="animate opacity-0 text-[15px] text-[#8a9490] mb-8">total spent this month</div>
            
            <div className="animate opacity-0 flex justify-between items-center py-4 border-t border-[#1a7a6d26]">
              <span className="text-[14px] text-[#8a9490]">Income</span>
              <span className="text-[18px] font-semibold text-[#e8e6e1]">${headline.totalIncome.toLocaleString()}</span>
            </div>
            <div className="animate opacity-0 flex justify-between items-center py-4 border-t border-[#1a7a6d26]">
              <span className="text-[14px] text-[#8a9490]">Total Spent</span>
              <span className="text-[18px] font-semibold text-[#e05252]">−${headline.totalSpent.toLocaleString()}</span>
            </div>
            
            {headline.surplus > 0 && (
              <div className="animate opacity-0 inline-flex items-center gap-2 bg-[#6db55520] border border-[#6db55540] px-4 py-2 rounded-lg mt-4">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6db555" strokeWidth="2.5">
                  <path d="M12 19V5M5 12l7-7 7 7"/>
                </svg>
                <span className="text-[14px] font-semibold text-[#6db555]">
                  ${Math.abs(headline.surplus).toLocaleString()} surplus — nice work!
                </span>
              </div>
            )}
            {headline.surplus < 0 && (
              <div className="animate opacity-0 inline-flex items-center gap-2 bg-[#e0525220] border border-[#e0525240] px-4 py-2 rounded-lg mt-4">
                <span className="text-[14px] font-semibold text-[#e05252]">
                  ${Math.abs(headline.surplus).toLocaleString()} deficit
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: WINS */}
        <div className="min-h-screen p-6 flex flex-col justify-center relative overflow-hidden card" data-card="1" style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(109,181,85,0.08) 0%, transparent 60%), #0c0f0e'
        }}>
          {showPaywall ? (
            <div className="max-w-md mx-auto w-full relative">
              {/* Blurred background */}
              <div className="filter blur-md opacity-30 select-none pointer-events-none">
                <div className="text-[11px] uppercase tracking-[3px] text-[#1a7a6d] font-semibold mb-4">Your Wins</div>
                <h2 className=" text-[32px] leading-tight mb-8 text-[#e8e6e1]" style={{ fontFamily: 'var(--font-dm-serif-display, serif)' }}>
                  You crushed it in<br/><span className="text-[#6db555]">6 out of 10</span> categories
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-[#ffffff08] border border-[#1a7a6d26] rounded-2xl p-5 text-center">
                      <div className="text-2xl mb-2">🎯</div>
                      <div className="text-2xl font-bold text-[#6db555] mb-1">6/10</div>
                      <div className="text-xs text-[#8a9490]">Categories on budget</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Paywall overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0c0f0e]/60 backdrop-blur-sm">
                <div className="text-center max-w-xs px-6">
                  <div className="w-16 h-16 rounded-full bg-[#1a7a6d33] flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-8 h-8 text-[#2aaa9a]" />
                  </div>
                  <h3 className="text-2xl  text-[#e8e6e1] mb-3" style={{ fontFamily: 'var(--font-dm-serif-display, serif)' }}>Unlock your full Month in Review</h3>
                  <p className="text-[#8a9490] mb-8 text-sm">
                    See your wins, trends, and AI insights with Thallo Plus
                  </p>
                  <Link
                    href="/settings"
                    className="inline-block px-8 py-3 bg-gradient-to-r from-[#1a7a6d] to-[#146b5f] text-white rounded-xl font-semibold hover:opacity-90 transition"
                  >
                    Upgrade to Plus
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto w-full">
              <div className="animate opacity-0 text-[11px] uppercase tracking-[3px] text-[#1a7a6d] font-semibold mb-4">Your Wins</div>
              <h2 className="animate opacity-0  text-[32px] leading-tight mb-8 text-[#e8e6e1]" style={{ fontFamily: 'var(--font-dm-serif-display, serif)' }}>
                You crushed it in<br/><span className="text-[#6db555]">{wins.categoriesOnBudget} out of {wins.totalCategories}</span> categories
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="animate opacity-0 bg-[#ffffff08] border border-[#1a7a6d26] rounded-2xl p-5 text-center">
                  <div className="text-2xl mb-2">🎯</div>
                  <div className="text-2xl font-bold text-[#6db555] mb-1">{wins.categoriesOnBudget}/{wins.totalCategories}</div>
                  <div className="text-xs text-[#8a9490] leading-tight">Categories on or under budget</div>
                </div>
                
                <div className="animate opacity-0 bg-[#ffffff08] border border-[#1a7a6d26] rounded-2xl p-5 text-center">
                  <div className="text-2xl mb-2">💰</div>
                  <div className="text-2xl font-bold text-[#6db555] mb-1">${wins.totalSavedVsBudget}</div>
                  <div className="text-xs text-[#8a9490] leading-tight">Saved vs. budgeted</div>
                </div>

                {wins.bestCategory && (
                  <>
                    <div className="animate opacity-0 bg-[#ffffff08] border border-[#1a7a6d26] rounded-2xl p-5 text-center">
                      <div className="text-2xl mb-2">📉</div>
                      <div className="text-2xl font-bold text-[#6db555] mb-1">{wins.bestCategory.pctUnder}%</div>
                      <div className="text-xs text-[#8a9490] leading-tight">Under on {wins.bestCategory.name}</div>
                    </div>
                    
                    <div className="animate opacity-0 bg-[#ffffff08] border border-[#1a7a6d26] rounded-2xl p-5 text-center">
                      <div className="text-2xl mb-2">🔥</div>
                      <div className="text-2xl font-bold text-[#6db555] mb-1">{wins.surplusStreak} mo</div>
                      <div className="text-xs text-[#8a9490] leading-tight">Consecutive surplus months</div>
                    </div>
                  </>
                )}
              </div>

              {wins.bestCategory && (
                <div className="animate opacity-0 bg-[#6db55515] border border-[#6db55533] rounded-2xl p-5 flex items-center gap-4 mt-3">
                  <div className="text-4xl">🏆</div>
                  <div>
                    <div className="text-lg font-bold text-[#e8e6e1] mb-1">Best: {wins.bestCategory.name}</div>
                    <div className="text-xs text-[#8a9490]">${wins.bestCategory.savedAmount} under budget — {wins.bestCategory.pctUnder}% savings</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rest of cards only render for paid users */}
        {!isFreeUser && (
          <>
            {/* CARD 3: SURPRISES */}
            <div className="min-h-screen p-6 flex flex-col justify-center relative overflow-hidden card" data-card="2" style={{
              background: 'radial-gradient(ellipse at 60% 40%, rgba(224,82,82,0.08) 0%, transparent 60%), #0c0f0e'
            }}>
              <div className="max-w-md mx-auto w-full">
                <div className="animate opacity-0 text-[11px] uppercase tracking-[3px] text-[#1a7a6d] font-semibold mb-4">Heads Up</div>
                <h2 className="animate opacity-0  text-[32px] leading-tight mb-8 text-[#e8e6e1]" style={{ fontFamily: 'var(--font-dm-serif-display, serif)' }}>
                  {surprises.overshoots.length > 0 ? (
                    <>
                      {surprises.overshoots[0].category.split(' ').slice(1).join(' ')} was your<br/>
                      <span className="text-[#e05252]">biggest overshoot</span>
                    </>
                  ) : (
                    <>All budgets<br/><span className="text-[#6db555]">stayed on track!</span></>
                  )}
                </h2>

                {surprises.overshoots.map((o: { category: string; budgeted: number; actual: number; pctOver: number }, i: number) => (
                  <div key={i} className="animate opacity-0 mb-6">
                    <div className="flex justify-between mb-2 text-[13px]">
                      <span className="text-[#e8e6e1] font-medium">{o.category}</span>
                      <span className="text-[#e05252] font-semibold">+{o.pctOver}% over</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#ffffff10] relative overflow-hidden">
                      <div
                        className="h-full bg-[#1a7a6d] rounded-full absolute left-0 top-0"
                        style={{ width: `${Math.min((o.budgeted / o.actual) * 100, 100)}%` }}
                      />
                      <div
                        className="h-full bg-[#e05252] opacity-60 rounded-full absolute left-0 top-0"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                ))}

                {surprises.overshoots.length > 0 && (
                  <div className="animate opacity-0 mt-8 space-y-0 border-t border-[#ffffff0a]">
                    <div className="flex justify-between py-3 text-[13px] border-b border-[#ffffff0a]">
                      <span className="text-[#8a9490]">Budgeted for {surprises.overshoots[0].category.split(' ').slice(1).join(' ')}</span>
                      <span className="text-[#e8e6e1] font-medium">${surprises.overshoots[0].budgeted}</span>
                    </div>
                    <div className="flex justify-between py-3 text-[13px] border-b border-[#ffffff0a]">
                      <span className="text-[#8a9490]">Actually spent</span>
                      <span className="text-[#e05252] font-medium">${surprises.overshoots[0].actual}</span>
                    </div>
                    <div className="flex justify-between py-3 text-[13px]">
                      <span className="text-[#8a9490]">Over by</span>
                      <span className="text-[#e05252] font-medium">+${surprises.overshoots[0].actual - surprises.overshoots[0].budgeted}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CARD 4: TRENDS */}
            <div className="min-h-screen p-6 flex flex-col justify-center relative overflow-hidden card" data-card="3" style={{
              background: 'radial-gradient(ellipse at 40% 60%, rgba(26,122,109,0.1) 0%, transparent 60%), #0c0f0e'
            }}>
              <div className="max-w-md mx-auto w-full">
                <div className="animate opacity-0 text-[11px] uppercase tracking-[3px] text-[#1a7a6d] font-semibold mb-4">Spending Trends</div>
                <h2 className="animate opacity-0  text-[32px] leading-tight mb-8 text-[#e8e6e1]" style={{ fontFamily: 'var(--font-dm-serif-display, serif)' }}>
                  How your categories<br/>moved over <span className="text-[#2aaa9a]">3 months</span>
                </h2>

                <div className="space-y-3">
                  {trends.map((t: { category: string; months: number[]; changePercent: number; direction: 'up' | 'down' | 'flat' }, i: number) => {
                    const max = Math.max(...t.months);
                    const points = t.months.map((val, idx) => {
                      const x = 5 + (idx * 35);
                      const y = 22 - ((val / max) * 14);
                      return `${x},${y}`;
                    }).join(' ');

                    const color = t.direction === 'up' ? '#e05252' : t.direction === 'down' ? '#6db555' : '#5a6560';

                    return (
                      <div key={i} className="animate opacity-0 flex items-center py-3 border-b border-[#ffffff0a]">
                        <span className="flex-1 text-[14px] font-medium text-[#e8e6e1]">{t.category}</span>
                        <div className="w-20 h-7">
                          <svg viewBox="0 0 80 28" className="w-full h-full">
                            <polyline
                              points={points}
                              fill="none"
                              stroke={color}
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <circle cx={5 + (2 * 35)} cy={22 - ((t.months[2] / max) * 14)} r="3" fill={color} />
                          </svg>
                        </div>
                        <span className={cn(
                          'w-16 text-right text-[13px] font-semibold',
                          t.direction === 'up' ? 'text-[#e05252]' : t.direction === 'down' ? 'text-[#6db555]' : 'text-[#5a6560]'
                        )}>
                          {t.direction === 'up' ? '↑' : t.direction === 'down' ? '↓' : '—'} {Math.abs(t.changePercent)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CARD 5: FLOW */}
            <div className="min-h-screen p-6 flex flex-col justify-center relative overflow-hidden card" data-card="4" style={{
              background: 'radial-gradient(ellipse at 50% 50%, rgba(26,122,109,0.1) 0%, transparent 50%), #0c0f0e'
            }}>
              <div className="max-w-md mx-auto w-full">
                <div className="animate opacity-0 text-[11px] uppercase tracking-[3px] text-[#1a7a6d] font-semibold mb-4">Money Flow</div>
                <h2 className="animate opacity-0  text-[32px] leading-tight mb-8 text-[#e8e6e1]" style={{ fontFamily: 'var(--font-dm-serif-display, serif)' }}>
                  Where your <span className="text-[#2aaa9a]">${flow.income.toLocaleString()}</span><br/>actually went
                </h2>

                <div className="animate opacity-0 text-center mb-6">
                  <div className=" text-4xl text-[#2aaa9a] mb-1" style={{ fontFamily: 'var(--font-dm-serif-display, serif)' }}>${flow.income.toLocaleString()}</div>
                  <div className="text-xs text-[#8a9490]">Monthly Income</div>
                </div>

                <div className="animate opacity-0 flex justify-center mb-4">
                  <svg width="200" height="40" viewBox="0 0 200 40">
                    <path d="M100,0 L30,40" stroke="rgba(74,144,217,0.3)" strokeWidth="1.5" fill="none"/>
                    <path d="M100,0 L100,40" stroke="rgba(26,122,109,0.3)" strokeWidth="1.5" fill="none"/>
                    <path d="M100,0 L170,40" stroke="rgba(109,181,85,0.3)" strokeWidth="1.5" fill="none"/>
                  </svg>
                </div>

                <div className="animate opacity-0 flex gap-2">
                  <div className="flex-1 bg-[#4a90d920] border border-[#4a90d933] rounded-2xl p-5 text-center relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-[#ffffff1a]" />
                    <div className="text-3xl font-bold text-[#4a90d9] mb-1">{flow.needs.pct}%</div>
                    <div className="text-[11px] text-[#8a9490] uppercase tracking-wide mb-2">Needs</div>
                    <div className="text-sm font-semibold text-[#e8e6e1]">${flow.needs.amount.toLocaleString()}</div>
                  </div>

                  <div className="flex-1 bg-[#1a7a6d20] border border-[#1a7a6d33] rounded-2xl p-5 text-center relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-[#ffffff1a]" />
                    <div className="text-3xl font-bold text-[#2aaa9a] mb-1">{flow.wants.pct}%</div>
                    <div className="text-[11px] text-[#8a9490] uppercase tracking-wide mb-2">Wants</div>
                    <div className="text-sm font-semibold text-[#e8e6e1]">${flow.wants.amount.toLocaleString()}</div>
                  </div>

                  <div className="flex-1 bg-[#6db55520] border border-[#6db55533] rounded-2xl p-5 text-center relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-[#ffffff1a]" />
                    <div className="text-3xl font-bold text-[#6db555] mb-1">{flow.savings.pct}%</div>
                    <div className="text-[11px] text-[#8a9490] uppercase tracking-wide mb-2">Savings</div>
                    <div className="text-sm font-semibold text-[#e8e6e1]">${flow.savings.amount.toLocaleString()}</div>
                  </div>
                </div>

                <div className="animate opacity-0 text-xs text-center text-[#5a6560] mt-4">
                  Target: <span className="text-[#8a9490]">50 / 30 / 20</span> · Actual: <span className="text-[#8a9490]">{flow.needs.pct} / {flow.wants.pct} / {flow.savings.pct}</span>
                </div>
              </div>
            </div>

            {/* CARD 6: SCORE */}
            <div className="min-h-screen p-6 flex flex-col justify-center relative overflow-hidden card" data-card="5" style={{
              background: 'radial-gradient(ellipse at 50% 30%, rgba(26,122,109,0.12) 0%, transparent 60%), #0c0f0e'
            }}>
              <div className="max-w-md mx-auto w-full text-center">
                <div className="animate opacity-0 text-[11px] uppercase tracking-[3px] text-[#1a7a6d] font-semibold mb-4">Financial Health</div>
                <h2 className="animate opacity-0  text-[32px] leading-tight mb-8 text-[#e8e6e1]" style={{ fontFamily: 'var(--font-dm-serif-display, serif)' }}>
                  Your score this month
                </h2>

                <div className="animate opacity-0 w-44 h-44 mx-auto mb-6 relative">
                  <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                    <defs>
                      <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#1a7a6d" />
                        <stop offset="100%" stopColor="#6db555" />
                      </linearGradient>
                    </defs>
                    <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="url(#scoreGradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="440"
                      strokeDashoffset={440 - (440 * score.current / 1000)}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className=" text-5xl text-[#2aaa9a]" style={{ fontFamily: 'var(--font-dm-serif-display, serif)' }}>{score.current}</div>
                    <div className="text-xs text-[#8a9490]">out of 1000</div>
                  </div>
                </div>

                {score.change !== 0 && (
                  <div className={cn(
                    "animate opacity-0 inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8",
                    score.change > 0 ? "bg-[#6db55520] border border-[#6db55533]" : "bg-[#e0525220] border border-[#e0525233]"
                  )}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={score.change > 0 ? "#6db555" : "#e05252"} strokeWidth="2.5">
                      <path d={score.change > 0 ? "M12 19V5M5 12l7-7 7 7" : "M12 5v14M19 12l-7 7-7-7"}/>
                    </svg>
                    <span className={cn("text-sm font-semibold", score.change > 0 ? "text-[#6db555]" : "text-[#e05252]")}>
                      {score.change > 0 ? '+' : ''}{score.change} points from last month
                    </span>
                  </div>
                )}

                <div className="animate opacity-0 text-left space-y-0">
                  {score.factors.map((f: { name: string; description: string; impact: number }, i: number) => (
                    <div key={i} className="flex items-center gap-3 py-3 border-b border-[#ffffff0a]">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-base",
                        f.impact > 0 ? "bg-[#6db55526]" : f.impact < 0 ? "bg-[#e0525226]" : "bg-[#ffffff0a]"
                      )}>
                        {f.name === 'Budget Adherence' ? '📊' : f.name === 'Savings Rate' ? '💰' : '🍽️'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#e8e6e1]">{f.name}</div>
                        <div className="text-xs text-[#8a9490]">{f.description}</div>
                      </div>
                      <div className={cn(
                        "text-sm font-semibold",
                        f.impact > 0 ? "text-[#6db555]" : f.impact < 0 ? "text-[#e05252]" : "text-[#8a9490]"
                      )}>
                        {f.impact > 0 ? '+' : ''}{f.impact}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CARD 7: NUDGE */}
            <div className="min-h-screen p-6 flex flex-col justify-center relative overflow-hidden card" data-card="6" style={{
              background: 'radial-gradient(ellipse at 30% 70%, rgba(26,122,109,0.12) 0%, transparent 60%), #0c0f0e'
            }}>
              <div className="max-w-md mx-auto w-full">
                <div className="animate opacity-0 text-[11px] uppercase tracking-[3px] text-[#1a7a6d] font-semibold mb-4">
                  Your {new Date(new Date(data.monthStr).setMonth(new Date(data.monthStr).getMonth() + 1)).toLocaleDateString('en-US', { month: 'long' })} Game Plan
                </div>
                <h2 className="animate opacity-0  text-[32px] leading-tight mb-8 text-[#e8e6e1]" style={{ fontFamily: 'var(--font-dm-serif-display, serif)' }}>
                  One move to make<br/><span className="text-[#2aaa9a]">next month</span>
                </h2>

                {nudge ? (
                  <>
                    <div className="animate opacity-0 bg-[#1a7a6d14] border border-[#1a7a6d33] rounded-2xl p-7 mb-4">
                      <div className="text-3xl mb-4">{nudge.primary.emoji}</div>
                      <div className="text-base leading-relaxed text-[#e8e6e1] mb-4">
                        {nudge.primary.text}
                      </div>
                      <div className="text-[13px] text-[#2aaa9a] font-medium">
                        💡 {nudge.primary.impact}
                      </div>
                    </div>

                    <div className="animate opacity-0 bg-[#ffffff08] border border-[#ffffff10] rounded-xl p-5">
                      <div className="text-xs font-semibold text-[#8a9490] uppercase tracking-wide mb-3">Also worth watching</div>
                      <div className="space-y-2">
                        {nudge.secondary.map((s: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-[13px] text-[#8a9490]">
                            <div className="w-1 h-1 rounded-full bg-[#1a7a6d] flex-shrink-0" />
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="animate opacity-0 flex gap-3 mt-7">
                      <Link
                        href="/budgets"
                        className="flex-1 px-6 py-3 bg-[#ffffff10] border border-[#ffffff1a] text-[#e8e6e1] rounded-xl text-[14px] font-semibold text-center hover:bg-[#ffffff15] transition"
                      >
                        View Budgets
                      </Link>
                      <Link
                        href="/dashboard"
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1a7a6d] to-[#146b5f] text-white rounded-xl text-[14px] font-semibold text-center hover:opacity-90 transition"
                      >
                        Dashboard →
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-[#8a9490]">
                    <p>Upgrade to Plus to unlock AI-powered insights for next month!</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .card.active .animate {
          animation: fadeInUp 0.6s ease forwards;
        }

        .card.active .animate:nth-child(1) { animation-delay: 0.1s; }
        .card.active .animate:nth-child(2) { animation-delay: 0.2s; }
        .card.active .animate:nth-child(3) { animation-delay: 0.3s; }
        .card.active .animate:nth-child(4) { animation-delay: 0.4s; }
        .card.active .animate:nth-child(5) { animation-delay: 0.5s; }
        .card.active .animate:nth-child(6) { animation-delay: 0.6s; }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
