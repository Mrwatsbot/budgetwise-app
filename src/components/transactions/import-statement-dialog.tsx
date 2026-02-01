'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Upload, Loader2, Check, X, Camera } from 'lucide-react';
import { getCategoryIcon } from '@/lib/category-icons';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

interface ParsedTransaction {
  date: string;
  amount: number;
  merchant: string;
  category_id: string | null;
  category_name: string;
  confidence: number;
  selected?: boolean;
}

interface ImportStatementDialogProps {
  categories: Category[];
  onRefresh: () => void;
}

export function ImportStatementDialog({ categories, onRefresh }: ImportStatementDialogProps) {
  const [open, setOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [importing, setImporting] = useState(false);

  const expenseCategories = categories.filter(c => c);

  const handleCSVFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setCsvText(text);
  };

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result?.toString().split(',')[1];
        if (!base64) {
          toast.error('Failed to read file');
          return;
        }

        await processStatement({ pdfBase64: base64 });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload file');
      setUploading(false);
    }
  };

  const handleCSVProcess = async () => {
    if (!csvText.trim()) {
      toast.error('Please paste or upload CSV text');
      return;
    }
    await processStatement({ csvText });
  };

  const processStatement = async (payload: { csvText?: string; pdfBase64?: string; imageBase64?: string }) => {
    setUploading(true);
    try {
      const res = await fetch('/api/ai/import-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to process statement');
      }

      const data = await res.json();
      
      // Mark all as selected by default
      const parsedTransactions = (data.transactions || []).map((t: ParsedTransaction) => ({
        ...t,
        selected: true,
      }));

      setTransactions(parsedTransactions);
      toast.success(`Found ${parsedTransactions.length} transactions!`);
    } catch (error: any) {
      console.error('Process error:', error);
      toast.error(error.message || 'Failed to process statement');
    } finally {
      setUploading(false);
    }
  };

  const handleImportSelected = async () => {
    const selectedTransactions = transactions.filter(t => t.selected);
    
    if (selectedTransactions.length === 0) {
      toast.error('No transactions selected');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: selectedTransactions }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to import transactions');
      }

      const data = await res.json();
      toast.success(`Imported ${data.count} transactions!`);
      
      // Reset state
      setTransactions([]);
      setCsvText('');
      setOpen(false);
      onRefresh();
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import transactions');
    } finally {
      setImporting(false);
    }
  };

  const toggleTransaction = (index: number) => {
    setTransactions(prev => prev.map((t, i) => 
      i === index ? { ...t, selected: !t.selected } : t
    ));
  };

  const toggleAll = () => {
    const allSelected = transactions.every(t => t.selected);
    setTransactions(prev => prev.map(t => ({ ...t, selected: !allSelected })));
  };

  const updateCategory = (index: number, categoryId: string) => {
    const category = expenseCategories.find(c => c.id === categoryId);
    setTransactions(prev => prev.map((t, i) => 
      i === index ? { 
        ...t, 
        category_id: categoryId,
        category_name: category?.name || 'Unknown'
      } : t
    ));
  };

  const selectedCount = transactions.filter(t => t.selected).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-border">
          <FileText className="mr-2 h-4 w-4" />
          Import Statement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Bank Statement</DialogTitle>
          <DialogDescription>
            Upload a CSV file, PDF, or photo of your bank statement. AI will extract and categorize transactions.
          </DialogDescription>
        </DialogHeader>

        {transactions.length === 0 ? (
          <Tabs defaultValue="csv" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="csv">CSV Upload</TabsTrigger>
              <TabsTrigger value="pdf">PDF / Photo</TabsTrigger>
            </TabsList>

            <TabsContent value="csv" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Upload CSV File</label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVFileUpload}
                  className="cursor-pointer"
                />
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or paste CSV text</span>
                </div>
              </div>

              <Textarea
                placeholder="Date,Description,Amount&#10;2024-01-15,Starbucks,-5.50&#10;2024-01-16,Paycheck,2500.00"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={8}
                className="font-mono text-xs"
              />

              <Button
                onClick={handleCSVProcess}
                disabled={uploading || !csvText.trim()}
                className="w-full gradient-btn border-0"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Process CSV
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="pdf" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Upload PDF or Image</label>
                <Input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handlePDFUpload}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Supported: PDF, JPG, PNG. AI will extract transactions from the document.
                </p>
              </div>

              {uploading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {transactions.length} transactions found, {selectedCount} selected
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAll}
                >
                  {transactions.every(t => t.selected) ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTransactions([])}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>

            <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
              {transactions.map((transaction, index) => (
                <div key={index} className="p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={transaction.selected}
                      onCheckedChange={() => toggleTransaction(index)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{transaction.merchant}</div>
                          <div className="text-xs text-muted-foreground">{transaction.date}</div>
                        </div>
                        <div className={`font-semibold whitespace-nowrap ${transaction.amount > 0 ? 'text-green-600' : ''}`}>
                          {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={transaction.category_id || undefined}
                          onValueChange={(value) => updateCategory(index, value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {expenseCategories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                <span className="flex items-center gap-2">
                                  {(() => {
                                    const Icon = getCategoryIcon(cat.icon || null, cat.name);
                                    return <Icon className="w-3.5 h-3.5 text-muted-foreground" />;
                                  })()}
                                  <span>{cat.name}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {transaction.confidence && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {Math.round(transaction.confidence * 100)}% confident
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleImportSelected}
              disabled={importing || selectedCount === 0}
              className="w-full gradient-btn border-0"
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Import {selectedCount} Transaction{selectedCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
