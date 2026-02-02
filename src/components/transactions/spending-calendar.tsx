'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { getCategoryIcon } from '@/lib/category-icons';

interface Transaction {
  id: string;
  amount: number;
  payee_clean: string | null;
  payee_original: string | null;
  date: string;
  memo: string | null;
  is_cleared: boolean;
  category: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
  account: {
    id: string;
    name: string;
  } | null;
}

interface SpendingCalendarProps {
  transactions: Transaction[];
}

// ─── Helpers ────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0 = Sun
}

function formatCurrency(amount: number) {
  return `$${Math.abs(amount).toFixed(2)}`;
}

function formatCurrencyCompact(amount: number) {
  const abs = Math.abs(amount);
  if (abs >= 1000) return `$${(abs / 1000).toFixed(1)}k`;
  if (abs >= 100) return `$${Math.round(abs)}`;
  return `$${abs.toFixed(2)}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LABELS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type HeatLevel = 'none' | 'green' | 'yellow' | 'orange' | 'red';

function getHeatLevel(daySpend: number, dailyAvg: number): HeatLevel {
  if (daySpend === 0) return 'none';
  if (dailyAvg === 0) return 'green'; // any spend with 0 avg edge case
  const ratio = daySpend / dailyAvg;
  if (ratio < 0.5) return 'green';
  if (ratio < 1) return 'yellow';
  if (ratio < 2) return 'orange';
  return 'red';
}

const heatStyles: Record<HeatLevel, string> = {
  none: 'bg-card border-border',
  green: 'bg-[#6db555]/10 border-[#6db555]/20',
  yellow: 'bg-yellow-500/10 border-yellow-500/20',
  orange: 'bg-teal-600/10 border-teal-600/20',
  red: 'bg-red-500/10 border-red-500/20',
};

// ─── Component ──────────────────────────────────────────────────────

export function SpendingCalendar({ transactions }: SpendingCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Navigate months
  const goToPrevMonth = useCallback(() => {
    setSelectedDay(null);
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const goToNextMonth = useCallback(() => {
    setSelectedDay(null);
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  // Build per-day data
  const { dayMap, totalSpent, dailyAvg, daysWithSpending } = useMemo(() => {
    const map: Record<number, { spent: number; transactions: Transaction[]; categories: { id: string; color: string | null }[] }> = {};
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);

    // Initialise every day
    for (let d = 1; d <= daysInMonth; d++) {
      map[d] = { spent: 0, transactions: [], categories: [] };
    }

    // Bucket transactions
    const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    for (const tx of transactions) {
      if (!tx.date.startsWith(monthStr)) continue;
      const dayNum = parseInt(tx.date.split('-')[2], 10);
      if (!map[dayNum]) continue;

      map[dayNum].transactions.push(tx);

      // Only expenses count toward heat map
      if (tx.amount < 0) {
        map[dayNum].spent += Math.abs(tx.amount);
        // Track unique categories
        if (tx.category && !map[dayNum].categories.find((c) => c.id === tx.category!.id)) {
          map[dayNum].categories.push({ id: tx.category.id, color: tx.category.color });
        }
      }
    }

    let total = 0;
    let spendDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (map[d].spent > 0) {
        total += map[d].spent;
        spendDays++;
      }
    }

    return {
      dayMap: map,
      totalSpent: total,
      dailyAvg: spendDays > 0 ? total / daysInMonth : 0,
      daysWithSpending: spendDays,
    };
  }, [transactions, currentMonth, currentYear]);

  // Build grid rows (each row = 7 cells, a calendar week)
  const gridRows = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfWeek(currentYear, currentMonth);
    const rows: (number | null)[][] = [];
    let row: (number | null)[] = [];

    // Leading empty cells
    for (let i = 0; i < firstDay; i++) row.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      row.push(d);
      if (row.length === 7) {
        rows.push(row);
        row = [];
      }
    }

    // Trailing empty cells
    if (row.length > 0) {
      while (row.length < 7) row.push(null);
      rows.push(row);
    }

    return rows;
  }, [currentMonth, currentYear]);

  // Which row is the selected day in?
  const selectedRowIdx = useMemo(() => {
    if (selectedDay === null) return -1;
    return gridRows.findIndex((row) => row.includes(selectedDay));
  }, [selectedDay, gridRows]);

  const handleDayClick = (day: number) => {
    setSelectedDay((prev) => (prev === day ? null : day));
  };

  return (
    <div className="space-y-4">
      {/* Header: Navigation + Stats */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <h2 className="text-lg font-semibold">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mt-1">
                <span>
                  Total: <span className="text-foreground font-medium">{formatCurrency(totalSpent)}</span>
                </span>
                <span>
                  Avg/day: <span className="text-foreground font-medium">{formatCurrency(dailyAvg)}</span>
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-2 sm:p-4">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_LABELS.map((label, i) => (
              <div key={label + i} className="text-center text-xs font-medium text-muted-foreground py-1">
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{DAY_LABELS_SHORT[i]}</span>
              </div>
            ))}
          </div>

          {/* Rows */}
          {gridRows.map((row, rowIdx) => (
            <div key={rowIdx}>
              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {row.map((day, colIdx) => {
                  if (day === null) {
                    return <div key={`empty-${colIdx}`} className="aspect-square rounded-lg bg-muted/20" />;
                  }

                  const data = dayMap[day];
                  const heat = getHeatLevel(data.spent, dailyAvg);
                  const isSelected = selectedDay === day;
                  const isToday =
                    day === today.getDate() &&
                    currentMonth === today.getMonth() &&
                    currentYear === today.getFullYear();

                  return (
                    <button
                      key={day}
                      onClick={() => handleDayClick(day)}
                      className={`
                        relative aspect-square rounded-lg border text-left p-1 sm:p-1.5
                        transition-all cursor-pointer
                        ${heatStyles[heat]}
                        ${isSelected ? 'border-purple-500 ring-1 ring-purple-500/40' : ''}
                        ${isToday && !isSelected ? 'ring-1 ring-foreground/20' : ''}
                        hover:brightness-110
                      `}
                    >
                      {/* Day number */}
                      <span
                        className={`text-[10px] sm:text-xs font-medium block ${
                          isToday ? 'text-[#1a7a6d]' : 'text-foreground'
                        }`}
                      >
                        {day}
                      </span>

                      {/* Spent amount */}
                      {data.spent > 0 && (
                        <span className="text-[9px] sm:text-[11px] font-semibold text-foreground/80 block truncate leading-tight mt-0.5">
                          {formatCurrencyCompact(data.spent)}
                        </span>
                      )}

                      {/* Category dots */}
                      {data.categories.length > 0 && (
                        <div className="flex items-center gap-0.5 mt-auto absolute bottom-1 left-1 sm:bottom-1.5 sm:left-1.5">
                          {data.categories.slice(0, 3).map((cat) => (
                            <span
                              key={cat.id}
                              className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: cat.color || '#94a3b8' }}
                            />
                          ))}
                          {data.categories.length > 3 && (
                            <span className="text-[8px] text-muted-foreground leading-none">
                              +{data.categories.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Expanded day detail (inline below the row) */}
              {selectedRowIdx === rowIdx && selectedDay !== null && (
                <DayDetail
                  day={selectedDay}
                  month={currentMonth}
                  year={currentYear}
                  transactions={dayMap[selectedDay].transactions}
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-card border border-border" /> No spend
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-[#6db555]/10 border border-[#6db555]/20" /> Low
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-yellow-500/10 border border-yellow-500/20" /> Avg
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-teal-600/10 border border-teal-600/20" /> High
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-red-500/10 border border-red-500/20" /> Very High
        </span>
      </div>
    </div>
  );
}

// ─── Day Detail Panel ───────────────────────────────────────────────

function DayDetail({
  day,
  month,
  year,
  transactions,
}: {
  day: number;
  month: number;
  year: number;
  transactions: Transaction[];
}) {
  const dateLabel = new Date(year, month, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="col-span-7 my-2 rounded-lg border border-[#1a7a6d4d] bg-card/80 backdrop-blur-sm p-3 sm:p-4 animate-in slide-in-from-top-2 duration-200">
      <h3 className="text-sm font-semibold text-foreground mb-3">{dateLabel}</h3>

      {transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No transactions this day.</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => {
            const IconComp = tx.category
              ? getCategoryIcon(tx.category.icon, tx.category.name)
              : Package;
            const isIncome = tx.amount >= 0;

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 rounded-md p-2 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: tx.category?.color
                        ? `${tx.category.color}20`
                        : '#94a3b820',
                    }}
                  >
                    <IconComp
                      className="w-4 h-4"
                      style={{ color: tx.category?.color || '#94a3b8' }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tx.payee_clean || tx.payee_original || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {tx.category?.name || 'Uncategorized'}
                      {tx.account ? ` · ${tx.account.name}` : ''}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums flex-shrink-0 ${
                    isIncome ? 'text-[#6db555]' : 'text-foreground'
                  }`}
                >
                  {isIncome ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
