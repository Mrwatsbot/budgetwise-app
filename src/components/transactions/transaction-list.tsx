'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, MoreHorizontal, Package } from 'lucide-react';
import { getCategoryIcon } from '@/lib/category-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  amount: number;
  payee_clean: string;
  payee_original: string;
  date: string;
  memo: string | null;
  is_cleared: boolean;
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  } | null;
  account: {
    id: string;
    name: string;
  };
}

interface TransactionListProps {
  transactions: Transaction[];
  showAccount?: boolean;
  onRefresh?: () => void;
}

export function TransactionList({ transactions, showAccount = false, onRefresh }: TransactionListProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    
    setDeleting(id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Transaction deleted');
      if (onRefresh) {
        onRefresh();
      } else {
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatAmount = (amount: number) => {
    const absAmount = Math.abs(amount).toFixed(2);
    return amount >= 0 ? `+$${absAmount}` : `-$${absAmount}`;
  };

  // Group transactions by date
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const date = transaction.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>);

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No transactions yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add your first transaction to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
            {formatDate(date)}
          </h3>
          <Card>
            <CardContent className="p-0 divide-y">
              {groupedTransactions[date].map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Category Icon */}
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ 
                        backgroundColor: transaction.category?.color 
                          ? `${transaction.category.color}20` 
                          : '#94a3b820'
                      }}
                    >
                      {(() => {
                        const IconComponent = getCategoryIcon(transaction.category?.icon || null, transaction.category?.name);
                        return <IconComponent className="w-5 h-5" style={{ color: transaction.category?.color || '#8a8279' }} />;
                      })()}
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {transaction.payee_clean || transaction.payee_original}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{transaction.category?.name || 'Uncategorized'}</span>
                        {showAccount && (
                          <>
                            <span>•</span>
                            <span>{transaction.account.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount & Actions */}
                  <div className="flex items-center gap-3">
                    <span 
                      className={`font-semibold tabular-nums ${
                        transaction.amount >= 0 ? 'text-green-600' : ''
                      }`}
                    >
                      {formatAmount(transaction.amount)}
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDelete(transaction.id)}
                          disabled={deleting === transaction.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
