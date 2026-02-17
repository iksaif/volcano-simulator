// Fill empty cells with air after physics updates

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import { MaterialType } from '../../../../core/Types';
import type { IPhysicsEnginePass } from '../../../IPhysicsEngine';

export class FillAirPass implements IPhysicsEnginePass {
  execute(grid: Grid, _deltaTime: number): void {
    grid.apply((g, x, y) => {
      const cell = g.get(x, y);
      if (Cell.isEmpty(cell)) {
        g.set(x, y, Cell.create(MaterialType.Air, 20, 0));
      }
    });
  }
}
