'use client';

import { useState, useRef } from 'react';
import {
  ShoppingBag,
  CreditCard,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Lightbulb,
  TrendingDown,
  Loader2,
  Lock,
  DollarSign,
  Gauge,
  Camera,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { checkAffordability, applyAutoBudget, useAILimits } from '@/lib/hooks/use-data';
import { useIsDemo } from '@/lib/demo-mode';
import { getDemoAffordResponse } from '@/lib/demo-ai-responses';

// ============================================================
// TYPES
// ============================================================

interface AdjustedBudgetItem {
  category: string;
  current: number;
  adjusted: number;
  change: number;
  duration_months: number;
  reason: string;
}

interface AffordResult {
  verdict: 'yes' | 'stretch' | 'no';
  confidence: number;
  reasoning: string;
  impact: {
    monthly_cost: number;
    budget_category: string;
    current_budget: number;
    current_spent: number;
    remaining_after: number;
  };
  adjusted_budget: AdjustedBudgetItem[] | null;
  alternatives: string[];
  score_impact: string;
}

interface AffordCheckDialogProps {
  currentMonth: string;
  onBudgetAdjusted?: () => void;
}

const CATEGORIES = [
  'Electronics', 'Clothing', 'Furniture', 'Vehicle', 'Home Improvement',
  'Travel', 'Education', 'Health', 'Entertainment', 'Other',
];

const TERM_OPTIONS = [6, 12, 18, 24, 36, 48, 60];

// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const verdictConfig = {
  yes: {
    icon: CheckCircle,
    color: 'text-[#7aba5c]',
    bg: 'bg-[#6db555]/10',
    border: 'border-[#6db555]/30',
    label: 'You can afford this!',
  },
  stretch: {
    icon: AlertTriangle,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    label: "It's a stretch, but doable",
  },
  no: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    label: 'This would strain your budget',
  },
};

// ============================================================
// COMPONENT
// ============================================================

