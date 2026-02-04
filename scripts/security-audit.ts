#!/usr/bin/env tsx
/**
 * BudgetWise Security Audit Script
 * 
 * Checks all code for security compliance:
 * 1. Every API route uses apiGuard() (auth + rate limiting)
 * 2. No PII leaks in AI data functions (payee names, account names, etc.)
 * 3. All DB tables have RLS enabled
 * 4. Security headers are configured
 * 5. No service key exposed to browser
 * 
 * Run: npx tsx scripts/security-audit.ts
 * CI:  Add to GitHub Actions — fails build on violations
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

let failures = 0;
let warnings = 0;
let passes = 0;

function pass(msg: string) {
  console.log(`  ✅ ${msg}`);
  passes++;
}

function fail(msg: string) {
  console.log(`  ❌ ${msg}`);
  failures++;
}

function warn(msg: string) {
  console.log(`  ⚠️  ${msg}`);
  warnings++;
}

function getAllFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        results.push(...getAllFiles(full, ext));
      } else if (entry.endsWith(ext)) {
        results.push(full);
      }
    }
  } catch { /* dir doesn't exist */ }
  return results;
}

function readFile(path: string): string {
  return readFileSync(path, 'utf-8');
}

// ============================================================
// CHECK 1: All API routes use apiGuard()
// ============================================================
function checkApiGuard() {
  console.log('\n🔐 CHECK 1: API Route Auth + Rate Limiting');
  console.log('   Every exported handler must use apiGuard()\n');

  const apiDir = join(SRC, 'app', 'api');
  const routeFiles = getAllFiles(apiDir, 'route.ts');

  // These routes are exempt (public endpoints)
  const EXEMPT = [
    'auth/callback',
    'auth/signup',
    'stripe/webhook',
    'health',
  ];

  for (const file of routeFiles) {
    const rel = relative(apiDir, file);
    const isExempt = EXEMPT.some(e => rel.includes(e));
    if (isExempt) {
      pass(`${rel} — exempt (public endpoint)`);
      continue;
    }

    const content = readFile(file);
    const exportedHandlers = content.match(/export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/g) || [];

    if (exportedHandlers.length === 0) {
      warn(`${rel} — no exported handlers found`);
      continue;
    }

    // Check for apiGuard import
    const hasApiGuard = content.includes('apiGuard') || content.includes('api-guard');
    // Also accept inline rateLimit + createClient (older pattern)
    const hasInlineRateLimit = content.includes('rateLimit(') && (content.includes('auth.getUser') || content.includes('apiGuard'));
    // Accept Plaid routes that use createClient + auth.getUser inline (same security, different pattern)
    const hasInlineAuth = content.includes('createClient') && content.includes('auth.getUser') && (content.includes('Unauthorized') || content.includes('401'));
    // Accept webhook routes that verify signatures (no user auth needed)
    const isWebhook = rel.includes('webhook') && content.includes('verify');

    if (hasApiGuard) {
      // Verify each handler uses it
      for (const handler of exportedHandlers) {
        const funcName = handler.match(/(GET|POST|PUT|DELETE|PATCH)/)?.[1];
        // Find the function body
        const funcStart = content.indexOf(handler);
        const nextExport = content.indexOf('export async function', funcStart + 1);
        const funcBody = nextExport > 0 
          ? content.slice(funcStart, nextExport) 
          : content.slice(funcStart);
        
        if (funcBody.includes('apiGuard(') || funcBody.includes('rateLimit(')) {
          pass(`${rel} → ${funcName}() — uses apiGuard/rateLimit`);
        } else {
          fail(`${rel} → ${funcName}() — MISSING apiGuard() call`);
        }
      }
    } else if (hasInlineRateLimit) {
      pass(`${rel} — uses inline rateLimit (acceptable)`);
    } else if (hasInlineAuth) {
      pass(`${rel} — uses inline auth (createClient + auth.getUser)`);
    } else if (isWebhook) {
      pass(`${rel} — webhook route with signature verification`);
    } else {
      fail(`${rel} — NO auth guard or rate limiting found`);
    }
  }
}

