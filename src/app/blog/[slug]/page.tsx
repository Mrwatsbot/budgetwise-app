import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllPosts, getPostBySlug, getRelatedPosts, getCategoryName } from '@/lib/blog';
import { Calendar, Clock, Tag, ArrowLeft, ArrowRight } from 'lucide-react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

// Generate static params for all blog posts
export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found – Thallo',
    };
  }

  const url = `https://usethallo.com/blog/${post.slug}`;
  const imageUrl = post.image || 'https://usethallo.com/og-image.png';

  return {
    title: `${post.title} – Thallo Blog`,
    description: post.description,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      url,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [imageUrl],
      creator: '@usethallo',
    },
    alternates: {
      canonical: url,
    },
  };
}

// FAQ Component with proper schema markup
function FAQSection({ faqs }: { faqs: Array<{ question: string; answer: string }> }) {
  // Generate FAQ Schema for GEO
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="mt-12 pt-8 border-t border-border">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <h2 className="text-3xl font-display font-bold mb-6">Frequently Asked Questions</h2>
      <div className="space-y-6">
        {faqs.map((faq, index) => (
          <div key={index} className="glass-card rounded-xl p-6">
            <h3 className="text-xl font-display font-semibold mb-3 text-foreground">
              {faq.question}
            </h3>
            <p className="text-card-foreground leading-relaxed">{faq.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Try Thallo CTA Component
function TryThalloCTA() {
  return (
    <div className="my-8 glass-card rounded-2xl p-8 text-center border-primary/20">
      <h3 className="text-2xl font-display font-bold mb-3 text-foreground">
        Ready to take control of your finances?
      </h3>
      <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
        Thallo helps you budget smarter, pay off debt faster, and grow your savings — with AI-powered tools and a financial health score that actually matters.
      </p>
      <Link href="/signup">
        <button className="shimmer-btn px-8 py-3 rounded-lg text-base font-semibold">
          Try Thallo Free <ArrowRight className="inline-block w-4 h-4 ml-2" />
        </button>
      </Link>
    </div>
  );
}

// Related Articles Component
function RelatedArticles({ posts }: { posts: Array<any> }) {
  if (posts.length === 0) return null;

  return (
    <div className="mt-16 pt-8 border-t border-border">
      <h2 className="text-3xl font-display font-bold mb-6">Related Articles</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`}>
            <article className="glass-card rounded-xl p-5 h-full hover:border-primary/30 transition-all group">
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium inline-block mb-3">
                {getCategoryName(post.category)}
              </span>
              <h3 className="text-lg font-display font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
                {post.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {post.description}
              </p>
              <div className="mt-3 text-sm text-primary font-medium group-hover:translate-x-1 transition-transform">
                Read more <ArrowRight className="inline-block w-3 h-3 ml-1" />
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(post, 3);

  // Article Schema for SEO
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    image: post.image || 'https://usethallo.com/og-image.png',
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Person',
      name: post.author,
      jobTitle: 'Financial Health Expert',
      description: 'Founder of Thallo, helping people build better financial habits',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Thallo',
      logo: {
        '@type': 'ImageObject',
        url: 'https://usethallo.com/thallo-logo-white.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://usethallo.com/blog/${post.slug}`,
    },
  };

  // Placeholder FAQs - in real posts these would come from frontmatter
  const faqs = [
    {
      question: 'How does Thallo help with budgeting?',
      answer: 'Thallo uses AI to analyze your spending patterns, auto-generate budgets, and provide real-time insights. Our built-in progress tracking with streaks and challenges keeps you motivated and on track.',
    },
    {
      question: 'What makes Thallo different from other budget apps?',
      answer: 'Thallo is the only budget app with a comprehensive Financial Health Score (0-1,000) that measures what actually matters: your savings rate, debt payoff velocity, and financial habits — not just your appeal to lenders like FICO.',
    },
    {
      question: 'Is Thallo free to use?',
      answer: 'Yes! Thallo offers a generous free tier with core budgeting features, transaction tracking, and basic progress tools. Our Pro plan unlocks advanced AI features, unlimited categories, and priority support.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3D6B52] to-[#2D5440] flex items-center justify-center p-1">
            <img src="/new-logo-white.svg" alt="Thallo" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-display font-bold">Thallo</span>
        </Link>
        <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> All Posts
        </Link>
      </nav>

      {/* Article Content */}
      <article className="max-w-3xl mx-auto px-6 py-12">
        {/* Category Badge */}
        <Link href={`/blog?category=${post.category}`}>
          <span className="inline-block text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium mb-6 hover:bg-primary/20 transition-colors">
            {getCategoryName(post.category)}
          </span>
        </Link>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 text-foreground leading-tight">
          {post.title}
        </h1>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-6 mb-8 text-sm text-muted-foreground pb-8 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold">
              TM
            </div>
            <div>
              <div className="font-medium text-foreground">{post.author}</div>
              <div className="text-xs">Financial Health Expert</div>
            </div>
          </div>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {new Date(post.date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {post.readingTime}
          </span>
        </div>

        {/* Featured Image */}
        {post.image && (
          <div className="mb-10 rounded-2xl overflow-hidden bg-muted">
            <img
              src={post.image}
              alt={post.title}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Article Body */}
        <div className="blog-content">
          <MDXRemote
            source={post.content}
            options={{
              mdxOptions: {
                remarkPlugins: [remarkGfm],
                rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
              },
            }}
            components={{
              TryThalloCTA,
            }}
          />
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex items-center gap-3 mt-10 pt-8 border-t border-border flex-wrap">
            <Tag className="w-4 h-4 text-muted-foreground" />
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-sm px-3 py-1 rounded-full bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Try Thallo CTA */}
        <TryThalloCTA />

        {/* FAQ Section */}
        <FAQSection faqs={faqs} />

        {/* Related Articles */}
        <RelatedArticles posts={relatedPosts} />
      </article>

      {/* Author Bio Footer */}
      <section className="max-w-3xl mx-auto px-6 py-12 mb-12">
        <div className="glass-card rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold text-2xl shrink-0">
              TM
            </div>
            <div>
              <h3 className="text-xl font-display font-bold mb-2 text-foreground">
                About Ted Melittas
              </h3>
              <p className="text-card-foreground leading-relaxed mb-4">
                Ted is the founder of Thallo, on a mission to help people build better financial habits and real wealth. 
                After years of seeing friends struggle with traditional budgeting tools that felt like homework, he built 
                Thallo to make financial health engaging, personalized, and actually helpful.
              </p>
              <Link href="/signup" className="text-primary hover:text-primary/80 font-medium text-sm">
                Try Thallo Free →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
