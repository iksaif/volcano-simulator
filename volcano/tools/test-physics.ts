#!/usr/bin/env tsx
// Unified physics test runner

import { Grid } from '../src/core/Grid';
import { Cell } from '../src/core/Cell';
import { MaterialType } from '../src/core/Types';
import { MaterialRegistry } from '../src/materials/MaterialRegistry';
import { PhysicsEngineRegistry } from '../src/physics/PhysicsEngineRegistry';

// Parse args
const args = process.argv.slice(2);
const testName = args.find(arg => !arg.startsWith('--'))?.toLowerCase() || 'help';
const engineId = args.find(arg => arg.startsWith('--engine='))?.split('=')[1] || 'fluiddynamics';
const frames = parseInt(args.find(arg => arg.startsWith('--frames='))?.split('=')[1] || '100');
const gridSize = parseInt(args.find(arg => arg.startsWith('--size='))?.split('=')[1] || '16');
const debug = args.includes('--debug');

// Pass debug flag to MotionPass
if (debug) {
  (globalThis as any).MOTION_PASS_DEBUG = true;
}

if (testName === 'help') {
  console.log('Usage: npm run test-physics <test-name> [options]');
  console.log('');
  console.log('Tests:');
  console.log('  air-stability    Test that air-filled grid stays unchanged');
  console.log('  rock-pile        Test that stacked rocks don\'t disappear');
  console.log('  pass-by-pass     Test each physics pass individually');
  console.log('  basic            Test basic physics (rock/water/gas)');
  console.log('');
  console.log('Options:');
  console.log('  --engine=<name>  Physics engine to use (default: fluiddynamics)');
  console.log('  --frames=<n>     Number of frames to run (default: 100)');
  console.log('  --size=<n>       Grid size (default: 16)');
  console.log('  --debug          Enable debug logging');
  process.exit(0);
}

MaterialRegistry.init();
PhysicsEngineRegistry.init();

if (testName === 'air-stability') {
  testAirStability();
} else if (testName === 'rock-pile') {
  testRockPile();
} else if (testName === 'pass-by-pass') {
  testPassByPass();
} else if (testName === 'basic') {
  testBasicPhysics();
} else {
  console.error(`Unknown test: ${testName}`);
  console.log('Run with "help" to see available tests');
  process.exit(1);
}

function testAirStability() {
  console.log('🧪 AIR STABILITY TEST');
  console.log('='.repeat(60));
  console.log(`Grid: ${gridSize}x${gridSize}, Frames: ${frames}, Engine: ${engineId}\n`);

  const engine = PhysicsEngineRegistry.create(engineId);
  const grid = new Grid(gridSize, gridSize);

  // Fill entire grid with air
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const air = new Cell(MaterialType.Air, 20, 0, 0, 0, 0, 1, -1, false);
      grid.set(x, y, air);
    }
  }

  const initialCount = countMaterial(grid, MaterialType.Air);
  const initialEmpty = countEmpty(grid);
  console.log(`Initial: ${initialCount} air cells, ${initialEmpty} empty cells\n`);

  console.log('Running simulation...\n');

  const dt = 50;
  for (let frame = 0; frame < frames; frame++) {
    engine.update(grid, dt);

    const airCount = countMaterial(grid, MaterialType.Air);
    const emptyCount = countEmpty(grid);

    if (frame % 10 === 0 || frame === 0) {
      console.log(`Frame ${frame.toString().padStart(3)}: ${airCount} air, ${emptyCount} empty`);
    }

    if (airCount < initialCount || emptyCount > initialEmpty) {
      console.log(`\n⚠️  CELLS CHANGED! Air: ${initialCount} -> ${airCount}, Empty: ${initialEmpty} -> ${emptyCount}`);
      console.log('\nGrid state:');
      printGrid(grid);
      break;
    }
  }

  const finalAir = countMaterial(grid, MaterialType.Air);
  const finalEmpty = countEmpty(grid);

  console.log(`\nFinal: ${finalAir} air cells, ${finalEmpty} empty cells`);

  if (finalAir === initialCount && finalEmpty === initialEmpty) {
    console.log('✅ TEST PASSED: Grid unchanged');
  } else {
    console.log(`❌ TEST FAILED: Lost ${initialCount - finalAir} air cells, gained ${finalEmpty - initialEmpty} empty cells`);
    console.log('\nFinal grid:');
    printGrid(grid);
  }
}

