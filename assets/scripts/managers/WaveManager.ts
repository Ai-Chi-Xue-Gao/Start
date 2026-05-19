import { _decorator, Component, Node, Vec3, instantiate, Prefab, Sprite, Color } from 'cc'
import { EventBus } from '../core/EventBus'
import { EventNames } from '../utils/EventNames'
import { GameConstants } from '../utils/GameConstants'
import { Enemy } from '../entities/enemy/Enemy'
import { AffixSystem } from './AffixSystem'
import { ObjectPool } from '../utils/ObjectPool'
import { ExpBall } from '../entities/enemy/ExpBall'
import { EnemyConfig, WaveConfig } from '../configs/GameConfig'

const { ccclass, property } = _decorator

/**
 * 波次类型
 */
enum WaveType {
    GRIND = 'grind',
    THREAT = 'threat',
    BREATHER = 'breather'
}

/**
 * 敌人类型
 */
enum EnemyType {
    NORMAL = 'normal',
    ELITE = 'elite',
    BOSS = 'boss'
}

@ccclass('WaveManager')
export class WaveManager extends Component {
    @property(Prefab)
    enemyPrefab: Prefab = null

    @property(Prefab)
    expBallPrefab: Prefab = null

    @property(Node)
    player: Node = null

    // 精英/BOSS 颜色
    private readonly ELITE_COLOR = new Color(255, 80, 80, 255)   // 红色
    private readonly BOSS_COLOR = new Color(255, 215, 0, 255)    // 金色

    private currentWave: number = 1
    private waveState: 'active' | 'break' = 'active'
    private breakTimer: number = 0
    private enemiesRemaining: number = 0
    private enemiesToSpawn: number = 0

    // 生成速度控制
    private spawnInterval: number = 0.5      // 生成间隔（秒）
    private spawnCooldown: number = 0        // 当前冷却时间
    private maxSpawnPerFrame: number = 1     // 每帧最大生成数量

    // 各类敌人待生成数量
    private normalToSpawn: number = 0
    private eliteToSpawn: number = 0
    private bossToSpawn: number = 0

    private affixSystem: AffixSystem = null

    start() {
        const gameMode = (window as any).gameMode
        if (gameMode === 'multi') {
            this.enabled = false
            return
        }

        this.affixSystem = AffixSystem.getInstance()
        this.affixSystem.loadAffixes(() => {
            console.log('[波次系统] 词条系统已加载，开始第一波')
            this.startWave()
        })

        EventBus.on(EventNames.ENEMY_DIED, this.onEnemyDied, this)
        EventBus.on(EventNames.GAME_PAUSE, this.onGamePause, this)
        EventBus.on('enemy_summon', this.onEnemySummon, this)
        EventBus.on('enemy_split', this.onEnemySplit, this)
        EventBus.on('enemy_explosion', this.onEnemyExplosion, this)
    }

    protected onDestroy() {
        EventBus.off(EventNames.ENEMY_DIED, this.onEnemyDied, this)
        EventBus.off(EventNames.GAME_PAUSE, this.onGamePause, this)
        EventBus.off('enemy_summon', this.onEnemySummon, this)
        EventBus.off('enemy_split', this.onEnemySplit, this)
        EventBus.off('enemy_explosion', this.onEnemyExplosion, this)
    }

    private onGamePause(pause: boolean) { }

    private getWaveType(wave: number): WaveType {
        if (wave % 5 === 0) return WaveType.BREATHER
        if (wave % 4 === 0) return WaveType.THREAT
        return WaveType.GRIND
    }

