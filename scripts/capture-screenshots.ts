/**
 * Captures the README images from the real app: one screenshot per screen in
 * both themes, the hero image, and a short demo GIF.
 *
 *   make screenshots
 *
 * The script builds nothing itself: it starts `vite preview` on the existing
 * production build, plays two weeks of training so the charts and the muscle
 * map have something to show, and writes everything to docs/assets/.
 * The GIF needs ffmpeg on the PATH and is skipped without it.
 */
import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { type Browser, chromium, type Page } from '@playwright/test';
import sharp from 'sharp';

const root = join(import.meta.dirname, '..');
const assets = join(root, 'docs', 'assets');
const screens = join(assets, 'screens');
const PORT = 4174;
const URL = `http://localhost:${PORT}`;
const PHONE = { width: 390, height: 844 };

type Theme = 'dark' | 'light';

/** Sessions of the first two plan weeks that the demo user has finished. */
const DONE = ['2026-10-12', '2026-10-14', '2026-10-16', '2026-10-19', '2026-10-21'];
/** The day the screenshots are taken on: a Friday with a session due. */
const TODAY = '2026-10-23';

async function startPreview(): Promise<ChildProcess> {
  const server = spawn(
    'pnpm',
    ['exec', 'vite', 'preview', '--port', String(PORT), '--strictPort'],
    {
      cwd: root,
      stdio: 'ignore',
    },
  );
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      if ((await fetch(URL)).ok) return server;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  server.kill();
  throw new Error('The preview server did not start. Run `make build` first.');
}

const at = (date: string, time = '18:00:00') => new Date(`${date}T${time}`);

/** Plays two weeks of training and three weigh-ins through the real UI. */
async function seed(page: Page): Promise<void> {
  for (const [index, date] of DONE.entries()) {
    await page.clock.setFixedTime(at(date));
    await page.goto(`${URL}/#/session/${date}`);
    if (index > 0) await page.reload();
    await page.getByRole('button', { name: 'Mark as done' }).waitFor();
    // A few honest ratings make the progress charts move.
    if (index % 2 === 0) await page.getByRole('button', { name: 'Easy' }).first().click();
    await page.getByRole('button', { name: 'Mark as done' }).click();
    await page.waitForTimeout(700);
  }

  await page.goto(`${URL}/#/body`);
  const weighIns: [string, Record<string, string>][] = [
    ['2026-09-01', { 'Weight, kg': '82.4', 'Neck, cm': '38', 'Waist, cm': '88', 'Arm, cm': '36' }],
    ['2026-09-22', { 'Weight, kg': '81.9', 'Waist, cm': '87' }],
    [
      '2026-10-10',
      { 'Weight, kg': '81.2', 'Neck, cm': '38', 'Waist, cm': '86', 'Arm, cm': '36.5' },
    ],
  ];
  for (const [date, values] of weighIns) {
    await page.getByRole('button', { name: 'Log' }).click();
    await page.getByLabel('Date').first().fill(date);
    for (const [label, value] of Object.entries(values)) await page.getByLabel(label).fill(value);
    await page.getByRole('button', { name: 'Save' }).click();
  }
  await page.waitForTimeout(700);

  await page.clock.setFixedTime(at(TODAY, '08:00:00'));
  await page.reload();
}

