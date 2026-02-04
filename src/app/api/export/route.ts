import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { rateLimit } from '@/lib/rate-limit';

// Helper to calculate date ranges
function getDateRange(range: string): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  let start: Date;
  const end = new Date(year, month, day + 1); // Include today

  switch (range) {
    case 'month':
      start = new Date(year, month, 1);
      break;
    case '3months':
      start = new Date(year, month - 2, 1);
      break;
    case 'year':
      start = new Date(year, month - 11, 1);
      break;
    case 'all':
      start = new Date(2000, 0, 1); // Arbitrary early date
      break;
    default:
      start = new Date(year, month, 1);
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

// Helper to escape CSV fields
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper to generate CSV content
function generateCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map(row => row.map(escapeCSV).join(','));
  return [headerLine, ...dataLines].join('\n');
}

export async function GET(request: NextRequest) {
  // Auth guard
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  // Rate limit: 5 exports per minute
  const rateLimitResult = await rateLimit(user.id, 5, 60 * 1000);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded. Please wait a moment before exporting again.',
        retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(rateLimitResult.reset),
        }
      }
    );
  }

  // Parse query params
  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'csv';
  const range = url.searchParams.get('range') || 'month';
  const includeParam = url.searchParams.get('include') || 'transactions';
  const includeTypes = new Set(includeParam.split(','));

  // Only CSV is supported for now
  if (format !== 'csv') {
    return NextResponse.json(
      { error: 'Only CSV format is currently supported' },
      { status: 400 }
    );
  }

  // Get date range
  const dateRange = getDateRange(range);

  // Initialize CSV sections
  const csvSections: string[] = [];

  try {
    // Export Transactions
    if (includeTypes.has('transactions')) {
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          date,
          payee_clean,
          amount,
          memo,
          category:categories(name),
          account:accounts(name)
        `)
        .eq('user_id', user.id)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: false });

      if (transactions && transactions.length > 0) {
        const headers = ['Date', 'Payee', 'Amount', 'Category', 'Account', 'Notes'];
        const rows = transactions.map((t: any) => [
          t.date || '',
          t.payee_clean || '',
          t.amount?.toFixed(2) || '0.00',
          t.category?.name || 'Uncategorized',
          t.account?.name || '',
          t.memo || '',
        ]);
        csvSections.push('# Transactions');
        csvSections.push(generateCSV(headers, rows));
      }
    }

    // Export Budgets
    if (includeTypes.has('budgets')) {
      // Get the current month for budget data
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      
      const { data: budgets } = await (supabase.from as any)('budgets')
        .select(`
          budgeted,
          rollover,
          rollover_amount,
          category:categories(name)
        `)
        .eq('user_id', user.id)
        .eq('month', currentMonth);

      if (budgets && budgets.length > 0) {
        // Calculate spent amounts
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount, category:categories(name)')
          .eq('user_id', user.id)
          .gte('date', currentMonth)
          .lt('date', `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-01`);

        const spentByCategory: Record<string, number> = {};
        (transactions || [])
          .filter((t: any) => t.amount < 0)
          .forEach((t: any) => {
            const catName = t.category?.name || 'Uncategorized';
            spentByCategory[catName] = (spentByCategory[catName] || 0) + Math.abs(t.amount);
          });

        const headers = ['Category', 'Budgeted', 'Spent', 'Remaining', 'Rollover'];
        const rows = budgets.map((b: any) => {
          const catName = b.category?.name || 'Unknown';
          const budgeted = b.budgeted || 0;
          const spent = spentByCategory[catName] || 0;
          const remaining = budgeted - spent;
          return [
            catName,
            budgeted.toFixed(2),
            spent.toFixed(2),
            remaining.toFixed(2),
            b.rollover ? 'Yes' : 'No',
          ];
        });

        if (csvSections.length > 0) csvSections.push('');
        csvSections.push('# Budgets (Current Month)');
        csvSections.push(generateCSV(headers, rows));
      }
    }

    // Export Savings Goals
    if (includeTypes.has('savings')) {
      const { data: savingsGoals } = await (supabase.from as any)('savings_goals')
        .select('name, monthly_contribution, current_amount, target_amount')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (savingsGoals && savingsGoals.length > 0) {
        const headers = ['Goal Name', 'Monthly Contribution', 'Current Amount', 'Target Amount'];
        const rows = savingsGoals.map((g: any) => [
          g.name || '',
          g.monthly_contribution?.toFixed(2) || '0.00',
          g.current_amount?.toFixed(2) || '0.00',
          g.target_amount?.toFixed(2) || 'N/A',
        ]);

        if (csvSections.length > 0) csvSections.push('');
        csvSections.push('# Savings Goals');
        csvSections.push(generateCSV(headers, rows));
      }
    }

    // Combine all sections
    const csvContent = csvSections.join('\n');

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `thallo-export-${timestamp}.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-RateLimit-Reset': String(rateLimitResult.reset),
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    );
  }
}
