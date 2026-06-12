// assets/scripts/utils/EventNames.ts

/**
 * 事件名称常量
 * 集中管理所有 EventBus 事件名，避免拼写错误和重复
 */
export class EventNames {
    // ========== 玩家相关 ==========
    public static readonly PLAYER_LEVEL_UP = 'player-level-up'           // 玩家升级
    public static readonly PLAYER_DIED = 'player-died'                   // 玩家死亡
    public static readonly PLAYER_HEALTH_CHANGE = 'player-health-change' // 血量变化
    public static readonly PLAYER_SHIELD_CHANGE = 'player-shield-change' // 护盾值变化
    public static readonly PLAYER_HURT = 'player-hurt'                   // 玩家受伤
    public static readonly PLAYER_SLOW = 'player-slow'                   // 玩家减速
    public static readonly PLAYER_MOVE = 'player-move'                   // 玩家移动
    public static readonly PLAYER_HIT = 'player-hit'                     // 玩家被击中

    // ========== 经验相关 ==========
    public static readonly GAIN_EXP = 'gain-exp'                         // 获得经验
    public static readonly EXP_CHANGED = 'exp-changed'                   // 经验值变化（UI更新）

    // ========== 敌人相关 ==========
    public static readonly ENEMY_DIED = 'enemy-died'                     // 敌人死亡
    public static readonly ENEMY_HIT_PLAYER = 'enemy-hit-player'         // 敌人击中玩家
    public static readonly ENEMY_SUMMON = 'enemy-summon'                 // 敌人召唤
    public static readonly ENEMY_SPLIT = 'enemy-split'                   // 敌人分裂
    public static readonly ENEMY_EXPLOSION = 'enemy-explosion'           // 敌人自爆
    public static readonly ENEMY_SLOW = 'enemy-slow'                     // 敌人减速
    public static readonly ENEMY_FREEZE = 'enemy-freeze'                 // 敌人冰冻

    // ========== 波次相关 ==========
    public static readonly WAVE_START = 'wave-start'                     // 波次开始
    public static readonly WAVE_COMPLETE = 'wave-complete'               // 波次完成

    // ========== 技能相关 ==========
    public static readonly SKILL_SELECTED = 'skill-selected'             // 技能被选择
    public static readonly SKILL_CAST = 'skill-cast'                     // 技能施放

    // ========== 效果相关 ==========
    public static readonly AREA_DAMAGE = 'area-damage'                   // 范围伤害
    public static readonly SPAWN_PROJECTILE = 'spawn-projectile'         // 生成投射物
    public static readonly PULL_ENEMY = 'pull-enemy'                     // 吸引敌人

    // ========== 游戏状态 ==========
    public static readonly GAME_PAUSE = 'game-pause'                     // 游戏暂停/恢复
    public static readonly GAME_READY = 'game-ready'                     // 游戏服务就绪
    public static readonly GAME_RESET = 'game-reset'                     // 游戏重置

    // ========== UI相关 ==========
    public static readonly COMBO_HIT = 'combo-hit'                       // 连击命中
    public static readonly PLAYER_LOW_HEALTH = 'player-low-health'       // 玩家低血量
    public static readonly PLAYER_HIGH_HEALTH = 'player-high-health'     // 玩家高血量
}