function testRockPile() {
  console.log('🧪 ROCK PILE STABILITY TEST');
  console.log('='.repeat(60));
  console.log(`Grid: ${gridSize}x${gridSize}, Frames: ${frames}, Engine: ${engineId}\n`);

  const engine = PhysicsEngineRegistry.create(engineId);
  const grid = new Grid(gridSize, gridSize);

  // Create platform at bottom
  for (let x = 0; x < gridSize; x++) {
    grid.set(x, gridSize - 1, new Cell(MaterialType.Rock, 20, 0, 0, 0, 0, 1, -1, false));
  }

  // Add falling rocks above
  const pileHeight = Math.min(10, gridSize - 2);
  for (let y = 0; y < pileHeight; y++) {
    for (let x = 0; x < gridSize; x++) {
      grid.set(x, y, new Cell(MaterialType.Rock, 20, 0, 0, 0, 0, 1, -1, false));
    }
  }

  console.log('Initial grid (falling rocks + platform):');
  printGrid(grid);

  const initialRockCount = countMaterial(grid, MaterialType.Rock);
  console.log(`\nInitial rock count: ${initialRockCount}`);
  console.log('\nRunning simulation...\n');

  const dt = 50;
  for (let frame = 0; frame < frames; frame++) {
    engine.update(grid, dt);

    const rockCount = countMaterial(grid, MaterialType.Rock);
    if (frame % 20 === 0) {
      console.log(`Frame ${frame.toString().padStart(3)}: ${rockCount} rocks`);
      if (rockCount < initialRockCount) {
        console.log('  Grid state:');
        printGrid(grid);
      }
    }

    if (rockCount < initialRockCount) {
      console.log(`\n⚠️  ROCKS DISAPPEARED! Lost ${initialRockCount - rockCount} rocks at frame ${frame}`);
      if (frame % 20 !== 0) {
        console.log('\nCurrent grid:');
        printGrid(grid);
      }
      break;
    }
  }

  const finalRockCount = countMaterial(grid, MaterialType.Rock);
  console.log('\nFinal grid:');
  printGrid(grid);
  console.log(`\nFinal rock count: ${finalRockCount}`);

  if (finalRockCount === initialRockCount) {
    console.log('✅ TEST PASSED: All rocks preserved');
  } else {
    console.log(`❌ TEST FAILED: Lost ${initialRockCount - finalRockCount} rocks`);
  }
}

