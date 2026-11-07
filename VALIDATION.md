# Revision validation

Complete for the stated revision scope. This is the worker's report, not an independent verification of behavior.

## Scope and reproduction

The accepted React/TypeScript implementation, campaign rules and static export were the starting point. All three reported findings reproduced against that export in Chromium at 390 × 844, served under `/preview/`:

- After Start campaign → Attack: zero canvases, five `.unit` portraits and a gradient field. The separate `#wheel` panel began at y=870.625, below the viewport, and was outside `#game`.
- With the reviewer's running-wheel/round-513 API fixtures and `Math.random=0.5`, the campaign completed in 2, 2 and 4 rounds. It saved 182 credits, three battle wins and one campaign, without an Aura field.

The supplied project's scenery/effects and ending reward were read from upstream. The completion reward is 120 Aura. The inferred qualifying event for this implementation is clearing its third/final battle, Ashwood gate. Rewards remain explicitly simulated browser progress.

## Findings, changes and rechecks

| Finding | Final source | Fix and recheck |
| --- | --- | --- |
| `abd223c182b2e920d291ca16ed68a1480fe9f876dd77cab51274324ac68ff63c` | `src/components/Game.tsx:154`, `src/components/BattleScene.tsx:15`, `src/game/effects.ts:1`, `src/styles.css:375` | Added the two supplied local backgrounds, real Canvas scenery, upstream light/fog/particle/depth treatments, cached defocus and sprite shadows. Native HTML statistics and targets remain in front. Canvas pixels were measured, motion/pause checked, and phone/desktop scenes inspected. |
| `c6aeda4803beeecb1027ce27c8175be22350cea82ca995646c8831da715487ac` | `src/game/battle.ts:15`, `src/game/battle.ts:177`, `src/App.tsx:16`, `src/App.tsx:41`, `src/components/Game.tsx:281` | Added final-victory Aura settlement, result/log copy, persistence, old-save defaults, progress display and reset support. Deterministic result is now exactly 182 credits, 120 Aura, three battles and one campaign. Tested reload, migration, reset and non-qualifying outcomes. |
| `444acc1106db6a67f119612bd35c43f938ad8078dd78139332409b1b99d3544f` | `src/components/LivePanel.tsx:38`, `src/components/Game.tsx:155`, `src/App.tsx:81` | Moved the single telemetry component into the top of the battlefield. A reserved row prevents overlap. Progress is now the first sidebar panel. Tested Refresh, live/stale/offline states, recovery, long values and viewport geometry. |

Applicable checks during implementation also found and fixed:

- Adding the HUD initially pushed target-selection Back below the 390px screen. Compact unit spacing, a short Speed label and the instruction “Choose a highlighted foe for Pip.” brought both Attack and Back to y=789.875–833.875. Their height remains 44px (`src/components/Game.tsx:221`, `src/styles.css:410`).
- Doubling root text in a 320px viewport exposed minimum-content sizing and unwrapped HUD/progress controls. A zero-minimum layout column, wrapping progress rows and a game-container fallback now pass that stress check (`src/styles.css:227`, `src/styles.css:616`).
- Defeated-unit opacity would blend statistics into the new bright scenery. Fading/grayscale now apply to the decorative sprite only; the statistic plate stays opaque (`src/styles.css:454`).

Every requested finding is answered as `fixed` in `.imd-responses.json`.

## Verification commands and results

The repository dependency directory was left untouched. The unchanged package manifest/lockfile and the source/public/tests/configuration were copied into a clean temporary build directory; dependencies were installed there with `npm ci --ignore-scripts --no-audit --no-fund`. The following package scripts ran there successfully, and its generated `dist/` was copied to the repository:

| Command | Actual result |
| --- | --- |
| `npm run typecheck` | Exit 0, TypeScript project check passed |
| `npm test` | Exit 0, 12 tests passed in `tests/battle.test.ts` |
| `npm run build` | Exit 0, 38 modules transformed, complete production export |

Interaction validation ran from the repository root against its exported files:

```sh
TMPDIR=/tmp IMD_PLAYWRIGHT=/opt/imd-tools/playwright-mcp/node_modules/playwright/index.mjs PLAYWRIGHT_BROWSERS_PATH=/opt/imd-tools/ms-playwright node tests/browser.mjs
```

Exit 0: **41 checks passed**, no page script errors or missing local assets. The script serves a bounded local preview and closes it on completion. It covers:

