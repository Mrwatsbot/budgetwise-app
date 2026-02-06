'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getScoreColor } from '@/types/credit';

interface AddScoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddScoreDialog({ open, onOpenChange, onSuccess }: AddScoreDialogProps) {
  const [equifax, setEquifax] = useState('');
  const [experian, setExperian] = useState('');
  const [transunion, setTransunion] = useState('');
  const [saving, setSaving] = useState(false);

  const validateScore = (value: string): boolean => {
    if (!value) return true; // Empty is allowed
    const num = parseInt(value);
    return !isNaN(num) && num >= 300 && num <= 850;
  };

  const handleSave = async () => {
    // Validate
    if (!validateScore(equifax) || !validateScore(experian) || !validateScore(transunion)) {
      toast.error('Scores must be between 300 and 850');
      return;
    }

    if (!equifax && !experian && !transunion) {
      toast.error('Enter at least one score');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/credit/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equifax: equifax ? parseInt(equifax) : null,
          experian: experian ? parseInt(experian) : null,
          transunion: transunion ? parseInt(transunion) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save scores');
      }

      toast.success('Credit scores updated!');
      setEquifax('');
      setExperian('');
      setTransunion('');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save scores');
    } finally {
      setSaving(false);
    }
  };

  const getInputStyle = (value: string) => {
    if (!value) return {};
    const num = parseInt(value);
    if (isNaN(num) || num < 300 || num > 850) {
      return { borderColor: '#ef4444' };
    }
    return { borderColor: getScoreColor(num) };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Credit Scores</DialogTitle>
          <DialogDescription>
            Enter your latest scores from each bureau. You can leave any blank if you don&apos;t have it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="equifax" className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Equifax
            </Label>
            <Input
              id="equifax"
              type="number"
              min={300}
              max={850}
              placeholder="e.g. 650"
              value={equifax}
              onChange={(e) => setEquifax(e.target.value)}
              style={getInputStyle(equifax)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experian" className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Experian
            </Label>
            <Input
              id="experian"
              type="number"
              min={300}
              max={850}
              placeholder="e.g. 650"
              value={experian}
              onChange={(e) => setExperian(e.target.value)}
              style={getInputStyle(experian)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transunion" className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              TransUnion
            </Label>
            <Input
              id="transunion"
              type="number"
              min={300}
              max={850}
              placeholder="e.g. 650"
              value={transunion}
              onChange={(e) => setTransunion(e.target.value)}
              style={getInputStyle(transunion)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            💡 Get free scores at{' '}
            <a 
              href="https://www.annualcreditreport.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              annualcreditreport.com
            </a>
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Scores'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
