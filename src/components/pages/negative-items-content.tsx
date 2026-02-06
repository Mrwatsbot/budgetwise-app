'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Filter, 
  ArrowLeft,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
} from 'lucide-react';
import { useNegativeItems } from '@/lib/hooks/use-credit';
import { NegativeItemCard, BureauBadge } from '@/components/credit';
import { 
  NegativeItem, 
  NegativeItemType, 
  NegativeItemStatus,
  ITEM_TYPE_LABELS, 
  STATUS_LABELS,
  ImpactLevel,
  getImpactEstimate,
} from '@/types/credit';

const ITEM_TYPES: NegativeItemType[] = [
  'collection', 'late_payment', 'charge_off', 'repossession',
  'bankruptcy', 'foreclosure', 'tax_lien', 'judgment', 'inquiry', 'other'
];

interface AddItemFormData {
  item_type: NegativeItemType;
  creditor_name: string;
  original_creditor?: string;
  account_number?: string;
  amount?: number;
  date_reported?: string;
  on_equifax: boolean;
  on_experian: boolean;
  on_transunion: boolean;
  notes?: string;
}

export function NegativeItemsContent() {
  const { items, isLoading, addItem, updateItem, deleteItem } = useNegativeItems();
  const [showAddForm, setShowAddForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<NegativeItemStatus | 'all'>('all');
  const [impactFilter, setImpactFilter] = useState<ImpactLevel | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<NegativeItem | null>(null);
  const [formData, setFormData] = useState<AddItemFormData>({
    item_type: 'collection',
    creditor_name: '',
    on_equifax: false,
    on_experian: false,
    on_transunion: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter items
  const filteredItems = items.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (impactFilter !== 'all' && item.estimated_impact !== impactFilter) return false;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const impact = getImpactEstimate(formData.item_type, formData.amount);
      await addItem({
        ...formData,
        estimated_impact: impact.impact,
        estimated_points: impact.points,
      });
      setShowAddForm(false);
      setFormData({
        item_type: 'collection',
        creditor_name: '',
        on_equifax: false,
        on_experian: false,
        on_transunion: false,
      });
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    await deleteItem(id);
    setSelectedItem(null);
  };

  const handleStatusChange = async (id: string, status: NegativeItemStatus) => {
    await updateItem(id, { status });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800 rounded w-1/3" />
          <div className="h-24 bg-zinc-800 rounded-xl" />
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
            <h1 className="text-2xl font-bold text-white">Negative Items</h1>
            <p className="text-zinc-400 mt-1">{items.length} items on your credit report</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-zinc-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as NegativeItemStatus | 'all')}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <select
          value={impactFilter}
          onChange={(e) => setImpactFilter(e.target.value as ImpactLevel | 'all')}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="all">All Impact</option>
          <option value="high">High Impact</option>
          <option value="medium">Medium Impact</option>
          <option value="low">Low Impact</option>
        </select>
      </div>

      {/* Items List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {items.length === 0 ? 'No negative items yet' : 'No items match your filters'}
            </h3>
            <p className="text-zinc-400 mb-4">
              {items.length === 0 
                ? 'Add items from your credit report to start disputing them.'
                : 'Try adjusting your filters to see more items.'}
            </p>
            {items.length === 0 && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
              >
                Add First Item
              </button>
            )}
          </div>
        ) : (
          filteredItems.map(item => (
            <NegativeItemCard
              key={item.id}
              item={item}
              onClick={() => setSelectedItem(item)}
            />
          ))
        )}
      </div>

      {/* Add Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">Add Negative Item</h2>
              <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-zinc-800 rounded">
                <X size={20} className="text-zinc-400" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Item Type */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Item Type</label>
                <select
                  value={formData.item_type}
                  onChange={(e) => setFormData({ ...formData, item_type: e.target.value as NegativeItemType })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  required
                >
                  {ITEM_TYPES.map(type => (
                    <option key={type} value={type}>{ITEM_TYPE_LABELS[type]}</option>
                  ))}
                </select>
              </div>

              {/* Creditor Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Creditor/Company Name</label>
                <input
                  type="text"
                  value={formData.creditor_name}
                  onChange={(e) => setFormData({ ...formData, creditor_name: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  placeholder="e.g., Capital One, Midland Credit"
                  required
                />
              </div>

              {/* Original Creditor */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Original Creditor (if different)</label>
                <input
                  type="text"
                  value={formData.original_creditor || ''}
                  onChange={(e) => setFormData({ ...formData, original_creditor: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  placeholder="e.g., Verizon, Sprint"
                />
              </div>

              {/* Account Number & Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={formData.account_number || ''}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                    placeholder="Last 4 digits"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || undefined })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Date Reported */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Date Reported</label>
                <input
                  type="date"
                  value={formData.date_reported || ''}
                  onChange={(e) => setFormData({ ...formData, date_reported: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              {/* Bureaus */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Reporting Bureaus</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.on_equifax}
                      onChange={(e) => setFormData({ ...formData, on_equifax: e.target.checked })}
                      className="rounded border-zinc-600 bg-zinc-800 text-emerald-500"
                    />
                    <BureauBadge bureau="equifax" size="sm" />
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.on_experian}
                      onChange={(e) => setFormData({ ...formData, on_experian: e.target.checked })}
                      className="rounded border-zinc-600 bg-zinc-800 text-emerald-500"
                    />
                    <BureauBadge bureau="experian" size="sm" />
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.on_transunion}
                      onChange={(e) => setFormData({ ...formData, on_transunion: e.target.checked })}
                      className="rounded border-zinc-600 bg-zinc-800 text-emerald-500"
                    />
                    <BureauBadge bureau="transunion" size="sm" />
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white resize-none"
                  rows={2}
                  placeholder="Any additional details..."
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">{selectedItem.creditor_name}</h2>
              <button onClick={() => setSelectedItem(null)} className="p-1 hover:bg-zinc-800 rounded">
                <X size={20} className="text-zinc-400" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-400">Type</p>
                  <p className="text-white">{ITEM_TYPE_LABELS[selectedItem.item_type]}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Amount</p>
                  <p className="text-white">{selectedItem.amount ? `$${selectedItem.amount.toLocaleString()}` : 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Status</p>
                  <p className="text-white">{STATUS_LABELS[selectedItem.status]}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Impact</p>
                  <p className={`${
                    selectedItem.estimated_impact === 'high' ? 'text-red-400' :
                    selectedItem.estimated_impact === 'medium' ? 'text-amber-400' : 'text-zinc-400'
                  }`}>
                    {selectedItem.estimated_impact?.toUpperCase()} ({selectedItem.estimated_points ? `-${selectedItem.estimated_points} pts` : '??'})
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {selectedItem.on_equifax && <BureauBadge bureau="equifax" size="sm" />}
                {selectedItem.on_experian && <BureauBadge bureau="experian" size="sm" />}
                {selectedItem.on_transunion && <BureauBadge bureau="transunion" size="sm" />}
              </div>

              {selectedItem.notes && (
                <div>
                  <p className="text-zinc-400 text-sm">Notes</p>
                  <p className="text-white text-sm">{selectedItem.notes}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <Link
                  href={`/credit/disputes?item=${selectedItem.id}&action=new`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                >
                  <FileText size={16} />
                  Generate Letter
                </Link>
                <button
                  onClick={() => handleDelete(selectedItem.id)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-red-600/20 text-zinc-400 hover:text-red-400 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
