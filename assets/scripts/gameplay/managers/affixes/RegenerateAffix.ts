// assets/scripts/gameplay/managers/affixes/RegenerateAffix.ts

import { IAffixStrategy } from './IAffixStrategy';
import { IAffixTarget } from '../../../interfaces/IAffixTarget';
import { EnemyAffixData } from '../AffixData';
import { AffixConfig } from '../../../configs/AffixConfig';

/**
 * 再生词条：每秒回复最大生命值的 n%
 */
export class RegenerateAffix implements IAffixStrategy {
    id = 'regenerate';

    onUpdate(target: IAffixTarget, config: AffixConfig, data: EnemyAffixData, deltaTime: number): void {
        data.regenerateTimer += deltaTime;
        if (data.regenerateTimer >= 1.0) {
            data.regenerateTimer = 0;
            const healAmount = Math.floor(target.maxHealth * config.stats!.regeneratePercent);
            target.setCurrentHealth(Math.min(target.maxHealth, target.currentHealth + healAmount));
        }
    }
}