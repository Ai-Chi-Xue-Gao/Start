// assets/scripts/gameplay/managers/affixes/FrostAffix.ts

import { IAffixStrategy } from './IAffixStrategy';
import { IAffixTarget } from '../../../interfaces/IAffixTarget';
import { EnemyAffixData } from '../AffixData';
import { AffixConfig } from '../../../configs/AffixConfig';
import { EventBus } from '../../../core/EventBus';
import { EventNames } from '../../../utils/EventNames';

/**
 * 寒霜词条：攻击时减速玩家
 */
export class FrostAffix implements IAffixStrategy {
    id = 'frost';

    onHitPlayer(_target: IAffixTarget, config: AffixConfig, _data: EnemyAffixData, damage: number): number {
        const slowPercent = config.stats?.slowPercent || 0.3;
        const slowDuration = config.stats?.slowDuration || 1.5;
        EventBus.emit(EventNames.PLAYER_SLOW, { percent: slowPercent, duration: slowDuration });
        return damage;
    }
}