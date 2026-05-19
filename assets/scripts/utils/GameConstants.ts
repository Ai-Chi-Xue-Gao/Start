import { _decorator } from 'cc';

/**
 * 游戏常量配置
 * 
 * 用途：
 * 1. 集中管理所有游戏数值，便于平衡性调整
 * 2. 避免魔法数字散落在各个文件中 
 * 3. 修改一个地方，全局生效
 * 
 * 使用方式：
 * import { GameConstants } from '../utils/GameConstants';
 */
export class GameConstants {
    // ========== 玩家基础属性 ==========
    public static readonly PLAYER_BASE_ATTACK = 20                  // 玩家基础攻击力
    public static readonly PLAYER_BASE_MAX_HEALTH = 100             // 玩家基础最大生命值
    public static readonly PLAYER_BASE_CURRENT_HEALTH = 100         // 玩家初始生命值
    public static readonly PLAYER_BASE_SPEED = 300                  // 玩家基础移动速度（像素/秒）
    public static readonly PLAYER_INVINCIBLE_TIME = 1               // 受伤后无敌时间（秒）
    public static readonly PLAYER_LEVEL_UP_HEAL_AMOUNT = 20         // 升级时恢复的生命值

    // ========== 经验系统 ==========
    public static readonly BASE_EXP_TO_NEXT_LEVEL = 1               // 1级升2级所需经验（测试用）
    public static readonly EXP_GROWTH_FACTOR = 1.2                  // 每级经验增长系数
    public static readonly BASE_EXP_MULTIPLIER = 1.0                // 基础经验获取倍率

    // ========== 技能效果 ==========
    public static readonly SKILL_HEALTH_BONUS = 20                  // 生命强化
    public static readonly SKILL_SPEED_MULTIPLIER = 1.2             // 疾走
    public static readonly SKILL_EXP_BONUS = 0.3                    // 经验祝福
    public static readonly SKILL_FIREBALL_SPEED_MULTIPLIER = 1.5    // 极速火球
    public static readonly SKILL_COOLDOWN_REDUCTION = 0.2           // 快速施法
    public static readonly SKILL_MAGNET_BONUS = 0.5                 // 磁力吸引

    // ========== 攻击系统 ==========
    public static readonly BASE_ATTACK_COOLDOWN = 0.8               // 攻击冷却时间
    public static readonly MIN_ATTACK_COOLDOWN = 0.2                // 攻击冷却上限
    public static readonly FIREBALL_BASE_SPEED = 500                // 火球移动速度

    // ========== 世界边界 ==========
    public static readonly WORLD_WIDTH = 3000                       // 世界宽度（像素）
    public static readonly WORLD_HEIGHT = 2000                      // 世界高度（像素）

    // ========== 敌人基础属性 ==========
    public static readonly ENEMY_NORMAL_HEALTH = 30                 // 普通敌人生命值
    public static readonly ENEMY_NORMAL_DAMAGE = 10                 // 普通敌人碰撞伤害
    public static readonly ENEMY_NORMAL_SPEED = 100                 // 普通敌人移动速度（像素/秒）
    public static readonly ENEMY_NORMAL_EXP = 10                    // 普通敌人死亡掉落经验

    // ========== 经验球 ==========
    public static readonly EXP_BALL_BASE_VALUE = 10                 // 经验球基础经验值
    public static readonly EXP_BALL_MAGNET_SPEED = 200              // 经验球磁吸移动速度（像素/秒）
    public static readonly EXP_BALL_BASE_MAGNET_RADIUS = 200        // 经验球基础磁吸半径（像素）

    // ========== 联机相关 ==========
    public static readonly WEBSOCKET_PORT = 8080                    // WebSocket服务器端口
    public static readonly POSITION_SYNC_RATE = 30                  // 位置同步帧率

    // ========== 波次系统 ==========
    public static readonly WAVE_BREAK_TIME = 5                      // 波次间隔时间（秒）

    // 敌人生成公式
    public static readonly BASE_ENEMY_COUNT = 5                     // 基础敌人数
    public static readonly ENEMY_COUNT_WAVE_DIVISOR = 2             // 敌人数公式分母
    public static readonly THREAT_WAVE_MULTIPLIER = 1.5             // 高压波倍率
    public static readonly BREATHER_WAVE_MULTIPLIER = 0.6           // 喘息波倍率

