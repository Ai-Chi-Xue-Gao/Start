// assets/scripts/gameplay/player/PlayerSkill.ts

import { _decorator } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { AttackConfig, PlayerConfig } from '../../configs/GameConfig';

const { ccclass } = _decorator;

/**
 * 玩家技能组件
 * 负责：技能属性存储、攻击相关技能效果
 */
@ccclass('PlayerSkill')
export class PlayerSkill extends BaseComponent {
    // 攻击相关
    private attack: number = PlayerConfig.BASE_ATTACK
    private attackMultiplierBonus: number = 1.0
    private skill_attackBoost: number = 1.0
    private temporaryAttackBonus: number = 1.0
    private temporaryBonusTimer: number = 0
    private temporaryBonusDuration: number = 0
    
    // 冷却相关
    private skill_cooldownReduction: number = 0
    private permanentCooldownBonus: number = 0
    
    // 武器技能
    private hasDoubleFireball: boolean = false
    private hasPierceFireball: boolean = false
    private pierceCount: number = 0
    private fireballCount: number = 1
    private fireballSpeedMultiplier: number = 1.0
    private fireballSizeMultiplier: number = 1.0
    private fireballDamageBonus: number = 0
    
    // 特殊属性
    private vampirePercent: number = 0
    private critChance: number = 0
    private critDamage: number = 0.5
    private armorPen: number = 0
    private thornDamage: number = 0
    private magnetBonus: number = 0
    
    // 永久加成
    private permanentAttackBonus: number = 0
    private permanentSpeedBonus: number = 1.0
    
    // 暴怒相关
    private rageDurationBonus: number = 0
    private rageDamageBonus: number = 0

    // 幸运相关
    private luckyBonus: number = 0

    // 重生相关
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

    public getHasDoubleFireball(): boolean {
        return this.hasDoubleFireball
    }

    public getHasPierceFireball(): boolean {
        return this.hasPierceFireball
    }

    public getPierceCount(): number {
        return this.pierceCount
    }

    public getFireballCount(): number {
        return this.fireballCount
    }

    public getFireballSpeedMultiplier(): number {
        return this.fireballSpeedMultiplier
    }

    public getFireballSizeMultiplier(): number {
        return this.fireballSizeMultiplier
    }

    public getFireballDamageBonus(): number {
        return 1 + this.fireballDamageBonus
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

    public getThornDamage(): number {
        return this.thornDamage
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

    public setDoubleFireball(active: boolean) { this.hasDoubleFireball = active }
    public setPierceFireball(active: boolean) { this.hasPierceFireball = active }
    public setPierceCount(count: number) { this.pierceCount = count }
    public setFireballCount(count: number) { this.fireballCount = count }
    public setFireballSpeedMultiplier(mult: number) { this.fireballSpeedMultiplier = mult }
    public setFireballSizeMultiplier(mult: number) { this.fireballSizeMultiplier = mult }
    public setAttackCooldownReduction(reduce: number) { this.skill_cooldownReduction = reduce }
    public setMagnetBonus(value: number) { this.magnetBonus = value }
    public setRebirthKillRequired(required: number) { this.rebirthKillRequired = required }

    // ========== Add 方法 ==========

    public addAttackMultiplier(value: number) { this.attackMultiplierBonus *= value }
    public addCooldownReduction(value: number) { this.skill_cooldownReduction += value }
    public addPermanentAttack(bonus: number) { this.permanentAttackBonus += bonus }
    public addPermanentCooldown(bonus: number) { this.permanentCooldownBonus += bonus }
    public addPermanentSpeed(bonusPercent: number) { this.permanentSpeedBonus += bonusPercent }
    public addFireballSpeedMultiplier(mult: number) { this.fireballSpeedMultiplier *= mult }
    public addFireballDamageBonus(bonus: number) { this.fireballDamageBonus += bonus }
    public addVampirePercent(value: number) { this.vampirePercent += value }
    public addCritChance(value: number) { this.critChance = Math.min(PlayerConfig.MAX_CRIT_CHANCE, this.critChance + value) }
    public addCritDamage(value: number) { this.critDamage += value }
    public addArmorPen(value: number) { this.armorPen = Math.min(1.0, this.armorPen + value) }
    public addThornDamage(value: number) { this.thornDamage += value }
    public addMagnetBonus(value: number) { this.magnetBonus += value }
    public addLuckyBonus(value: number) { this.luckyBonus += value }

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