# Verification and release checklist

## 2026-10-10 graphics, maps and gameplay overhaul
- `npm test`: 38 unit/integration tests passed, including new mechanics (chain lightning, shields, splitters, healers, selling, targeting modes, powers, lanes, early calls, stars) and an autoplay bot that wins all six levels (lives lost on the later maps).
- `npm run test:e2e`: 23 checks passed (Chromium, Firefox, production build), including a new controls test for towers 4–5, targeting, selling, speed, early calls and both powers. Stress frames: Firefox ~17 ms, headless Chromium (Canvas fallback) ~43 ms.
- Headless Chromium uses SwiftShader, which cannot create Phaser's WebGL framebuffers, so the game auto-selects Canvas at 1× there; GPU WebGL at 2× was checked by screenshots on an NVIDIA GPU.
- Balance is bot-tuned, not yet human-playtested.


Recorded 2026-10-10. Implementation continues from the `playable-slice` tag
(`ea62f90`), which preserves the three-wave gate before full-content expansion.
The current working tree contains the full game and has not been committed or deployed.

## Automated results

- Clean lockfile install: `npm ci` in an isolated `/tmp` source copy succeeded;
  its 18 unit/integration tests and production build passed without using the
  workspace's existing `node_modules`.
- Workspace `npm test`: 18 tests passed. `npm run build`: strict typecheck and
  root-path static build passed. `git diff --check`: passed.
- `npm run test:e2e`: 19 checks passed: nine development checks in Chromium,
  nine in Firefox, and one real production first-wave session in Chromium.
- Production preview builds into `dist-qa/` under `/release-check/`. Tower
  placement, upgrade, all eight first-wave kills, 20 remaining lives, next-wave
  availability, no HTTP asset failures, and no uncaught errors were verified.
  `?test` exposes no fixture in that build.
- Browser coverage includes pause/resume, simulated hidden-tab pause, win/lose
  fixtures, five restarts, Space activating a focused button, keyboard selection,
  pointer placement after resize, touch placement in Chromium, 2× device scale,
  1280×720 and 960×540 viewports, and the 390×844 portrait prompt.
- Settings coverage includes volume/reduced-motion persistence, paused sound
  changes, malformed JSON, storage writes throwing, blocked optional WAV files,
  and a failed critical map asset offering retry.
- Screenshots of the main game and small-layout pause overlay were inspected.
  The landscape page scrolls vertically on small screens; controls remain reachable.

The production test found and now guards an expiring-particle bug: increasing
effect age past its 600ms lifetime produced a negative Canvas arc radius and
stopped rendering. Age is now capped before drawing. Paused controls no longer
restart music, focused buttons retain Space activation, and reduced motion
suppresses damage flashes and projectile spin. Enemy animation uses simulation
time so pausing freezes it. Result cues can play while music stops.

## Measured performance

Reference: Linux x86_64, AMD Ryzen 7 7800X3D desktop, Node 26.10.0,
Playwright 1.58.2, headless Chromium 145.0.7632.6 (revision 1208) and
Firefox 146.0.1 (revision 1509), Phaser Canvas rendering.
This is not the proposed reference laptop or a real touch device.

The stress fixture starts with 150 Chunkies and 30 mixed towers. A 120-frame
requestAnimationFrame sample in the final combined browser run measured:

| Browser | Average frame interval | p95 |
| --- | ---: | ---: |
| Chromium | 16.53ms | 16.80ms |
| Firefox | 16.55ms | 17.08ms |

These are short scheduler intervals during a changing combat fixture, not GPU
render timings or a universal 60 FPS claim. The automated threshold is a loose
100ms average smoke guard. The scene caps effects at 70, labels at 24 and retained
inactive sprites at 220; long-session memory growth and final-wave profiling
still need measured QA. The production JS bundle is about 342.5KB gzip; Vite's
large-chunk warning remains expected for bundled Phaser.

## Balance evidence and remaining work

Deterministic scripts use production economy and waves, buying/upgrading before
each wave at the cells listed in `tests/integration/session.test.ts`:

| Repeating tower mix | Result | Lives | Combat time | Towers |
| --- | --- | ---: | ---: | ---: |
| Pea / Berry / Frost | Won | 20 | 292.82s | 5 |
| Pea / Berry | Won | 20 | 291.40s | 5 |
| Pea / Frost / Berry / Pea | Won | 20 | 349.05s | 5 |

These are structural/balance smoke checks, not human playtests. Combat alone is
about 4.9–5.8 minutes; deliberation between waves is not measured. Do not declare
the intended 10–15 minute first successful session or tower usefulness validated.

- [ ] Step 5.1: three human full runs and intentional loss; record decisions,
  time, lives, and frustrating moments, then tune data based on that feedback.
- [ ] Step 5.2: Safari/actual Apple device, physical touch device, real tab
  switching, audible music/cue quality, laptop final-wave/stress profiles,
  long-session object/listener growth, and a full accessibility pass.
- [ ] Measure the requested economy/placement/wave branch coverage threshold.
  Assertions pass, but coverage has not been collected.
- [ ] Preserve a committed full-game build before publishing; choose a provider
  and hosting base path, then rerun smoke checks for that path.

## Release and rollback

1. Install with Node 22+ and `npm ci`; install browsers using
   `npx playwright install --with-deps chromium firefox`.
2. Run `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`.
   CI runs these checks from the lockfile. Ports 5173/4173 must be available.
3. Serve `dist/` over HTTP. For a subdirectory, build with the chosen `--base`.
   Original local assets and licenses live in `public/assets/`; replacement
   instructions are in `ASSETS.md`.
4. Archive the verified `dist/` and its commit before deploying. To roll back,
   restore that archive or rebuild its commit. `playable-slice` is the preserved
   prototype fallback, not a prior full-game release. No database migration exists.

No deployment has been performed. Phases 1–4 are implemented; Phase 5 remains
open for the human and device checks above.
