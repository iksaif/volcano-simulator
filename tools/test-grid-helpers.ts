#!/usr/bin/env tsx
// Test Grid helper functions

import { Grid } from '../src/core/Grid';
import { Cell } from '../src/core/Cell';
import { MaterialType } from '../src/core/Types';

console.log('🧪 GRID HELPERS TEST');
console.log('='.repeat(60));

// Test 1: apply with different orders
console.log('\nTest 1: grid.apply() with different orders');
console.log('-'.repeat(60));

const grid = new Grid(5, 5);

// Test top_left_bottom_right (default)
console.log('\n1a. top_left_bottom_right order:');
let coords: string[] = [];
grid.apply((grid, x, y) => {
  coords.push(`(${x},${y})`);
});
console.log('   ', coords.slice(0, 10).join(', '), '...');

// Test random_within_lines
console.log('\n1b. random_within_lines order (first line randomized):');
coords = [];
grid.apply((grid, x, y) => {
  coords.push(`(${x},${y})`);
}, 'random_within_lines');
console.log('   ', coords.slice(0, 5).join(', '));
console.log('    ^ Notice y=0 for all, but x order is random');

// Test random
console.log('\n1c. random order (both x and y randomized):');
coords = [];
grid.apply((grid, x, y) => {
  coords.push(`(${x},${y})`);
}, 'random');
console.log('   ', coords.slice(0, 10).join(', '), '...');

// Test 2: applyNeighbors
console.log('\n\nTest 2: grid.applyNeighbors()');
console.log('-'.repeat(60));

const grid2 = new Grid(5, 5);

// Place a rock in the center
const rock = new Cell(MaterialType.Rock, 20, 0, 0, 0, 0, 1, -1, false);
grid2.set(2, 2, rock);

console.log('\n2a. Clockwise order (default):');
const neighbors: string[] = [];
grid2.applyNeighbors(2, 2, (grid, nx, ny, dir) => {
  neighbors.push(`${dir}:(${nx},${ny})`);
});
console.log('    Center: (2,2)');
console.log('    Neighbors:', neighbors.join(', '));

console.log('\n2b. Random order:');
const neighbors2: string[] = [];
grid2.applyNeighbors(2, 2, (grid, nx, ny, dir) => {
  neighbors2.push(`${dir}:(${nx},${ny})`);
}, 'random');
console.log('    Center: (2,2)');
console.log('    Neighbors:', neighbors2.join(', '));

// Test 3: Practical example - diffusion
console.log('\n\nTest 3: Practical example - Temperature diffusion using applyNeighbors');
console.log('-'.repeat(60));

const grid3 = new Grid(5, 5);

// Set center cell to high temperature
const hotCell = Cell.setTemperature(grid3.get(2, 2), 500);
grid3.set(2, 2, hotCell);

console.log('\nBefore diffusion:');
printTemps(grid3);

// Simple diffusion: average with neighbors
grid3.apply((grid, x, y) => {
  const cell = grid.get(x, y);
  const temp = Cell.getTemperature(cell);

  let sum = temp;
  let count = 1;

  grid.applyNeighbors(x, y, (grid, nx, ny) => {
    const neighbor = grid.get(nx, ny);
    sum += Cell.getTemperature(neighbor);
    count++;
  });

  const avgTemp = sum / count;
  const newCell = Cell.setTemperature(cell, avgTemp);
  grid.set(x, y, newCell);
});

console.log('\nAfter one diffusion step:');
printTemps(grid3);

console.log('\n✅ All tests completed!');

function printTemps(grid: Grid): void {
  for (let y = 0; y < grid.height; y++) {
    let row = '  ';
    for (let x = 0; x < grid.width; x++) {
      const temp = Cell.getTemperature(grid.get(x, y));
      row += temp.toFixed(0).padStart(4) + ' ';
    }
    console.log(row);
  }
}