- Ready, command and target states at 320×900, 390×844, 768×1024, 960×900 and 1440×1000; stage-win and final-victory states at 390px.
- The 390px initial Start campaign button, active Attack button, targets and Back on the first screen; no HUD/scene/command overlap at all five widths; no horizontal overflow.
- Natural Tab navigation to Start campaign and Attack, keyboard target activation/focus transfer, and visible target focus in a screenshot; Undo, Defend and Back.
- The exact reported campaign, Aura simulation label, saved values, reload, starting again without an immediate duplicate reward, old-save migration, and confirmed/cancelled reset.
- Real animated Canvas pixels, Pause, reduced-motion stillness, Refresh issuing both requests, unavailable/stale telemetry, and recovery to live.
- Long work-unit/round strings at 320px and 200% root text at both 320 and 768px.
- Rendered contrast on the opaque battle/HUD plates and share-image/favicon requests at a static subpath.

The assignment's pinned probe ran before the final build:

```sh
TMPDIR=/tmp IMD_PLAYWRIGHT=/opt/imd-tools/playwright-mcp/node_modules/playwright/index.mjs PLAYWRIGHT_BROWSERS_PATH=/opt/imd-tools/ms-playwright node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline
```

Exit 0: **16/16 passed**: render, layout, targets, contrast, casing, tracking, eyebrows, type sizes, type faces, glyphs, slogans, repetition, copy budget, chrome, motion and share metadata. Entry-page prose measured 24 words on the first 390px screen. The probe's entry-page measurements are supplemented by the active-battle tests above. The probe is an assignment input, not a source or runtime dependency.

## Better Interface coverage

| Domain | Coverage | Evidence and remaining limits |
| --- | --- | --- |
| Accessibility | Checked | Native named target/command buttons, skip link, focus flow, confirmation, status/log semantics, decorative Canvas, 44px buttons, pause and reduced motion. Keyboard flow exercised; focused screenshot inspected. No screen-reader session or full accessibility certification. |
| Layout | Checked | Ready/battle at five widths, campaign victory at 390px, 320px long-value reflow, doubled text, and measured HUD/scene/command separation. Initial 390px screenshot includes the product and Start campaign. At 320px, battle controls require vertical scrolling. Native browser zoom was not tested. |
| Writing | Checked | Short local target instruction; action labels match behavior; feed error supplies Refresh recovery; victory and progress explicitly identify Aura as simulated. The reset confirmation includes Aura. |
| Typography | Checked | Six declared sizes, one system font stack, three weights; probe measured five rendered sizes per entry viewport. Long telemetry wraps, statistics use tabular numbers, and text enlargement passed. System font rendering on other operating systems was not checked. |
| Colors | Checked | Semantic tokens retained; opaque statistic/HUD backgrounds; status and down states have words. Measured main text `#f6eee3` on `#16120f` at 16.19:1; muted HUD caption `#c2b3a0` on `#16120f` at 9.09:1. These identified pairs exceed 4.5:1. Exhaustive focus-outline contrast over every animated scenery pixel was not measured. |
| UI details | Checked | Existing radii/spacing/buttons preserved; active/target/down/loading/error states inspected; atmosphere remains behind controls; Canvas resizing, pause, reduced motion and cleanup reviewed. No slow-motion DevTools recording or physical-device test. |

Themes, localization, wallet signing and transaction flows are not applicable to this static game revision.

## Evidence and limits

Screenshots inspected and preserved with the source:

- [Battle and HUD at 390×844](docs/evidence/battle-390.png)
- [Battle and progress at 1440×1000](docs/evidence/battle-1440.png)
- [Campaign reward and persisted progress at 390px](docs/evidence/victory-390.png)

Additional inspected screenshots (ready, keyboard focus, offline/reduced motion and long values) and raw test/probe reports were written under `test/scratch/`; that directory is disposable and is not part of the submission. The supplied browser connector could not initialize, so rendering/interaction validation used the installed Playwright Chromium directly.

Fixtures deliberately control wheel status, work units and round; these checks do not certify public API uptime, CORS policy, external sites or a future hosted URL. Screen readers, Safari, Firefox, physical phones and native browser zoom remain unperformed. The 200% result refers to CSS root-text enlargement. LocalStorage can be unavailable or cleared by the browser; the game has no cross-device progress service.

No dependency, lockfile or ignore-rule changes were needed. The runtime export retains relative assets, title, description, favicon, `og:title` and `og:image`. The last rebuild reproduced the exact bytes of the browser-tested export (all 10 files). Export size is 1,102,949 bytes; the complete submission candidate is approximately 2.84 MiB, below the 8 MiB limit. Source/export scenery bytes match, documentation links resolve, required deliverables are not ignored, and `git diff --check` passes. The worker consumes the separately written `.imd-responses.json` control file.
