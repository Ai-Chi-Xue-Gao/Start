// assets/scripts/gameplay/player/PlayerSkill.ts

import { _decorator } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { AttackConfig, PlayerConfig } from '../../configs/GameConfig';

const { ccclass } = _decorator;

/**
 * 玩家技能组件
 * 负责：基础属性存储（攻击、冷却、暴击等）
 * 注意：主动技能由 GenericSkill 系统管理
 */
@ccclass('PlayerSkill')
export class PlayerSkill extends BaseComponent {
    // ========== 攻击相关 ==========
    private attack: number = PlayerConfig.BASE_ATTACK
    private attackMultiplierBonus: number = 1.0
    private skill_attackBoost: number = 1.0
    private temporaryAttackBonus: number = 1.0
    private temporaryBonusTimer: number = 0
    private temporaryBonusDuration: number = 0
    
    // ========== 冷却相关 ==========
    private skill_cooldownReduction: number = 0
    private permanentCooldownBonus: number = 0
    
    // ========== 特殊属性 ==========
    private vampirePercent: number = 0
    private critChance: number = 0
    private critDamage: number = 0.5
    private armorPen: number = 0
    private magnetBonus: number = 0
    
    // ========== 永久加成 ==========
    private permanentAttackBonus: number = 0
    private permanentSpeedBonus: number = 1.0
    
    // ========== 暴怒相关 ==========
    private rageDurationBonus: number = 0
    private rageDamageBonus: number = 0

    // ========== 幸运相关 ==========
    private luckyBonus: number = 0

    // ========== 重生相关 ==========
    private rebirthKillRequired: number = 0

    // ========== Getter 方法 ==========

    public getAttack(): number {
        let attack = this.attack + this.permanentAttackBonus
        attack = attack * this.skill_attackBoost
        attack = attack * this.attackMultiplierBonus
        attack = attack * this.temporaryAttackBonus
        return attack
    }

    public getAttackCooldownReduction(): number {
        let reduction = this.skill_cooldownReduction
        reduction += this.permanentCooldownBonus
        return Math.min(AttackConfig.MIN_COOLDOWN, reduction)
    }

    public getVampirePercent(): number {
        return this.vampirePercent
    }

    public getCritChance(): number {
        return this.critChance
    }

    public getCritDamage(): number {
        return 1 + this.critDamage
    }

    public getArmorPen(): number {
        return this.armorPen
    }

    public getMagnetBonus(): number {
        return this.magnetBonus
    }

    public getPermanentSpeedBonus(): number {
        return this.permanentSpeedBonus
    }

    public getLuckyBonus(): number {
        return this.luckyBonus
    }

    public getRebirthKillRequired(): number {
        return this.rebirthKillRequired
    }

    // ========== Setter 方法 ==========

    public setAttackCooldownReduction(reduce: number) {
        this.skill_cooldownReduction = reduce
    }
    
    public setMagnetBonus(value: number) {
        this.magnetBonus = value
    }
    
    public setRebirthKillRequired(required: number) {
        this.rebirthKillRequired = required
    }

    // ========== Add 方法 ==========

    public addAttackMultiplier(value: number) {
        this.attackMultiplierBonus *= value
    }
    
    public addCooldownReduction(value: number) {
        this.skill_cooldownReduction += value
    }
    
    public addPermanentAttack(bonus: number) {
        this.permanentAttackBonus += bonus
    }
    
    public addPermanentCooldown(bonus: number) {
        this.permanentCooldownBonus += bonus
    }
    
    public addPermanentSpeed(bonusPercent: number) {
        this.permanentSpeedBonus += bonusPercent
    }
    
    public addVampirePercent(value: number) {
        this.vampirePercent += value
    }
    
    public addCritChance(value: number) {
        this.critChance = Math.min(PlayerConfig.MAX_CRIT_CHANCE, this.critChance + value)
    }
    
    public addCritDamage(value: number) {
        this.critDamage += value
    }
    
    public addArmorPen(value: number) {
        this.armorPen = Math.min(1.0, this.armorPen + value)
    }
    
    public addMagnetBonus(value: number) {
        this.magnetBonus += value
    }
    
    public addLuckyBonus(value: number) {
        this.luckyBonus += value
    }

    // ========== 临时效果 ==========

    public addTemporaryAttackBonus(bonus: number, duration: number) {
        this.temporaryAttackBonus = 1 + bonus
        this.temporaryBonusDuration = duration
        this.temporaryBonusTimer = 0
    }

    public updateTemporaryBonus(deltaTime: number) {
        if (this.temporaryBonusDuration > 0) {
            this.temporaryBonusTimer += deltaTime
            if (this.temporaryBonusTimer >= this.temporaryBonusDuration) {
                this.temporaryAttackBonus = 1.0
                this.temporaryBonusDuration = 0
            }
        }
    }

    // ========== 暴怒 ==========

    public addRageStats(params: { rageDuration?: number, rageDamageBonus?: number }) {
        if (params.rageDuration) this.rageDurationBonus += params.rageDuration
        if (params.rageDamageBonus) this.rageDamageBonus += params.rageDamageBonus
    }

    public getRageDuration(): number {
        return 3 + this.rageDurationBonus
    }

    public getRageDamageBonus(): number {
        return 0.3 + this.rageDamageBonus
    }

    public triggerRage() {
        const duration = this.getRageDuration()
        const bonus = this.getRageDamageBonus()
        this.addTemporaryAttackBonus(bonus, duration)
    }
}