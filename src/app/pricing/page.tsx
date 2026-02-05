import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Check, X, Zap, Target, Crown, ArrowRight, TrendingUp, Users, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Pricing – Thallo',
  description: 'Choose the plan that fits your financial goals. From free budgeting to AI-powered wealth building.',
};

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started',
    icon: Target,
    color: 'text-gray-400',
    bgGradient: 'from-gray-500/10 to-slate-500/10',
    borderColor: 'border-gray-500/20',
    features: [
      { text: 'Financial Health Score', included: true },
      { text: 'Manual transaction tracking', included: true },
      { text: 'CSV import', included: true },
      { text: 'Basic gamification', included: true },
      { text: 'Budget & debt tracking', included: true },
      { text: 'AI Insights', included: false, note: 'Locked (see demo)' },
      { text: 'Leaderboards', included: false },
      { text: 'Bank sync', included: false },
    ],
    cta: 'Get Started Free',
    href: '/signup',
    highlighted: false,
  },
  {
    name: 'Plus',
    price: '$79',
    period: 'per year',
    description: 'For serious budgeters',
    icon: Zap,
    color: 'text-[#1a7a6d]',
    bgGradient: 'from-[#1a7a6d33] to-[#146b5f33]',
    borderColor: 'border-[#1a7a6d66]',
    features: [
      { text: 'Everything in Free', included: true },
      { text: 'Full gamification (streaks, challenges)', included: true },
      { text: 'AI Insights (5 refreshes/day)', included: true },
      { text: 'Auto Budget Wizard (2/month)', included: true },
      { text: '"Can I Afford This?" (3/week)', included: true },
      { text: 'Receipt scanning (2/week)', included: true },
      { text: 'AI Coaching (3/month)', included: true },
      { text: 'Leaderboards', included: true },
      { text: 'Bank sync', included: false },
    ],
    cta: 'Start Free Trial',
    href: '/signup?plan=plus',
    highlighted: true,
  },
  {
    name: 'Pro',
    price: '$149',
    period: 'per year',
    description: 'Maximum automation',
    icon: Crown,
    color: 'text-teal-400',
    bgGradient: 'from-teal-500/20 to-teal-600/20',
    borderColor: 'border-teal-500/40',
    features: [
      { text: 'Everything in Plus', included: true },
      { text: 'Unlimited AI features', included: true },
      { text: 'Bank sync (Plaid)', included: true },
      { text: '"Can I Afford This?" (15/week)', included: true },
      { text: 'Receipt scanning (10/week)', included: true },
      { text: 'Priority support', included: true },
      { text: 'Family sharing (+$29/yr)', included: true, note: 'Add-on' },
    ],
    cta: 'Start Free Trial',
    href: '/signup?plan=pro',
    highlighted: false,
  },
];

const comparisonFeatures = [
  { category: 'Core Features', items: [
    { name: 'Financial Health Score', free: true, plus: true, pro: true },
    { name: 'Budget tracking', free: true, plus: true, pro: true },
    { name: 'Debt & savings goals', free: true, plus: true, pro: true },
    { name: 'CSV import', free: true, plus: true, pro: true },
  ]},
  { category: 'Gamification', items: [
    { name: 'Streaks & achievements', free: 'Basic', plus: 'Full', pro: 'Full' },
    { name: 'Challenges', free: false, plus: true, pro: true },
    { name: 'Leaderboards', free: false, plus: true, pro: true },
  ]},
  { category: 'AI Features', items: [
    { name: 'Spending insights', free: false, plus: '5/day', pro: 'Unlimited' },
    { name: 'Auto Budget Wizard', free: false, plus: '2/month', pro: 'Unlimited' },
    { name: 'Can I Afford This?', free: false, plus: '3/week', pro: '15/week' },
    { name: 'Receipt scanning', free: false, plus: '2/week', pro: '10/week' },
    { name: 'AI Coaching', free: false, plus: '3/month', pro: 'Unlimited' },
    { name: 'Smart Payoff Plans', free: false, plus: '1/month', pro: 'Unlimited' },
  ]},
  { category: 'Advanced', items: [
    { name: 'Bank sync (Plaid)', free: false, plus: false, pro: true },
    { name: 'Family sharing', free: false, plus: false, pro: '+$29/yr' },
  ]},
];

const competitors = [
  { name: 'YNAB', price: '$109/yr', gamification: false, aiCoach: false, score: false },
  { name: 'Monarch', price: '$99/yr', gamification: false, aiCoach: false, score: false },
  { name: 'Thallo Plus', price: '$79/yr', gamification: true, aiCoach: true, score: true },
];

