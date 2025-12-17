import { Grid } from "../../../../core/Grid";
import { Cell } from "../../../../core/Cell";
import { MaterialType } from "../../../../core/Types";
import type { IPhysicsEnginePass } from "../../../IPhysicsEngine";

export class CompressGasPass implements IPhysicsEnginePass {
    execute(grid: Grid, _: number): void {
        for (let y = 0; y < grid.height; y++) {
            for (let x = 0; x < grid.width; x++) {
                const cell = grid.get(x, y);
                if (Cell.isEmpty(cell)) continue;
                if (Cell.getMaterialId(cell) !== MaterialType.Gas) continue;
                // For each gas cell see if we could compress with a neighboor
                // This can happen if a neighboor cell wants to move to us with high enough energy and we have a cell of similar
                // material to one of our sides
            }
        }
    }
}