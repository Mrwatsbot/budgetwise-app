'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, ArrowUpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: 'ai' | 'kb_match' | 'canned';
  timestamp: Date;
}

interface ChatUsage {
  tokensUsed: number;
  remaining: number;
  usagePercent: number;
  dailyRemaining: number;
}

interface ChatResponse {
  message: string;
  source: 'ai' | 'kb_match' | 'canned';
  conversationId: string;
  usage: ChatUsage;
}

// ── Suggested prompts ──

const SUGGESTED_PROMPTS = [
  'How am I doing this month?',
  'How do I create a budget?',
  'What is my health score?',
  'Tips for saving more money',
];

// ── Component ──

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [usage, setUsage] = useState<ChatUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    setInput('');

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversationId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Something went wrong' }));
        throw new Error(errData.error || `Error ${res.status}`);
      }

      const data: ChatResponse = await res.json();

      // Add assistant message
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        source: data.source,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      setConversationId(data.conversationId);
      setUsage(data.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const dailyRemaining = usage?.dailyRemaining;
  const usagePercent = usage?.usagePercent ?? 0;
  const isNearLimit = usagePercent >= 0.8;
  const isAtLimit = dailyRemaining === 0 || usagePercent >= 1;

  return (
    <>
      {/* Floating chat button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed z-50 flex items-center justify-center',
            'w-14 h-14 rounded-full shadow-lg',
            'bg-gradient-to-br from-[#1a7a6d] to-[#2aaa9a]',
            'hover:from-[#1e8a7d] hover:to-[#30bba8]',
            'transition-all duration-200 hover:scale-105',
            // Position: bottom-right, above mobile nav
            'bottom-20 right-4 lg:bottom-6 lg:right-6'
          )}
          aria-label="Open chat assistant"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className={cn(
            'fixed z-50',
            // Mobile: full-screen overlay
            'inset-0 lg:inset-auto',
            // Desktop: bottom-right popup
            'lg:bottom-6 lg:right-6 lg:w-[400px] lg:h-[600px] lg:max-h-[80vh]',
            'flex flex-col',
            'bg-background/95 backdrop-blur-xl',
            'lg:rounded-2xl lg:border lg:border-border',
            'lg:shadow-2xl',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a7a6d] to-[#2aaa9a] flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Thallo Assistant</h2>
                <p className="text-[10px] text-muted-foreground">AI-powered finance help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Close chat"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Usage warning bar */}
          {isNearLimit && usage && (
            <div className={cn(
              'px-4 py-1.5 text-xs text-center shrink-0',
              usagePercent >= 1 ? 'bg-red-500/20 text-red-400' :
              usagePercent >= 0.95 ? 'bg-orange-500/20 text-orange-400' :
              'bg-yellow-500/20 text-yellow-400'
            )}>
              {usagePercent >= 1
                ? 'AI assistant limit reached for this period'
                : `${Math.round(usagePercent * 100)}% of AI budget used`
              }
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {/* Welcome message if no messages */}
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="bg-secondary/50 rounded-xl p-4">
                  <p className="text-sm text-foreground">
                    👋 Hi! I&apos;m your Thallo finance assistant. Ask me about your budgets, spending, savings, or how to use the app!
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className={cn(
                        'text-left text-xs p-2.5 rounded-lg',
                        'border border-border',
                        'hover:bg-secondary/70 transition-colors',
                        'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm',
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-[#1a7a6d] to-[#2aaa9a] text-white rounded-br-md'
                      : 'bg-secondary/70 text-foreground rounded-bl-md',
                    // KB answers get a subtle distinct style
                    msg.source === 'kb_match' && 'border border-[#1a7a6d]/30',
                  )}
                >
                  <div className="whitespace-pre-wrap break-words leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-secondary/70 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0ms]" />
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:150ms]" />
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex justify-center">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-red-400">
                  {error}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer: Input + usage info */}
          <div className="border-t border-border px-3 py-2 shrink-0 space-y-2">
            {/* Input row */}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 500))}
                onKeyDown={handleKeyDown}
                placeholder={isAtLimit ? 'Chat limit reached...' : 'Ask a question...'}
                disabled={isLoading || isAtLimit}
                rows={1}
                className={cn(
                  'flex-1 resize-none rounded-xl border border-border bg-secondary/50',
                  'px-3 py-2.5 text-sm placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-1 focus:ring-[#2aaa9a]/50 focus:border-[#2aaa9a]/50',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'max-h-24',
                )}
                style={{ minHeight: '40px' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading || isAtLimit}
                className={cn(
                  'shrink-0 p-2.5 rounded-xl transition-all',
                  input.trim() && !isLoading && !isAtLimit
                    ? 'bg-gradient-to-br from-[#1a7a6d] to-[#2aaa9a] text-white hover:opacity-90'
                    : 'bg-secondary text-muted-foreground cursor-not-allowed',
                )}
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Usage footer */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
              <span>Powered by AI</span>
              {usage && (
                <span>
                  {isAtLimit ? (
                    <span className="text-red-400">
                      Limit reached · <button onClick={() => {/* TODO: upgrade link */}} className="underline hover:text-red-300">Upgrade</button>
                    </span>
                  ) : (
                    `${usage.dailyRemaining} messages remaining today`
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
