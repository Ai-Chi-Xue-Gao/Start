/**
 * 词条配置（类型安全版本）
 * 与原有 JSON 结构完全兼容
 */

// ========== 类型定义 ==========

export type AffixRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type CallbackType = 'onApply' | 'onUpdate' | 'onDeath' | 'onHit' | 'onHitPlayer';

/**
 * 词条配置结构
 */
export interface AffixConfig {
    id: string;                // 唯一标识，如 'fast'
    name: string;              // 显示名称 "迅捷"
    description: string;       // 描述 "移动速度 +40%"
    rarity: AffixRarity;       // 稀有度
    minWave: number;           // 最小出现波次（10波后才出现）
    hasCallback?: boolean;     // 是否有特殊逻辑
    callbackType?: CallbackType; // 特殊逻辑类型
    stats?: Record<string, any>; // 数值配置，如 { speedMultiplier: 1.4 }
}

// ========== 默认词条配置 ==========

export const DEFAULT_AFFIXES: AffixConfig[] = [
    // common 词条（10波后出现）
    {
        id: 'fast',
        name: '迅捷',
        description: '移动速度 +40%',
        rarity: 'common',
        minWave: 10,
        stats: { speedMultiplier: 1.4 }
    },
    {
        id: 'tough',
        name: '坚韧',
        description: '最大生命值 +50%',
        rarity: 'common',
        minWave: 10,
        stats: { healthMultiplier: 1.5 }
    },
    {
        id: 'strong',
        name: '强击',
        description: '攻击力 +30%',
        rarity: 'common',
        minWave: 10,
        stats: { damageMultiplier: 1.3 }
    },
    {
        id: 'regenerate',
        name: '再生',
        description: '每秒回复5%最大生命值',
        rarity: 'common',
        minWave: 10,
        hasCallback: true,
        callbackType: 'onUpdate',
        stats: { regeneratePercent: 0.05 }
    },

    // rare 词条（21波后出现）
    {
        id: 'explosive',
        name: '自爆',
        description: '死亡时爆炸，对范围内敌人造成伤害',
        rarity: 'rare',
        minWave: 21,
        hasCallback: true,
        callbackType: 'onDeath',
        stats: { explosionRadius: 100, explosionDamagePercent: 0.5 }
    },
    {
        id: 'vampire',
        name: '吸血鬼',
        description: '攻击玩家时回复50%伤害的生命值',
        rarity: 'rare',
        minWave: 21,
        hasCallback: true,
        callbackType: 'onHitPlayer',
        stats: { healPercent: 0.5 }
    },
    {
        id: 'teleport',
        name: '瞬移',
        description: '受伤时有30%几率瞬移到附近',
        rarity: 'rare',
        minWave: 21,
        hasCallback: true,
        callbackType: 'onHit',
        stats: { teleportChance: 0.3, teleportRadius: 300 }
    },
    {
        id: 'frost',
        name: '寒霜',
        description: '攻击时减速玩家',
        rarity: 'rare',
        minWave: 21,
        hasCallback: true,
        callbackType: 'onHitPlayer',
        stats: { slowPercent: 0.3, slowDuration: 1.5 }
    },

    // epic 词条（41波后出现）
    {
        id: 'split',
        name: '分裂',
        description: '死亡时分裂成2个小怪',
        rarity: 'epic',
        minWave: 41,
        hasCallback: true,
        callbackType: 'onDeath',
        stats: { splitCount: 2, splitHealthPercent: 0.5 }
    },
    {
        id: 'berserk',
        name: '狂暴',
        description: '生命值低于30%时进入狂暴状态，攻速和移速提升50%',
        rarity: 'epic',
        minWave: 41,
        hasCallback: true,
        callbackType: 'onUpdate',
        stats: { berserkThreshold: 0.3, berserkSpeedMultiplier: 1.5, berserkAttackMultiplier: 1.5 }
    },
    {
        id: 'shield',
        name: '护盾',
        description: '获得一个可吸收100伤害的护盾',
        rarity: 'epic',
        minWave: 41,
        stats: { shieldAmount: 100 }
    },
    {
        id: 'mirror',
        name: '镜反',
        description: '反弹50%受到的伤害',
        rarity: 'epic',
        minWave: 41,
        hasCallback: true,
        callbackType: 'onHit',
        stats: { reflectPercent: 0.5 }
    },

    // legendary 词条（61波后出现）
    {
        id: 'immortal',
        name: '不朽',
        description: '死亡后以50%生命值复活一次',
        rarity: 'legendary',
        minWave: 61,
        hasCallback: true,
        callbackType: 'onDeath',
        stats: { reviveHealthPercent: 0.5 }
    },
    {
        id: 'minion_master',
        name: '召唤师',
        description: '每5秒召唤2个小怪',
        rarity: 'legendary',
        minWave: 61,
        hasCallback: true,
        callbackType: 'onUpdate',
        stats: { summonInterval: 5, summonCount: 2 }
    },
    {
        id: 'adaptive',
        name: '适应',
        description: '受到同类型伤害时减伤30%',
        rarity: 'legendary',
        minWave: 61,
        stats: { adaptiveResistance: 0.3 }
    }
];

// ========== 工具函数 ==========

export function getAffixConfig(affixId: string): AffixConfig | undefined {
    return DEFAULT_AFFIXES.find(a => a.id === affixId);
}

export function getAffixesByRarity(rarity: AffixRarity): AffixConfig[] {
    return DEFAULT_AFFIXES.filter(a => a.rarity === rarity);
}

export function getAffixesByMinWave(wave: number): AffixConfig[] {
    return DEFAULT_AFFIXES.filter(a => a.minWave <= wave);
}

/**
 * 稀有度权重（用于随机抽取）
 */
export function getRarityWeight(rarity: AffixRarity, maxRarity: AffixRarity): number {
    const rarityOrder = ['common', 'rare', 'epic', 'legendary'];
    const maxIndex = rarityOrder.indexOf(maxRarity);
    const currentIndex = rarityOrder.indexOf(rarity);

    if (currentIndex > maxIndex) return 0;

    const weights: Record<AffixRarity, number> = {
        common: 50,
        rare: 30,
        epic: 15,
        legendary: 5
    };
    return weights[rarity] || 1;
}

