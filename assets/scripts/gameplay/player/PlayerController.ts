// assets/scripts/gameplay/player/PlayerController.ts

import { _decorator, Node } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { PlayerAnim } from './PlayerAnim';
import { PlayerMovement } from './PlayerMovement';
import { PlayerHealth } from './PlayerHealth';
import { PlayerExperience } from './PlayerExperience';
import { PlayerSkill } from './PlayerSkill';
import { EventBus } from '../../core/EventBus';
import { SkillManager } from '../../Managers/SkillManager';
import { SkillFactory } from '../managers/SkillFactory';
import { TriggerSystem } from '../../Managers/TriggerSystem';
import { PlayerConfig } from '../../configs/GameConfig';
import { EventNames } from '../../utils/EventNames';
import { ServiceLocator } from '../../core/ServiceLocator';
import { IPlayer } from '../../interfaces/IPlayer';
import { INetworkService } from '../../interfaces/INetworkService';
import { GameContext } from '../../core/GameContext';

const { ccclass, property } = _decorator;

/**
 * 玩家控制器（主控制器）
 * 负责：协调各组件、网络同步、技能系统初始化
 */
@ccclass('PlayerController')
export class PlayerController extends BaseComponent implements IPlayer {
    @property(Node)
    joystick: Node = null

    // ========== 子组件引用 ==========
    private playerAnim: PlayerAnim = null
    private movement: PlayerMovement = null
    private health: PlayerHealth = null
    private experience: PlayerExperience = null
    private skill: PlayerSkill = null
    
    // ========== 技能系统 ==========
    private skillFactory: SkillFactory = null
    
    // ========== 外部服务 ==========
    private networkService: INetworkService | null = null
    
    // ========== 状态标志 ==========
    private isPaused: boolean = false

    // ========== 血木共生 - 永久回血相关 ==========
    private permanentRegen: number = 0

    // ========== 生命周期 ==========
    
    start() {
        this.initComponents()
        this.registerServices()
        this.initSkillSystem()
        this.bindEvents()
        this.initNetworkService()
    }

    protected onDestroy() {
        this.unbindEvents()
        this.cleanup()
    }

    /**
     * 初始化子组件引用
     */
    private initComponents(): void {
        this.playerAnim = this.getComponent(PlayerAnim)
        this.movement = this.getComponent(PlayerMovement)
        this.health = this.getComponent(PlayerHealth)
        this.experience = this.getComponent(PlayerExperience)
        this.skill = this.getComponent(PlayerSkill)

        if (this.movement && this.joystick) {
            this.movement.joystick = this.joystick
        }
    }

    /**
     * 注册服务到 ServiceLocator
     */
    private registerServices(): void {
        const serviceLocator = ServiceLocator.getInstance()
        serviceLocator.registerIfNotExist('player', this)
    }

    /**
     * 初始化技能系统
     */
    private initSkillSystem(): void {
        const skillManager = SkillManager.getInstance()
        skillManager.init(this)
        skillManager.loadAll(() => {
            console.log('[PlayerController] 技能配置加载完成')
        })

        this.skillFactory = SkillFactory.getInstance()

        // TriggerSystem 初始化（用于升级触发器）
        const triggerSystem = TriggerSystem.getInstance()
        triggerSystem.init(this)
    }

    /**
     * 绑定事件监听
     */
    private bindEvents(): void {
        EventBus.on(EventNames.ENEMY_HIT_PLAYER, this.onTakeDamage, this)
        EventBus.on(EventNames.GAME_PAUSE, this.onGamePause, this)
        EventBus.on(EventNames.SKILL_SELECTED, this.onSkillSelected, this)
    }

    /**
     * 解绑事件监听
     */
    private unbindEvents(): void {
        EventBus.off(EventNames.ENEMY_HIT_PLAYER, this.onTakeDamage, this)
        EventBus.off(EventNames.GAME_PAUSE, this.onGamePause, this)
        EventBus.off(EventNames.SKILL_SELECTED, this.onSkillSelected, this)
    }

    /**
     * 初始化网络服务（联机模式）
     */
    private initNetworkService(): void {
        const gameContext = GameContext.getInstance()
        if (gameContext.isMultiMode()) {
            this.networkService = this.getService<INetworkService>('networkService')
        }
    }