function testPassByPass() {
  console.log('🔍 PASS-BY-PASS TEST');
  console.log('='.repeat(60));
  console.log(`Grid: ${gridSize}x${gridSize}\n`);

  const { PhaseTransitionPass } = require('../src/physics/engines/fluiddynamics/passes/PhaseTransitionPass');
  const { SolidStructurePass } = require('../src/physics/engines/fluiddynamics/passes/SolidStructurePass');
  const { FracturePass } = require('../src/physics/engines/fluiddynamics/passes/FracturePass');
  const { ForcesPass } = require('../src/physics/engines/fluiddynamics/passes/ForcesPass');
  const { MotionPass } = require('../src/physics/engines/fluiddynamics/passes/MotionPass');
  const { LiquidCorrectionPass } = require('../src/physics/engines/fluiddynamics/passes/LiquidCorrectionPass');
  const { InteractionsPass } = require('../src/physics/engines/fluiddynamics/passes/InteractionsPass');
  const { ThermalDiffusionPass } = require('../src/physics/engines/fluiddynamics/passes/ThermalDiffusionPass');
  const { CrustFormationPass } = require('../src/physics/engines/fluiddynamics/passes/CrustFormationPass');

  const grid = new Grid(gridSize, gridSize);

  // Create platform + falling rocks
  for (let x = 0; x < gridSize; x++) {
    grid.set(x, gridSize - 1, new Cell(MaterialType.Rock, 20, 0, 0, 0, 0, 1, -1, false));
  }
  const pileHeight = Math.min(10, gridSize - 2);
  for (let y = 0; y < pileHeight; y++) {
    for (let x = 0; x < gridSize; x++) {
      grid.set(x, y, new Cell(MaterialType.Rock, 20, 0, 0, 0, 0, 1, -1, false));
    }
  }

  const initialCount = countMaterial(grid, MaterialType.Rock);
  console.log(`Initial rock count: ${initialCount}\n`);

  const dt = 0.05;
  const gravity = 9.8;

  // Run multiple frames
  for (let frame = 1; frame <= 10; frame++) {
    console.log(`\nFrame ${frame} - Checking after each pass:`);

    let rockCount = countMaterial(grid, MaterialType.Rock);
    console.log(`Before passes: ${rockCount} rocks`);

    PhaseTransitionPass.execute(grid, dt);
    rockCount = countMaterial(grid, MaterialType.Rock);
    console.log(`After PhaseTransitionPass: ${rockCount} rocks ${rockCount < initialCount ? '⚠️  LOST ' + (initialCount - rockCount) : ''}`);

    SolidStructurePass.execute(grid);
    rockCount = countMaterial(grid, MaterialType.Rock);
    console.log(`After SolidStructurePass: ${rockCount} rocks ${rockCount < initialCount ? '⚠️  LOST ' + (initialCount - rockCount) : ''}`);

    FracturePass.execute(grid, gravity);
    rockCount = countMaterial(grid, MaterialType.Rock);
    console.log(`After FracturePass: ${rockCount} rocks ${rockCount < initialCount ? '⚠️  LOST ' + (initialCount - rockCount) : ''}`);

    ForcesPass.execute(grid, gravity, dt);
    rockCount = countMaterial(grid, MaterialType.Rock);
    console.log(`After ForcesPass: ${rockCount} rocks ${rockCount < initialCount ? '⚠️  LOST ' + (initialCount - rockCount) : ''}`);

    MotionPass.execute(grid, dt);
    rockCount = countMaterial(grid, MaterialType.Rock);
    console.log(`After MotionPass: ${rockCount} rocks ${rockCount < initialCount ? '⚠️  LOST ' + (initialCount - rockCount) : ''}`);

    LiquidCorrectionPass.execute(grid, gravity);
    rockCount = countMaterial(grid, MaterialType.Rock);
    console.log(`After LiquidCorrectionPass: ${rockCount} rocks ${rockCount < initialCount ? '⚠️  LOST ' + (initialCount - rockCount) : ''}`);

    InteractionsPass.execute(grid, dt);
    rockCount = countMaterial(grid, MaterialType.Rock);
    console.log(`After InteractionsPass: ${rockCount} rocks ${rockCount < initialCount ? '⚠️  LOST ' + (initialCount - rockCount) : ''}`);

    ThermalDiffusionPass.execute(grid, dt);
    rockCount = countMaterial(grid, MaterialType.Rock);
    console.log(`After ThermalDiffusionPass: ${rockCount} rocks ${rockCount < initialCount ? '⚠️  LOST ' + (initialCount - rockCount) : ''}`);

    CrustFormationPass.execute(grid);
    rockCount = countMaterial(grid, MaterialType.Rock);
    console.log(`After CrustFormationPass: ${rockCount} rocks ${rockCount < initialCount ? '⚠️  LOST ' + (initialCount - rockCount) : ''}`);

    if (rockCount < initialCount) {
      console.log(`\n⚠️  Rocks disappeared in frame ${frame}! Breaking...`);
      break;
    }
  }

  console.log(`\nFinal count: ${countMaterial(grid, MaterialType.Rock)}/${initialCount}`);
}

