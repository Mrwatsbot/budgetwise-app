import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { plaidClient } from '@/lib/plaid/client';
import { decryptToken } from '@/lib/plaid/crypto';
import { Transaction, AccountBase, AccountType, AccountSubtype } from 'plaid';
import { applyCategoryRules } from '@/lib/category-rules';

// Rate limit: max once per hour per connection
const SYNC_RATE_LIMIT_MS = 60 * 60 * 1000;

// Category mapping from Plaid to user categories
const CATEGORY_MAPPINGS: Record<string, string> = {
  'FOOD_AND_DRINK': 'Food & Dining',
  'FOOD AND DRINK': 'Food & Dining',
  'TRANSPORTATION': 'Transportation',
  'GENERAL_MERCHANDISE': 'Shopping',
  'GENERAL MERCHANDISE': 'Shopping',
  'ENTERTAINMENT': 'Entertainment',
  'UTILITIES': 'Utilities',
  'MEDICAL': 'Health',
  'HEALTHCARE': 'Health',
  'RENT_AND_UTILITIES': 'Utilities',
  'RENT AND UTILITIES': 'Utilities',
  'PERSONAL_CARE': 'Personal Care',
  'PERSONAL CARE': 'Personal Care',
  'GENERAL_SERVICES': 'Services',
  'GENERAL SERVICES': 'Services',
};

