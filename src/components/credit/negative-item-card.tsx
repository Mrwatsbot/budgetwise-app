'use client';

import { useState } from 'react';
import { 
  AlertCircle, 
  Clock, 
  DollarSign, 
  ChevronRight,
  CheckCircle2,
  XCircle,
  FileText,
  MoreHorizontal,
  Trash2,
  Edit,
  Send
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BureauBadges } from './bureau-badge';
import { 
  NegativeItem, 
  ITEM_TYPE_LABELS, 
  STATUS_LABELS,
  getImpactEstimate
} from '@/types/credit';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface NegativeItemCardProps {
  item: NegativeItem;
  onDispute?: (item: NegativeItem) => void;
  onEdit?: (item: NegativeItem) => void;
  onDelete?: (item: NegativeItem) => void;
  onClick?: (item: NegativeItem) => void;
}

const STATUS_ICONS = {
  identified: AlertCircle,
  disputing: Clock,
  responded: FileText,
  deleted: CheckCircle2,
  verified: XCircle,
  paid: DollarSign,
  settled: CheckCircle2,
};

const STATUS_COLORS = {
  identified: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  disputing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  responded: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  deleted: 'bg-green-500/10 text-green-500 border-green-500/20',
  verified: 'bg-red-500/10 text-red-500 border-red-500/20',
  paid: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  settled: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
};

const IMPACT_COLORS = {
  high: 'text-red-500',
  medium: 'text-yellow-500',
  low: 'text-green-500',
};

export function NegativeItemCard({ 
  item, 
  onDispute, 
  onEdit, 
  onDelete,
  onClick 
}: NegativeItemCardProps) {
  const StatusIcon = STATUS_ICONS[item.status];
  const impact = item.estimated_impact || getImpactEstimate(item.item_type, item.amount ?? undefined).impact;
  const points = item.estimated_points || getImpactEstimate(item.item_type, item.amount ?? undefined).points;
  
  const isResolved = ['deleted', 'paid', 'settled'].includes(item.status);
  
  return (
    <Card 
      className={cn(
        'group transition-all hover:shadow-md cursor-pointer',
        isResolved && 'opacity-60'
      )}
      onClick={() => onClick?.(item)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left side - Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {ITEM_TYPE_LABELS[item.item_type]}
              </Badge>
              <Badge 
                variant="outline" 
                className={cn('text-xs border', STATUS_COLORS[item.status])}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {STATUS_LABELS[item.status]}
              </Badge>
            </div>
            
            <h3 className="font-semibold text-foreground truncate">
              {item.creditor_name}
            </h3>
            
            {item.original_creditor && item.original_creditor !== item.creditor_name && (
              <p className="text-xs text-muted-foreground">
                Original: {item.original_creditor}
              </p>
            )}
            
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {item.amount && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {item.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </span>
              )}
              {item.date_reported && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(item.date_reported), { addSuffix: true })}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 mt-3">
              <BureauBadges 
                equifax={item.on_equifax}
                experian={item.on_experian}
                transunion={item.on_transunion}
              />
            </div>
          </div>
          
          {/* Right side - Impact & Actions */}
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <span className={cn('text-xs font-medium', IMPACT_COLORS[impact])}>
                {impact.toUpperCase()} IMPACT
              </span>
              <p className="text-lg font-bold text-foreground">
                ~{points} pts
              </p>
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isResolved && onDispute && (
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDispute(item);
                  }}
                >
                  <Send className="w-3 h-3 mr-1" />
                  Dispute
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="ghost">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(item)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(item)}
                      className="text-red-500"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for lists
export function NegativeItemRow({ 
  item, 
  onClick 
}: { 
  item: NegativeItem; 
  onClick?: (item: NegativeItem) => void;
}) {
  const impact = item.estimated_impact || getImpactEstimate(item.item_type).impact;
  const isResolved = ['deleted', 'paid', 'settled'].includes(item.status);
  
  return (
    <div 
      className={cn(
        'flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors',
        isResolved && 'opacity-50'
      )}
      onClick={() => onClick?.(item)}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-2 h-2 rounded-full',
          impact === 'high' ? 'bg-red-500' : impact === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
        )} />
        <div>
          <p className="font-medium text-sm">{item.creditor_name}</p>
          <p className="text-xs text-muted-foreground">{ITEM_TYPE_LABELS[item.item_type]}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Badge 
          variant="outline" 
          className={cn('text-xs', STATUS_COLORS[item.status])}
        >
          {STATUS_LABELS[item.status]}
        </Badge>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
}