    // 精英/BOSS生成
    public static readonly ELITE_SPAWN_INTERVAL = 5                 // 精英出现间隔（波次）
    public static readonly MAX_ELITE_PERCENT = 0.3                  // 精英最大比例
    public static readonly BOSS_SPAWN_INTERVAL = 10                 // BOSS出现间隔（波次）
    public static readonly MAX_BOSS_PERCENT = 0.1                   // BOSS最大比例

    // 数值成长
    public static readonly WAVE_GROWTH_RATE = 0.03                  // 每波属性成长率

    // 敌人生成
    public static readonly ENEMY_SPAWN_DISTANCE = 600               // 敌人生成距离（像素）

    // 词条等级调整
    public static readonly BREATHER_AFFIX_REDUCTION = 10            // 喘息波词条等级降低
    public static readonly THREAT_AFFIX_BONUS = 5                   // 高压波词条等级提升
    public static readonly AFFIX_BONUS_MULTIPLIER = 5               // 精英/BOSS词条加成系数

    // 精英/BOSS 词条加成
    public static readonly ELITE_AFFIX_BONUS = 2                    // 精英词条加成
    public static readonly BOSS_AFFIX_BONUS = 5                     // BOSS词条加成

    // ========== 玩家属性上限 ==========
    public static readonly MAX_DAMAGE_REDUCTION = 0.75              // 最大减伤
    public static readonly MAX_CRIT_CHANCE = 0.75                   // 最大暴击率
    public static readonly DODGE_CRIT_FACTOR = 0.3                  // 暴击转闪避系数
    public static readonly REVIVE_HEALTH_PERCENT = 0.5              // 复活生命百分比
    public static readonly MIN_EXP_MULTIPLIER = 0.5                 // 最小经验倍率

    // ========== 无敌闪烁效果 ==========
    public static readonly INVINCIBLE_FLASH_DURATION = 0.6          // 无敌闪烁时间（秒）
    public static readonly INVINCIBLE_FLASH_INTERVAL = 0.1          // 无敌闪烁间隔（秒）
    public static readonly INVINCIBLE_FLASH_COLOR_R = 255           // 无敌闪烁颜色 R
    public static readonly INVINCIBLE_FLASH_COLOR_G = 100           // 无敌闪烁颜色 G
    public static readonly INVINCIBLE_FLASH_COLOR_B = 100           // 无敌闪烁颜色 B

    // ========== 词条稀有度权重 ==========
    public static readonly AFFIX_WEIGHT_COMMON = 10                 // 普通词条权重
    public static readonly AFFIX_WEIGHT_RARE = 5                    // 稀有词条权重
    public static readonly AFFIX_WEIGHT_EPIC = 2                    // 史诗词条权重
    public static readonly AFFIX_WEIGHT_LEGENDARY = 1               // 传说词条权重

    // ========== UI 颜色阈值 ==========
    public static readonly HEALTH_BAR_YELLOW_THRESHOLD = 0.6        // 血条黄色阈值
    public static readonly HEALTH_BAR_RED_THRESHOLD = 0.3           // 血条红色阈值

    // ========== 技能面板颜色 ==========
    public static readonly SKILL_LEVEL_COLOR_R = 200
    public static readonly SKILL_LEVEL_COLOR_G = 200
    public static readonly SKILL_LEVEL_COLOR_B = 100
    public static readonly SKILL_NEW_COLOR_R = 100
    public static readonly SKILL_NEW_COLOR_G = 200
    public static readonly SKILL_NEW_COLOR_B = 255
    public static readonly SKILL_UPGRADE_COLOR_R = 255
    public static readonly SKILL_UPGRADE_COLOR_G = 200
    public static readonly SKILL_UPGRADE_COLOR_B = 100

    // ========== 血条颜色 ==========
    public static readonly HEALTH_WARNING_COLOR_R = 255
    public static readonly HEALTH_WARNING_COLOR_G = 200
    public static readonly HEALTH_WARNING_COLOR_B = 0
}