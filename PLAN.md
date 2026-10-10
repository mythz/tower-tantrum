# Tower Tantrum — Implementation Plan

## 1. Goal Statement
Build a polished, browser-playable 2D tower defense game using Phaser 3, TypeScript, and Vite. Deliver one colorful cartoon map, three distinct tower types, ten authored waves, animated enemies, readable placement previews, upgrades, projectile effects, sound controls, and satisfying combat feedback. Prove a small playable version before expanding scope.

- **Goals:** A complete start-to-victory-or-defeat session; understandable controls; responsive presentation; deterministic, independently testable gameplay; replaceable visual and audio assets.
- **Non-goals:** Multiple maps, multiplayer, accounts, backend services, procedural maps, monetization, progression across sessions, complex skill trees, or a full level editor.

## 2. Context & Constraints
- **Current state:** Project directory is `/home/mythz/.llms/user/admin/projects/tower-tantrum`. Existing source, tooling, and assets have not been inspected. Implementation begins with discovery; do not overwrite existing work.
- **Target state:** A locally runnable and production-buildable static web game with documented controls, tests, asset attribution, and a complete ten-wave scenario.
- **Technology constraints:** Phaser **3**, TypeScript strict mode, Vite. Pin compatible stable package versions and commit a lockfile; do not accidentally use Phaser 4. Use Vitest for simulation tests and Playwright for browser smoke tests unless equivalent project tooling already exists.
- **Assumptions:** Single-player; desktop mouse and touch-friendly controls; landscape-first layout; modern Chromium, Firefox, and Safari; no backend; static assets bundled locally. Art may be original SVG/PNG illustrations and animations rather than purchased sprites. Placeholder graphics are acceptable only in the playable-slice milestone.
- **Proposed gameplay defaults:** 20 lives, 180 starting coins, manually started waves, no passive income, one coin reward per defeated enemy according to its type, and an explicit completion bonus. These are tuning values, not fixed requirements.
- **Open questions:**
  - Are there existing repository conventions or dependencies? Resolved in Step 1.1; blocks scaffolding choices.
  - Are branded assets or specific licenses required? Resolve in Step 1.2 before final asset production. Default: original artwork/audio or permissively licensed assets with attribution.
  - Is portrait-first mobile support required? Default: responsive landscape game with a portrait rotate prompt; this does not block core gameplay.
  - Is a deployment provider prescribed? Default: static `dist/` output; provider-specific deployment is optional and not a gameplay blocker.

## 3. Architecture / Approach Overview

### Core design
Use a pure TypeScript simulation driven by a fixed timestep, with Phaser acting as input, rendering, audio, and scene orchestration. Keep combat outcomes independent of animation duration and frame rate.

- `src/game/core/`: state, commands, simulation systems, deterministic seeded random source if needed, geometry helpers, and domain events. No Phaser or DOM imports.
- `src/game/data/`: validated map, enemy, tower, economy, and wave definitions.
- `src/game/presentation/`: Phaser scenes, sprite/entity view mapping, animation, particle effects, and audio.
- `src/game/ui/`: HUD, build menu, upgrade panel, pause/settings overlay, and end screen; browser overlays may be used for accessible controls.
- `src/game/assets/manifest.ts`: semantic asset keys and asset URLs. Domain definitions reference visual keys, never texture paths or sprite dimensions.
- `public/assets/`: replaceable sprites/atlases, map art, fonts, and audio; include an asset guide and license inventory.
- `tests/unit/`, `tests/integration/`, `tests/e2e/`: domain tests, full-session tests, browser smoke tests.

**Data flow:** pointer/keyboard → screen-to-world conversion → validated domain command → fixed-step simulation → snapshot/events → sprite/HUD updates and transient sound/effects. Presentation never directly edits coins, health, tower damage, or wave state.

**Timing:** Run the simulation at 60 fixed ticks/second using an accumulator. Clamp long frame deltas and cap catch-up steps. Pause on hidden tabs rather than simulating missed minutes. Rendering may interpolate positions. Stop all gameplay advancement while paused or terminal.

