import { NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import Papa from 'papaparse';
import JSZip from 'jszip';
import { callAI } from '@/lib/ai/openrouter';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Known CSV format patterns
const KNOWN_FORMATS = {
  ynab: {
    name: 'YNAB Register',
    headers: ['Account', 'Flag', 'Date', 'Payee', 'Category Group/Category', 'Memo', 'Outflow', 'Inflow', 'Cleared'],
    mapping: {
      date: 2,
      payee: 3,
      category: 4,
      memo: 5,
      outflow: 6,
      inflow: 7,
      account: 0,
    },
  },
  monarch: {
    name: 'Monarch Money',
    headers: ['Date', 'Merchant', 'Category', 'Account', 'Original Statement', 'Notes', 'Amount', 'Tags'],
    mapping: {
      date: 0,
      payee: 1,
      category: 2,
      account: 3,
      notes: 5,
      amount: 6,
    },
  },
  mint: {
    name: 'Mint',
    headers: ['Date', 'Description', 'Original Description', 'Amount', 'Transaction Type', 'Category', 'Account Name', 'Labels', 'Notes'],
    mapping: {
      date: 0,
      payee: 1,
      amount: 3,
      category: 5,
      account: 6,
      notes: 8,
    },
  },
};

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

export async function POST(request: Request) {
  const guard = await apiGuard(5);
  if (guard.error) return guard.error;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    let csvContent: string;
    const fileName = file.name.toLowerCase();

    // Handle ZIP files (YNAB exports)
    if (fileName.endsWith('.zip')) {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // Look for Register.csv in the ZIP
      const registerFile = zip.file(/register\.csv$/i)[0];
      if (!registerFile) {
        return NextResponse.json(
          { error: 'No Register.csv found in ZIP file. Please upload a YNAB export.' },
          { status: 400 }
        );
      }
      
      csvContent = await registerFile.async('text');
    } else if (fileName.endsWith('.csv') || fileName.endsWith('.tsv') || fileName.endsWith('.txt')) {
      csvContent = await file.text();
    } else {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a CSV, TSV, or ZIP file.' },
        { status: 400 }
      );
    }

    // Parse CSV
    const parseResult = Papa.parse(csvContent, {
      header: false,
      skipEmptyLines: true,
      delimiter: '', // Auto-detect
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: `CSV parse error: ${parseResult.errors[0].message}` },
        { status: 400 }
      );
    }

    const rows = parseResult.data as string[][];
    if (rows.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must contain at least a header row and one data row.' },
        { status: 400 }
      );
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Try to detect known formats
    let detectedFormat: 'ynab' | 'monarch' | 'mint' | 'auto' = 'auto';
    let columnMap: ColumnMap = {};

    for (const [formatKey, format] of Object.entries(KNOWN_FORMATS)) {
      // Check if headers match (case-insensitive, partial match)
      const matchCount = format.headers.filter(h =>
        headers.some(csvHeader => csvHeader.toLowerCase().includes(h.toLowerCase()))
      ).length;

      if (matchCount >= format.headers.length * 0.7) {
        detectedFormat = formatKey as 'ynab' | 'monarch' | 'mint';
        columnMap = format.mapping;
        break;
      }
    }

    // If no known format detected, use AI to map columns
    if (detectedFormat === 'auto' && headers.length > 0) {
      const sampleData = {
        headers,
        sampleRows: dataRows.slice(0, 3),
      };

      try {
        const aiResponse = await callAI({
          task: 'csv_column_detect',
          messages: [
            {
              role: 'system',
              content: `You are a CSV column mapper for financial data. Given CSV headers and sample rows, identify which columns map to transaction fields.

Return ONLY valid JSON with this structure:
{
  "date": number (column index) or null,
  "payee": number (column index) or null,
  "amount": number (column index) or null,
  "category": number (column index) or null,
  "account": number (column index) or null,
  "notes": number (column index) or null,
  "inflow": number (column index for separate inflow column, YNAB-style) or null,
  "outflow": number (column index for separate outflow column, YNAB-style) or null
}

Rules:
- Column indices are 0-based
- date: look for "date", "transaction date", "posted date", etc.
- payee: look for "payee", "merchant", "description", "vendor", etc.
- amount: look for "amount", "total", "debit", "credit" (single column with +/- values)
- category: look for "category", "type", "class", etc.
- account: look for "account", "account name", etc.
- notes: look for "memo", "notes", "description", etc.
- inflow/outflow: ONLY if there are separate columns for income/expense (like YNAB)
- If a field cannot be detected, set it to null
- Be smart about detecting variations and abbreviations
- Return ONLY the JSON, no markdown wrapping`,
            },
            {
              role: 'user',
              content: `Map these CSV columns:\n\nHeaders: ${JSON.stringify(headers)}\n\nSample rows:\n${JSON.stringify(sampleData.sampleRows, null, 2)}`,
            },
          ],
        });

        const aiMapping = JSON.parse(aiResponse.content.trim());
        columnMap = aiMapping;
      } catch (error) {
        console.error('AI column detection failed:', error);
        // Fall back to simple heuristics
        columnMap = detectColumnsHeuristic(headers);
      }
    }

    // Generate sample rows with mapped values
    const sampleRows = dataRows.slice(0, 5).map(row => {
      const mapped: Record<string, string> = {};
      
      if (columnMap.date !== undefined && columnMap.date !== null) {
        mapped.date = row[columnMap.date] || '';
      }
      if (columnMap.payee !== undefined && columnMap.payee !== null) {
        mapped.payee = row[columnMap.payee] || '';
      }
      if (columnMap.amount !== undefined && columnMap.amount !== null) {
        mapped.amount = row[columnMap.amount] || '';
      }
      if (columnMap.category !== undefined && columnMap.category !== null) {
        mapped.category = row[columnMap.category] || '';
      }
      if (columnMap.account !== undefined && columnMap.account !== null) {
        mapped.account = row[columnMap.account] || '';
      }
      if (columnMap.notes !== undefined && columnMap.notes !== null) {
        mapped.notes = row[columnMap.notes] || '';
      }
      if (columnMap.inflow !== undefined && columnMap.inflow !== null) {
        mapped.inflow = row[columnMap.inflow] || '';
      }
      if (columnMap.outflow !== undefined && columnMap.outflow !== null) {
        mapped.outflow = row[columnMap.outflow] || '';
      }

      return mapped;
    });

    return NextResponse.json({
      format: detectedFormat,
      headers,
      columnMap,
      sampleRows,
      totalRows: dataRows.length,
    });
  } catch (error: unknown) {
    console.error('Import parse error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse file' },
      { status: 500 }
    );
  }
}

