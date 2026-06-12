// assets/scripts/gameplay/managers/affixes/IAffixStrategy.ts

import { Vec3 } from 'cc';
import { IAffixTarget } from '../../../interfaces/IAffixTarget';
import { EnemyAffixData } from '../AffixData';
import { AffixConfig } from '../../../configs/AffixConfig';

/**
 * 词条行为策略接口
 * 
 * 每种需要特殊逻辑的词条实现此接口，
 * AffixSystem 通过工厂获取策略并委托执行。
 */
export interface IAffixStrategy {
    /** 词条唯一标识（对应配置中的 id） */
    readonly id: string;

    /** 词条首次应用到敌人时调用 */
    onApply?(target: IAffixTarget, config: AffixConfig, data: EnemyAffixData): void;

    /** 每帧 update 回调 */
    onUpdate?(target: IAffixTarget, config: AffixConfig, data: EnemyAffixData, deltaTime: number): void;

    /** 敌人受伤回调（可修改最终伤害值） */
    onHit?(target: IAffixTarget, config: AffixConfig, data: EnemyAffixData, damage: number): number;

    /** 敌人击中玩家回调（可修改伤害值） */
    onHitPlayer?(target: IAffixTarget, config: AffixConfig, data: EnemyAffixData, damage: number): number;

    /** 敌人死亡回调（返回 true 阻止死亡，用于复活类词条） */
    onDeath?(target: IAffixTarget, config: AffixConfig, data: EnemyAffixData, position: Vec3): boolean;
}