**Alternatives:** A Phaser-only implementation is faster initially but couples balancing and tests to scenes. A full ECS offers flexibility but adds unnecessary complexity at this scale. Follow a small typed domain model with focused systems and a thin Phaser adapter.

### Visual and gameplay direction
**Map: “Jellybean Junction.”** A winding sandy path crosses a bright meadow with rounded trees, flowers, a short bridge, and a cheerful home-base gate. Use a single fixed non-branching route so no pathfinding or dynamic rerouting is needed. Define buildable meadow cells independently from decoration. Keep path edges, tower bases, and projectiles strongly separated by color and value; decorations cannot obscure interactive cells.

Use rounded silhouettes, thick warm outlines, consistent upper-left lighting, a controlled palette, and playful squash/stretch. Depth-sort entities by base position; foreground decorations must not hide enemies. Tower footprints remain visually consistent through upgrades.

Proposed initial balance, to tune after playtests:

| Tower | Role | Cost | Range / cooldown | Base attack | Upgrade costs |
|---|---|---:|---|---|---|
| Pea Popper | Fast single-target | 60 | 140 world units / 0.65s | 9 damage | 70, 110 |
| Boom Berry | Slow splash | 100 | 125 / 1.8s | 22 damage, 48-unit splash radius | 110, 160 |
| Frosty Cone | Support/control | 80 | 120 / 1.1s | 5 damage; 30% slow for 1.5s | 90, 140 |

Each tower has three levels total. Define explicit per-level values in data, with visible silhouette/accessory changes and an upgrade panel showing actual next-level benefits. Slow effects refresh duration and use the strongest active slow, never multiply into immobilization. Default targeting is greatest route progress in range, with entity ID as a deterministic tie-breaker.

**Enemies:** Wobblers (baseline), Dashers (fast and fragile), Chunkies (slow and tough), and a larger final-wave captain with higher health and leak damage, not an additional mechanics system. Distinguish types with silhouettes and motion, not only color.

**Wave composition:** Author exactly ten waves as spawn groups with type, count, spacing, and initial delay. Suggested teaching sequence: 1 baseline introduction; 2 baseline pressure; 3 introduce dashers; 4 mixed baseline/dashers; 5 introduce chunkies; 6 mixed baseline/chunkies; 7 dasher burst; 8 three-type mix; 9 endurance mix; 10 captain plus mixed escort. Increase measured total health/pressure deliberately rather than using an unchecked exponential formula.

### Data Model
- `GameState`: tick, phase (`build | wave | paused | won | lost`), pre-pause phase, coins, lives, wave index, spawn schedule, enemy/tower/projectile collections, next entity ID.
- `MapDefinition`: world dimensions, cell size, ordered path waypoints, buildable-cell mask, reserved/decorative cells, base/spawn positions. Precompute cumulative path lengths and sample position from route progress.
- `EnemyDefinition`: health, speed, bounty, leak damage, visual key. `EnemyState`: ID, definition ID, health, route progress, active status effects.
- `TowerDefinition`: role, cost, footprint, per-level range/cooldown/damage/projectile/effect parameters, visual keys. `TowerState`: ID, cell, level, cooldown remaining.
- `ProjectileState`: ID, owner, target ID where applicable, position, speed, damage, impact rule, last known target position, maximum lifetime. Freeze attack values at firing time.
- `WaveDefinition`: ordered spawn groups and completion reward. Schedule ticks deterministically, including overlapping groups.
- `Settings`: schema version, master volume, mute, optional reduced-motion setting. Persist only settings to localStorage; guard malformed data and unavailable storage. No saved-session migration needed for MVP.
- Validate IDs, nonnegative counts/costs, legal map bounds, path geometry, and all wave references on startup or in tests.

### API / Interface Design
No HTTP API or authentication is required.
- `createGame(config): GameState`
- `applyCommand(state, command): CommandResult` with commands `PlaceTower`, `UpgradeTower`, `StartWave`, `Pause`, and `Resume`.
- `stepGame(state, deltaTicks = 1): DomainEvent[]`
- `getPlacementPreview(state, towerType, cell): PlacementResult` is side-effect-free and shares validation with actual placement.
- `CommandResult` returns success or a typed reason such as `OCCUPIED`, `OUT_OF_BOUNDS`, `NOT_BUILDABLE`, `INSUFFICIENT_COINS`, `MAX_LEVEL`, or `INVALID_PHASE`.
- Events include spawn, shot, impact, damage, death, leak, upgrade, wave completion, and game end. Emit rewards/terminal events exactly once.
- Start/restart is orchestrated by the scene/session controller using fresh domain state and clean subscriptions.