export function AffordCheckDialog({ currentMonth, onBudgetAdjusted }: AffordCheckDialogProps) {
  const isDemo = useIsDemo();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applyingAdj, setApplyingAdj] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AffordResult | null>(null);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  // Form state
  const [itemDescription, setItemDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [paymentType, setPaymentType] = useState<'cash' | 'finance'>('cash');
  const [financeMonthly, setFinanceMonthly] = useState('');
  const [financeTerm, setFinanceTerm] = useState('');
  const [financeApr, setFinanceApr] = useState('');

  // Product scanner state
  const productFileRef = useRef<HTMLInputElement>(null);
  const [productScanning, setProductScanning] = useState(false);
  const [productScanResult, setProductScanResult] = useState<{
    product_name: string;
    estimated_price: number;
    confidence: number;
    category: string;
    price_source: 'visible_price' | 'estimated' | 'recognized_product';
    notes: string;
  } | null>(null);
  const [productScanError, setProductScanError] = useState<string | null>(null);

  const { tier, features, refresh: refreshLimits } = useAILimits();
  const isFree = tier === 'free' || tier === 'basic';
  const affordLimits = features?.afford_check;
  const isUnlimited = affordLimits?.limit === -1;
  const remainingUses = affordLimits?.remaining ?? 0;
  const totalLimit = affordLimits?.limit ?? 0;

  const handleProductFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProductScanError('Please upload an image file (JPG, PNG, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setProductScanError('Image too large. Max 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      await scanProduct(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const scanProduct = async (imageData: string, mimeType: string) => {
    setProductScanning(true);
    setProductScanError(null);
    setProductScanResult(null);

    try {
      const response = await fetch('/api/ai/product-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, mimeType }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setProductScanError(result.error || result.message || 'Could not identify product');
        return;
      }

      const data = result.data;
      setProductScanResult(data);

      // Auto-fill the form
      if (data.product_name) setItemDescription(data.product_name);
      if (data.estimated_price) setPrice(String(data.estimated_price));
      if (data.category) setCategory(data.category);

      refreshLimits();
    } catch (err) {
      setProductScanError(err instanceof Error ? err.message : 'Product scan failed');
    } finally {
      setProductScanning(false);
    }
  };

  const resetForm = () => {
    setItemDescription('');
    setCategory('');
    setPrice('');
    setPaymentType('cash');
    setFinanceMonthly('');
    setFinanceTerm('');
    setFinanceApr('');
    setResult(null);
    setError(null);
    setRateLimitMessage(null);
    setProductScanResult(null);
    setProductScanError(null);
    if (productFileRef.current) productFileRef.current.value = '';
  };

  const handleCheck = async () => {
    if (!itemDescription.trim() || !price || parseFloat(price) <= 0) {
      setError('Please fill in the item and price');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setRateLimitMessage(null);

    try {
      // DEMO MODE: Use mock response instead of API
      if (isDemo) {
        // Simulate loading delay for realism
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Determine response based on price
        const priceNum = parseFloat(price);
        let demoScenario: 'affordable' | 'stretch' | 'notAffordable';
        
        if (priceNum < 100) {
          demoScenario = 'affordable';
        } else if (priceNum < 300) {
          demoScenario = 'stretch';
        } else {
          demoScenario = 'notAffordable';
        }
        
        const mockResponse = getDemoAffordResponse(demoScenario);
        setResult(mockResponse);
        setLoading(false);
        return;
      }

      // REAL MODE: Call API
      const response = await checkAffordability({
        item_description: itemDescription.trim(),
        category: category || 'Other',
        price: parseFloat(price),
        payment_type: paymentType,
        ...(paymentType === 'finance' && {
          finance_monthly: financeMonthly ? parseFloat(financeMonthly) : undefined,
          finance_term_months: financeTerm ? parseInt(financeTerm) : undefined,
          finance_apr: financeApr ? parseFloat(financeApr) : undefined,
        }),
      });

      if (response.result) {
        setResult(response.result);
        refreshLimits();
      } else {
        setError(response.error || 'Failed to analyze purchase');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('429')) {
        setRateLimitMessage('You\'ve used all your affordability checks for this week. Upgrade to Pro for unlimited access.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to check affordability');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAdjustments = async () => {
    if (!result?.adjusted_budget) return;
    setApplyingAdj(true);
    setError(null);

    try {
      // The adjusted_budget has category names, not IDs. 
      // We'll pass the adjustments through the auto-budget PUT endpoint.
      // For now, this is a simplified approach — real implementation would map names to IDs.
      const allocations = result.adjusted_budget.map((adj) => ({
        category_id: adj.category, // Note: route would need to resolve names
        amount: adj.adjusted,
      }));

      await applyAutoBudget(allocations, currentMonth);
      onBudgetAdjusted?.();
      setOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply budget adjustments');
    } finally {
      setApplyingAdj(false);
    }
  };

  const vConfig = result ? verdictConfig[result.verdict] : null;
  const VerdictIcon = vConfig?.icon || CheckCircle;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="shimmer-btn-outline border-0 px-4 py-2 rounded-lg">
          <ShoppingBag className="w-4 h-4 mr-2" />
          Can I Afford This?
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-background border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#1a7a6d]" />
            Can I Afford This?
          </DialogTitle>
          <DialogDescription>
            Check if a purchase fits your budget before you buy
          </DialogDescription>
        </DialogHeader>

        {/* Tier gate for free users */}
        {isFree ? (
          <div className="relative">
            <div className="blur-sm select-none pointer-events-none space-y-4 py-4">
              <div className="h-10 bg-muted/30 rounded-lg" />
              <div className="h-10 bg-muted/30 rounded-lg" />
              <div className="h-10 bg-muted/30 rounded-lg" />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg">
              <Lock className="w-8 h-8 text-[#1a7a6d] mb-3" />
              <p className="text-sm font-semibold mb-1">Unlock Affordability Check</p>
              <p className="text-xs text-muted-foreground mb-3">Upgrade to Plus for AI-powered purchase analysis</p>
              <Button size="sm" className="gradient-btn border-0" asChild>
                <a href="/settings">
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  Upgrade to Plus
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Rate limit message */}
            {rateLimitMessage && (
              <div className="text-center py-6">
                <Gauge className="w-8 h-8 text-teal-400 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">{rateLimitMessage}</p>
                <Button size="sm" className="gradient-btn border-0" asChild>
                  <a href="/settings">
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    Upgrade to Pro
                  </a>
                </Button>
              </div>
            )}

            {/* Input Form */}
            {!result && !rateLimitMessage && (
              <div className="space-y-4">
                {/* Product Scanner */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => productFileRef.current?.click()}
                    disabled={productScanning}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border hover:border-[#1a7a6d80] hover:bg-[#1a7a6d0d] transition-all text-sm text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {productScanning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#1a7a6d]" />
                        <span className="text-[#1a7a6d] font-medium">Identifying product...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>Snap a photo to auto-fill</span>
                      </>
                    )}
                  </button>
                  <input
                    ref={productFileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleProductFileSelect}
                  />

                  {/* AI identified badge */}
                  {productScanResult && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a7a6d1a] border border-[#1a7a6d4d]">
                      <Sparkles className="w-3.5 h-3.5 text-[#1a7a6d] flex-shrink-0" />
                      <span className="text-xs text-[#22a090]">
                        {productScanResult.price_source === 'visible_price'
                          ? `Price tag detected - ${Math.round(productScanResult.confidence * 100)}% confident`
                          : productScanResult.price_source === 'recognized_product'
                          ? `Recognized product - ${Math.round(productScanResult.confidence * 100)}% confident`
                          : `Estimated from photo - ${Math.round(productScanResult.confidence * 100)}% confident`}
                      </span>
                    </div>
                  )}

                  {productScanError && (
                    <div className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{productScanError}</div>
                  )}
                </div>

                {error && (
                  <div className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="afford-item">What do you want to buy?</Label>
                  <Input
                    id="afford-item"
                    placeholder="e.g. MacBook Pro, Winter Jacket"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="afford-price">Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        id="afford-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Type */}
                <div className="space-y-2">
                  <Label>Payment Type</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentType('cash')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        paymentType === 'cash'
                          ? 'border-[#1a7a6d80] bg-[#1a7a6d1a] text-[#1a7a6d]'
                          : 'border-border bg-muted/10 text-muted-foreground hover:bg-muted/20'
                      }`}
                    >
                      <DollarSign className="w-4 h-4" />
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType('finance')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        paymentType === 'finance'
                          ? 'border-[#1a7a6d80] bg-[#1a7a6d1a] text-[#1a7a6d]'
                          : 'border-border bg-muted/10 text-muted-foreground hover:bg-muted/20'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      Finance
                    </button>
                  </div>
                </div>

                {/* Finance details */}
                {paymentType === 'finance' && (
                  <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/10 border border-border">
                    <div className="space-y-1.5">
                      <Label htmlFor="afford-monthly" className="text-xs">Monthly</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                        <Input
                          id="afford-monthly"
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={financeMonthly}
                          onChange={(e) => setFinanceMonthly(e.target.value)}
                          className="pl-5 h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Term</Label>
                      <Select value={financeTerm} onValueChange={setFinanceTerm}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Months" />
                        </SelectTrigger>
                        <SelectContent>
                          {TERM_OPTIONS.map((t) => (
                            <SelectItem key={t} value={String(t)}>{t} mo</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="afford-apr" className="text-xs">APR %</Label>
                      <Input
                        id="afford-apr"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="0"
                        value={financeApr}
                        onChange={(e) => setFinanceApr(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                )}

                {!isUnlimited && totalLimit > 0 && (
                  <p className="text-xs text-muted-foreground/70 text-center">
                    {remainingUses} of {totalLimit} checks remaining this week
                  </p>
                )}

                <Button
                  onClick={handleCheck}
                  disabled={loading || (!isUnlimited && remainingUses <= 0)}
                  className="w-full gradient-btn border-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Check Affordability
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Results */}
            {result && vConfig && (
              <div className="space-y-4">
                {/* Verdict */}
                <div className={`flex flex-col items-center text-center p-5 rounded-xl border ${vConfig.bg} ${vConfig.border}`}>
                  <VerdictIcon className={`w-12 h-12 ${vConfig.color} mb-2`} />
                  <p className={`text-lg font-semibold ${vConfig.color}`}>{vConfig.label}</p>
                </div>

                {/* Reasoning */}
                <p className="text-sm text-muted-foreground leading-relaxed">{result.reasoning}</p>

                {/* Budget Impact */}
                {result.impact && (
                  <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Budget Impact
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Category</p>
                        <p className="font-medium">{result.impact.budget_category}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Monthly Cost</p>
                        <p className="font-medium">{formatCurrency(result.impact.monthly_cost)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Budget / Spent</p>
                        <p className="font-medium">
                          {formatCurrency(result.impact.current_budget)} / {formatCurrency(result.impact.current_spent)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Remaining After</p>
                        <p className={`font-medium ${result.impact.remaining_after < 0 ? 'text-red-400' : 'text-[#7aba5c]'}`}>
                          {formatCurrency(result.impact.remaining_after)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Adjusted Budget */}
                {result.adjusted_budget && result.adjusted_budget.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Suggested Budget Adjustments
                    </h4>
                    <div className="space-y-1.5">
                      {result.adjusted_budget.map((adj, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{adj.category}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {adj.reason} ({adj.duration_months} mo)
                            </p>
                          </div>
                          <div className="text-right ml-3 flex-shrink-0">
                            <p className="text-sm">
                              <span className="text-muted-foreground">{formatCurrency(adj.current)}</span>
                              {' → '}
                              <span className="font-medium">{formatCurrency(adj.adjusted)}</span>
                            </p>
                            <p className={`text-xs ${adj.change < 0 ? 'text-red-400' : 'text-[#7aba5c]'}`}>
                              {adj.change > 0 ? '+' : ''}{formatCurrency(adj.change)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alternatives */}
                {result.alternatives && result.alternatives.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5" />
                      Alternatives
                    </h4>
                    <div className="space-y-1.5">
                      {result.alternatives.map((alt, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/20">
                          <Lightbulb className="w-3.5 h-3.5 text-teal-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-muted-foreground">{alt}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Score Impact */}
                {result.score_impact && (
                  <p className="text-xs text-muted-foreground italic p-2 rounded-lg bg-muted/10">
                    {result.score_impact}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => { setResult(null); setError(null); }}
                    className="flex-1"
                  >
                    Check Another
                  </Button>
                  {result.adjusted_budget && result.adjusted_budget.length > 0 && (result.verdict === 'yes' || result.verdict === 'stretch') && !isDemo && (
                    <Button
                      onClick={handleApplyAdjustments}
                      disabled={applyingAdj}
                      className="flex-1 gradient-btn border-0"
                    >
                      {applyingAdj ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Apply Adjusted Budget
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Disclaimer */}
                <p className="text-[10px] text-muted-foreground/50 text-center">
                  For informational purposes only. Not financial advice.
                </p>

                {/* Demo Mode CTA */}
                {isDemo && (
                  <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-[#1a7a6d1a] to-[#146b5f1a] border border-[#1a7a6d4d]">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-[#1a7a6d] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold mb-1">Get Personalized Insights</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          This is a demo using sample data. Sign up to check affordability based on YOUR actual budget and spending.
                        </p>
                        <Button size="sm" className="gradient-btn border-0" asChild>
                          <a href="/signup">
                            Sign Up Free
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Loading state for results */}
            {loading && !result && (
              <div className="text-center py-10">
                <Loader2 className="w-8 h-8 text-[#1a7a6d] animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium">Analyzing your purchase...</p>
                <p className="text-xs text-muted-foreground mt-1">Checking against your budget and spending</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
