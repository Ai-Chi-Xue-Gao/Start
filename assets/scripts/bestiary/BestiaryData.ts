// assets/scripts/bestiary/BestiaryData.ts

/**
 * 词条信息（从 affixes.json 读取）
 */
export interface AffixInfo {
    id: string;
    name: string;
    description: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    minWave: number;
    hasCallback?: boolean;
    callbackType?: string;
    stats?: Record<string, any>;
}

/**
 * 种族配置
 */
export interface RaceConfig {
    id: string;
    name: string;
    forcedAffix: string | null;
}

/**
 * 敌人基础属性
 */
export interface EnemyStats {
    hp: number;
    damage: number;
    speed: number;
    expReward: number;
}

/**
 * 敌人图鉴配置（从 JSON 加载）
 */
export interface EnemyBestiaryConfig {
    enemyId: string;
    name: string;
    description: string;
    race: string;
    type: 'normal' | 'elite' | 'boss';
    icon: string;
    baseStats: EnemyStats;
    possibleAffixes: string[];
}

/**
 * 图鉴进度数据（存储到 localStorage）
 */
export interface BestiaryProgress {
    isUnlocked: boolean;
    killCount: number;
    firstKillWave: number;
    encounteredAffixes: string[];
}

/**
 * 完整图鉴数据（运行时使用）
 */
export interface BestiaryEntry extends EnemyBestiaryConfig {
    progress: BestiaryProgress;
    raceName: string;
    forcedAffix: string | null;
}

/**
 * 词条收集统计
 */
export interface AffixCollectStats {
    total: number;
    unlocked: number;
    byRarity: {
        common: { total: number; unlocked: number };
        rare: { total: number; unlocked: number };
        epic: { total: number; unlocked: number };
        legendary: { total: number; unlocked: number };
    };
}

/**
 * 图鉴进度统计
 */
export interface BestiaryStats {
    totalEnemies: number;
    unlockedEnemies: number;
    totalKills: number;
    totalAffixes: number;
    unlockedAffixes: number;
}

/**
 * 存储 Key
 */
export const BESTIARY_STORAGE_KEY = 'bestiary_progress';
export const BESTIARY_CONFIG_KEY = 'bestiary_enemies_config';

/**
 * 稀有度颜色配置
 */
export const RARITY_COLORS: Record<string, string> = {
    common: '#969696',
    rare: '#5078FF',
    epic: '#A050FF',
    legendary: '#FFA032'
};

/**
 * 稀有度显示名称
 */
export const RARITY_NAMES: Record<string, string> = {
    common: '普通',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说'
};

/**
 * 类型显示名称
 */
export const TYPE_NAMES: Record<string, string> = {
    normal: '普通',
    elite: '精英',
    boss: '首领'
};

/**
 * 类型颜色
 */
export const TYPE_COLORS: Record<string, string> = {
    normal: '#555555',
    elite: '#2563EB',
    boss: '#EA580C'
};