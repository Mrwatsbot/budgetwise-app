export const maxDuration = 60;
import { NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { generateAutoBudget } from '@/lib/ai/openrouter';
import { checkRateLimit, incrementUsage, getUserTier } from '@/lib/ai/rate-limiter';

export async function POST(request: Request) {
  try {
    const guard = await apiGuard(10);
    if (guard.error) return guard.error;
    const { user, supabase } = guard;

    // Rate limit check
    const { tier, hasByok } = await getUserTier(supabase, user.id);
    const rateCheck = await checkRateLimit(supabase, user.id, tier, 'auto_budget', hasByok);
    if (!rateCheck.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        message: rateCheck.message,
        remaining: rateCheck.remaining,
        limit: rateCheck.limit,
      }, { status: 429 });
    }

    const body = await request.json();
    const {
      monthly_income,
      fixed_expenses = {},
      has_debts = false,
      savings_priority = 'moderate',
      lifestyle_notes = '',
      savings_goals = [],
      emergency_fund_status = 'no',
      current_savings_contribution = 0,
      other_savings_goal = '',
    } = body;

    if (!monthly_income || monthly_income <= 0) {
      return NextResponse.json({ error: 'Monthly income is required' }, { status: 400 });
    }

    // Fetch existing data server-side
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [debtsRes, savingsRes, categoriesRes] = await Promise.all([
      (supabase.from as any)('debts')
        .select('name, monthly_payment, minimum_payment, current_balance, apr')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('is_paid_off', false),
      (supabase.from as any)('savings_goals')
        .select('id, name, monthly_contribution, target_amount, current_amount')
        .eq('user_id', user.id)
        .eq('is_active', true),
      (supabase.from as any)('categories')
        .select('id, name, type, icon, color')
        .order('sort_order'),
    ]);

    const debts = debtsRes.data || [];
    const savings = savingsRes.data || [];
    const categories = categoriesRes.data || [];

    const totalDebtPayments = debts.reduce(
      (sum: number, d: { monthly_payment: number | null; minimum_payment: number | null }) =>
        sum + (d.monthly_payment || d.minimum_payment || 0),
      0
    );
    const totalSavingsContributions = savings.reduce(
      (sum: number, s: { monthly_contribution: number | null }) =>
        sum + (s.monthly_contribution || 0),
      0
    );

    // Build financial profile string
    // Budget categories — include all non-income categories (expense + savings + investment)
    const budgetCategories = categories.filter((c: { type: string }) => c.type !== 'income');
    const categoryList = budgetCategories.map(
      (c: { id: string; name: string; type: string }) => `  - ${c.name} (id: ${c.id}, type: ${c.type})`
    ).join('\n');
    
    // Check if savings-related categories exist
    const hasSavingsCategories = budgetCategories.some(
      (c: { name: string; type: string }) => 
        c.type === 'savings' || c.type === 'investment' ||
        /savings|emergency|invest|retirement/i.test(c.name)
    );
    
    // Savings goals as allocation targets for the 20% savings portion
    const savingsTargets = savings.length > 0
      ? savings.map(
          (s: { id: string; name: string; monthly_contribution: number | null; target_amount: number | null; current_amount: number }, i: number) =>
            `  - Savings Goal ${i + 1} (id: ${s.id}): currently $${(s.monthly_contribution || 0).toFixed(2)}/mo${s.target_amount ? `, target $${s.target_amount.toFixed(2)}, saved $${s.current_amount.toFixed(2)}` : ''}`
        ).join('\n')
      : '  (no savings goals set up yet)';

    const fixedExpStr = Object.entries(fixed_expenses)
      .filter(([, v]) => v && (v as number) > 0)
      .map(([k, v]) => `  - ${k}: $${v}`)
      .join('\n') || '  (none specified)';

    // PII stripped: debt names and savings goal names replaced with generic labels
    const debtStr = debts.length > 0
      ? debts.map(
          (d: { name: string; monthly_payment: number | null; minimum_payment: number | null; current_balance: number; apr: number | null }, i: number) =>
            `  - Debt ${i + 1}: $${(d.monthly_payment || d.minimum_payment || 0).toFixed(2)}/mo, balance $${d.current_balance.toFixed(2)}, ${d.apr || 0}% APR`
        ).join('\n')
      : '  (no tracked debts)';

    const savingsStr = savings.length > 0
      ? savings.map(
          (s: { id: string; name: string; monthly_contribution: number | null; target_amount: number | null; current_amount: number }, i: number) =>
            `  - Goal ${i + 1} (id: ${s.id}): $${(s.monthly_contribution || 0).toFixed(2)}/mo, ${s.target_amount ? `target $${s.target_amount.toFixed(2)}` : 'no target'}, saved $${s.current_amount.toFixed(2)}`
        ).join('\n')
      : '  (no savings goals)';

    // Format savings goals for the profile
    const savingsGoalsStr = savings_goals.length > 0
      ? savings_goals.map((g: string) => {
          if (g === 'other' && other_savings_goal) {
            return `  - ${other_savings_goal}`;
          }
          return `  - ${g.replace(/_/g, ' ')}`;
        }).join('\n')
      : '  (none specified)';

    const profile = `Monthly take-home income: $${monthly_income}

Fixed expenses:
${fixedExpStr}

Has debts: ${has_debts ? 'Yes' : 'No'}
Total monthly debt payments: $${totalDebtPayments.toFixed(2)}
Tracked debts:
${debtStr}

Emergency fund status: ${emergency_fund_status === 'yes' ? 'Has one' : emergency_fund_status === 'building' ? 'Currently building' : 'Does not have one'}

Savings goals (what user is saving for):
${savingsGoalsStr}

Current savings/investment contributions (outside Thallo): $${current_savings_contribution || 0}/month

Total monthly savings contributions (tracked in Thallo): $${totalSavingsContributions.toFixed(2)}
Savings goals (tracked in Thallo):
${savingsStr}

Savings priority: ${savings_priority}
${lifestyle_notes ? `Lifestyle notes: ${lifestyle_notes}` : ''}

Available budget categories (allocate to these ONLY — use exact names and IDs):
${categoryList}

User's savings goals in Thallo:
${savingsTargets}

IMPORTANT: The expense category allocations + savings goal contributions MUST sum to the monthly income. Do NOT allocate the full income to expense categories and then add savings on top — savings comes FROM the income.

Follow the 50/30/20 rule: ~50% needs, ~30% wants, ~20% savings/debt.
${hasSavingsCategories 
  ? 'Allocate the ~20% savings portion to savings/investment categories (Savings, Emergency Fund, Investments, etc.).'
  : 'NOTE: No dedicated savings categories exist yet. Allocate ~20% to the category most suitable for savings (e.g., "Other Expense" or similar) and strongly recommend the user create Savings/Emergency Fund categories for proper tracking.'}

${savings.length > 0 ? `SAVINGS GOALS: The user has ${savings.length} savings goal(s) listed above with IDs. You MUST also suggest monthly_contribution amounts for each savings goal in the "savings_goal_allocations" field. These contributions are PART OF (not in addition to) the ~20% savings portion. The expense category allocations + savings goal contributions together must equal the monthly income.` : 'All expense category allocations MUST sum to the monthly income — do NOT leave money unallocated.'}`;

    // Fetch BYOK key if applicable
    let apiKeyOverride: string | undefined;
    if (hasByok && tier === 'pro') {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('openrouter_api_key')
        .eq('id', user.id)
        .single();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiKeyOverride = (profileData as any)?.openrouter_api_key || undefined;
    }

    // Call AI
    const response = await generateAutoBudget(profile, apiKeyOverride);

    // Parse response
    let result;
    try {
      let content = response.content.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      result = JSON.parse(content);
    } catch {
      return NextResponse.json({
        result: null,
        raw: response.content,
        error: 'Failed to parse AI response as JSON',
        generated_at: new Date().toISOString(),
      });
    }

    // Log AI usage with model and cost
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const modelUsed = response.model || 'unknown';
    const costUsd = response.estimatedCost || 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)('ai_usage').insert({
      user_id: user.id,
      feature: 'auto_budget',
      tokens_input: inputTokens,
      tokens_output: outputTokens,
    });

    // Increment rate limit counter
    await incrementUsage(supabase, user.id, 'auto_budget');

    return NextResponse.json({
      result,
      generated_at: new Date().toISOString(),
      usage: {
        model: modelUsed,
        tokens_input: inputTokens,
        tokens_output: outputTokens,
        estimated_cost_usd: costUsd,
      },
    });
  } catch (error) {
    console.error('Auto budget error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate auto budget' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const guard = await apiGuard(10);
    if (guard.error) return guard.error;
    const { user, supabase } = guard;

    const body = await request.json();
    const { allocations, month, savings_goal_allocations } = body;

    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      return NextResponse.json({ error: 'Allocations are required' }, { status: 400 });
    }
    if (!month) {
      return NextResponse.json({ error: 'Month is required' }, { status: 400 });
    }

    // Fetch all categories for name→id fallback lookup
    const { data: allCategories } = await supabase
      .from('categories')
      .select('id, name, type')
      .order('sort_order');
    
    const categoryList = (allCategories || []) as { id: string; name: string; type: string }[];
    const categoryByName = new Map(
      categoryList.map((c) => [c.name.toLowerCase().trim(), c.id])
    );
    const validCategoryIds = new Set(
      categoryList.map((c) => c.id)
    );

    // Fuzzy resolver: exact → contains → word overlap
    const fuzzyResolveCategory = (aiName: string): string | null => {
      const needle = aiName.toLowerCase().trim();
      // 1. Exact match
      if (categoryByName.has(needle)) return categoryByName.get(needle)!;
      // 2. Contains match (either direction)
      for (const [realName, realId] of categoryByName) {
        if (needle.includes(realName) || realName.includes(needle)) return realId;
      }
      // 3. Word overlap scoring
      const aiWords = needle.split(/[\s&,/]+/).filter(w => w.length > 2);
      let bestMatch: { id: string; score: number } | null = null;
      for (const [realName, realId] of categoryByName) {
        const realWords = realName.split(/[\s&,/]+/).filter(w => w.length > 2);
        const overlap = aiWords.filter(w => realWords.some(rw => rw.includes(w) || w.includes(rw))).length;
        if (overlap > 0 && (!bestMatch || overlap > bestMatch.score)) {
          bestMatch = { id: realId, score: overlap };
        }
      }
      return bestMatch?.id || null;
    };

    // Upsert each budget allocation
    const results = [];
    const skipped = [];
    const errors: string[] = [];
    const debug: { received: number; validCategories: number; allocDetails: unknown[] } = {
      received: allocations.length,
      validCategories: validCategoryIds.size,
      allocDetails: [],
    };

    for (const alloc of allocations) {
      // Resolve category_id: validate AI-provided ID exists, otherwise fall back to name lookup
      let categoryId = alloc.category_id;
      let resolvedBy = 'provided';
      
      // If AI returned an ID, verify it actually exists in the user's categories
      if (categoryId && !validCategoryIds.has(categoryId)) {
        resolvedBy = 'name-fallback (invalid id)';
        categoryId = null; // AI hallucinated an invalid ID — fall back to name
      }
      
      // Fall back to fuzzy name lookup
      if (!categoryId && alloc.category_name) {
        categoryId = fuzzyResolveCategory(alloc.category_name);
        if (!categoryId) resolvedBy = 'FAILED';
        else if (resolvedBy !== 'name-fallback (invalid id)') resolvedBy = 'name-lookup';
      }
      
      debug.allocDetails.push({
        name: alloc.category_name,
        aiId: alloc.category_id,
        resolvedId: categoryId,
        resolvedBy,
        amount: alloc.amount,
      });

      if (!categoryId || alloc.amount === undefined || alloc.amount <= 0) {
        if (alloc.category_name) skipped.push(alloc.category_name);
        continue;
      }

      // Check if a budget already exists for this category + month
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase.from as any)('budgets')
        .select('id')
        .eq('user_id', user.id)
        .eq('category_id', categoryId)
        .eq('month', month)
        .maybeSingle();

      if (existing) {
        // Update
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from as any)('budgets')
          .update({ budgeted: alloc.amount, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) {
          console.error('Budget update error:', error);
          errors.push(`Update ${alloc.category_name}: ${error.message}`);
        } else {
          results.push(data);
        }
      } else {
        // Insert
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from as any)('budgets')
          .insert({
            user_id: user.id,
            category_id: categoryId,
            month,
            budgeted: alloc.amount,
          })
          .select()
          .single();
        if (error) {
          console.error('Budget insert error:', error);
          errors.push(`Insert ${alloc.category_name}: ${error.message}`);
        } else {
          results.push(data);
        }
      }
    }

    // Process savings goal allocations
    let savingsUpdated = 0;
    if (savings_goal_allocations && Array.isArray(savings_goal_allocations)) {
      for (const sg of savings_goal_allocations) {
        if (!sg.goal_id || sg.monthly_contribution === undefined) continue;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: sgError } = await (supabase.from as any)('savings_goals')
            .update({ monthly_contribution: sg.monthly_contribution, updated_at: new Date().toISOString() })
            .eq('id', sg.goal_id)
            .eq('user_id', user.id);
          if (sgError) {
            errors.push(`Savings goal ${sg.goal_id}: ${sgError.message}`);
          } else {
            savingsUpdated++;
          }
        } catch (sgErr) {
          errors.push(`Savings goal ${sg.goal_id}: ${sgErr instanceof Error ? sgErr.message : 'unknown error'}`);
        }
      }
    }

    return NextResponse.json({
      success: results.length > 0 || savingsUpdated > 0,
      budgets_written: results.length,
      savings_updated: savingsUpdated,
      budgets: results,
      skipped: skipped.length > 0 ? skipped : undefined,
      errors: errors.length > 0 ? errors : undefined,
      debug,
      month,
    });
  } catch (error) {
    console.error('Apply budget error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply budget' },
      { status: 500 }
    );
  }
}