/** Loads every lazy image and waits for fonts, so nothing is half-rendered. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    for (const image of document.images) image.loading = 'eager';
    await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
    await document.fonts.ready;
  });
  await page.waitForTimeout(400);
}

async function shoot(page: Page, name: string, theme: Theme): Promise<Buffer> {
  await settle(page);
  const png = await page.screenshot({ type: 'png' });
  const optimized = await sharp(png).png({ palette: true, quality: 90, effort: 10 }).toBuffer();
  await sharp(optimized).toFile(join(screens, `${name}-${theme}.png`));
  console.log(`+ docs/assets/screens/${name}-${theme}.png`);
  return optimized;
}

async function captureScreens(browser: Browser, theme: Theme): Promise<Record<string, Buffer>> {
  const context = await browser.newContext({
    viewport: PHONE,
    deviceScaleFactor: 2,
    colorScheme: theme,
    locale: 'en-US',
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  await seed(page);
  const shots: Record<string, Buffer> = {};

  await page.goto(`${URL}/#/plan`);
  await page.getByRole('link', { name: 'Start workout' }).waitFor();
  shots.plan = await shoot(page, 'plan', theme);

  await page.goto(`${URL}/#/muscles?mode=done&muscle=chest`);
  await page.getByRole('region', { name: 'Chest details' }).waitFor();
  shots.muscles = await shoot(page, 'muscles', theme);

  await page.goto(`${URL}/#/progress`);
  await page.getByRole('table').first().waitFor();
  shots.progress = await shoot(page, 'progress', theme);

  await page.goto(`${URL}/#/library?muscle=chest`);
  await page.getByRole('searchbox').waitFor();
  shots.library = await shoot(page, 'library', theme);

  await page.goto(`${URL}/#/body`);
  await page.getByRole('img', { name: 'Weight over time' }).waitFor();
  shots.body = await shoot(page, 'body', theme);

  // The workout last: ticking sets starts the rest timer.
  await page.goto(`${URL}/#/session/${TODAY}`);
  const card = page.getByRole('article').first();
  await card.getByRole('button', { name: 'Set 1, current' }).click();
  await card.getByRole('button', { name: 'Set 2, current' }).click();
  await card.getByRole('button', { name: 'On plan' }).click();
  await card.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -12));
  shots.workout = await shoot(page, 'workout', theme);

  await context.close();
  return shots;
}

const font = (path: string) =>
  readFileSync(join(root, 'node_modules', '@fontsource-variable', path)).toString('base64');

/** The README hero: the pitch on the left, three real screens on the right. */
function heroHtml(theme: Theme, shots: Record<string, Buffer>): string {
  const c =
    theme === 'dark'
      ? {
          bg: '#110F0D',
          ink: '#F4EFE9',
          muted: '#A69D93',
          soft: '#C9C0B6',
          surface: '#1A1714',
          line: '#2E2924',
          accent: '#FF6A2B',
          heat: '#FF3E5B',
          good: '#3DD6A8',
          frame: '#2A2420',
          frameMain: '#3A322B',
          shadow: 'rgba(0,0,0,0.5)',
        }
      : {
          bg: '#F6F1EB',
          ink: '#1A1512',
          muted: '#6E655C',
          soft: '#4F463E',
          surface: '#FFFFFF',
          line: '#E2D9CF',
          accent: '#F05A1A',
          heat: '#D9304A',
          good: '#12A47C',
          frame: '#D9D0C6',
          frameMain: '#C9BFB3',
          shadow: 'rgba(60,38,20,0.22)',
        };
  const image = (name: string) => `data:image/png;base64,${shots[name]?.toString('base64') ?? ''}`;
  const phone = (name: string, left: number, top: number, width: number, main = false) => `
    <img src="${image(name)}" alt="" style="position:absolute;left:${left}px;top:${top}px;width:${width}px;
      border-radius:${main ? 34 : 30}px;border:${main ? 6 : 5}px solid ${main ? c.frameMain : c.frame};
      box-shadow:0 ${main ? 40 : 30}px ${main ? 80 : 60}px ${c.shadow}">`;
  const pill = (color: string, label: string) =>
    `<span class="pill"><span style="width:8px;height:8px;border-radius:50%;background:${color}"></span>${label}</span>`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:Archivo;src:url(data:font/woff2;base64,${font('archivo/files/archivo-latin-wdth-normal.woff2')}) format('woff2');font-weight:100 900;font-stretch:62% 125%}
    @font-face{font-family:Geist;src:url(data:font/woff2;base64,${font('geist/files/geist-latin-wght-normal.woff2')}) format('woff2');font-weight:100 900}
    @font-face{font-family:'Geist Mono';src:url(data:font/woff2;base64,${font('geist-mono/files/geist-mono-latin-wght-normal.woff2')}) format('woff2');font-weight:100 900}
    body{margin:0}
    .hero{position:relative;width:1280px;height:640px;overflow:hidden;background:${c.bg};color:${c.ink};font-family:Geist,sans-serif}
    .disp{font-family:Archivo,sans-serif;font-stretch:125%;font-weight:800;letter-spacing:-0.015em}
    .pill{display:flex;align-items:center;gap:8px;height:38px;padding:0 14px;border-radius:999px;background:${c.surface};border:1px solid ${c.line};font-size:15px}
  </style></head><body><div class="hero">
    <div style="position:absolute;left:820px;top:140px;width:380px;height:380px;border-radius:50%;background:${c.accent};opacity:0.16;filter:blur(90px)"></div>
    <div style="position:absolute;left:76px;top:70px;width:600px;display:flex;flex-direction:column;gap:26px">
      <div style="display:flex;align-items:center;gap:12px">
        <svg width="44" height="44" viewBox="0 0 30 30"><rect width="30" height="30" rx="9" fill="${c.accent}"/><path d="M7.5 15.5 L15 9 L22.5 15.5" fill="none" stroke="#1A0E07" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 21 H20 M10 18.5 V23.5 M20 18.5 V23.5" fill="none" stroke="#1A0E07" stroke-width="2.6" stroke-linecap="round"/></svg>
        <span class="disp" style="font-size:28px;letter-spacing:-0.02em">homebody</span>
      </div>
      <h1 class="disp" style="margin:0;font-size:62px;line-height:0.98">Your home gym, planned like a <span style="color:${c.accent}">pro.</span></h1>
      <p style="margin:0;font-size:20px;line-height:1.45;color:${c.soft};max-width:540px">An open-source workout planner that turns the gear you own into a progressive-overload plan, and shows every muscle you trained on a live heat map.</p>
      <div style="display:flex;flex-wrap:wrap;gap:10px">${pill(c.accent, 'Load calculator')}${pill(c.heat, 'Muscle heat map')}${pill(c.good, 'Offline · no sign-up')}</div>
      <div style="display:flex;gap:22px;font-family:'Geist Mono',monospace;font-size:14px;color:${c.muted};letter-spacing:0.04em"><span>141 exercises</span><span>EN · RU</span><span>PWA</span><span>MIT</span></div>
    </div>
    ${phone('plan', 706, 118, 226)}${phone('workout', 1032, 118, 226)}${phone('muscles', 846, 56, 265, true)}
  </div></body></html>`;
}

async function captureHero(
  browser: Browser,
  theme: Theme,
  shots: Record<string, Buffer>,
): Promise<void> {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 640 },
    deviceScaleFactor: 2,
  });
  await page.setContent(heroHtml(theme, shots));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const png = await page.screenshot({ type: 'png' });
  await sharp(png)
    .png({ palette: true, quality: 90, effort: 10 })
    .toFile(join(assets, `hero-${theme}.png`));
  console.log(`+ docs/assets/hero-${theme}.png`);
  await page.close();
}

/** Records a short walk through the app and converts it to a GIF with ffmpeg. */
async function captureDemo(browser: Browser): Promise<void> {
  if (spawnSync('ffmpeg', ['-version']).status !== 0) {
    console.log('! ffmpeg not found: docs/assets/demo.gif was not updated');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'homebody-demo-'));
  const context = await browser.newContext({
    viewport: PHONE,
    colorScheme: 'dark',
    locale: 'en-US',
    serviceWorkers: 'block',
    recordVideo: { dir, size: PHONE },
  });
  const page = await context.newPage();
  await seed(page);
  const pause = (ms = 900) => page.waitForTimeout(ms);

  await page.goto(`${URL}/#/plan`);
  await settle(page);
  // Everything before this point is setup and is cut from the GIF.
  const startedAt = Date.now();
  await pause(1400);
  await page.getByRole('link', { name: 'Start workout' }).click();
  const card = page.getByRole('article').first();
  await card.getByRole('button', { name: 'Set 1, current' }).scrollIntoViewIfNeeded();
  await pause();
  await card.getByRole('button', { name: 'Set 1, current' }).click();
  await pause(1300);
  await page.getByRole('button', { name: '15 seconds more' }).click();
  await pause();
  await page.getByRole('button', { name: 'Skip' }).click();
  await card.getByRole('button', { name: 'Easy' }).click();
  await pause(1300);
  await page.goto(`${URL}/#/muscles?mode=done`);
  await pause(1200);
  // The chest is two mirrored shapes, so it is picked with the keyboard instead of a click
  // at the centre of the pair.
  await page.getByRole('button', { name: /^Chest:/ }).focus();
  await page.keyboard.press('Enter');
  await pause(1600);
  await page.goto(`${URL}/#/progress`);
  await pause(1800);

  const video = page.video();
  await context.close();
  const path = await video?.path();
  const total = (Date.now() - startedAt) / 1000;
  if (path) {
    // Keep the tail of the recording (the walk), drop the setup at the beginning.
    const filter =
      'fps=10,scale=320:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4';
    const result = spawnSync(
      'ffmpeg',
      ['-y', '-sseof', `-${total.toFixed(1)}`, '-i', path, '-vf', filter, join(assets, 'demo.gif')],
      { stdio: 'ignore' },
    );
    console.log(
      result.status === 0 ? '+ docs/assets/demo.gif' : '! ffmpeg failed to write the GIF',
    );
  }
  for (const file of readdirSync(dir)) rmSync(join(dir, file));
  rmSync(dir, { recursive: true });
}

mkdirSync(screens, { recursive: true });
const server = await startPreview();
const browser = await chromium.launch();
try {
  for (const theme of ['dark', 'light'] as const) {
    const shots = await captureScreens(browser, theme);
    await captureHero(browser, theme, shots);
  }
  await captureDemo(browser);
} finally {
  await browser.close();
  server.kill();
}
