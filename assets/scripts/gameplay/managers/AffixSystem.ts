// assets/scripts/gameplay/managers/AffixSystem.ts

import { resources, JsonAsset, Vec3, Node, Label, Color } from 'cc'
import { Enemy } from '../enemy/Enemy'
import { EnemyAffixData } from './AffixData'
import { AffixConfig, AffixRarity, DEFAULT_AFFIXES } from '../../configs/AffixConfig'
import { EventBus } from '../../core/EventBus'
import { EventNames } from '../../utils/EventNames'
import { AffixWeightConfig } from '../../configs/GameConfig'
import { IAffixTarget } from '../../interfaces/IAffixTarget'
import { AffixStrategyFactory } from './AffixStrategyFactory'

/**
 * 词条系统管理器
 * 从JSON加载配置，动态应用词条效果
 */
export class AffixSystem {
    private static instance: AffixSystem
    private affixes: AffixConfig[] = []
    private isLoading: boolean = false
    private loadCallbacks: (() => void)[] = []
    private isReady: boolean = false

    // 记录已应用词条的敌人（防止重复应用）
    private appliedEnemies: WeakSet<IAffixTarget> = new WeakSet()

    private constructor() { 
        // 注册词条策略
        AffixStrategyFactory.initialize()
    }

    static getInstance(): AffixSystem {
        if (!AffixSystem.instance) {
            AffixSystem.instance = new AffixSystem()
        }
        return AffixSystem.instance
    }

    /**
     * 从JSON加载词条配置
     */
    public loadAffixes(callback?: () => void): void {
        if (this.isReady) {
            callback?.()
            return
        }

        if (this.isLoading) {
            if (callback) this.loadCallbacks.push(callback)
            return
        }

        this.isLoading = true

        resources.load('config/affixes', JsonAsset, (err, jsonAsset) => {
            this.isLoading = false

            if (err) {
                console.error('[词条系统] 加载配置失败:', err)
                this.loadDefaultAffixes()
            } else {
                const data = jsonAsset.json as any
                this.affixes = data.affixes || []
            }

            this.isReady = true

            callback?.()
            for (const cb of this.loadCallbacks) {
                cb()
            }
            this.loadCallbacks = []
        })
    }

    /**
     * 加载默认词条（配置加载失败时使用 TypeScript 配置）
     */
    private loadDefaultAffixes(): void {
        this.affixes = [...DEFAULT_AFFIXES]
    }

    /**
     * 根据波次获取可用词条池
     */
    private getAffixPoolByWave(wave: number): AffixConfig[] {
        if (this.affixes.length > 0) {
            return this.affixes.filter(affix => affix.minWave <= wave)
        }
        return DEFAULT_AFFIXES.filter(affix => affix.minWave <= wave)
    }

    /**
    * 根据波次获取词条数量
    */
    private getWaveAffixConfig(wave: number): { count: number, maxRarity: AffixRarity } {
        let count = Math.floor(wave / 10) + 1
        return { count: count, maxRarity: 'legendary' }
    }

    /**
     * 稀有度权重
     */
    private getRarityWeight(rarity: AffixRarity, maxRarity: AffixRarity): number {
        const rarityOrder = ['common', 'rare', 'epic', 'legendary']
        const maxIndex = rarityOrder.indexOf(maxRarity)
        const currentIndex = rarityOrder.indexOf(rarity)

        if (currentIndex > maxIndex) return 0

        const weights: Record<AffixRarity, number> = {
            common: AffixWeightConfig.COMMON,
            rare: AffixWeightConfig.RARE,
            epic: AffixWeightConfig.EPIC,
            legendary: AffixWeightConfig.LEGENDARY
        }
        return weights[rarity] || 1
    }

    /**
     * 为敌人随机分配词条
     */
    public applyRandomAffixes(enemy: Enemy, wave: number): AffixConfig[] {
        if (this.appliedEnemies.has(enemy)) {
            console.warn('[词条系统] 敌人已应用过词条，跳过');
            return [];
        }

        const { count, maxRarity } = this.getWaveAffixConfig(wave)
        if (count === 0) return []

        const pool = this.getAffixPoolByWave(wave)
        if (pool.length === 0) return []

        const weightedPool = pool.filter(affix => {
            return this.getRarityWeight(affix.rarity, maxRarity) > 0
        })

        if (weightedPool.length === 0) return []

        const shuffled = [...weightedPool]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }

