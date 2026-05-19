import { _decorator, Component, Node } from 'cc';

/**
 * 事件名称常量
 * 集中管理所有 EventBus 事件名，避免拼写错误和重复
 */
export class EventNames {
    // ========== 玩家相关 ==========
    public static readonly PLAYER_LEVEL_UP = 'player-level-up'           // 玩家升级
    public static readonly PLAYER_DIED = 'player-died'                   // 玩家死亡
    public static readonly PLAYER_HEALTH_CHANGE = 'player-health-change' // 血量变化
    public static readonly PLAYER_HURT = 'player-hurt'                   // 玩家受伤（预留）
    

    // ========== 经验相关 ==========
    public static readonly GAIN_EXP = 'gain-exp'                         // 获得经验
    public static readonly EXP_CHANGED = 'exp-changed'                   // 经验值变化（UI更新）

    // ========== 敌人相关 ==========
    public static readonly ENEMY_DIED = 'enemy-died'                     // 敌人死亡
    public static readonly ENEMY_HIT_PLAYER = 'enemy-hit-player'         // 敌人击中玩家

    // ========== 技能相关 ==========
    public static readonly SKILL_SELECTED = 'skill-selected'             // 技能被选择

    // ========== 游戏状态 ==========
    public static readonly GAME_PAUSE = 'game-pause'                     // 游戏暂停/恢复
    public static readonly GAME_READY = 'game-ready'                     // 游戏服务就绪
    public static readonly GAME_RESET = 'game-reset'                     // 游戏重置
}


