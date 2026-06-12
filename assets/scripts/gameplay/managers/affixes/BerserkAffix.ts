// assets/scripts/gameplay/managers/affixes/BerserkAffix.ts

import { IAffixStrategy } from './IAffixStrategy';
import { IAffixTarget } from '../../../interfaces/IAffixTarget';
import { EnemyAffixData } from '../AffixData';
import { AffixConfig } from '../../../configs/AffixConfig';

/**
 * 狂暴词条：生命值低于阈值时进入狂暴状态
 */
export class BerserkAffix implements IAffixStrategy {
    id = 'berserk';

    onUpdate(target: IAffixTarget, config: AffixConfig, data: EnemyAffixData, _deltaTime: number): void {
        const stats = config.stats!;
        const healthPercent = target.currentHealth / target.maxHealth;

        if (healthPercent <= stats.berserkThreshold && !data.isBerserk) {
            data.isBerserk = true;
            target.setSpeed(data.originalSpeed * stats.berserkSpeedMultiplier);
            target.damage = data.originalDamage * stats.berserkAttackMultiplier;
        }
    }
}