import { ServiceLocator } from '../core/ServiceLocator';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';
import { GameState, GameStateMachine } from '../core/GameStateMachine';
import { PlayerController } from '../entities/player/PlayerController';

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

    public playerAttackEnemy(enemyNode: any, damage: number): boolean {
        const enemy = enemyNode.getComponent('Enemy') || enemyNode.getComponent('NetworkEnemy');
        if (!enemy) return false;

        const stateMachine = ServiceLocator.getInstance().get<GameStateMachine>('stateMachine');
        if (stateMachine && stateMachine.getState() !== GameState.RUNNING) {
            return false;
        }

        const isDead = enemy.takeDamage?.(damage) || false;

        if (isDead) {
            EventBus.emit(EventNames.ENEMY_DIED, enemyNode.worldPosition, enemy);
        }

        return isDead;
    }

    public enemyAttackPlayer(damage: number): boolean {
        const playerController = ServiceLocator.getInstance().get<PlayerController>('playerController');
        if (!playerController) return false;

        const health = playerController.getHealth();
        if (!health) return false;

        const isDead = health.takeDamage(damage);
        
        if (isDead) {
            EventBus.emit(EventNames.PLAYER_DIED);
        } else {
            EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE);
        }

        return isDead;
    }

    public grantExp(expValue: number): void {
        EventBus.emit(EventNames.GAIN_EXP, expValue);
    }

    public getPlayerAttack(): number {
        const playerController = ServiceLocator.getInstance().get<PlayerController>('playerController');
        return playerController?.getAttack?.() || 0;
    }

    public getPlayerHealth(): { current: number; max: number } {
        const playerController = ServiceLocator.getInstance().get<PlayerController>('playerController');
        if (!playerController) return { current: 0, max: 0 };
        
        return {
            current: playerController.getCurrentHealth(),
            max: playerController.getMaxHealth()
        };
    }
}