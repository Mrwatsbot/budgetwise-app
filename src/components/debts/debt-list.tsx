'use client';

import { useState } from 'react';
import { 
  CreditCard, 
  TrendingDown, 
  ChevronDown, 
  ChevronUp, 
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { deleteDebt } from '@/lib/hooks/use-data';
import { LogPaymentDialog } from './log-payment-dialog';
import { EditDebtDialog } from './edit-debt-dialog';
import { getAmortizationHealth } from '@/lib/amortization';
import { getDebtBarColor } from '@/lib/bar-colors';
import { DEBT_TYPE_LABELS, type Debt, type DebtPayment } from '@/types/database';

interface DebtWithPayments extends Debt {
  recent_payments?: DebtPayment[];
}

interface DebtListProps {
  debts: DebtWithPayments[];
}

// Debt type risk colors
const typeColors: Record<string, string> = {
  payday: 'text-red-400 bg-red-400/10',
  credit_card: 'text-teal-400 bg-teal-400/10',
  bnpl: 'text-teal-400 bg-teal-400/10',
  personal: 'text-yellow-400 bg-yellow-400/10',
  auto: 'text-blue-400 bg-blue-400/10',
  student: 'text-blue-400 bg-blue-400/10',
  medical: 'text-[#1a7a6d] bg-purple-400/10',
  business: 'text-[#22a090] bg-cyan-400/10',
  heloc: 'text-[#7aba5c] bg-[#7aba5c]/10',
  mortgage: 'text-[#7aba5c] bg-[#7aba5c]/10',
  zero_pct: 'text-emerald-400 bg-emerald-400/10',
  cc_paid_monthly: 'text-emerald-400 bg-emerald-400/10',
  secured: 'text-emerald-400 bg-emerald-400/10',
  other: 'text-gray-400 bg-gray-400/10',
};

function DebtCard({ debt }: { debt: DebtWithPayments }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const payoffPercent = debt.original_balance 
    ? Math.max(0, Math.min(100, ((debt.original_balance - debt.current_balance) / debt.original_balance) * 100))
    : 0;

  const monthsToPayoff = debt.monthly_payment && debt.monthly_payment > 0
    ? Math.ceil(debt.current_balance / debt.monthly_payment)
    : null;

  // Amortization health — determines progress bar color position
  const health = (debt.origination_date && debt.term_months && debt.original_balance && debt.original_balance > 0)
    ? getAmortizationHealth({
        original_balance: debt.original_balance,
        current_balance: debt.current_balance,
        apr: debt.apr,
        term_months: debt.term_months,
        origination_date: debt.origination_date,
      })
    : null;

  const barColor = getDebtBarColor(health?.monthsAhead ?? null, payoffPercent);

  // Status label text
  const healthLabel = health ? (() => {
    const abs = Math.abs(Math.round(health.monthsAhead));
    if (health.status === 'ahead') return `${abs} mo ahead`;
    if (health.status === 'behind') return `${abs} mo behind`;
    return 'On track';
  })() : null;

  const handleDelete = async () => {
    if (!confirm(`Delete "${debt.name}"? This will also remove all payment history.`)) return;
    setDeleting(true);
    try {
      await deleteDebt(debt.id);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <Card className={cn(
      'transition-all',
      debt.is_paid_off && 'opacity-60',
      debt.in_collections && 'border-red-500/30'
    )}>
      <CardContent className="p-4">
        {/* Main row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{debt.name}</h3>
              <Badge variant="secondary" className={cn('text-xs', typeColors[debt.type] || typeColors.other)}>
                {DEBT_TYPE_LABELS[debt.type] || debt.type}
              </Badge>
              {debt.in_collections && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Collections
                </Badge>
              )}
              {debt.is_paid_off && (
                <Badge className="text-xs bg-[#6db555]/20 text-[#7aba5c] gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Paid Off
                </Badge>
              )}
            </div>

            {/* Balance + APR */}
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-2xl font-display font-bold">
                ${debt.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              {debt.apr > 0 && (
                <span className="text-sm text-muted-foreground">{debt.apr}% APR</span>
              )}
            </div>

            {/* Progress bar */}
            {debt.original_balance && debt.original_balance > 0 && !debt.is_paid_off && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{payoffPercent.toFixed(0)}% paid off</span>
                  <span>
                    ${(debt.original_balance - debt.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} of ${debt.original_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-border/10 overflow-hidden progress-bar-container">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${payoffPercent}%`,
                      background: barColor,
                      boxShadow: `0 0 8px ${barColor}40`,
                    }}
                  />
                </div>
                {healthLabel && (
                  <div className="flex justify-end mt-1">
                    <span
                      className="text-xs font-medium"
                      style={{ color: barColor }}
                    >
                      {healthLabel}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Quick stats */}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
              {debt.monthly_payment > 0 && (
                <span>Paying: ${debt.monthly_payment}/mo</span>
              )}
              {debt.minimum_payment > 0 && debt.monthly_payment !== debt.minimum_payment && (
                <span>Min: ${debt.minimum_payment}/mo</span>
              )}
              {debt.due_day && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Due: {debt.due_day}{getOrdinal(debt.due_day)}
                </span>
              )}
              {monthsToPayoff && !debt.is_paid_off && (
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  ~{monthsToPayoff} months left
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {!debt.is_paid_off && (
              <LogPaymentDialog debt={debt} />
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground min-h-[44px] min-w-[44px] px-2"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Expanded: Recent payments */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Recent Payments</h4>
              <div className="flex items-center gap-1">
                <EditDebtDialog debt={debt} />
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10 min-h-[44px] min-w-[44px] gap-1.5 px-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
            
            {debt.recent_payments && debt.recent_payments.length > 0 ? (
              <div className="space-y-2">
                {debt.recent_payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {new Date(payment.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {payment.is_extra && (
                        <Badge variant="secondary" className="text-xs text-[#7aba5c] bg-[#7aba5c]/10">Extra</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#7aba5c] font-medium">
                        -${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      {payment.balance_after !== null && (
                        <span className="text-xs text-muted-foreground">
                          → ${payment.balance_after.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No payments logged yet</p>
            )}

            {debt.notes && (
              <div className="text-sm text-muted-foreground bg-secondary/30 rounded-lg p-2 mt-2">
                {debt.notes}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export function DebtList({ debts }: DebtListProps) {
  const activeDebts = debts.filter(d => !d.is_paid_off);
  const paidOffDebts = debts.filter(d => d.is_paid_off);

  const totalDebt = activeDebts.reduce((sum, d) => sum + d.current_balance, 0);
  const totalMonthly = activeDebts.reduce((sum, d) => sum + (d.monthly_payment || 0), 0);
  const highestApr = activeDebts.length > 0
    ? Math.max(...activeDebts.map(d => d.apr || 0))
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {activeDebts.length > 0 && (
        <div className="grid gap-3 grid-cols-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Debt</p>
              <p className="text-lg font-display font-bold text-red-400">
                ${totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Monthly Payments</p>
              <p className="text-lg font-display font-bold">
                ${totalMonthly.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Highest APR</p>
              <p className="text-lg font-display font-bold text-teal-400">
                {highestApr > 0 ? `${highestApr}%` : '—'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active debts */}
      {activeDebts.length > 0 ? (
        <div className="space-y-3">
          {activeDebts
            .sort((a, b) => (b.apr || 0) - (a.apr || 0)) // Highest APR first
            .map((debt) => (
              <DebtCard key={debt.id} debt={debt} />
            ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">
              {paidOffDebts.length > 0 ? 'All debts paid off!' : 'No debts tracked yet'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {paidOffDebts.length > 0
                ? 'You crushed it! All your tracked debts are paid off.'
                : 'Add your debts to track payoff progress and boost your Financial Health Score.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Paid off debts */}
      {paidOffDebts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#7aba5c]" />
            Paid Off ({paidOffDebts.length})
          </h3>
          {paidOffDebts.map((debt) => (
            <DebtCard key={debt.id} debt={debt} />
          ))}
        </div>
      )}
    </div>
  );
}
