'use client';

import { cn } from '@/lib/utils';

interface DayData {
  date: Date;
  amount: number;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
}

// Generate 84 days (12 weeks) of earning data with patterns
const generateMockData = (): DayData[] => {
  const data: DayData[] = [];
  const today = new Date();
  
  for (let i = 83; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    
    // Pattern: Thursdays and weekends are higher earning days
    let baseAmount = 80 + Math.random() * 120; // $80-200
    
    // Thursday boost
    if (dayOfWeek === 4) {
      baseAmount += 150 + Math.random() * 100; // +$150-250
    }
    
    // Weekend boost (especially Saturday)
    if (dayOfWeek === 6) {
      baseAmount += 120 + Math.random() * 80; // +$120-200
    } else if (dayOfWeek === 0) {
      baseAmount += 80 + Math.random() * 60; // +$80-140
    }
    
    // Random viral days (10% chance)
    if (Math.random() > 0.9) {
      baseAmount += 200 + Math.random() * 150;
    }
    
    // Some low days (15% chance)
    if (Math.random() > 0.85) {
      baseAmount = Math.random() * 50; // $0-50
    }
    
    data.push({
      date,
      amount: Math.round(baseAmount),
      dayOfWeek,
    });
  }
  
  return data;
};

const MOCK_DATA = generateMockData();

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function EarningHeatmap() {
  const getColorForAmount = (amount: number): string => {
    if (amount === 0) return '#1a2826'; // dark gray
    if (amount <= 100) return '#1a7a6d'; // teal
    if (amount <= 300) return '#2aaa9a'; // bright teal
    return '#ffd43b'; // gold
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);

  // Group data by weeks (Sunday start)
  const weeks: DayData[][] = [];
  let currentWeek: DayData[] = [];
  
  // Pad the beginning to start on Sunday
  const firstDay = MOCK_DATA[0];
  const paddingDays = firstDay.dayOfWeek;
  for (let i = 0; i < paddingDays; i++) {
    currentWeek.push({
      date: new Date(0),
      amount: -1, // sentinel for empty
      dayOfWeek: i,
    });
  }
  
  MOCK_DATA.forEach((day) => {
    currentWeek.push(day);
    if (day.dayOfWeek === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  
  if (currentWeek.length > 0) {
    // Pad the end
    while (currentWeek.length < 7) {
      currentWeek.push({
        date: new Date(0),
        amount: -1,
        dayOfWeek: currentWeek.length,
      });
    }
    weeks.push(currentWeek);
  }

  // Calculate insight
  const earningsByDay = Array(7).fill(0);
  const countsByDay = Array(7).fill(0);
  
  MOCK_DATA.forEach((day) => {
    earningsByDay[day.dayOfWeek] += day.amount;
    countsByDay[day.dayOfWeek]++;
  });
  
  const avgByDay = earningsByDay.map((total, i) => 
    countsByDay[i] > 0 ? total / countsByDay[i] : 0
  );
  
  const maxDayIndex = avgByDay.indexOf(Math.max(...avgByDay));
  const maxDayName = DAY_LABELS[maxDayIndex];

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Earning Days</h2>
        <p className="text-sm text-gray-400">Last 12 weeks of daily earnings</p>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <div className="inline-flex gap-3 min-w-full">
          {/* Day labels */}
          <div className="flex flex-col justify-between py-1" style={{ paddingTop: '2px', paddingBottom: '2px' }}>
            {DAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-xs text-gray-500 h-4 flex items-center"
                style={{ fontSize: '10px' }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex-1 grid grid-cols-12 gap-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={cn(
                      'aspect-square rounded-sm relative group cursor-pointer transition-transform hover:scale-110',
                      day.amount === -1 && 'opacity-0 pointer-events-none'
                    )}
                    style={{
                      backgroundColor: day.amount >= 0 ? getColorForAmount(day.amount) : 'transparent',
                    }}
                  >
                    {/* Tooltip */}
                    {day.amount >= 0 && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="font-medium">
                          {day.date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-emerald-400">{formatCurrency(day.amount)}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Less</span>
        <div className="flex gap-1">
          {[0, 50, 150, 350].map((amount, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-sm"
              style={{ backgroundColor: getColorForAmount(amount) }}
            />
          ))}
        </div>
        <span className="text-gray-500">More</span>
      </div>

      {/* Insight */}
      <div className="pt-4 border-t border-white/5">
        <div className="bg-[#1a7a6d]/10 border border-[#1a7a6d]/20 rounded-lg p-4">
          <p className="text-sm text-gray-300">
            💡 You earn most on <span className="font-semibold text-white">{maxDayName}s</span>
            {' '}—  consider scheduling your biggest content drops and live streams on this day.
          </p>
        </div>
      </div>
    </div>
  );
}
