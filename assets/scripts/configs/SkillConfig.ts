/**
 * 技能配置（类型安全版本）
 * 与原有 JSON 结构完全兼容
 */

// ========== 类型定义 ==========

export type SkillRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface SkillDef {
    name: string;
    description: string;
    rarity: SkillRarity;
    tags: string[];
    maxLevel: number;
    icon: string;
}

/**
 * 技能数值：{ "1": { healthBonus: 20 }, "2": { healthBonus: 40 } }
 */
export interface SkillStatMap {
    [level: string]: Record<string, any>;
}

/**
 * 升级节点
 */
export interface UpgradeNode {
    nodeId: string;
    levelReq: number;
    trigger: string;
    condition: Record<string, any>;
    effect: Record<string, any>;
}

/**
 * 合成规则
 */
export interface FusionRule {
    name: string;
    description: string;
    requires: { skillId: string; minLevel: number }[];
    consumes: boolean;
    replace?: string[];
    effect: Record<string, any>;
}

/**
 * 五行归属
 */
export interface ElementTag {
    element: string;
    phase: string;
}

/**
 * 完整技能配置
 */
export interface SkillFullConfig {
    def: SkillDef;
    stats: SkillStatMap;
    upgrades: UpgradeNode[];
    fusion?: FusionRule;
    elementTag?: ElementTag;
}

// ========== 默认技能配置 ==========

export const DEFAULT_SKILL_DEFS: Record<string, SkillDef> = {
    health_up: {
        name: '生命强化',
        description: '最大生命值 +20',
        rarity: 'common',
        tags: ['passive', 'defense'],
        maxLevel: 5,
        icon: 'icon_health'
    },
    attack_up: {
        name: '攻击强化',
        description: '攻击力 +20%',
        rarity: 'common',
        tags: ['passive', 'offense'],
        maxLevel: 5,
        icon: 'icon_attack'
    },
    speed_up: {
        name: '疾走',
        description: '移动速度 +20%',
        rarity: 'common',
        tags: ['passive', 'mobility'],
        maxLevel: 5,
        icon: 'icon_speed'
    },
    exp_up: {
        name: '经验祝福',
        description: '经验获取 +30%',
        rarity: 'common',
        tags: ['passive', 'growth'],
        maxLevel: 5,
        icon: 'icon_exp'
    },
    cooldown_down: {
        name: '快速施法',
        description: '攻击冷却 -0.15秒',
        rarity: 'common',
        tags: ['passive', 'magic'],
        maxLevel: 5,
        icon: 'icon_cooldown'
    },
    magnet_up: {
        name: '磁力吸引',
        description: '经验球吸引范围 +50%',
        rarity: 'common',
        tags: ['passive', 'utility'],
        maxLevel: 5,
        icon: 'icon_magnet'
    },
    fireball_double: {
        name: '双重火球',
        description: '每次发射2个火球',
        rarity: 'rare',
        tags: ['weapon', 'fire'],
        maxLevel: 5,
        icon: 'icon_fireball'
    },
    fireball_pierce: {
        name: '火球弹射',
        description: '击杀敌人后弹射一次',
        rarity: 'rare',
        tags: ['weapon', 'fire'],
        maxLevel: 5,
        icon: 'icon_pierce'
    },
    fireball_speed: {
        name: '极速火球',
        description: '火球飞行速度 +50%',
        rarity: 'rare',
        tags: ['weapon', 'fire'],
        maxLevel: 5,
        icon: 'icon_speed_fireball'
    },
    vampire: {
        name: '吸血',
        description: '攻击回复生命值（回复伤害的10%）',
        rarity: 'epic',
        tags: ['passive', 'dark'],
        maxLevel: 5,
        icon: 'icon_vampire'
    },
    shield: {
        name: '护盾',
        description: '每30秒获得一个护盾，抵挡一次伤害',
        rarity: 'legendary',
        tags: ['passive', 'defense'],
        maxLevel: 5,
        icon: 'icon_shield'
    }
};

export const DEFAULT_SKILL_STATS: Record<string, SkillStatMap> = {
    health_up: {
        '1': { healthBonus: 20 },
        '2': { healthBonus: 40 },
        '3': { healthBonus: 60 },
        '4': { healthBonus: 80 },
        '5': { healthBonus: 100 }
    },
    attack_up: {
        '1': { attackMultiplier: 1.2 },
        '2': { attackMultiplier: 1.25 },
        '3': { attackMultiplier: 1.3 },
        '4': { attackMultiplier: 1.35 },
        '5': { attackMultiplier: 1.4 }
    }
};

// ========== 工具函数 ==========

export function getSkillDef(skillId: string): SkillDef | undefined {
    return DEFAULT_SKILL_DEFS[skillId];
}

export function getSkillStat(skillId: string, level: number): Record<string, any> | undefined {
    const stats = DEFAULT_SKILL_STATS[skillId];
    if (!stats) return undefined;
    return stats[String(level)];
}

export function getSkillMaxLevel(skillId: string): number {
    return DEFAULT_SKILL_DEFS[skillId]?.maxLevel || 1;
}

export function canUpgradeSkill(skillId: string, currentLevel: number): boolean {
    const maxLevel = getSkillMaxLevel(skillId);
    return currentLevel < maxLevel;
}

