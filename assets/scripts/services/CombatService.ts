// assets/scripts/services/CombatService.ts

import { ServiceLocator } from '../core/ServiceLocator';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';
import { GameState, GameStateMachine } from '../core/GameStateMachine';
import { IPlayer } from '../interfaces/IPlayer';
import { IDamageable, isDamageable } from '../interfaces/IDamageable';

/**
 * 伤害计算参数
 */
export interface DamageModifiers {
    critMultiplier?: number;
    damageReduction?: number;
    armorPen?: number;
}

/**
 * 战斗服务
 * 负责：伤害计算、玩家攻击敌人、敌人攻击玩家、经验发放
 */
export class CombatService {
    private static instance: CombatService;

    private constructor() {}

    static getInstance(): CombatService {
        if (!CombatService.instance) {
            CombatService.instance = new CombatService();
        }
        return CombatService.instance;
    }

    // ========== 初始化 ==========

    public init(): void {
        ServiceLocator.getInstance().register('combatService', this);
    }

    // ========== 伤害计算 ==========

    /**
     * 计算伤害值
     * @param attackerDamage 攻击者伤害
     * @param targetDefense 目标防御值
     * @param modifiers 伤害修正参数
     * @returns 计算后的伤害值
     */
    public calculateDamage(
        attackerDamage: number,
        targetDefense: number = 0,
        modifiers?: DamageModifiers
    ): number {
        let damage = attackerDamage;

        // 1. 应用防御减免
        if (targetDefense > 0) {
            damage = Math.max(1, damage - targetDefense);
        }

        // 2. 应用护甲穿透（无视部分防御）
        if (modifiers?.armorPen && modifiers.armorPen > 0 && targetDefense > 0) {
            const negatedDefense = targetDefense * (1 - modifiers.armorPen);
            damage = Math.max(1, attackerDamage - negatedDefense);
        }

        // 3. 应用暴击倍数
        if (modifiers?.critMultiplier && modifiers.critMultiplier > 1) {
            damage *= modifiers.critMultiplier;
        }

        // 4. 应用伤害减免
        if (modifiers?.damageReduction) {
            damage *= (1 - modifiers.damageReduction);
        }

        return Math.max(1, Math.floor(damage));
    }

    // ========== 玩家攻击 ==========

    /**
     * 玩家攻击敌人
     * @param target 目标敌人（需实现 IDamageable 接口）
     * @param damage 伤害值
     * @returns 是否击杀
     */
    public playerAttackEnemy(target: IDamageable, damage: number): boolean {
        if (!target || !isDamageable(target)) {
            return false;
        }

        if (!this.isGameRunning()) {
            return false;
        }

        const isDead = target.takeDamage(damage);

        if (isDead) {
            const pos = target.node?.worldPosition;
            EventBus.emit(EventNames.ENEMY_DIED, pos, target);
        }

        return isDead;
    }

    // ========== 敌人攻击 ==========

    /**
     * 敌人攻击玩家
     * @param damage 伤害值
     * @returns 玩家是否死亡
     */
    public enemyAttackPlayer(damage: number): boolean {
        const player = this.getPlayer();
        if (!player) return false;

        const currentHp = player.getCurrentHealth();
        if (currentHp <= 0) return false;

        const isDead = this.applyDamageToPlayer(player, damage);

        if (isDead) {
            EventBus.emit(EventNames.PLAYER_DIED);
        } else {
            EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, player.getCurrentHealth(), player.getMaxHealth());
        }

        return isDead;
    }

    /**
     * 对玩家应用伤害
     */
    private applyDamageToPlayer(player: IPlayer, damage: number): boolean {
        if (player.takeDamage) {
            return player.takeDamage(damage);
        }
        
        console.warn('[CombatService] 玩家没有 takeDamage 方法');
        return false;
    }

    // ========== 经验系统 ==========

    /**
     * 发放经验值
     * @param expValue 经验值
     */
    public grantExp(expValue: number): void {
        if (expValue <= 0) return;
        EventBus.emit(EventNames.GAIN_EXP, expValue);
    }

    // ========== 玩家属性查询 ==========

    /**
     * 获取玩家攻击力
     */
    public getPlayerAttack(): number {
        const player = this.getPlayer();
        return player?.getAttack?.() || 0;
    }

    /**
     * 获取玩家血量信息
     */
    public getPlayerHealth(): { current: number; max: number } {
        const player = this.getPlayer();
        if (!player) {
            return { current: 0, max: 0 };
        }
        
        return {
            current: player.getCurrentHealth(),
            max: player.getMaxHealth()
        };
    }

    /**
     * 获取玩家当前血量
     */
    public getPlayerCurrentHealth(): number {
        return this.getPlayerHealth().current;
    }

    /**
     * 获取玩家最大血量
     */
    public getPlayerMaxHealth(): number {
        return this.getPlayerHealth().max;
    }

    // ========== 私有辅助方法 ==========

    /**
     * 获取玩家服务
     */
    private getPlayer(): IPlayer | null {
        return ServiceLocator.getInstance().get<IPlayer>('player');
    }

    /**
     * 检查游戏是否运行中
     */
    private isGameRunning(): boolean {
        const stateMachine = ServiceLocator.getInstance().get<GameStateMachine>('stateMachine');
        return stateMachine?.getState() === GameState.RUNNING;
    }
}