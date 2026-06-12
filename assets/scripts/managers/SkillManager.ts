// assets/scripts/managers/SkillManager.ts

import { resources, JsonAsset } from 'cc'
import { ServiceLocator } from '../core/ServiceLocator'
import { IPlayer } from '../interfaces/IPlayer'
import { EventBus } from '../core/EventBus'
import { EventNames } from '../utils/EventNames'
import { AffixWeightConfig } from '../configs/GameConfig'

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
    description?: string
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
    isRing?: boolean
}

export interface PlayerSkillData {
    skillId: string
    currentLevel: number
    unlockedUpgrades: string[]
}

// ========== 常量定义 ==========

const CONFIG_PATHS = {
    SKILL_DEF: 'config/skills/skill_def',
    SKILL_STAT: 'config/skills/skill_stat',
    SKILL_UPGRADE: 'config/skills/skill_upgrade',
    ELEMENT_TAG: 'config/skills/element_tag'
} as const

const SKILL_RELATED_STATS: readonly string[] = [
    'damagePercent', 'cooldown', 'areaRadius', 'duration',
    'projectileCount', 'pierce', 'stunDuration', 'freezeDuration',
    'rootDuration', 'slowPercent', 'burnPercent', 'poisonPercent',
    'blindDuration', 'knockback', 'knockbackForce', 'reflectPercent',
    'damageReduction', 'shieldAmount', 'regenPercent', 'critBonus',
    'critDamageBonus', 'attackSpeedBonus', 'defenseBonus', 'invincible',
    'projectileSpeed', 'health', 'damage', 'taunt', 'delay',
    'pullRadius', 'chainCount', 'pillarCount', 'slowDuration'
]

const RARITY_WEIGHTS: Record<string, number> = {
    'common': AffixWeightConfig.COMMON,
    'rare': AffixWeightConfig.RARE,
    'epic': AffixWeightConfig.EPIC,
    'legendary': AffixWeightConfig.LEGENDARY,
    'mythic': 0
}

