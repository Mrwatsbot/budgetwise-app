export const maxDuration = 60;
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scanDocument } from '@/lib/ai/openrouter';
import { rateLimit } from '@/lib/rate-limit';
import { getUserTier, checkRateLimit, incrementUsage } from '@/lib/ai/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await rateLimit(user.id, 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    // Tier gate — statement scanning requires Plus or higher
    const { tier, hasByok } = await getUserTier(supabase, user.id);
    if (tier === 'free' || tier === 'basic') {
      return NextResponse.json(
        { error: 'Upgrade to Plus to unlock statement scanning' },
        { status: 403 }
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

    // Call vision AI
    const result = await scanDocument(image, mimeType || 'image/jpeg');

    // Parse the JSON response
    let extracted;
    try {
      // Strip markdown code blocks if present
      let content = result.content.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      extracted = JSON.parse(content);
    } catch {
      return NextResponse.json({
        error: 'Could not parse document',
        raw: result.content,
      }, { status: 422 });
    }

    // Log AI usage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)('ai_usage').insert({
      user_id: user.id,
      feature: 'scan_statement',
      tokens_input: result.usage?.prompt_tokens || 0,
      tokens_output: result.usage?.completion_tokens || 0,
    });

    // Increment rate limit counter
    await incrementUsage(supabase, user.id, 'receipt_scan');

    return NextResponse.json({
      success: true,
      data: Array.isArray(extracted) ? extracted : [extracted],
    });

  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scan failed' },
      { status: 500 }
    );
  }
}
