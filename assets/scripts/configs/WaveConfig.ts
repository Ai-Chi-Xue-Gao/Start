/**
 * 波次配置（类型安全版本）
 */

// ========== 波次配置 ==========

export const WaveConfig = {
    // 基础敌人生成
    BASE_ENEMY_COUNT: 5,
    ENEMY_COUNT_WAVE_DIVISOR: 2,

    // 波次类型倍率
    THREAT_WAVE_MULTIPLIER: 1.5,
    BREATHER_WAVE_MULTIPLIER: 0.6,

    // 波次间隔
    WAVE_BREAK_TIME: 5,

    // 属性成长
    WAVE_GROWTH_RATE: 0.03,

    // 精英/BOSS 生成间隔
    ELITE_SPAWN_INTERVAL: 5,
    BOSS_SPAWN_INTERVAL: 10,

    // 精英/BOSS 最大比例
    MAX_ELITE_PERCENT: 0.3,
    MAX_BOSS_PERCENT: 0.1,

    // 词条波次调整
    BREATHER_AFFIX_REDUCTION: 10,
    THREAT_AFFIX_BONUS: 5,
    ELITE_AFFIX_BONUS: 2,
    BOSS_AFFIX_BONUS: 5,
    AFFIX_BONUS_MULTIPLIER: 5,
} as const;

// ========== 敌人生成配置 ==========

export const SpawnConfig = {
    SPAWN_DISTANCE_MIN: 300,      // 最小生成距离（像素）
    SPAWN_DISTANCE_MAX: 600,      // 最大生成距离（像素）
    SPAWN_INTERVAL: 0.5,          // 生成间隔（秒）
    MAX_SPAWN_PER_FRAME: 1,       // 每帧最大生成数量
} as const;