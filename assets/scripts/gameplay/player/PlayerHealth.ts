// assets/scripts/gameplay/player/PlayerHealth.ts

import { _decorator, Node, Sprite, Color } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { FlashEffect } from '../../utils/FlashEffect';
import { PlayerConfig, InvincibleFlashConfig } from '../../configs/GameConfig';

const { ccclass, property } = _decorator;

/**
 * 玩家血量组件
 * 负责：血量管理、受伤、死亡、无敌、复活
 */
@ccclass('PlayerHealth')
export class PlayerHealth extends BaseComponent {
    @property
    maxHealth: number = PlayerConfig.BASE_MAX_HEALTH

    @property
    currentHealth: number = PlayerConfig.BASE_CURRENT_HEALTH

    @property
    invincibleTime: number = PlayerConfig.INVINCIBLE_TIME

    private spriteNode: Node = null
    private isInvincible: boolean = false
    private invincibleTimer: number = 0
    private invincibleFlashInterval: any = null
    private hurtFlashInterval: any = null
    
    // 属性加成
    private healthMultiplier: number = 1.0
    private permanentHealthBonus: number = 0
    private damageReduction: number = 0
    private killShield: number = 0

    start() {
        this.spriteNode = this.node.getChildByName('Sprite')
        this.currentHealth = this.maxHealth
    }

    protected onDestroy() {
        if (this.invincibleFlashInterval !== null) {
            clearInterval(this.invincibleFlashInterval)
            this.invincibleFlashInterval = null
        }
        if (this.hurtFlashInterval !== null) {
            clearInterval(this.hurtFlashInterval)
            this.hurtFlashInterval = null
        }
    }

    public getMaxHealth(): number {
        return (this.maxHealth + this.permanentHealthBonus) * this.healthMultiplier
    }

    public getCurrentHealth(): number {
        return this.currentHealth
    }

    public getHealthPercent(): number {
        return this.currentHealth / this.getMaxHealth()
    }

    public addHealthMultiplier(value: number) {
        const oldMax = this.getMaxHealth()
        this.healthMultiplier *= value
        const newMax = this.getMaxHealth()
        this.currentHealth = this.currentHealth * (newMax / oldMax)
        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.currentHealth, newMax)
    }

    public addPermanentHealth(bonus: number) {
        this.permanentHealthBonus += bonus
        const newMax = this.getMaxHealth()
        this.currentHealth += bonus
        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.currentHealth, newMax)
    }

    public addDamageReduction(value: number) {
        this.damageReduction = Math.min(PlayerConfig.MAX_DAMAGE_REDUCTION, this.damageReduction + value)
    }

    public getDamageReduction(): number {
        return this.damageReduction
    }

    public addKillShield(amount: number) {
        this.killShield += amount
    }

    public useKillShield(amount: number): number {
        const used = Math.min(this.killShield, amount)
        this.killShield -= used
        return used
    }

    public takeDamage(damage: number): boolean {
        if (this.isInvincible) return false
        if (this.currentHealth <= 0) return false

        let finalDamage = damage

        // 护盾吸收
        if (this.killShield > 0) {
            const absorbed = this.useKillShield(finalDamage)
            finalDamage -= absorbed
        }

        // 减伤
        if (this.damageReduction > 0 && finalDamage > 0) {
            finalDamage = finalDamage * (1 - this.damageReduction)
        }

        if (finalDamage <= 0) return false

        this.currentHealth -= finalDamage
        this.currentHealth = Math.max(0, this.currentHealth)
        
        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.currentHealth, this.getMaxHealth())
        this.playHurtFlash()

        if (this.currentHealth <= 0) {
            return true  // 死亡
        } else {
            this.startInvincible()
            return false
        }
    }

    public heal(amount: number) {
        if (this.currentHealth <= 0) return
        const oldHealth = this.currentHealth
        this.currentHealth = Math.min(this.getMaxHealth(), this.currentHealth + amount)
        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.currentHealth, this.getMaxHealth())
    }

    public revive(hpPercent: number) {
        if (this.currentHealth > 0) return
        this.currentHealth = this.getMaxHealth() * hpPercent
        this.isInvincible = true
        this.invincibleTimer = 0
        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.currentHealth, this.getMaxHealth())
    }

    private startInvincible() {
        this.isInvincible = true
        this.invincibleTimer = 0
        this.startFlashEffect()
    }

    private startFlashEffect() {
        const sprite = this.spriteNode?.getComponent(Sprite)
        if (!sprite) return
        if (this.invincibleFlashInterval !== null) {
            FlashEffect.cancel(this.invincibleFlashInterval)
            this.invincibleFlashInterval = null
        }
        this.invincibleFlashInterval = FlashEffect.flash(
            sprite,
            InvincibleFlashConfig.DURATION,
            InvincibleFlashConfig.INTERVAL,
            new Color(
                InvincibleFlashConfig.COLOR_R,
                InvincibleFlashConfig.COLOR_G,
                InvincibleFlashConfig.COLOR_B,
                255
            ),
            () => { this.invincibleFlashInterval = null }
        ) as any
    }

    private playHurtFlash() {
        const sprite = this.spriteNode?.getComponent(Sprite)
        if (!sprite) return
        if (this.hurtFlashInterval !== null) {
            FlashEffect.cancel(this.hurtFlashInterval)
            this.hurtFlashInterval = null
        }
        this.hurtFlashInterval = FlashEffect.flash(
            sprite, 0.4, 0.1, Color.RED,
            () => { this.hurtFlashInterval = null }
        ) as any
    }

    public updateInvincible(deltaTime: number) {
        if (this.isInvincible) {
            this.invincibleTimer += deltaTime
            if (this.invincibleTimer >= this.invincibleTime) {
                this.isInvincible = false
                this.invincibleTimer = 0
            }
        }
    }

    public setMaxHealth(value: number) {
        const ratio = this.currentHealth / this.maxHealth
        this.maxHealth = value
        this.currentHealth = this.maxHealth * ratio
        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.currentHealth, this.maxHealth)
    }
}