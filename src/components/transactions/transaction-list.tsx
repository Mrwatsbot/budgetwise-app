'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trash2, Edit, MoreHorizontal, Package, Split, X, Plus, ChevronDown, ChevronRight } from 'lucide-react';
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
  is_split?: boolean;
  parent_transaction_id?: string | null;
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

interface SplitItem {
  category_id: string;
  amount: number;
  notes: string;
}

export function TransactionList({ transactions, categories = [], showAccount = false, onRefresh }: TransactionListProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [newCategoryId, setNewCategoryId] = useState<string>('');
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [ruleDialogData, setRuleDialogData] = useState<{ payee: string; categoryName: string; categoryId: string } | null>(null);
  
  // Split transaction state
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splittingTransaction, setSplittingTransaction] = useState<Transaction | null>(null);
  const [splitItems, setSplitItems] = useState<SplitItem[]>([
    { category_id: '', amount: 0, notes: '' },
    { category_id: '', amount: 0, notes: '' },
  ]);
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(new Set());
  const [childTransactions, setChildTransactions] = useState<Record<string, Transaction[]>>({});

  // Fetch child transactions for split parents
  useEffect(() => {
    const fetchChildTransactions = async () => {
      const splitParentIds = transactions
        .filter(t => t.is_split)
        .map(t => t.id);

      if (splitParentIds.length === 0) return;

      try {
        // Fetch children for all split parents
        const childPromises = splitParentIds.map(async (parentId) => {
          const response = await fetch(`/api/transactions?parent_transaction_id=${parentId}`);
          if (!response.ok) return { parentId, children: [] };
          const data = await response.json();
          return { parentId, children: data.transactions || [] };
        });

        const results = await Promise.all(childPromises);
        
        const grouped = results.reduce((acc, { parentId, children }) => {
          acc[parentId] = children;
          return acc;
        }, {} as Record<string, Transaction[]>);
        
        setChildTransactions(grouped);
      } catch (error) {
        console.error('Failed to fetch child transactions:', error);
      }
    };

    fetchChildTransactions();
  }, [transactions]);

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

      const newCategory = categories.find(c => c.id === categoryId);
      
      if (newCategory && transaction.payee_clean) {
        setRuleDialogData({
          payee: transaction.payee_clean,
          categoryName: newCategory.name,
          categoryId: categoryId,
        });
        setRuleDialogOpen(true);
      }

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

  const handleOpenSplitDialog = (transaction: Transaction) => {
    setSplittingTransaction(transaction);
    const originalAmount = Math.abs(transaction.amount);
    setSplitItems([
      { category_id: '', amount: 0, notes: '' },
      { category_id: '', amount: 0, notes: '' },
    ]);
    setSplitDialogOpen(true);
  };

  const handleAddSplitItem = () => {
    setSplitItems([...splitItems, { category_id: '', amount: 0, notes: '' }]);
  };

  const handleRemoveSplitItem = (index: number) => {
    if (splitItems.length <= 2) return;
    setSplitItems(splitItems.filter((_, i) => i !== index));
  };

  const handleSplitItemChange = (index: number, field: keyof SplitItem, value: string | number) => {
    const newItems = [...splitItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setSplitItems(newItems);
  };

  const handleAutoFillLast = () => {
    if (!splittingTransaction || splitItems.length === 0) return;
    
    const originalAmount = Math.abs(splittingTransaction.amount);
    const assignedAmount = splitItems.slice(0, -1).reduce((sum, item) => sum + item.amount, 0);
    const remaining = originalAmount - assignedAmount;
    
    const newItems = [...splitItems];
    newItems[newItems.length - 1].amount = Math.max(0, remaining);
    setSplitItems(newItems);
  };

  const handleSubmitSplit = async () => {
    if (!splittingTransaction) return;

    // Validate all splits have a category
    if (splitItems.some(item => !item.category_id || item.amount <= 0)) {
      toast.error('All splits must have a category and amount greater than 0');
      return;
    }

    try {
      const response = await fetch('/api/transactions/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: splittingTransaction.id,
          splits: splitItems,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to split transaction');
      }

      toast.success('Transaction split successfully');
      setSplitDialogOpen(false);
      setSplittingTransaction(null);
      setSplitItems([
        { category_id: '', amount: 0, notes: '' },
        { category_id: '', amount: 0, notes: '' },
      ]);

      if (onRefresh) {
        onRefresh();
      } else {
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to split transaction');
    }
  };

  const handleUnsplit = async (transactionId: string) => {
    if (!confirm('Remove split and restore original transaction?')) return;

    try {
      const response = await fetch('/api/transactions/unsplit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: transactionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unsplit transaction');
      }

      toast.success('Transaction unsplit successfully');
      
      if (onRefresh) {
        onRefresh();
      } else {
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to unsplit transaction');
    }
  };

  const toggleExpandTransaction = (transactionId: string) => {
    const newExpanded = new Set(expandedTransactions);
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId);
    } else {
      newExpanded.add(transactionId);
    }
    setExpandedTransactions(newExpanded);
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

  const totalSplitAmount = splitItems.reduce((sum, item) => sum + item.amount, 0);
  const originalAmount = splittingTransaction ? Math.abs(splittingTransaction.amount) : 0;
  const remaining = originalAmount - totalSplitAmount;

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
                  <div key={transaction.id}>
                    <div
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Expand button for split transactions */}
                        {transaction.is_split && (
                          <button
                            onClick={() => toggleExpandTransaction(transaction.id)}
                            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                          >
                            {expandedTransactions.has(transaction.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        )}

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
                              {transaction.is_split ? (
                                <span className="flex items-center gap-1">
                                  <Split className="w-3 h-3" />
                                  Split into {childTransactions[transaction.id]?.length || 0} categories
                                </span>
                              ) : (
                                <span>{transaction.category?.name || 'Uncategorized'}</span>
                              )}
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
                            {categories.length > 0 && !transaction.is_split && (
                              <DropdownMenuItem onClick={() => handleStartEdit(transaction)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Change Category
                              </DropdownMenuItem>
                            )}
                            {!transaction.is_split && categories.length > 0 && (
                              <DropdownMenuItem onClick={() => handleOpenSplitDialog(transaction)}>
                                <Split className="mr-2 h-4 w-4" />
                                Split Transaction
                              </DropdownMenuItem>
                            )}
                            {transaction.is_split && (
                              <DropdownMenuItem onClick={() => handleUnsplit(transaction.id)}>
                                <X className="mr-2 h-4 w-4" />
                                Unsplit
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

                    {/* Split children */}
                    {transaction.is_split && expandedTransactions.has(transaction.id) && (
                      <div className="bg-muted/30">
                        {(childTransactions[transaction.id] || []).map((child) => (
                          <div
                            key={child.id}
                            className="flex items-center justify-between p-4 pl-16 border-t"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ 
                                  backgroundColor: child.category?.color 
                                    ? `${child.category.color}20` 
                                    : '#94a3b820'
                                }}
                              >
                                {(() => {
                                  const IconComponent = getCategoryIcon(child.category?.icon || null, child.category?.name);
                                  return <IconComponent className="w-4 h-4" style={{ color: child.category?.color || '#8a8279' }} />;
                                })()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-muted-foreground">
                                  {child.category?.name || 'Uncategorized'}
                                </p>
                                {child.memo && child.memo !== transaction.memo && (
                                  <p className="text-xs text-muted-foreground">{child.memo}</p>
                                )}
                              </div>
                            </div>
                            <span className="font-medium text-sm tabular-nums">
                              {formatAmount(child.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
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

      {/* Split Transaction Dialog */}
      <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-teal-500/20">
          <DialogHeader>
            <DialogTitle className="text-xl">Split Transaction</DialogTitle>
            <DialogDescription>
              Split <span className="font-semibold text-foreground">{splittingTransaction?.payee_clean || splittingTransaction?.payee_original}</span>
              {' '}into multiple categories
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Original amount display */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
              <span className="text-sm font-medium">Original Amount</span>
              <span className="text-lg font-semibold">${originalAmount.toFixed(2)}</span>
            </div>

            {/* Split items */}
            <div className="space-y-3">
              {splitItems.map((item, index) => (
                <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-card border">
                  <div className="flex-1 space-y-2">
                    <Select
                      value={item.category_id}
                      onValueChange={(value) => handleSplitItemChange(index, 'category_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories
                          .filter(c => splittingTransaction && splittingTransaction.amount < 0 ? c.type === 'expense' : c.type === 'income')
                          .map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <span className="flex items-center gap-2">
                                {(() => {
                                  const Icon = getCategoryIcon(cat.icon, cat.name);
                                  return <Icon className="w-4 h-4" />;
                                })()}
                                <span>{cat.name}</span>
                              </span>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Amount"
                        value={item.amount || ''}
                        onChange={(e) => handleSplitItemChange(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-32"
                      />
                      <Input
                        type="text"
                        placeholder="Notes (optional)"
                        value={item.notes}
                        onChange={(e) => handleSplitItemChange(index, 'notes', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {splitItems.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSplitItem(index)}
                      className="h-8 w-8 mt-1"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Add split button */}
            <Button
              variant="outline"
              onClick={handleAddSplitItem}
              className="w-full border-dashed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Split
            </Button>

            {/* Remaining amount */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <span className="text-sm font-medium">
                {remaining >= 0 ? 'Remaining' : 'Over by'}
              </span>
              <span className={`text-lg font-semibold ${remaining < -0.01 ? 'text-red-500' : remaining > 0.01 ? 'text-amber-500' : 'text-green-500'}`}>
                ${Math.abs(remaining).toFixed(2)}
              </span>
            </div>

            {remaining > 0.01 && (
              <Button
                variant="outline"
                onClick={handleAutoFillLast}
                className="w-full"
              >
                Auto-fill Last Split
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSplitDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitSplit}
              disabled={Math.abs(remaining) > 0.01 || splitItems.some(item => !item.category_id || item.amount <= 0)}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Split Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
