import { resources, JsonAsset } from 'cc'
import { PlayerController } from '../entities/player/PlayerController'
import { EventBus } from '../core/EventBus'
import { EventNames } from '../utils/EventNames'
import { GameConstants } from '../utils/GameConstants'
import { DEFAULT_SKILL_DEFS, DEFAULT_SKILL_STATS, getSkillDef, getSkillStat, getSkillMaxLevel } from '../configs/SkillConfig'

// ========== 类型定义 ==========

/**
 * 技能定义（skill_def.json）
 */
export interface SkillDef {
    name: string
    description: string
    rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
    tags: string[]
    maxLevel: number
    icon: string
}

/**
 * 技能数值（skill_stat.json）
 * 格式：{ "1": { "healthBonus": 20 }, "2": { "healthBonus": 40 } }
 */
export interface SkillStat {
    [level: string]: Record<string, any>
}

/**
 * 升级节点（skill_upgrade.json）
 */
export interface UpgradeNode {
    nodeId: string          // 节点唯一ID
    levelReq: number        // 所需等级
    trigger: string         // 触发条件（onKill, onDamage, onHeal 等）
    condition: Record<string, any>  // 额外条件
    effect: Record<string, any>     // 效果描述
}

/**
 * 合成规则（fusion_rule.json）
 */
export interface FusionRule {
    name: string
    description: string
    requires: { skillId: string, minLevel: number }[]
    consumes: boolean       // 是否消耗前置技能
    replace?: string[]      // 替换哪些技能
    effect: Record<string, any>
}

/**
 * 五行归属（element_tag.json）
 */
export interface ElementTag {
    element: string
    phase: string
}

/**
 * 玩家已学技能数据
 */
export interface PlayerSkillData {
    skillId: string
    currentLevel: number
    unlockedUpgrades: string[]  // 已解锁的升级节点ID
}

// ========== SkillManager 类 ==========

export class SkillManager {
    private static instance: SkillManager

    // 配置数据
    private skillDefs: Map<string, SkillDef> = new Map()
    private skillStats: Map<string, SkillStat> = new Map()
    private skillUpgrades: Map<string, UpgradeNode[]> = new Map()
    private fusionRules: Map<string, FusionRule> = new Map()
    private elementTags: Map<string, ElementTag> = new Map()

    // 玩家数据
    private playerSkills: Map<string, PlayerSkillData> = new Map()
    private player: PlayerController | null = null

    // 加载状态
    private isLoaded: boolean = false
    private loadCallbacks: (() => void)[] = []

    private constructor() { }

    static getInstance(): SkillManager {
        if (!SkillManager.instance) {
            SkillManager.instance = new SkillManager()
        }
        return SkillManager.instance
    }

    // ========== 初始化 ==========

    /**
     * 初始化技能管理器（绑定玩家）
     */
    public init(player: PlayerController) {
        this.player = player
        console.log('[SkillManager] 初始化完成')
    }

    /**
     * 加载所有技能配置
     */
    public loadAll(callback?: () => void) {
        if (this.isLoaded) {
            callback?.()
            return
        }

        let remaining = 5
        const onLoadComplete = () => {
            remaining--
            if (remaining === 0) {
                this.isLoaded = true
                console.log('[SkillManager] 所有技能配置加载完成')
                console.log(`  - 技能定义: ${this.skillDefs.size} 个`)
                console.log(`  - 技能数值: ${this.skillStats.size} 个`)
                console.log(`  - 升级节点: ${this.skillUpgrades.size} 个`)
                console.log(`  - 合成规则: ${this.fusionRules.size} 个`)
                console.log(`  - 五行归属: ${this.elementTags.size} 个`)
                callback?.()
                for (const cb of this.loadCallbacks) {
                    cb()
                }
                this.loadCallbacks = []
            }
        }

        this.loadSkillDefs(onLoadComplete)
        this.loadSkillStats(onLoadComplete)
        this.loadSkillUpgrades(onLoadComplete)
        this.loadFusionRules(onLoadComplete)
        this.loadElementTags(onLoadComplete)
    }

    private loadSkillDefs(callback: () => void) {
        resources.load('config/skills/skill_def', JsonAsset, (err, asset) => {
            if (err) {
                console.error('[SkillManager] 加载 skill_def 失败', err)
                this.loadDefaultSkillDefs()
            } else {
                const data = asset.json as Record<string, SkillDef>
                for (const [id, def] of Object.entries(data)) {
                    this.skillDefs.set(id, def)
                }
            }
            callback()
        })
    }

    private loadSkillStats(callback: () => void) {
        resources.load('config/skills/skill_stat', JsonAsset, (err, asset) => {
            if (err) {
                console.error('[SkillManager] 加载 skill_stat 失败', err)
                this.loadDefaultSkillStats()
            } else {
                const data = asset.json as Record<string, SkillStat>
                for (const [id, stat] of Object.entries(data)) {
                    this.skillStats.set(id, stat)
                }
            }
            callback()
        })
    }

