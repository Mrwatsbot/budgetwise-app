'use client';

import { useReports, useDashboard } from '@/lib/hooks/use-data';
import { AppShell } from '@/components/layout/app-shell';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ============================================================
// TYPES
// ============================================================

interface CategoryReport {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  budgeted: number;
  spent: number;
  prevSpent: number;
}

interface ReportsData {
  monthlyIncome: number;
  totalSpent: number;
  surplus: number;
  totalSavingsTarget: number;
  categories: CategoryReport[];
  tier: string;
}

interface Particle {
  link: SankeyLinkData;
  progress: number;
  speed: number;
  radius: number;
  opacity: number;
  pulsePhase: number;
  color: string;
}

interface SankeyLinkData {
  source: { x0: number; x1: number; y0: number; y1: number; id: number };
  target: { x0: number; x1: number; y0: number; y1: number; id: number };
  y0: number;
  y1: number;
  width: number;
  color: string;
  index: number;
  value: number;
}

// ============================================================
// HELPERS
// ============================================================

function hexToRGBA(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function ensureHash(color: string): string {
  if (!color) return '#a855f7';
  return color.startsWith('#') ? color : `#${color}`;
}

// ============================================================
// SANKEY CHART COMPONENT
// ============================================================

function SankeyChart({
  income,
  categories,
  whatIfValues,
  viewMode = 'budget',
  onSelectCategory,
}: {
  income: number;
  categories: CategoryReport[];
  whatIfValues: number[];
  viewMode?: 'budget' | 'actual';
  onSelectCategory?: (cat: CategoryReport | null, value: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const linksDataRef = useRef<SankeyLinkData[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);

  // Responsive resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      const mobile = width < 640;
      setDimensions({ width, height: mobile ? 500 : 400 });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Build Sankey + particles
  useEffect(() => {
    if (!dimensions.width || !svgRef.current) return;

    const buildChart = async () => {
      const d3 = await import('d3');
      const { sankey, sankeyLinkHorizontal, sankeyLeft } = await import('d3-sankey');

      const { width, height } = dimensions;
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      // Use budget or actual values depending on view mode
      const baseValues = whatIfValues.length
        ? whatIfValues
        : viewMode === 'budget'
          ? categories.map((c) => c.budgeted)
          : categories.map((c) => c.spent);
      const totalAllocated = baseValues.reduce((a, b) => a + b, 0);
      const currentSurplus = income - totalAllocated;

      // Filter out zero-value categories for cleaner chart
      const activeCategories = categories.filter((_, i) => baseValues[i] > 0);
      const activeValues = baseValues.filter((v) => v > 0);

      // Build node/link data
      const nodes = [
        { name: 'Income', id: 0, color: '#2aaa9a' },
        ...activeCategories.map((c, i) => ({ name: c.name, id: i + 1, color: ensureHash(c.color) })),
        ...(currentSurplus > 0
          ? [{ name: viewMode === 'budget' ? 'Unbudgeted' : 'Surplus', id: activeCategories.length + 1, color: '#7aba5c' }]
          : []),
      ];

      const links = [
        ...activeCategories.map((c, i) => ({
          source: 0,
          target: i + 1,
          value: Math.max(1, activeValues[i]),
          color: ensureHash(c.color),
        })),
        ...(currentSurplus > 0
          ? [{ source: 0, target: activeCategories.length + 1, value: currentSurplus, color: '#7aba5c' }]
          : []),
      ];

      if (links.length === 0) return;

      const sankeyGen = sankey<{ name: string; id: number; color: string }, { color: string }>()
        .nodeId((d: { id: number }) => d.id)
        .nodeWidth(width < 640 ? 14 : 18)
        .nodePadding(width < 640 ? 10 : 14)
        .nodeAlign(sankeyLeft)
        .extent([
          [1, 20],
          [width - 1, height - 20],
        ]);

      const graph = sankeyGen({
        nodes: nodes.map((d) => ({ ...d })),
        links: links.map((d) => ({ ...d })),
      });

      const sNodes = graph.nodes;
      const sLinks = graph.links as unknown as SankeyLinkData[];
      linksDataRef.current = sLinks;

      // Store active categories for tap-to-select lookups
      const activeCatsRef = activeCategories;

      // Draw links with class for highlight targeting
      const linkPaths = svg
        .append('g')
        .selectAll('path')
        .data(sLinks)
        .join('path')
        .attr('class', (d: any) => `sankey-link link-source-${d.source.id} link-target-${d.target.id}`)
        .attr('d', sankeyLinkHorizontal() as unknown as string)
        .attr('fill', 'none')
        .attr('stroke', (d: SankeyLinkData) => d.color)
        .attr('stroke-opacity', 0.35)
        .attr('stroke-width', (d: SankeyLinkData) => Math.max(1, d.width));

      // Draw nodes
      const nodeG = svg
        .append('g')
        .selectAll('g')
        .data(sNodes)
        .join('g')
        .attr('class', (d: any) => `sankey-node node-${d.id}`)
        .style('cursor', 'pointer');

      nodeG
        .append('rect')
        .attr('x', (d: any) => d.x0)
        .attr('y', (d: any) => d.y0)
        .attr('height', (d: any) => d.y1 - d.y0)
        .attr('width', (d: any) => d.x1 - d.x0)
        .attr('fill', (d: any) => d.color || '#2aaa9a')
        .attr('rx', 4);

      // Labels
      nodeG
        .append('text')
        .attr('x', (d: any) => (d.x0 < width / 2 ? d.x1 + 8 : d.x0 - 8))
        .attr('y', (d: any) => (d.y1 + d.y0) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', (d: any) => (d.x0 < width / 2 ? 'start' : 'end'))
        .attr('fill', '#e8e6e1')
        .attr('font-size', width < 640 ? '10px' : '12px')
        .text((d: any) => {
          const val =
            d.id === 0
              ? income
              : d.targetLinks?.[0]?.value || d.sourceLinks?.[0]?.value || 0;
          return `${d.name}  $${val.toLocaleString()}`;
        });

      // Tap/click to highlight a node and its connected links
      nodeG.on('click', function (event: any, d: any) {
        event.stopPropagation();
        const nodeId = d.id;
        const isDeselect = selectedNodeId === nodeId;

        if (isDeselect) {
          // Reset all
          setSelectedNodeId(null);
          svg.selectAll('.sankey-link').attr('stroke-opacity', 0.35);
          svg.selectAll('.sankey-node rect').attr('opacity', 1);
          svg.selectAll('.sankey-node text').attr('opacity', 1);
          if (onSelectCategory) onSelectCategory(null, 0);
        } else {
          setSelectedNodeId(nodeId);

          // Dim everything
          svg.selectAll('.sankey-link').attr('stroke-opacity', 0.08);
          svg.selectAll('.sankey-node rect').attr('opacity', 0.25);
          svg.selectAll('.sankey-node text').attr('opacity', 0.3);

          // Highlight connected links
          svg.selectAll(`.link-source-${nodeId}, .link-target-${nodeId}`)
            .attr('stroke-opacity', 0.7);

          // Highlight this node + income node (source)
          svg.select(`.node-${nodeId} rect`).attr('opacity', 1);
          svg.select(`.node-${nodeId} text`).attr('opacity', 1);
          svg.select(`.node-0 rect`).attr('opacity', 1);
          svg.select(`.node-0 text`).attr('opacity', 1);

          // Callback with category details
          if (onSelectCategory && nodeId > 0) {
            const catIdx = nodeId - 1;
            const cat = activeCatsRef[catIdx];
            const val = activeValues[catIdx] || 0;
            if (cat) onSelectCategory(cat, val);
          }
        }
      });

      // Click on background to deselect
      svg.on('click', () => {
        setSelectedNodeId(null);
        svg.selectAll('.sankey-link').attr('stroke-opacity', 0.35);
        svg.selectAll('.sankey-node rect').attr('opacity', 1);
        svg.selectAll('.sankey-node text').attr('opacity', 1);
        if (onSelectCategory) onSelectCategory(null, 0);
      });

      // Init particles
      const particles: Particle[] = [];
      sLinks.forEach((link) => {
        const count = Math.max(2, Math.min(8, Math.floor(link.width / 8)));
        for (let i = 0; i < count; i++) {
          particles.push({
            link,
            progress: i / count,
            speed: 0.0007 + Math.random() * 0.0013,
            radius: 1.5 + Math.random() * 1.5,
            opacity: 0.4 + Math.random() * 0.4,
            pulsePhase: Math.random() * Math.PI * 2,
            color: link.color,
          });
        }
      });
      particlesRef.current = particles;
    };

    buildChart();
  }, [dimensions, income, categories, whatIfValues, viewMode]);

  // Canvas particle animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dimensions.width) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      const particles = particlesRef.current;

      particles.forEach((p) => {
        p.progress += p.speed;
        if (p.progress >= 1) {
          p.progress = 0;
          p.speed = 0.0007 + Math.random() * 0.0013;
        }

        p.pulsePhase += 0.015;
        const pulse = 0.7 + 0.3 * Math.sin(p.pulsePhase);

        // Position along the cubic bezier path of the sankey link
        const link = p.link;
        const t = p.progress;
        const mt = 1 - t;
        const sx = link.source.x1;
        const tx = link.target.x0;
        const midX = (sx + tx) / 2;
        const sy = link.y0;
        const ty = link.y1;

        const cx = mt * mt * mt * sx + 3 * mt * mt * t * midX + 3 * mt * t * t * midX + t * t * t * tx;
        const cy = mt * mt * mt * sy + 3 * mt * mt * t * sy + 3 * mt * t * t * ty + t * t * t * ty;

        const halfWidth = link.width / 2;
        const offset = Math.sin(t * Math.PI * 4 + p.pulsePhase) * halfWidth * 0.3;
        const x = cx;
        const y = cy + offset;

        // Glow
        const glowRadius = p.radius * 3 * pulse;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
        gradient.addColorStop(0, hexToRGBA(p.color, p.opacity * pulse * 0.8));
        gradient.addColorStop(0.4, hexToRGBA(p.color, p.opacity * pulse * 0.3));
        gradient.addColorStop(1, hexToRGBA(p.color, 0));
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(x, y, p.radius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = hexToRGBA(p.color, p.opacity * pulse);
        ctx.fill();
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [dimensions]);

  return (
    <div ref={containerRef} className="relative w-full" style={{ minHeight: dimensions.height || 400 }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full overflow-visible"
        style={{ height: dimensions.height }}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ width: dimensions.width, height: dimensions.height }}
      />
    </div>
  );
}

// ============================================================
// WHAT-IF PANEL COMPONENT
// ============================================================

function WhatIfPanel({
  categories,
  income,
  values,
  onValuesChange,
  onReset,
}: {
  categories: CategoryReport[];
  income: number;
  values: number[];
  onValuesChange: (values: number[]) => void;
  onReset: () => void;
}) {
  const totalSpent = values.reduce((a, b) => a + b, 0);
  const whatIfSurplus = income - totalSpent;

  return (
    <div className="bg-[rgba(10,15,13,0.5)] border border-[#1a2620] rounded-xl p-5">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-semibold text-[#6b7f74] uppercase tracking-wider">
          Adjust Spending
        </span>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-[#6b7f74] border border-[#1a2620] rounded-full px-3 py-1 hover:border-[#1a7a6d] hover:text-[#e8e6e1] transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map((cat, i) => (
          <div key={cat.id} className="flex items-center gap-3">
            <span
              className="w-24 text-xs flex-shrink-0 truncate"
              style={{ color: ensureHash(cat.color) }}
            >
              {cat.name}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(cat.spent * 2, cat.budgeted * 2, Math.round(income * 0.4), 200)}
              value={values[i] ?? 0}
              onChange={(e) => {
                const newValues = [...values];
                newValues[i] = parseInt(e.target.value);
                onValuesChange(newValues);
              }}
              className="flex-1 h-1 rounded-full bg-[#1a2620] appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#2aaa9a]
                [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#111916]
                [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:hover:scale-125"
            />
            <span className="w-16 text-right text-xs font-semibold text-[#e8e6e1] tabular-nums flex-shrink-0">
              ${(values[i] ?? 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-[#1a2620] flex items-baseline gap-2">
        <span className="text-sm text-[#6b7f74]">Surplus would be</span>
        <span
          className={cn('text-xl font-bold', whatIfSurplus >= 0 ? 'text-[#7aba5c]' : 'text-[#ef4444]')}
        >
          {whatIfSurplus >= 0 ? '+' : ''}${Math.abs(whatIfSurplus).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// PAYWALL COMPONENT
// ============================================================

function PremiumPaywall() {
  return (
    <div className="relative">
      {/* Blurred preview */}
      <div className="filter blur-md opacity-30 select-none pointer-events-none space-y-6">
        <div className="bg-[#111916] border border-[#1a2620] rounded-2xl p-6 h-[350px]" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#111916] border border-[#1a2620] rounded-2xl p-6 h-[300px]" />
          <div className="bg-[#111916] border border-[#1a2620] rounded-2xl p-6 h-[300px]" />
        </div>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0c0f0e]/60 backdrop-blur-sm">
        <div className="text-center max-w-xs px-6">
          <div className="w-16 h-16 rounded-full bg-[#1a7a6d33] flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-[#2aaa9a]" />
          </div>
          <h3
            className="text-2xl text-[#e8e6e1] mb-3"
            style={{ fontFamily: 'var(--font-display, serif)' }}
          >
            Unlock Reports
          </h3>
          <p className="text-[#8a9490] mb-8 text-sm">
            Visualize your money flow, spending landscape, and budget performance with Thallo Plus
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
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function ReportsPage() {
  const { data: dashData } = useDashboard();
  const { data, isLoading } = useReports();
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [whatIfValues, setWhatIfValues] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'budget' | 'actual'>('budget');
  const [selectedCat, setSelectedCat] = useState<{ cat: CategoryReport; value: number } | null>(null);

  const reportData = data as ReportsData | undefined;
  const categories = reportData?.categories || [];
  const income = reportData?.monthlyIncome || 0;
  const surplus = reportData?.surplus || 0;
  const tier = reportData?.tier || 'free';
  const isFreeUser = tier === 'free' || tier === 'basic';

  // Initialize what-if values when data loads
  useEffect(() => {
    if (categories.length > 0 && whatIfValues.length === 0) {
      setWhatIfValues(categories.map((c) => c.spent));
    }
  }, [categories]);

  const handleWhatIfReset = useCallback(() => {
    setWhatIfValues(categories.map((c) => c.spent));
  }, [categories]);

  if (isLoading) {
    return (
      <AppShell user={dashData?.user}>
        <div className="space-y-6 animate-pulse">
          <div>
            <div className="h-8 w-48 bg-secondary rounded-lg mb-2" />
            <div className="h-4 w-72 bg-secondary/60 rounded-lg" />
          </div>
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 h-20 bg-secondary rounded-xl" />
            ))}
          </div>
          <div className="bg-secondary rounded-2xl h-[420px]" />
        </div>
      </AppShell>
    );
  }

  if (!reportData || categories.length === 0) {
    return (
      <AppShell user={dashData?.user}>
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-6">📊</div>
            <h1
              className="text-3xl text-[#e8e6e1] mb-4"
              style={{ fontFamily: 'var(--font-display, serif)' }}
            >
              No report data yet
            </h1>
            <p className="text-[#8a9490] mb-8">
              Set up your budgets and start tracking transactions to see your reports here.
            </p>
            <Link
              href="/budgets"
              className="inline-block px-6 py-3 bg-gradient-to-r from-[#1a7a6d] to-[#146b5f] text-white rounded-lg hover:opacity-90 transition"
            >
              Set Up Budgets
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  if (isFreeUser) {
    return (
      <AppShell user={dashData?.user}>
        <div>
          <div className="mb-6">
            <h1
              className="text-3xl text-[#e8e6e1] mb-1"
              style={{ fontFamily: 'var(--font-display, serif)' }}
            >
              Reports
            </h1>
            <p className="text-sm text-[#6b7f74]">
              Visual breakdowns of where your money goes.
            </p>
          </div>
          <PremiumPaywall />
        </div>
      </AppShell>
    );
  }

  const totalSpent = reportData.totalSpent;

  return (
    <AppShell user={dashData?.user}>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-3xl text-[#e8e6e1] mb-1"
          style={{ fontFamily: 'var(--font-display, serif)' }}
        >
          Reports
        </h1>
        <p className="text-sm text-[#6b7f74]">
          Visual breakdowns of where your money goes.
        </p>
      </div>

      {/* View mode toggle */}
      <div className="flex items-center gap-1 bg-[#111916] border border-[#1a2620] rounded-full p-1 w-fit">
        <button
          onClick={() => setViewMode('budget')}
          className={cn(
            'px-4 py-1.5 rounded-full text-xs font-semibold transition-all',
            viewMode === 'budget'
              ? 'bg-[#1a7a6d] text-white'
              : 'text-[#6b7f74] hover:text-[#e8e6e1]',
          )}
        >
          Budget Plan
        </button>
        <button
          onClick={() => setViewMode('actual')}
          className={cn(
            'px-4 py-1.5 rounded-full text-xs font-semibold transition-all',
            viewMode === 'actual'
              ? 'bg-[#1a7a6d] text-white'
              : 'text-[#6b7f74] hover:text-[#e8e6e1]',
          )}
        >
          Actual Spending
        </button>
      </div>

      {/* Summary cards */}
      {(() => {
        const totalBudgeted = categories.reduce((s, c) => s + c.budgeted, 0);
        const cardMiddle = viewMode === 'budget' ? totalBudgeted : totalSpent;
        const cardLabel = viewMode === 'budget' ? 'Budgeted' : 'Spent';
        const cardRight = income - cardMiddle;
        const rightLabel = viewMode === 'budget' ? 'Unbudgeted' : 'Surplus';
        return (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#111916] border border-[#1a2620] rounded-xl p-4 text-center">
              <div className="text-xs text-[#6b7f74] uppercase tracking-wider mb-1">Income</div>
              <div className="text-xl font-bold text-[#2aaa9a]">${income.toLocaleString()}</div>
            </div>
            <div className="bg-[#111916] border border-[#1a2620] rounded-xl p-4 text-center">
              <div className="text-xs text-[#6b7f74] uppercase tracking-wider mb-1">{cardLabel}</div>
              <div className="text-xl font-bold text-[#e8e6e1]">${cardMiddle.toLocaleString()}</div>
            </div>
            <div className="bg-[#111916] border border-[#1a2620] rounded-xl p-4 text-center">
              <div className="text-xs text-[#6b7f74] uppercase tracking-wider mb-1">{rightLabel}</div>
              <div
                className={cn('text-xl font-bold', cardRight >= 0 ? 'text-[#7aba5c]' : 'text-[#ef4444]')}
              >
                {cardRight >= 0 ? '+' : ''}${Math.abs(cardRight).toLocaleString()}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Sankey Card */}
      <div className="bg-[#111916] border border-[#1a2620] rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#2aaa9a] to-[#7aba5c] opacity-60" />
        <h2 className="text-lg font-semibold text-[#e8e6e1] mb-1">Money Flow</h2>
        <p className="text-xs text-[#6b7f74] mb-4">
          {viewMode === 'budget'
            ? 'How your income is planned to be allocated across budget categories.'
            : 'Your income flows in from the left, branching into each expense category.'}
        </p>
        <SankeyChart
          income={income}
          categories={categories}
          whatIfValues={whatIfOpen ? whatIfValues : []}
          viewMode={viewMode}
          onSelectCategory={(cat, val) => {
            if (cat) {
              setSelectedCat({ cat, value: val });
            } else {
              setSelectedCat(null);
            }
          }}
        />

        {/* What-If toggle */}
        <button
          onClick={() => setWhatIfOpen(!whatIfOpen)}
          className={cn(
            'inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border transition-all mt-4',
            whatIfOpen
              ? 'bg-[#1a7a6d] border-[#2aaa9a] text-white'
              : 'bg-[#1a2620] border-[#2a3d33] text-[#6b7f74] hover:border-[#1a7a6d] hover:text-[#e8e6e1]',
          )}
        >
          <span
            className={cn('transition-transform text-base', whatIfOpen && 'rotate-45')}
          >
            +
          </span>
          What If?
        </button>

        {/* What-If panel */}
        <div
          className={cn(
            'transition-all duration-400 overflow-hidden',
            whatIfOpen ? 'max-h-[600px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0',
          )}
        >
          <WhatIfPanel
            categories={categories}
            income={income}
            values={whatIfValues}
            onValuesChange={setWhatIfValues}
            onReset={handleWhatIfReset}
          />
        </div>

        {/* Sankey summary */}
        {(() => {
          const totalBudgeted = categories.reduce((s, c) => s + c.budgeted, 0);
          const midVal = viewMode === 'budget' ? totalBudgeted : totalSpent;
          const midLabel = viewMode === 'budget' ? 'Budgeted' : 'Spent';
          const rightVal = income - midVal;
          const rightLabel = viewMode === 'budget' ? 'Unbudgeted' : 'Surplus';
          return (
            <div className="flex gap-6 flex-wrap mt-4 pt-3 border-t border-[#1a2620]">
              <div>
                <span className="text-[0.75rem] text-[#6b7f74] uppercase tracking-wider">Income</span>
                <div className="text-lg font-bold text-[#2aaa9a]">${income.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-[0.75rem] text-[#6b7f74] uppercase tracking-wider">{midLabel}</span>
                <div className="text-lg font-bold text-[#e8e6e1]">${midVal.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-[0.75rem] text-[#6b7f74] uppercase tracking-wider">{rightLabel}</span>
                <div className={cn('text-lg font-bold', rightVal >= 0 ? 'text-[#7aba5c]' : 'text-[#ef4444]')}>
                  {rightVal >= 0 ? '+' : ''}${Math.abs(rightVal).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Selected category detail card (tap-to-highlight on mobile) */}
      {selectedCat && (
        <div className="bg-[#111916] border border-[#1a2620] rounded-2xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ background: ensureHash(selectedCat.cat.color) }}
              />
              <h3 className="text-lg font-semibold text-[#e8e6e1]">{selectedCat.cat.name}</h3>
            </div>
            <button
              onClick={() => setSelectedCat(null)}
              className="text-[#6b7f74] hover:text-[#e8e6e1] text-sm"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-[#6b7f74] uppercase tracking-wider mb-1">Budgeted</div>
              <div className="text-lg font-bold text-[#e8e6e1]">${selectedCat.cat.budgeted.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-[#6b7f74] uppercase tracking-wider mb-1">Spent</div>
              <div className="text-lg font-bold text-[#e8e6e1]">${selectedCat.cat.spent.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-[#6b7f74] uppercase tracking-wider mb-1">Remaining</div>
              {(() => {
                const remaining = selectedCat.cat.budgeted - selectedCat.cat.spent;
                return (
                  <div className={cn('text-lg font-bold', remaining >= 0 ? 'text-[#7aba5c]' : 'text-[#ef4444]')}>
                    {remaining >= 0 ? '' : '-'}${Math.abs(remaining).toLocaleString()}
                  </div>
                );
              })()}
            </div>
          </div>
          {/* Progress bar */}
          {selectedCat.cat.budgeted > 0 && (
            <div className="mt-3">
              <div className="h-2 bg-[#1a2620] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((selectedCat.cat.spent / selectedCat.cat.budgeted) * 100, 100)}%`,
                    background: selectedCat.cat.spent > selectedCat.cat.budgeted
                      ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                      : `linear-gradient(90deg, ${ensureHash(selectedCat.cat.color)}, #2aaa9a)`,
                  }}
                />
              </div>
              <div className="text-xs text-[#6b7f74] mt-1 text-right">
                {Math.round((selectedCat.cat.spent / selectedCat.cat.budgeted) * 100)}% of budget used
              </div>
            </div>
          )}
          {selectedCat.cat.prevSpent > 0 && (
            <div className="mt-2 text-xs text-[#6b7f74]">
              Last month: ${selectedCat.cat.prevSpent.toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
    </AppShell>
  );
}
