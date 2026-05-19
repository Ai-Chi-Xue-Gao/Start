import { _decorator, Component, Node } from 'cc';
import { PlayerAnim } from './PlayerAnim';
import { PlayerMovement } from './PlayerMovement';
import { PlayerHealth } from './PlayerHealth';
import { PlayerExperience } from './PlayerExperience';
import { PlayerSkill } from './PlayerSkill';
import { EventBus } from '../../core/EventBus';
import { NetworkManager } from '../../network/NetworkManager';
import { SkillManager } from '../../managers/SkillManager';
import { GameConstants } from '../../utils/GameConstants';
import { EventNames } from '../../utils/EventNames';
import { ServiceLocator } from '../../core/ServiceLocator';

const { ccclass, property } = _decorator;

/**
 * 玩家控制器（主控制器）
 * 负责：协调各组件、网络同步、技能系统初始化
 */
@ccclass('PlayerController')
export class PlayerController extends Component {
    @property(Node)
    joystick: Node = null

    private playerAnim: PlayerAnim = null
    private movement: PlayerMovement = null
    private health: PlayerHealth = null
    private experience: PlayerExperience = null
    private skill: PlayerSkill = null
    private networkManager: NetworkManager = null
    private isPaused: boolean = false

    start() {
        // 获取组件
        this.playerAnim = this.getComponent(PlayerAnim)
        this.movement = this.getComponent(PlayerMovement)
        this.health = this.getComponent(PlayerHealth)
        this.experience = this.getComponent(PlayerExperience)
        this.skill = this.getComponent(PlayerSkill)

        // 注册到 ServiceLocator
        ServiceLocator.getInstance().register('playerController', this);

        // 设置摇杆
        if (this.movement && this.joystick) {
            this.movement.joystick = this.joystick
        }

        // 监听事件
        EventBus.on(EventNames.ENEMY_HIT_PLAYER, this.onTakeDamage, this)
        EventBus.on(EventNames.GAME_PAUSE, this.onGamePause, this)

        // 网络管理器
        const canvas = this.node.scene.getChildByName('Canvas')
        const networkNode = canvas?.getChildByName('NetworkManager')
        this.networkManager = networkNode?.getComponent(NetworkManager)

        const gameMode = (window as any).gameMode
        if (this.networkManager && gameMode === 'multi') {
            this.networkManager.connect()
            this.setupNetworkCallbacks()
        }

        // 技能系统
        const skillManager = SkillManager.getInstance()
        skillManager.init(this as any)
        skillManager.loadAll(() => {
            console.log('[PlayerController] 技能系统已加载')
        })
    }

    protected onDestroy() {
        EventBus.off(EventNames.ENEMY_HIT_PLAYER, this.onTakeDamage, this)
        EventBus.off(EventNames.GAME_PAUSE, this.onGamePause, this)
    }