    private loadSkillUpgrades(callback: () => void) {
        resources.load('config/skills/skill_upgrade', JsonAsset, (err, asset) => {
            if (err) {
                console.error('[SkillManager] 加载 skill_upgrade 失败', err)
            } else {
                const data = asset.json as Record<string, UpgradeNode[]>
                for (const [id, upgrades] of Object.entries(data)) {
                    this.skillUpgrades.set(id, upgrades)
                }
            }
            callback()
        })
    }

    private loadFusionRules(callback: () => void) {
        resources.load('config/skills/fusion_rule', JsonAsset, (err, asset) => {
            if (err) {
                console.error('[SkillManager] 加载 fusion_rule 失败', err)
            } else {
                const data = asset.json as Record<string, FusionRule>
                for (const [id, rule] of Object.entries(data)) {
                    this.fusionRules.set(id, rule)
                }
            }
            callback()
        })
    }

    private loadElementTags(callback: () => void) {
        resources.load('config/skills/element_tag', JsonAsset, (err, asset) => {
            if (err) {
                console.error('[SkillManager] 加载 element_tag 失败', err)
            } else {
                const data = asset.json as Record<string, ElementTag>
                for (const [id, tag] of Object.entries(data)) {
                    this.elementTags.set(id, tag)
                }
            }
            callback()
        })
    }

    // ========== 默认配置（加载失败时使用 TypeScript 配置） ==========

    private loadDefaultSkillDefs() {
        for (const [id, def] of Object.entries(DEFAULT_SKILL_DEFS)) {
            this.skillDefs.set(id, def)
        }
        console.log('[SkillManager] 使用 TypeScript 默认技能定义，共', this.skillDefs.size, '个')
    }

    private loadDefaultSkillStats() {
        for (const [id, stat] of Object.entries(DEFAULT_SKILL_STATS)) {
            this.skillStats.set(id, stat)
        }
        console.log('[SkillManager] 使用 TypeScript 默认技能数值')
    }

    // ========== 技能查询接口 ==========

    /**
     * 获取所有技能ID列表
     */
    public getAllSkillIds(): string[] {
        return Array.from(this.skillDefs.keys())
    }

    /**
     * 获取技能定义
     */
    public getSkillDef(skillId: string): SkillDef | null {
        if (this.skillDefs.has(skillId)) {
            return this.skillDefs.get(skillId) || null
        }
        return getSkillDef(skillId) || null
    }

    /**
     * 获取技能数值（指定等级）
     */
    public getSkillStat(skillId: string, level: number): Record<string, any> | null {
        const stat = this.skillStats.get(skillId)
        if (stat && stat[String(level)]) {
            return stat[String(level)]
        }
        return getSkillStat(skillId, level) || null
    }

    /**
     * 获取技能的升级节点树
     */
    public getSkillUpgrades(skillId: string): UpgradeNode[] {
        return this.skillUpgrades.get(skillId) || []
    }

    /**
     * 获取技能在指定等级解锁的升级节点
     */
    public getUpgradesAtLevel(skillId: string, level: number): UpgradeNode[] {
        const upgrades = this.skillUpgrades.get(skillId) || []
        return upgrades.filter(u => u.levelReq === level)
    }

    /**
     * 获取合成规则
     */
    public getFusionRule(fusionId: string): FusionRule | null {
        return this.fusionRules.get(fusionId) || null
    }

    /**
     * 获取所有合成规则
     */
    public getAllFusionRules(): Map<string, FusionRule> {
        return this.fusionRules
    }

    /**
     * 获取五行归属
     */
    public getElementTag(skillId: string): ElementTag | null {
        return this.elementTags.get(skillId) || null
    }

    // ========== 玩家技能管理 ==========

    /**
     * 获取玩家已学技能列表
     */
    public getPlayerSkills(): PlayerSkillData[] {
        return Array.from(this.playerSkills.values())
    }

    /**
     * 获取玩家已学技能数据
     */
    public getPlayerSkill(skillId: string): PlayerSkillData | null {
        return this.playerSkills.get(skillId) || null
    }

    /**
     * 检查玩家是否拥有某个技能
     */
    public hasSkill(skillId: string): boolean {
        return this.playerSkills.has(skillId)
    }

    /**
     * 获取技能当前等级
     */
    public getSkillLevel(skillId: string): number {
        return this.playerSkills.get(skillId)?.currentLevel || 0
    }

    /**
     * 获取技能最大等级
     */
    public getSkillMaxLevel(skillId: string): number {
        const def = this.skillDefs.get(skillId)
        if (def) return def.maxLevel
        return getSkillMaxLevel(skillId)
    }

