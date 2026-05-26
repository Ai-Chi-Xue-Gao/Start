// assets/scripts/managers/EffectSystem.ts

import { Vec3 } from 'cc';
import { IPlayer } from '../interfaces/IPlayer';
import { IDamageable, isDamageable } from '../interfaces/IDamageable';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';

/**
 * 效果类型枚举
 */
export type EffectType = 
    | 'modifyStat'
    | 'applyBuff'
    | 'dealDamage'
    | 'dealAreaDamage'
    | 'heal'
    | 'revive'
    | 'teleport'
    | 'dodge'
    | 'convertStat'
    | 'spawnProjectile'
    | 'repeatCast'
    | 'modifyProjectile'
    | 'createShield'
    | 'slowEnemy'
    | 'freezeEnemy'
    | 'pullEnemy';

/**
 * 效果执行上下文
 */
export interface EffectContext {
    player: IPlayer
    target?: IDamageable
    position?: Vec3
    source?: any
}

/**
 * 效果参数
 */
export interface EffectParams {
    stat?: string
    value?: number
    duration?: number
    additive?: boolean
    radius?: number
    damage?: number
    damagePercent?: number
    healPercent?: number
    hpPercent?: number
    count?: number
    delay?: number
    buffId?: string
    projectileId?: string
    slowPercent?: number
    freezeDuration?: number
    pullRadius?: number
    fromStat?: string
    toStat?: string
    ratio?: number
    condition?: Record<string, any>
    [key: string]: any
}

/**
 * 临时属性记录
 */
interface TemporaryStatRecord {
    stat: string
    originalValue: number
    remainingTime: number
    target: any  // 目标对象（PlayerMovement 或 PlayerSkill）
    restoreMethod: (value: number) => void  // 恢复方法
}

/**
 * 效果执行器
 */
export class EffectSystem {
    //  临时属性存储
    private static temporaryStats: Map<string, TemporaryStatRecord[]> = new Map()
    private static updateTimer: number = -1

    public static execute(effectType: EffectType, params: EffectParams, context: EffectContext): void {
        switch (effectType) {
            case 'modifyStat':
                this.modifyStat(params, context);
                break;
            case 'applyBuff':
                this.applyBuff(params, context);
                break;
            case 'dealDamage':
                this.dealDamage(params, context);
                break;
            case 'dealAreaDamage':
                this.dealAreaDamage(params, context);
                break;
            case 'heal':
                this.heal(params, context);
                break;
            case 'revive':
                this.revive(params, context);
                break;
            case 'teleport':
                this.teleport(params, context);
                break;
            case 'dodge':
                this.dodge(params, context);
                break;
            case 'convertStat':
                this.convertStat(params, context);
                break;
            case 'spawnProjectile':
                this.spawnProjectile(params, context);
                break;
            case 'repeatCast':
                this.repeatCast(params, context);
                break;
            case 'modifyProjectile':
                this.modifyProjectile(params, context);
                break;
            case 'createShield':
                this.createShield(params, context);
                break;
            case 'slowEnemy':
                this.slowEnemy(params, context);
                break;
            case 'freezeEnemy':
                this.freezeEnemy(params, context);
                break;
            case 'pullEnemy':
                this.pullEnemy(params, context);
                break;
            default:
                console.warn(`[EffectSystem] 未注册的效果类型: ${effectType}`);
        }
    }

    // ========== 属性修改 ==========
    
    private static modifyStat(params: EffectParams, context: EffectContext): void {
        const { stat, value, duration } = params;
        const player = context.player;
        
        if (!player) return;
        
        if (duration && duration > 0) {
            this.applyTemporaryStat(player, stat, value, duration);
        } else {
            this.applyPermanentStat(player, stat, value);
        }
        
        console.log(`[EffectSystem] 修改属性: ${stat} = ${value}, 持续时间: ${duration || '永久'}`);
    }
    
