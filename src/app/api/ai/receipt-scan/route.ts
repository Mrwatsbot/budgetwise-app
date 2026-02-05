export const maxDuration = 60;
import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { callAI } from '@/lib/ai/openrouter';
import { checkRateLimit, incrementUsage, getUserTier } from '@/lib/ai/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const guard = await apiGuard(10);
    if (guard.error) return guard.error;
    const { user, supabase } = guard;

    // Tier gate
    const { tier, hasByok } = await getUserTier(supabase, user.id);
    const isFree = tier === 'free' || tier === 'basic';
    if (isFree) {
      return NextResponse.json(
        { error: 'Upgrade to Plus to unlock receipt scanning' },
        { status: 401 }
      );
    }

    // Rate limit check
    const rateCheck = await checkRateLimit(supabase, user.id, tier, 'receipt_scan', hasByok);
    if (!rateCheck.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        message: rateCheck.message,
        remaining: rateCheck.remaining,
        limit: rateCheck.limit,
      }, { status: 429 });
    }

    // Get image data
    const body = await request.json();
    const { image, mimeType } = body;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const dataUrl = image.startsWith('data:')
      ? image
      : `data:${mimeType || 'image/jpeg'};base64,${image}`;

    // Call vision AI
    const result = await callAI({
      task: 'receipt_scan_full',
      messages: [
        {
          role: 'system',
          content: `You are a receipt reader for a budgeting app. Extract detailed transaction information from the receipt image.

Return ONLY valid JSON with this structure:
{
  "merchant": "string — store/restaurant name",
  "date": "YYYY-MM-DD",
  "total": number,
  "subtotal": number or null,
  "tax": number or null,
  "tip": number or null,
  "payment_method": "cash" | "credit" | "debit" | "other",
  "items": [
    { "description": "string", "amount": number, "quantity": number }
  ],
  "suggested_category": "string — one of: Groceries, Dining Out, Transportation, Utilities, Healthcare, Entertainment, Shopping, Personal Care, Education, Subscriptions, Other",
  "confidence": number (0-1)
}

Rules:
- Extract as many line items as you can read
- For items without a clear quantity, use 1
- If you can't determine date, use today's date
- If you can't determine payment method, use "other"
- suggested_category should match the overall purchase type
- Return ONLY the JSON, no markdown wrapping`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract all details from this receipt:' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    });

    // Parse the JSON response
    let extracted;
    try {
      let content = result.content.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      extracted = JSON.parse(content);
    } catch {
      return NextResponse.json({
        error: 'Could not read receipt',
        raw: result.content,
      }, { status: 422 });
    }

    // Log AI usage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)('ai_usage').insert({
      user_id: user.id,
      feature: 'receipt_scan',
      tokens_input: result.usage?.prompt_tokens || 0,
      tokens_output: result.usage?.completion_tokens || 0,
    });

    // Increment rate limit counter
    await incrementUsage(supabase, user.id, 'receipt_scan');

    return NextResponse.json({
      success: true,
      data: extracted,
    });
  } catch (error) {
    console.error('Receipt scan error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Receipt scan failed' },
      { status: 500 }
    );
  }
}
