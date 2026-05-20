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
import { PlayerConfig } from '../../configs/GameConfig';
import { EventNames } from '../../utils/EventNames';
import { ServiceLocator } from '../../core/ServiceLocator';
import { IPlayer } from '../../interfaces/IPlayer';
import { INetworkService } from '../../interfaces/INetworkService';
import { TriggerSystem } from '../../Managers/TriggerSystem';

const { ccclass, property } = _decorator;

/**
 * 玩家控制器（主控制器）
 * 负责：协调各组件、网络同步、技能系统初始化
 */
@ccclass('PlayerController')
export class PlayerController extends BaseComponent implements IPlayer {
    @property(Node)
    joystick: Node = null

    private playerAnim: PlayerAnim = null
    private movement: PlayerMovement = null
    private health: PlayerHealth = null
    private experience: PlayerExperience = null
    private skill: PlayerSkill = null
    private networkService: INetworkService | null = null
    private isPaused: boolean = false

    start() {
        // 获取组件
        this.playerAnim = this.getComponent(PlayerAnim)
        this.movement = this.getComponent(PlayerMovement)
        this.health = this.getComponent(PlayerHealth)
        this.experience = this.getComponent(PlayerExperience)
        this.skill = this.getComponent(PlayerSkill)

        // 注册到 ServiceLocator
        const serviceLocator = ServiceLocator.getInstance()
        serviceLocator.register('playerController', this);
        serviceLocator.register('IPlayer', this);

        // 设置摇杆
        if (this.movement && this.joystick) {
            this.movement.joystick = this.joystick
        }

        // 监听事件
        EventBus.on(EventNames.ENEMY_HIT_PLAYER, this.onTakeDamage, this)
        EventBus.on(EventNames.GAME_PAUSE, this.onGamePause, this)

        // 🆕 获取网络服务（单机模式跳过）
        const mode = (window as any).gameMode
        if (mode === 'multi') {
            this.networkService = this.getService<INetworkService>('INetworkService')
        } else {
            this.networkService = null
        }

        // 技能系统
        const skillManager = SkillManager.getInstance()
        skillManager.init(this)
        skillManager.loadAll(() => {
            console.log('[PlayerController] 技能系统已加载')
        })

        const triggerSystem = TriggerSystem.getInstance()
        triggerSystem.init(this)
    }

    protected onDestroy() {
        EventBus.off(EventNames.ENEMY_HIT_PLAYER, this.onTakeDamage, this)
        EventBus.off(EventNames.GAME_PAUSE, this.onGamePause, this)
    }

    private onGamePause(pause: boolean) {
        this.isPaused = pause
        if (this.movement) {
            this.movement.enabled = !pause
        }
    }

    private onTakeDamage(damage: number) {
        if (this.isPaused) return
        if (!this.health) return

        const isDead = this.health.takeDamage(damage)

        if (isDead) {
            this.die()
        }
    }

    private die() {
        console.log('玩家死亡！')
        if (this.playerAnim) {
            this.playerAnim.playDie()
        }
        this.enabled = false
        EventBus.emit(EventNames.PLAYER_DIED)
    }

    // ========== IPlayer 接口实现 ==========

    // 血量相关
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

    // 经验/等级相关
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

    // 战斗相关
    getAttack(): number {
        return this.skill?.getAttack() || 20
    }

    getAttackCooldownReduction(): number {
        return this.skill?.getAttackCooldownReduction() || 0
    }

    getSpeed(): number {
        const baseSpeed = PlayerConfig.BASE_SPEED
        const bonus = this.skill?.getPermanentSpeedBonus() || 1.0
        return baseSpeed * bonus
    }

    // 火球技能相关
    getHasDoubleFireball(): boolean {
        return this.skill?.getHasDoubleFireball() || false
    }

    getHasPierceFireball(): boolean {
        return this.skill?.getHasPierceFireball() || false
    }

    getFireballSpeedMultiplier(): number {
        return this.skill?.getFireballSpeedMultiplier() || 1.0
    }

