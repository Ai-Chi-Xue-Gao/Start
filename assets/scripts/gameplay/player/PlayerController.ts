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
import { WaterOrbManager } from '../projectile/WaterOrbManager';
import { IceNova } from '../skills/IceNova';
import { SummonRoot } from '../skills/SummonRoot';
import { WoodRegen } from '../skills/WoodRegen';
import { Shield } from '../skills/Shield';
import { KillRewardSystem } from '../systems/KillRewardSystem';

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
    private waterOrbManager: WaterOrbManager = null;
    private iceNova: IceNova = null;
    private summonRoot: SummonRoot = null
    private woodRegen = null
    private shield: Shield = null
    private killRewardSystem: KillRewardSystem = null

    start() {
        // 获取组件
        this.playerAnim = this.getComponent(PlayerAnim)
        this.movement = this.getComponent(PlayerMovement)
        this.health = this.getComponent(PlayerHealth)
        this.experience = this.getComponent(PlayerExperience)
        this.skill = this.getComponent(PlayerSkill)
        this.iceNova = this.getComponent(IceNova);

        // ========== 1. 注册到 ServiceLocator（必须最先执行）==========
        const serviceLocator = ServiceLocator.getInstance()
        serviceLocator.registerIfNotExist('playerController', this);
        serviceLocator.registerIfNotExist('IPlayer', this);
        console.log('[PlayerController] 已注册到 ServiceLocator');

        // 设置摇杆
        if (this.movement && this.joystick) {
            this.movement.joystick = this.joystick
        }

        // 监听事件
        EventBus.on(EventNames.ENEMY_HIT_PLAYER, this.onTakeDamage, this)
        EventBus.on(EventNames.GAME_PAUSE, this.onGamePause, this)

        // 获取网络服务（单机模式跳过）
        const mode = (window as any).gameMode
        if (mode === 'multi') {
            this.networkService = this.getService<INetworkService>('INetworkService')
        } else {
            this.networkService = null
        }

        // ========== 2. 技能系统初始化 ==========
        const skillManager = SkillManager.getInstance()
        skillManager.init(this)
        skillManager.loadAll(() => {
            console.log('[PlayerController] 技能系统已加载')
        })

        // ========== 3. TriggerSystem 初始化（放在注册完成之后）==========
        const triggerSystem = TriggerSystem.getInstance()
        triggerSystem.init(this)
        console.log('[PlayerController] TriggerSystem 已初始化');

        // 监听技能选择事件
        EventBus.on(EventNames.SKILL_SELECTED, this.onSkillSelected, this)

        // 技能组件引用
        this.waterOrbManager = this.getComponent(WaterOrbManager)
        if (this.waterOrbManager) {
            this.waterOrbManager.playerNode = this.node
        }

        this.summonRoot = this.getComponent(SummonRoot)
        this.woodRegen = this.getComponent(WoodRegen)
        this.shield = this.getComponent(Shield)
        this.killRewardSystem = this.getComponent(KillRewardSystem)

    }

    protected onDestroy() {
        EventBus.off(EventNames.ENEMY_HIT_PLAYER, this.onTakeDamage, this)
        EventBus.off(EventNames.GAME_PAUSE, this.onGamePause, this)
        EventBus.off(EventNames.SKILL_SELECTED, this.onSkillSelected, this)

        // 销毁 TriggerSystem
        const triggerSystem = TriggerSystem.getInstance()
        triggerSystem.destroy()
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

    private onSkillSelected(data: { skillId: string, level: number }) {
        // 单个技能处理
        if (data.skillId === 'water_trail') {
            this.movement?.updateWaterTrailStatus()
        } else if (data.skillId === 'water_orb') {
            this.waterOrbManager?.updateSkillStatus()
        } else if (data.skillId === 'ice_nova') {
            this.iceNova?.updateSkillStatus();
        } else if (data.skillId === 'summon_root') {
            this.summonRoot?.updateSkillStatus()
        } else if (data.skillId === 'wood_regen') {
            this.woodRegen?.updateSkillStatus()
        } else if (data.skillId === 'shield') {
            this.shield?.updateSkillStatus()
        }

        // 杀怪奖励技能组
        const killSkillIds = [
            'kill_attack', 'kill_health', 'kill_speed',
            'kill_cooldown', 'kill_exp', 'kill_vampire',
            'kill_shield', 'kill_rage', 'kill_lucky', 'kill_rebirth'
        ];

        if (killSkillIds.includes(data.skillId)) {
            this.killRewardSystem?.updateAllSkillStatus();
        }
    }

    public getShield(): number {
        return this.health?.getShield?.() || 0;
    }

    public addTemporaryAttackBonus(bonus: number, duration: number) {
        this.skill?.addTemporaryAttackBonus(bonus, duration);
    }

    // ========== IPlayer 接口实现 ==========

    getCurrentHealth(): number {
        return this.health?.getCurrentHealth() || 0
    }

    getMaxHealth(): number {
        return this.health?.getMaxHealth() || 100
    }

    public getHealth(): PlayerHealth {
        return this.health;
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

    // ========== 火球技能相关 ==========

    public getFireballCount(): number {
        return this.skill?.getFireballCount() || 1
    }

    /** @deprecated 请使用 getFireballCount() >= 2 */
    public getHasDoubleFireball(): boolean {
        return this.getFireballCount() >= 2
    }

    public getHasPierceFireball(): boolean {
        return this.skill?.getHasPierceFireball() || false
    }

    public getFireballSpeedMultiplier(): number {
        return this.skill?.getFireballSpeedMultiplier() || 1.0
    }

    public getPierceCount(): number {
        return this.skill?.getPierceCount() || 0
    }

    public getFireballSizeMultiplier(): number {
        return this.skill?.getFireballSizeMultiplier() || 1.0
    }

    public getFireballDamageBonus(): number {
        return this.skill?.getFireballDamageBonus() || 1.0
    }

    getMagnetRangeMultiplier(): number {
        return 1 + (this.skill?.getMagnetBonus() || 0)
    }

    getVampirePercent(): number {
        return this.skill?.getVampirePercent() || 0
    }

    // ========== 属性修改方法 ==========

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

    addSpeedMultiplier(value: number): void {
        this.movement?.setSpeedMultiplier(value)
    }

    addPermanentSpeed(bonusPercent: number): void {
        this.skill?.addPermanentSpeed(bonusPercent)
    }

    setSpeed(value: number): void {
        // 由技能系统处理
    }

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

    addExpBonus(value: number): void {
        this.experience?.addExpBonus(value)
    }

    addPermanentExp(bonusPercent: number): void {
        this.experience?.addPermanentExp(bonusPercent)
    }

    setExpMultiplier(value: number): void {
        this.experience?.setExpMultiplier(value)
    }

    addMagnetBonus(value: number): void {
        this.skill?.addMagnetBonus(value)
    }

    setMagnetRangeMultiplier(mult: number): void {
        this.skill?.setMagnetBonus(mult - 1)
    }

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

    public getSkill(): PlayerSkill {
        return this.skill;
    }

    public setRebirthAvailable(available: boolean) {
        this.health?.setRebirthAvailable(available);
    }

    public isRebirthAvailable(): boolean {
        return this.health?.isRebirthAvailable?.() || false;
    }

    update(deltaTime: number) {
        if (this.isPaused) return
        if (!this.health || this.health.getCurrentHealth() <= 0) return

        // ❌ 无敌更新已移除
        // this.health?.updateInvincible(deltaTime)
        
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