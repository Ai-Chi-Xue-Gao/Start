// assets/scripts/managers/TriggerSystem.ts

import { director, Vec3 } from 'cc';
import { IPlayer } from '../interfaces/IPlayer';
import { IDamageable, isDamageable } from '../interfaces/IDamageable';
import { EffectSystem, EffectType, EffectParams, EffectContext } from './EffectSystem';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';
import { ServiceLocator } from '../core/ServiceLocator';

// ========== 类型定义 ==========

export interface TriggerCondition {
    hpPercent?: string
    duration?: number
    comboCount?: number
    skillId?: string
    targetHpPercent?: string
    targetHasBuff?: string
    overheal?: boolean
    damageThreshold?: number
    killCount?: number
    [key: string]: any
}

export interface TriggerNode {
    triggerId: string
    triggerName: string
    condition: TriggerCondition
    effectType: EffectType
    effectParams: EffectParams
    cooldown: number
    lastTriggerTime: number
}

type EventHandler = (data: any) => void

// ========== 触发器系统 ==========

export class TriggerSystem {
    private static instance: TriggerSystem

    private player: IPlayer | null = null
    private triggers: Map<string, TriggerNode[]> = new Map()
    private isInitialized: boolean = false
    private eventHandlers: Map<string, EventHandler> = new Map()

    private constructor() { }

    static getInstance(): TriggerSystem {
        if (!TriggerSystem.instance) {
            TriggerSystem.instance = new TriggerSystem()
        }
        return TriggerSystem.instance
    }

    // ========== 初始化 ==========

    public init(player: IPlayer): void {
        if (this.isInitialized) {
            console.warn('[TriggerSystem] 已经初始化过，跳过')
            return
        }

        this.player = player

        if (!ServiceLocator.getInstance().has('triggerSystem')) {
            ServiceLocator.getInstance().register('triggerSystem', this)
        }

        this.setupEventListeners()
        this.isInitialized = true
    }

    public reset(): void {
        this.clear()
    }

    public destroy(): void {
        this.removeEventListeners()
        this.eventHandlers.clear()
        this.isInitialized = false
    }

    // ========== 事件监听设置 ==========

    private setupEventListeners(): void {
        if (!this.player) return

        const handlers: Record<string, (data: any) => void> = {
            onDamage: (data: any) => this.handleEvent('onDamage', data),
            onKill: (data: any) => this.handleEvent('onKill', data),
            onHeal: (data: any) => this.handleEvent('onHeal', data),
            onLowHealth: (data: any) => this.handleEvent('onLowHealth', data),
            onHighHealth: (data: any) => this.handleEvent('onHighHealth', data),
            onSkillCast: (data: any) => this.handleEvent('onSkillCast', data),
            onMoving: (data: any) => this.handleEvent('onMoving', data),
            onCombo: (data: any) => this.handleEvent('onCombo', data),
            onDeath: (data: any) => this.handleEvent('onDeath', data),
            onLevelUp: (data: any) => this.handleEvent('onLevelUp', data),
            onHit: (data: any) => this.handleEvent('onHit', data),
            onSkillUpgrade: (data: any) => this.handleEvent('onSkillUpgrade', data),
            onControlEnd: (data: any) => this.handleEvent('onControlEnd', data)
        }

        for (const [key, handler] of Object.entries(handlers)) {
            this.eventHandlers.set(key, handler)
        }

        EventBus.on(EventNames.PLAYER_HURT, handlers.onDamage)
        EventBus.on(EventNames.ENEMY_DIED, handlers.onKill)
        EventBus.on(EventNames.PLAYER_HEALTH_CHANGE, handlers.onHeal)
        EventBus.on(EventNames.PLAYER_LOW_HEALTH, handlers.onLowHealth)
        EventBus.on(EventNames.PLAYER_HIGH_HEALTH, handlers.onHighHealth)
        EventBus.on(EventNames.SKILL_CAST, handlers.onSkillCast)
        EventBus.on(EventNames.PLAYER_MOVE, handlers.onMoving)
        EventBus.on(EventNames.COMBO_HIT, handlers.onCombo)
        EventBus.on(EventNames.PLAYER_DIED, handlers.onDeath)
        EventBus.on(EventNames.PLAYER_LEVEL_UP, handlers.onLevelUp)
        EventBus.on(EventNames.PLAYER_HIT, handlers.onHit)
        EventBus.on(EventNames.SKILL_SELECTED, handlers.onSkillUpgrade)
    }