### Edge Cases & Error Handling
- Reject path, reserved-cell, occupied-cell, out-of-map, and unaffordable placement; show a ghost, range ring, valid/invalid shape indicator, and short reason. Preview never spends money.
- Revalidate a placement/upgrade at command processing time; rapid clicks cannot overspend or double-place. Cancel placement with Escape, right-click, or a visible cancel control.
- UI clicks must not fall through to map placement. Convert pointers using camera coordinates after resizing or letterboxing.
- Single-target projectiles whose targets disappear expire harmlessly; splash projectiles continue to their captured impact position. All projectiles have a bounded lifetime. Do not award duplicate kills for simultaneous hits.
- Clamp movement at path end; each leak occurs once. If the final enemy leaks the last life, defeat takes priority over wave/victory completion.
- A wave completes only when its spawn queue and living-enemy set are empty; clear remaining projectiles during transition. Victory requires completion of wave ten with lives remaining.
- Combat pauses on the settings/pause overlay and on document visibility loss. Resume only on an explicit user action. Prevent double loops/listeners after restart.
- Unlock audio from a user gesture; silent audio failure must not block play. Cap simultaneous SFX, debounce repetitive sounds, persist mute/volume safely.
- Missing critical art displays a useful loading error/retry state. A missing optional sound uses silent fallback. No external asset CDN is required at runtime.
- Honor reduced motion by limiting camera shake, flashing, and particles. Use text/icons in addition to color for important state.

### Testing Strategy
- Domain unit tests cover every command rejection, economic transaction, route boundary, targeting rule, slow expiration, splash radius, projectile invalidation, and terminal transition. Target at least 90% branch coverage for economy, placement, and wave-state logic; prioritize assertions over a broad vanity metric.
- Integration tests run fixed scripted command sequences through all ten waves, test defeat, test restart initialization, and compare outcomes under varied rendering frame schedules feeding the same simulation ticks. Test configurations may simplify combat for state-machine tests; they are not evidence of production balance.
- Browser tests cover loading, first tower placement, wave start, visible combat, upgrades, pause/resume, audio controls, win/lose overlays through a test-only scenario fixture, and restart. Exclude debug fixtures from production UI.
- Manual QA verifies full-session balance, placement readability, animation consistency, touch operation, keyboard controls, mute behavior, resizing, and browser compatibility.
- Profile the final wave and an explicit stress fixture (approximately 150 enemies, 30 towers, bounded particles). Aim for 60 FPS at 1280×720 on an agreed reference laptop; record hardware/browser and frame timings rather than claiming a universal guarantee.

## 4. Implementation Plan

### Phase 1: Discovery & Foundation
Purpose: Establish the minimal structure and remove tooling/asset uncertainty.
Prerequisites: Project access.
Validation: Empty game boots, domain tests run, art and control conventions are documented.

- **Step 1.1: Inspect the existing project.**
  - Details: Inventory package scripts, source, assets, test tooling, Node requirements, and Git state. Record what can be reused.
  - Completion Criteria: Confirm project entry points and compatible pinned Phaser 3/TypeScript/Vite versions without discarding existing files.
  - Estimated Effort: S.
  - Risk: Low.
- **Step 1.2: Define the art and interaction contract.**
  - Details: Produce a small style sheet, logical 1280×720 layout, gameplay viewport versus HUD bounds, map sketch, controls list, and asset naming/licensing rules. Select a 48-unit build grid or adjust it once to fit the final layout.
  - Completion Criteria: A reviewed map sketch has one readable route, legal build areas, and room for HUD/upgrade controls; asset ownership is documented.
  - Estimated Effort: S.
  - Risk: Medium — use original artwork if asset sourcing or licenses are unclear.
