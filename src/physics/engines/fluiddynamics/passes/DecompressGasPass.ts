import { Grid } from "../../../../core/Grid";
import { Cell } from "../../../../core/Cell";
import { MaterialType } from "../../../../core/Types";
import type { IPhysicsEnginePass } from "../../../IPhysicsEngine";

export class DecompressGasPass implements IPhysicsEnginePass {
    execute(grid: Grid, _: number): void {
        for (let y = 0; y < grid.height; y++) {
            for (let x = 0; x < grid.width; x++) {
                const cell = grid.get(x, y);
                if (Cell.isEmpty(cell)) continue;
                if (Cell.getMaterialId(cell) !== MaterialType.Gas) continue;
                // For each gas cell see if we could de-compress to a neighboor
                // If there is an empty cell or air
                // This might happen because in an earlier pass our pressure might have moved a solid / liquid
                // TODO: consider moving solids or liquids with pressure here.
            }
        }
    }
}