    /**
     * 清理资源
     */
    private cleanup(): void {
        // 清理技能工厂
        if (this.skillFactory) {
            this.skillFactory.clearAllSkills()
        }
        
        // 销毁 TriggerSystem
        const triggerSystem = TriggerSystem.getInstance()
        triggerSystem.destroy()
    }

    // ========== 事件回调 ==========

    private onGamePause(pause: boolean): void {
        this.isPaused = pause
        if (this.movement) {
            this.movement.enabled = !pause
        }
    }

    private onTakeDamage(damage: number): void {
        if (this.isPaused) return
        if (!this.health) return

        const isDead = this.health.takeDamage(damage)
        if (isDead) {
            this.die()
        }
    }

    private onSkillSelected(data: { skillId: string, level: number }): void {
        if (this.skillFactory) {
            this.skillFactory.addSkillToPlayer(this.node, data.skillId, data.level)
        }
    }

    private die(): void {
        if (this.playerAnim) {
            this.playerAnim.playDie()
        }
        this.enabled = false
        EventBus.emit(EventNames.PLAYER_DIED)
    }

    // ========== IPlayer 接口实现 - 血量相关 ==========

    getCurrentHealth(): number {
        return this.health?.getCurrentHealth() || 0
    }

    getMaxHealth(): number {
        return this.health?.getMaxHealth() || 100
    }

    takeDamage(damage: number): boolean {
        return this.health?.takeDamage(damage) || false
    }

    heal(amount: number): void {
        this.health?.heal(amount)
    }

    revive(hpPercent: number): void {
        this.health?.revive(hpPercent)
    }

    // ========== IPlayer 接口实现 - 经验/等级相关 ==========

    getExp(): number {
        return this.experience?.getExp() || 0
    }

    getExpToNextLevel(): number {
        return this.experience?.getExpToNextLevel() || 100
    }

    getLevel(): number {
        return this.experience?.getLevel() || 1
    }

    getExpMultiplier(): number {
        return this.experience?.getExpMultiplier() || 1
    }

    // ========== IPlayer 接口实现 - 战斗相关 ==========

    getAttack(): number {
        return this.skill?.getAttack() || PlayerConfig.BASE_ATTACK
    }

    getAttackCooldownReduction(): number {
        return this.skill?.getAttackCooldownReduction() || 0
    }

    getSpeed(): number {
        const baseSpeed = PlayerConfig.BASE_SPEED
        const bonus = this.skill?.getPermanentSpeedBonus() || 1.0
        return baseSpeed * bonus
    }

    // ========== IPlayer 接口实现 - 其他属性 ==========

    getMagnetRangeMultiplier(): number {
        return 1 + (this.skill?.getMagnetBonus() || 0)
    }

    getVampirePercent(): number {
        return this.skill?.getVampirePercent() || 0
    }

    // ========== IPlayer 接口实现 - 组件访问 ==========

    getNode(): Node {
        return this.node
    }

    getShield(): number {
        return this.health?.getShield?.() || 0
    }

    getHealth(): PlayerHealth {
        return this.health
    }

    getSkill(): PlayerSkill {
        return this.skill
    }

    addTemporaryAttackBonus(bonus: number, duration: number): void {
        this.skill?.addTemporaryAttackBonus(bonus, duration)
    }

    onAttackHit(damage: number, target?: any): void {
        if (this.skill && this.skill.getVampirePercent() > 0) {
            const healAmount = damage * this.skill.getVampirePercent()
            if (healAmount > 0 && this.health) {
                this.health.heal(healAmount)
            }
        }
    }

    // ========== IPlayer 接口实现 - 攻击相关属性修改 ==========

    addAttackMultiplier(value: number): void {
        this.skill?.addAttackMultiplier(value)
    }

    addPermanentAttack(bonus: number): void {
        this.skill?.addPermanentAttack(bonus)
    }

    setAttackCooldownReduction(reduce: number): void {
        this.skill?.setAttackCooldownReduction(reduce)
    }

    addCooldownReduction(value: number): void {
        this.skill?.addCooldownReduction(value)
    }

    addPermanentCooldown(bonus: number): void {
        this.skill?.addPermanentCooldown(bonus)
    }

