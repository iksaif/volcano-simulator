# TODO List

## 🔴 High Priority (Core Physics Fixes)

### Liquid Flow Constraints
- [ ] **Prevent water from flowing upward through solids**
  - Current: Liquids can flow up if there's space
  - Goal: Liquids should only flow sideways or down, never up through solid materials
  - Implementation: Add upward flow check in `updateLiquid()` - reject moves where `dy < 0` and path goes through solid
  - File: `src/materials/behaviors/GenericBehaviors.ts:34-60`

### Solid Bridging Behavior
- [ ] **Add temperature-dependent viscosity for solids**
  - Current: Solids fall like rigid particles
  - Goal: Cold solids should be able to "bridge" gaps (form stable structures)
  - Implementation:
    - Add `effectiveViscosity = baseViscosity * (1 + coolingFactor)` where coolingFactor increases as temp < threshold
    - At low temperatures, solids should check if they're supported by neighbors before falling
    - Add structural stability check: solid doesn't fall if 2+ neighbors below/diagonal
  - File: `src/materials/behaviors/GenericBehaviors.ts:12-30`

### Gas Buoyancy Improvements
- [x] **Make vapor and gas rise through air properly** ✅ DONE
  - Uses actual density in displacement logic via `Cell.getDensity()`
  - File: `src/materials/behaviors/PhysicsUtils.ts:58-70`

- [x] **Temperature-based density for gases and liquids** ✅ DONE
  - Implemented thermal expansion for gases and liquids
  - Formula: `ρ(T) = ρ₀ / (1 + α·ΔT)`
  - Gases: α = 0.003 (3% per degree)
  - Liquids: α = 0.0002 (0.02% per degree)
  - Solids: constant density
  - Pressure does NOT affect density (avoids creating matter)
  - Added `Cell.getDensity()` method for centralized calculation
  - Files updated:
    - `src/core/Types.ts` - Added `thermalExpansion` and `compressibility` properties
    - `src/core/Cell.ts` - Added `getDensity()` method
    - `src/materials/MaterialRegistry.ts` - Added `calculateActualDensity()` with real coefficients
    - `src/materials/behaviors/PhysicsUtils.ts` - Uses `Cell.getDensity()` for displacement
    - `src/physics/PressureComputation.ts` - Uses actual density for hydrostatic pressure
    - `src/input/LavaInjector.ts` - Uses actual density for displacement
    - `src/index.ts` - UI shows actual density
  - TODO: Implement mass tracking per cell for realistic gas compression (explosions, vapor expansion)

### Gas Movement Speed
- [ ] **Reduce gas upward movement speed**
  - Current: Gases rise too quickly (instant if path clear)
  - Goal: Gases should rise more slowly, creating smoother plumes
  - Implementation:
    - Add probability check in `updateGas()` before upward moves
    - `moveUpProbability = 0.3 * (1 - viscosity/255)` - only 30% chance per frame
    - Creates more realistic, slower gas plumes
  - File: `src/materials/behaviors/GenericBehaviors.ts:65-86`

### Vapor Condensation
- [ ] **Further reduce vapor condensation rate**
  - Current: `condensationProbability = 0.02` (2% base)
  - Goal: Vapor should persist even longer (more visible clouds)
  - Implementation: Reduce to `0.01` (1% base) or `0.005` (0.5% base)
  - File: `src/materials/MaterialRegistry.ts:107`

## 🟡 Medium Priority (Volcanic Physics)

### Lava Eruption System
- [ ] **Implement pressure-driven lava eruption**
  - Current: Lava injected from bottom, no eruption mechanics
  - Goal: High pressure underground should push lava upward (volcanic eruption)
  - Implementation:
    1. Create "magma chamber" concept - lava underground builds pressure
    2. When pressure exceeds threshold (e.g., 200), lava can displace rock upward
    3. Add `pressureThreshold` property to materials
    4. In `tryMove()`, allow high-pressure fluids to displace solids upward
    5. When rock is pushed up by lava, release energy (heat + pressure wave)
  - Files:
    - `src/core/Types.ts` - Add `pressureThreshold?: number` to MaterialProperties
    - `src/materials/behaviors/PhysicsUtils.ts` - Add pressure-driven upward displacement
    - Create new `src/physics/VolcanicEruption.ts` for eruption mechanics
  - Bonus: Add "explosion" effect when rock breaks under pressure

### Gas in Liquid Behavior
- [ ] **Slow down gas rising through liquid**
  - Current: Gas rises at same speed regardless of surrounding material
  - Goal: Gas bubbles should rise slower through water/lava (viscosity effect)
  - Implementation:
    - In `updateGas()`, check if neighbors are liquids
    - If surrounded by liquid, multiply move probability by `1 - (liquidViscosity / 255)`
    - Gas in water (viscosity=5) rises ~98% speed, gas in lava (viscosity=150) rises ~40% speed
  - File: `src/materials/behaviors/GenericBehaviors.ts:65-86`

## 🟢 Low Priority (Ecosystem Features)

