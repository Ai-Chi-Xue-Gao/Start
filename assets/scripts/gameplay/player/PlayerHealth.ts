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
    @property
    maxHealth: number = PlayerConfig.BASE_MAX_HEALTH

    @property
    currentHealth: number = PlayerConfig.BASE_CURRENT_HEALTH

    private spriteNode: Node = null
    private hurtFlashInterval: any = null

    // 属性加成
    private healthMultiplier: number = 1.0
    private permanentHealthBonus: number = 0
    private damageReduction: number = 0
    private killShield: number = 0
    private thornDamage: number = 0
    private rebirthAvailable: boolean = false;
    private rebirthCount: number = 0;

    // 护盾属性
    private shield: number = 0;

    start() {
        this.spriteNode = this.node.getChildByName('Sprite')
        this.currentHealth = this.maxHealth
    }

    protected onDestroy() {
        if (this.hurtFlashInterval !== null) {
            clearInterval(this.hurtFlashInterval)
            this.hurtFlashInterval = null
        }
    }

    /**
     * 获取最大生命值（取整）
     */
    public getMaxHealth(): number {
        return Math.floor((this.maxHealth + this.permanentHealthBonus) * this.healthMultiplier);
    }

    /**
     * 获取当前生命值（取整）
     */
    public getCurrentHealth(): number {
        return Math.floor(this.currentHealth);
    }

    /**
     * 获取生命值百分比
     */
    public getHealthPercent(): number {
        return this.getCurrentHealth() / this.getMaxHealth();
    }

    // ========== 护盾相关方法 ==========

    public addShield(amount: number) {
        this.shield += Math.floor(amount);
        console.log(`[护盾] 添加护盾，护盾值: ${this.shield}`);
        EventBus.emit(EventNames.PLAYER_SHIELD_CHANGE, this.shield);
    }

    public useShield(amount: number): number {
        const used = Math.min(this.shield, amount);
        this.shield -= used;
        EventBus.emit(EventNames.PLAYER_SHIELD_CHANGE, this.shield);
        return used;
    }

    public getShield(): number {
        return this.shield;
    }

    // ========== 血量加成方法 ==========

    public addHealthMultiplier(value: number) {
        const oldMax = this.getMaxHealth();
        this.healthMultiplier *= value;
        const newMax = this.getMaxHealth();
        const ratio = oldMax > 0 ? this.currentHealth / oldMax : 1;
        this.currentHealth = Math.floor(newMax * ratio);
        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.getCurrentHealth(), newMax);
    }

    public addPermanentHealth(bonus: number) {
        const bonusInt = Math.floor(bonus);
        this.permanentHealthBonus += bonusInt;
        const newMax = this.getMaxHealth();
        this.currentHealth = Math.min(newMax, this.currentHealth + bonusInt);
        this.currentHealth = Math.floor(this.currentHealth);
        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.getCurrentHealth(), newMax);
    }

    public addDamageReduction(value: number) {
        this.damageReduction = Math.min(PlayerConfig.MAX_DAMAGE_REDUCTION, this.damageReduction + value);
    }

    public getDamageReduction(): number {
        return this.damageReduction;
    }

    // ========== 击杀护盾相关 ==========

    public addKillShield(amount: number) {
        this.killShield += Math.floor(amount);
    }

    public useKillShield(amount: number): number {
        const used = Math.min(this.killShield, amount);
        this.killShield -= used;
        return used;
    }

    // ========== 反伤相关 ==========

    public addThornDamage(value: number) {
        this.thornDamage += value;
        console.log(`[石肤荆棘] 反伤百分比: ${this.thornDamage * 100}%`);
    }

    public getThornDamage(): number {
        return this.thornDamage;
    }

    // ========== 受到伤害 ==========

    public takeDamage(damage: number): boolean {
        if (this.currentHealth <= 0) return false;

        let remainingDamage = damage;

        // 优先使用护盾
        let shieldAbsorbed = 0;
        if (this.shield > 0) {
            shieldAbsorbed = this.useShield(remainingDamage);
            remainingDamage -= shieldAbsorbed;
        }

        // 使用击杀护盾
        let killShieldAbsorbed = 0;
        if (remainingDamage > 0 && this.killShield > 0) {
            killShieldAbsorbed = this.useKillShield(remainingDamage);
            remainingDamage -= killShieldAbsorbed;
        }

        // 如果伤害被完全抵消
        if (remainingDamage <= 0) {
            EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.getCurrentHealth(), this.getMaxHealth());
            return false;
        }

        // 减伤
        let finalDamage = remainingDamage;
        if (this.damageReduction > 0 && finalDamage > 0) {
            finalDamage = finalDamage * (1 - this.damageReduction);
        }

        // 伤害向上取整
        finalDamage = Math.ceil(finalDamage);
        this.currentHealth -= finalDamage;
        this.currentHealth = Math.max(0, Math.floor(this.currentHealth));

        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.getCurrentHealth(), this.getMaxHealth());

        // 只有真正扣血时才播放受伤闪烁
        if (finalDamage > 0) {
            this.playHurtFlash();
        }

        // 反伤效果
        if (this.thornDamage > 0 && damage > 0) {
            this.applyThornDamage(damage);
        }

        // 玩家死亡时检查复活
        if (this.currentHealth <= 0) {
            if (this.rebirthAvailable) {
                this.doRebirth();
                return false;
            }
            return true;  // 真正死亡
        }

        return false;
    }

    /**
     * 应用反伤效果
     */
    private applyThornDamage(originalDamage: number) {
        const reflectDamage = Math.max(1, Math.floor(originalDamage * this.thornDamage));

        const canvas = this.node.scene?.getChildByName('Canvas');
        if (!canvas) return;

        const waveManager = canvas.getChildByName('WaveManager');
        let reflectCount = 0;

        if (waveManager) {
            for (const child of waveManager.children) {
                const enemy = child.getComponent(Enemy);
                if (enemy && !enemy.isDead) {
                    enemy.takeDamage(reflectDamage);
                    reflectCount++;
                }
            }
        }

        if (reflectCount > 0) {
            console.log(`[石肤荆棘] 反弹 ${reflectDamage} 点伤害给 ${reflectCount} 个敌人`);
        }
    }

    // ========== 治疗 ==========

    public heal(amount: number) {
        if (this.currentHealth <= 0) return;
        const healAmount = Math.floor(amount);
        this.currentHealth = Math.min(this.getMaxHealth(), this.currentHealth + healAmount);
        this.currentHealth = Math.floor(this.currentHealth);
        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.getCurrentHealth(), this.getMaxHealth());
    }

    // ========== 复活 ==========

    public revive(hpPercent: number) {
        if (this.currentHealth > 0) return;
        this.currentHealth = Math.floor(this.getMaxHealth() * hpPercent);
        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.getCurrentHealth(), this.getMaxHealth());
    }

    // ========== 受伤闪烁 ==========

    private playHurtFlash() {
        const sprite = this.spriteNode?.getComponent(Sprite);
        if (!sprite) return;
        if (this.hurtFlashInterval !== null) {
            FlashEffect.cancel(this.hurtFlashInterval);
            this.hurtFlashInterval = null;
        }
        this.hurtFlashInterval = FlashEffect.flash(
            sprite, 0.3, 0.08, Color.RED,
            () => { this.hurtFlashInterval = null }
        ) as any;
    }

    // ========== 属性设置 ==========

    public setMaxHealth(value: number) {
        const ratio = this.currentHealth / this.maxHealth;
        this.maxHealth = Math.floor(value);
        this.currentHealth = Math.floor(this.maxHealth * ratio);
        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.getCurrentHealth(), this.getMaxHealth());
    }

    // ========== 复活相关 ==========

    public setRebirthAvailable(available: boolean) {
        this.rebirthAvailable = available;
        console.log(`[重生] 复活机会可用: ${available}`);
    }

    public isRebirthAvailable(): boolean {
        return this.rebirthAvailable;
    }

    public doRebirth(): boolean {
        if (!this.rebirthAvailable) return false;

        this.rebirthAvailable = false;
        const reviveHealth = Math.floor(this.getMaxHealth() * PlayerConfig.REVIVE_HEALTH_PERCENT);
        this.currentHealth = reviveHealth;

        EventBus.emit(EventNames.PLAYER_HEALTH_CHANGE, this.getCurrentHealth(), this.getMaxHealth());

        console.log(`[重生] 复活！回复 ${reviveHealth} 点生命值 (${PlayerConfig.REVIVE_HEALTH_PERCENT * 100}%)`);
        return true;
    }
}