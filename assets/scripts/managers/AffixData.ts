// 1. 词条稀有度（控制词条出现时机）
export type AffixRarity = 'common' | 'rare' | 'epic' | 'legendary'
// 普通(1-20波) → 稀有(21-40) → 史诗(41-60) → 传说(61+)

// 2. 回调类型（词条在什么时候触发效果）
export type CallbackType = 'onApply' | 'onUpdate' | 'onDeath' | 'onHit' | 'onHitPlayer'
// onApply:   敌人生成时立即生效（如加血、加速）
// onUpdate:  每帧更新（如回血、狂暴检测）
// onDeath:   敌人死亡时触发（如自爆、分裂）
// onHit:     敌人受伤时触发（如瞬移、反弹）
// onHitPlayer: 击中玩家时触发（如吸血、减速）

// 3. 词条配置结构
export interface AffixConfig {
    id: string           // 唯一标识，如 'fast'
    name: string         // 显示名称 "迅捷"
    description: string  // 描述 "移动速度 +40%"
    rarity: AffixRarity  // 稀有度
    minWave: number      // 最小出现波次（10波后才出现）
    hasCallback?: boolean      // 是否有特殊逻辑
    callbackType?: CallbackType // 特殊逻辑类型
    stats?: Record<string, any> // 数值配置，如 { speedMultiplier: 1.4 }
}

// 4. 敌人身上的运行时数据（存储词条状态）
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