// assets/scripts/managers/SkillManager.ts

import { resources, JsonAsset } from 'cc'
import { ServiceLocator } from '../core/ServiceLocator'
import { IPlayer } from '../interfaces/IPlayer'
import { EventBus } from '../core/EventBus'
import { EventNames } from '../utils/EventNames'
import { AffixWeightConfig } from '../configs/GameConfig'
import { DEFAULT_SKILL_DEFS, DEFAULT_SKILL_STATS, getSkillDef, getSkillStat, getSkillMaxLevel } from '../configs/SkillConfig'

// ========== 类型定义 ==========

export interface SkillDef {
    name: string
    description: string
    rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
    tags: string[]
    maxLevel: number
    icon: string
}

export interface SkillStat {
    [level: string]: Record<string, any>
}

export interface UpgradeNode {
    nodeId: string
    levelReq: number
    trigger: string
    condition: Record<string, any>
    effect: Record<string, any>
}

export interface FusionRule {
    name: string
    description: string
    requires: { skillId: string, minLevel: number }[]
    consumes: boolean
    replace?: string[]
    effect: Record<string, any>
}

export interface ElementTag {
    element: string
    phase: string
}

export interface PlayerSkillData {
    skillId: string
    currentLevel: number
    unlockedUpgrades: string[]
}

// ========== SkillManager 类 ==========

export class SkillManager {
    private static instance: SkillManager

    private skillDefs: Map<string, SkillDef> = new Map()
    private skillStats: Map<string, SkillStat> = new Map()
    private skillUpgrades: Map<string, UpgradeNode[]> = new Map()
    private fusionRules: Map<string, FusionRule> = new Map()
    private elementTags: Map<string, ElementTag> = new Map()

    private playerSkills: Map<string, PlayerSkillData> = new Map()
    private player: IPlayer | null = null

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

    public init(player: IPlayer) {
        this.player = player
        console.log('[SkillManager] 初始化完成')
    }

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

    // ========== 默认配置 ==========

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

    public getAllSkillIds(): string[] {
        return Array.from(this.skillDefs.keys())
    }

    public getSkillDef(skillId: string): SkillDef | null {
        if (this.skillDefs.has(skillId)) {
            return this.skillDefs.get(skillId) || null
        }
        return getSkillDef(skillId) || null
    }

    public getSkillStat(skillId: string, level: number): Record<string, any> | null {
        const stat = this.skillStats.get(skillId)
        if (stat && stat[String(level)]) {
            return stat[String(level)]
        }
        return getSkillStat(skillId, level) || null
    }

    public getSkillUpgrades(skillId: string): UpgradeNode[] {
        return this.skillUpgrades.get(skillId) || []
    }

    public getUpgradesAtLevel(skillId: string, level: number): UpgradeNode[] {
        const upgrades = this.skillUpgrades.get(skillId) || []
        return upgrades.filter(u => u.levelReq === level)
    }

    public getFusionRule(fusionId: string): FusionRule | null {
        return this.fusionRules.get(fusionId) || null
    }

    public getAllFusionRules(): Map<string, FusionRule> {
        return this.fusionRules
    }

    public getElementTag(skillId: string): ElementTag | null {
        return this.elementTags.get(skillId) || null
    }

    // ========== 玩家技能管理 ==========

    public getPlayerSkills(): PlayerSkillData[] {
        return Array.from(this.playerSkills.values())
    }

    public getPlayerSkill(skillId: string): PlayerSkillData | null {
        return this.playerSkills.get(skillId) || null
    }

    public hasSkill(skillId: string): boolean {
        return this.playerSkills.has(skillId)
    }

    public getSkillLevel(skillId: string): number {
        return this.playerSkills.get(skillId)?.currentLevel || 0
    }

    public getSkillMaxLevel(skillId: string): number {
        const def = this.skillDefs.get(skillId)
        if (def) return def.maxLevel
        return getSkillMaxLevel(skillId)
    }

    public canUpgradeSkill(skillId: string): boolean {
        const currentLevel = this.getSkillLevel(skillId)
        const maxLevel = this.getSkillMaxLevel(skillId)
        return currentLevel < maxLevel
    }

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

        this.applySkillStats(skillId, newLevel)
        this.unlockUpgrades(skillId, newLevel)

        EventBus.emit(EventNames.SKILL_SELECTED, { skillId, level: newLevel })