    private getWaveEnemyCount(wave: number, waveType: WaveType): { normal: number, elite: number, boss: number } {
        let baseCount = WaveConfig.BASE_ENEMY_COUNT + Math.floor(wave / WaveConfig.ENEMY_COUNT_WAVE_DIVISOR)

        switch (waveType) {
            case WaveType.THREAT:
                baseCount = Math.floor(baseCount * WaveConfig.THREAT_WAVE_MULTIPLIER)
                break
            case WaveType.BREATHER:
                baseCount = Math.max(3, Math.floor(baseCount * WaveConfig.BREATHER_WAVE_MULTIPLIER))
                break
        }

        let eliteCount = Math.floor(wave / WaveConfig.ELITE_SPAWN_INTERVAL)
        eliteCount = Math.min(eliteCount, Math.floor(baseCount * WaveConfig.MAX_ELITE_PERCENT))

        let bossCount = Math.floor(wave / WaveConfig.BOSS_SPAWN_INTERVAL)
        bossCount = Math.min(bossCount, Math.floor(baseCount * WaveConfig.MAX_BOSS_PERCENT))

        let normalCount = baseCount - eliteCount - bossCount
        normalCount = Math.max(0, normalCount)

        console.log(`[波次 ${wave}] 敌人构成: 普通=${normalCount}, 精英=${eliteCount}, BOSS=${bossCount}`)

        return { normal: normalCount, elite: eliteCount, boss: bossCount }
    }

    private startWave() {
        const waveType = this.getWaveType(this.currentWave)
        const enemyCounts = this.getWaveEnemyCount(this.currentWave, waveType)

        this.normalToSpawn = enemyCounts.normal
        this.eliteToSpawn = enemyCounts.elite
        this.bossToSpawn = enemyCounts.boss
        this.enemiesToSpawn = enemyCounts.normal + enemyCounts.elite + enemyCounts.boss
        this.enemiesRemaining = this.enemiesToSpawn
        this.waveState = 'active'

        // 重置生成冷却
        this.spawnCooldown = 0

        console.log(`========== 第 ${this.currentWave} 波 ==========`)
        console.log(`类型: ${waveType}, 普通: ${enemyCounts.normal}, 精英: ${enemyCounts.elite}, BOSS: ${enemyCounts.boss}`)

        EventBus.emit('wave_start', { wave: this.currentWave, type: waveType })
    }

    private onWaveComplete() {
        this.waveState = 'break'
        this.breakTimer = WaveConfig.WAVE_BREAK_TIME
        console.log(`第 ${this.currentWave} 波完成！休息 ${this.breakTimer} 秒`)
        EventBus.emit('wave_complete', { wave: this.currentWave })
    }

    private onEnemyExplosion(data: { position: Vec3, radius: number, damage: number }) {
        const playerPos = this.player?.worldPosition || new Vec3(0, 0, 0)
        const distance = Vec3.distance(playerPos, data.position)

        if (distance < data.radius) {
            console.log(`[自爆] 爆炸！距离 ${distance}, 伤害 ${data.damage}`)
            EventBus.emit(EventNames.ENEMY_HIT_PLAYER, data.damage)
        }
    }

    private onEnemyDied(pos: Vec3, enemy?: Enemy) {
        this.spawnExpBall(pos)

        if (this.waveState === 'active') {
            this.enemiesRemaining--
            if (this.enemiesRemaining <= 0 && this.enemiesToSpawn <= 0) {
                this.onWaveComplete()
            }
        }
    }

    private spawnExpBall(position: Vec3) {
        const pool = ObjectPool.getInstance()
        let expBall = pool.get('expBall', this.node)

        if (expBall) {
            const expScript = expBall.getComponent(ExpBall)
            if (expScript) {
                expScript.setFromPool(true)
                expScript.reset()
            }
            expBall.worldPosition = position
        } else {
            if (!this.expBallPrefab) return
            const newExpBall = instantiate(this.expBallPrefab)
            const expScript = newExpBall.getComponent(ExpBall)
            if (expScript) {
                expScript.setFromPool(false)
            }
            newExpBall.worldPosition = position
            this.node.addChild(newExpBall)
        }
    }

    private onEnemySummon(data: { position: Vec3, count: number, parentEnemy: Enemy }) {
        for (let i = 0; i < data.count; i++) {
            this.spawnMinion(data.position)
        }
    }