- **Step 1.3: Set up the application and test scaffold.**
  - Details: Create the module boundaries above, loading/game scene skeleton, strict TypeScript config, and scripts for dev, build, typecheck, test, and browser tests. Include a minimal CI check using the lockfile and declared Node version.
  - Completion Criteria: Clean install, typecheck, one domain smoke test, and production build succeed; browser displays the canvas without console errors.
  - Estimated Effort: S.
  - Risk: Low.

### Phase 2: Small Playable Slice — Blocking Gate
Purpose: Prove that the gameplay works before implementing the remaining towers, waves, or final art.
Prerequisites: Steps 1.2 and 1.3.
Validation: A person can play a three-wave placeholder version from start through victory or defeat.

- **Step 2.1: Implement the minimal deterministic simulation.**
  - Details: Add the fixed route, build grid, one enemy, Pea Popper, coins/lives, targeting, moving projectiles, leaks, rewards, and three short test waves. Include placement, start-wave, pause, and terminal state commands with domain tests.
  - Completion Criteria: Headless tests demonstrate legal placement, rejected overspending, a kill reward, a leak, wave progression, victory, and defeat; domain code has no Phaser imports.
  - Estimated Effort: M.
  - Risk: Medium — establish explicit system ordering and single-removal/reward semantics before tuning.
- **Step 2.2: Connect a minimal interactive renderer.**
  - Details: Render simple map/enemy/tower shapes; translate commands and events; add HUD, ghost preview, range circle, build cancellation, Start Wave, pause, result overlay, and restart.
  - Completion Criteria: Three-wave game is playable with pointer controls; invalid placement explains why; pause freezes combat and restart returns to fresh state.
  - Estimated Effort: M.
  - Risk: Medium — test world-coordinate conversion and UI click interception at two viewport sizes.
- **Step 2.3: Test and approve the playable slice.**
  - Details: Add browser smoke coverage; manually complete a run and intentionally lose another. Inspect economy, targeting, input friction, and errors. Fix blockers before expansion; preserve this milestone with a commit/tag.
  - Completion Criteria: Both terminal paths work, no known critical bugs remain, and the developer records a short playtest checklist with results. Optional stakeholder approval must not be implied if unavailable.
  - Estimated Effort: S.
  - Risk: Medium — postpone decorative work rather than skipping this gate.

### Phase 3: Full Game Content
Purpose: Extend the verified loop to the requested feature set.
Prerequisites: Step 2.3 passes.
Validation: All three towers, upgrades, enemy variants, and ten waves function in the simulation and UI.

- **Step 3.1: Implement the remaining tower mechanics.**
  - Details: Add Boom Berry splash and Frosty Cone slow behavior using data-driven attack rules. Test boundary distances, overlapping slows, dead targets, maximum projectile lifetime, and simultaneous damage.
  - Completion Criteria: Each tower has a distinct tested role; counters and rewards stay correct during mixed combat.
  - Estimated Effort: M.
  - Risk: Medium — keep effect rules small and explicit rather than adding a generic scripting framework.
- **Step 3.2: Implement tower upgrades.**
  - Details: Add levels two and three for each tower; atomic purchase validation; selection panel with level, current stats, next benefits/cost, disabled reasons, and maximum-level state. Preview range changes.
  - Completion Criteria: Every tower upgrades twice; insufficient funds and repeated clicks are safe; fired projectiles retain their original attack values.
  - Estimated Effort: M.
  - Risk: Low.
- **Step 3.3: Author enemy variants and ten waves.**
  - Details: Add Dasher, Chunky, and captain definitions; spawn schedules; completion bonuses; upcoming-wave summary. Validate wave references and run full-session headless tests.
  - Completion Criteria: Exactly ten production waves exist with escalating compositions; final-wave victory and last-life defeat have test coverage.
  - Estimated Effort: M.
  - Risk: Medium — simulation checks detect structural problems, but reserve actual difficulty assessment for manual playtests.

### Phase 4: Presentation & Feel
Purpose: Replace prototype visuals with a coherent polished experience.
Prerequisites: Step 2.3 for asset creation; relevant Phase 3 mechanics before final integration.
Validation: Final map, units, UI, combat feedback, and audio are integrated without changing domain outcomes.

