'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

interface ScoreHistoryEntry {
  scored_at: string;
  total_score: number;
}

interface ScoreChartProps {
  history: ScoreHistoryEntry[];
}

export function ScoreChart({ history }: ScoreChartProps) {
  const chartData = useMemo(() => {
    if (history.length === 0) return null;

    const points = history.map((h) => ({
      date: h.scored_at,
      score: h.total_score,
    }));

    const scores = points.map((p) => p.score);
    const minScore = Math.max(0, Math.min(...scores) - 50);
    const maxScore = Math.min(1000, Math.max(...scores) + 50);
    const range = maxScore - minScore || 1;

    // Chart dimensions
    const width = 600;
    const height = 200;
    const padLeft = 45;
    const padRight = 15;
    const padTop = 15;
    const padBottom = 30;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    // Build SVG path
    const pathPoints = points.map((p, i) => {
      const x = padLeft + (points.length > 1 ? (i / (points.length - 1)) * chartW : chartW / 2);
      const y = padTop + chartH - ((p.score - minScore) / range) * chartH;
      return { x, y };
    });

    const linePath = pathPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    // Area fill path
    const areaPath = linePath
      + ` L ${pathPoints[pathPoints.length - 1].x.toFixed(1)} ${padTop + chartH}`
      + ` L ${pathPoints[0].x.toFixed(1)} ${padTop + chartH} Z`;

    // Y-axis labels (4 ticks)
    const yTicks = Array.from({ length: 5 }, (_, i) => {
      const val = minScore + (range * i) / 4;
      const y = padTop + chartH - (i / 4) * chartH;
      return { val: Math.round(val), y };
    });

    // X-axis labels (show ~5 dates)
    const step = Math.max(1, Math.floor(points.length / 5));
    const xLabels = points
      .filter((_, i) => i % step === 0 || i === points.length - 1)
      .map((p, idx) => {
        const origIdx = points.indexOf(p);
        const x = padLeft + (points.length > 1 ? (origIdx / (points.length - 1)) * chartW : chartW / 2);
        const d = new Date(p.date);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return { x, label };
      });

    return {
      width,
      height,
      linePath,
      areaPath,
      pathPoints,
      yTicks,
      xLabels,
      padLeft,
      padTop,
      padBottom,
      chartW,
      chartH,
    };
  }, [history]);

  if (!chartData || history.length < 2) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
            <p className="font-semibold">Score History</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            Score history will appear after a few days of tracking
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-muted-foreground" />
          <p className="font-semibold">Score History</p>
        </div>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${chartData.width} ${chartData.height}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {chartData.yTicks.map((tick) => (
            <line
              key={tick.val}
              x1={chartData.padLeft}
              y1={tick.y}
              x2={chartData.padLeft + chartData.chartW}
              y2={tick.y}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeDasharray="4 4"
            />
          ))}

          {/* Area fill */}
          <path
            d={chartData.areaPath}
            fill="url(#chartGradient)"
            opacity={0.3}
          />

          {/* Line */}
          <path
            d={chartData.linePath}
            fill="none"
            stroke="#1a7a6d"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots at endpoints */}
          {chartData.pathPoints.length > 0 && (
            <>
              <circle
                cx={chartData.pathPoints[chartData.pathPoints.length - 1].x}
                cy={chartData.pathPoints[chartData.pathPoints.length - 1].y}
                r={4}
                fill="#1a7a6d"
              />
            </>
          )}

          {/* Y-axis labels */}
          {chartData.yTicks.map((tick) => (
            <text
              key={tick.val}
              x={chartData.padLeft - 8}
              y={tick.y + 4}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize={11}
            >
              {tick.val}
            </text>
          ))}

          {/* X-axis labels */}
          {chartData.xLabels.map((label, i) => (
            <text
              key={i}
              x={label.x}
              y={chartData.height - 5}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={10}
            >
              {label.label}
            </text>
          ))}

          {/* Gradient def */}
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a7a6d" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#1a7a6d" stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>
      </CardContent>
    </Card>
  );
}