    /**
    * 分裂回调 - 安全版本
    */
    private onEnemySplit(data: { position: Vec3, count: number, healthPercent: number }) {
        // 限制分裂数量，防止爆炸
        const maxSplitCount = Math.min(data.count, 5)

        for (let i = 0; i < maxSplitCount; i++) {
            const enemy = this.spawnMinion(data.position)
            if (!enemy) continue

            const enemyScript = enemy.getComponent(Enemy)
            if (!enemyScript) continue

            // 使用安全方法设置分裂怪
            enemyScript.setAsMinion(data.healthPercent)
        }
    }

    /**
     * 计算敌人生成位置（在玩家周围）
     * @param playerPos 玩家位置
     * @returns 生成位置
     */
    private calculateSpawnPosition(playerPos: Vec3): Vec3 {
        // 生成角度（随机）
        const angle = Math.random() * Math.PI * 2
        // 生成距离（玩家周围 300-600 像素）
        const minDistance = 300
        const maxDistance = 600
        const distance = minDistance + Math.random() * (maxDistance - minDistance)

        // 计算位置
        let spawnX = playerPos.x + Math.cos(angle) * distance
        let spawnY = playerPos.y + Math.sin(angle) * distance

        // 边界裁剪
        const halfWidth = GameConstants.WORLD_WIDTH / 2
        const halfHeight = GameConstants.WORLD_HEIGHT / 2
        spawnX = Math.max(-halfWidth, Math.min(halfWidth, spawnX))
        spawnY = Math.max(-halfHeight, Math.min(halfHeight, spawnY))

        return new Vec3(spawnX, spawnY, 0)
    }

    /**
    * 生成小怪 - 使用独立池
    */
    private spawnMinion(position: Vec3): Node | null {
        const pool = ObjectPool.getInstance()
        let minion = pool.get('enemy_minion', this.node)

        if (!minion) {
            if (!this.enemyPrefab) return null
            minion = instantiate(this.enemyPrefab)
            this.node.addChild(minion)
            const enemyScript = minion.getComponent(Enemy)
            if (enemyScript) {
                enemyScript.reset(false)  // 不是来自池，直接初始化
            }
        } else {
            const enemyScript = minion.getComponent(Enemy)
            if (enemyScript) {
                enemyScript.reset(true)   // 来自池，重置状态
            }
        }

        const playerPos = this.player?.worldPosition || new Vec3(0, 0, 0)
        const spawnPos = this.calculateSpawnPosition(playerPos)
        minion.setPosition(spawnPos)
        minion.setScale(0.7, 0.7, 1)

        const enemyScript2 = minion.getComponent(Enemy)
        if (enemyScript2) {
            const waveBonus = 1
            enemyScript2.speed = EnemyConfig.NORMAL_SPEED * waveBonus * 0.5
            enemyScript2.damage = EnemyConfig.NORMAL_DAMAGE * waveBonus * 0.5
            // 注意：血量通过 setAsMinion 设置，这里不重复设置
        }

        return minion
    }