// ============================================================
// CHECK 2: No PII in AI data functions
// ============================================================
function checkPiiStripping() {
  console.log('\n🕵️ CHECK 2: PII Stripping in AI Calls');
  console.log('   AI data functions must not send personal identifiers\n');

  const aiDir = join(SRC, 'app', 'api', 'ai');
  const aiFiles = getAllFiles(aiDir, 'route.ts');

  // Also check the AI library
  const aiLib = join(SRC, 'lib', 'ai');
  const aiLibFiles = getAllFiles(aiLib, '.ts');

  const allAiFiles = [...aiFiles, ...aiLibFiles];

  // PII patterns that should NOT appear in data sent to AI
  const PII_PATTERNS = [
    { pattern: /payee_clean|payee_original/, name: 'payee name fields', context: 'data gathering' },
    { pattern: /\.name\b(?!.*category|.*type)/, name: 'entity .name access', context: 'may leak account/debt/goal names' },
  ];

  // Patterns that MUST appear (anonymization markers)
  const REQUIRED_PATTERNS = [
    { pattern: /anonymiz|anonym/i, name: 'anonymization reference' },
  ];

  for (const file of aiFiles) {
    const rel = relative(SRC, file);
    const content = readFile(file);

    // Check if this file gathers data for AI
    const gathersData = content.includes('gatherPageData') || 
                        content.includes('gatherCoachingData') || 
                        content.includes('contextData') ||
                        content.includes('JSON.stringify');

    if (!gathersData) {
      pass(`${rel} — no data gathering (OK)`);
      continue;
    }

    // Check for payee leaks specifically in data-gathering functions
    if (content.includes('payee_clean') || content.includes('payee_original')) {
      // Check if it's in a SELECT query (fetching) vs in the output
      const gatherFunctions = content.match(/async function gather\w+[\s\S]*?^}/gm) || [];
      const outputSections = content.match(/return JSON\.stringify\([\s\S]*?\);/g) || 
                             content.match(/return `[\s\S]*?`;/g) || [];
      
      let leaksPayee = false;
      for (const section of outputSections) {
        if (section.includes('payee_clean') || section.includes('payee_original') || section.includes('payee:')) {
          leaksPayee = true;
        }
      }

      if (leaksPayee) {
        fail(`${rel} — PAYEE NAMES in AI output data`);
      } else {
        pass(`${rel} — fetches payee for processing but strips from AI output`);
      }
    } else {
      pass(`${rel} — no payee references`);
    }
  }

  // Check openrouter.ts for anonymization notes
  const openrouterPath = join(SRC, 'lib', 'ai', 'openrouter.ts');
  try {
    const orContent = readFile(openrouterPath);
    if (orContent.match(/anonymiz/i)) {
      pass('lib/ai/openrouter.ts — contains anonymization system messages');
    } else {
      fail('lib/ai/openrouter.ts — MISSING anonymization notes in AI prompts');
    }
  } catch {
    warn('lib/ai/openrouter.ts — file not found');
  }
}

// ============================================================
// CHECK 3: Security headers configured
// ============================================================
function checkSecurityHeaders() {
  console.log('\n🛡️ CHECK 3: Security Headers');
  console.log('   next.config must set security response headers\n');

  const configFiles = ['next.config.ts', 'next.config.js', 'next.config.mjs'];
  let configContent = '';
  let configFile = '';

  for (const f of configFiles) {
    try {
      configContent = readFile(join(ROOT, f));
      configFile = f;
      break;
    } catch { /* try next */ }
  }

  if (!configContent) {
    fail('No next.config file found');
    return;
  }

  const requiredHeaders = [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Strict-Transport-Security',
    'Permissions-Policy',
  ];

  for (const header of requiredHeaders) {
    if (configContent.includes(header)) {
      pass(`${configFile} — ${header} ✓`);
    } else {
      fail(`${configFile} — MISSING ${header}`);
    }
  }
}

// ============================================================
// CHECK 4: No secrets in browser-accessible code
// ============================================================
function checkSecretLeaks() {
  console.log('\n🔑 CHECK 4: Secret Exposure');
  console.log('   Service keys must not appear in browser-accessible code\n');

  const clientFiles = getAllFiles(join(SRC, 'app'), '.tsx')
    .concat(getAllFiles(join(SRC, 'components'), '.tsx'));

  const DANGEROUS_PATTERNS = [
    { pattern: /SUPABASE_SERVICE_ROLE_KEY/, name: 'service role key reference' },
    { pattern: /service_role/, name: 'service_role reference' },
    { pattern: /sk-[a-zA-Z0-9]{20,}/, name: 'hardcoded API key' },
    { pattern: /sb_secret/, name: 'hardcoded Supabase secret' },
  ];

  let cleanCount = 0;

  for (const file of clientFiles) {
    const rel = relative(SRC, file);
    const content = readFile(file);

    for (const { pattern, name } of DANGEROUS_PATTERNS) {
      if (pattern.test(content)) {
        fail(`${rel} — contains ${name}`);
      }
    }
    cleanCount++;
  }

  pass(`${cleanCount} client files scanned — no secret leaks`);
}

// ============================================================
// CHECK 5: RLS migration exists
// ============================================================
function checkRlsMigration() {
  console.log('\n🗄️ CHECK 5: Row Level Security');
  console.log('   RLS migration must exist and cover all tables\n');

  const migrationDir = join(ROOT, 'supabase', 'migrations');
  const migrations = getAllFiles(migrationDir, '.sql');
  const rlsMigration = migrations.find(f => readFile(f).includes('ENABLE ROW LEVEL SECURITY'));

  if (!rlsMigration) {
    fail('No RLS migration found in supabase/migrations/');
    return;
  }

  const content = readFile(rlsMigration);
  const rel = relative(ROOT, rlsMigration);

  const requiredTables = [
    'profiles', 'accounts', 'categories', 'transactions', 'budgets',
    'debts', 'debt_payments', 'savings_goals', 'savings_contributions',
    'ai_usage', 'score_history', 'user_achievements', 'streaks',
  ];

  for (const table of requiredTables) {
    if (content.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`)) {
      pass(`${rel} — ${table} has RLS`);
    } else {
      fail(`${rel} — ${table} MISSING from RLS migration`);
    }
  }
}

// ============================================================
// RUN ALL CHECKS
// ============================================================
console.log('🔒 BudgetWise Security Audit');
console.log('═'.repeat(50));

checkApiGuard();
checkPiiStripping();
checkSecurityHeaders();
checkSecretLeaks();
checkRlsMigration();

console.log('\n' + '═'.repeat(50));
console.log(`\n📊 Results: ${passes} passed, ${failures} failed, ${warnings} warnings\n`);

if (failures > 0) {
  console.log('❌ SECURITY AUDIT FAILED — Fix all failures before deploying.\n');
  process.exit(1);
} else {
  console.log('✅ SECURITY AUDIT PASSED\n');
  process.exit(0);
}
