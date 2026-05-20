// assets/scripts/interfaces/IDamageable.ts

/**
 * 可伤害对象接口
 * 用于主包与 gameplay/enemy 分包解耦
 * 
 * 适用对象：Enemy、NetworkEnemy
 */
export interface IDamageable {
    /**
     * 受到伤害
     * @param damage 伤害值
     * @returns 是否死亡
     */
    takeDamage(damage: number): boolean
    
    /**
     * 是否已死亡
     */
    isDead: boolean
    
    /**
     * 节点引用（用于获取位置等）
     */
    node?: any
}

/**
 * 检查对象是否实现了 IDamageable 接口
 */
export function isDamageable(obj: any): obj is IDamageable {
    return obj && typeof obj.takeDamage === 'function'
}