// Simple heuristic-based column detection
function detectColumnsHeuristic(headers: string[]): ColumnMap {
  const columnMap: ColumnMap = {};

  headers.forEach((header, index) => {
    const lower = header.toLowerCase();

    // Date
    if (!columnMap.date && (lower.includes('date') || lower === 'dt')) {
      columnMap.date = index;
    }

    // Payee/Merchant
    if (!columnMap.payee && (
      lower.includes('payee') ||
      lower.includes('merchant') ||
      lower.includes('description') ||
      lower.includes('vendor') ||
      lower.includes('name')
    )) {
      columnMap.payee = index;
    }

    // Amount
    if (!columnMap.amount && (
      lower.includes('amount') ||
      lower.includes('total') ||
      lower === 'debit' ||
      lower === 'credit'
    )) {
      columnMap.amount = index;
    }

    // Category
    if (!columnMap.category && (
      lower.includes('category') ||
      lower.includes('type') ||
      lower.includes('class')
    )) {
      columnMap.category = index;
    }

    // Account
    if (!columnMap.account && lower.includes('account')) {
      columnMap.account = index;
    }

    // Notes/Memo
    if (!columnMap.notes && (lower.includes('memo') || lower.includes('note'))) {
      columnMap.notes = index;
    }

    // Inflow/Outflow (YNAB style)
    if (lower.includes('inflow')) {
      columnMap.inflow = index;
    }
    if (lower.includes('outflow')) {
      columnMap.outflow = index;
    }
  });

  return columnMap;
}
