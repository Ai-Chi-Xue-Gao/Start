// assets/scripts/gameplay/managers/AffixSystem.ts

import { resources, JsonAsset, Vec3, Node, Label, Color } from 'cc'
import { Enemy } from '../enemy/Enemy'
import { EnemyAffixData } from './AffixData'
import { AffixConfig, AffixRarity, DEFAULT_AFFIXES, getAffixConfig } from '../../configs/AffixConfig'
import { EventBus } from '../../core/EventBus'
import { EventNames } from '../../utils/EventNames'
import { AffixWeightConfig } from '../../configs/GameConfig'

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
    private appliedEnemies: WeakSet<Enemy> = new WeakSet()

    private constructor() { }

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
                console.log(`[词条系统] 加载成功，共 ${this.affixes.length} 个词条`)
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
        console.log(`[词条系统] 使用 TypeScript 默认词条，共 ${this.affixes.length} 个`)
    }

    /**
     * 根据波次获取可用词条池
     */
    private getAffixPoolByWave(wave: number): AffixConfig[] {
        // 优先使用 JSON 加载的数据
        if (this.affixes.length > 0) {
            return this.affixes.filter(affix => affix.minWave <= wave)
        }
        // 备用：从 TypeScript 配置获取
        return DEFAULT_AFFIXES.filter(affix => affix.minWave <= wave)
    }

    /**
    * 根据波次获取词条数量（无上限）
    */
    private getWaveAffixConfig(wave: number): { count: number, maxRarity: AffixRarity } {
        // 词条数量 = 波次 / 10 + 1
        let count = Math.floor(wave / 10) + 1

        // 固定最高稀有度
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
     * 添加防重复检查
     */
    public applyRandomAffixes(enemy: Enemy, wave: number): AffixConfig[] {
        // 防止重复应用词条
        if (this.appliedEnemies.has(enemy)) {
            console.warn('[词条系统] 敌人已应用过词条，跳过');
            return [];
        }

        const { count, maxRarity } = this.getWaveAffixConfig(wave)
        if (count === 0) return []

        const pool = this.getAffixPoolByWave(wave)
        if (pool.length === 0) return []

        // 按稀有度权重筛选
        const weightedPool = pool.filter(affix => {
            return this.getRarityWeight(affix.rarity, maxRarity) > 0
        })

        if (weightedPool.length === 0) return []

        // 随机选择不重复的词条
        const shuffled = [...weightedPool]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
                ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }

        const selected = shuffled.slice(0, Math.min(count, shuffled.length))

        // 初始化敌人词条数据
        const enemyData = this.getEnemyAffixData(enemy)
        enemyData.affixes = selected
        enemyData.originalSpeed = enemy.speed
        enemyData.originalDamage = enemy.damage

        // 应用词条效果
        for (const affix of selected) {
            this.applyAffixToEnemy(enemy, affix, enemyData)
        }

        this.showAffixesOnEnemy(enemy, selected)

        // 标记已应用
        this.appliedEnemies.add(enemy)

        return selected
    }

    /**
     * 重置敌人词条记录（敌人从对象池取出时调用）
     */
    public resetEnemyAffixRecord(enemy: Enemy): void {
        this.appliedEnemies.delete(enemy);
        // 清除词条数据
        if ((enemy as any).__affixData) {
            (enemy as any).__affixData = null;
        }
    }

    /**
     * 在敌人头上显示词条
     */
    private showAffixesOnEnemy(enemy: Enemy, affixes: AffixConfig[]) {
        if (affixes.length === 0) return

        // 创建显示词条的节点
        const labelNode = new Node('AffixLabel')
        labelNode.setPosition(0, 50, 0)  // 在敌人头顶上方50像素

        // 添加 Label 组件
        const label = labelNode.addComponent(Label)
        label.fontSize = 16
        label.lineHeight = 18
        label.color = Color.YELLOW

        // 把所有词条名字拼在一起
        let text = ''
        for (let i = 0; i < affixes.length; i++) {
            if (i > 0) text += '\n'
            text += affixes[i].name
        }
        label.string = text

        // 添加到敌人节点下
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
     *  添加血量取整，避免浮点精度问题
     */
    private applyAffixToEnemy(enemy: Enemy, affix: AffixConfig, enemyData: EnemyAffixData): void {
        const stats = affix.stats

        if (!stats) return

        // 应用数值修改
        if (stats.speedMultiplier) {
            enemy.speed = enemyData.originalSpeed * stats.speedMultiplier
        }

        if (stats.healthMultiplier) {
            //  血量取整
            const newMaxHealth = Math.floor((enemy as any).maxHealth * stats.healthMultiplier);
            (enemy as any).maxHealth = newMaxHealth;
            (enemy as any).currentHealth = newMaxHealth;
        }

        if (stats.damageMultiplier) {
            enemy.damage = enemyData.originalDamage * stats.damageMultiplier
        }

        if (stats.damageReduction) {
            (enemy as any).damageReduction = stats.damageReduction
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
     * 触发敌人更新回调（每帧调用）
     */
    public onEnemyUpdate(enemy: Enemy, deltaTime: number): void {
        const enemyData = this.getEnemyAffixData(enemy)
        if (!enemyData.affixes) return

        for (const affix of enemyData.affixes) {
            if (!affix.hasCallback || affix.callbackType !== 'onUpdate') continue
            this.handleUpdateCallback(enemy, affix, enemyData, deltaTime)
        }
    }

    /**
     * 处理更新回调
     *  添加血量取整，避免浮点精度问题
     */
    private handleUpdateCallback(enemy: Enemy, affix: AffixConfig, enemyData: EnemyAffixData, deltaTime: number): void {
        const stats = affix.stats

        switch (affix.id) {
            case 'regenerate':
                enemyData.regenerateTimer += deltaTime
                if (enemyData.regenerateTimer >= 1.0) {
                    enemyData.regenerateTimer = 0
                    //  回血取整
                    const healAmount = Math.floor((enemy as any).maxHealth * stats.regeneratePercent);
                    (enemy as any).currentHealth = Math.min(
                        (enemy as any).maxHealth,
                        (enemy as any).currentHealth + healAmount
                    );
                }
                break

            case 'berserk':
                const healthPercent = (enemy as any).currentHealth / (enemy as any).maxHealth
                if (healthPercent <= stats.berserkThreshold && !enemyData.isBerserk) {
                    enemyData.isBerserk = true
                    enemy.speed = enemyData.originalSpeed * stats.berserkSpeedMultiplier
                    enemy.damage = enemyData.originalDamage * stats.berserkAttackMultiplier
                    console.log(`[词条] 敌人进入狂暴模式`)
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

    /**
     * 召唤小怪
     */
    private spawnMinions(enemy: Enemy, count: number): void {
        const position = enemy.node.worldPosition
        console.log(`[词条] 召唤师召唤 ${count} 个小怪 at (${position.x}, ${position.y})`)
        // 触发召唤事件，由WaveManager处理
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

            const shouldPreventDeath = this.handleDeathCallback(enemy, affix, enemyData, position)
            if (shouldPreventDeath) return true
        }
        return false
    }

    /**
     * 处理死亡回调
     * @returns true 表示阻止死亡（复活），false 表示正常死亡
     *  添加血量取整，避免浮点精度问题
     */
    private handleDeathCallback(enemy: Enemy, affix: AffixConfig, enemyData: EnemyAffixData, position: Vec3): boolean {
        const stats = affix.stats

        switch (affix.id) {
            case 'explosive':
                const explosionRadius = stats?.explosionRadius || 100
                const explosionDamagePercent = stats?.explosionDamagePercent || 0.5
                const explosionDamage = enemy.damage * explosionDamagePercent
                console.log(`[词条] 自爆！半径: ${explosionRadius}, 伤害: ${explosionDamage}`)
                EventBus.emit(EventNames.ENEMY_EXPLOSION, { position, radius: explosionRadius, damage: explosionDamage })
                return false

            case 'split':
                const splitCount = stats?.splitCount || 2
                const splitHealthPercent = stats?.splitHealthPercent || 0.5
                console.log(`[词条] 分裂成 ${splitCount} 个小怪`)
                EventBus.emit(EventNames.ENEMY_SPLIT, { position, count: splitCount, healthPercent: splitHealthPercent })
                return false

            case 'immortal':
                if (enemyData.reviveLeft > 0) {
                    enemyData.reviveLeft = 0
                    //  复活血量取整
                    const reviveHealth = Math.floor((enemy as any).maxHealth * (stats?.reviveHealthPercent || 0.5));
                    (enemy as any).currentHealth = reviveHealth;
                    (enemy as any).isDead = false;
                    console.log(`[词条] 不朽复活！生命值 ${reviveHealth}`)
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
            console.log(`[词条] 护盾吸收了 ${absorbed} 伤害，剩余护盾: ${enemyData.shield}`)
        }

        // 伤害减免
        if ((enemy as any).damageReduction) {
            modifiedDamage *= (1 - (enemy as any).damageReduction)
        }

        // 适应机制
        if (damageType && enemyData.adaptiveResistance > 0) {
            if (enemyData.lastDamageType === damageType) {
                modifiedDamage *= (1 - enemyData.adaptiveResistance)
                console.log(`[词条] 适应减伤 ${enemyData.adaptiveResistance * 100}%`)
            }
            enemyData.lastDamageType = damageType
        }

        for (const affix of enemyData.affixes) {
            if (!affix.hasCallback || affix.callbackType !== 'onHit') continue
            modifiedDamage = this.handleHitCallback(enemy, affix, enemyData, modifiedDamage)
        }

        return Math.max(0, modifiedDamage)
    }

    /**
     * 处理受伤回调
     */
    private handleHitCallback(enemy: Enemy, affix: AffixConfig, enemyData: EnemyAffixData, damage: number): number {
        const stats = affix.stats

        switch (affix.id) {
            case 'teleport':
                if (Math.random() < (stats?.teleportChance || 0.3)) {
                    const radius = stats?.teleportRadius || 300
                    const randomX = (Math.random() - 0.5) * radius * 2
                    const randomY = (Math.random() - 0.5) * radius * 2
                    enemy.node.setPosition(randomX, randomY, 0)
                    console.log(`[词条] 瞬移到 (${randomX}, ${randomY})`)
                }
                break

            case 'mirror':
                const reflectPercent = stats?.reflectPercent || 0.5
                const reflectDamage = damage * reflectPercent
                if (reflectDamage > 0) {
                    console.log(`[词条] 反弹 ${reflectDamage} 伤害`)
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

            switch (affix.id) {
                case 'vampire':
                    const healAmount = damage * 0.5
                    //  吸血治疗取整
                    const healInt = Math.floor(healAmount);
                    (enemy as any).currentHealth = Math.min(
                        (enemy as any).maxHealth,
                        (enemy as any).currentHealth + healInt
                    )
                    console.log(`[词条] 吸血回复 ${healInt}`)
                    break

                case 'frost':
                    const slowPercent = affix.stats?.slowPercent || 0.3
                    const slowDuration = affix.stats?.slowDuration || 1.5
                    console.log(`[词条] 寒霜：减速玩家 ${slowPercent * 100}%，持续 ${slowDuration}秒`)
                    EventBus.emit(EventNames.PLAYER_SLOW, { percent: slowPercent, duration: slowDuration })
                    break
            }
        }

        return modifiedDamage
    }

    /**
     * 获取敌人的词条列表（用于UI显示）
     */
    public getEnemyAffixes(enemy: Enemy): AffixConfig[] {
        const enemyData = this.getEnemyAffixData(enemy)
        return enemyData.affixes || []
    }

    /**
     * 检查是否已加载
     */
    public isLoaded(): boolean {
        return this.isReady
    }

    /**
     * 获取所有词条（用于调试）
     */
    public getAllAffixes(): AffixConfig[] {
        if (this.affixes.length > 0) {
            return [...this.affixes]
        }
        return [...DEFAULT_AFFIXES]
    }
}