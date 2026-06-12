// assets/scripts/gameplay/managers/affixes/ImmortalAffix.ts

import { Vec3 } from 'cc';
import { IAffixStrategy } from './IAffixStrategy';
import { IAffixTarget } from '../../../interfaces/IAffixTarget';
import { EnemyAffixData } from '../AffixData';
import { AffixConfig } from '../../../configs/AffixConfig';

/**
 * 不朽词条：死亡时以 n% 生命值复活一次
 */
export class ImmortalAffix implements IAffixStrategy {
    id = 'immortal';

    onDeath(target: IAffixTarget, config: AffixConfig, data: EnemyAffixData, _position: Vec3): boolean {
        if (data.reviveLeft > 0) {
            data.reviveLeft = 0;
            const reviveHealth = Math.floor(target.maxHealth * (config.stats?.reviveHealthPercent || 0.5));
            target.setCurrentHealth(reviveHealth);
            target.isDead = false;
            return true;
        }
        return false;
    }
}