function findCategoryMatch(plaidCategories: string[] | null | undefined, userCategories: any[]): string | null {
  if (!plaidCategories || plaidCategories.length === 0) return null;
  
  // Try to match primary category
  const primaryCategory = plaidCategories[0]?.toUpperCase();
  const mappedName = CATEGORY_MAPPINGS[primaryCategory];
  
  if (mappedName) {
    const match = userCategories.find(c => c.name === mappedName);
    if (match) return match.id;
  }
  
  // Try fuzzy matching on category names
  for (const plaidCat of plaidCategories) {
    const normalized = plaidCat.toLowerCase().replace(/_/g, ' ');
    const match = userCategories.find(c => 
      c.name.toLowerCase().includes(normalized) || 
      normalized.includes(c.name.toLowerCase())
    );
    if (match) return match.id;
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  let connectionIdForError: string | null = null;
  let itemIdForError: string | null = null;
  
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { connection_id, item_id } = body;
    
    // Store for error handling
    connectionIdForError = connection_id || null;
    itemIdForError = item_id || null;

    // Get connections to sync
    let connectionsQuery = (supabase.from as any)('plaid_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (connection_id) {
      connectionsQuery = connectionsQuery.eq('id', connection_id);
    } else if (item_id) {
      connectionsQuery = connectionsQuery.eq('item_id', item_id);
    }

    const { data: connections, error: connError } = await connectionsQuery;
    
    if (connError || !connections || connections.length === 0) {
      return NextResponse.json({ error: 'No active connections found' }, { status: 404 });
    }

    // Get user categories for auto-categorization
    const { data: userCategories } = await supabase
      .from('categories')
      .select('id, name, type')
      .or(`user_id.eq.${user.id},is_system.eq.true`)
      .eq('type', 'expense');

    // Get user's first active account (or we could create a Plaid-specific account)
    const { data: userAccounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    if (!userAccounts || userAccounts.length === 0) {
      return NextResponse.json(
        { error: 'No active account found. Please create an account first.' },
        { status: 400 }
      );
    }

    const defaultAccountId = (userAccounts[0] as any).id;

    let totalAdded = 0;
    let totalModified = 0;
    let totalRemoved = 0;
    let totalDebtsCreated = 0;

    // Sync each connection
    for (const connection of connections) {
      // Rate limit check
      if (connection.last_synced_at) {
        const lastSync = new Date(connection.last_synced_at).getTime();
        const now = Date.now();
        if (now - lastSync < SYNC_RATE_LIMIT_MS) {
          continue; // Skip this connection, synced too recently
        }
      }

      // Decrypt access token
      const accessToken = decryptToken(connection.encrypted_access_token);

      let hasMore = true;
      let cursor = connection.sync_cursor || undefined;

      while (hasMore) {
        // Call Plaid sync endpoint
        const response = await plaidClient.transactionsSync({
          access_token: accessToken,
          cursor: cursor,
        });

        const { added, modified, removed, next_cursor, has_more } = response.data;

        // Process added transactions
        for (const txn of added) {
          const payee = txn.merchant_name || txn.name || 'Unknown';
          
          // Try category rules first, then fall back to Plaid category matching
          let categoryId = await applyCategoryRules(supabase, user.id, payee);
          if (!categoryId) {
            categoryId = findCategoryMatch(txn.personal_finance_category?.primary ? [txn.personal_finance_category.primary] : null, userCategories || []);
          }
          
          // Insert transaction (with conflict handling for deduplication)
          const { error: insertError } = await (supabase.from as any)('transactions')
            .upsert({
              user_id: user.id,
              account_id: defaultAccountId,
              plaid_transaction_id: txn.transaction_id,
              // Plaid sign convention: positive = money leaving (debit/expense)
              // App sign convention: negative = expense, positive = income
              // So we negate: Plaid +50 (debit) → App -50 (expense)
              //               Plaid -50 (credit) → App +50 (income)
              amount: -txn.amount,
              payee_original: payee,
              payee_clean: payee,
              date: txn.date,
              category_id: categoryId,
              memo: txn.name !== txn.merchant_name ? txn.name : null,
              is_cleared: true,
              is_reconciled: false,
              ai_categorized: !!categoryId,
              ai_confidence: categoryId ? 0.8 : null,
            }, {
              onConflict: 'plaid_transaction_id',
              ignoreDuplicates: false,
            });

          if (!insertError) {
            totalAdded++;
          }
        }

        // Process modified transactions
        for (const txn of modified) {
          const payee = txn.merchant_name || txn.name || 'Unknown';
          
          // Try category rules first, then fall back to Plaid category matching
          let categoryId = await applyCategoryRules(supabase, user.id, payee);
          if (!categoryId) {
            categoryId = findCategoryMatch(txn.personal_finance_category?.primary ? [txn.personal_finance_category.primary] : null, userCategories || []);
          }
          
          const { error: updateError } = await (supabase.from as any)('transactions')
            .update({
              amount: -txn.amount, // Negate Plaid sign convention
              payee_original: payee,
              payee_clean: payee,
              date: txn.date,
              category_id: categoryId,
              memo: txn.name !== txn.merchant_name ? txn.name : null,
            })
            .eq('plaid_transaction_id', txn.transaction_id)
            .eq('user_id', user.id);

          if (!updateError) {
            totalModified++;
          }
        }

        // Process removed transactions
        for (const txn of removed) {
          const { error: deleteError } = await (supabase.from as any)('transactions')
            .delete()
            .eq('plaid_transaction_id', txn.transaction_id)
            .eq('user_id', user.id);

          if (!deleteError) {
            totalRemoved++;
          }
        }

        cursor = next_cursor;
        hasMore = has_more;
      }

      // Update connection with new cursor and last synced time
      await (supabase.from as any)('plaid_connections')
        .update({
          sync_cursor: cursor,
          last_synced_at: new Date().toISOString(),
          error_code: null,
        })
        .eq('id', connection.id);

      // ── Sync credit card accounts → debts ──
      try {
        const balanceResponse = await plaidClient.accountsBalanceGet({
          access_token: accessToken,
        });

        const accounts = balanceResponse.data.accounts || [];
        
        for (const account of accounts) {
          // Only process credit cards
          if (account.type !== AccountType.Credit) continue;

          const currentBalance = account.balances.current || 0;
          const creditLimit = account.balances.limit || null;
          const accountName = account.official_name || account.name || 'Credit Card';
          const plaidAccountId = account.account_id;

          // Check if a debt already exists for this Plaid account
          const { data: existingDebt } = await (supabase.from as any)('debts')
            .select('id')
            .eq('user_id', user.id)
            .eq('plaid_account_id', plaidAccountId)
            .maybeSingle();

          if (existingDebt) {
            // Update balance
            await (supabase.from as any)('debts')
              .update({
                current_balance: currentBalance,
                original_balance: creditLimit || currentBalance,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingDebt.id);
          } else if (currentBalance > 0) {
            // Create new debt entry for this credit card
            await (supabase.from as any)('debts')
              .insert({
                user_id: user.id,
                name: `${connection.institution_name} - ${accountName}`,
                type: 'credit_card',
                original_balance: creditLimit || currentBalance,
                current_balance: currentBalance,
                apr: 0, // Plaid doesn't provide APR — user can update later
                minimum_payment: 0,
                monthly_payment: 0,
                is_active: true,
                is_paid_off: false,
                plaid_account_id: plaidAccountId,
                plaid_connection_id: connection.id,
                notes: `Auto-synced from ${connection.institution_name} via Plaid. Update APR and payment amounts manually.`,
              });
            totalDebtsCreated++;
          }
        }
      } catch (balanceErr: any) {
        // Balance fetch can fail for some institutions — don't break the sync
        console.error('Balance fetch error:', balanceErr.message);
      }
    }

    return NextResponse.json({
      added: totalAdded,
      modified: totalModified,
      removed: totalRemoved,
      debts_created: totalDebtsCreated,
    });
  } catch (error: any) {
    console.error('Sync error:', {
      message: error.message,
      code: error.error_code,
      // DO NOT log full error object (may contain sensitive data)
    });

    // Update connection status if it's a Plaid error
    const plaidErrorCode = error?.response?.data?.error_code;
    if (plaidErrorCode && (connectionIdForError || itemIdForError)) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          let updateQuery = (supabase.from as any)('plaid_connections')
            .update({
              status: 'error',
              error_code: plaidErrorCode,
            })
            .eq('user_id', user.id);

          if (connectionIdForError) {
            updateQuery = updateQuery.eq('id', connectionIdForError);
          } else if (itemIdForError) {
            updateQuery = updateQuery.eq('item_id', itemIdForError);
          }

          await updateQuery;
        }
      } catch (updateError) {
        console.error('Failed to update connection status:', updateError);
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to sync transactions',
        plaid_error_code: plaidErrorCode,
      },
      { status: 500 }
    );
  }
}
