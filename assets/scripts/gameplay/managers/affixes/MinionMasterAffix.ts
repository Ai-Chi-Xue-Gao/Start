// assets/scripts/gameplay/managers/affixes/MinionMasterAffix.ts

import { IAffixStrategy } from './IAffixStrategy';
import { IAffixTarget } from '../../../interfaces/IAffixTarget';
import { EnemyAffixData } from '../AffixData';
import { AffixConfig } from '../../../configs/AffixConfig';
import { EventBus } from '../../../core/EventBus';
import { EventNames } from '../../../utils/EventNames';

/**
 * 召唤师词条：每隔 n 秒召唤 m 个小怪
 */
export class MinionMasterAffix implements IAffixStrategy {
    id = 'minion_master';

    onUpdate(target: IAffixTarget, config: AffixConfig, data: EnemyAffixData, deltaTime: number): void {
        const stats = config.stats!;
        data.summonTimer += deltaTime;
        if (data.summonTimer >= stats.summonInterval) {
            data.summonTimer = 0;
            const position = target.node.worldPosition;
            EventBus.emit(EventNames.ENEMY_SUMMON, { position, count: stats.summonCount, parentEnemy: target });
        }
    }
}