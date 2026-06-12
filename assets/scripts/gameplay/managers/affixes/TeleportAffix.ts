// assets/scripts/gameplay/managers/affixes/TeleportAffix.ts

import { IAffixStrategy } from './IAffixStrategy';
import { IAffixTarget } from '../../../interfaces/IAffixTarget';
import { EnemyAffixData } from '../AffixData';
import { AffixConfig } from '../../../configs/AffixConfig';

/**
 * 瞬移词条：受伤时有概率传送到附近随机位置
 */
export class TeleportAffix implements IAffixStrategy {
    id = 'teleport';

    onHit(target: IAffixTarget, config: AffixConfig, _data: EnemyAffixData, damage: number): number {
        const stats = config.stats!;
        if (Math.random() < (stats.teleportChance || 0.3)) {
            const radius = stats.teleportRadius || 300;
            const randomX = (Math.random() - 0.5) * radius * 2;
            const randomY = (Math.random() - 0.5) * radius * 2;
            target.node.setPosition(randomX, randomY, 0);
        }
        return damage;
    }
}