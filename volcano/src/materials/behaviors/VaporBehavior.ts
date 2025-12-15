// Vapor material behavior (uses generic gas behavior + cooling)

import { Grid } from '../../core/Grid';
import { Cell } from '../../core/Cell';
import { updateGas } from './GenericBehaviors';

/**
 * Vapor is a gas that rises, spreads, and cools over time
 * Uses generic gas behavior plus passive cooling
 */
export function updateVapor(grid: Grid, x: number, y: number, cell: Cell): void {
  // Use generic gas behavior for movement
  updateGas(grid, x, y, cell);

  // Cool down slightly over time (passive cooling)
  // Re-read cell after movement in case it changed position
  const updatedCell = grid.get(x, y);
  if (!Cell.isEmpty(updatedCell)) {
    //const temp = Cell.getTemperature(updatedCell);
    // Slower cooling: -0.25°C per frame (4x slower than before)
    //const newTemp = Math.max(temp - 0.25, Config.ROOM_TEMPERATURE);
    //grid.set(x, y, Cell.setTemperature(updatedCell, newTemp));
  }
}
