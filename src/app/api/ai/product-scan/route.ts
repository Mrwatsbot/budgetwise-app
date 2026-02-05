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
    const { tier } = await getUserTier(supabase, user.id);
    const isFree = tier === 'free' || tier === 'basic';
    if (isFree) {
      return NextResponse.json(
        { error: 'Upgrade to Plus to unlock product scanning' },
        { status: 401 }
      );
    }

    // Rate limit check
    const rateCheck = await checkRateLimit(supabase, user.id, tier, 'product_scan');
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
      task: 'product_scan',
      messages: [
        {
          role: 'system',
          content: `You are a product identification expert for a budgeting app. Identify the product from the photo.

The photo could be: a price tag, shelf label, the product itself, a screenshot of a product page, or a barcode area.

Return ONLY valid JSON with this structure:
{
  "product_name": "string — clear product name",
  "estimated_price": number — price in USD,
  "confidence": number (0-1),
  "category": "string — one of: Electronics, Clothing, Furniture, Vehicle, Home Improvement, Travel, Education, Health, Entertainment, Other",
  "price_source": "visible_price" | "estimated" | "recognized_product",
  "notes": "string — brief note about what you see"
}

Rules:
- If you can see an actual price tag or label, use that exact price and set price_source to "visible_price"
- If you recognize the product (e.g. Nike Air Max, iPhone 16), estimate typical retail price and set price_source to "recognized_product"
- If unclear, give your best estimate and set price_source to "estimated"
- Category must be one of the exact options listed above
- Confidence should reflect how sure you are about the identification and price
- Return ONLY the JSON, no markdown wrapping`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Identify this product and its price:' },
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
        error: 'Could not identify product',
        raw: result.content,
      }, { status: 422 });
    }

    // Log AI usage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)('ai_usage').insert({
      user_id: user.id,
      feature: 'product_scan',
      tokens_input: result.usage?.prompt_tokens || 0,
      tokens_output: result.usage?.completion_tokens || 0,
    });

    // Increment rate limit counter
    await incrementUsage(supabase, user.id, 'product_scan');

    return NextResponse.json({
      success: true,
      data: extracted,
    });
  } catch (error) {
    console.error('Product scan error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Product scan failed' },
      { status: 500 }
    );
  }
}