    // ========== IPlayer 接口实现 - 移动相关属性修改 ==========

    addSpeedMultiplier(value: number): void {
        this.movement?.setSpeedMultiplier(value)
    }

    addPermanentSpeed(bonusPercent: number): void {
        this.skill?.addPermanentSpeed(bonusPercent)
    }

    setSpeed(value: number): void {
        // 由技能系统处理，暂不实现
    }

    // ========== IPlayer 接口实现 - 血量相关属性修改 ==========

    addDamageReduction(value: number): void {
        this.health?.addDamageReduction(value)
    }

    addPermanentHealth(bonus: number): void {
        this.health?.addPermanentHealth(bonus)
    }

    setMaxHealth(value: number): void {
        this.health?.setMaxHealth(value)
    }

    addKillShield(amount: number): void {
        this.health?.addKillShield(amount)
    }

    // ========== IPlayer 接口实现 - 经验相关属性修改 ==========

    addExpBonus(value: number): void {
        this.experience?.addExpBonus(value)
    }

    addPermanentExp(bonusPercent: number): void {
        this.experience?.addPermanentExp(bonusPercent)
    }

    setExpMultiplier(value: number): void {
        this.experience?.setExpMultiplier(value)
    }

    // ========== IPlayer 接口实现 - 磁力相关属性修改 ==========

    addMagnetBonus(value: number): void {
        this.skill?.addMagnetBonus(value)
    }

    setMagnetRangeMultiplier(mult: number): void {
        this.skill?.setMagnetBonus(mult - 1)
    }

    // ========== IPlayer 接口实现 - 其他属性修改 ==========

    addVampirePercent(value: number): void {
        this.skill?.addVampirePercent(value)
    }

    addCritChance(value: number): void {
        this.skill?.addCritChance(value)
    }

    addCritDamage(value: number): void {
        this.skill?.addCritDamage(value)
    }

    addArmorPen(value: number): void {
        this.skill?.addArmorPen(value)
    }

    addThornDamage(value: number): void {
        this.health?.addThornDamage(value)
    }

    addLuckyBonus(bonusPercent: number): void {
        this.skill?.addLuckyBonus(bonusPercent)
    }

    addRageStats(params: { rageDuration?: number; rageDamageBonus?: number }): void {
        this.skill?.addRageStats(params)
    }

    setRebirthKillRequired(required: number): void {
        this.skill?.setRebirthKillRequired(required)
    }

    // ========== 血木共生 - 永久回血相关 ==========

    public addPermanentRegen(value: number): void {
        this.permanentRegen += value
    }

    public getPermanentRegen(): number {
        return this.permanentRegen
    }

    // ========== 其他公开方法 ==========

    public onEnemyKilled(): void {
        if (this.skill) {
            this.skill.triggerRage()
        }
    }

    public setRebirthAvailable(available: boolean): void {
        this.health?.setRebirthAvailable(available)
    }

    public isRebirthAvailable(): boolean {
        return this.health?.isRebirthAvailable?.() || false
    }

    // ========== 更新循环 ==========

    update(deltaTime: number): void {
        if (this.isPaused) return
        if (!this.health || this.health.getCurrentHealth() <= 0) return

        this.updateTemporaryEffects(deltaTime)
        this.updateMovementAndAnimation(deltaTime)
        this.syncNetworkPosition()
    }

    private updateTemporaryEffects(deltaTime: number): void {
        this.skill?.updateTemporaryBonus(deltaTime)
    }

    private updateMovementAndAnimation(deltaTime: number): void {
        if (!this.movement || !this.skill) return

        const direction = this.movement.getDirection()
        this.movement.updateSpriteDirection(direction)

        const isMoving = this.movement.getIsMoving()
        if (this.playerAnim) {
            if (isMoving) {
                this.playerAnim.playMove()
            } else {
                this.playerAnim.playIdle()
            }
        }

        const baseSpeed = PlayerConfig.BASE_SPEED
        this.movement.updatePosition(deltaTime, baseSpeed)
    }

    private syncNetworkPosition(): void {
        if (this.networkService && this.networkService.isConnected()) {
            this.networkService.setMove(this.node.position.x, this.node.position.y)
        }
    }
}