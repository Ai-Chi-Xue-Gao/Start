// assets/scripts/gameplay/player/PlayerHealth.ts

import { _decorator, Node, Sprite, Color } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { FlashEffect } from '../../utils/FlashEffect';
import { PlayerConfig } from '../../configs/GameConfig';
import { Enemy } from '../enemy/Enemy';

const { ccclass, property } = _decorator;

/**
 * 玩家血量组件
 * 负责：血量管理、受伤、死亡、复活、反伤、护盾
 */
@ccclass('PlayerHealth')
export class PlayerHealth extends BaseComponent {
    // ========== 基础属性 ==========
    @property
    maxHealth: number = PlayerConfig.BASE_MAX_HEALTH

    @property
    currentHealth: number = PlayerConfig.BASE_CURRENT_HEALTH

    // ========== 私有属性 ==========
    private spriteNode: Node | null = null
    private hurtFlashTimer: any = null

    // 血量加成
    private healthMultiplier: number = 1.0
    private permanentHealthBonus: number = 0
    
    // 防御属性
    private damageReduction: number = 0
    
    // 护盾属性
    private shield: number = 0
    private killShield: number = 0
    
    // 反伤属性
    private thornDamage: number = 0
    
    // 回血属性
    private regenPercent: number = 0
    
    // 复活属性
    private rebirthAvailable: boolean = false

    // ========== 生命周期 ==========

    start() {
        this.spriteNode = this.node.getChildByName('Sprite')
        this.currentHealth = this.maxHealth
    }

    protected onDestroy() {
        this.cancelHurtFlash()
    }

    private cancelHurtFlash(): void {
        if (this.hurtFlashTimer !== null) {
            FlashEffect.cancel(this.hurtFlashTimer)
            this.hurtFlashTimer = null
        }
    }

    // ========== 血量获取方法 ==========

    /**
     * 获取最大生命值（取整）
     */
    public getMaxHealth(): number {
        return Math.floor((this.maxHealth + this.permanentHealthBonus) * this.healthMultiplier)
    }

    /**
     * 获取当前生命值（取整）
     */
    public getCurrentHealth(): number {
        return Math.floor(this.currentHealth)
    }

    /**
     * 获取生命值百分比
     */
    public getHealthPercent(): number {
        return this.getCurrentHealth() / this.getMaxHealth()
    }

    /**
     * 获取伤害减免比例
     */
    public getDamageReduction(): number {
        return this.damageReduction
    }

    /**
     * 获取反伤百分比
     */
    public getThornDamage(): number {
        return this.thornDamage
    }

    /**
     * 获取回血百分比
     */
    public getRegenPercent(): number {
        return this.regenPercent
    }

    // ========== 护盾相关方法 ==========

    /**
     * 添加护盾
     */
    public addShield(amount: number): void {
        this.shield += Math.floor(amount)
        EventBus.emit(EventNames.PLAYER_SHIELD_CHANGE, this.shield)
    }

    /**
     * 获取当前护盾值
     */
    public getShield(): number {
        return this.shield
    }

    /**
     * 使用护盾吸收伤害
     * @returns 实际吸收的伤害值
     */
    private useShield(amount: number): number {
        const used = Math.min(this.shield, amount)
        this.shield -= used
        EventBus.emit(EventNames.PLAYER_SHIELD_CHANGE, this.shield)
        return used
    }

    // ========== 击杀护盾方法 ==========

    /**
     * 添加击杀护盾
     */
    public addKillShield(amount: number): void {
        this.killShield += Math.floor(amount)
    }

    /**
     * 使用击杀护盾吸收伤害
     * @returns 实际吸收的伤害值
     */
    private useKillShield(amount: number): number {
        const used = Math.min(this.killShield, amount)
        this.killShield -= used
        return used
    }

    // ========== 血量加成方法 ==========

