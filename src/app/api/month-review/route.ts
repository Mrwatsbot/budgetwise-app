import { NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { generateMonthlyNudge } from '@/lib/ai/openrouter';
import { classifyCategory } from '@/lib/budget-groups';

export async function GET(request: Request) {
  const guard = await apiGuard(60);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  // Parse month param (defaults to previous month)
  const url = new URL(request.url);
  const clientMonth = url.searchParams.get('month');
  let monthStr: string;
  
  if (clientMonth && /^\d{4}-\d{2}-\d{2}$/.test(clientMonth)) {
    monthStr = clientMonth;
  } else {
    // Default to previous month
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    monthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;
  }

  // Parse month for display
  const [year, month] = monthStr.split('-').map(Number);
  const monthDate = new Date(year, month - 1, 1);
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Compute date range for this month
  const nextMonthDate = new Date(year, month, 1);
  const nextMonthStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;

  // Compute 3-month range for trends (this month + 2 prior)
  const threeMonthsAgo = new Date(year, month - 3, 1);
  const threeMonthsAgoStr = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

  // Get user tier (for gating)
  let tier = 'free';
  try {
    const { data: profileData } = await (supabase.from as any)('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    tier = profileData?.subscription_tier || 'free';
  } catch { /* fallback to free */ }

  // If free tier, only return headline data (skip expensive AI call)
  const isFreeUser = tier === 'free' || tier === 'basic';

  // Fetch all necessary data in parallel
  const [
    profileRes,
    categoriesRes,
    budgetsRes,
    transactionsRes,
    threeMonthTransactionsRes,
    scoreHistoryRes,
  ] = await Promise.all([
    (supabase.from as any)('profiles').select('monthly_income').eq('id', user.id).single(),
    supabase.from('categories').select('id, name, icon, type').order('sort_order'),
    supabase.from('budgets')
      .select('id, budgeted, category_id, category:categories(id, name, icon)')
      .eq('user_id', user.id)
      .eq('month', monthStr),
    supabase.from('transactions')
      .select('id, amount, category_id, date')
      .eq('user_id', user.id)
      .gte('date', monthStr)
      .lt('date', nextMonthStr),
    supabase.from('transactions')
      .select('id, amount, category_id, date')
      .eq('user_id', user.id)
      .gte('date', threeMonthsAgoStr)
      .lt('date', nextMonthStr),
    (supabase.from as any)('score_history')
      .select('total_score, scored_at')
      .eq('user_id', user.id)
      .order('scored_at', { ascending: false })
      .limit(2),
  ]);

  const monthlyIncome = profileRes.data?.monthly_income || 0;
  const categories = categoriesRes.data || [];
  const budgets = budgetsRes.data || [];
  const transactions = transactionsRes.data || [];
  const allTransactions = threeMonthTransactionsRes.data || [];
  const scoreHistory = scoreHistoryRes.data || [];

  // Check if there's enough data for this month
  if (transactions.length === 0 && budgets.length === 0) {
    return NextResponse.json({
      month: monthName,
      monthStr,
      tier,
      noData: true,
    });
  }

  // ====== CARD 1: HEADLINE ======
  const totalSpent = transactions
    .filter((t: { amount: number }) => t.amount < 0)
    .reduce((sum: number, t: { amount: number }) => sum + Math.abs(t.amount), 0);
  
  const totalIncome = monthlyIncome > 0 ? monthlyIncome : transactions
    .filter((t: { amount: number }) => t.amount > 0)
    .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

  const surplus = totalIncome - totalSpent;

  // ====== CARD 2: WINS ======
  // Compute spent by category for this month
  const spentByCategory: Record<string, number> = {};
  transactions
    .filter((t: { amount: number }) => t.amount < 0)
    .forEach((t: { amount: number; category_id: string | null }) => {
      if (t.category_id) {
        spentByCategory[t.category_id] = (spentByCategory[t.category_id] || 0) + Math.abs(t.amount);
      }
    });

  // Build category map
  const categoryMap: Record<string, { name: string; icon: string | null; type: string }> = {};
  categories.forEach((c: { id: string; name: string; icon: string | null; type: string }) => {
    categoryMap[c.id] = c;
  });

  // Analyze budgets
  let categoriesOnBudget = 0;
  let totalSavedVsBudget = 0;
  let bestCategory: { name: string; pctUnder: number; savedAmount: number } | null = null;
  let bestPctUnder = 0;

  budgets.forEach((b: { category_id: string; budgeted: number; category?: { name: string } | null }) => {
    const spent = spentByCategory[b.category_id] || 0;
    const budgeted = b.budgeted || 0;
    
    if (spent <= budgeted) {
      categoriesOnBudget++;
      const saved = budgeted - spent;
      totalSavedVsBudget += saved;
      
      if (budgeted > 0) {
        const pctUnder = ((budgeted - spent) / budgeted) * 100;
        if (pctUnder > bestPctUnder) {
          bestPctUnder = pctUnder;
          bestCategory = {
            name: b.category?.name || categoryMap[b.category_id]?.name || 'Unknown',
            pctUnder: Math.round(pctUnder),
            savedAmount: Math.round(saved),
          };
        }
      }
    }
  });

  // Calculate surplus streak (consecutive months with surplus)
  let surplusStreak = 0;
  if (surplus > 0) {
    surplusStreak = 1; // This month counts
    
    // Check up to 6 previous months
    for (let i = 1; i <= 6; i++) {
      const checkDate = new Date(year, month - i - 1, 1);
      const checkMonthStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-01`;
      const checkNextMonthStr = `${new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 1).getFullYear()}-${String(new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 1).getMonth() + 1).padStart(2, '0')}-01`;
      
      const prevMonthTransactions = allTransactions.filter(
        (t: { date: string }) => t.date >= checkMonthStr && t.date < checkNextMonthStr
      );
      
      const prevIncome = monthlyIncome > 0 ? monthlyIncome : prevMonthTransactions
        .filter((t: { amount: number }) => t.amount > 0)
        .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
      
      const prevExpenses = prevMonthTransactions
        .filter((t: { amount: number }) => t.amount < 0)
        .reduce((sum: number, t: { amount: number }) => sum + Math.abs(t.amount), 0);
      
      if (prevIncome > prevExpenses) {
        surplusStreak++;
      } else {
        break;
      }
    }
  }

  // ====== CARD 3: SURPRISES (Overshoots) ======
  const overshoots: Array<{ category: string; budgeted: number; actual: number; pctOver: number }> = [];
  
  budgets.forEach((b: { category_id: string; budgeted: number; category?: { name: string; icon: string | null } | null }) => {
    const spent = spentByCategory[b.category_id] || 0;
    const budgeted = b.budgeted || 0;
    
    if (spent > budgeted && budgeted > 0) {
      const pctOver = ((spent - budgeted) / budgeted) * 100;
      const icon = b.category?.icon || categoryMap[b.category_id]?.icon || '';
      overshoots.push({
        category: `${icon} ${b.category?.name || categoryMap[b.category_id]?.name || 'Unknown'}`,
        budgeted: Math.round(budgeted),
        actual: Math.round(spent),
        pctOver: Math.round(pctOver),
      });
    }
  });
  
  overshoots.sort((a, b) => b.pctOver - a.pctOver);

  // ====== CARD 4: TRENDS (3-month sparklines) ======
  // Group transactions by month and category
  const monthlySpending: Record<string, Record<string, number>> = {};
  
  // Generate 3 month keys
  const trendMonths: string[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(year, month - i - 1, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    trendMonths.push(key);
    monthlySpending[key] = {};
  }
  
  allTransactions
    .filter((t: { amount: number }) => t.amount < 0)
    .forEach((t: { amount: number; category_id: string | null; date: string }) => {
      if (t.category_id) {
        const monthKey = t.date.substring(0, 7);
        if (monthlySpending[monthKey]) {
          monthlySpending[monthKey][t.category_id] = (monthlySpending[monthKey][t.category_id] || 0) + Math.abs(t.amount);
        }
      }
    });
  
  // Find top 6 categories by current month spend
  const categoryTotals: Array<{ id: string; total: number }> = [];
  Object.keys(spentByCategory).forEach(catId => {
    categoryTotals.push({ id: catId, total: spentByCategory[catId] });
  });
  categoryTotals.sort((a, b) => b.total - a.total);
  const topCategoryIds = categoryTotals.slice(0, 6).map(c => c.id);
  
  const trends = topCategoryIds.map(catId => {
    const months = trendMonths.map(m => Math.round(monthlySpending[m][catId] || 0));
    const first = months[0] || 1;
    const last = months[months.length - 1] || 0;
    const change = ((last - first) / first) * 100;
    
    let direction: 'up' | 'down' | 'flat' = 'flat';
    if (Math.abs(change) < 5) {
      direction = 'flat';
    } else if (change > 0) {
      direction = 'up';
    } else {
      direction = 'down';
    }
    
    const icon = categoryMap[catId]?.icon || '';
    return {
      category: `${icon} ${categoryMap[catId]?.name || 'Unknown'}`,
      months,
      changePercent: Math.round(change),
      direction,
    };
  });

  // ====== CARD 5: FLOW (50/30/20) ======
  // Classify spending into needs/wants/savings using shared utility
  let needsAmount = 0;
  let wantsAmount = 0;
  let savingsAmount = 0;
  
  transactions.forEach((t: { amount: number; category_id: string | null }) => {
    const cat = t.category_id ? categoryMap[t.category_id] : null;
    
    if (t.amount > 0) {
      // Income - skip
      return;
    }
    
    const amt = Math.abs(t.amount);
    
    if (!cat) {
      wantsAmount += amt; // Uncategorized = wants
    } else {
      const group = classifyCategory(cat.name, cat.type);
      if (group === 'needs') needsAmount += amt;
      else if (group === 'savings') savingsAmount += amt;
      else wantsAmount += amt;
    }
  });
  
  const needsPct = totalSpent > 0 ? Math.round((needsAmount / totalSpent) * 100) : 0;
  const wantsPct = totalSpent > 0 ? Math.round((wantsAmount / totalSpent) * 100) : 0;
  const savingsPct = totalSpent > 0 ? Math.round((savingsAmount / totalSpent) * 100) : 0;

  // ====== CARD 6: SCORE ======
  const currentScore = scoreHistory[0]?.total_score || 0;
  const previousScore = scoreHistory[1]?.total_score || 0;
  const scoreChange = currentScore - previousScore;
  
  const scoreFactors = [
    {
      name: 'Budget Adherence',
      description: `${categoriesOnBudget}/${budgets.length} categories on target`,
      impact: categoriesOnBudget >= budgets.length / 2 ? 3 : -2,
    },
    {
      name: 'Savings Rate',
      description: `${savingsPct}% of spending to savings`,
      impact: savingsPct >= 20 ? 4 : -1,
    },
    {
      name: 'Overspending',
      description: `${overshoots.length} categories over budget`,
      impact: overshoots.length > 0 ? -2 : 2,
    },
  ];

  // ====== CARD 7: NUDGE (AI-generated) ======
  let nudge: { primary: { text: string; impact: string }; secondary: string[] } | null = null;
  
  if (!isFreeUser) {
    // Build a summary for AI
    const aiSummary = `
Month: ${monthName}
Income: $${totalIncome.toFixed(2)}
Total Spent: $${totalSpent.toFixed(2)}
Surplus/Deficit: ${surplus > 0 ? '+' : ''}$${surplus.toFixed(2)}

Budget Performance:
- ${categoriesOnBudget}/${budgets.length} categories on budget
- Top overshoot: ${overshoots[0]?.category || 'None'} (${overshoots[0]?.pctOver || 0}% over, $${(overshoots[0]?.actual || 0) - (overshoots[0]?.budgeted || 0)} overspent)

Spending Breakdown:
- Needs: ${needsPct}%
- Wants: ${wantsPct}%
- Savings: ${savingsPct}%

Top spending categories: ${trends.slice(0, 3).map(t => t.category).join(', ')}
    `.trim();
    
    try {
      const aiRes = await generateMonthlyNudge(aiSummary);
      nudge = JSON.parse(aiRes.content);
    } catch (err) {
      console.error('Failed to generate nudge:', err);
      // Fallback nudge
      nudge = {
        primary: {
          text: `Keep up the momentum! Your ${surplus > 0 ? 'surplus' : 'spending'} this month shows ${surplus > 0 ? 'discipline' : 'room for improvement'}.`,
          impact: 'Continue tracking to see patterns',
        },
        secondary: [
          'Review your top spending categories',
          'Set a savings goal for next month',
          'Check your budget adherence weekly',
        ],
      };
    }
  }

  return NextResponse.json({
    month: monthName,
    monthStr,
    tier,
    headline: {
      totalSpent: Math.round(totalSpent),
      totalIncome: Math.round(totalIncome),
      surplus: Math.round(surplus),
    },
    wins: {
      categoriesOnBudget,
      totalCategories: budgets.length,
      totalSavedVsBudget: Math.round(totalSavedVsBudget),
      bestCategory,
      surplusStreak,
    },
    surprises: {
      overshoots: overshoots.slice(0, 3),
    },
    trends,
    flow: {
      income: Math.round(totalIncome),
      needs: { amount: Math.round(needsAmount), pct: needsPct },
      wants: { amount: Math.round(wantsAmount), pct: wantsPct },
      savings: { amount: Math.round(savingsAmount), pct: savingsPct },
    },
    score: {
      current: currentScore,
      previous: previousScore,
      change: scoreChange,
      factors: scoreFactors,
    },
    nudge: isFreeUser ? null : nudge,
  });
}
