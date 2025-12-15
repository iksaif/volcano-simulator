// Material behavior rules and update dispatch system

import { Grid } from '../core/Grid';
import { Cell } from '../core/Cell';
import { MaterialType, MaterialState } from '../core/Types';
import { MaterialRegistry } from '../materials/MaterialRegistry';

// Import generic behaviors
import { updateSolid, updateLiquid, updateGas } from '../materials/behaviors/GenericBehaviors';

// Import custom material behaviors (only those with special logic)
import { updateVapor } from '../materials/behaviors/VaporBehavior';

type UpdateFunction = (grid: Grid, x: number, y: number, cell: Cell) => void;

export class MaterialRules {
  private static rules = new Map<number, UpdateFunction>();

  /**
   * Register all material update rules
   * Materials without custom behavior will use generic state-based behavior
   */
  static init(): void {
    // Only register custom behaviors
    this.register(MaterialType.Vapor, updateVapor);

    // All other materials use generic behavior based on their state
    // (Lava, Water, Rock, Gas, Air use generic solid/liquid/gas behavior)
  }

  /**
   * Register an update function for a material
   */
  static register(materialId: number, updateFn: UpdateFunction): void {
    this.rules.set(materialId, updateFn);
  }

  /**
   * Update a cell based on its material type
   * Falls back to generic behavior based on material state if no custom rule exists
   */
  static update(grid: Grid, x: number, y: number, cell: Cell): void {
    const materialId = Cell.getMaterialId(cell);
    const updateFn = this.rules.get(materialId);

    if (updateFn) {
      // Use custom behavior if registered
      updateFn(grid, x, y, cell);
    } else {
      // Fall back to generic behavior based on material state
      const material = MaterialRegistry.get(materialId);
      switch (material.state) {
        case MaterialState.Solid:
          updateSolid(grid, x, y, cell);
          break;
        case MaterialState.Liquid:
          updateLiquid(grid, x, y, cell);
          break;
        case MaterialState.Gas:
          updateGas(grid, x, y, cell);
          break;
      }
    }
  }
}