    /**
     * 添加血量倍率加成
     */
    public addHealthMultiplier(value: number): void {
        const oldMax = this.getMaxHealth()
        this.healthMultiplier *= value
        const newMax = this.getMaxHealth()
        
        // 按比例调整当前血量
        const ratio = oldMax > 0 ? this.currentHealth / oldMax : 1
        this.currentHealth = Math.floor(newMax * ratio)
        
        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.getCurrentHealth(), newMax)
    }

    /**
     * 添加永久血量加成
     */
    public addPermanentHealth(bonus: number): void {
        const bonusInt = Math.floor(bonus)
        this.permanentHealthBonus += bonusInt
        const newMax = this.getMaxHealth()
        
        this.currentHealth = Math.min(newMax, this.currentHealth + bonusInt)
        this.currentHealth = Math.floor(this.currentHealth)
        
        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.getCurrentHealth(), newMax)
    }

    /**
     * 设置最大生命值
     */
    public setMaxHealth(value: number): void {
        const ratio = this.currentHealth / this.maxHealth
        this.maxHealth = Math.floor(value)
        this.currentHealth = Math.floor(this.maxHealth * ratio)
        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.getCurrentHealth(), this.getMaxHealth())
    }

    // ========== 防御属性方法 ==========

    /**
     * 添加伤害减免
     */
    public addDamageReduction(value: number): void {
        this.damageReduction = Math.min(PlayerConfig.MAX_DAMAGE_REDUCTION, this.damageReduction + value)
    }

    // ========== 反伤方法 ==========

    /**
     * 添加反伤百分比
     */
    public addThornDamage(value: number): void {
        this.thornDamage += value
    }

    /**
     * 应用反伤效果
     */
    private applyThornDamage(originalDamage: number): void {
        if (this.thornDamage <= 0) return

        const reflectDamage = Math.max(1, Math.floor(originalDamage * this.thornDamage))
        
        const canvas = this.node.scene?.getChildByName('Canvas')
        if (!canvas) return

        const waveManager = canvas.getChildByName('WaveManager')
        if (!waveManager) return

        for (const child of waveManager.children) {
            const enemy = child.getComponent(Enemy)
            if (enemy && !enemy.isDead) {
                enemy.takeDamage(reflectDamage)
            }
        }
    }

    // ========== 回血方法 ==========

    /**
     * 添加永久回血百分比
     */
    public addRegenPercent(value: number): void {
        this.regenPercent += value
    }

    /**
     * 治疗
     */
    public heal(amount: number): void {
        if (this.currentHealth <= 0) return
        
        const healAmount = Math.floor(amount)
        this.currentHealth = Math.min(this.getMaxHealth(), this.currentHealth + healAmount)
        this.currentHealth = Math.floor(this.currentHealth)
        
        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.getCurrentHealth(), this.getMaxHealth())
    }

    // ========== 伤害系统 ==========

    /**
     * 受到伤害
     * @returns 是否死亡
     */
    public takeDamage(damage: number): boolean {
        if (this.currentHealth <= 0) return false

        let remainingDamage = damage

        // 1. 优先使用普通护盾
        const shieldAbsorbed = this.useShield(remainingDamage)
        remainingDamage -= shieldAbsorbed

        // 2. 使用击杀护盾
        if (remainingDamage > 0 && this.killShield > 0) {
            const killShieldAbsorbed = this.useKillShield(remainingDamage)
            remainingDamage -= killShieldAbsorbed
        }

        // 伤害被完全抵消
        if (remainingDamage <= 0) {
            EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.getCurrentHealth(), this.getMaxHealth())
            return false
        }

        // 3. 应用伤害减免
        let finalDamage = remainingDamage
        if (this.damageReduction > 0) {
            finalDamage = finalDamage * (1 - this.damageReduction)
        }

        finalDamage = Math.ceil(finalDamage)
        this.currentHealth -= finalDamage
        this.currentHealth = Math.max(0, Math.floor(this.currentHealth))

        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.getCurrentHealth(), this.getMaxHealth())

        // 只有真正扣血时才播放受伤闪烁
        if (finalDamage > 0) {
            this.playHurtFlash()
        }

        // 4. 应用反伤效果
        if (this.thornDamage > 0 && damage > 0) {
            this.applyThornDamage(damage)
        }

        // 5. 检查死亡和复活
        if (this.currentHealth <= 0) {
            if (this.rebirthAvailable) {
                this.doRebirth()
                return false
            }
            return true  // 真正死亡
        }

        return false
    }

    // ========== 复活系统 ==========

    /**
     * 设置是否可用复活
     */
    public setRebirthAvailable(available: boolean): void {
        this.rebirthAvailable = available
    }

    /**
     * 检查是否可用复活
     */
    public isRebirthAvailable(): boolean {
        return this.rebirthAvailable
    }

    /**
     * 执行复活
     */
    public doRebirth(): boolean {
        if (!this.rebirthAvailable) return false

        this.rebirthAvailable = false
        const reviveHealth = Math.floor(this.getMaxHealth() * PlayerConfig.REVIVE_HEALTH_PERCENT)
        this.currentHealth = reviveHealth

        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.getCurrentHealth(), this.getMaxHealth())
        return true
    }

    /**
     * 复活（外部调用）
     */
    public revive(hpPercent: number): void {
        if (this.currentHealth > 0) return
        
        this.currentHealth = Math.floor(this.getMaxHealth() * hpPercent)
        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.getCurrentHealth(), this.getMaxHealth())
    }

    // ========== 受伤闪烁效果 ==========

    /**
     * 播放受伤闪烁效果
     */
    private playHurtFlash(): void {
        const sprite = this.spriteNode?.getComponent(Sprite)
        if (!sprite) return

        // 取消之前的闪烁
        this.cancelHurtFlash()

        // 确保先恢复原色
        sprite.color = Color.WHITE

        // 开始新的闪烁
        this.hurtFlashTimer = FlashEffect.flash(
            sprite,
            0.3,
            0.08,
            Color.RED,
            () => {
                this.hurtFlashTimer = null
                if (sprite && sprite.isValid) {
                    sprite.color = Color.WHITE
                }
            }
        ) as any
    }
}