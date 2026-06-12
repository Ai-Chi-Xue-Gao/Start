// assets/scripts/interfaces/IAffixTarget.ts

import { Node } from 'cc';
import { EnemyAffixData } from '../gameplay/managers/AffixData';

/**
 * 可应用词条的目标对象接口
 * 用于 AffixSystem 与 Enemy / NetworkEnemy 解耦
 * 
 * 所有 AffixSystem 对敌人的操作都通过此接口，
 * 彻底消除 (enemy as any) 的写法。
 */
export interface IAffixTarget {

    // ========== 可读可写属性 ==========

    /** 当前移动速度 */
    speed: number;

    /** 基础伤害 */
    damage: number;

    /** 最大生命值 */
    maxHealth: number;

    /** 当前生命值 */
    currentHealth: number;

    /** 是否已死亡 */
    isDead: boolean;

    /** 是否为召唤物/小怪 */
    isMinion: boolean;

    /** 伤害减免比例 (0~1) */
    damageReduction: number;

    // ========== 写方法（保证数据一致性，内部做取整、边界处理）==========

    /** 设置当前速度 */
    setSpeed(value: number): void;

    /** 设置最大生命值（同时处理 currentHealth 截断） */
    setMaxHealth(value: number): void;

    /** 设置当前生命值（自动取整、钳位到 [0, maxHealth]） */
    setCurrentHealth(value: number): void;

    /** 添加伤害减免 */
    addDamageReduction(value: number): void;

    // ========== 查询方法 ==========

    /** 获取原始速度（词条修改前的基准值） */
    getOriginalSpeed(): number;

    /** 获取原始攻击力 */
    getOriginalDamage(): number;

    /** 获取运行时最大生命值 */
    getRuntimeMaxHealth(): number;

    // ========== 词条运行时数据容器 ==========

    /**
     * 敌人当前携带的词条运行时数据
     * 由 AffixSystem 创建和管理，Enemy 只提供存储空间
     */
    affixData?: EnemyAffixData;

    // ========== 节点引用 ==========

    /** 节点引用（用于位置计算、UI 子节点挂载等） */
    node: Node;

    // ========== 新增方法（解决 as any 问题）==========

    /**
     * 设置目标（用于嘲讽等效果，替代 (enemy as any).target）
     * 可选方法，部分实现可能不支持
     */
    setTarget?(target: Node): void;
}