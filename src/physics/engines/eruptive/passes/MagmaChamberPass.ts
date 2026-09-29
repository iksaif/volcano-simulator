// Magma chamber pass for eruptive physics
//
// Pressure lives in magma bodies (connected regions of lava), not in single
// cells: a connected fluid equalizes pressure, so every cell of a body shares
// one overpressure (pressure above hydrostatic).
//
// - Recharge: enclosed bodies (little or no free surface) are fed by fresh
//   magma from depth, which raises their overpressure and keeps them molten.
//   Lava lakes and flows have a wide free surface, so they never pressurize
//   and they cool. Gas escapes through any free surface, so an open vent
//   loses pressure and goes quiet until its lava crusts over and seals it.
// - Extrusion: where a body has a free surface, overpressure pushes magma up,
//   shifting the fluid above it (air, or a whole water column). The magma
//   comes from depth, like the recharge. Moderate overpressure wells up and
//   overflows; high overpressure fountains. As lava spreads out of the vent
//   the body gets less enclosed, recharge stops, and the eruption wanes until
//   the flows cool and the chamber is sealed again.
// - Fracture: overpressure above the strength of neighboring rock cracks it
//   and magma fills the crack (dike growth). Breaking the last layer of rock
//   below open space is explosive: the cap shatters into ash with a blast.
//
// Every change of volume (magma leaving, cracks opening) drops the body's
// overpressure by BULK_MODULUS / bodySize, so eruptions are self-limiting.

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import { MaterialType, MaterialState } from '../../../../core/Types';
import { MaterialRegistry } from '../../../../materials/MaterialRegistry';
import type { IPhysicsEnginePass } from '../../../IPhysicsEngine';

const MAX_PRESSURE = 10000;

// Recharge
const RECHARGE_RATE = 30; // Overpressure gained per frame by a fully enclosed body
const MAX_FREE_SURFACE = 10; // A body with this many open-topped cells is venting freely, not a chamber
const DEGASSING_PER_FREE_SURFACE_CELL = 5; // Overpressure lost per frame through each open-topped cell
const MIN_BODY_SIZE = 6; // Smaller bodies are blobs of lava, not chambers
const UNCONFINED_DECAY = 0.3; // Fraction of overpressure lost per frame when not enclosed
const MAGMA_TEMPERATURE = 1150; // Molten (lava solidifies < 800°C) but below rock's 1200°C melting point
const REHEAT_RATE = 0.1;
// Chance per frame that quiet magma exposed in a vent freezes into a crust.
// Cooling alone can't do it: cooled lava is denser and convects away.
const CRUST_CHANCE = 0.03;
const CRUST_TEMPERATURE = 790; // Just below lava's solidification point

// Volume changes
const BULK_MODULUS = 8000; // Overpressure drop = BULK_MODULUS / bodySize per cell of volume change

// Extrusion
const EXTRUDE_PRESSURE = 1500; // Overpressure needed to push magma out of a free surface
const EXTRUDE_STEP = 500; // One more cell extruded per frame for each step above the threshold
const MAX_EXTRUDE_PER_FRAME = 4;
const FOUNTAIN_PRESSURE = 2500; // Above this, magma launches upward instead of welling up
const FOUNTAIN_SPEED_PER_PRESSURE = 1 / 500;
const MAX_FOUNTAIN_SPEED = 8;

// Fracture
const BASE_STRENGTH = 4000; // Rock with nothing above it
const STRENGTH_PER_OVERBURDEN_CELL = 100; // Confinement from each rock-equivalent cell of weight above
const MAX_OVERBURDEN = 40;
const ROCK_DENSITY = 2700; // Weight of one rock cell, used to measure overburden
const HOT_WEAKENING_START = 800; // Rock hotter than this is weakened
const HOT_WEAKENING_PER_DEGREE = 2;
const MAX_FRACTURES_PER_FRAME = 2;
const BREAKTHROUGH_COST = 3; // Volume released by an explosive breakthrough, in cells
const MAX_BLAST_RADIUS = 5;
const MAX_BLAST_SPEED = 6;

