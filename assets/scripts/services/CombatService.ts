import { ServiceLocator } from '../core/ServiceLocator';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';
import { GameState, GameStateMachine } from '../core/GameStateMachine';
import { IPlayer } from '../interfaces/IPlayer';
import { IDamageable, isDamageable } from '../interfaces/IDamageable';

export class CombatService {
    private static instance: CombatService;

    private constructor() {}

    static getInstance(): CombatService {
        if (!CombatService.instance) {
            CombatService.instance = new CombatService();
        }
        return CombatService.instance;
    }

    public init() {
        ServiceLocator.getInstance().register('combatService', this);
        console.log('[CombatService] 初始化完成');
    }

    public calculateDamage(attackerDamage: number, targetDefense: number = 0, modifiers?: {
        critMultiplier?: number;
        damageReduction?: number;
    }): number {
        let damage = attackerDamage;

        if (targetDefense > 0) {
            damage = Math.max(1, damage - targetDefense);
        }

        if (modifiers?.critMultiplier && modifiers.critMultiplier > 1) {
            damage *= modifiers.critMultiplier;
        }

        if (modifiers?.damageReduction) {
            damage *= (1 - modifiers.damageReduction);
        }

        return Math.max(1, Math.floor(damage));
    }

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

        const stateMachine = ServiceLocator.getInstance().get<GameStateMachine>('stateMachine');
        if (stateMachine && stateMachine.getState() !== GameState.RUNNING) {
            return false;
        }

        const isDead = target.takeDamage(damage);

        if (isDead) {
            const pos = target.node?.worldPosition;
            EventBus.emit(EventNames.ENEMY_DIED, pos, target);
        }

        return isDead;
    }

    /**
     * 敌人攻击玩家
     * @param damage 伤害值
     * @returns 玩家是否死亡
     */
    public enemyAttackPlayer(damage: number): boolean {
        const player = ServiceLocator.getInstance().get<IPlayer>('IPlayer');
        if (!player) return false;

        // 通过 IPlayer 接口获取血量信息
        const currentHp = player.getCurrentHealth();
        const maxHp = player.getMaxHealth();
        
        if (currentHp <= 0) return false;

        const newHp = Math.max(0, currentHp - damage);
        const isDead = newHp <= 0;

        // 通过 player 的扩展方法更新血量
        const playerAny = player as any;
        if (playerAny.takeDamage) {
            playerAny.takeDamage(damage);
        } else if (playerAny.health?.takeDamage) {
            playerAny.health.takeDamage(damage);
        } else {
            console.warn('[CombatService] 无法对玩家造成伤害，缺少 takeDamage 方法');
        }

        if (isDead) {
            EventBus.emit(EventNames.PLAYER_DIED);
        } else {
            EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, newHp, maxHp);
        }

        return isDead;
    }

    public grantExp(expValue: number): void {
        EventBus.emit(EventNames.GAIN_EXP, expValue);
    }

    public getPlayerAttack(): number {
        const player = ServiceLocator.getInstance().get<IPlayer>('IPlayer');
        return player?.getAttack?.() || 0;
    }

    public getPlayerHealth(): { current: number; max: number } {
        const player = ServiceLocator.getInstance().get<IPlayer>('IPlayer');
        if (!player) return { current: 0, max: 0 };
        
        return {
            current: player.getCurrentHealth(),
            max: player.getMaxHealth()
        };
    }
}