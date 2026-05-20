// assets/scripts/gameplay/managers/AffixData.ts

// 从主包导入类型
import { AffixConfig, AffixRarity, CallbackType } from '../../configs/AffixConfig';

// 重新导出（方便分包内部使用）
export type { AffixConfig, AffixRarity, CallbackType };

/**
 * 敌人身上的运行时数据（存储词条状态）
 */
export interface EnemyAffixData {
    affixes: AffixConfig[]     // 当前敌人拥有的词条
    regenerateTimer: number    // 回血计时器
    isBerserk: boolean         // 是否狂暴状态
    originalSpeed: number      // 原始速度（狂暴后恢复用）
    originalDamage: number     // 原始攻击力
    reviveLeft: number         // 剩余复活次数
    shield: number             // 护盾值
    summonTimer: number        // 召唤计时器
    lastDamageType: string     // 上次受伤类型（适应词条用）
    adaptiveResistance: number // 适应减伤比例
}