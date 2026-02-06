import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';

export async function GET() {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  // Get all scores ordered by date
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: scores, error } = await (supabase.from as any)('credit_scores')
    .select('*')
    .eq('user_id', user.id)
    .order('recorded_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch credit scores:', error);
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 });
  }

  return NextResponse.json(scores || []);
}

export async function POST(request: NextRequest) {
  const guard = await apiGuard(30);
  if (guard.error) return guard.error;
  const { user, supabase } = guard;

  const body = await request.json();
  const { equifax, experian, transunion, source = 'manual' } = body;

  // Validation
  const validateScore = (score: unknown, name: string) => {
    if (score === null || score === undefined) return null;
    if (typeof score !== 'number' || isNaN(score)) {
      throw new Error(`${name} must be a number`);
    }
    if (score < 300 || score > 850) {
      throw new Error(`${name} must be between 300 and 850`);
    }
    return Math.round(score);
  };

  try {
    const validatedEquifax = validateScore(equifax, 'Equifax score');
    const validatedExperian = validateScore(experian, 'Experian score');
    const validatedTransunion = validateScore(transunion, 'TransUnion score');

    // At least one score required
    if (validatedEquifax === null && validatedExperian === null && validatedTransunion === null) {
      return NextResponse.json({ error: 'At least one score is required' }, { status: 400 });
    }

    // Validate source
    const validSources = ['manual', 'import', 'api'];
    if (!validSources.includes(source)) {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
    }

    // Insert new score record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newScore, error } = await (supabase.from as any)('credit_scores')
      .insert({
        user_id: user.id,
        equifax: validatedEquifax,
        experian: validatedExperian,
        transunion: validatedTransunion,
        source,
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to insert credit score:', error);
      return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
    }

    return NextResponse.json(newScore, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid input';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