function testBasicPhysics() {
  console.log('🧪 BASIC PHYSICS TEST');
  console.log('='.repeat(60));
  console.log(`Engine: ${engineId}\n`);

  const engine = PhysicsEngineRegistry.create(engineId);

  // Test 1: Rock falling
  console.log('Test 1: Rock falling in air');
  const grid1 = new Grid(16, 16);
  grid1.set(8, 5, new Cell(MaterialType.Rock, 20, 0, 0, 0, 0, 1, -1, false));

  console.log('Initial:');
  printGrid(grid1);

  for (let i = 0; i < 10; i++) {
    engine.update(grid1, 50);
  }

  console.log('\nAfter 10 frames:');
  printGrid(grid1);

  const rockY = findMaterial(grid1, MaterialType.Rock);
  if (rockY && rockY > 5) {
    console.log(`✅ Rock fell from y=5 to y=${rockY}`);
  } else {
    console.log('❌ Rock did not fall');
  }

  // Test 2: Water falling
  console.log('\n\nTest 2: Water falling in air');
  const grid2 = new Grid(16, 16);
  grid2.set(8, 2, new Cell(MaterialType.Water, 20, 0, 0, 0, 0, 1, -1, false));

  console.log('Initial:');
  printGrid(grid2);

  for (let i = 0; i < 10; i++) {
    engine.update(grid2, 50);
  }

  console.log('\nAfter 10 frames:');
  printGrid(grid2);

  const waterY = findMaterial(grid2, MaterialType.Water);
  if (waterY && waterY > 2) {
    console.log(`✅ Water fell from y=2 to y=${waterY}`);
  } else {
    console.log('❌ Water did not fall');
  }

  // Test 3: Gas in water
  console.log('\n\nTest 3: Gas rising in water');
  const grid3 = new Grid(16, 16);
  // Fill with water
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      grid3.set(x, y, new Cell(MaterialType.Water, 20, 0, 0, 0, 0, 1, -1, false));
    }
  }
  // Place gas at bottom
  grid3.set(8, 14, new Cell(MaterialType.Gas, 20, 0, 0, 0, 0, 1, -1, false));

  console.log('Initial (gas at bottom of water):');
  printGrid(grid3);

  for (let i = 0; i < 10; i++) {
    engine.update(grid3, 50);
  }

  console.log('\nAfter 10 frames:');
  printGrid(grid3);

  const gasY = findMaterial(grid3, MaterialType.Gas);
  if (gasY && gasY < 14) {
    console.log(`✅ Gas rose from y=14 to y=${gasY}`);
  } else {
    console.log('❌ Gas did not rise');
  }
}

// Helper functions
function countMaterial(grid: Grid, materialId: MaterialType): number {
  let count = 0;
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.get(x, y);
      if (!Cell.isEmpty(cell) && Cell.getMaterialId(cell) === materialId) {
        count++;
      }
    }
  }
  return count;
}

function countEmpty(grid: Grid): number {
  let count = 0;
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (Cell.isEmpty(grid.get(x, y))) {
        count++;
      }
    }
  }
  return count;
}

function findMaterial(grid: Grid, materialId: MaterialType): number | null {
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.get(x, y);
      if (!Cell.isEmpty(cell) && Cell.getMaterialId(cell) === materialId) {
        return y;
      }
    }
  }
  return null;
}

function printGrid(grid: Grid): void {
  const symbols: Record<number, string> = {
    [MaterialType.Empty]: '·',
    [MaterialType.Rock]: '█',
    [MaterialType.Lava]: '≈',
    [MaterialType.Water]: '~',
    [MaterialType.Gas]: '°',
    [MaterialType.Air]: ' ',
  };

  const maxRows = Math.min(20, grid.height);
  for (let y = 0; y < maxRows; y++) {
    let row = '';
    const maxCols = Math.min(80, grid.width);
    for (let x = 0; x < maxCols; x++) {
      const cell = grid.get(x, y);
      const matId = Cell.getMaterialId(cell);
      row += symbols[matId] || '?';
    }
    console.log(`  ${row}`);
  }
  if (grid.height > maxRows) {
    console.log('  ... (truncated)');
  }
}
