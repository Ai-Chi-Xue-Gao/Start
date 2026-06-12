// assets/scripts/managers/EffectSystem.ts

import { Vec3 } from 'cc';
import { IPlayer } from '../interfaces/IPlayer';
import { IDamageable, isDamageable } from '../interfaces/IDamageable';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';

// ========== 类型定义 ==========

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
    | 'pullEnemy'
    | 'knockback'
    | 'chain'
    | 'cleanse'
    | 'knockup'
    | 'projectileReturn'
    | 'aura'
    | 'areaDamage'
    | 'chainControl'

export interface EffectContext {
    player: IPlayer
    target?: IDamageable
    position?: Vec3
    source?: any
}

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
    removeDebuff?: boolean
    shieldPercent?: number
    force?: number
    chainCount?: number
    [key: string]: any
}

interface TemporaryStatRecord {
    stat: string
    originalValue: number
    remainingTime: number
    target: any
    restoreMethod: (value: number) => void
}

// ========== 效果执行器 ==========

export class EffectSystem {
    private static temporaryStats: Map<string, TemporaryStatRecord[]> = new Map()
    private static updateTimer: number = -1

    public static execute(effectType: EffectType, params: EffectParams, context: EffectContext): void {
        switch (effectType) {
            case 'modifyStat':
                this.modifyStat(params, context)
                break
            case 'applyBuff':
                this.applyBuff(params, context)
                break
            case 'dealDamage':
                this.dealDamage(params, context)
                break
            case 'dealAreaDamage':
                this.dealAreaDamage(params, context)
                break
            case 'heal':
                this.heal(params, context)
                break
            case 'revive':
                this.revive(params, context)
                break
            case 'teleport':
                this.teleport(params, context)
                break
            case 'dodge':
                this.dodge(params, context)
                break
            case 'convertStat':
                this.convertStat(params, context)
                break
            case 'spawnProjectile':
                this.spawnProjectile(params, context)
                break
            case 'repeatCast':
                this.repeatCast(params, context)
                break
            case 'modifyProjectile':
                this.modifyProjectile(params, context)
                break
            case 'createShield':
                this.createShield(params, context)
                break
            case 'slowEnemy':
                this.slowEnemy(params, context)
                break
            case 'freezeEnemy':
                this.freezeEnemy(params, context)
                break
            case 'pullEnemy':
                this.pullEnemy(params, context)
                break
            case 'knockback':
                this.knockback(params, context)
                break
            case 'chain':
                this.chain(params, context)
                break
            case 'cleanse':
                this.cleanse(params, context)
                break
            case 'knockup':
                this.knockup(params, context)
                break
            case 'projectileReturn':
                this.projectileReturn(params, context)
                break
            case 'aura':
                this.aura(params, context)
                break
            case 'areaDamage':
                this.areaDamage(params, context)
                break
            case 'chainControl':
                this.chainControl(params, context)
                break
        }
    }

    // ========== 属性修改 ==========
    
    private static modifyStat(params: EffectParams, context: EffectContext): void {
        const { stat, value, duration } = params
        const player = context.player
        
        if (!player) return
        
        if (duration && duration > 0) {
            this.applyTemporaryStat(player, stat, value, duration)
        } else {
            this.applyPermanentStat(player, stat, value)
        }
    }
    
    private static applyPermanentStat(player: IPlayer, stat: string, value: number): void {
        switch (stat) {
            case 'attackMultiplier':
                player.addAttackMultiplier?.(value)
                break
            case 'speedMultiplier':
                player.addSpeedMultiplier?.(value)
                break
            case 'expBonus':
                player.addExpBonus?.(value)
                break
            case 'cooldownReduction':
                player.addCooldownReduction?.(value)
                break
            case 'magnetBonus':
                player.addMagnetBonus?.(value)
                break
            case 'vampirePercent':
                player.addVampirePercent?.(value)
                break
            case 'damageReduction':
                player.addDamageReduction?.(value)
                break
            case 'critChance':
                player.addCritChance?.(value)
                break
            case 'critDamage':
                player.addCritDamage?.(value)
                break
            case 'armorPen':
                player.addArmorPen?.(value)
                break
            case 'thornDamage':
                player.addThornDamage?.(value)
                break
            case 'healthBonus':
                player.addPermanentHealth?.(value)
                break
            case 'attackBonus':
                player.addPermanentAttack?.(value)
                break
            case 'speedBonusPercent':
                player.addPermanentSpeed?.(value)
                break
            case 'cooldownBonus':
                player.addPermanentCooldown?.(value)
                break
            case 'expBonusPercent':
                player.addPermanentExp?.(value)
                break
            default:
                console.warn(`[EffectSystem] 未知的永久属性: ${stat}`)
        }
    }
    