    private static applyPermanentStat(player: IPlayer, stat: string, value: number): void {
        switch (stat) {
            case 'attackMultiplier':
                player.addAttackMultiplier?.(value);
                break;
            case 'speedMultiplier':
                player.addSpeedMultiplier?.(value);
                break;
            case 'expBonus':
                player.addExpBonus?.(value);
                break;
            case 'cooldownReduction':
                player.addCooldownReduction?.(value);
                break;
            case 'magnetBonus':
                player.addMagnetBonus?.(value);
                break;
            case 'vampirePercent':
                player.addVampirePercent?.(value);
                break;
            case 'damageReduction':
                player.addDamageReduction?.(value);
                break;
            case 'critChance':
                player.addCritChance?.(value);
                break;
            case 'critDamage':
                player.addCritDamage?.(value);
                break;
            case 'armorPen':
                player.addArmorPen?.(value);
                break;
            case 'thornDamage':
                player.addThornDamage?.(value);
                break;
            case 'healthBonus':
                player.addPermanentHealth?.(value);
                break;
            case 'attackBonus':
                player.addPermanentAttack?.(value);
                break;
            case 'speedBonusPercent':
                player.addPermanentSpeed?.(value);
                break;
            case 'cooldownBonus':
                player.addPermanentCooldown?.(value);
                break;
            case 'expBonusPercent':
                player.addPermanentExp?.(value);
                break;
            default:
                console.warn(`[EffectSystem] 未知的永久属性: ${stat}`);
        }
    }
    
    /**
     *  应用临时属性（带持续时间）
     */
    private static applyTemporaryStat(player: IPlayer, stat: string, value: number, duration: number): void {
        const playerNode = (player as any).node;
        if (!playerNode) return;

        let target: any = null;
        let originalValue: number = 0;
        let restoreMethod: (value: number) => void = () => {};

        // 根据属性类型获取目标组件和原始值
        switch (stat) {
            case 'speedMultiplier':
                target = playerNode.getComponent('PlayerMovement');
                if (target) {
                    originalValue = target.getSpeedMultiplier?.() || 1;
                    restoreMethod = (v: number) => target.setSpeedMultiplier?.(v);
                    target.setSpeedMultiplier(originalValue * value);
                }
                break;
            case 'attackMultiplier':
                target = playerNode.getComponent('PlayerSkill');
                if (target) {
                    // 攻击力临时加成通过 addTemporaryAttackBonus 处理
                    (player as any).addTemporaryAttackBonus?.(value - 1, duration);
                    return;
                }
                break;
            case 'critChance':
                target = playerNode.getComponent('PlayerSkill');
                if (target) {
                    originalValue = target.getCritChance?.() || 0;
                    restoreMethod = (v: number) => {
                        const current = target.getCritChance?.() || 0;
                        const delta = current - originalValue;
                        if (delta > 0) {
                            target.addCritChance?.(-delta);
                        }
                    };
                    target.addCritChance?.(value);
                }
                break;
            default:
                console.log(`[EffectSystem] 临时属性（待扩展）: ${stat} +${value}，持续 ${duration}秒`);
                return;
        }

        if (!target) {
            console.warn(`[EffectSystem] 无法应用临时属性 ${stat}：找不到目标组件`);
            return;
        }

        // 存储临时属性记录
        const record: TemporaryStatRecord = {
            stat: stat,
            originalValue: originalValue,
            remainingTime: duration,
            target: target,
            restoreMethod: restoreMethod
        };

        const key = `${playerNode.uuid}_${stat}`;
        if (!this.temporaryStats.has(key)) {
            this.temporaryStats.set(key, []);
        }
        this.temporaryStats.get(key)!.push(record);

        // 启动更新循环
        this.startUpdateLoop();
    }