const DEFAULT_RARITY_WEIGHT = 5

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

    public init(player: IPlayer): void {
        this.player = player
    }

    public loadAll(callback?: () => void): void {
        if (this.isLoaded) {
            callback?.()
            return
        }

        let remaining = 4  // skill_def, skill_stat, skill_upgrade, element_tag
        const onLoadComplete = () => {
            remaining--
            if (remaining === 0) {
                this.isLoaded = true
                callback?.()
                this.loadCallbacks.forEach(cb => cb())
                this.loadCallbacks = []
            }
        }

        this.loadSkillDefs(onLoadComplete)
        this.loadSkillStats(onLoadComplete)
        this.loadSkillUpgrades(onLoadComplete)
        this.loadElementTags(onLoadComplete)
    }

    public isReady(): boolean {
        return this.isLoaded
    }

    // ========== 配置加载 ==========

    private loadSkillDefs(callback: () => void): void {
        resources.load(CONFIG_PATHS.SKILL_DEF, JsonAsset, (err, asset) => {
            if (err) {
                console.error('[SkillManager] 加载 skill_def 失败', err)
            } else if (asset?.json) {
                this.parseSkillDefs(asset.json)
            }
            callback()
        })
    }

    private loadSkillStats(callback: () => void): void {
        resources.load(CONFIG_PATHS.SKILL_STAT, JsonAsset, (err, asset) => {
            if (err) {
                console.error('[SkillManager] 加载 skill_stat 失败', err)
            } else if (asset?.json) {
                this.parseSkillStats(asset.json)
            }
            callback()
        })
    }

    private loadSkillUpgrades(callback: () => void): void {
        resources.load(CONFIG_PATHS.SKILL_UPGRADE, JsonAsset, (err, asset) => {
            if (err) {
                console.error('[SkillManager] 加载 skill_upgrade 失败', err)
            } else if (asset?.json) {
                this.parseSkillUpgrades(asset.json)
            }
            callback()
        })
    }

    private loadElementTags(callback: () => void): void {
        resources.load(CONFIG_PATHS.ELEMENT_TAG, JsonAsset, (err, asset) => {
            if (err) {
                console.error('[SkillManager] 加载 element_tag 失败', err)
            } else if (asset?.json) {
                this.parseElementTags(asset.json)
            }
            callback()
        })
    }

    // ========== 配置解析 ==========

    private parseSkillDefs(data: any): void {
        for (const [id, def] of Object.entries(data)) {
            if (this.isCommentKey(id)) continue
            this.skillDefs.set(id, def as SkillDef)
        }
    }

    private parseSkillStats(data: any): void {
        for (const [id, stat] of Object.entries(data)) {
            if (this.isCommentKey(id)) continue
            this.skillStats.set(id, stat as SkillStat)
        }
    }

    private parseSkillUpgrades(data: any): void {
        for (const [id, upgrades] of Object.entries(data)) {
            if (this.isCommentKey(id)) continue
            this.skillUpgrades.set(id, upgrades as UpgradeNode[])
        }
    }

    private parseElementTags(data: any): void {
        for (const [id, tag] of Object.entries(data)) {
            if (this.isCommentKey(id)) continue
            this.elementTags.set(id, tag as ElementTag)
        }
    }

    private isCommentKey(key: string): boolean {
        return key.startsWith('==========') || key.startsWith('_comment')
    }

    // ========== 技能查询接口 ==========

    public getAllSkillIds(): string[] {
        return Array.from(this.skillDefs.keys())
    }

    public getSkillDef(skillId: string): SkillDef | null {
        return this.skillDefs.get(skillId) ?? null
    }

    public getSkillStat(skillId: string, level: number): Record<string, any> | null {
        const stat = this.skillStats.get(skillId)
        if (stat && stat[String(level)]) {
            return stat[String(level)]
        }
        return null
    }

    public getSkillUpgrades(skillId: string): UpgradeNode[] {
        return this.skillUpgrades.get(skillId) ?? []
    }

    public getUpgradesAtLevel(skillId: string, level: number): UpgradeNode[] {
        const upgrades = this.skillUpgrades.get(skillId) ?? []
        return upgrades.filter(u => u.levelReq === level)
    }

    public getFusionRule(fusionId: string): FusionRule | null {
        return this.fusionRules.get(fusionId) ?? null
    }

    public getAllFusionRules(): Map<string, FusionRule> {
        return this.fusionRules
    }

    public getElementTag(skillId: string): ElementTag | null {
        return this.elementTags.get(skillId) ?? null
    }

    // ========== 玩家技能管理 ==========

    public getPlayerSkills(): PlayerSkillData[] {
        return Array.from(this.playerSkills.values())
    }

    public getPlayerSkill(skillId: string): PlayerSkillData | null {
        return this.playerSkills.get(skillId) ?? null
    }

    public hasSkill(skillId: string): boolean {
        return this.playerSkills.has(skillId)
    }

    public getSkillLevel(skillId: string): number {
        return this.playerSkills.get(skillId)?.currentLevel ?? 0
    }

    public getSkillMaxLevel(skillId: string): number {
        return this.skillDefs.get(skillId)?.maxLevel ?? 1
    }

    public canUpgradeSkill(skillId: string): boolean {
        const currentLevel = this.getSkillLevel(skillId)
        const maxLevel = this.getSkillMaxLevel(skillId)
        return currentLevel < maxLevel
    }

    // ========== 技能学习 ==========

    public learnSkill(skillId: string): boolean {
        const def = this.getSkillDef(skillId)
        if (!def) {
            console.warn(`[SkillManager] 技能不存在: ${skillId}`)
            return false
        }

        const skillData = this.getOrCreateSkillData(skillId)

        if (skillData.currentLevel >= def.maxLevel) {
            console.warn(`[SkillManager] 技能已达最大等级: ${skillId}`)
            return false
        }

        const newLevel = skillData.currentLevel + 1
        skillData.currentLevel = newLevel

        this.applySkillStats(skillId, newLevel)
        this.unlockUpgrades(skillId, newLevel)

        EventBus.emit(EventNames.SKILL_SELECTED, { skillId, level: newLevel })

        return true
    }

    private getOrCreateSkillData(skillId: string): PlayerSkillData {
        let skillData = this.playerSkills.get(skillId)
        if (!skillData) {
            skillData = {
                skillId: skillId,
                currentLevel: 0,
                unlockedUpgrades: []
            }
            this.playerSkills.set(skillId, skillData)
        }
        return skillData
    }

    // ========== 技能数值应用 ==========

    private applySkillStats(skillId: string, level: number): void {
        if (!this.player) return

        const stats = this.getSkillStat(skillId, level)
        if (!stats) return

        for (const [statName, statValue] of Object.entries(stats)) {
            this.applyStatToPlayer(statName, statValue)
        }
    }

    private applyStatToPlayer(statName: string, value: any): void {
        if (!this.player) return

        if (SKILL_RELATED_STATS.includes(statName)) {
            return
        }

        const statHandlers: Record<string, (val: any) => void> = {
            'healthBonus': (v) => this.applyHealthBonus(v),
            'attackMultiplier': (v) => this.player!.addAttackMultiplier?.(v),
            'speedMultiplier': (v) => this.player!.addSpeedMultiplier?.(v),
            'expBonus': (v) => this.player!.addExpBonus?.(v),
            'cooldownReduction': (v) => this.player!.addCooldownReduction?.(v),
            'magnetBonus': (v) => this.player!.addMagnetBonus?.(v),
            'vampirePercent': (v) => this.player!.addVampirePercent?.(v),
            'damageReduction': (v) => this.player!.addDamageReduction?.(v),
            'critChance': (v) => this.player!.addCritChance?.(v),
            'critDamage': (v) => this.player!.addCritDamage?.(v),
            'armorPen': (v) => this.player!.addArmorPen?.(v),
            'thornDamage': (v) => this.player!.addThornDamage?.(v),
            'attackBonus': (v) => this.player!.addPermanentAttack?.(v),
            'speedBonusPercent': (v) => this.player!.addPermanentSpeed?.(v),
            'cooldownBonus': (v) => this.player!.addPermanentCooldown?.(v),
            'expBonusPercent': (v) => this.player!.addPermanentExp?.(v),
            'shieldAmount': (v) => this.player!.addKillShield?.(v),
            'dropBonusPercent': (v) => this.player!.addLuckyBonus?.(v),
            'killRequired': (v) => this.player!.setRebirthKillRequired?.(v),
            'rageDuration': (v) => this.player!.addRageStats?.({ rageDuration: v }),
            'rageDamageBonus': (v) => this.player!.addRageStats?.({ rageDamageBonus: v })
        }

        const handler = statHandlers[statName]
        if (handler) {
            handler(value)
        }
    }

    private applyHealthBonus(value: number): void {
        if (!this.player) return
        const newMaxHp = this.player.getMaxHealth() + value
        this.player.setMaxHealth?.(newMaxHp)
    }

    // ========== 升级节点 ==========

    private unlockUpgrades(skillId: string, level: number): void {
        const upgrades = this.getUpgradesAtLevel(skillId, level)
        const skillData = this.playerSkills.get(skillId)
        if (!skillData) return

        for (const upgrade of upgrades) {
            if (!skillData.unlockedUpgrades.includes(upgrade.nodeId)) {
                skillData.unlockedUpgrades.push(upgrade.nodeId)
                this.registerUpgradeTrigger(upgrade)
            }
        }
    }

    private registerUpgradeTrigger(upgrade: UpgradeNode): void {
        const triggerSystem = ServiceLocator.getInstance().get<any>('triggerSystem')
        if (triggerSystem?.registerTrigger) {
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
        const availableSkills = this.getAvailableSkills(excludeIds)

        if (availableSkills.length === 0) return []

        const weighted = this.buildWeightedSkillList(availableSkills)
        const shuffled = this.shuffleArray([...weighted])

        return this.getUniqueItems(shuffled, count)
    }

    private getAvailableSkills(excludeIds: string[]): string[] {
        const available: string[] = []

        for (const [skillId, def] of this.skillDefs) {
            if (excludeIds.includes(skillId)) continue

            const currentLevel = this.getSkillLevel(skillId)
            if (currentLevel >= def.maxLevel) continue

            available.push(skillId)
        }

        return available
    }

    private buildWeightedSkillList(skillIds: string[]): string[] {
        const weighted: string[] = []
        for (const skillId of skillIds) {
            const def = this.skillDefs.get(skillId)!
            const weight = RARITY_WEIGHTS[def.rarity] ?? DEFAULT_RARITY_WEIGHT
            for (let i = 0; i < weight; i++) {
                weighted.push(skillId)
            }
        }
        return weighted
    }

    private shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
                ;[array[i], array[j]] = [array[j], array[i]]
        }
        return array
    }

    private getUniqueItems<T>(array: T[], count: number): T[] {
        const result: T[] = []
        const seen = new Set<T>()

        for (const item of array) {
            if (result.length >= count) break
            if (!seen.has(item)) {
                seen.add(item)
                result.push(item)
            }
        }

        return result
    }

    public getAvailableFusions(): { fusionId: string, rule: FusionRule }[] {
        return []
    }

    // ========== 工具方法 ==========

    public getPlayer(): IPlayer | null {
        return this.player
    }

    public reset(): void {
        this.playerSkills.clear()
    }
}