interface MagmaBody {
  cells: number[]; // Grid indices
  pressure: number;
  temperature: number;
  fed: number; // Recharge strength, 0 (surface lava) to 1 (fully enclosed chamber)
  freeSurface: number[]; // Body cells with a non-rigid, non-lava cell above
  rockNeighbors: number[]; // Rigid cells touching the body
}

export class MagmaChamberPass implements IPhysicsEnginePass {
  // Body label per cell, reused between frames (-1 = not lava)
  private labels = new Int32Array(0);

  execute(grid: Grid, _deltaTime: number): void {
    if (this.labels.length !== grid.size) {
      this.labels = new Int32Array(grid.size);
    }

    this.decayNonMagmaPressure(grid);

    for (const body of this.findBodies(grid)) {
      this.recharge(body);
      this.extrude(grid, body);
      this.fracture(grid, body);
      this.writeBack(grid, body);
    }
  }

  /**
   * Overpressure only exists in magma; let any other material relax to zero
   */
  private decayNonMagmaPressure(grid: Grid): void {
    for (let i = 0; i < grid.size; i++) {
      const cell = grid.getUnsafe(i);
      if (Cell.isEmpty(cell) || Cell.getMaterialId(cell) === MaterialType.Lava) continue;
      const pressure = Cell.getPressure(cell);
      if (pressure === 0) continue;
      grid.setUnsafe(i, Cell.setPressure(cell, pressure < 1 ? 0 : pressure * (1 - UNCONFINED_DECAY)));
    }
  }

  /**
   * Label connected lava regions and measure each one
   */
  private findBodies(grid: Grid): MagmaBody[] {
    const { width, height, size } = grid;
    const labels = this.labels;
    labels.fill(-1);

    const bodies: MagmaBody[] = [];
    const stack: number[] = [];

    for (let start = 0; start < size; start++) {
      if (labels[start] !== -1 || !this.isLava(grid.getUnsafe(start))) continue;

      const id = bodies.length;
      const body: MagmaBody = {
        cells: [],
        pressure: 0,
        temperature: 0,
        fed: 0,
        freeSurface: [],
        rockNeighbors: [],
      };
      const seenRock = new Set<number>();

      labels[start] = id;
      stack.push(start);
      while (stack.length > 0) {
        const idx = stack.pop()!;
        const cell = grid.getUnsafe(idx);
        body.cells.push(idx);
        body.pressure += Cell.getPressure(cell);
        body.temperature += Cell.getTemperature(cell);

        const x = idx % width;
        const y = (idx - x) / width;
        const neighbors = [
          x > 0 ? idx - 1 : -1,
          x < width - 1 ? idx + 1 : -1,
          y > 0 ? idx - width : -1,
          y < height - 1 ? idx + width : -1,
        ];

        for (let n = 0; n < 4; n++) {
          const ni = neighbors[n];
          if (ni === -1) continue; // The world's edge holds like rock
          const neighbor = grid.getUnsafe(ni);
          if (this.isLava(neighbor)) {
            if (labels[ni] === -1) {
              labels[ni] = id;
              stack.push(ni);
            }
          } else if (this.isRigid(neighbor)) {
            if (!seenRock.has(ni)) {
              seenRock.add(ni);
              body.rockNeighbors.push(ni);
            }
          } else if (n === 2) {
            body.freeSurface.push(idx); // Open cell directly above
          }
        }
      }

      body.pressure /= body.cells.length;
      body.temperature /= body.cells.length;
      bodies.push(body);
    }

    return bodies;
  }

  /**
   * Enclosed bodies gain overpressure and heat from depth; open ones lose it
   */
  private recharge(body: MagmaBody): void {
    const fed =
      body.cells.length >= MIN_BODY_SIZE
        ? Math.max(0, 1 - body.freeSurface.length / MAX_FREE_SURFACE)
        : 0;
    body.fed = fed;

    // Degassing through the free surface
    body.pressure -= body.freeSurface.length * DEGASSING_PER_FREE_SURFACE_CELL;

    if (fed > 0) {
      body.pressure += RECHARGE_RATE * fed;
      body.temperature += Math.max(0, MAGMA_TEMPERATURE - body.temperature) * REHEAT_RATE * fed;
    } else {
      body.pressure *= 1 - UNCONFINED_DECAY;
    }
    body.pressure = Math.max(0, Math.min(MAX_PRESSURE, body.pressure));
  }

