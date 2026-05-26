// assets/scripts/interfaces/IPlayer.ts

/**
 * 玩家服务接口
 * 定义 UI 和其他模块需要访问的玩家能力
 * 放置在主包中，供各分包通过 ServiceLocator 调用
 */
export interface IPlayer {
    // ========== 血量相关 ==========
    getCurrentHealth(): number
    getMaxHealth(): number
    takeDamage?(damage: number): boolean  // 添加受伤方法
    heal?(amount: number): void           // 治疗
    revive?(hpPercent: number): void      // 复活
    
    // ========== 经验/等级相关 ==========
    getExp(): number
    getExpToNextLevel(): number
    getLevel(): number
    getExpMultiplier(): number
    
    // ========== 战斗相关 ==========
    getAttack(): number
    getAttackCooldownReduction(): number
    getSpeed(): number                    // 添加速度获取
    
    // ========== 火球技能相关 ==========
    /** @deprecated 请使用 getFireballCount() >= 2 */
    getHasDoubleFireball(): boolean
    getHasPierceFireball(): boolean
    getFireballSpeedMultiplier(): number
    getPierceCount(): number
    getFireballCount(): number            // 获取火球数量
    getFireballSizeMultiplier(): number
    getFireballDamageBonus(): number
    
    // ========== 其他属性 ==========
    getMagnetRangeMultiplier(): number
    getVampirePercent(): number
    
    // ========== 属性修改方法（技能系统使用）==========
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
    
    // 火球相关
    setDoubleFireball(active: boolean): void
    setPierceFireball(active: boolean): void
    setPierceCount(value: number): void
    setFireballCount(value: number): void
    setFireballSizeMultiplier(value: number): void
    setFireballSpeedMultiplier(mult: number): void
    addFireballSpeedMultiplier(mult: number): void
    addFireballDamageBonus(bonus: number): void
    
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