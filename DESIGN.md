# Squeek Warriors design

## Overview

This revision retains the established warm, dark hamster RPG interface and its three-battle campaign. The game leads the page; saved progress follows it on phones and sits beside it on desktop. An HD2D scene provides depth behind the units. Opaque statistic plates and a reserved telemetry HUD keep game information separate from scene lighting.

Canonical tokens and layout rules live in `src/styles.css`. The interface uses system fonts and the existing SVG hamster/foe artwork in `src/components/Sprite.tsx`. Scenery is bundled in `public/bg/`.

## Colors

Components use semantic tokens declared in `src/styles.css:2`.

| Semantic token | Value | Use |
| --- | --- | --- |
| `--color-bg` | `#16120f` | Page, HUD and unit statistic plates |
| `--color-surface` | `#1f1915` | Game and progress panels |
| `--color-surface-raised` | `#28211b` | Secondary buttons, chip and hovered target plates |
| `--color-border` | `#3f3429` | Control outlines and structural dividers |
| `--color-text` | `#f6eee3` | Main copy, HP/SP and telemetry values |
| `--color-text-muted` | `#c2b3a0` | Labels, hints and timestamps |
| `--color-accent` | `#f2b84b` | Primary action, current actor and target borders |
| `--color-accent-hover`, `--color-focus` | `#f7cd7a` | Primary hover and keyboard outline |
| `--color-on-accent` | `#1c1306` | Primary action text |
| `--color-status-run`, `--color-hp` | `#79d18a` | Running indicator and health fill |
| `--color-status-rest` | `#a8c8ff` | Resting indicator |
| `--color-status-off`, `--color-hp-low` | `#f0806e` | Feed errors and low health |

Status always includes words as well as a dot. HP includes a numerical value or “Down”. Opaque plates remain opaque for defeated units; only their decorative sprites fade and turn grayscale. Chromium measurements of text on `#16120f`: main text 16.19:1, muted text 9.09:1. Scene art and particles use their own illustration colors, not additional UI status meanings.

## Typography

The `--font-sans` stack is `system-ui`, `-apple-system`, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif. There are no font downloads. Intended weights are 400 for prose, 600 for controls/labels and 700 for headings/emphasis.

| Token | Size at the default root | Role |
| --- | --- | --- |
| `--fs-caption` | 13px / 0.8125rem | Unit statistics, HUD and metadata |
| `--fs-small` | 15px / 0.9375rem | Buttons, hints, progress labels and log |
| `--fs-body` | 16px / 1rem | Body copy and commands |
| `--fs-title` | 20px / 1.25rem | Panel headings |
| `--fs-heading` | 28px / 1.75rem | Phone page title |
| `--fs-display` | 40px / 2.5rem | Page title from 60rem wide |

Body and caption line-height is 1.5; headings use 1.15. Only the page title tightens tracking to -0.02em. Headings balance and prose wraps with `pretty`. The lead has a 38rem measure; explanatory copy has a 36rem measure. `.num` enables tabular digits. Telemetry, order text and long progress values can wrap without ellipses.

## Layout

Spacing tokens are 4, 8, 12, 16, 24 and 32px (`--space-1/2/3/4/6/8`); the compact unit information plate also uses a 2px inset/gap. `.wrap` caps content at 72rem and uses 16px side padding plus safe-area insets.

`.layout` starts as one `minmax(0, 1fr)` column. At 60rem, it becomes a flexible game column and a 22rem progress column, separated by 16px. Game panels use 16px padding, increasing to 24px at 40rem. Explanatory lists become three columns at 48rem. The header chip hides its longer state prefix below 30rem while retaining the stance.

`.field` is a grid containing the HUD followed by `.battle-stage`. The HUD has a normal-flow reserved row and `z-index: 1`; it cannot cover units or commands. Its four facts form two columns, with wrapping values. `.battle-stage` arranges foes above the party; the canvas fills its background. The commands and battle report follow the field.

`.game-body` is an inline-size container named `game`. At a container width of 15rem or less, the HUD actions wrap, facts use one column, and roster/battle rows stack. Panel headings and progress rows wrap too. This handles enlarged text without concealing values. At 390 × 844 with the tested live feed, Start campaign ends at y=658.875; Attack and target-selection Back end at y=833.875. At 320px wide, battle commands may require vertical scrolling.