    private static applyTemporaryStat(player: IPlayer, stat: string, value: number, duration: number): void {
        const playerNode = player.getNode()
        if (!playerNode) return

        switch (stat) {
            case 'attackMultiplier':
                player.addTemporaryAttackBonus(value - 1, duration)
                return
            case 'speedMultiplier':
                this.applyTemporarySpeedBonus(playerNode, value, duration)
                return
            case 'critChance':
                this.applyTemporaryCritBonus(playerNode, value, duration)
                return
            default:
                console.warn(`[EffectSystem] 未知的临时属性: ${stat}`)
        }
    }

    private static applyTemporarySpeedBonus(playerNode: any, value: number, duration: number): void {
        const movement = playerNode.getComponent('PlayerMovement')
        if (!movement) return

        const originalValue = movement.getSpeedMultiplier?.() || 1
        movement.setSpeedMultiplier?.(originalValue * value)

        this.startUpdateLoop()
    }

    private static applyTemporaryCritBonus(playerNode: any, value: number, duration: number): void {
        const skill = playerNode.getComponent('PlayerSkill')
        if (!skill) return

        const originalValue = skill.getCritChance?.() || 0
        skill.addCritChance?.(value)

        this.startUpdateLoop()
    }

    private static startUpdateLoop(): void {
        if (this.updateTimer !== -1) return

        let lastTime = Date.now() / 1000

        const update = () => {
            const now = Date.now() / 1000
            const deltaTime = Math.min(0.1, now - lastTime)
            lastTime = now

            let hasActiveRecords = false

            for (const [key, records] of this.temporaryStats) {
                const remainingRecords: TemporaryStatRecord[] = []

                for (const record of records) {
                    record.remainingTime -= deltaTime

                    if (record.remainingTime <= 0) {
                        record.restoreMethod(record.originalValue)
                    } else {
                        remainingRecords.push(record)
                        hasActiveRecords = true
                    }
                }

                if (remainingRecords.length === 0) {
                    this.temporaryStats.delete(key)
                } else {
                    this.temporaryStats.set(key, remainingRecords)
                }
            }

            if (hasActiveRecords) {
                requestAnimationFrame(update)
            } else {
                this.updateTimer = -1
            }
        }

        this.updateTimer = requestAnimationFrame(update) as unknown as number
    }

    // ========== Buff 系统 ==========
    
    private static applyBuff(params: EffectParams, context: EffectContext): void {
        // TODO: 实现 Buff 系统
    }

    // ========== 伤害系统 ==========
    
    private static dealDamage(params: EffectParams, context: EffectContext): void {
        const { value, damagePercent } = params
        const target = context.target
        
        if (!target || !isDamageable(target)) return
        
        let damage: number
        if (damagePercent) {
            damage = context.player.getAttack() * damagePercent
        } else {
            damage = value || 0
        }
        
        if (damage <= 0) return
        
        const isDead = target.takeDamage(damage)
        
        if (isDead) {
            const pos = target.node?.worldPosition || context.position
            EventBus.emit(EventNames.ENEMY_DIED, pos, target)
        }
    }
    
    private static dealAreaDamage(params: EffectParams, context: EffectContext): void {
        const { value, damagePercent, radius } = params
        const player = context.player
        const position = context.position || player.getNode().worldPosition
        
        EventBus.emit(EventNames.AREA_DAMAGE, { position, radius, damage: value, damagePercent })
    }

    // ========== 治疗系统 ==========
    
    private static heal(params: EffectParams, context: EffectContext): void {
        const { value, healPercent } = params
        const player = context.player
        
        if (!player) return
        
        let healAmount: number
        if (healPercent) {
            healAmount = player.getMaxHealth() * healPercent
        } else {
            healAmount = value || 0
        }
        
        if (healAmount > 0) {
            player.heal?.(healAmount)
        }
    }
    
    private static revive(params: EffectParams, context: EffectContext): void {
        const { hpPercent } = params
        const player = context.player
        
        if (!player) return
        
        player.revive?.(hpPercent || 0.5)
    }

    // ========== 移动系统 ==========
    
    private static teleport(params: EffectParams, context: EffectContext): void {
        const { radius } = params
        const player = context.player
        const playerNode = player.getNode()
        
        const randomX = (Math.random() - 0.5) * (radius || 300) * 2
        const randomY = (Math.random() - 0.5) * (radius || 300) * 2
        playerNode.setPosition(randomX, randomY, 0)
    }
    
    private static dodge(params: EffectParams, context: EffectContext): void {
        // TODO: 实现闪避系统
    }

    // ========== 属性转换 ==========
    
