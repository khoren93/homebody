/**
 * Renders the app icons from the Homebody mark. Run it after changing the
 * mark: `node scripts/build-icons.ts`. The PNGs are committed.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';

const out = join(import.meta.dirname, '..', 'public', 'icons');
mkdirSync(out, { recursive: true });

const ACCENT = '#FF6A2B';
const INK = '#1A0E07';

/** The mark on a 30 × 30 grid: a roofline over a barbell. */
const lines = `
  <path d="M7.5 15.5 L15 9 L22.5 15.5" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M10 21 H20 M10 18.5 V23.5 M20 18.5 V23.5" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;

/** Rounded square, as used in the browser tab and on home screens that do not mask. */
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><rect width="30" height="30" rx="9" fill="${ACCENT}"/>${lines}</svg>`;

/** Full-bleed square with the mark inside the safe zone, for platforms that apply their own mask. */
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><rect width="30" height="30" fill="${ACCENT}"/><g transform="translate(15 15) scale(0.72) translate(-15 -15)">${lines}</g></svg>`;

const icons: [name: string, svg: string, size: number][] = [
  ['icon-192.png', rounded, 192],
  ['icon-512.png', rounded, 512],
  ['maskable-512.png', maskable, 512],
  ['apple-touch-icon.png', maskable, 180],
];

for (const [name, svg, size] of icons) {
  await sharp(Buffer.from(svg), { density: 600 }).resize(size, size).png().toFile(join(out, name));
  console.log(`+ public/icons/${name}`);
}