        console.log(`[SkillManager] 学习技能: ${def.name} Lv.${newLevel}`)
        return true
    }

    private applySkillStats(skillId: string, level: number) {
        if (!this.player) return

        const stats = this.getSkillStat(skillId, level)
        if (!stats) return

        for (const [statName, statValue] of Object.entries(stats)) {
            this.applyStatToPlayer(statName, statValue)
        }
    }

    /**
     * 将数值应用到玩家（直接使用 IPlayer 接口，无需 as any）
     */
    private applyStatToPlayer(statName: string, value: any) {
        if (!this.player) return

        switch (statName) {
            case 'healthBonus':
                const newMaxHp = this.player.getMaxHealth() + value
                this.player.setMaxHealth?.(newMaxHp)
                break
            case 'attackMultiplier':
                this.player.addAttackMultiplier?.(value)
                break
            case 'speedMultiplier':
                this.player.addSpeedMultiplier?.(value)
                break
            case 'expBonus':
                this.player.addExpBonus?.(value)
                break
            case 'cooldownReduction':
                this.player.addCooldownReduction?.(value)
                break
            case 'magnetBonus':
                this.player.addMagnetBonus?.(value)
                break
            case 'vampirePercent':
                this.player.addVampirePercent?.(value)
                break
            case 'damageReduction':
                this.player.addDamageReduction?.(value)
                break
            case 'critChance':
                this.player.addCritChance?.(value)
                break
            case 'critDamage':
                this.player.addCritDamage?.(value)
                break
            case 'armorPen':
                this.player.addArmorPen?.(value)
                break
            case 'thornDamage':
                this.player.addThornDamage?.(value)
                break
            case 'fireballCount':
                this.player.setFireballCount?.(value)
                break
            case 'pierceCount':
                this.player.setPierceCount?.((this.player.getPierceCount?.() || 0) + value)
                break
            case 'fireballSpeedMultiplier':
                this.player.addFireballSpeedMultiplier?.(value)
                break
            case 'sizeMultiplier':
                this.player.setFireballSizeMultiplier?.(value)
                break
            case 'damageBonus':
                this.player.addFireballDamageBonus?.(value)
                break
            case 'attackBonus':
                this.player.addPermanentAttack?.(value)
                break
            case 'speedBonusPercent':
                this.player.addPermanentSpeed?.(value)
                break
            case 'cooldownBonus':
                this.player.addPermanentCooldown?.(value)
                break
            case 'expBonusPercent':
                this.player.addPermanentExp?.(value)
                break
            case 'healAmount':
                // 杀怪回血在 KillSystem 中处理
                break
            case 'shieldAmount':
                this.player.addKillShield?.(value)
                break
            case 'rageDuration':
            case 'rageDamageBonus':
                this.player.addRageStats?.({ [statName]: value })
                break
            case 'dropBonusPercent':
                this.player.addLuckyBonus?.(value)
                break
            case 'killRequired':
                this.player.setRebirthKillRequired?.(value)
                break
            default:
                console.log(`[SkillManager] 未处理的数值: ${statName} = ${value}`)
        }
    }

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

    private registerUpgradeTrigger(skillId: string, upgrade: UpgradeNode) {
        const triggerSystem = ServiceLocator.getInstance().get<any>('triggerSystem')
        if (triggerSystem && triggerSystem.registerTrigger) {
            triggerSystem.registerTrigger(
                upgrade.trigger,
                upgrade.nodeId,
                upgrade.condition,
                upgrade.effect?.type || 'modifyStat',
                upgrade.effect,
                0
            )
        }
    }

    // ========== 技能池 ==========

    public getRandomSkills(count: number, excludeIds: string[] = []): string[] {
        const availableSkills: string[] = []
        const fusionIds = Array.from(this.fusionRules.keys())

        for (const [skillId, def] of this.skillDefs) {
            if (fusionIds.includes(skillId)) continue
            if (excludeIds.includes(skillId)) continue

            const currentLevel = this.getSkillLevel(skillId)
            if (currentLevel < def.maxLevel) {
                availableSkills.push(skillId)
            }
        }

        if (availableSkills.length === 0) return []

        const getWeight = (rarity: string): number => {
            switch (rarity) {
                case 'common': return AffixWeightConfig.COMMON
                case 'rare': return AffixWeightConfig.RARE
                case 'epic': return AffixWeightConfig.EPIC
                case 'legendary': return AffixWeightConfig.LEGENDARY
                case 'mythic': return 0
                default: return 5
            }
        }

        const weighted: string[] = []
        for (const skillId of availableSkills) {
            const def = this.skillDefs.get(skillId)!
            const weight = getWeight(def.rarity)
            for (let i = 0; i < weight; i++) {
                weighted.push(skillId)
            }
        }

        for (let i = weighted.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[weighted[i], weighted[j]] = [weighted[j], weighted[i]]
        }

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

    public getAvailableFusions(): { fusionId: string, rule: FusionRule }[] {
        const result: { fusionId: string, rule: FusionRule }[] = []

        for (const [fusionId, rule] of this.fusionRules) {
            if (this.playerSkills.has(fusionId)) {
                continue
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

    public fuseSkill(fusionId: string): boolean {
        const rule = this.fusionRules.get(fusionId)
        if (!rule) return false

        for (const req of rule.requires) {
            const skillData = this.playerSkills.get(req.skillId)
            if (!skillData || skillData.currentLevel < req.minLevel) {
                console.warn(`[SkillManager] 合成条件不足: 需要 ${req.skillId} Lv.${req.minLevel}`)
                return false
            }
        }

        if (rule.consumes && rule.replace) {
            for (const replaceId of rule.replace) {
                this.playerSkills.delete(replaceId)
            }
        }

        return this.learnSkill(fusionId)
    }

    // ========== 工具方法 ==========

    public isReady(): boolean {
        return this.isLoaded
    }

    public getPlayer(): IPlayer | null {
        return this.player
    }

    public reset() {
        this.playerSkills.clear()
        console.log('[SkillManager] 技能数据已重置')
    }
}