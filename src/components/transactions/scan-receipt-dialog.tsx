'use client';

import { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Loader2,
  Check,
  AlertCircle,
  Lock,
  Sparkles,
  Receipt,
  Plus,
  ListPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAILimits } from '@/lib/hooks/use-data';

// ============================================================
// TYPES
// ============================================================

interface ReceiptItem {
  description: string;
  amount: number;
  quantity: number;
}

interface ReceiptData {
  merchant: string;
  date: string;
  total: number;
  subtotal: number | null;
  tax: number | null;
  tip: number | null;
  payment_method: 'cash' | 'credit' | 'debit' | 'other';
  items: ReceiptItem[];
  suggested_category: string;
  confidence: number;
}

interface ScanReceiptDialogProps {
  categories: { id: string; name: string }[];
  accounts: { id: string; name: string; type: string }[];
  userId: string;
  onRefresh: () => void;
}

// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

// ============================================================
// COMPONENT
// ============================================================

export function ScanReceiptDialog({ categories, accounts, userId, onRefresh }: ScanReceiptDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{ model?: string; estimatedCost?: number } | null>(null);

  const { tier } = useAILimits();
  const isFree = tier === 'free' || tier === 'basic';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large. Max 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPreview(base64);
      await scanReceipt(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const scanReceipt = async (imageData: string, mimeType: string) => {
    setScanning(true);
    setError('');
    setReceiptData(null);

    try {
      const response = await fetch('/api/ai/receipt-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, mimeType }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error || result.message || 'Scan failed. Try a clearer image.');
        return;
      }

      setReceiptData(result.data);
      setScanResult({ model: result.model, estimatedCost: result.estimatedCost });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const findCategoryId = (suggestedName: string): string | null => {
    if (!categories?.length) return null;
    const lower = suggestedName.toLowerCase();
    const match = categories.find(c => c.name.toLowerCase() === lower);
    if (match) return match.id;
    // Fuzzy match
    const fuzzy = categories.find(c => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase()));
    return fuzzy?.id || null;
  };

  const getDefaultAccount = (): string | null => {
    if (!accounts?.length) return null;
    // Prefer checking account
    const checking = accounts.find(a => a.type === 'checking');
    return checking?.id || accounts[0]?.id || null;
  };

  const addAsTransaction = async () => {
    if (!receiptData || !userId) return;
    setSaving(true);
    setError('');

    try {
      const categoryId = findCategoryId(receiptData.suggested_category);
      const accountId = getDefaultAccount();

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          amount: -Math.abs(receiptData.total),
          description: receiptData.merchant,
          date: receiptData.date || new Date().toISOString().split('T')[0],
          category_id: categoryId,
          account_id: accountId,
          type: 'expense',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add transaction');
      }

      onRefresh();
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const addAllItems = async () => {
    if (!receiptData?.items?.length || !userId) return;
    setSaving(true);
    setError('');

    try {
      const categoryId = findCategoryId(receiptData.suggested_category);
      const accountId = getDefaultAccount();
      const date = receiptData.date || new Date().toISOString().split('T')[0];

      for (const item of receiptData.items) {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            amount: -Math.abs(item.amount),
            description: `${receiptData.merchant} - ${item.description}`,
            date,
            category_id: categoryId,
            account_id: accountId,
            type: 'expense',
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `Failed to add item: ${item.description}`);
        }
      }

      onRefresh();
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transactions');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setReceiptData(null);
    setPreview(null);
    setError('');
    setScanResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="shimmer-btn-outline border-0 px-4 py-2 rounded-lg gap-2">
          <Camera className="h-4 w-4" />
          Scan Receipt
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-background border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#1a7a6d]" />
            Scan a Receipt
          </DialogTitle>
          <DialogDescription>
            Upload a photo of your receipt and AI will extract the transaction details.
          </DialogDescription>
        </DialogHeader>

        {/* Tier gate for free users */}
        {isFree ? (
          <div className="relative">
            <div className="blur-sm select-none pointer-events-none space-y-4 py-4">
              <div className="h-32 bg-muted/30 rounded-lg" />
              <div className="h-10 bg-muted/30 rounded-lg" />
              <div className="h-10 bg-muted/30 rounded-lg" />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg">
              <Lock className="w-8 h-8 text-[#1a7a6d] mb-3" />
              <p className="text-sm font-semibold mb-1">Unlock Receipt Scanner</p>
              <p className="text-xs text-muted-foreground mb-3">Upgrade to Plus for AI-powered receipt scanning</p>
              <Button size="sm" className="gradient-btn border-0" asChild>
                <a href="/settings">
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  Upgrade to Plus
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Upload area */}
            {!scanning && !receiptData && (
              <div className="space-y-4">
                <div
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-[#1a7a6d80] hover:bg-[#1a7a6d0d] transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {preview ? (
                    <img src={preview} alt="Receipt preview" className="max-h-48 mx-auto rounded-lg mb-3" />
                  ) : (
                    <>
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="font-medium">Upload receipt image</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Take a photo or upload — JPG, PNG up to 10MB
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}

            {/* Scanning */}
            {scanning && (
              <div className="py-8 text-center">
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-[#1a7a6d] mb-3" />
                <p className="font-medium">Reading your receipt...</p>
                <p className="text-sm text-muted-foreground mt-1">AI is extracting transaction details</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Results */}
            {receiptData && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#7aba5c]">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Receipt scanned!</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {Math.round((receiptData.confidence || 0) * 100)}% confident
                  </span>
                </div>

                {/* Receipt summary */}
                <div className="rounded-lg bg-secondary/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg">{receiptData.merchant || 'Unknown Merchant'}</p>
                      <p className="text-sm text-muted-foreground">{receiptData.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{formatCurrency(receiptData.total)}</p>
                      {receiptData.suggested_category && (
                        <p className="text-xs text-[#1a7a6d]">{receiptData.suggested_category}</p>
                      )}
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border-t border-border pt-2">
                    {receiptData.subtotal != null && (
                      <span>Subtotal: {formatCurrency(receiptData.subtotal)}</span>
                    )}
                    {receiptData.tax != null && (
                      <span>Tax: {formatCurrency(receiptData.tax)}</span>
                    )}
                    {receiptData.tip != null && receiptData.tip > 0 && (
                      <span>Tip: {formatCurrency(receiptData.tip)}</span>
                    )}
                    {receiptData.payment_method && receiptData.payment_method !== 'other' && (
                      <span className="capitalize">Paid: {receiptData.payment_method}</span>
                    )}
                  </div>
                </div>

                {/* Line items */}
                {receiptData.items && receiptData.items.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Items ({receiptData.items.length})
                    </h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {receiptData.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/20">
                          <div className="min-w-0 flex-1">
                            <span className="truncate block">{item.description}</span>
                            {item.quantity > 1 && (
                              <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                            )}
                          </div>
                          <span className="font-medium ml-3 flex-shrink-0">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {scanResult && (
                  <p className="text-xs text-muted-foreground">
                    Scanned with {scanResult.model} · Cost: ~${scanResult.estimatedCost?.toFixed(4) || '?'}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={reset} className="flex-1">
                    Scan Another
                  </Button>
                  <Button
                    onClick={addAsTransaction}
                    disabled={saving}
                    className="flex-1 gradient-btn border-0"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add as Transaction
                      </>
                    )}
                  </Button>
                </div>

                {receiptData.items && receiptData.items.length > 1 && (
                  <Button
                    variant="outline"
                    onClick={addAllItems}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving items...
                      </>
                    ) : (
                      <>
                        <ListPlus className="mr-2 h-4 w-4" />
                        Add All Items as Separate Transactions
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