  /**
   * Push magma out through the body's free surface
   */
  private extrude(grid: Grid, body: MagmaBody): void {
    if (body.pressure < EXTRUDE_PRESSURE || body.freeSurface.length === 0) return;

    const wanted = Math.min(
      MAX_EXTRUDE_PER_FRAME,
      1 + Math.floor((body.pressure - EXTRUDE_PRESSURE) / EXTRUDE_STEP)
    );

    const surface = [...body.freeSurface].sort(() => Math.random() - 0.5);
    const dropPerCell = BULK_MODULUS / body.cells.length;
    let extruded = 0;

    for (const idx of surface) {
      if (extruded >= wanted) break;
      const fountain = body.pressure >= FOUNTAIN_PRESSURE;
      if (!this.pushUp(grid, idx, body, fountain)) continue;
      extruded++;
      body.pressure = Math.max(0, body.pressure - dropPerCell);
    }
  }

  /**
   * Insert a magma cell above a free-surface cell by shifting the column of
   * fluid above it up to the first gas cell, which is absorbed.
   * @returns false if rigid material blocks the column
   */
  private pushUp(grid: Grid, idx: number, body: MagmaBody, fountain: boolean): boolean {
    const width = grid.width;
    const x = idx % width;
    const y = (idx - x) / width;

    // Find the first gas (or empty) cell above; liquids and loose ash get pushed
    let top = -1;
    for (let yy = y - 1; yy >= 0; yy--) {
      const cell = grid.get(x, yy);
      if (this.isGas(cell)) {
        top = yy;
        break;
      }
      if (this.isRigid(cell)) return false;
    }
    if (top === -1) return false;

    for (let yy = top; yy < y - 1; yy++) {
      grid.set(x, yy, grid.get(x, yy + 1));
    }

    // Straight into open air at high pressure, magma fountains
    let speed = 0;
    if (fountain && top === y - 1) {
      speed = Math.min(
        MAX_FOUNTAIN_SPEED,
        (body.pressure - FOUNTAIN_PRESSURE) * FOUNTAIN_SPEED_PER_PRESSURE + 2
      );
    }
    const magma = Cell.create(MaterialType.Lava, body.temperature, body.pressure);
    grid.set(x, y - 1, Cell.setProcessed(Cell.setVelocity(magma, 0, -speed)));
    return true;
  }

  /**
   * Crack the weakest rock around the body if overpressure exceeds its strength
   */
  private fracture(grid: Grid, body: MagmaBody): void {
    const width = grid.width;
    const candidates: Array<{ idx: number; strength: number }> = [];

    for (const idx of body.rockNeighbors) {
      const cell = grid.getUnsafe(idx);
      if (!this.isRigid(cell)) continue; // Changed earlier this frame
      const x = idx % width;
      const y = (idx - x) / width;
      const strength = this.rockStrength(grid, x, y, cell);
      if (strength < body.pressure) candidates.push({ idx, strength });
    }
    candidates.sort((a, b) => a.strength - b.strength);

    const dropPerCell = BULK_MODULUS / body.cells.length;
    let fractures = 0;

    for (const { idx, strength } of candidates) {
      if (fractures >= MAX_FRACTURES_PER_FRAME || body.pressure <= strength) break;
      const x = idx % width;
      const y = (idx - x) / width;

      if (y > 0 && !this.isRigid(grid.get(x, y - 1)) && !this.isLava(grid.get(x, y - 1))) {
        // Last layer of rock below open space: explosive breakthrough
        const speed = Math.min(MAX_BLAST_SPEED, 2 + (body.pressure - strength) / 400);
        const debris = Cell.create(MaterialType.Ash, Cell.getTemperature(grid.getUnsafe(idx)), 0);
        grid.setUnsafe(idx, Cell.setVelocity(debris, (Math.random() - 0.5) * speed, -speed));
        const radius = Math.min(MAX_BLAST_RADIUS, 2 + Math.floor(body.pressure / 2000));
        this.applyBlastWave(grid, x, y, radius, speed);
        body.pressure -= dropPerCell * BREAKTHROUGH_COST;
      } else {
        // Magma fills the crack and the dike grows
        grid.setUnsafe(idx, Cell.create(MaterialType.Lava, body.temperature, body.pressure));
        body.cells.push(idx);
        body.pressure -= dropPerCell;
      }
      fractures++;
    }
    body.pressure = Math.max(0, body.pressure);
  }

