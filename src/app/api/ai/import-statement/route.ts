export const maxDuration = 60;
import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { getUserTier, checkRateLimit } from '@/lib/ai/rate-limiter';
import OpenAI from 'openai';

// Lazy initialize OpenAI to avoid build-time errors
function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface ParsedTransaction {
  date: string;
  amount: number;
  merchant: string;
  category_id: string | null;
  category_name: string;
  confidence: number;
}

export async function POST(req: NextRequest) {
  const guard = await apiGuard(10);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  // Check user tier - bank statement import requires Plus
  const { tier } = await getUserTier(supabase, user.id);
  const isFree = tier === 'free' || tier === 'basic';
  if (isFree) {
    return NextResponse.json(
      { error: 'Upgrade to Plus to unlock bank statement import' },
      { status: 401 }
    );
  }

  // Check rate limits
  const rateCheck = await checkRateLimit(supabase, user.id, tier, 'statement_import');
  if (!rateCheck.allowed) {
    return NextResponse.json({
      error: 'Rate limit exceeded',
      message: rateCheck.message,
      remaining: rateCheck.remaining,
    }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { csvText, pdfBase64, imageBase64 } = body;

    // Fetch user's categories for AI categorization
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, type')
      .eq('type', 'expense')
      .order('name');

    const categoryList = (categories || []).map((c: { id: string; name: string }) => 
      `${c.name} (ID: ${c.id})`
    ).join(', ');

    let transactions: ParsedTransaction[] = [];

    if (csvText) {
      // Parse CSV text
      transactions = await parseCSVWithAI(csvText, categoryList);
    } else if (pdfBase64 || imageBase64) {
      // Parse PDF/image with vision AI
      const dataUrl = pdfBase64 
        ? `data:application/pdf;base64,${pdfBase64}`
        : `data:image/jpeg;base64,${imageBase64}`;
      transactions = await parseDocumentWithVision(dataUrl, categoryList);
    } else {
      return NextResponse.json({ error: 'No CSV text or file provided' }, { status: 400 });
    }

    return NextResponse.json({ transactions });
  } catch (error: any) {
    console.error('Import statement error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process statement' 
    }, { status: 500 });
  }
}

async function parseCSVWithAI(csvText: string, categoryList: string): Promise<ParsedTransaction[]> {
  const prompt = `You are a bank statement CSV parser. Parse this CSV and extract transactions.

CSV Data:
${csvText}

User's expense categories: ${categoryList}

Tasks:
1. Detect which columns contain: date, amount, description/merchant
2. Parse each transaction row
3. Categorize each transaction into one of the user's categories (use category ID)
4. Return ONLY valid JSON array (no markdown, no explanations)

Output format (JSON array):
[
  {
    "date": "2024-01-15",
    "amount": -45.67,
    "merchant": "Amazon",
    "category_id": "cat_id_here",
    "category_name": "Shopping",
    "confidence": 0.95
  }
]

Rules:
- Expenses should be NEGATIVE numbers
- Income should be POSITIVE numbers
- Use YYYY-MM-DD date format
- confidence: 0-1 score for categorization accuracy
- Only include actual transaction rows (skip headers, totals, etc.)`;

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a precise CSV parser. Return only valid JSON.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
  });

  const responseText = completion.choices[0].message.content || '[]';
  
  // Extract JSON from markdown code blocks if present
  const jsonMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) || 
                    responseText.match(/(\[[\s\S]*\])/);
  const jsonText = jsonMatch ? jsonMatch[1] : responseText;
  
  return JSON.parse(jsonText);
}

async function parseDocumentWithVision(dataUrl: string, categoryList: string): Promise<ParsedTransaction[]> {
  const prompt = `You are analyzing a bank statement (PDF or image). Extract ALL transactions visible.

User's expense categories: ${categoryList}

Tasks:
1. Find the transactions table/list in the document
2. Extract: date, amount, merchant/description for each transaction
3. Categorize each into one of the user's categories
4. Return ONLY valid JSON array (no markdown, no explanations)

Output format (JSON array):
[
  {
    "date": "2024-01-15",
    "amount": -45.67,
    "merchant": "Starbucks",
    "category_id": "cat_id_here",
    "category_name": "Food & Dining",
    "confidence": 0.9
  }
]

Rules:
- Expenses should be NEGATIVE numbers
- Income/deposits should be POSITIVE numbers
- Use YYYY-MM-DD date format
- confidence: 0-1 score for categorization accuracy
- Skip headers, summaries, account info — only transactions`;

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a bank statement analyzer. Return only valid JSON.' },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }
    ],
    temperature: 0.3,
  });

  const responseText = completion.choices[0].message.content || '[]';
  
  // Extract JSON from markdown code blocks if present
  const jsonMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) || 
                    responseText.match(/(\[[\s\S]*\])/);
  const jsonText = jsonMatch ? jsonMatch[1] : responseText;
  
  return JSON.parse(jsonText);
}
