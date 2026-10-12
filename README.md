# Tower Tantrum
A colorful, locally bundled Phaser **3.90** tower-defense game. Defend eleven themed lands (152 waves) with Pea Poppers, splash-firing Boom Berries, slowing Frosty Cones, chain-lightning Zappy Zinnias and armor-piercing Sunbeam Snipers. Towers aim, recoil and grow through three visual tiers; grumps shield, heal, split and summon; two powers, early wave calls, 1–3× speed and star ratings keep every run lively.

## Run
Node 22+ (tested here on Node 26). Dependencies are pinned in package.json and package-lock.json.

```sh
npm ci
npm run dev
```
Open the Vite URL (normally http://localhost:5173).

```sh
npm run typecheck
npm test
npx playwright install chromium firefox
npm run test:e2e
npm run build
npm run preview
```
Production output is `dist/`. Serve it over HTTP; do not open index.html as a local file. For subdirectory deployment, build with `npm run build -- --base=/your-path/` (or configure Vite base before building). Runtime assets resolve using Vite's BASE_URL. No deployment provider is assumed.

## Controls
- Start with **Let's defend!**. Pick a tower card (keys **1–5**) and tap open ground beside the path.
- Ghost tower, attack radius, highlighted legal cells and the hint explain placement validity. Preview is free.
- Tap a tower to inspect it, **upgrade** (**U**), change **targeting** First/Last/Strong/Close (**T**), or **sell** for 70% of everything invested.
- **Send wave** or **Space** starts the next wave. During a wave the same button **calls the next wave early** for bonus coins; every wave's completion bonus pays out when the field clears.
- Powers (only during waves): **Sugar Bomb** (**Q**, then tap a target) blasts a radius; **Big Chill** (**W**) slows every grump for four seconds. Both recharge.
- **F** or the speed button cycles 1×/2×/3×. **Escape**, right-click, or Cancel clears selection. **P** pauses.
- Victories award 1–3 stars by lives kept; your best is saved locally and shown in the level picker.
- Settings/help pauses combat. Hidden tabs pause. Header mute/volume and reduced motion persist locally; missing/blocked audio is non-fatal.
- Landscape-first, touch-friendly controls; narrow portrait displays a rotate prompt.

## Architecture
`src/game/core/{types,simulation}.ts` is a deterministic, DOM/Phaser-free 60-tick simulation. Commands validate placement, economy, upgrades, phase transitions. Simulation emits domain events; the scene consumes them for sounds and effects. Rendering/input never apply damage or spend coins directly.

`src/game/data/definitions.ts` owns balance, tower levels, enemies, and the first level's waves; `levels.ts` authors every map's lanes, reserved scenery and campaign. `map.ts` owns multi-lane route geometry (cached segment lengths), sampling and legal build cells. Towers target by their chosen mode; IDs break ties. Projectile attack values freeze when fired. Splash continues to a captured destination, single-target shots expire when their target dies. Slows refresh by strength and use the strongest active value.

`src/game/presentation/GameScene.ts` drives a clamped, capped fixed-step accumulator (scaled by game speed), pooled sprites, particle emitters, shockwaves, lightning, banners and screen shake. `mapArt.ts` generates each themed map as SVG from the lane geometry at startup, so art can never drift from the paths. `Audio.ts` uses local HTMLAudio cues with concurrency caps and guarded settings storage. `src/game/ui/Hud.ts` renders accessible DOM buttons outside map input. `src/game/assets/manifest.ts` maps semantic keys to replaceable local assets.

Original art/audio generation is reproducible with `python3 scripts/assets.py`. See `public/assets/ASSETS.md` and `LICENSES.md` for replacement contracts and provenance. Rendering uses WebGL at 2× resolution on real GPUs and falls back to Canvas at 1× when WebGL is software-emulated (SwiftShader/llvmpipe cannot create Phaser's framebuffers and is slower than Canvas 2D). Force either with `?renderer=webgl` or `?renderer=canvas`.

Tests: placement/economy, combat effects, targeting, projectile lifecycle, terminal priorities, deterministic batching, production mixed-strategy full sessions, Chromium/Firefox interaction/end-screen/stress checks, and a real first-wave session against a production build at `/release-check/`. Browser checks also cover touch (Chromium), high DPI, resize, keyboard buttons, restart, settings persistence/failure, and missing assets. `npm run test:e2e` starts its own servers on ports 5173/4173 and writes its isolated production build to ignored `dist-qa/`. Development-only `?test` fixtures are tree-shaken from the production build.

## Release status
See `docs/QA.md` for measured results, deviations, and unverified acceptance items. This is a complete playable implementation, not a human-balanced release: difficulty and the intended 10–15 minute first-session length still need player feedback. A Phaser-size bundle warning is expected (~342 KB gzip JS).

Rollback: rebuild the prior verified commit, or use tag `playable-slice` for the original prototype checkpoint. Before shipping, preserve a known-good `dist/` artifact and run the documented checks against the chosen hosting path. No saved sessions or backend migrations exist.

## Campaign

Choose a level in the header, or continue after each victory. Each level starts a fresh defense with its own coins, lives, lanes and scenery. Level switching is available before the first wave or after a result.

| Level | Theme | Waves | Lanes | Finale |
| --- | --- | --- | --- | --- |
| Jellybean Junction | Meadow · Normal | 10 | 1 | Captain Crumble |
| Bramble Orchard | Orchard · Hard | 12 | 1 | Iron Baron: armor and slow resistance |
| Caramel Canyon | Canyon · Expert | 12 | 1 | Swarm Duchess: summons dashers |
| Frosting Fjord | Fjord · Expert | 14 | 2, merging | Twin Barons |
| Fondue Volcano | Volcano · Master | 14 | 2, separate | Duchess and Baron together |
| Licorice Citadel | Citadel · Nightmare | 15 | 1, long | King Cataclysm (armor, summons, rage) with a Duchess |

Grumps: Wobbler (baseline), Dasher (fast), Chunky (tough), Bubble Bop (shield absorbs hits first), Mendy Muffin (heals neighbours), Jelly Splitter (bursts into three Jellets), plus four bosses. Campaign difficulty was tuned with the autoplay bot in `tests/unit/levels.test.ts`: it wins every level without powers, losing lives on the later maps.
