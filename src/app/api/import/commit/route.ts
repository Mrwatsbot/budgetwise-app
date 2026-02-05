import { NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import Papa from 'papaparse';

interface ColumnMap {
  date?: number;
  payee?: number;
  amount?: number;
  category?: number;
  account?: number;
  notes?: number;
  inflow?: number;
  outflow?: number;
}

interface CommitRequest {
  file: string; // base64 CSV data
  columnMap: ColumnMap;
  format: 'ynab' | 'monarch' | 'mint' | 'auto';
  accountId?: string;
}

export async function POST(request: Request) {
  const guard = await apiGuard(10);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  try {
    const body: CommitRequest = await request.json();
    const { file, columnMap, format, accountId } = body;

    if (!file || !columnMap) {
      return NextResponse.json(
        { error: 'Missing required fields: file and columnMap' },
        { status: 400 }
      );
    }

    // Decode base64 CSV
    const csvContent = Buffer.from(file, 'base64').toString('utf-8');

    // Parse CSV
    const parseResult = Papa.parse(csvContent, {
      header: false,
      skipEmptyLines: true,
      delimiter: '',
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: `CSV parse error: ${parseResult.errors[0].message}` },
        { status: 400 }
      );
    }

    const rows = parseResult.data as string[][];
    const dataRows = rows.slice(1); // Skip header

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase.from as any;

    // Get global categories for fuzzy matching
    const { data: categories } = await db('categories')
      .select('id, name, type')
      .order('sort_order');

    // Get or create default account
    let targetAccountId = accountId;
    if (!targetAccountId) {
      const { data: accounts } = await db('accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (accounts && accounts.length > 0) {
        targetAccountId = (accounts[0] as { id: string }).id;
      } else {
        // Create a default account
        const { data: newAccount, error: accountError } = await db('accounts')
          .insert({
            user_id: user.id,
            name: 'Imported Account',
            type: 'checking',
            balance: 0,
          })
          .select()
          .single();

        if (accountError) throw accountError;
        targetAccountId = newAccount.id;
      }
    }

    // Get existing transactions for duplicate detection
    const { data: existingTransactions } = await db('transactions')
      .select('date, amount, payee_original')
      .eq('user_id', user.id);

    const existingSet = new Set(
      (existingTransactions || []).map((t: { date: string; amount: number; payee_original: string | null }) =>
        `${t.date}|${t.amount}|${(t.payee_original || '').toLowerCase()}`
      )
    );

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process each row
    for (const row of dataRows) {
      try {
        // Extract values based on column map
        const dateStr = columnMap.date !== undefined ? row[columnMap.date] : null;
        const payee = columnMap.payee !== undefined ? row[columnMap.payee] : null;
        const categoryStr = columnMap.category !== undefined ? row[columnMap.category] : null;
        const notesStr = columnMap.notes !== undefined ? row[columnMap.notes] : null;

        // Handle amount (YNAB has separate inflow/outflow, others have a single amount column)
        let amount = 0;
        if (format === 'ynab' && columnMap.inflow !== undefined && columnMap.outflow !== undefined) {
          const inflowStr = row[columnMap.inflow] || '0';
          const outflowStr = row[columnMap.outflow] || '0';
          const inflow = parseFloat(inflowStr.replace(/[^0-9.-]/g, '')) || 0;
          const outflow = parseFloat(outflowStr.replace(/[^0-9.-]/g, '')) || 0;
          amount = inflow > 0 ? inflow : -outflow;
        } else if (columnMap.amount !== undefined) {
          const amountStr = row[columnMap.amount] || '0';
          amount = parseFloat(amountStr.replace(/[^0-9.-]/g, '')) || 0;
        }

        if (!dateStr || amount === 0) {
          continue; // Skip invalid rows
        }

        // Parse date
        const date = parseDate(dateStr);
        if (!date) {
          errors.push(`Invalid date format: ${dateStr}`);
          continue;
        }

        // Check for duplicates
        const duplicateKey = `${date}|${amount}|${(payee || '').toLowerCase()}`;
        if (existingSet.has(duplicateKey)) {
          skipped++;
          continue;
        }

        // Match category
        let categoryId: string | null = null;
        if (categoryStr && categories) {
          const matchedCategory = fuzzyMatchCategory(categoryStr, categories);
          if (matchedCategory) {
            categoryId = matchedCategory.id;
          }
        }

        // Insert transaction (match existing bulk insert pattern)
        const { error: insertError } = await db('transactions').insert({
          user_id: user.id,
          account_id: targetAccountId,
          category_id: categoryId,
          amount,
          date,
          payee_original: payee || 'Unknown',
          payee_clean: payee || 'Unknown',
          notes: notesStr ? `${notesStr} (imported)` : 'Imported',
        });

        if (insertError) {
          errors.push(`Failed to import transaction: ${insertError.message}`);
        } else {
          imported++;
          existingSet.add(duplicateKey); // Add to set to avoid duplicates within the same import
        }
      } catch (error) {
        errors.push(`Row error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      errors: errors.slice(0, 10), // Limit to first 10 errors
    });
  } catch (error: unknown) {
    console.error('Import commit error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import transactions' },
      { status: 500 }
    );
  }
}

// Parse date from various formats
function parseDate(dateStr: string): string | null {
  try {
    // Try common formats
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, // MM/DD/YY
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY (European)
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format === formats[0]) {
          // YYYY-MM-DD - already in correct format
          return dateStr;
        } else if (format === formats[1] || format === formats[2]) {
          // MM/DD/YYYY or MM/DD/YY
          const month = match[1].padStart(2, '0');
          const day = match[2].padStart(2, '0');
          let year = match[3];
          if (year.length === 2) {
            year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
          }
          return `${year}-${month}-${day}`;
        } else if (format === formats[3]) {
          // DD/MM/YYYY
          const day = match[1].padStart(2, '0');
          const month = match[2].padStart(2, '0');
          const year = match[3];
          return `${year}-${month}-${day}`;
        }
      }
    }

    // Try JavaScript Date parsing as fallback
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.error('Date parse error:', error);
  }

  return null;
}

// Fuzzy match category name
function fuzzyMatchCategory(
  categoryName: string,
  categories: { id: string; name: string; type: string }[]
): { id: string; name: string; type: string } | null {
  const lower = categoryName.toLowerCase().trim();

  // Exact match
  const exact = categories.find(c => c.name.toLowerCase() === lower);
  if (exact) return exact;

  // Partial match
  const partial = categories.find(c => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase()));
  if (partial) return partial;

  // Common category mappings
  const mappings: Record<string, string[]> = {
    'Groceries': ['grocery', 'groceries', 'food & dining', 'supermarket'],
    'Dining Out': ['dining', 'restaurants', 'eating out', 'food'],
    'Transportation': ['transport', 'gas', 'fuel', 'auto', 'car', 'uber', 'lyft'],
    'Utilities': ['utility', 'utilities', 'bills', 'electric', 'water', 'gas'],
    'Healthcare': ['health', 'medical', 'doctor', 'pharmacy', 'medicine'],
    'Entertainment': ['entertainment', 'fun', 'movies', 'games', 'hobbies'],
    'Shopping': ['shopping', 'retail', 'amazon', 'online shopping'],
    'Housing': ['rent', 'mortgage', 'housing', 'home'],
    'Subscriptions': ['subscription', 'subscriptions', 'recurring', 'membership'],
  };

  for (const [category, keywords] of Object.entries(mappings)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      const matched = categories.find(c => c.name === category);
      if (matched) return matched;
    }
  }

  return null;
}