        const selected = shuffled.slice(0, Math.min(count, shuffled.length))

        const enemyData = this.getEnemyAffixData(enemy)
        enemyData.affixes = selected
        enemyData.originalSpeed = enemy.speed
        enemyData.originalDamage = enemy.damage

        for (const affix of selected) {
            this.applyAffixToEnemy(enemy, affix, enemyData)
            // 调用策略的 onApply 方法（如果有）
            const strategy = AffixStrategyFactory.get(affix.id)
            if (strategy?.onApply) {
                strategy.onApply(enemy, affix, enemyData)
            }
        }

        this.showAffixesOnEnemy(enemy, selected)
        this.appliedEnemies.add(enemy)

        return selected
    }

    /**
     * 重置敌人词条记录
     */
    public resetEnemyAffixRecord(enemy: Enemy): void {
        this.appliedEnemies.delete(enemy);
        if ((enemy as any).__affixData) {
            (enemy as any).__affixData = null;
        }
    }

    /**
     * 在敌人头上显示词条
     */
    private showAffixesOnEnemy(enemy: Enemy, affixes: AffixConfig[]) {
        if (affixes.length === 0) return

        const labelNode = new Node('AffixLabel')
        labelNode.setPosition(0, 50, 0)

        const label = labelNode.addComponent(Label)
        label.fontSize = 16
        label.lineHeight = 18
        label.color = Color.YELLOW

        let text = ''
        for (let i = 0; i < affixes.length; i++) {
            if (i > 0) text += '\n'
            text += affixes[i].name
        }
        label.string = text

        enemy.node.addChild(labelNode)
    }

    /**
     * 获取敌人的词条数据
     */
    private getEnemyAffixData(enemy: Enemy): EnemyAffixData {
        if (!(enemy as any).__affixData) {
            (enemy as any).__affixData = {
                affixes: [],
                regenerateTimer: 0,
                isBerserk: false,
                originalSpeed: enemy.speed,
                originalDamage: enemy.damage,
                reviveLeft: 1,
                shield: 0,
                summonTimer: 0,
                lastDamageType: '',
                adaptiveResistance: 0
            }
        }
        return (enemy as any).__affixData
    }

    /**
     * 应用词条效果到敌人
     */
    private applyAffixToEnemy(enemy: Enemy, affix: AffixConfig, enemyData: EnemyAffixData): void {
        const stats = affix.stats
        if (!stats) return

        if (stats.speedMultiplier) {
            enemy.speed = enemyData.originalSpeed * stats.speedMultiplier
        }

        if (stats.healthMultiplier) {
            const newMaxHealth = Math.floor(enemy.maxHealth * stats.healthMultiplier);
            enemy.maxHealth = newMaxHealth;
            (enemy as any).currentHealth = newMaxHealth;
        }

        if (stats.damageMultiplier) {
            enemy.damage = enemyData.originalDamage * stats.damageMultiplier
        }

        if (stats.damageReduction) {
            enemy.damageReduction = stats.damageReduction
        }

        if (stats.shieldAmount) {
            enemyData.shield = stats.shieldAmount
        }

        if (stats.adaptiveResistance) {
            enemyData.adaptiveResistance = stats.adaptiveResistance
        }

        if (affix.id === 'immortal') {
            enemyData.reviveLeft = 1
        }
    }

    /**
     * 触发敌人更新回调
     */
    public onEnemyUpdate(enemy: Enemy, deltaTime: number): void {
        const enemyData = this.getEnemyAffixData(enemy)
        if (!enemyData.affixes) return

        for (const affix of enemyData.affixes) {
            if (!affix.hasCallback || affix.callbackType !== 'onUpdate') continue
            
            // ✅ 优先使用策略
            const strategy = AffixStrategyFactory.get(affix.id)
            if (strategy?.onUpdate) {
                strategy.onUpdate(enemy, affix, enemyData, deltaTime)
            } else {
                // 备用：保留原有 switch-case
                this.handleUpdateCallbackLegacy(enemy, affix, enemyData, deltaTime)
            }
        }
    }

    /**
     * 备用：原有的更新回调逻辑
     */
    private handleUpdateCallbackLegacy(enemy: Enemy, affix: AffixConfig, enemyData: EnemyAffixData, deltaTime: number): void {
        const stats = affix.stats
        if (!stats) return

        switch (affix.id) {
            case 'regenerate':
                enemyData.regenerateTimer += deltaTime
                if (enemyData.regenerateTimer >= 1.0) {
                    enemyData.regenerateTimer = 0
                    const healAmount = Math.floor(enemy.maxHealth * stats.regeneratePercent);
                    (enemy as any).currentHealth = Math.min(enemy.maxHealth, (enemy as any).currentHealth + healAmount);
                }
                break
            case 'berserk':
                const healthPercent = (enemy as any).currentHealth / enemy.maxHealth
                if (healthPercent <= stats.berserkThreshold && !enemyData.isBerserk) {
                    enemyData.isBerserk = true
                    enemy.speed = enemyData.originalSpeed * stats.berserkSpeedMultiplier
                    enemy.damage = enemyData.originalDamage * stats.berserkAttackMultiplier
                }
                break
            case 'minion_master':
                enemyData.summonTimer += deltaTime
                if (enemyData.summonTimer >= stats.summonInterval) {
                    enemyData.summonTimer = 0
                    this.spawnMinions(enemy, stats.summonCount)
                }
                break
        }
    }

    private spawnMinions(enemy: Enemy, count: number): void {
        const position = enemy.node.worldPosition
        EventBus.emit(EventNames.ENEMY_SUMMON, { position, count, parentEnemy: enemy })
    }

    /**
     * 触发敌人死亡回调
     */
    public onEnemyDeath(enemy: Enemy, position: Vec3): boolean {
        const enemyData = this.getEnemyAffixData(enemy)
        if (!enemyData.affixes) return false

        for (const affix of enemyData.affixes) {
            if (!affix.hasCallback || affix.callbackType !== 'onDeath') continue
            
            // ✅ 优先使用策略
            const strategy = AffixStrategyFactory.get(affix.id)
            if (strategy?.onDeath) {
                const shouldPreventDeath = strategy.onDeath(enemy, affix, enemyData, position)
                if (shouldPreventDeath) return true
            } else {
                // 备用：保留原有 switch-case
                const shouldPreventDeath = this.handleDeathCallbackLegacy(enemy, affix, enemyData, position)
                if (shouldPreventDeath) return true
            }
        }
        return false
    }

    /**
     * 备用：原有的死亡回调逻辑
     */
    private handleDeathCallbackLegacy(enemy: Enemy, affix: AffixConfig, enemyData: EnemyAffixData, position: Vec3): boolean {
        const stats = affix.stats

        switch (affix.id) {
            case 'explosive':
                const explosionRadius = stats?.explosionRadius || 100
                const explosionDamagePercent = stats?.explosionDamagePercent || 0.5
                const explosionDamage = enemy.damage * explosionDamagePercent
                EventBus.emit(EventNames.ENEMY_EXPLOSION, { position, radius: explosionRadius, damage: explosionDamage })
                return false
            case 'split':
                const splitCount = stats?.splitCount || 2
                const splitHealthPercent = stats?.splitHealthPercent || 0.5
                EventBus.emit(EventNames.ENEMY_SPLIT, { position, count: splitCount, healthPercent: splitHealthPercent })
                return false
            case 'immortal':
                if (enemyData.reviveLeft > 0) {
                    enemyData.reviveLeft = 0
                    const reviveHealth = Math.floor(enemy.maxHealth * (stats?.reviveHealthPercent || 0.5));
                    (enemy as any).currentHealth = reviveHealth;
                    (enemy as any).isDead = false;
                    return true
                }
                return false
        }
        return false
    }

    /**
     * 触发敌人受伤回调
     */
    public onEnemyHit(enemy: Enemy, damage: number, damageType?: string): number {
        const enemyData = this.getEnemyAffixData(enemy)
        if (!enemyData.affixes) return damage

        let modifiedDamage = damage

        // 护盾吸收
        if (enemyData.shield > 0) {
            const absorbed = Math.min(enemyData.shield, modifiedDamage)
            enemyData.shield -= absorbed
            modifiedDamage -= absorbed
        }

        // 伤害减免
        if (enemy.damageReduction > 0) {
            modifiedDamage *= (1 - enemy.damageReduction)
        }

        // 适应机制
        if (damageType && enemyData.adaptiveResistance > 0) {
            if (enemyData.lastDamageType === damageType) {
                modifiedDamage *= (1 - enemyData.adaptiveResistance)
            }
            enemyData.lastDamageType = damageType
        }

        for (const affix of enemyData.affixes) {
            if (!affix.hasCallback || affix.callbackType !== 'onHit') continue
            
            // ✅ 优先使用策略
            const strategy = AffixStrategyFactory.get(affix.id)
            if (strategy?.onHit) {
                modifiedDamage = strategy.onHit(enemy, affix, enemyData, modifiedDamage)
            } else {
                // 备用：保留原有逻辑
                modifiedDamage = this.handleHitCallbackLegacy(enemy, affix, enemyData, modifiedDamage)
            }
        }

        return Math.max(0, modifiedDamage)
    }

    /**
     * 备用：原有的受伤回调逻辑
     */
    private handleHitCallbackLegacy(enemy: Enemy, affix: AffixConfig, enemyData: EnemyAffixData, damage: number): number {
        const stats = affix.stats

        switch (affix.id) {
            case 'teleport':
                if (Math.random() < (stats?.teleportChance || 0.3)) {
                    const radius = stats?.teleportRadius || 300
                    const randomX = (Math.random() - 0.5) * radius * 2
                    const randomY = (Math.random() - 0.5) * radius * 2
                    enemy.node.setPosition(randomX, randomY, 0)
                }
                break
            case 'mirror':
                const reflectPercent = stats?.reflectPercent || 0.5
                const reflectDamage = damage * reflectPercent
                if (reflectDamage > 0) {
                    EventBus.emit('enemy_reflect', { enemy, damage: reflectDamage })
                }
                break
        }
        return damage
    }

    /**
     * 触发击中玩家回调
     */
    public onHitPlayer(enemy: Enemy, damage: number): number {
        const enemyData = this.getEnemyAffixData(enemy)
        if (!enemyData.affixes) return damage

        let modifiedDamage = damage

        for (const affix of enemyData.affixes) {
            if (!affix.hasCallback || affix.callbackType !== 'onHitPlayer') continue
            
            // ✅ 优先使用策略
            const strategy = AffixStrategyFactory.get(affix.id)
            if (strategy?.onHitPlayer) {
                modifiedDamage = strategy.onHitPlayer(enemy, affix, enemyData, modifiedDamage)
            } else {
                // 备用：保留原有逻辑
                this.handleHitPlayerLegacy(enemy, affix, enemyData, modifiedDamage)
            }
        }

        return modifiedDamage
    }

    /**
     * 备用：原有的击中玩家回调逻辑
     */
    private handleHitPlayerLegacy(enemy: Enemy, affix: AffixConfig, enemyData: EnemyAffixData, damage: number): void {
        switch (affix.id) {
            case 'vampire':
                const healAmount = damage * 0.5
                const healInt = Math.floor(healAmount);
                (enemy as any).currentHealth = Math.min(enemy.maxHealth, (enemy as any).currentHealth + healInt)
                break
            case 'frost':
                const slowPercent = affix.stats?.slowPercent || 0.3
                const slowDuration = affix.stats?.slowDuration || 1.5
                EventBus.emit(EventNames.PLAYER_SLOW, { percent: slowPercent, duration: slowDuration })
                break
        }
    }

    /**
     * 获取敌人的词条列表
     */
    public getEnemyAffixes(enemy: Enemy): AffixConfig[] {
        const enemyData = this.getEnemyAffixData(enemy)
        return enemyData.affixes || []
    }

    public isLoaded(): boolean {
        return this.isReady
    }

    public getAllAffixes(): AffixConfig[] {
        if (this.affixes.length > 0) {
            return [...this.affixes]
        }
        return [...DEFAULT_AFFIXES]
    }
}