    /**
     * 检查技能是否可以升级
     */
    public canUpgradeSkill(skillId: string): boolean {
        const currentLevel = this.getSkillLevel(skillId)
        const maxLevel = this.getSkillMaxLevel(skillId)
        return currentLevel < maxLevel
    }

    /**
     * 学习或升级技能
     * @returns 是否成功
     */
    public learnSkill(skillId: string): boolean {
        const def = this.getSkillDef(skillId)
        if (!def) {
            console.warn(`[SkillManager] 技能不存在: ${skillId}`)
            return false
        }

        let skillData = this.playerSkills.get(skillId)
        let newLevel = 1

        if (skillData) {
            if (skillData.currentLevel >= def.maxLevel) {
                console.warn(`[SkillManager] 技能已达最大等级: ${skillId}`)
                return false
            }
            newLevel = skillData.currentLevel + 1
            skillData.currentLevel = newLevel
        } else {
            skillData = {
                skillId: skillId,
                currentLevel: 1,
                unlockedUpgrades: []
            }
            this.playerSkills.set(skillId, skillData)
        }

        // 应用技能数值
        this.applySkillStats(skillId, newLevel)

        // 解锁升级节点
        this.unlockUpgrades(skillId, newLevel)

        // 触发技能选择事件
        EventBus.emit(EventNames.SKILL_SELECTED, { skillId, level: newLevel })

        console.log(`[SkillManager] 学习技能: ${def.name} Lv.${newLevel}`)
        return true
    }

    /**
     * 应用技能数值（调用 PlayerController）
     */
    private applySkillStats(skillId: string, level: number) {
        if (!this.player) return

        const stats = this.getSkillStat(skillId, level)
        if (!stats) return

        for (const [statName, statValue] of Object.entries(stats)) {
            this.applyStatToPlayer(statName, statValue)
        }
    }

    /**
     * 将数值应用到玩家
     */
    private applyStatToPlayer(statName: string, value: any) {
        if (!this.player) return

        switch (statName) {
            case 'healthBonus':
                const newMaxHp = this.player.getMaxHealth() + value
                this.player.setMaxHealth(newMaxHp)
                break
            case 'attackMultiplier':
                this.player.addAttackMultiplier(value)
                break
            case 'speedMultiplier':
                this.player.addSpeedMultiplier(value)
                break
            case 'expBonus':
                this.player.addExpBonus(value)
                break
            case 'cooldownReduction':
                this.player.addCooldownReduction(value)
                break
            case 'magnetBonus':
                this.player.addMagnetBonus(value)
                break
            case 'vampirePercent':
                this.player.addVampirePercent(value)
                break
            case 'damageReduction':
                this.player.addDamageReduction(value)
                break
            case 'critChance':
                this.player.addCritChance(value)
                break
            case 'critDamage':
                this.player.addCritDamage(value)
                break
            case 'armorPen':
                this.player.addArmorPen(value)
                break
            case 'thornDamage':
                this.player.addThornDamage(value)
                break
            // 武器技能
            case 'fireballCount':
                this.player.setFireballCount(value)
                break
            case 'pierceCount':
                this.player.setPierceCount((this.player.getPierceCount() || 0) + value)
                break
            case 'fireballSpeedMultiplier':
                this.player.addFireballSpeedMultiplier(value)
                break
            case 'sizeMultiplier':
                this.player.setFireballSizeMultiplier(value)
                break
            case 'damageBonus':
                this.player.addFireballDamageBonus(value)
                break
            // 杀怪奖励
            case 'attackBonus':
                this.player.addPermanentAttack(value)
                break
            case 'healthBonus':
                this.player.addPermanentHealth(value)
                break
            case 'speedBonusPercent':
                this.player.addPermanentSpeed(value)
                break
            case 'cooldownBonus':
                this.player.addPermanentCooldown(value)
                break
            case 'expBonusPercent':
                this.player.addPermanentExp(value)
                break
            case 'healAmount':
                // 杀怪回血在 KillSystem 中处理
                break
            case 'shieldAmount':
                this.player.addKillShield(value)
                break
            case 'rageDuration':
            case 'rageDamageBonus':
                this.player.addRageStats(value)
                break
            case 'dropBonusPercent':
                this.player.addLuckyBonus(value)
                break
            case 'killRequired':
                this.player.setRebirthKillRequired(value)
                break
            default:
                console.log(`[SkillManager] 未处理的数值: ${statName} = ${value}`)
        }
    }

