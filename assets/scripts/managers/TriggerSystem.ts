import { PlayerController } from '../entities/player/PlayerController';
import { EffectSystem, EffectType, EffectParams, EffectContext } from './EffectSystem';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';

/**
 * 触发条件
 */
export interface TriggerCondition {
    hpPercent?: string           // 血量百分比条件，如 "<0.3" 或 ">0.8"
    duration?: number            // 持续时间条件（移动、站立等）
    comboCount?: number          // 连击次数条件
    skillId?: string             // 技能ID条件
    targetHpPercent?: string     // 目标血量百分比条件
    targetHasBuff?: string       // 目标是否有某个Buff
    overheal?: boolean           // 是否过量治疗
    damageThreshold?: number     // 伤害阈值
    killCount?: number           // 击杀数阈值
    [key: string]: any
}

/**
 * 触发器节点
 */
export interface TriggerNode {
    triggerId: string            // 触发器唯一ID
    triggerName: string          // 触发事件名称（onKill, onDamage等）
    condition: TriggerCondition  // 触发条件
    effectType: EffectType       // 效果类型
    effectParams: EffectParams   // 效果参数
    cooldown: number             // 冷却时间（秒）
    lastTriggerTime: number      // 上次触发时间（运行时使用）
}

/**
 * 触发器系统
 * 负责管理技能升级解锁的触发器，监听玩家事件并执行对应效果
 */
export class TriggerSystem {
    private static instance: TriggerSystem
    private player: PlayerController = null
    private triggers: Map<string, TriggerNode[]> = new Map()  // 事件名 -> 触发器列表
    private isInitialized: boolean = false
    private eventHandlers: Map<string, (data: any) => void> = new Map()  // 存储事件处理函数引用

    private constructor() { }

    static getInstance(): TriggerSystem {
        if (!TriggerSystem.instance) {
            TriggerSystem.instance = new TriggerSystem()
        }
        return TriggerSystem.instance
    }

    /**
     * 初始化触发器系统（绑定玩家）
     */
    public init(player: PlayerController) {
        if (this.isInitialized) return
        this.player = player
        this.setupEventListeners()
        this.isInitialized = true
        console.log('[TriggerSystem] 初始化完成')
    }

    /**
     * 设置事件监听器（使用 EventBus）
     */
    private setupEventListeners() {
        if (!this.player) return

        // 定义事件处理函数（使用箭头函数，保留 this 绑定）
        const onDamage = (data: any) => this.handleEvent('onDamage', data)
        const onKill = (data: any) => this.handleEvent('onKill', data)
        const onHeal = (data: any) => this.handleEvent('onHeal', data)
        const onLowHealth = (data: any) => this.handleEvent('onLowHealth', data)
        const onHighHealth = (data: any) => this.handleEvent('onHighHealth', data)
        const onSkillCast = (data: any) => this.handleEvent('onSkillCast', data)
        const onMoving = (data: any) => this.handleEvent('onMoving', data)
        const onCombo = (data: any) => this.handleEvent('onCombo', data)
        const onDeath = (data: any) => this.handleEvent('onDeath', data)
        const onLevelUp = (data: any) => this.handleEvent('onLevelUp', data)
        const onHit = (data: any) => this.handleEvent('onHit', data)
        const onSkillUpgrade = (data: any) => this.handleEvent('onSkillUpgrade', data)

        // 存储处理函数引用
        this.eventHandlers.set('onDamage', onDamage)
        this.eventHandlers.set('onKill', onKill)
        this.eventHandlers.set('onHeal', onHeal)
        this.eventHandlers.set('onLowHealth', onLowHealth)
        this.eventHandlers.set('onHighHealth', onHighHealth)
        this.eventHandlers.set('onSkillCast', onSkillCast)
        this.eventHandlers.set('onMoving', onMoving)
        this.eventHandlers.set('onCombo', onCombo)
        this.eventHandlers.set('onDeath', onDeath)
        this.eventHandlers.set('onLevelUp', onLevelUp)
        this.eventHandlers.set('onHit', onHit)
        this.eventHandlers.set('onSkillUpgrade', onSkillUpgrade)

        // 注册 EventBus 监听
        EventBus.on(EventNames.PLAYER_HURT, onDamage)
        EventBus.on(EventNames.ENEMY_DIED, onKill)
        EventBus.on(EventNames.PLAYER_HEALTH_CHANGE, onHeal)
        EventBus.on('player_low_health', onLowHealth)
        EventBus.on('player_high_health', onHighHealth)
        EventBus.on('skill_cast', onSkillCast)
        EventBus.on('player_move', onMoving)
        EventBus.on('combo_hit', onCombo)
        EventBus.on(EventNames.PLAYER_DIED, onDeath)
        EventBus.on(EventNames.PLAYER_LEVEL_UP, onLevelUp)
        EventBus.on('player_hit', onHit)
        EventBus.on(EventNames.SKILL_SELECTED, onSkillUpgrade)

        console.log('[TriggerSystem] 事件监听器已注册')
    }

