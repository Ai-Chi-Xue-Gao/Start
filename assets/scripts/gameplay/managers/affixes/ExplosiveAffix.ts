// assets/scripts/gameplay/managers/affixes/ExplosiveAffix.ts

import { Vec3 } from 'cc';
import { IAffixStrategy } from './IAffixStrategy';
import { IAffixTarget } from '../../../interfaces/IAffixTarget';
import { EnemyAffixData } from '../AffixData';
import { AffixConfig } from '../../../configs/AffixConfig';
import { EventBus } from '../../../core/EventBus';
import { EventNames } from '../../../utils/EventNames';

/**
 * 自爆词条：死亡时爆炸，对范围造成伤害
 */
export class ExplosiveAffix implements IAffixStrategy {
    id = 'explosive';

    onDeath(target: IAffixTarget, config: AffixConfig, _data: EnemyAffixData, position: Vec3): boolean {
        const stats = config.stats!;
        const explosionRadius = stats.explosionRadius || 100;
        const explosionDamagePercent = stats.explosionDamagePercent || 0.5;
        const explosionDamage = target.damage * explosionDamagePercent;
        EventBus.emit(EventNames.ENEMY_EXPLOSION, { position, radius: explosionRadius, damage: explosionDamage });
        return false;
    }
}