- **Step 4.1: Produce the final map and asset library.**
  - Details: Create layered meadow/path/bridge/base artwork, three tower families with upgrade accents, four enemy silhouettes, projectile sprites, particles, UI icons, and consistent typography. Document atlas frames, origins, scale, and replacement instructions.
  - Completion Criteria: No prototype art remains in the primary play flow; map buildability matches simulation geometry; all assets have provenance and semantic manifest keys.
  - Estimated Effort: L.
  - Risk: Medium — favor a small coherent original asset set over mixing mismatched packs.
- **Step 4.2: Add animation and combat feedback.**
  - Details: Add enemy walk/bob loops, direction-aware facing, tower aim/recoil, muzzle flashes, projectile trails, splash/slow effects, brief damage flash, death pop, and capped reward text. Pool frequently spawned views/effects. Keep health bars readable and feedback non-blocking.
  - Completion Criteria: Each attack and enemy state is visually recognizable; view count remains bounded after waves/restarts; reduced motion suppresses excessive motion and flashing.
  - Estimated Effort: M.
  - Risk: Medium — cap effects and ensure animations never determine simulation damage timing.
- **Step 4.3: Polish the HUD and control flow.**
  - Details: Style coin/life/wave displays, tower cards, selection/upgrade panel, placement reason text, start screen, concise first-run hints, pause menu, and win/lose screens. Add number-key tower selection, Escape cancellation, and an accessible pause control; prevent shortcuts while typing in controls.
  - Completion Criteria: A first-time tester can place, start, upgrade, cancel, pause, and restart without verbal instructions; no overlap or cut-off at supported landscape sizes.
  - Estimated Effort: M.
  - Risk: Medium — keep core HUD readable and use compact panels on smaller screens.
- **Step 4.4: Add audio and persistent sound controls.**
  - Details: Add a quiet looping music track and short placement, shot, hit, upgrade, wave, and result cues. Provide immediately visible mute and master volume; manage user-gesture unlocking and concurrency limits.
  - Completion Criteria: Mute/volume work before and during combat, persist across reloads, and survive blocked audio or unavailable storage without breaking gameplay.
  - Estimated Effort: S.
  - Risk: Medium — use original/permissive local sounds; support silent fallback.

### Phase 5: Balance, Verification & Delivery
Purpose: Demonstrate a complete, enjoyable, shippable static game.
Prerequisites: Phases 3 and 4.
Validation: All acceptance criteria pass against the production build.

- **Step 5.1: Tune the full ten-wave experience.**
  - Details: Play at least three complete runs with different tower mixes plus an intentional-loss run. Record completion time, remaining lives, tower choices, and frustrating moments. Adjust data values only where possible; aim for an approximately 10–15 minute first successful session, subject to testing.
  - Completion Criteria: At least two distinct mixed-tower strategies win; each tower has a useful role; early waves teach mechanics and later waves create pressure without unavoidable leaks.
  - Estimated Effort: M.
  - Risk: High — subjective balance needs human playtests; avoid pretending automated wins prove fun.
- **Step 5.2: Complete browser and performance QA.**
  - Details: Run unit/integration/browser suites; check Chromium, Firefox, and Safari where available; test 1280×720 and 960×540 landscape layouts plus high-DPI, touch emulation, portrait prompt, resizing, tab hiding, sound permissions, and repeated restarts. Profile the final wave and stress fixture.
  - Completion Criteria: No critical gameplay defects, uncaught errors, unbounded entity/listener growth, or unusable controls; record actual browser/device coverage and performance results with any remaining limitations.
  - Estimated Effort: M.
  - Risk: Medium — lower particle limits or optimize view pooling before cutting gameplay features.
- **Step 5.3: Package and document the release.**
  - Details: Document installation, pinned environment, scripts, controls, architecture, balance-data locations, asset replacement, and licenses. Verify production asset paths under the selected Vite base URL. CI runs typecheck, tests, build, and browser smoke checks. Produce the static build and release checklist.
  - Completion Criteria: A clean checkout installs from the lockfile and passes checks; previewing `dist/` completes a smoke session without missing assets; rollback instructions point to the prior known-good build. Deploy only if a provider and permission are supplied.
  - Estimated Effort: S.
  - Risk: Low.

