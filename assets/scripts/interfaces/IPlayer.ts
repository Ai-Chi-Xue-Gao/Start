// assets/scripts/interfaces/IPlayer.ts

import { Node } from 'cc';
import { PlayerHealth } from '../gameplay/player/PlayerHealth';

export interface IPlayer {
    // ========== 血量相关 ==========
    getCurrentHealth(): number
    getMaxHealth(): number
    takeDamage?(damage: number): boolean
    heal?(amount: number): void
    revive?(hpPercent: number): void
    
    // ========== 经验/等级相关 ==========
    getExp(): number
    getExpToNextLevel(): number
    getLevel(): number
    getExpMultiplier(): number
    
    // ========== 战斗相关 ==========
    getAttack(): number
    getAttackCooldownReduction(): number
    getSpeed(): number
    
    // ========== 其他属性 ==========
    getMagnetRangeMultiplier(): number
    getVampirePercent(): number
    
    // ========== 组件访问 ==========
    /** 获取血量组件 */
    getHealth(): PlayerHealth
    
    /** 获取玩家节点 */
    getNode(): Node
    
    /** 获取护盾值 */
    getShield(): number
    
    /** 添加临时攻击加成 */
    addTemporaryAttackBonus(bonus: number, duration: number): void
    
    /** 攻击命中回调（用于吸血等效果） */
    onAttackHit(damage: number, target?: any): void
    
    // ========== 属性修改方法 ==========
    // 攻击相关
    addAttackMultiplier(value: number): void
    addPermanentAttack(bonus: number): void
    setAttackCooldownReduction(reduce: number): void
    addCooldownReduction(value: number): void
    addPermanentCooldown(bonus: number): void
    
    // 移动相关
    addSpeedMultiplier(value: number): void
    addPermanentSpeed(bonusPercent: number): void
    setSpeed?(value: number): void
    
    // 血量相关
    addDamageReduction(value: number): void
    addPermanentHealth(bonus: number): void
    setMaxHealth(value: number): void
    addKillShield(amount: number): void
    
    // 经验相关
    addExpBonus(value: number): void
    addPermanentExp(bonusPercent: number): void
    setExpMultiplier(value: number): void
    
    // 磁力相关
    addMagnetBonus(value: number): void
    setMagnetRangeMultiplier(mult: number): void
    
    // 吸血相关
    addVampirePercent(value: number): void
    
    // 暴击相关
    addCritChance(value: number): void
    addCritDamage(value: number): void
    
    // 穿透相关
    addArmorPen(value: number): void
    
    // 荆棘相关
    addThornDamage(value: number): void
    
    // 幸运相关
    addLuckyBonus(bonusPercent: number): void
    
    // 暴怒相关
    addRageStats(params: { rageDuration?: number; rageDamageBonus?: number }): void
    
    // 重生相关
    setRebirthKillRequired(required: number): void
}