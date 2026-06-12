// assets/scripts/gameplay/managers/affixes/VampireAffix.ts

import { IAffixStrategy } from './IAffixStrategy';
import { IAffixTarget } from '../../../interfaces/IAffixTarget';
import { EnemyAffixData } from '../AffixData';
import { AffixConfig } from '../../../configs/AffixConfig';

/**
 * 吸血鬼词条：攻击玩家时回复 n% 伤害的生命值
 */
export class VampireAffix implements IAffixStrategy {
    id = 'vampire';

    onHitPlayer(target: IAffixTarget, config: AffixConfig, _data: EnemyAffixData, damage: number): number {
        const healAmount = damage * (config.stats?.healPercent || 0.5);
        const healInt = Math.floor(healAmount);
        target.setCurrentHealth(Math.min(target.maxHealth, target.currentHealth + healInt));
        return damage;
    }
}