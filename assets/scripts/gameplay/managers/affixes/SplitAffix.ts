// assets/scripts/gameplay/managers/affixes/SplitAffix.ts

import { Vec3 } from 'cc';
import { IAffixStrategy } from './IAffixStrategy';
import { IAffixTarget } from '../../../interfaces/IAffixTarget';
import { EnemyAffixData } from '../AffixData';
import { AffixConfig } from '../../../configs/AffixConfig';
import { EventBus } from '../../../core/EventBus';
import { EventNames } from '../../../utils/EventNames';

/**
 * 分裂词条：死亡时分裂为多个小怪
 */
export class SplitAffix implements IAffixStrategy {
    id = 'split';

    onDeath(_target: IAffixTarget, config: AffixConfig, _data: EnemyAffixData, position: Vec3): boolean {
        const stats = config.stats!;
        const splitCount = stats.splitCount || 2;
        const splitHealthPercent = stats.splitHealthPercent || 0.5;
        EventBus.emit(EventNames.ENEMY_SPLIT, { position, count: splitCount, healthPercent: splitHealthPercent });
        return false;
    }
}