const faqs = [
  {
    question: 'Can I try before I buy?',
    answer: 'Absolutely! The Free tier lets you use the app with all core features. You can also explore our interactive demo to see AI features in action before upgrading.',
  },
  {
    question: 'How is this different from YNAB or Mint?',
    answer: 'We\'re the only budget app with gamification (streaks, challenges, leaderboards) AND a Financial Health Score. YNAB is great for zero-based budgeting, but we add AI automation and make it actually fun to budget.',
  },
  {
    question: 'What is the Financial Health Score?',
    answer: 'A 0-1000 score based on 3 pillars: Budgeting Discipline (0-400), Debt Management (0-300), and Wealth Building (0-300). It\'s like a credit score but for your overall financial health.',
  },
  {
    question: 'Do I need to connect my bank?',
    answer: 'No! You can use Thallo entirely with manual entry or CSV imports. Bank sync (Plaid) is optional and only available on Pro.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. We use bank-level encryption (TLS 1.3 + AES-256), don\'t sell your data, and strip all personal identifiers before AI processing. Read our Security page for details.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes. Cancel anytime from settings. Your data stays accessible on the Free tier.',
  },
  {
    question: 'Do you offer refunds?',
    answer: 'Yes. 30-day money-back guarantee, no questions asked.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-btn flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold">Thallo</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/demo">
              <Button variant="ghost">Try Demo</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button className="gradient-btn border-0">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm mb-6">
            <Sparkles className="w-4 h-4 text-[#1a7a6d]" />
            <span className="text-muted-foreground">The only budget app with gamification + AI</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Get Financially Fit.
            <br />
            <span className="gradient-text">Without the Spreadsheet.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that matches your goals. Start free, upgrade when you're ready.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {tiers.map((tier) => {
            const IconComponent = tier.icon;
            return (
              <div
                key={tier.name}
                className={`glass-card rounded-2xl p-8 relative ${
                  tier.highlighted
                    ? 'border-2 border-[#1a7a6d80] shadow-xl shadow-[#1a7a6d33]'
                    : 'border border-border'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="px-4 py-1 rounded-full gradient-btn text-white text-sm font-semibold">
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Icon & Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tier.bgGradient} border ${tier.borderColor} flex items-center justify-center`}>
                    <IconComponent className={`w-6 h-6 ${tier.color}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{tier.name}</h3>
                    <p className="text-sm text-muted-foreground">{tier.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground">/{tier.period}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-[#7aba5c] flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? '' : 'text-muted-foreground line-through'}>
                        {feature.text}
                        {feature.note && (
                          <span className="text-xs text-muted-foreground ml-1">({feature.note})</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  asChild
                  className={
                    tier.highlighted
                      ? 'w-full gradient-btn border-0'
                      : 'w-full'
                  }
                  variant={tier.highlighted ? 'default' : 'outline'}
                >
                  <Link href={tier.href}>
                    {tier.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Compare Plans</h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            {comparisonFeatures.map((section, sectionIdx) => (
              <div key={section.category} className={sectionIdx > 0 ? 'border-t border-border' : ''}>
                <div className="bg-muted/30 px-6 py-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    {section.category}
                  </h3>
                </div>
                {section.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="grid grid-cols-4 gap-4 px-6 py-4 border-t border-border/50"
                  >
                    <div className="col-span-1 font-medium text-sm">{item.name}</div>
                    <div className="text-center">
                      {typeof item.free === 'boolean' ? (
                        item.free ? (
                          <Check className="w-5 h-5 text-[#7aba5c] mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm text-muted-foreground">{item.free}</span>
                      )}
                    </div>
                    <div className="text-center">
                      {typeof item.plus === 'boolean' ? (
                        item.plus ? (
                          <Check className="w-5 h-5 text-[#7aba5c] mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm font-medium">{item.plus}</span>
                      )}
                    </div>
                    <div className="text-center">
                      {typeof item.pro === 'boolean' ? (
                        item.pro ? (
                          <Check className="w-5 h-5 text-[#7aba5c] mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm font-medium">{item.pro}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* vs Competitors */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-4">How We Compare</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            We're not just cheaper — we offer features no other budget app has.
          </p>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="grid grid-cols-5 gap-4 px-6 py-4 bg-muted/30 font-semibold text-sm">
              <div>App</div>
              <div className="text-center">Price</div>
              <div className="text-center">Gamification</div>
              <div className="text-center">AI Coach</div>
              <div className="text-center">Health Score</div>
            </div>
            {competitors.map((comp, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-5 gap-4 px-6 py-4 border-t border-border/50 ${
                  comp.name.includes('Thallo') ? 'bg-[#1a7a6d0d]' : ''
                }`}
              >
                <div className="font-medium">
                  {comp.name}
                  {comp.name.includes('Thallo') && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#1a7a6d33] text-[#1a7a6d]">
                      Us
                    </span>
                  )}
                </div>
                <div className="text-center">{comp.price}</div>
                <div className="text-center">
                  {comp.gamification ? (
                    <Check className="w-5 h-5 text-[#7aba5c] mx-auto" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
                  )}
                </div>
                <div className="text-center">
                  {comp.aiCoach ? (
                    <Check className="w-5 h-5 text-[#7aba5c] mx-auto" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
                  )}
                </div>
                <div className="text-center">
                  {comp.score ? (
                    <Check className="w-5 h-5 text-[#7aba5c] mx-auto" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {faqs.map((faq, idx) => (
              <div key={idx} className="glass-card rounded-xl p-6">
                <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
                <p className="text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="glass-card rounded-2xl p-12 text-center bg-gradient-to-br from-[#1a7a6d1a] to-[#146b5f1a] border border-[#1a7a6d33]">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Financially Fit?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of people building better financial habits. Start free, upgrade anytime.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="gradient-btn border-0" asChild>
              <Link href="/signup">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/demo">
                Try Demo
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Thallo. All rights reserved.</p>
          <div className="flex items-center justify-center gap-6 mt-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/security" className="hover:text-foreground transition-colors">Security</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