    private static convertStat(params: EffectParams, context: EffectContext): void {
        const { fromStat, toStat, ratio } = params
        const player = context.player
        
        if (!player) return
        
        const fromValue = this.getStatValue(player, fromStat)
        const converted = fromValue * (ratio || 0.5)
        
        this.applyPermanentStat(player, toStat, converted)
    }
    
    private static getStatValue(player: IPlayer, statName: string): number {
        switch (statName) {
            case 'attack':
                return player.getAttack()
            case 'maxHealth':
                return player.getMaxHealth()
            case 'currentHealth':
                return player.getCurrentHealth()
            case 'exp':
                return player.getExp()
            case 'level':
                return player.getLevel()
            case 'expMultiplier':
                return player.getExpMultiplier?.() || 1
            case 'cooldownReduction':
                return player.getAttackCooldownReduction()
            case 'magnetRange':
                return player.getMagnetRangeMultiplier()
            case 'vampirePercent':
                return player.getVampirePercent()
            default:
                return 0
        }
    }

    // ========== 投射物系统 ==========
    
    private static spawnProjectile(params: EffectParams, context: EffectContext): void {
        const { projectileId, damage, radius } = params
        
        EventBus.emit(EventNames.SPAWN_PROJECTILE, { projectileId, damage, radius, source: context.source })
    }
    
    private static repeatCast(params: EffectParams, context: EffectContext): void {
        // TODO: 实现重复施法
    }
    
    private static modifyProjectile(params: EffectParams, context: EffectContext): void {
        // TODO: 实现投射物修改
    }

    // ========== 护盾系统 ==========
    
    private static createShield(params: EffectParams, context: EffectContext): void {
        const { shieldPercent } = params
        const player = context.player
        
        if (!player || !shieldPercent) return
        
        const shieldAmount = player.getMaxHealth() * shieldPercent
        player.getHealth()?.addShield?.(shieldAmount)
    }

    // ========== 控制效果 ==========
    
    private static slowEnemy(params: EffectParams, context: EffectContext): void {
        const { slowPercent, duration } = params
        const target = context.target
        
        if (!target) return
        
        EventBus.emit(EventNames.ENEMY_SLOW, { target, slowPercent, duration })
    }
    
    private static freezeEnemy(params: EffectParams, context: EffectContext): void {
        const { duration } = params
        const target = context.target
        
        if (!target) return
        
        EventBus.emit(EventNames.ENEMY_FREEZE, { target, duration })
    }
    
    private static pullEnemy(params: EffectParams, context: EffectContext): void {
        const { radius } = params
        const player = context.player
        const position = player.getNode().worldPosition
        
        EventBus.emit(EventNames.PULL_ENEMY, { position, radius })
    }

    private static knockback(params: EffectParams, context: EffectContext): void {
        const { force } = params
        const target = context.target
        
        if (!target || !isDamageable(target)) return
        
        EventBus.emit('enemy_knockback', { target, force })
    }

    private static chain(params: EffectParams, context: EffectContext): void {
        const { chainCount, damagePercent } = params
        const target = context.target
        
        if (!target) return
        
        EventBus.emit('skill_chain', { target, chainCount, damagePercent, source: context.source })
    }

    private static cleanse(params: EffectParams, context: EffectContext): void {
        EventBus.emit('cleanse_player')
    }

    private static knockup(params: EffectParams, context: EffectContext): void {
        const { force } = params
        const target = context.target
        
        if (!target) return
        
        EventBus.emit('enemy_knockup', { target, force })
    }

    private static projectileReturn(params: EffectParams, context: EffectContext): void {
        const { damagePercent } = params
        
        EventBus.emit('projectile_return', { damagePercent, source: context.source })
    }

    private static aura(params: EffectParams, context: EffectContext): void {
        const { thornPercent, regenPercent, critBonus, radius } = params
        const player = context.player
        const position = player.getNode().worldPosition
        
        EventBus.emit('create_aura', { position, radius, thornPercent, regenPercent, critBonus })
    }

    private static areaDamage(params: EffectParams, context: EffectContext): void {
        const { damagePercent, radius } = params
        const player = context.player
        const position = context.position || player.getNode().worldPosition
        
        EventBus.emit(EventNames.AREA_DAMAGE, { position, radius, damagePercent })
    }

    private static chainControl(params: EffectParams, context: EffectContext): void {
        const { chainCount, radius } = params
        const target = context.target
        
        if (!target) return
        
        EventBus.emit('chain_control', { target, chainCount, radius })
    }

    // ========== 清理方法 ==========

    public static clearAllTemporaryStats(): void {
        for (const [key, records] of this.temporaryStats) {
            for (const record of records) {
                record.restoreMethod(record.originalValue)
            }
        }
        this.temporaryStats.clear()
        
        if (this.updateTimer !== -1) {
            cancelAnimationFrame(this.updateTimer as number)
            this.updateTimer = -1
        }
    }
}