    /**
     * 注册触发器（由技能系统调用）
     */
    public registerTrigger(
        triggerName: string,
        triggerId: string,
        condition: TriggerCondition,
        effectType: EffectType,
        effectParams: EffectParams,
        cooldown: number = 0
    ) {
        if (!this.triggers.has(triggerName)) {
            this.triggers.set(triggerName, [])
        }

        const existing = this.triggers.get(triggerName)!
        const found = existing.find(t => t.triggerId === triggerId)
        if (found) {
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
        console.log(`[TriggerSystem] 注册触发器: ${triggerName} -> ${triggerId}`)
    }

    /**
     * 移除触发器
     */
    public unregisterTrigger(triggerId: string) {
        for (const [eventName, triggers] of this.triggers) {
            const index = triggers.findIndex(t => t.triggerId === triggerId)
            if (index !== -1) {
                triggers.splice(index, 1)
                console.log(`[TriggerSystem] 移除触发器: ${triggerId}`)
                break
            }
        }
    }

    /**
     * 处理事件
     */
    private handleEvent(eventName: string, data: any) {
        const triggers = this.triggers.get(eventName)
        if (!triggers || triggers.length === 0) return

        const currentTime = Date.now() / 1000

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

    /**
     * 检查条件是否满足
     */
    private checkCondition(condition: TriggerCondition, data: any): boolean {
        // 血量百分比条件
        if (condition.hpPercent) {
            const hpPercent = data.hpPercent || (data.currentHp / data.maxHp)
            const operator = condition.hpPercent[0]
            const value = parseFloat(condition.hpPercent.slice(1))

            if (operator === '<' && hpPercent >= value) return false
            if (operator === '>' && hpPercent <= value) return false
            if (operator === '=' && Math.abs(hpPercent - value) > 0.01) return false
        }

        // 连击数条件
        if (condition.comboCount && (!data.comboCount || data.comboCount < condition.comboCount)) {
            return false
        }

        // 技能ID条件
        if (condition.skillId && data.skillId !== condition.skillId) {
            return false
        }

        // 目标血量条件
        if (condition.targetHpPercent) {
            const targetHpPercent = data.targetHpPercent || (data.targetCurrentHp / data.targetMaxHp)
            const operator = condition.targetHpPercent[0]
            const value = parseFloat(condition.targetHpPercent.slice(1))

            if (operator === '<' && targetHpPercent >= value) return false
            if (operator === '>' && targetHpPercent <= value) return false
        }

        // 目标Buff条件
        if (condition.targetHasBuff && (!data.targetBuffs || !data.targetBuffs.includes(condition.targetHasBuff))) {
            return false
        }

        // 过量治疗条件
        if (condition.overheal === true && !data.overheal) {
            return false
        }

        // 伤害阈值条件
        if (condition.damageThreshold && (!data.damage || data.damage < condition.damageThreshold)) {
            return false
        }

        // 击杀数条件
        if (condition.killCount && (!data.killCount || data.killCount < condition.killCount)) {
            return false
        }

        return true
    }

    /**
     * 执行触发器效果
     */
    private executeTrigger(trigger: TriggerNode, data: any) {
        const context: EffectContext = {
            player: this.player,
            target: data.target,
            position: data.position,
            source: trigger.triggerId
        }

        EffectSystem.execute(trigger.effectType, trigger.effectParams, context)
        console.log(`[TriggerSystem] 执行触发器: ${trigger.triggerId}, 效果: ${trigger.effectType}`)
    }

    /**
     * 手动触发一个事件（用于外部调用）
     */
    public triggerEvent(eventName: string, data: any = {}) {
        this.handleEvent(eventName, data)
    }

    /**
     * 获取所有已注册的触发器
     */
    public getAllTriggers(): Map<string, TriggerNode[]> {
        return this.triggers
    }

    /**
     * 清除所有触发器（新游戏时调用）
     */
    public clear() {
        this.triggers.clear()
        console.log('[TriggerSystem] 所有触发器已清除')
    }

    /**
     * 重置系统（新游戏时调用）
     */
    public reset() {
        this.clear()
        console.log('[TriggerSystem] 已重置')
    }

    /**
     * 销毁系统（移除事件监听）
     */
    public destroy() {
        // 移除所有 EventBus 监听
        EventBus.off(EventNames.PLAYER_HURT, this.eventHandlers.get('onDamage')!)
        EventBus.off(EventNames.ENEMY_DIED, this.eventHandlers.get('onKill')!)
        EventBus.off(EventNames.PLAYER_HEALTH_CHANGE, this.eventHandlers.get('onHeal')!)
        EventBus.off('player_low_health', this.eventHandlers.get('onLowHealth')!)
        EventBus.off('player_high_health', this.eventHandlers.get('onHighHealth')!)
        EventBus.off('skill_cast', this.eventHandlers.get('onSkillCast')!)
        EventBus.off('player_move', this.eventHandlers.get('onMoving')!)
        EventBus.off('combo_hit', this.eventHandlers.get('onCombo')!)
        EventBus.off(EventNames.PLAYER_DIED, this.eventHandlers.get('onDeath')!)
        EventBus.off(EventNames.PLAYER_LEVEL_UP, this.eventHandlers.get('onLevelUp')!)
        EventBus.off('player_hit', this.eventHandlers.get('onHit')!)
        EventBus.off(EventNames.SKILL_SELECTED, this.eventHandlers.get('onSkillUpgrade')!)

        this.eventHandlers.clear()
        this.isInitialized = false
        console.log('[TriggerSystem] 已销毁')
    }
}