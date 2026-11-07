# Squeek Warriors

A static, turn-based hamster RPG built with React, TypeScript and Vite. Live Squeekchain telemetry sets the party's battle stance. Three battles lead to Ashwood gate, with simulated SQK credits and a 120 Genesis Aura campaign reward.

## Install and develop

Requires Node.js 22 and npm. Install the locked dependencies, then start Vite:

```sh
npm ci
npm run dev
```

## Check, rebuild and preview

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run build` typechecks and writes the complete static site to root `dist/`. Vite uses `base: './'`; scripts, styles, scenery, favicon and share image resolve relative to the HTML document. Serve `dist/` using a static HTTP server, including at a subpath. The export needs no application server or route rewrites. Source, package manifest, lockfile and the production export are included in this delivery.

The browser regression script serves `dist/` under `/preview/`, starts Chromium, tests the real export, saves its report/screenshots to `test/scratch/interaction/`, and closes its browser and HTTP server. With Playwright available as a module, run `node tests/browser.mjs`. Alternatively, name an existing installation with `IMD_PLAYWRIGHT=/absolute/path/to/playwright/index.mjs node tests/browser.mjs`. Playwright is validation tooling, not a runtime dependency.

## Play

1. Choose **Start campaign**, then give each living hamster one order: Attack, a skill, or Defend.
2. When asked, select a highlighted foe. **Back** cancels target selection; **Undo last order** changes the most recent order.
3. Choose **Resolve round**. Continue after a victory, or retry a lost stage.

Names, HP, SP, orders and the battle report remain text. Targets and commands are native buttons with keyboard support. The battlefield HUD shows wheel state, RPM, observed work units, chain round, connectivity and the last check time. **Refresh** fetches both feeds. **Pause** freezes the scenery effects; reduced-motion preferences also keep the scenery still.

The feeds are `https://api.squeekchain.com/v1/status` and `https://api.squeekchain.com/v1/economy/state`, polled every 20 seconds while the page is visible, with an eight-second request timeout. A running wheel enables Wheel frenzy; resting, stale or unavailable telemetry uses Burrow guard. Battles remain playable when the feeds are unavailable.

A victory pays the stage's SQK base, multiplied by 1.5 in Wheel frenzy, plus the current chain round's last digit when available. Clearing the final battle additionally awards **120 simulated Genesis Aura**. Credits, Aura and win counts accumulate in `localStorage` under `squeek-warriors:v1`. Existing v1 saves receive Aura=0 while retaining their other progress. **Reset** asks for confirmation before clearing these values. Storage restrictions can limit persistence to the current visit. These rewards are local game progress, not transferable assets.

## Scene and reward provenance

The requested project's revision [`034fb9fa0f1031ec262d6eff57c715a212d471b1`](https://github.com/nerotarbo/squeek-warriors/tree/034fb9fa0f1031ec262d6eff57c715a212d471b1) supplies:

- [`public/bg/field.jpg` and `public/bg/battle_main.jpg`](https://github.com/nerotarbo/squeek-warriors/tree/034fb9fa0f1031ec262d6eff57c715a212d471b1/public/bg), bundled locally without changing their bytes. The meadow uses field scenery; later battles use battle_main.
- [`src/game/effects.ts`](https://github.com/nerotarbo/squeek-warriors/blob/034fb9fa0f1031ec262d6eff57c715a212d471b1/src/game/effects.ts), adapted locally for light shafts, fog/mist, dust, hit particles, depth shading and vignette. The adapter also caches real horizon/foreground blur, supports resizing and device pixel density, pauses hidden-page rendering, and keeps the accessible controls in the DOM.
- [`src/game/Game.tsx:503`](https://github.com/nerotarbo/squeek-warriors/blob/034fb9fa0f1031ec262d6eff57c715a212d471b1/src/game/Game.tsx#L503), which establishes the 120 Aura completion reward.

## Validation of this revision

On 2026-11-07, the locked install, production build, typecheck and all 12 Vitest tests passed in an isolated copy of the submitted source. All 41 Chromium interaction checks passed against the exported site at a static subpath. The pinned taste@1 probe passed all 16 checks. Mobile and desktop screenshots were inspected, including the first 390 × 844 screen.

[VALIDATION.md](VALIDATION.md) records reproduction, fixes, all six Better Interface domains, measured contrast and coverage limits. [DESIGN.md](DESIGN.md) describes the final implementation. [Mobile battle](docs/evidence/battle-390.png), [desktop battle](docs/evidence/battle-1440.png) and [campaign reward](docs/evidence/victory-390.png) screenshots are included.

Browser tests use controlled live, stale and failed API responses for repeatable results. They do not establish public API uptime or physical-device behavior. Screen-reader sessions, native browser zoom, Safari and Firefox were not tested. The recorded 200% check enlarges root text in Chromium.