  /**
   * Rock under a heavy load (everything above it, including magma and
   * water) is confined and strong; hot rock is weak
   */
  private rockStrength(grid: Grid, x: number, y: number, cell: Cell): number {
    let overburden = 0;
    for (let yy = y - 1; yy >= 0 && overburden < MAX_OVERBURDEN; yy--) {
      const above = grid.get(x, yy);
      if (Cell.isEmpty(above)) continue;
      overburden += MaterialRegistry.get(Cell.getMaterialId(above)).density / ROCK_DENSITY;
    }
    overburden = Math.min(MAX_OVERBURDEN, overburden);
    const temp = Cell.getTemperature(cell);
    const hotWeakening = Math.max(0, temp - HOT_WEAKENING_START) * HOT_WEAKENING_PER_DEGREE;
    return BASE_STRENGTH + overburden * STRENGTH_PER_OVERBURDEN_CELL - hotWeakening;
  }

  /**
   * Store the body's shared pressure in every cell, and keep fed chambers
   * molten. Exposed magma in a quiet vent crusts over instead, sealing the
   * vent and restarting the pressure cycle.
   */
  private writeBack(grid: Grid, body: MagmaBody): void {
    const reheatTo = Math.min(body.temperature, MAGMA_TEMPERATURE);
    const exposed = new Set(body.freeSurface);
    const quiet = body.pressure < EXTRUDE_PRESSURE;
    for (const idx of body.cells) {
      let cell = grid.getUnsafe(idx);
      if (!this.isLava(cell)) continue; // Changed this frame

      if (exposed.has(idx)) {
        if (body.fed > 0 && quiet && Math.random() < CRUST_CHANCE) {
          const crustTemp = Math.min(Cell.getTemperature(cell), CRUST_TEMPERATURE);
          grid.setUnsafe(idx, Cell.create(MaterialType.Rock, crustTemp, 0));
          continue;
        }
      } else if (body.fed > 0 && Cell.getTemperature(cell) < reheatTo) {
        cell = Cell.setTemperature(cell, reheatTo);
      }
      grid.setUnsafe(idx, Cell.setPressure(cell, body.pressure));
    }
  }

  /**
   * Push nearby non-solid cells outward from an explosion center
   */
  private applyBlastWave(grid: Grid, cx: number, cy: number, radius: number, maxSpeed: number): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (!grid.inBounds(nx, ny)) continue;

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        const neighbor = grid.get(nx, ny);
        if (Cell.isEmpty(neighbor) || this.isRigid(neighbor)) continue;

        // Speed falls off with distance
        const speed = maxSpeed * (1 - dist / (radius + 1));
        grid.set(
          nx,
          ny,
          Cell.setVelocity(
            neighbor,
            Cell.getVelocityX(neighbor) + (dx / dist) * speed,
            Cell.getVelocityY(neighbor) + (dy / dist) * speed
          )
        );
      }
    }
  }

  private isLava(cell: Cell): boolean {
    return !Cell.isEmpty(cell) && Cell.getMaterialId(cell) === MaterialType.Lava;
  }

  /**
   * Solids that hold pressure; loose ash does not
   */
  private isRigid(cell: Cell): boolean {
    if (Cell.isEmpty(cell)) return false;
    const materialId = Cell.getMaterialId(cell);
    return (
      materialId !== MaterialType.Ash &&
      MaterialRegistry.get(materialId).state === MaterialState.Solid
    );
  }

  private isGas(cell: Cell): boolean {
    return Cell.isEmpty(cell) || MaterialRegistry.get(Cell.getMaterialId(cell)).state === MaterialState.Gas;
  }
}
