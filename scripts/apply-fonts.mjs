#!/usr/bin/env node
/**
 * apply-fonts.mjs — Reads font-config.json and updates layout.tsx + globals.css
 * 
 * Usage:
 *   node scripts/apply-fonts.mjs                    # Apply active preset
 *   node scripts/apply-fonts.mjs refined-luxury     # Apply a specific preset
 *   node scripts/apply-fonts.mjs list               # Show all presets
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(__dirname, '../src/lib/fonts/font-config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

const arg = process.argv[2];

if (arg === 'list') {
  console.log('\nAvailable font presets:\n');
  for (const [name, cfg] of Object.entries(config.presets)) {
    const active = name === config.active ? ' ← active' : '';
    console.log(`  ${name.padEnd(22)} display: ${cfg.display}, body: ${cfg.body}${active}`);
  }
  console.log('\nUsage: node scripts/apply-fonts.mjs <preset-name>\n');
  process.exit(0);
}

const presetName = arg || config.active;
const preset = config.presets[presetName];
if (!preset) {
  console.error(`❌ Unknown preset: "${presetName}". Run with "list" to see options.`);
  process.exit(1);
}

console.log(`\n🎨 Applying font preset: ${presetName}`);
console.log(`   Display:  ${preset.display}`);
console.log(`   Heading:  ${preset.heading}`);
console.log(`   Body:     ${preset.body}`);
console.log(`   Mono:     ${preset.mono}`);
console.log(`   Numbers:  ${preset.numbers || preset.display}`);

// Helpers
const toCssVar = (name) => name.toLowerCase().replace(/ /g, '-');
const toImportName = (name) => name.replace(/ /g, '_');
const toCamelCase = (name) => toCssVar(name).replace(/-([a-z])/g, (_, c) => c.toUpperCase());

// Get unique fonts
const uniqueFonts = [...new Set([preset.display, preset.heading, preset.body, preset.mono, preset.numbers].filter(Boolean))];

// Get weights for a font
function getWeights(font) {
  if (font === preset.display) return preset.displayWeights;
  if (font === preset.body) return preset.bodyWeights;
  if (font === preset.mono) return preset.monoWeights;
  if (font === preset.numbers && preset.numbersWeights) return preset.numbersWeights;
  return preset.headingWeights;
}

// 1. Generate layout.tsx
const imports = uniqueFonts.map(f => toImportName(f)).join(', ');
const declarations = uniqueFonts.map(f => {
  const weights = getWeights(f);
  return `const ${toCamelCase(f)} = ${toImportName(f)}({
  variable: "--font-${toCssVar(f)}",
  subsets: ["latin"],
  weight: [${weights.map(w => `"${w}"`).join(', ')}],
});`;
}).join('\n\n');

const classNames = uniqueFonts.map(f => `\${${toCamelCase(f)}.variable}`).join(' ');

const layoutContent = `import type { Metadata } from "next";
import { ${imports} } from "next/font/google";
import "./globals.css";

${declarations}

export const metadata: Metadata = {
  title: "Thallo – Get Financially Fit",
  description: "The only budget app with streaks, levels & challenges. Gamified budgeting powered by AI. Track spending, crush debt, build wealth – and actually have fun doing it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={\`${classNames} antialiased\`}
      >
        {children}
      </body>
    </html>
  );
}
`;

const layoutPath = resolve(__dirname, '../src/app/layout.tsx');
writeFileSync(layoutPath, layoutContent);
console.log('\n✅ Updated src/app/layout.tsx');

// 2. Update globals.css font variables
const cssPath = resolve(__dirname, '../src/app/globals.css');
let css = readFileSync(cssPath, 'utf-8');

const numbers = preset.numbers || preset.display;
const newVars = `  --font-sans: var(--font-${toCssVar(preset.body)});
  --font-mono: var(--font-${toCssVar(preset.mono)});
  --font-display: var(--font-${toCssVar(preset.display)});
  --font-heading: var(--font-${toCssVar(preset.heading)});
  --font-numbers: var(--font-${toCssVar(numbers)});`;

// Replace font variable block
const fontVarRegex = /  --font-sans:.*;\n  --font-mono:.*;\n  --font-display:.*;\n  --font-heading:.*;\n  --font-numbers:.*;\n?/;
if (fontVarRegex.test(css)) {
  css = css.replace(fontVarRegex, newVars + '\n');
} else {
  // Try without heading/numbers (first run)
  const simpleRegex = /  --font-sans:.*;\n  --font-mono:.*;\n  --font-display:.*;\n/;
  if (simpleRegex.test(css)) {
    css = css.replace(simpleRegex, newVars + '\n');
  } else {
    console.log('⚠️  Could not find font variables in globals.css — check manually');
  }
}

writeFileSync(cssPath, css);
console.log('✅ Updated src/app/globals.css');

// 3. Update active preset in config
config.active = presetName;
writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
console.log('✅ Updated active preset in font-config.json');

console.log('\n🚀 Done! Build and deploy to see changes.');
console.log('   npx vercel --prod --yes\n');
