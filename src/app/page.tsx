import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PiggyBank, ArrowRight, Sparkles, TrendingUp, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial pointer-events-none" />
      
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center">
            <PiggyBank className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold">BudgetWise</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="gradient-btn border-0 text-white">
              Get Started
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm mb-8">
            <Sparkles className="w-4 h-4 text-accent-purple" />
            <span className="text-muted-foreground">AI-Powered Budgeting</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Budget smarter.
            <br />
            <span className="gradient-text">Build wealth faster.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            The modern budget app that helps you track spending, crush debt, and reach your financial goals with AI-powered insights.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/signup">
              <Button size="lg" className="gradient-btn border-0 text-white px-8 h-12 text-base">
                Start Free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="px-8 h-12 text-base border-border hover:bg-secondary">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="glass-card p-6 rounded-2xl">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Categorization</h3>
              <p className="text-muted-foreground text-sm">
                Transactions automatically sorted into the right categories. No manual work.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Debt Payoff Planner</h3>
              <p className="text-muted-foreground text-sm">
                Get a personalized plan to crush your debt faster with smart strategies.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Privacy First</h3>
              <p className="text-muted-foreground text-sm">
                Your data stays yours. Bank-level encryption, no selling your info.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-muted-foreground">
          © 2026 BudgetWise. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