    /**
     * 解锁升级节点
     */
    private unlockUpgrades(skillId: string, level: number) {
        const upgrades = this.getUpgradesAtLevel(skillId, level)
        const skillData = this.playerSkills.get(skillId)
        if (!skillData) return

        for (const upgrade of upgrades) {
            if (!skillData.unlockedUpgrades.includes(upgrade.nodeId)) {
                skillData.unlockedUpgrades.push(upgrade.nodeId)
                this.registerUpgradeTrigger(skillId, upgrade)
                console.log(`[SkillManager] 解锁升级节点: ${upgrade.nodeId}`)
            }
        }
    }

    /**
     * 注册升级节点触发器
     */
    private registerUpgradeTrigger(skillId: string, upgrade: UpgradeNode) {
        if (!this.player) return

        const triggerSystem = (window as any).TriggerSystem
        if (triggerSystem && triggerSystem.getInstance) {
            const ts = triggerSystem.getInstance()
            ts.registerTrigger(
                upgrade.trigger,
                upgrade.nodeId,
                upgrade.condition,
                upgrade.effect?.type || 'modifyStat',
                upgrade.effect,
                0
            )
        }
    }

    // ========== 技能池（用于升级选择） ==========

    /**
    * 获取随机技能列表（用于升级面板）
    * 不包含合成技能
    */
    public getRandomSkills(count: number, excludeIds: string[] = []): string[] {
        const availableSkills: string[] = []
        const fusionIds = Array.from(this.fusionRules.keys())

        for (const [skillId, def] of this.skillDefs) {
            // 排除合成技能
            if (fusionIds.includes(skillId)) continue
            // 排除已禁用的技能
            if (excludeIds.includes(skillId)) continue

            const currentLevel = this.getSkillLevel(skillId)
            if (currentLevel < def.maxLevel) {
                availableSkills.push(skillId)
            }
        }

        if (availableSkills.length === 0) return []

        // 根据稀有度计算权重
        const getWeight = (rarity: string): number => {
            switch (rarity) {
                case 'common': return GameConstants.AFFIX_WEIGHT_COMMON
                case 'rare': return GameConstants.AFFIX_WEIGHT_RARE
                case 'epic': return GameConstants.AFFIX_WEIGHT_EPIC
                case 'legendary': return GameConstants.AFFIX_WEIGHT_LEGENDARY
                case 'mythic': return 0
                default: return 5
            }
        }

        // 构建权重数组
        const weighted: string[] = []
        for (const skillId of availableSkills) {
            const def = this.skillDefs.get(skillId)!
            const weight = getWeight(def.rarity)
            for (let i = 0; i < weight; i++) {
                weighted.push(skillId)
            }
        }

        // 随机打乱
        for (let i = weighted.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
                ;[weighted[i], weighted[j]] = [weighted[j], weighted[i]]
        }

        // 去重取前 count 个
        const result: string[] = []
        const seen = new Set<string>()
        for (const skillId of weighted) {
            if (result.length >= count) break
            if (!seen.has(skillId)) {
                seen.add(skillId)
                result.push(skillId)
            }
        }

        return result
    }

    /**
 * 检查是否有可用的合成技能
 * @returns 可合成的技能ID列表（未学习且条件满足）
 */
    public getAvailableFusions(): { fusionId: string, rule: FusionRule }[] {
        const result: { fusionId: string, rule: FusionRule }[] = []

        for (const [fusionId, rule] of this.fusionRules) {
            // 检查是否已学习
            if (this.playerSkills.has(fusionId)) {
                continue  // 已学习，不再显示
            }

            let canFusion = true
            for (const req of rule.requires) {
                const skillData = this.playerSkills.get(req.skillId)
                if (!skillData || skillData.currentLevel < req.minLevel) {
                    canFusion = false
                    break
                }
            }
            if (canFusion) {
                result.push({ fusionId, rule })
            }
        }

        return result
    }

    /**
     * 合成技能
     */
    public fuseSkill(fusionId: string): boolean {
        const rule = this.fusionRules.get(fusionId)
        if (!rule) return false

        // 检查条件
        for (const req of rule.requires) {
            const skillData = this.playerSkills.get(req.skillId)
            if (!skillData || skillData.currentLevel < req.minLevel) {
                console.warn(`[SkillManager] 合成条件不足: 需要 ${req.skillId} Lv.${req.minLevel}`)
                return false
            }
        }

        // 消耗前置技能
        if (rule.consumes && rule.replace) {
            for (const replaceId of rule.replace) {
                this.playerSkills.delete(replaceId)
            }
        }

        // 学习合成技能
        return this.learnSkill(fusionId)
    }

    // ========== 工具方法 ==========

    public isReady(): boolean {
        return this.isLoaded
    }

    public getPlayer(): PlayerController | null {
        return this.player
    }

    /**
     * 重置所有技能（新游戏时调用）
     */
    public reset() {
        this.playerSkills.clear()
        console.log('[SkillManager] 技能数据已重置')
    }
}

