'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Upload, Loader2, Check, AlertCircle, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { DEBT_TYPE_LABELS, type DebtType } from '@/types/database';

interface ScannedDebt {
  name: string;
  type: DebtType;
  current_balance: number;
  original_balance: number | null;
  apr: number | null;
  minimum_payment: number | null;
  monthly_payment: number | null;
  due_day: number | null;
  in_collections: boolean;
  confidence: number;
}

export function ScanStatementDialog() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scannedDebts, setScannedDebts] = useState<ScannedDebt[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{ model?: string; estimatedCost?: number } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large. Max 10MB.');
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPreview(base64);
      await scanImage(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const scanImage = async (imageData: string, mimeType: string) => {
    setScanning(true);
    setError('');
    setScannedDebts([]);

    try {
      const response = await fetch('/api/ai/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, mimeType }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error || 'Scan failed. Try a clearer image.');
        return;
      }

      setScannedDebts(result.data);
      setScanResult({ model: result.model, estimatedCost: result.estimatedCost });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const saveDebts = async () => {
    if (scannedDebts.length === 0) return;
    setSaving(true);
    setError('');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const debt of scannedDebts) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await (supabase.from as any)('debts').insert({
          user_id: user.id,
          name: debt.name || 'Scanned Debt',
          type: debt.type || 'other',
          current_balance: debt.current_balance || 0,
          original_balance: debt.original_balance,
          apr: debt.apr || 0,
          minimum_payment: debt.minimum_payment || 0,
          monthly_payment: debt.monthly_payment || 0,
          due_day: debt.due_day,
          in_collections: debt.in_collections || false,
        });
        if (insertError) throw insertError;
      }

      setOpen(false);
      setScannedDebts([]);
      setPreview(null);
      setScanResult(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setScannedDebts([]);
    setPreview(null);
    setError('');
    setScanResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button className="shimmer-btn-outline border-0 px-4 py-2 rounded-lg gap-2">
          <Camera className="h-4 w-4" />
          Scan Statement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-background border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scan a Statement</DialogTitle>
          <DialogDescription>
            Upload a photo of your debt statement and AI will extract the details automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Upload area */}
        {!scanning && scannedDebts.length === 0 && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-[#1a7a6d80] hover:bg-[#1a7a6d0d] transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="Statement preview" className="max-h-48 mx-auto rounded-lg mb-3" />
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium">Upload statement image</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Credit card, loan, or bill statement — JPG, PNG up to 10MB
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
            <p className="font-medium">Reading your statement...</p>
            <p className="text-sm text-muted-foreground mt-1">AI is extracting debt details</p>
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
        {scannedDebts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#7aba5c]">
              <Check className="h-5 w-5" />
              <span className="font-medium">Found {scannedDebts.length} debt{scannedDebts.length > 1 ? 's' : ''}!</span>
            </div>

            {scannedDebts.map((debt, i) => (
              <div key={i} className="rounded-lg bg-secondary/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#1a7a6d]" />
                    <span className="font-semibold">{debt.name || 'Unknown'}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round((debt.confidence || 0) * 100)}% confident
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type: </span>
                    <span>{DEBT_TYPE_LABELS[debt.type] || debt.type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Balance: </span>
                    <span className="font-medium">${debt.current_balance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '?'}</span>
                  </div>
                  {debt.apr != null && (
                    <div>
                      <span className="text-muted-foreground">APR: </span>
                      <span>{debt.apr}%</span>
                    </div>
                  )}
                  {debt.minimum_payment != null && (
                    <div>
                      <span className="text-muted-foreground">Min Payment: </span>
                      <span>${debt.minimum_payment}</span>
                    </div>
                  )}
                  {debt.due_day != null && (
                    <div>
                      <span className="text-muted-foreground">Due Day: </span>
                      <span>{debt.due_day}th</span>
                    </div>
                  )}
                  {debt.in_collections && (
                    <div className="text-red-400 col-span-2 flex items-center gap-1"><AlertTriangle className="w-4 h-4 inline" /> In Collections</div>
                  )}
                </div>
              </div>
            ))}

            {scanResult && (
              <p className="text-xs text-muted-foreground">
                Scanned with {scanResult.model} · Cost: ~${scanResult.estimatedCost?.toFixed(4) || '?'}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={reset} className="flex-1">
                Scan Another
              </Button>
              <Button
                onClick={saveDebts}
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
                    <Check className="mr-2 h-4 w-4" />
                    Save {scannedDebts.length > 1 ? 'All' : 'Debt'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