Rendered checks covered 320, 390, 768, 960 and 1440px widths; 200% root text was also checked at 320 and 768px. Native browser zoom and physical-device behavior remain unverified.

## Elevation & Depth

Panels use tonal separation rather than box shadows. Borders identify controls and actor/target state. Unit sprites use a small decorative drop shadow to sit on the scenery; their statistic plates stay flat and opaque.

`BattleScene` in `src/components/BattleScene.tsx` draws local scenery with cover cropping, cached 3px blur across the top 17% and bottom 12%, and the light-shaft, fog, mist, particle, depth-shading and vignette functions in `src/game/effects.ts`. The scene is decorative (`aria-hidden`, no pointer events), behind the units in an isolated stacking context. Text and targeting remain native HTML. Canvas resolution follows its rendered size with device pixel ratio capped at 2.

## Shapes

Radius tokens are 8px for buttons/units, 12px for the field and 16px for outer panels. Statistic plates use a 4px radius. Chips and health bars are pill-shaped. The canvas inherits the stage's 8px radius; it does not clip text or controls. Normal buttons have 1px borders; actor and target outlines use 2px. Target outlines are dashed; the current actor outline is solid.

## Components

| Component / pattern | Source | Behavior |
| --- | --- | --- |
| `Game` | `src/components/Game.tsx` | Campaign stages, order/target selection, Undo, Back, resolve, retry, continuation and victory. Phase changes focus the game heading; removed command buttons hand focus to the next command or target. |
| `UnitCard` and `Sprite` | `src/components/Game.tsx`, `src/components/Sprite.tsx` | Free-standing decorative sprite plus opaque name/HP/SP/order plate. Living selectable foes become native named buttons. Current, target, hurt and down states retain static cues. |
| `LivePanel` | `src/components/LivePanel.tsx` | In-game telemetry HUD, polite wheel-state announcement, work units, round, speed, connectivity, stance, timestamp and Refresh. Loading, live, stale and error states are explicit. During battle it also exposes Pause/Resume with `aria-pressed`. |
| `LiveChip` | `src/components/LivePanel.tsx` | Header link to the single `#wheel` HUD. |
| `BattleScene` | `src/components/BattleScene.tsx` | Local scenic rendering and atmospheric effects. Pause, reduced motion and hidden-page states stop animation; observers/listeners/frames are cleaned up. |
| `.btn`, `.btn-primary`, `.btn-quiet` | `src/styles.css` | 44px minimum height; neutral, primary and quiet styles; disabled, hover, active and focus states. Named transitions last 150ms with `cubic-bezier(0.2, 0, 0, 1)`; press scale is 0.96. |
| Progress panel | `src/App.tsx` | SQK, Genesis Aura, battles and campaigns; explicit simulation copy and confirmed reset. Existing v1 saves default the new Aura counter to zero. |

Global `:focus-visible` has a 2px `--color-focus` outline with 2px offset. There is a skip link to the game. Hurt motion runs once for 360ms; actor bobbing runs twice for 900ms per cycle, only without a reduced-motion preference. Reduced motion disables health-bar transitions and freezes the Canvas atmosphere. Names, values and logs remain selectable text.

## Do's and Don'ts

- Start from `.wrap`, `.layout`, `.panel` and the existing semantic tokens. Keep commands close to their instructions.
- Give the next primary game action `.btn-primary`; leave peers neutral or quiet.
- Keep the telemetry row and statistic plates opaque when changing scenery. Preserve native target buttons, labels, numerical HP and focus handling.
- Keep reward copy explicitly simulated. `CAMPAIGN_AURA` in `src/game/battle.ts` is the 120-point completion award.
- Bundle new runtime images locally and use relative URLs. Recheck all supported widths, the 390px first screen, reduced motion and the saved-progress flow after a change.

Design review followed Jakub Krehel's Better Interface guidance (MIT, pinned commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`). This documentation structure is adapted from Paul Bakaus's Impeccable documentation guidance (Apache-2.0, pinned commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`). License notices are in `docs/DESIGN-GUIDANCE-LICENSE.txt`. Review evidence and unperformed checks are in [VALIDATION.md](VALIDATION.md).
