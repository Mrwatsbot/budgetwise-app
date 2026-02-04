'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Step = 'upload' | 'preview' | 'result';

interface ColumnMap {
  date?: number;
  payee?: number;
  amount?: number;
  category?: number;
  account?: number;
  notes?: number;
  inflow?: number;
  outflow?: number;
}

interface ParsedData {
  format: 'ynab' | 'monarch' | 'mint' | 'auto';
  headers: string[];
  columnMap: ColumnMap;
  sampleRows: Array<Record<string, string>>;
  totalRows: number;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

const formatNames: Record<string, string> = {
  ynab: 'YNAB Export',
  monarch: 'Monarch Money',
  mint: 'Mint',
  auto: 'Generic CSV',
};

export function ImportContent() {
  const [step, setStep] = useState<Step>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (file: File | null) => {
    if (!file) return;

    const validTypes = ['.csv', '.zip', '.tsv', '.txt'];
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(extension)) {
      toast.error('Invalid file type. Please upload a CSV, TSV, or ZIP file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    setSelectedFile(file);
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Parse the uploaded file
  const handleParse = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/import/parse', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to parse file');
      }

      const data: ParsedData = await response.json();
      setParsedData(data);
      setStep('preview');
      toast.success(`Detected ${formatNames[data.format]} format with ${data.totalRows} transactions`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  };

  // Import the transactions
  const handleImport = async () => {
    if (!selectedFile || !parsedData) return;

    setLoading(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      const fileContent = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1]; // Remove data:... prefix
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const response = await fetch('/api/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: fileContent,
          columnMap: parsedData.columnMap,
          format: parsedData.format,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import transactions');
      }

      const result: ImportResult = await response.json();
      setImportResult(result);
      setStep('result');
      
      if (result.imported > 0) {
        toast.success(`Successfully imported ${result.imported} transaction${result.imported > 1 ? 's' : ''}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import transactions');
    } finally {
      setLoading(false);
    }
  };

  // Reset to upload step
  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setParsedData(null);
    setImportResult(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a7a6d] to-[#0f5449] text-white">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Import Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Upload data from YNAB, Monarch Money, Mint, or any bank CSV
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 justify-center">
        <div className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full transition-colors',
          step === 'upload' ? 'bg-[#1a7a6d] text-white' : 'bg-gray-100 dark:bg-gray-800'
        )}>
          <Upload className="h-4 w-4" />
          <span className="text-sm font-medium">Upload</span>
        </div>
        <div className="h-px w-8 bg-gray-300 dark:bg-gray-700" />
        <div className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full transition-colors',
          step === 'preview' ? 'bg-[#1a7a6d] text-white' : 'bg-gray-100 dark:bg-gray-800'
        )}>
          <FileText className="h-4 w-4" />
          <span className="text-sm font-medium">Preview</span>
        </div>
        <div className="h-px w-8 bg-gray-300 dark:bg-gray-700" />
        <div className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full transition-colors',
          step === 'result' ? 'bg-[#1a7a6d] text-white' : 'bg-gray-100 dark:bg-gray-800'
        )}>
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">Complete</span>
        </div>
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Select File</CardTitle>
            <CardDescription>
              Upload a CSV or ZIP file from your budgeting app or bank
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Drag & Drop Zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer',
                dragActive
                  ? 'border-[#1a7a6d] bg-[#1a7a6d]/5'
                  : 'border-gray-300 dark:border-gray-700 hover:border-[#1a7a6d]'
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.zip,.tsv,.txt"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="hidden"
              />
              
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-[#1a7a6d]/10 flex items-center justify-center">
                    {selectedFile ? (
                      <FileText className="h-8 w-8 text-[#1a7a6d]" />
                    ) : (
                      <Upload className="h-8 w-8 text-[#1a7a6d]" />
                    )}
                  </div>
                </div>
                
                {selectedFile ? (
                  <div>
                    <p className="text-lg font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-medium">
                      Drag and drop your file here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse
                    </p>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge variant="outline">CSV</Badge>
                  <Badge variant="outline">ZIP</Badge>
                  <Badge variant="outline">YNAB</Badge>
                  <Badge variant="outline">Monarch</Badge>
                  <Badge variant="outline">Mint</Badge>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            {selectedFile && (
              <div className="flex gap-3">
                <Button
                  onClick={() => setSelectedFile(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Clear
                </Button>
                <Button
                  onClick={handleParse}
                  disabled={loading}
                  className="gradient-btn border-0 flex-1"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Parse File
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step: Preview */}
      {step === 'preview' && parsedData && (
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preview Import</CardTitle>
                <CardDescription>
                  Review the detected format and sample transactions
                </CardDescription>
              </div>
              <Badge className="bg-[#1a7a6d]">
                {formatNames[parsedData.format]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sample transactions table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Payee</th>
                    <th className="text-right py-3 px-4 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 font-medium">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.sampleRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-900">
                      <td className="py-3 px-4">{row.date || '—'}</td>
                      <td className="py-3 px-4">{row.payee || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        {row.amount || (row.inflow && row.outflow ? 
                          (row.inflow || row.outflow) : '—')}
                      </td>
                      <td className="py-3 px-4">{row.category || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>{parsedData.totalRows}</strong> transaction
                {parsedData.totalRows !== 1 ? 's' : ''} ready to import.
                Duplicates will be automatically skipped.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={loading}
                className="gradient-btn border-0 flex-1"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Import {parsedData.totalRows} Transaction{parsedData.totalRows !== 1 ? 's' : ''}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Result */}
      {step === 'result' && importResult && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Import Complete</CardTitle>
            <CardDescription>Summary of your import</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                      {importResult.imported}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Imported
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                  <div>
                    <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
                      {importResult.skipped}
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Skipped (duplicates)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Errors */}
            {importResult.errors.length > 0 && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                  {importResult.errors.length} error{importResult.errors.length !== 1 ? 's' : ''} occurred:
                </p>
                <ul className="space-y-1 text-xs text-red-800 dark:text-red-200">
                  {importResult.errors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1"
              >
                Import More
              </Button>
              <Button
                onClick={() => window.location.href = '/transactions'}
                className="gradient-btn border-0 flex-1"
              >
                View Transactions
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
