// Clear processed flags from all cells at the start of each frame

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import type { IPhysicsEnginePass } from '../../../IPhysicsEngine';

export class ClearFlagsPass implements IPhysicsEnginePass {
  execute(grid: Grid, _deltaTime: number): void {
    grid.apply((g, x, y) => {
      const cell = g.get(x, y);
      if (!Cell.isEmpty(cell)) {
        g.set(x, y, Cell.clearProcessed(cell));
      }
    });
  }
}