    /**
     *  启动临时属性更新循环
     */
    private static startUpdateLoop(): void {
        if (this.updateTimer !== -1) return;

        let lastTime = Date.now() / 1000;
        
        const update = () => {
            const now = Date.now() / 1000;
            const deltaTime = Math.min(0.1, now - lastTime);
            lastTime = now;

            let hasActiveRecords = false;

            for (const [key, records] of this.temporaryStats) {
                const remainingRecords: TemporaryStatRecord[] = [];
                
                for (const record of records) {
                    record.remainingTime -= deltaTime;
                    
                    if (record.remainingTime <= 0) {
                        // 时间到，恢复原始值
                        record.restoreMethod(record.originalValue);
                        console.log(`[EffectSystem] 临时属性恢复: ${record.stat} -> ${record.originalValue}`);
                    } else {
                        remainingRecords.push(record);
                        hasActiveRecords = true;
                    }
                }
                
                if (remainingRecords.length === 0) {
                    this.temporaryStats.delete(key);
                } else {
                    this.temporaryStats.set(key, remainingRecords);
                }
            }

            if (hasActiveRecords) {
                requestAnimationFrame(update);
            } else {
                this.updateTimer = -1;
            }
        };

        this.updateTimer = requestAnimationFrame(update) as unknown as number;
    }

    // ========== Buff 系统 ==========
    
    private static applyBuff(params: EffectParams, context: EffectContext): void {
        const { buffId, value, duration } = params;
        console.log(`[EffectSystem] 应用Buff: ${buffId}, 值: ${value}, 持续时间: ${duration}秒`);
    }

    // ========== 伤害系统 ==========
    
    private static dealDamage(params: EffectParams, context: EffectContext): void {
        const { value, damagePercent } = params;
        const target = context.target;
        
        if (!target || !isDamageable(target)) {
            console.warn('[EffectSystem] 目标无效或不可伤害');
            return;
        }
        
        let damage: number;
        if (damagePercent) {
            damage = context.player.getAttack() * damagePercent;
        } else {
            damage = value || 0;
        }
        
        if (damage <= 0) return;
        
        const isDead = target.takeDamage(damage);
        
        if (isDead) {
            const pos = target.node?.worldPosition || context.position;
            EventBus.emit(EventNames.ENEMY_DIED, pos, target);
        }
        
        console.log(`[EffectSystem] 造成伤害: ${damage}`);
    }
    
    private static dealAreaDamage(params: EffectParams, context: EffectContext): void {
        const { value, damagePercent, radius } = params;
        const player = context.player;
        const position = context.position || (player as any).node?.worldPosition;
        
        console.log(`[EffectSystem] 范围伤害: ${value || damagePercent}, 半径: ${radius}`);
        EventBus.emit(EventNames.AREA_DAMAGE, { position, radius, damage: value, damagePercent });
    }

    // ========== 治疗系统 ==========
    
    private static heal(params: EffectParams, context: EffectContext): void {
        const { value, healPercent } = params;
        const player = context.player;
        
        if (!player) return;
        
        let healAmount: number;
        if (healPercent) {
            healAmount = player.getMaxHealth() * healPercent;
        } else {
            healAmount = value || 0;
        }
        
        if (healAmount > 0) {
            player.heal?.(healAmount);
            console.log(`[EffectSystem] 治疗: ${healAmount}`);
        }
    }
    
    private static revive(params: EffectParams, context: EffectContext): void {
        const { hpPercent } = params;
        const player = context.player;
        
        if (!player) return;
        
        player.revive?.(hpPercent || 0.5);
        console.log(`[EffectSystem] 复活，生命值: ${(hpPercent || 0.5) * 100}%`);
    }

    // ========== 移动系统 ==========
    
    private static teleport(params: EffectParams, context: EffectContext): void {
        const { radius } = params;
        const player = context.player;
        const playerNode = (player as any).node;
        
        if (!playerNode) return;
        
        const randomX = (Math.random() - 0.5) * (radius || 300) * 2;
        const randomY = (Math.random() - 0.5) * (radius || 300) * 2;
        playerNode.setPosition(randomX, randomY, 0);
        
        console.log(`[EffectSystem] 瞬移到 (${randomX.toFixed(0)}, ${randomY.toFixed(0)})`);
    }
    
    private static dodge(params: EffectParams, context: EffectContext): void {
        const { chance } = params;
        console.log(`[EffectSystem] 闪避率: ${(chance || 0) * 100}%`);
    }

    // ========== 属性转换 ==========
    