    getPierceCount(): number {
        return this.skill?.getPierceCount() || 0
    }

    // 其他属性
    getMagnetRangeMultiplier(): number {
        return 1 + (this.skill?.getMagnetBonus() || 0)
    }

    getVampirePercent(): number {
        return this.skill?.getVampirePercent() || 0
    }

    // ========== 属性修改方法（技能系统使用）==========

    // 攻击相关
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

    // 移动相关
    addSpeedMultiplier(value: number): void {
        this.movement?.setSpeedMultiplier(value)
    }

    addPermanentSpeed(bonusPercent: number): void {
        this.skill?.addPermanentSpeed(bonusPercent)
    }

    setSpeed(value: number): void {
        // 由技能系统处理
    }

    // 血量相关
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

    // 经验相关
    addExpBonus(value: number): void {
        this.experience?.addExpBonus(value)
    }

    addPermanentExp(bonusPercent: number): void {
        this.experience?.addPermanentExp(bonusPercent)
    }

    setExpMultiplier(value: number): void {
        this.experience?.setExpMultiplier(value)
    }

    // 磁力相关
    addMagnetBonus(value: number): void {
        this.skill?.addMagnetBonus(value)
    }

    setMagnetRangeMultiplier(mult: number): void {
        this.skill?.setMagnetBonus(mult - 1)
    }

    // 火球相关
    setDoubleFireball(active: boolean): void {
        this.skill?.setDoubleFireball(active)
    }

    setPierceFireball(active: boolean): void {
        this.skill?.setPierceFireball(active)
    }

    setPierceCount(value: number): void {
        this.skill?.setPierceCount(value)
    }

    setFireballCount(value: number): void {
        this.skill?.setFireballCount(value)
    }

    setFireballSizeMultiplier(value: number): void {
        this.skill?.setFireballSizeMultiplier(value)
    }

    setFireballSpeedMultiplier(mult: number): void {
        this.skill?.setFireballSpeedMultiplier(mult)
    }

    addFireballSpeedMultiplier(mult: number): void {
        this.skill?.addFireballSpeedMultiplier(mult)
    }

    addFireballDamageBonus(bonus: number): void {
        this.skill?.addFireballDamageBonus(bonus)
    }

    // 吸血相关
    addVampirePercent(value: number): void {
        this.skill?.addVampirePercent(value)
    }

    // 暴击相关
    addCritChance(value: number): void {
        this.skill?.addCritChance(value)
    }

    addCritDamage(value: number): void {
        this.skill?.addCritDamage(value)
    }

    // 穿透相关
    addArmorPen(value: number): void {
        this.skill?.addArmorPen(value)
    }

    // 荆棘相关
    addThornDamage(value: number): void {
        this.skill?.addThornDamage(value)
    }

    // 幸运相关
    addLuckyBonus(bonusPercent: number): void {
        this.skill?.addLuckyBonus(bonusPercent)
    }

    // 暴怒相关
    addRageStats(params: { rageDuration?: number; rageDamageBonus?: number }): void {
        this.skill?.addRageStats(params)
    }

    // 重生相关
    setRebirthKillRequired(required: number): void {
        this.skill?.setRebirthKillRequired(required)
    }

    // ========== 其他公共方法 ==========

    public onAttackHit(damage: number, target?: any) {
        if (this.skill && this.skill.getVampirePercent() > 0) {
            const healAmount = damage * this.skill.getVampirePercent()
            if (healAmount > 0 && this.health) {
                this.health.heal(healAmount)
            }
        }
    }

    public onEnemyKilled() {
        if (this.skill) {
            this.skill.triggerRage()
        }
    }

    update(deltaTime: number) {
        if (this.isPaused) return
        if (!this.health || this.health.getCurrentHealth() <= 0) return

        this.health?.updateInvincible(deltaTime)
        this.skill?.updateTemporaryBonus(deltaTime)

        if (this.movement && this.skill) {
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

        if (this.networkService && this.networkService.isConnected()) {
            this.networkService.setMove(this.node.position.x, this.node.position.y)
        }
    }
}