    private removeEventListeners(): void {
        const handlers = {
            onDamage: this.eventHandlers.get('onDamage'),
            onKill: this.eventHandlers.get('onKill'),
            onHeal: this.eventHandlers.get('onHeal'),
            onLowHealth: this.eventHandlers.get('onLowHealth'),
            onHighHealth: this.eventHandlers.get('onHighHealth'),
            onSkillCast: this.eventHandlers.get('onSkillCast'),
            onMoving: this.eventHandlers.get('onMoving'),
            onCombo: this.eventHandlers.get('onCombo'),
            onDeath: this.eventHandlers.get('onDeath'),
            onLevelUp: this.eventHandlers.get('onLevelUp'),
            onHit: this.eventHandlers.get('onHit'),
            onSkillUpgrade: this.eventHandlers.get('onSkillUpgrade'),
            onControlEnd: this.eventHandlers.get('onControlEnd')
        }

        if (handlers.onDamage) EventBus.off(EventNames.PLAYER_HURT, handlers.onDamage)
        if (handlers.onKill) EventBus.off(EventNames.ENEMY_DIED, handlers.onKill)
        if (handlers.onHeal) EventBus.off(EventNames.PLAYER_HEALTH_CHANGE, handlers.onHeal)
        if (handlers.onLowHealth) EventBus.off(EventNames.PLAYER_LOW_HEALTH, handlers.onLowHealth)
        if (handlers.onHighHealth) EventBus.off(EventNames.PLAYER_HIGH_HEALTH, handlers.onHighHealth)
        if (handlers.onSkillCast) EventBus.off(EventNames.SKILL_CAST, handlers.onSkillCast)
        if (handlers.onMoving) EventBus.off(EventNames.PLAYER_MOVE, handlers.onMoving)
        if (handlers.onCombo) EventBus.off(EventNames.COMBO_HIT, handlers.onCombo)
        if (handlers.onDeath) EventBus.off(EventNames.PLAYER_DIED, handlers.onDeath)
        if (handlers.onLevelUp) EventBus.off(EventNames.PLAYER_LEVEL_UP, handlers.onLevelUp)
        if (handlers.onHit) EventBus.off(EventNames.PLAYER_HIT, handlers.onHit)
        if (handlers.onSkillUpgrade) EventBus.off(EventNames.SKILL_SELECTED, handlers.onSkillUpgrade)
    }

    // ========== 触发器管理 ==========

    public registerTrigger(
        triggerName: string,
        triggerId: string,
        condition: TriggerCondition,
        effectType: EffectType,
        effectParams: EffectParams,
        cooldown: number = 0
    ): void {
        if (!this.isInitialized) {
            console.warn('[TriggerSystem] 系统未初始化，无法注册触发器')
            return
        }

        if (!this.triggers.has(triggerName)) {
            this.triggers.set(triggerName, [])
        }

        const existing = this.triggers.get(triggerName)!
        if (existing.find(t => t.triggerId === triggerId)) {
            console.warn(`[TriggerSystem] 触发器已存在: ${triggerId}`)
            return
        }

        const triggerNode: TriggerNode = {
            triggerId: triggerId,
            triggerName: triggerName,
            condition: condition,
            effectType: effectType,
            effectParams: effectParams,
            cooldown: cooldown,
            lastTriggerTime: 0
        }

        existing.push(triggerNode)
    }

    public unregisterTrigger(triggerId: string): void {
        for (const [eventName, triggers] of this.triggers) {
            const index = triggers.findIndex(t => t.triggerId === triggerId)
            if (index !== -1) {
                triggers.splice(index, 1)
                break
            }
        }
    }

    public clear(): void {
        this.triggers.clear()
    }

    public getAllTriggers(): Map<string, TriggerNode[]> {
        return this.triggers
    }

    public triggerEvent(eventName: string, data: any = {}): void {
        this.handleEvent(eventName, data)
    }

    // ========== 事件处理 ==========

    private getGameTime(): number {
        return director.getTotalTime() / 1000
    }

    private handleEvent(eventName: string, data: any): void {
        const triggers = this.triggers.get(eventName)
        if (!triggers || triggers.length === 0) return

        const currentTime = this.getGameTime()

        for (const trigger of triggers) {
            if (trigger.cooldown > 0 && currentTime - trigger.lastTriggerTime < trigger.cooldown) {
                continue
            }

            if (this.checkCondition(trigger.condition, data)) {
                trigger.lastTriggerTime = currentTime
                this.executeTrigger(trigger, data)
            }
        }
    }

    // ========== 条件检查 ==========

    private checkCondition(condition: TriggerCondition, data: any): boolean {
        if (condition.hpPercent && !this.checkHpPercent(condition.hpPercent, data)) {
            return false
        }

        if (condition.comboCount && (!data.comboCount || data.comboCount < condition.comboCount)) {
            return false
        }

        if (condition.skillId && data.skillId !== condition.skillId) {
            return false
        }

        if (condition.targetHpPercent && !this.checkTargetHpPercent(condition.targetHpPercent, data)) {
            return false
        }

        if (condition.targetHasBuff && (!data.targetBuffs || !data.targetBuffs.includes(condition.targetHasBuff))) {
            return false
        }

        if (condition.overheal === true && !data.overheal) {
            return false
        }

        if (condition.damageThreshold && (!data.damage || data.damage < condition.damageThreshold)) {
            return false
        }

        if (condition.killCount && (!data.killCount || data.killCount < condition.killCount)) {
            return false
        }

        return true
    }

    private checkHpPercent(hpPercent: string, data: any): boolean {
        const percent = data.hpPercent ?? (data.currentHp / data.maxHp)
        const operator = hpPercent[0]
        const value = parseFloat(hpPercent.slice(1))

        if (operator === '<' && percent >= value) return false
        if (operator === '>' && percent <= value) return false
        if (operator === '=' && Math.abs(percent - value) > 0.01) return false

        return true
    }

    private checkTargetHpPercent(targetHpPercent: string, data: any): boolean {
        const percent = data.targetHpPercent ?? (data.targetCurrentHp / data.targetMaxHp)
        const operator = targetHpPercent[0]
        const value = parseFloat(targetHpPercent.slice(1))

        if (operator === '<' && percent >= value) return false
        if (operator === '>' && percent <= value) return false

        return true
    }

    // ========== 效果执行 ==========

    private executeTrigger(trigger: TriggerNode, data: any): void {
        if (!this.player) return

        const context: EffectContext = {
            player: this.player,
            target: data.target as IDamageable,
            position: data.position,
            source: trigger.triggerId
        }

        EffectSystem.execute(trigger.effectType, trigger.effectParams, context)
    }
}