    private static convertStat(params: EffectParams, context: EffectContext): void {
        const { fromStat, toStat, ratio } = params;
        const player = context.player;
        
        if (!player) return;
        
        const fromValue = this.getStatValue(player, fromStat);
        const converted = fromValue * (ratio || 0.5);
        
        this.applyPermanentStat(player, toStat, converted);
        console.log(`[EffectSystem] 属性转换: ${fromStat}(${fromValue}) -> ${toStat}(${converted})`);
    }
    
    private static getStatValue(player: IPlayer, statName: string): number {
        switch (statName) {
            case 'attack':
                return player.getAttack();
            case 'maxHealth':
                return player.getMaxHealth();
            case 'currentHealth':
                return player.getCurrentHealth();
            case 'exp':
                return player.getExp();
            case 'level':
                return player.getLevel();
            case 'expMultiplier':
                return player.getExpMultiplier?.() || 1;
            case 'cooldownReduction':
                return player.getAttackCooldownReduction();
            case 'magnetRange':
                return player.getMagnetRangeMultiplier();
            case 'fireballSpeedMultiplier':
                return player.getFireballSpeedMultiplier();
            case 'vampirePercent':
                return player.getVampirePercent();
            default:
                console.warn(`[EffectSystem] 未知的属性: ${statName}`);
                return 0;
        }
    }

    // ========== 投射物系统 ==========
    
    private static spawnProjectile(params: EffectParams, context: EffectContext): void {
        const { projectileId, damage, radius } = params;
        
        console.log(`[EffectSystem] 生成投射物: ${projectileId}, 伤害: ${damage}, 半径: ${radius}`);
        EventBus.emit(EventNames.SPAWN_PROJECTILE, { projectileId, damage, radius, source: context.source });
    }
    
    private static repeatCast(params: EffectParams, context: EffectContext): void {
        const { count, delay } = params;
        console.log(`[EffectSystem] 重复施法 ${count} 次，间隔 ${delay}秒`);
    }
    
    private static modifyProjectile(params: EffectParams, context: EffectContext): void {
        const { stat, value } = params;
        console.log(`[EffectSystem] 修改投射物: ${stat} = ${value}`);
    }

    // ========== 护盾系统 ==========
    
    private static createShield(params: EffectParams, context: EffectContext): void {
        const { value, duration } = params;
        console.log(`[EffectSystem] 创建护盾: ${value}点，持续 ${duration}秒`);
    }

    // ========== 控制效果 ==========
    
    private static slowEnemy(params: EffectParams, context: EffectContext): void {
        const { slowPercent, duration } = params;
        const target = context.target;
        
        if (!target) return;
        
        console.log(`[EffectSystem] 减速敌人: ${(slowPercent || 0) * 100}%，持续 ${duration}秒`);
        EventBus.emit(EventNames.ENEMY_SLOW, { target, slowPercent, duration });
    }
    
    private static freezeEnemy(params: EffectParams, context: EffectContext): void {
        const { duration } = params;
        const target = context.target;
        
        if (!target) return;
        
        console.log(`[EffectSystem] 冰冻敌人，持续 ${duration}秒`);
        EventBus.emit(EventNames.ENEMY_FREEZE, { target, duration });
    }
    
    private static pullEnemy(params: EffectParams, context: EffectContext): void {
        const { radius } = params;
        const player = context.player;
        const position = (player as any).node?.worldPosition;
        
        console.log(`[EffectSystem] 吸引敌人，半径: ${radius}`);
        EventBus.emit(EventNames.PULL_ENEMY, { position, radius });
    }

    /**
     *  清除所有临时属性（场景切换时调用）
     */
    public static clearAllTemporaryStats(): void {
        for (const [key, records] of this.temporaryStats) {
            for (const record of records) {
                record.restoreMethod(record.originalValue);
            }
        }
        this.temporaryStats.clear();
        if (this.updateTimer !== -1) {
            cancelAnimationFrame(this.updateTimer as number);
            this.updateTimer = -1;
        }
        console.log('[EffectSystem] 所有临时属性已清除');
    }
}