### Grass System
- [ ] **Add grass material that grows on exposed ground**
  - Properties:
    - State: Solid
    - Color: Green (0x228b22)
    - Density: 800 (lighter than rock)
    - Growth conditions: Rock exposed to air above
  - Implementation:
    1. Add `MaterialType.Grass` enum
    2. Register grass in MaterialRegistry
    3. Create grass growth system in new file `src/physics/GrassGrowth.ts`:
       - Check rock cells with air above
       - Random probability (0.01% per frame) to convert rock → grass
       - Only grows in temperature range 10-30°C
    4. Add to physics pipeline in PhysicsEngine
  - Files:
    - `src/core/Types.ts`
    - `src/materials/MaterialRegistry.ts`
    - `src/physics/GrassGrowth.ts` (new)
    - `src/physics/PhysicsEngine.ts`

- [ ] **Grass burning and ash creation**
  - Goal: Grass burns when hot (>200°C) and turns to ash
  - Implementation:
    1. Add `MaterialType.Ash` enum
    2. Register ash (gray powder, density 500, falls like solid)
    3. Add high temperature transition for grass:
       - `maxTemp: 200`
       - `highTransitionTo: MaterialType.Ash`
  - Files:
    - `src/core/Types.ts`
    - `src/materials/MaterialRegistry.ts`

### Volcanic Gas Composition
- [ ] **Add ash particles to volcanic gas**
  - Current: Gas is generic
  - Goal: Volcanic eruptions should emit gas + ash mixture
  - Implementation:
    1. Create "volcanic gas" material (separate from generic gas)
    2. Add `onTransition` callback for lava heating
    3. When lava reaches high temp/pressure, emit mixture:
       - 60% volcanic gas
       - 30% ash particles
       - 10% regular gas
    4. Use `expandMaterial()` pattern to scatter particles
  - Files:
    - `src/materials/MaterialRegistry.ts`
    - `src/physics/StateTransitions.ts`

## 💡 Suggested Future Features

### Physics Improvements
- [ ] **Sound wave propagation** through materials (different speeds in solid/liquid/gas)
- [ ] **Erosion system** - water wears away rock over time
- [ ] **Material mixing** - combine materials (e.g., water + ash → mud)
- [ ] **Chemical reactions** - gas + fire → explosion
- [ ] **Magnetism** - certain materials attract/repel
- [ ] **Electricity** - conductivity and current flow

### Visual Enhancements
- [ ] **Particle effects** - smoke, sparks, dust
- [ ] **Lighting system** - lava glows and illuminates nearby cells
- [ ] **Shadows** - objects cast shadows
- [ ] **Smooth interpolation** - anti-aliased rendering
- [ ] **Color gradients** - smooth transitions between materials
- [ ] **Glow effects** - post-processing for hot materials

### Gameplay Features
- [ ] **Save/Load** - serialize grid state to JSON
- [ ] **Scenarios** - pre-built interesting setups
- [ ] **Challenges** - goals to achieve (e.g., "Heat 100 water cells to 100°C")
- [ ] **Material crafting** - combine materials to create new ones
- [ ] **Time control** - pause, slow-mo, fast-forward
- [ ] **Recording** - export simulation as GIF/video

### UI/UX Improvements
- [ ] **Material info panel** - show properties when hovering
- [ ] **Graph overlays** - real-time charts for temperature/pressure
- [ ] **Keyboard shortcuts** - number keys for material selection
- [ ] **Undo/Redo** - revert accidental changes
- [ ] **Grid size selector** - choose 64×64, 128×128, 256×256
- [ ] **Custom color schemes** - user-defined material colors

### Performance Optimizations
- [ ] **Spatial partitioning** - only update active regions
- [ ] **Dirty rectangle tracking** - only render changed areas
- [ ] **Web Workers** - multi-threaded physics computation
- [ ] **WASM port** - compile physics engine to WebAssembly
- [ ] **GPU acceleration** - compute shaders for parallel updates
- [ ] **Level-of-detail** - lower resolution for distant/inactive areas

### Advanced Physics
- [ ] **Fluid dynamics** - Navier-Stokes approximation
- [ ] **Turbulence** - realistic smoke and gas behavior
- [ ] **Surface tension** - water droplets form spheres
- [ ] **Boiling nucleation** - bubbles form at specific sites
- [ ] **Crystallization** - structured solid formation
- [ ] **Stress/strain** - materials deform before breaking

### Multiplayer/Social
- [ ] **Share creations** - export/import simulation states
- [ ] **Leaderboards** - most interesting eruptions
- [ ] **Collaborative mode** - multiple users painting simultaneously
- [ ] **Replay system** - watch recorded simulations

---

## Notes

### Implementation Priority Order
1. Fix core physics issues (liquid flow, solid bridging, gas buoyancy)
2. Implement volcanic eruption mechanics (most impactful feature)
3. Add ecosystem features (grass, ash) for visual variety
4. Polish and optimize performance
5. Add suggested features based on user feedback

### Testing Strategy
- Test each physics change in isolation
- Use pressure visualization ('P' key) to debug fluid behavior
- Use temperature visualization ('T' key) to debug thermal effects
- Create test scenarios (e.g., U-tube for liquid, closed chamber for gas)

### Code Quality Guidelines
- Keep material behaviors generic when possible
- Document all new properties in Types.ts
- Add comments explaining physics formulas
- Test edge cases (empty cells, boundaries, extreme values)
- Profile performance for any O(n²) operations
