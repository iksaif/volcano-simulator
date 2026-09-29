// Eruptive physics engine
// Pass-based engine with pressure buildup, rock fracture, and explosive ejection

import { Grid } from '../../../core/Grid';
import type { IPhysicsEngine, IPhysicsEnginePass } from '../../IPhysicsEngine';
import { ClearFlagsPass } from './passes/ClearFlagsPass';
import { MagmaChamberPass } from './passes/MagmaChamberPass';
import { EruptiveMaterialMovement } from './passes/EruptiveMaterialMovement';
import { ThermalDiffusion } from '../cellular/ThermalDiffusion';
import { StateTransitions } from '../cellular/StateTransitions';
import { GrassGrowth } from '../cellular/GrassGrowth';
import { FillAirPass } from './passes/FillAirPass';
import { MaterialRules } from '../cellular/MaterialRules';

export class EruptivePhysicsEngine implements IPhysicsEngine {
  private passes: IPhysicsEnginePass[];

  constructor() {
    // Initialize material rules (needed by cellular behaviors)
    MaterialRules.init();

    this.passes = [
      new ClearFlagsPass(),
      new MagmaChamberPass(),
      new EruptiveMaterialMovement(),
      new ThermalDiffusion(),
      new StateTransitions(),
      new GrassGrowth(),
      new FillAirPass(),
    ];
  }

  getName(): string {
    return 'Eruptive';
  }

  getDescription(): string {
    return 'Pressure buildup, rock fracture, and explosive volcanic eruptions';
  }

  update(grid: Grid, deltaTime: number): void {
    for (const pass of this.passes) {
      pass.execute(grid, deltaTime);
    }
  }
}
