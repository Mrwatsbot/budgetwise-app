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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  categories?: Category[];
  showAccount?: boolean;
  onRefresh?: () => void;
}

export function TransactionList({ transactions, categories = [], showAccount = false, onRefresh }: TransactionListProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [newCategoryId, setNewCategoryId] = useState<string>('');
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [ruleDialogData, setRuleDialogData] = useState<{ payee: string; categoryName: string; categoryId: string } | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    
    setDeleting(id);
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }

      // Show toast with undo button
      toast.success('Transaction deleted', {
        duration: 8000,
        action: {
          label: 'Undo',
          onClick: () => handleUndo(id),
        },
        classNames: {
          actionButton: 'bg-teal-600 hover:bg-teal-700 text-white',
        },
      });

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

  const handleStartEdit = (transaction: Transaction) => {
    setEditing(transaction.id);
    setNewCategoryId(transaction.category?.id || '');
  };

  const handleCategoryChange = async (transactionId: string, categoryId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: categoryId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update');
      }

      // Get the new category name
      const newCategory = categories.find(c => c.id === categoryId);
      
      // Show rule creation dialog
      if (newCategory && transaction.payee_clean) {
        setRuleDialogData({
          payee: transaction.payee_clean,
          categoryName: newCategory.name,
          categoryId: categoryId,
        });
        setRuleDialogOpen(true);
      }

      // Show toast with undo button
      toast.success('Category updated', {
        duration: 8000,
        action: {
          label: 'Undo',
          onClick: () => handleUndo(transactionId),
        },
        classNames: {
          actionButton: 'bg-teal-600 hover:bg-teal-700 text-white',
        },
      });

      setEditing(null);
      if (onRefresh) {
        onRefresh();
      } else {
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update category');
    }
  };

  const handleUndo = async (transactionId: string) => {
    try {
      const response = await fetch('/api/transactions/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: transactionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to undo');
      }

      toast.success('Change undone');
      if (onRefresh) {
        onRefresh();
      } else {
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to undo');
    }
  };

  const handleCreateRule = async () => {
    if (!ruleDialogData) return;

    try {
      const response = await fetch('/api/category-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payee_pattern: ruleDialogData.payee,
          category_id: ruleDialogData.categoryId,
          match_type: 'contains',
        }),
      });

      if (!response.ok) throw new Error('Failed to create rule');

      toast.success(`Rule created! Future transactions from "${ruleDialogData.payee}" will auto-categorize.`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create rule');
    } finally {
      setRuleDialogOpen(false);
      setRuleDialogData(null);
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
    <>
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
                        {editing === transaction.id ? (
                          <div className="mt-1">
                            <Select
                              value={newCategoryId}
                              onValueChange={(value) => {
                                setNewCategoryId(value);
                                handleCategoryChange(transaction.id, value);
                              }}
                            >
                              <SelectTrigger className="h-8 w-[200px]">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories
                                  .filter(c => transaction.amount < 0 ? c.type === 'expense' : c.type === 'income')
                                  .map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      <span className="flex items-center gap-2">
                                        {(() => {
                                          const Icon = getCategoryIcon(cat.icon, cat.name);
                                          return <Icon className="w-4 h-4 text-muted-foreground" />;
                                        })()}
                                        <span>{cat.name}</span>
                                      </span>
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{transaction.category?.name || 'Uncategorized'}</span>
                            {showAccount && (
                              <>
                                <span>•</span>
                                <span>{transaction.account.name}</span>
                              </>
                            )}
                          </div>
                        )}
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
                          {categories.length > 0 && (
                            <DropdownMenuItem onClick={() => handleStartEdit(transaction)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Change Category
                            </DropdownMenuItem>
                          )}
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

      {/* Rule Creation Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category Rule?</DialogTitle>
            <DialogDescription>
              Always categorize <span className="font-semibold text-foreground">{ruleDialogData?.payee}</span> as{' '}
              <span className="font-semibold text-foreground">{ruleDialogData?.categoryName}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Future transactions from this payee will automatically be assigned to this category.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
              No, Just This Once
            </Button>
            <Button onClick={handleCreateRule} className="gradient-btn border-0">
              Yes, Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
