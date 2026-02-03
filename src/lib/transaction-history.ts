import { SupabaseClient } from '@supabase/supabase-js';
import { Transaction } from '@/types/database';

/**
 * Log a transaction change to history for undo functionality
 */
export async function logTransactionHistory(
  supabase: SupabaseClient,
  userId: string,
  transactionId: string,
  action: 'create' | 'update' | 'delete',
  previousData: Partial<Transaction>
) {
  // Insert history record
  const { error: insertError } = await supabase
    .from('transaction_history')
    .insert({
      transaction_id: transactionId,
      user_id: userId,
      action,
      previous_data: previousData as Record<string, unknown>,
    });

  if (insertError) {
    console.error('Failed to log transaction history:', insertError);
    // Don't throw - history logging should not block the main operation
  }

  // Cleanup: Keep only last 5 entries per transaction
  await cleanupOldHistory(supabase, transactionId);
}

/**
 * Keep only the last 5 history entries per transaction
 */
async function cleanupOldHistory(supabase: SupabaseClient, transactionId: string) {
  try {
    // Get all history entries for this transaction, ordered by created_at DESC
    const { data: allHistory, error: fetchError } = await supabase
      .from('transaction_history')
      .select('id, created_at')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: false });

    if (fetchError || !allHistory) return;

    // If more than 5 entries, delete the older ones
    if (allHistory.length > 5) {
      const idsToDelete = allHistory.slice(5).map(h => h.id);
      await supabase
        .from('transaction_history')
        .delete()
        .in('id', idsToDelete);
    }
  } catch (error) {
    console.error('Failed to cleanup old history:', error);
    // Don't throw - cleanup failure should not break the flow
  }
}