    /**
     * 生成敌人（在玩家周围）
     */
    private spawnEnemy() {
        if (this.enemiesToSpawn <= 0) return
        if (!this.enemyPrefab) return

        let enemyType: EnemyType = EnemyType.NORMAL
        let statMultiplier = 1.0

        if (this.bossToSpawn > 0) {
            enemyType = EnemyType.BOSS
            this.bossToSpawn--
            statMultiplier = EnemyConfig.BOSS_STAT_MULTIPLIER
        } else if (this.eliteToSpawn > 0) {
            enemyType = EnemyType.ELITE
            this.eliteToSpawn--
            statMultiplier = EnemyConfig.ELITE_STAT_MULTIPLIER
        } else {
            enemyType = EnemyType.NORMAL
            this.normalToSpawn--
        }

        const playerPos = this.player?.worldPosition || new Vec3(0, 0, 0)
        const spawnPos = this.calculateSpawnPosition(playerPos)

        const pool = ObjectPool.getInstance()
        let enemyNode = pool.get('enemy', this.node)

        if (!enemyNode) {
            if (!this.enemyPrefab) return
            enemyNode = instantiate(this.enemyPrefab)
            this.node.addChild(enemyNode)
            const enemyScript = enemyNode.getComponent(Enemy)
            if (enemyScript) {
                enemyScript.reset(false)
            }
        } else {
            const enemyScript = enemyNode.getComponent(Enemy)
            if (enemyScript) {
                enemyScript.reset(true)
            }
        }

        enemyNode.setPosition(spawnPos)

        const enemyScript2 = enemyNode.getComponent(Enemy)
        if (enemyScript2) {
            const waveBonus = 1 + (this.currentWave - 1) * WaveConfig.WAVE_GROWTH_RATE
            const finalMultiplier = waveBonus * statMultiplier

            enemyScript2.speed = EnemyConfig.NORMAL_SPEED * finalMultiplier
            enemyScript2.damage = EnemyConfig.NORMAL_DAMAGE * finalMultiplier
            enemyScript2.maxHealth = EnemyConfig.NORMAL_HEALTH * finalMultiplier

            if (enemyType === EnemyType.ELITE) {
                const sprite = enemyNode.getComponent(Sprite)
                if (sprite) sprite.color = this.ELITE_COLOR
                enemyNode.setScale(EnemyConfig.ELITE_SCALE, EnemyConfig.ELITE_SCALE, 1)
            } else if (enemyType === EnemyType.BOSS) {
                const sprite = enemyNode.getComponent(Sprite)
                if (sprite) sprite.color = this.BOSS_COLOR
                enemyNode.setScale(EnemyConfig.BOSS_SCALE, EnemyConfig.BOSS_SCALE, 1)
            }

            if (this.affixSystem && this.affixSystem.isLoaded()) {
                const waveType = this.getWaveType(this.currentWave)
                let effWave = this.currentWave

                if (waveType === WaveType.BREATHER && effWave > WaveConfig.BREATHER_AFFIX_REDUCTION) {
                    effWave = Math.max(WaveConfig.BREATHER_AFFIX_REDUCTION, effWave - WaveConfig.BREATHER_AFFIX_REDUCTION)
                }
                if (waveType === WaveType.THREAT) {
                    effWave = effWave + WaveConfig.THREAT_AFFIX_BONUS
                }

                if (enemyType === EnemyType.ELITE) {
                    effWave += WaveConfig.ELITE_AFFIX_BONUS
                } else if (enemyType === EnemyType.BOSS) {
                    effWave += WaveConfig.BOSS_AFFIX_BONUS
                }

                const appliedAffixes = this.affixSystem.applyRandomAffixes(enemyScript2, effWave)
                if (appliedAffixes.length > 0) {
                    console.log(`[波次 ${this.currentWave}] ${enemyType} 获得词条: ${appliedAffixes.map(a => a.name).join(', ')}`)
                }
            }
        }

        this.enemiesToSpawn--
    }

    public getCurrentWave(): number {
        return this.currentWave
    }

    update(deltaTime: number) {
        if (this.waveState === 'active') {
            // 生成速度控制
            if (this.spawnCooldown > 0) {
                this.spawnCooldown -= deltaTime
            }

            if (this.enemiesToSpawn > 0 && this.spawnCooldown <= 0) {
                // 每帧最多生成 maxSpawnPerFrame 个
                let spawnCount = Math.min(this.maxSpawnPerFrame, this.enemiesToSpawn)
                for (let i = 0; i < spawnCount; i++) {
                    this.spawnEnemy()
                }
                // 设置冷却时间
                this.spawnCooldown = this.spawnInterval
            }
        } else if (this.waveState === 'break') {
            this.breakTimer -= deltaTime
            if (this.breakTimer <= 0) {
                this.currentWave++
                this.startWave()
            }
        }
    }
}