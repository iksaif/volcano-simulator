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
  console.log('  velocity         Test velocity tracking in cellular engine');
  console.log('  eruption         Test eruptive fracture and ejection');
  console.log('  gas-buoyancy     Test gas rising through liquid');
  console.log('  pressure-buildup Test sealed chamber pressure accumulation');
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
} else if (testName === 'velocity') {
  testVelocity();
} else if (testName === 'eruption') {
  testEruption();
} else if (testName === 'gas-buoyancy') {
  testGasBuoyancy();
} else if (testName === 'pressure-buildup') {
  testPressureBuildup();
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

function testVelocity() {
  console.log('🧪 VELOCITY TRACKING TEST');
  console.log('='.repeat(60));
  console.log(`Grid: ${gridSize}x${gridSize}, Frames: ${frames}, Engine: ${engineId}\n`);

  const engine = PhysicsEngineRegistry.create(engineId);
  const grid = new Grid(gridSize, gridSize);

  // Create a simple falling scenario - lava in air
  const startY = 2;
  const startX = Math.floor(gridSize / 2);
  grid.set(startX, startY, new Cell(MaterialType.Lava, 1200, 0, 0, 0, 0, 1, -1, false));

  console.log(`Initial: Lava at (${startX}, ${startY})`);
  console.log('Running simulation and checking velocities after each frame...\n');

  const dt = 50;
  let totalCellsWithVelocity = 0;

  for (let frame = 0; frame < frames; frame++) {
    engine.update(grid, dt);

    // Count and report cells with non-zero velocity
    let cellsWithVelocity = 0;
    let maxVelocity = 0;
    const cellsWithVelocityDetails: Array<{x: number, y: number, vx: number, vy: number}> = [];

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.get(x, y);
        if (Cell.isEmpty(cell)) continue;

        const vx = cell.vx;
        const vy = cell.vy;
        const magnitude = Math.sqrt(vx * vx + vy * vy);

        if (magnitude > 0.01) {
          cellsWithVelocity++;
          cellsWithVelocityDetails.push({x, y, vx, vy});
          if (magnitude > maxVelocity) maxVelocity = magnitude;
        }
      }
    }

    if (cellsWithVelocity > 0) {
      totalCellsWithVelocity += cellsWithVelocity;
    }

    // Report every 10 frames or if we have velocity
    if (frame % 10 === 0 || cellsWithVelocity > 0) {
      console.log(`Frame ${frame.toString().padStart(3)}: ${cellsWithVelocity} cells with velocity, max magnitude: ${maxVelocity.toFixed(2)}`);

      // Show first few cells with velocity
      if (cellsWithVelocity > 0 && frame < 30) {
        const showCount = Math.min(5, cellsWithVelocityDetails.length);
        for (let i = 0; i < showCount; i++) {
          const c = cellsWithVelocityDetails[i];
          console.log(`  Cell at (${c.x},${c.y}): velocity (${c.vx.toFixed(2)}, ${c.vy.toFixed(2)})`);
        }
        if (cellsWithVelocityDetails.length > showCount) {
          console.log(`  ... and ${cellsWithVelocityDetails.length - showCount} more`);
        }
      }
    }

    // Find where the lava ended up
    if (frame % 10 === 0) {
      const lavaPos = findMaterial(grid, MaterialType.Lava);
      if (lavaPos !== null) {
        console.log(`  Lava position: y=${lavaPos}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  if (totalCellsWithVelocity > 0) {
    console.log(`✅ TEST PASSED: Detected ${totalCellsWithVelocity} total cell-frames with velocity`);
  } else {
    console.log('❌ TEST FAILED: No cells had velocity during entire simulation');
    console.log('   This means velocities are not being set or are being cleared immediately');
  }

  console.log('\nFinal grid:');
  printGrid(grid);
}

function testEruption() {
  console.log('🧪 ERUPTION TEST');
  console.log('='.repeat(60));
  console.log(`Grid: 16x16, Frames: ${frames}, Engine: ${engineId}\n`);

  const engine = PhysicsEngineRegistry.create(engineId);
  const grid = new Grid(16, 16);

  // Fill with air
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      grid.set(x, y, new Cell(MaterialType.Air, 20, 0));
    }
  }

  // Create sealed lava chamber: rock cap at y=6-7, lava below at y=8-13
  // Rock walls on sides (x=4 and x=11)
  for (let y = 6; y <= 13; y++) {
    grid.set(4, y, new Cell(MaterialType.Rock, 20, 0, 0, 0, 0, 1, -1, false));
    grid.set(11, y, new Cell(MaterialType.Rock, 20, 0, 0, 0, 0, 1, -1, false));
  }
  // Rock cap across top
  for (let x = 4; x <= 11; x++) {
    grid.set(x, 6, new Cell(MaterialType.Rock, 20, 0, 0, 0, 0, 1, -1, false));
    grid.set(x, 7, new Cell(MaterialType.Rock, 20, 0, 0, 0, 0, 1, -1, false));
  }
  // Rock floor
  for (let x = 4; x <= 11; x++) {
    grid.set(x, 14, new Cell(MaterialType.Rock, 20, 0, 0, 0, 0, 1, -1, false));
  }
  // Fill chamber with hot lava
  for (let y = 8; y <= 13; y++) {
    for (let x = 5; x <= 10; x++) {
      grid.set(x, y, new Cell(MaterialType.Lava, 1200, 0, 0, 0, 0, 1, -1, false));
    }
  }

  console.log('Initial (sealed lava chamber under rock cap):');
  printGrid(grid);

  const initialRockCount = countMaterial(grid, MaterialType.Rock);
  let fractured = false;
  let materialAboveCap = false;

  const dt = 50;
  for (let frame = 0; frame < frames; frame++) {
    engine.update(grid, dt);

    // Check pressure stats
    let maxPressure = 0;
    let totalPressure = 0;
    let pressureCells = 0;
    for (let y = 8; y <= 13; y++) {
      for (let x = 5; x <= 10; x++) {
        const cell = grid.get(x, y);
        const p = Cell.getPressure(cell);
        if (p > maxPressure) maxPressure = p;
        totalPressure += p;
        pressureCells++;
      }
    }

    // Check if material escaped the chamber (above cap y<6, or outside walls x<4 or x>11)
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const cell = grid.get(x, y);
        const matId = Cell.getMaterialId(cell);
        if (matId === MaterialType.Lava || matId === MaterialType.Ash) {
          // Above cap or outside chamber walls
          if (y < 6 || x < 4 || x > 11) {
            materialAboveCap = true;
          }
        }
      }
    }

    const currentRock = countMaterial(grid, MaterialType.Rock);
    if (currentRock < initialRockCount && !fractured) {
      fractured = true;
      console.log(`\n💥 FRACTURE at frame ${frame}! Rock: ${initialRockCount} -> ${currentRock}`);
    }

    if (frame % 20 === 0 || frame === frames - 1) {
      console.log(`Frame ${frame.toString().padStart(3)}: maxP=${maxPressure.toFixed(0)}, avgP=${(totalPressure / pressureCells).toFixed(0)}, rocks=${currentRock}`);
    }

    if (frame % 50 === 0 && frame > 0) {
      printGrid(grid);
    }
  }

  console.log('\nFinal grid:');
  printGrid(grid);

  if (fractured) {
    console.log('✅ Rock cap fractured under pressure');
  } else {
    console.log('❌ Rock cap did not fracture');
  }

  if (materialAboveCap) {
    console.log('✅ Material escaped the chamber');
  } else {
    console.log('❌ No material escaped the chamber');
  }
}

function testGasBuoyancy() {
  console.log('🧪 GAS BUOYANCY TEST');
  console.log('='.repeat(60));
  console.log(`Grid: 16x16, Frames: ${frames}, Engine: ${engineId}\n`);

  const engine = PhysicsEngineRegistry.create(engineId);
  const grid = new Grid(16, 16);

  // Fill with water
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      grid.set(x, y, new Cell(MaterialType.Water, 20, 0, 0, 0, 0, 1, -1, false));
    }
  }

  // Place gas bubble at bottom
  grid.set(8, 14, new Cell(MaterialType.Gas, 20, 0, 0, 0, 0, 1, -1, false));

  console.log('Initial (gas at y=14 in water column):');
  printGrid(grid);

  const dt = 50;
  for (let frame = 0; frame < frames; frame++) {
    engine.update(grid, dt);

    if (frame % 10 === 0 || frame === frames - 1) {
      const gasY = findMaterial(grid, MaterialType.Gas);
      console.log(`Frame ${frame.toString().padStart(3)}: gas at y=${gasY}`);
    }
  }

  console.log('\nFinal grid:');
  printGrid(grid);

  const finalGasY = findMaterial(grid, MaterialType.Gas);
  if (finalGasY !== null && finalGasY < 10) {
    console.log(`✅ Gas rose from y=14 to y=${finalGasY}`);
  } else {
    console.log(`❌ Gas did not rise enough (at y=${finalGasY})`);
  }
}

function testPressureBuildup() {
  console.log('🧪 PRESSURE BUILDUP TEST');
  console.log('='.repeat(60));
  console.log(`Grid: 16x16, Frames: ${frames}, Engine: ${engineId}\n`);

  const engine = PhysicsEngineRegistry.create(engineId);
  const grid = new Grid(16, 16);

  // Fill with air
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      grid.set(x, y, new Cell(MaterialType.Air, 20, 0));
    }
  }

  // Create sealed chamber: rock box with lava inside
  // Rock walls
  for (let y = 5; y <= 12; y++) {
    grid.set(5, y, new Cell(MaterialType.Rock, 20, 0, 0, 0, 0, 1, -1, false));
    grid.set(10, y, new Cell(MaterialType.Rock, 20, 0, 0, 0, 0, 1, -1, false));
  }
  // Rock top and bottom
  for (let x = 5; x <= 10; x++) {
    grid.set(x, 5, new Cell(MaterialType.Rock, 20, 0, 0, 0, 0, 1, -1, false));
    grid.set(x, 12, new Cell(MaterialType.Rock, 20, 0, 0, 0, 0, 1, -1, false));
  }
  // Lava inside
  for (let y = 6; y <= 11; y++) {
    for (let x = 6; x <= 9; x++) {
      grid.set(x, y, new Cell(MaterialType.Lava, 1200, 0, 0, 0, 0, 1, -1, false));
    }
  }

  console.log('Initial (sealed lava chamber):');
  printGrid(grid);

  const pressureHistory: number[] = [];
  const dt = 50;

  for (let frame = 0; frame < frames; frame++) {
    engine.update(grid, dt);

    // Measure max pressure inside chamber
    let maxPressure = 0;
    for (let y = 6; y <= 11; y++) {
      for (let x = 6; x <= 9; x++) {
        const p = Cell.getPressure(grid.get(x, y));
        if (p > maxPressure) maxPressure = p;
      }
    }
    pressureHistory.push(maxPressure);

    if (frame % 10 === 0 || frame === frames - 1) {
      console.log(`Frame ${frame.toString().padStart(3)}: maxPressure=${maxPressure.toFixed(0)}`);
    }
  }

  // Check monotonic increase in first 20 frames
  let monotonic = true;
  const checkFrames = Math.min(20, pressureHistory.length - 1);
  for (let i = 0; i < checkFrames; i++) {
    if (pressureHistory[i + 1] < pressureHistory[i]) {
      monotonic = false;
      console.log(`  Non-monotonic at frame ${i}: ${pressureHistory[i].toFixed(0)} -> ${pressureHistory[i + 1].toFixed(0)}`);
      break;
    }
  }

  if (monotonic && pressureHistory[checkFrames] > 0) {
    console.log(`✅ Pressure increased monotonically in first ${checkFrames} frames (0 -> ${pressureHistory[checkFrames].toFixed(0)})`);
  } else {
    console.log('❌ Pressure did not increase monotonically');
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
    [MaterialType.Vapor]: '▒',
    [MaterialType.Ice]: '❄',
    [MaterialType.Grass]: '♣',
    [MaterialType.Ash]: '▓',
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
