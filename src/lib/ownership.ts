import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Verify that an account belongs to the authenticated user.
 * Returns true if the account exists and belongs to the user.
 */
export async function verifyAccountOwnership(
  supabase: SupabaseClient,
  accountId: string,
  userId: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from as any)('accounts')
    .select('id')
    .eq('id', accountId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

/**
 * Verify that a category exists (categories are global, not user-scoped).
 * Returns true if the category exists.
 */
export async function verifyCategoryExists(
  supabase: SupabaseClient,
  categoryId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .maybeSingle();
  return !!data;
}

/**
 * Validate that a date is not unreasonably in the future.
 * Allows up to 1 day in the future (timezone tolerance).
 */
export function validateTransactionDate(dateStr: string): { valid: boolean; error?: string } {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);

  if (date > tomorrow) {
    return { valid: false, error: 'Future-dated transactions are not allowed' };
  }

  // Don't allow absurdly old dates either (before 1970)
  if (date.getFullYear() < 1970) {
    return { valid: false, error: 'Date is too far in the past' };
  }

  return { valid: true };
}
