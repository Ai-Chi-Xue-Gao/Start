/**
 * 游戏配置（类型安全版本）
 * 替代 Utils/GameConstants.ts 中的常量，提供类型安全
 */

// ========== 世界配置 ==========
export const WorldConfig = {
    WIDTH: 3000,
    HEIGHT: 2000,
    PLAYER_BOUND_X: 1500,
    PLAYER_BOUND_Y: 1000,
} as const;

// ========== 敌人配置 ==========
export const EnemyConfig = {
    NORMAL_HEALTH: 30,
    NORMAL_DAMAGE: 10,
    NORMAL_SPEED: 100,
    NORMAL_EXP: 10,

    ELITE_SCALE: 1.3,
    BOSS_SCALE: 2.0,

    ELITE_STAT_MULTIPLIER: 2.0,
    BOSS_STAT_MULTIPLIER: 5.0,

    SPAWN_DISTANCE: 600,
} as const;

// ========== 玩家配置 ==========
export const PlayerConfig = {
    BASE_ATTACK: 20,
    BASE_MAX_HEALTH: 100,
    BASE_CURRENT_HEALTH: 100,
    BASE_SPEED: 300,
    INVINCIBLE_TIME: 1,
    LEVEL_UP_HEAL_AMOUNT: 20,

    MAX_DAMAGE_REDUCTION: 0.75,
    MAX_CRIT_CHANCE: 0.75,
    DODGE_CRIT_FACTOR: 0.3,
    REVIVE_HEALTH_PERCENT: 0.5,
    MIN_EXP_MULTIPLIER: 0.5,
} as const;

// ========== 经验系统配置 ==========
export const ExpConfig = {
    BASE_TO_NEXT_LEVEL: 1,
    GROWTH_FACTOR: 1.2,
    BASE_MULTIPLIER: 1.0,
} as const;

// ========== 技能效果配置 ==========
export const SkillEffectConfig = {
    HEALTH_BONUS: 20,
    SPEED_MULTIPLIER: 1.2,
    EXP_BONUS: 0.3,
    FIREBALL_SPEED_MULTIPLIER: 1.5,
    COOLDOWN_REDUCTION: 0.2,
    MAGNET_BONUS: 0.5,
} as const;

// ========== 攻击系统配置 ==========
export const AttackConfig = {
    BASE_COOLDOWN: 0.8,
    MIN_COOLDOWN: 0.2,
    FIREBALL_BASE_SPEED: 500,
} as const;

// ========== 经验球配置 ==========
export const ExpBallConfig = {
    BASE_VALUE: 10,
    MAGNET_SPEED: 200,
    BASE_MAGNET_RADIUS: 200,
} as const;

// ========== 联机配置 ==========
export const NetworkConfig = {
    WEBSOCKET_PORT: 8080,
    POSITION_SYNC_RATE: 30,
    HEARTBEAT_INTERVAL: 5,
    HEARTBEAT_TIMEOUT: 15,
    RECONNECT_MAX_ATTEMPTS: 3,
    RECONNECT_DELAY: 2,
} as const;

// ========== 波次配置 ==========
export const WaveConfig = {
    BASE_ENEMY_COUNT: 5,
    ENEMY_COUNT_WAVE_DIVISOR: 2,

    THREAT_WAVE_MULTIPLIER: 1.5,
    BREATHER_WAVE_MULTIPLIER: 0.6,

    WAVE_BREAK_TIME: 5,

    WAVE_GROWTH_RATE: 0.03,

    ELITE_SPAWN_INTERVAL: 5,
    BOSS_SPAWN_INTERVAL: 10,

    MAX_ELITE_PERCENT: 0.3,
    MAX_BOSS_PERCENT: 0.1,

    BREATHER_AFFIX_REDUCTION: 10,
    THREAT_AFFIX_BONUS: 5,
    ELITE_AFFIX_BONUS: 2,
    BOSS_AFFIX_BONUS: 5,
    AFFIX_BONUS_MULTIPLIER: 5,
} as const;

// ========== 词条权重配置 ==========
export const AffixWeightConfig = {
    COMMON: 10,
    RARE: 5,
    EPIC: 2,
    LEGENDARY: 1,
} as const;

// ========== 无敌闪烁效果配置 ==========
export const InvincibleFlashConfig = {
    DURATION: 0.6,
    INTERVAL: 0.1,
    COLOR_R: 255,
    COLOR_G: 100,
    COLOR_B: 100,
} as const;

// ========== UI 颜色配置 ==========
export const UIColorConfig = {
    HEALTH_BAR_YELLOW_THRESHOLD: 0.6,
    HEALTH_BAR_RED_THRESHOLD: 0.3,
    HEALTH_WARNING_R: 255,
    HEALTH_WARNING_G: 200,
    HEALTH_WARNING_B: 0,

    SKILL_LEVEL_R: 200,
    SKILL_LEVEL_G: 200,
    SKILL_LEVEL_B: 100,
    SKILL_NEW_R: 100,
    SKILL_NEW_G: 200,
    SKILL_NEW_B: 255,
    SKILL_UPGRADE_R: 255,
    SKILL_UPGRADE_G: 200,
    SKILL_UPGRADE_B: 100,
} as const;