## 5. Dependency Map
```text
1.1 → 1.2 ─┐
    → 1.3 ─┴→ 2.1 → 2.2 → 2.3 [mandatory playable gate]
2.3 → 3.1 → 3.2
2.3 → 3.3                  (parallel with 3.1)
2.3 → 4.1                  (parallel with Phase 3)
4.1 + 3.1 + 3.2 + 3.3 → 4.2
3.2 + 3.3 + style contract → 4.3
2.3 + style contract → 4.4 (parallel audio work)
3.* + 4.* → 5.1 → 5.2 → 5.3
```
Asset and sound work can be parallelized after the playable gate; no full-content production should precede that gate. QA tests should be developed alongside each phase, not postponed entirely to Phase 5.

## 6. Risk Register
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Expanding polish before proving playability | Medium | High | Enforce Step 2.3 as a blocking milestone. |
| Mixed or unlicensed art/audio | Medium | High | Small style guide, semantic manifest, provenance inventory, original fallback assets. |
| Frame-rate-dependent combat | Medium | High | Fixed-tick domain simulation; presentation-independent timing tests. |
| Economy or wave softlocks | Medium | High | Atomic commands; explicit completion conditions; last-life and empty-queue tests. |
| Splash/slow towers dominate balance | Medium | Medium | Explicit slow cap, authored values, varied strategy playtests. |
| Effects overload the browser | Medium | Medium | Pool views, cap particles/SFX, profile production and stress waves. |
| Small-screen placement errors | Medium | Medium | Shared preview validation, world-coordinate conversion, large controls, resize QA. |
| Audio blocked by browser | High | Low | Gesture unlock, visible mute, silent fallback. |
| Restarts retain state or listeners | Medium | High | Scene teardown contract, fresh domain state, repeated-restart checks. |

## 7. Validation Strategy
Release acceptance checklist:
- [ ] Phaser 3, TypeScript, and Vite are used with a reproducible install/build.
- [ ] A tested three-wave playable milestone predates feature expansion.
- [ ] One coherent final map includes a readable route and accurate legal build areas.
- [ ] Three mechanically distinct towers have two purchasable upgrades each.
- [ ] Exactly ten authored waves progress to victory; losing all lives produces defeat.
- [ ] Placement previews show footprint, range, affordability, and rejection reasons without spending money.
- [ ] Enemies animate; all towers have projectile and hit effects; visual feedback remains readable.
- [ ] Sound controls work, persist, and do not block play when audio fails.
- [ ] Pause, hidden-tab handling, cancellation, terminal overlays, and restart work reliably.
- [ ] Gameplay modules import neither Phaser nor browser APIs and pass headless tests.
- [ ] Assets can be replaced through the documented manifest/frame contract without rewriting gameplay logic.
- [ ] Full-session manual results, automated checks, browser coverage, and measured performance are recorded.
- [ ] Production preview has no missing assets or uncaught errors; licenses and README are complete.

## 8. Effort Summary
- **Sizing guide:** S ≈ 0.25–0.5 developer-day; M ≈ 1–2 days; L ≈ 2–4 days. Includes per-step tests; estimates depend on existing tooling and art capability.
- **Total:** 7 S + 9 M + 1 L ≈ **13–26 developer-days** for one experienced developer, with original lightweight cartoon assets. External review, purchased-art procurement, or broader device certification may add time.
- **Critical path:** 1.1 → max(1.2, 1.3) → 2.1 → 2.2 → 2.3 → max(3.1→3.2, 3.3, 4.1) → 4.2 → 5.1 → 5.2 → 5.3. Steps 4.3 and 4.4 must also finish before 5.1 and may become critical if delayed.
- **Milestones:** M1 foundation boots; M2 verified small playable slice; M3 all ten waves and three upgradable towers; M4 final visual/audio integration; M5 balanced, tested production build.
- **Scope protection:** If time runs short, simplify decorative density and animation variants. Do not remove required tower roles, ten waves, upgrades, clear previews, audio controls, hit feedback, or the playable-slice test gate.
