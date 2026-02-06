'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Plus, 
  ArrowLeft,
  FileText,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Download,
  X,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useDisputes, useNegativeItems, useLetterGenerator } from '@/lib/hooks/use-credit';
import { BureauBadge } from '@/components/credit';
import { 
  Dispute, 
  LetterType,
  DisputeStatus,
  LETTER_TYPE_LABELS, 
  BUREAU_ADDRESSES,
  NegativeItem,
} from '@/types/credit';

const STATUS_CONFIG: Record<DisputeStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'text-zinc-400 bg-zinc-800', icon: <FileText size={14} /> },
  sent: { label: 'Sent', color: 'text-blue-400 bg-blue-500/20', icon: <Send size={14} /> },
  responded: { label: 'Responded', color: 'text-amber-400 bg-amber-500/20', icon: <AlertCircle size={14} /> },
  won: { label: 'Won', color: 'text-emerald-400 bg-emerald-500/20', icon: <CheckCircle2 size={14} /> },
  lost: { label: 'Lost', color: 'text-red-400 bg-red-500/20', icon: <X size={14} /> },
  expired: { label: 'Expired', color: 'text-zinc-400 bg-zinc-800', icon: <Clock size={14} /> },
};

export function DisputesContent() {
  const searchParams = useSearchParams();
  const { disputes, isLoading, createDispute, updateDispute } = useDisputes();
  const { items: negativeItems } = useNegativeItems();
  const { generateLetter } = useLetterGenerator();
  
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [letterTips, setLetterTips] = useState<string[]>([]);
  
  // Form state for letter generation
  const [letterType, setLetterType] = useState<LetterType>('609_validation');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [targetBureau, setTargetBureau] = useState<'equifax' | 'experian' | 'transunion'>('equifax');
  const [userInfo, setUserInfo] = useState({
    full_name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    ssn_last4: '',
  });
  const [customParams, setCustomParams] = useState({
    hardship_reason: '',
    years_customer: '',
    offer_amount: '',
  });

  // Check URL params
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowGenerator(true);
    }
    const itemId = searchParams.get('item');
    if (itemId) {
      setSelectedItemId(itemId);
    }
  }, [searchParams]);

  const selectedItem = negativeItems.find(i => i.id === selectedItemId);

  const handleGenerate = async () => {
    if (!userInfo.full_name || !userInfo.address) {
      alert('Please fill in your name and address');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateLetter({
        letter_type: letterType,
        negative_item: selectedItem,
        user_info: {
          ...userInfo,
          ssn_last4: userInfo.ssn_last4 || undefined,
          phone: userInfo.phone || undefined,
        },
        target_bureau: targetBureau,
        custom_params: letterType === 'goodwill' ? {
          hardship_reason: customParams.hardship_reason || undefined,
          years_customer: customParams.years_customer ? parseInt(customParams.years_customer) : undefined,
        } : letterType === 'pay_for_delete' ? {
          offer_amount: customParams.offer_amount ? parseFloat(customParams.offer_amount) : undefined,
        } : undefined,
      });

      setGeneratedLetter(result.letter_content);
      setLetterTips(result.tips || []);
    } catch (error) {
      console.error('Failed to generate letter:', error);
      alert('Failed to generate letter. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDispute = async () => {
    if (!generatedLetter) return;

    const bureauInfo = BUREAU_ADDRESSES[targetBureau];
    
    await createDispute({
      letter_type: letterType,
      negative_item_id: selectedItemId || undefined,
      target: bureauInfo.name,
      target_type: 'bureau',
      target_address: `${bureauInfo.address}, ${bureauInfo.city}, ${bureauInfo.state} ${bureauInfo.zip}`,
      letter_content: generatedLetter,
      letter_generated_by: 'ai',
    });

    setShowGenerator(false);
    setGeneratedLetter(null);
    setSelectedItemId(null);
  };

  const handleCopyLetter = () => {
    if (generatedLetter) {
      navigator.clipboard.writeText(generatedLetter);
      alert('Letter copied to clipboard!');
    }
  };

  const handleMarkSent = async (dispute: Dispute) => {
    await updateDispute(dispute.id, {
      status: 'sent',
      sent_date: new Date().toISOString().split('T')[0],
      sent_method: 'certified_mail',
    });
  };

  const handleMarkWon = async (dispute: Dispute) => {
    await updateDispute(dispute.id, {
      status: 'won',
      response_date: new Date().toISOString().split('T')[0],
      response_type: 'deleted',
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800 rounded w-1/3" />
          <div className="h-24 bg-zinc-800 rounded-xl" />
          <div className="h-24 bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/credit" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Disputes & Letters</h1>
            <p className="text-zinc-400 mt-1">{disputes.length} dispute{disputes.length !== 1 ? 's' : ''} on file</p>
          </div>
        </div>
        <button
          onClick={() => setShowGenerator(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
        >
          <Sparkles size={18} />
          Generate Letter
        </button>
      </div>

      {/* Disputes List */}
      <div className="space-y-4">
        {disputes.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={32} className="text-zinc-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No disputes yet</h3>
            <p className="text-zinc-400 mb-4">Generate AI-powered dispute letters to challenge negative items.</p>
            <button
              onClick={() => setShowGenerator(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              Create First Letter
            </button>
          </div>
        ) : (
          disputes.map(dispute => {
            const statusConfig = STATUS_CONFIG[dispute.status];
            const daysLeft = dispute.deadline_date 
              ? Math.ceil((new Date(dispute.deadline_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <div
                key={dispute.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${statusConfig.color}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {LETTER_TYPE_LABELS[dispute.letter_type]}
                      </span>
                    </div>
                    <h3 className="text-white font-medium">{dispute.target}</h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      Created {new Date(dispute.created_at).toLocaleDateString()}
                      {dispute.sent_date && ` • Sent ${new Date(dispute.sent_date).toLocaleDateString()}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {dispute.status === 'sent' && daysLeft !== null && daysLeft >= 0 && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        daysLeft <= 3 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-800">
                  <button
                    onClick={() => setSelectedDispute(dispute)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors"
                  >
                    <FileText size={14} />
                    View Letter
                  </button>
                  {dispute.status === 'draft' && (
                    <button
                      onClick={() => handleMarkSent(dispute)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
                    >
                      <Send size={14} />
                      Mark Sent
                    </button>
                  )}
                  {dispute.status === 'sent' && (
                    <button
                      onClick={() => handleMarkWon(dispute)}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition-colors"
                    >
                      <CheckCircle2 size={14} />
                      Item Deleted!
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Letter Generator Modal */}
      {showGenerator && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles size={20} className="text-emerald-400" />
                Generate Dispute Letter
              </h2>
              <button onClick={() => { setShowGenerator(false); setGeneratedLetter(null); }} className="p-1 hover:bg-zinc-800 rounded">
                <X size={20} className="text-zinc-400" />
              </button>
            </div>

            {!generatedLetter ? (
              <div className="p-4 space-y-4">
                {/* Letter Type */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Letter Type</label>
                  <select
                    value={letterType}
                    onChange={(e) => setLetterType(e.target.value as LetterType)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  >
                    {Object.entries(LETTER_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Target Bureau */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Send To</label>
                  <div className="flex gap-3">
                    {(['equifax', 'experian', 'transunion'] as const).map(bureau => (
                      <button
                        key={bureau}
                        type="button"
                        onClick={() => setTargetBureau(bureau)}
                        className={`flex-1 p-3 rounded-lg border transition-colors ${
                          targetBureau === bureau 
                            ? 'border-emerald-500 bg-emerald-500/10' 
                            : 'border-zinc-700 hover:border-zinc-600'
                        }`}
                      >
                        <BureauBadge bureau={bureau} size="sm" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Negative Item (optional) */}
                {negativeItems.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Related Item (optional)</label>
                    <select
                      value={selectedItemId || ''}
                      onChange={(e) => setSelectedItemId(e.target.value || null)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="">No specific item</option>
                      {negativeItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.creditor_name} - {item.amount ? `$${item.amount}` : 'Amount unknown'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* User Info */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-zinc-300">Your Information</p>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={userInfo.full_name}
                    onChange={(e) => setUserInfo({ ...userInfo, full_name: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={userInfo.address}
                    onChange={(e) => setUserInfo({ ...userInfo, address: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="City"
                      value={userInfo.city}
                      onChange={(e) => setUserInfo({ ...userInfo, city: e.target.value })}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={userInfo.state}
                      onChange={(e) => setUserInfo({ ...userInfo, state: e.target.value })}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                      maxLength={2}
                    />
                    <input
                      type="text"
                      placeholder="ZIP"
                      value={userInfo.zip}
                      onChange={(e) => setUserInfo({ ...userInfo, zip: e.target.value })}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Phone (optional)"
                      value={userInfo.phone}
                      onChange={(e) => setUserInfo({ ...userInfo, phone: e.target.value })}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                    />
                    <input
                      type="text"
                      placeholder="SSN Last 4 (optional)"
                      value={userInfo.ssn_last4}
                      onChange={(e) => setUserInfo({ ...userInfo, ssn_last4: e.target.value })}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                      maxLength={4}
                    />
                  </div>
                </div>

                {/* Conditional fields based on letter type */}
                {letterType === 'goodwill' && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-zinc-300">Goodwill Details</p>
                    <textarea
                      placeholder="Hardship reason (what caused the late payment?)"
                      value={customParams.hardship_reason}
                      onChange={(e) => setCustomParams({ ...customParams, hardship_reason: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white resize-none"
                      rows={2}
                    />
                    <input
                      type="number"
                      placeholder="Years as customer"
                      value={customParams.years_customer}
                      onChange={(e) => setCustomParams({ ...customParams, years_customer: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                )}

                {letterType === 'pay_for_delete' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Settlement Offer Amount</label>
                    <input
                      type="number"
                      placeholder="$ Amount you're willing to pay"
                      value={customParams.offer_amount}
                      onChange={(e) => setCustomParams({ ...customParams, offer_amount: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                )}

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !userInfo.full_name || !userInfo.address}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Generate Letter
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Generated Letter */}
                <div className="bg-zinc-800 rounded-lg p-4 max-h-80 overflow-y-auto">
                  <pre className="text-white text-sm whitespace-pre-wrap font-mono">{generatedLetter}</pre>
                </div>

                {/* Tips */}
                {letterTips.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                    <p className="text-sm font-medium text-amber-400 mb-2">💡 Tips for success:</p>
                    <ul className="text-sm text-zinc-300 space-y-1">
                      {letterTips.map((tip, i) => (
                        <li key={i}>• {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCopyLetter}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                  >
                    <Copy size={16} />
                    Copy
                  </button>
                  <button
                    onClick={handleSaveDispute}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                  >
                    <CheckCircle2 size={16} />
                    Save Dispute
                  </button>
                </div>

                <button
                  onClick={() => setGeneratedLetter(null)}
                  className="w-full text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  ← Generate different letter
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Letter Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">{LETTER_TYPE_LABELS[selectedDispute.letter_type]}</h2>
              <button onClick={() => setSelectedDispute(null)} className="p-1 hover:bg-zinc-800 rounded">
                <X size={20} className="text-zinc-400" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="bg-zinc-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-white text-sm whitespace-pre-wrap font-mono">{selectedDispute.letter_content}</pre>
              </div>
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedDispute.letter_content);
                    alert('Letter copied!');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  <Copy size={16} />
                  Copy Letter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