    private setupNetworkCallbacks() {
        this.networkManager.setOnPlayerHurt((playerId: string, damage: number, currentHp: number, maxHp: number) => {
            // 处理其他玩家受伤
        })
        this.networkManager.setOnPlayerLevelUp((playerId: string, level: number) => {
            // 处理其他玩家升级
        })
        this.networkManager.setOnPlayerExpUpdate((playerId: string, exp: number, expToNextLevel: number, level: number) => {
            // 处理其他玩家经验更新
        })
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

    // ========== 对外接口（供其他组件调用） ==========

    public getMovement(): PlayerMovement { return this.movement }
    public getHealth(): PlayerHealth { return this.health }
    public getExperience(): PlayerExperience { return this.experience }
    public getSkill(): PlayerSkill { return this.skill }
    public getPlayerAnim(): PlayerAnim { return this.playerAnim }

    // 攻击命中回调
    public onAttackHit(damage: number, target?: any) {
        if (this.skill && this.skill.getVampirePercent() > 0) {
            const healAmount = damage * this.skill.getVampirePercent()
            if (healAmount > 0 && this.health) {
                this.health.heal(healAmount)
            }
        }
    }

    // 击杀回调
    public onEnemyKilled() {
        if (this.skill) {
            this.skill.triggerRage()
        }
        if (this.experience) {
            // 触发击杀事件（用于技能系统）
        }
    }

    // ========== 兼容旧接口（供 PlayerAttack 等调用） ==========

    public getAttack(): number { return this.skill?.getAttack() || 20 }
    public getSpeed(): number {
        const baseSpeed = GameConstants.PLAYER_BASE_SPEED
        const bonus = this.skill?.getPermanentSpeedBonus() || 1.0
        return baseSpeed * bonus
    }
    public getExpMultiplier(): number { return this.experience?.getExpMultiplier() || 1.0 }
    public getAttackCooldownReduction(): number { return this.skill?.getAttackCooldownReduction() || 0 }
    public getMagnetRangeMultiplier(): number { return 1 + (this.skill?.getMagnetBonus() || 0) }
    public getHasDoubleFireball(): boolean { return this.skill?.getHasDoubleFireball() || false }
    public getHasPierceFireball(): boolean { return this.skill?.getHasPierceFireball() || false }
    public getFireballSpeedMultiplier(): number { return this.skill?.getFireballSpeedMultiplier() || 1.0 }

    public getCurrentHealth(): number { return this.health?.getCurrentHealth() || 0 }
    public getMaxHealth(): number { return this.health?.getMaxHealth() || 100 }
    public getExp(): number { return this.experience?.getExp() || 0 }
    public getExpToNextLevel(): number { return this.experience?.getExpToNextLevel() || 100 }
    public getLevel(): number { return this.experience?.getLevel() || 1 }

    public heal(amount: number) { this.health?.heal(amount) }
    public revive(hpPercent: number) { this.health?.revive(hpPercent) }

    public setMaxHealth(value: number) { this.health?.setMaxHealth(value) }
    public setSpeed(value: number) { /* 由技能系统处理 */ }
    public setExpMultiplier(value: number) { this.experience?.setExpMultiplier(value) }
    public setDoubleFireball(active: boolean) { this.skill?.setDoubleFireball(active) }
    public setPierceFireball(active: boolean) { this.skill?.setPierceFireball(active) }
    public setPierceCount(value: number) { this.skill?.setPierceCount?.(value); }
    public getPierceCount(): number { return this.skill?.getPierceCount?.() || 0; }
    public setFireballCount(value: number) { this.skill?.setFireballCount?.(value); }
    public setFireballSizeMultiplier(value: number) { this.skill?.setFireballSizeMultiplier?.(value); }
    public setFireballSpeedMultiplier(mult: number) { this.skill?.setFireballSpeedMultiplier(mult) }
    public setAttackBoost(mult: number) { /* 由技能系统处理 */ }
    public setAttackCooldownReduction(reduce: number) { this.skill?.setAttackCooldownReduction(reduce) }
    public setMagnetRangeMultiplier(mult: number) { this.skill?.setMagnetBonus(mult - 1) }

    // 技能系统 Add 方法
    public addAttackMultiplier(value: number) { this.skill?.addAttackMultiplier(value) }
    public addSpeedMultiplier(value: number) { this.movement?.setSpeedMultiplier(value) }
    public addExpBonus(value: number) { this.experience?.addExpBonus(value) }
    public addCooldownReduction(value: number) { this.skill?.addCooldownReduction(value) }
    public addMagnetBonus(value: number) { this.skill?.addMagnetBonus(value) }
    public addFireballSpeedMultiplier(mult: number) { this.skill?.addFireballSpeedMultiplier(mult) }
    public addFireballDamageBonus(bonus: number) { this.skill?.addFireballDamageBonus(bonus) }
    public addVampirePercent(value: number) { this.skill?.addVampirePercent(value) }
    public addDamageReduction(value: number) { this.health?.addDamageReduction(value) }
    public addCritChance(value: number) { this.skill?.addCritChance(value) }
    public addCritDamage(value: number) { this.skill?.addCritDamage(value) }
    public addArmorPen(value: number) { this.skill?.addArmorPen(value) }
    public addThornDamage(value: number) { this.skill?.addThornDamage(value) }
    public addPermanentAttack(bonus: number) { this.skill?.addPermanentAttack(bonus) }
    public addPermanentHealth(bonus: number) { this.health?.addPermanentHealth(bonus) }
    public addPermanentSpeed(bonusPercent: number) { this.skill?.addPermanentSpeed(bonusPercent) }
    public addPermanentCooldown(bonus: number) { this.skill?.addPermanentCooldown(bonus) }
    public addPermanentExp(bonusPercent: number) { this.experience?.addPermanentExp(bonusPercent) }
    public addKillShield(amount: number) { this.health?.addKillShield(amount) }
    public addLuckyBonus(bonusPercent: number) { this.skill?.addLuckyBonus?.(bonusPercent) }
    public addRageStats(params: any) { this.skill?.addRageStats(params) }
    public setRebirthKillRequired(required: number) { this.skill?.setRebirthKillRequired?.(required) }

    update(deltaTime: number) {
        if (this.isPaused) return
        if (!this.health || this.health.getCurrentHealth() <= 0) return

        // 更新无敌计时
        this.health?.updateInvincible(deltaTime)

        // 更新临时效果
        this.skill?.updateTemporaryBonus(deltaTime)

        // 移动
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

            const baseSpeed = GameConstants.PLAYER_BASE_SPEED
            this.movement.updatePosition(deltaTime, baseSpeed)
        }

        // 网络同步
        if (this.networkManager && this.networkManager.isConnected()) {
            this.networkManager.setMove(this.node.position.x, this.node.position.y)
        }
    }
}