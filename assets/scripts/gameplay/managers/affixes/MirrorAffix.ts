// assets/scripts/gameplay/managers/affixes/MirrorAffix.ts

import { IAffixStrategy } from './IAffixStrategy';
import { IAffixTarget } from '../../../interfaces/IAffixTarget';
import { EnemyAffixData } from '../AffixData';
import { AffixConfig } from '../../../configs/AffixConfig';
import { EventBus } from '../../../core/EventBus';

/**
 * 镜反词条：反弹 n% 受到的伤害
 */
export class MirrorAffix implements IAffixStrategy {
    id = 'mirror';

    onHit(target: IAffixTarget, config: AffixConfig, _data: EnemyAffixData, damage: number): number {
        const stats = config.stats!;
        const reflectPercent = stats.reflectPercent || 0.5;
        const reflectDamage = damage * reflectPercent;
        if (reflectDamage > 0) {
            EventBus.emit('enemy_reflect', { enemy: target, damage: reflectDamage });
        }
        return damage;
    }
}