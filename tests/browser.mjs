// Production-export regression checks. Requires an installed Playwright module, not an app dependency.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
const moduleName = process.env.IMD_PLAYWRIGHT;
const { chromium } = await import(moduleName ? pathToFileURL(moduleName).href : 'playwright');
const root = resolve('dist');
const output = resolve('test/scratch/interaction');
await mkdir(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/preview/')) throw Error('Invalid subpath');
    const file = resolve(root, decodeURIComponent(url.pathname.slice('/preview/'.length)));
    if (!file.startsWith(root + '/')) throw Error('Outside export');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/preview/index.html`;
const report = { viewports: [], campaign: {}, checks: [], errors: [] };
const errors = report.errors;
const statusBody = { measurement: { freshness: 'online', coreStatus: 'RUNNING', rpmMilli: 100000, cumulativeWorkUnits: '18553' } };
const economyBody = { status: 'available', lifecycle: { currentRound: '513' }, chain: { chainId: '11155111' } };
let browser;
const check = (name, condition) => { assert.ok(condition, name); report.checks.push(name); };
const rect = (locator) => locator.boundingBox();
const canvasHash = (page) => page.locator('canvas').evaluate((c) => c.toDataURL());
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
async function open(width = 390, height = 844, options = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: options.reduced ? 'reduce' : 'no-preference' });
  const control = { mode: options.mode || 'live', long: false, refreshes: 0 };
  await context.route('https://api.squeekchain.com/v1/**', async (route) => {
    control.refreshes++;
    if (control.mode === 'error') return route.fulfill({ status: 503, json: { error: 'Controlled unavailable feed' } });
    const status = structuredClone(statusBody);
    const economy = structuredClone(economyBody);
    if (control.mode === 'stale') status.measurement.freshness = 'stale';
    if (control.long) {
      status.measurement.cumulativeWorkUnits = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
      economy.lifecycle.currentRound = status.measurement.cumulativeWorkUnits;
    }
    await route.fulfill({ json: route.request().url().endsWith('/status') ? status : economy });
  });
  await context.addInitScript((legacy) => {
    Math.random = () => 0.5;
    if (legacy && !sessionStorage.getItem('legacy-loaded')) {
      localStorage.setItem('squeek-warriors:v1', JSON.stringify(legacy));
      sessionStorage.setItem('legacy-loaded', 'true');
    }
  }, options.legacy);
  context.setDefaultTimeout(7000);
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().startsWith(new URL(url).origin) && response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  await page.goto(url);
  await page.locator('#wheel').getByText(control.mode === 'error' ? 'Offline' : 'Online', { exact: true }).waitFor();
  return { context, page, control };
}
async function geometry(page) {
  return page.evaluate(() => {
    const box = (selector) => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom };
    };
    return { overflow: document.documentElement.scrollWidth > innerWidth, hud: box('#game #wheel'), scene: box('.battle-stage'), command: box('.command') };
  });
}
async function canvasReady(page) {
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas');
    if (!c) return false;
    const { data } = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    const colors = new Set();
    for (let i = 0; i < data.length; i += 400) colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    return colors.size > 200;
  });
}
async function campaign(page) {
  const rounds = [];
  let count = 0;
  for (let guard = 0; guard < 150; guard++) {
    const prompt = await page.locator('.command').innerText();
    if (prompt.includes('kingdom is safe')) { rounds.push(count); return rounds; }
    const next = page.getByRole('button', { name: /^Continue to / });
    if (await next.count()) { rounds.push(count); count = 0; await next.click(); continue; }
    if (prompt.startsWith('Choose ')) { await page.getByRole('button', { name: /^Target / }).first().click(); continue; }
    const resolveButton = page.getByRole('button', { name: 'Resolve round', exact: true });
    if (await resolveButton.count()) { await resolveButton.click(); count++; continue; }
    const preferred = prompt.includes('Mochi') ? page.getByRole('button', { name: /^Ember seeds/ }) : prompt.includes('Bramble') ? page.getByRole('button', { name: /^Thorn lunge/ }) : null;
    if (preferred && await preferred.isEnabled()) await preferred.click();
    else await page.getByRole('button', { name: 'Attack', exact: true }).click();
  }
  throw Error('Campaign did not finish');
}
try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  for (const [width, height] of [[320, 900], [390, 844], [768, 1024], [960, 900], [1440, 1000]]) {
    const { context, page } = await open(width, height);
    const start = await rect(page.getByRole('button', { name: 'Start campaign', exact: true }));
    if (width === 390) check('390: Start campaign is on the first screen', start.y + start.height <= height);
    if (width === 390) await page.screenshot({ path: `${output}/ready-390.png` });
    await page.getByRole('button', { name: 'Start campaign', exact: true }).click();
    await canvasReady(page);
    await page.evaluate(() => scrollTo(0, 0));
    const attack = await rect(page.getByRole('button', { name: 'Attack', exact: true }));
    if (width === 390) check('390: Attack is on the first screen', attack.y + attack.height <= height);
    const initial = await geometry(page);
    check(`${width}: HUD reserves space above the scene and commands`, initial.hud.bottom <= initial.scene.y && initial.scene.bottom <= initial.command.y);
    check(`${width}: no horizontal overflow during battle`, !initial.overflow);
    if (width === 390) {
      report.contrast = await page.evaluate(() => {
        const luminance = (rgb) => rgb.map((n) => {
          const s = n / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        }).reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
        const rgb = (css) => css.match(/[\d.]+/g).map(Number);
        return ['.unit-info .name', '.unit-info .stats', '.hud-state', '.hud-caption', '.hud-facts dd'].map((selector) => {
          const e = document.querySelector(selector);
          const foreground = getComputedStyle(e).color;
          let ancestor = e;
          let background;
          do {
            background = getComputedStyle(ancestor).backgroundColor;
            if (rgb(background).length === 3 || rgb(background)[3] === 1) break;
            ancestor = ancestor.parentElement;
          } while (ancestor);
          const a = luminance(rgb(foreground).slice(0, 3));
          const b = luminance(rgb(background).slice(0, 3));
          return { selector, foreground, background, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
        });
      });
      check('Battle statistics and HUD text meet 4.5:1 on their rendered opaque plates', report.contrast.every((p) => p.ratio >= 4.5));
      const share = await page.locator('meta[property="og:image"]').getAttribute('content');
      const icon = await page.locator('link[rel="icon"]').getAttribute('href');
      check('Share image and favicon resolve at a static subpath',
        (await page.request.get(new URL(share, page.url()).href)).ok() && (await page.request.get(new URL(icon, page.url()).href)).ok());
    }
    await page.getByRole('button', { name: 'Attack', exact: true }).click();
    await page.evaluate(() => scrollTo(0, 0));
    const g = await geometry(page);
    check(`${width}: telemetry remains on screen during targeting`, g.hud.y >= 0 && g.hud.bottom <= height);
    if (width === 390) {
      const back = await rect(page.getByRole('button', { name: 'Back', exact: true }));
      check('390: target selection and Back remain on the first screen', back.y + back.height <= height);
    }
    if (width === 390 || width === 1440) await page.screenshot({ path: `${output}/battle-${width}.png` });
    report.viewports.push({ width, height, start, attack, ...g });
    await context.close();
  }

  const { context, page, control } = await open();
  // Walk the opening interaction by natural Tab navigation and keyboard activation.
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    if (await page.getByRole('button', { name: 'Start campaign', exact: true }).evaluate((e) => e === document.activeElement)) break;
  }
  check('Keyboard reaches Start campaign', await page.getByRole('button', { name: 'Start campaign', exact: true }).evaluate((e) => e === document.activeElement));
  await page.keyboard.press('Enter');
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    if (await page.getByRole('button', { name: 'Attack', exact: true }).evaluate((e) => e === document.activeElement)) break;
  }
  await page.keyboard.press('Enter');
  check('Keyboard focus moves to a target with a visible outline', await page.getByRole('button', { name: /^Target / }).first().evaluate((e) => e === document.activeElement && parseFloat(getComputedStyle(e).outlineWidth) >= 2));
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: `${output}/keyboard-focus-390.png` });
  await page.keyboard.press('Enter');
  check('Keyboard target selection advances to Mochi', (await page.locator('.prompt').innerText()).includes('Mochi'));
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  // Undo/Back must not settle rewards, and the requested commands stay available.
  await page.getByRole('button', { name: 'Undo last order', exact: true }).click();
  await page.getByRole('button', { name: 'Defend', exact: true }).click();
  await page.getByRole('button', { name: 'Undo last order', exact: true }).click();
  await page.getByRole('button', { name: 'Attack', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  check('Undo, Defend and Back preserve command selection', (await page.locator('.prompt').innerText()).includes('Bramble'));
  // Reload gives a clean campaign for the exact reported playthrough.
  await page.reload();
  await page.getByRole('button', { name: 'Start campaign', exact: true }).click();
  await canvasReady(page);
  const a = await canvasHash(page);
  await page.evaluate(() => new Promise((r) => setTimeout(r, 150)));
  check('HD2D atmosphere animates', a !== await canvasHash(page));
  await page.getByRole('button', { name: 'Pause scene effects' }).click();
  await settle(page);
  const paused = await canvasHash(page);
  await page.evaluate(() => new Promise((r) => setTimeout(r, 150)));
  check('Pause freezes the scene', paused === await canvasHash(page));
  await page.getByRole('button', { name: 'Resume scene effects' }).click();
  const requests = control.refreshes;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#wheel').textContent.includes('Online'));
  check('HUD Refresh fetches both feeds', control.refreshes >= requests + 2);
  const rounds = await campaign(page);
  assert.deepEqual(rounds, [2, 2, 4]);
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('squeek-warriors:v1')));
  assert.deepEqual(save, { credits: 182, battlesWon: 3, campaignsWon: 1, genesisAura: 120 });
  check('Victory explicitly labels the 120 Aura simulation', (await page.locator('.command').innerText()).includes('+120 Genesis Aura (simulated)'));
  report.campaign = { rounds, save };
  await page.screenshot({ path: `${output}/victory-390.png`, fullPage: true });
  await page.reload();
  check('Aura and credits survive reload', (await page.locator('.facts').innerText()).includes('120') && (await page.locator('.facts').innerText()).includes('182'));
  await page.getByRole('button', { name: 'Start campaign', exact: true }).click();
  check('Starting another campaign does not re-award Aura', await page.evaluate(() => JSON.parse(localStorage.getItem('squeek-warriors:v1')).genesisAura === 120));
  page.once('dialog', (d) => d.dismiss());
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  check('Cancelling reset retains Aura', await page.evaluate(() => JSON.parse(localStorage.getItem('squeek-warriors:v1')).genesisAura === 120));
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  check('Confirmed reset clears Aura and credits', await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('squeek-warriors:v1')); return s.genesisAura === 0 && s.credits === 0; }));
  await context.close();

  const legacy = await open(390, 844, { legacy: { credits: 7, battlesWon: 1, campaignsWon: 0 } });
  check('Existing v1 saves gain Aura=0 without losing credits', await legacy.page.evaluate(() => { const s = JSON.parse(localStorage.getItem('squeek-warriors:v1')); return s.credits === 7 && s.battlesWon === 1 && s.genesisAura === 0; }));
  await legacy.context.close();

  const offline = await open(390, 844, { mode: 'error', reduced: true });
  await offline.page.getByRole('button', { name: 'Start campaign', exact: true }).click();
  await canvasReady(offline.page);
  check('Unavailable telemetry keeps gameplay available with Burrow guard', (await offline.page.locator('#wheel').innerText()).includes('Burrow guard') && await offline.page.getByRole('button', { name: 'Attack', exact: true }).isEnabled());
  await settle(offline.page);
  const still = await canvasHash(offline.page);
  await offline.page.evaluate(() => new Promise((r) => setTimeout(r, 150)));
  check('Reduced motion freezes Canvas and CSS animations', still === await canvasHash(offline.page) && await offline.page.evaluate(() => document.getAnimations().every((a) => a.playState !== 'running')));
  await offline.page.screenshot({ path: `${output}/offline-reduced-390.png` });
  offline.control.mode = 'live';
  await offline.page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await offline.page.locator('#wheel').getByText('Online', { exact: true }).waitFor();
  check('HUD recovers from offline to live through Refresh', (await offline.page.locator('#wheel').innerText()).includes('18,553'));
  offline.control.mode = 'stale';
  await offline.page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await offline.page.locator('#wheel').getByText('Stale', { exact: true }).waitFor();
  check('Stale feed identifies itself and uses Burrow guard', (await offline.page.locator('#wheel').innerText()).includes('Burrow guard'));
  offline.control.mode = 'live'; offline.control.long = true;
  await offline.page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await offline.page.locator('#wheel').getByText('Online', { exact: true }).waitFor();
  await offline.page.setViewportSize({ width: 320, height: 900 });
  check('Long telemetry values reflow at 320 without overflow', !(await geometry(offline.page)).overflow);
  await offline.page.screenshot({ path: `${output}/long-values-320.png`, fullPage: true });
  await offline.page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await offline.page.screenshot({ path: `${output}/large-text-320.png`, fullPage: true });
  if ((await geometry(offline.page)).overflow) console.log(await offline.page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(e => ({tag:e.tagName, class:e.className, text:e.textContent.slice(0,80), right:e.getBoundingClientRect().right}))));
  check('200% text enlargement at 320 reflows without horizontal overflow', !(await geometry(offline.page)).overflow);
  await offline.page.setViewportSize({ width: 768, height: 1024 });
  check('200% text enlargement at 768 reflows without horizontal overflow', !(await geometry(offline.page)).overflow);
  await offline.context.close();
  check('No script errors or missing local assets in all scenarios', errors.length === 0);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(report, null, 2));
  await browser?.close();
  await new Promise((r) => server.close(r));
}
