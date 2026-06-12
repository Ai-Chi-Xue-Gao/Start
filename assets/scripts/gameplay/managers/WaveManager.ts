// assets/scripts/gameplay/managers/WaveManager.ts

import { _decorator, Node, Vec3, instantiate, Prefab, Sprite, Color } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { Enemy } from '../enemy/Enemy';
import { AffixSystem } from './AffixSystem';
import { ObjectPool } from '../../utils/ObjectPool';
import { ExpBall } from '../enemy/ExpBall';
import { EnemyConfig, WaveConfig, WorldConfig } from '../../configs/GameConfig';
import { GameContext } from '../../core/GameContext';

const { ccclass, property } = _decorator;

// ========== 枚举定义 ==========

/**
 * 波次类型
 */
enum WaveType {
    GRIND = 'grind',       // 普通波次
    THREAT = 'threat',     // 威胁波次（敌人更多）
    BREATHER = 'breather'  // 喘息波次（敌人更少）
}

/**
 * 敌人类型
 */
enum EnemyType {
    NORMAL = 'normal',
    ELITE = 'elite',
    BOSS = 'boss'
}

// ========== 类型定义 ==========

/**
 * 波次敌人数量配置
 */
interface WaveEnemyCount {
    normal: number;
    elite: number;
    boss: number;
}

/**
 * 敌人类型信息
 */
interface EnemyTypeInfo {
    type: EnemyType;
    statMultiplier: number;
    color: Color;
    scale: number;
    affixWaveBonus: number;
}

// ========== 常量定义 ==========

/**
 * 敌人类型配置映射
 */
const ENEMY_TYPE_CONFIG: Record<EnemyType, EnemyTypeInfo> = {
    [EnemyType.NORMAL]: {
        type: EnemyType.NORMAL,
        statMultiplier: 1.0,
        color: Color.WHITE,
        scale: 1.0,
        affixWaveBonus: 0
    },
    [EnemyType.ELITE]: {
        type: EnemyType.ELITE,
        statMultiplier: EnemyConfig.ELITE_STAT_MULTIPLIER,
        color: new Color(255, 80, 80, 255),
        scale: EnemyConfig.ELITE_SCALE,
        affixWaveBonus: WaveConfig.ELITE_AFFIX_BONUS
    },
    [EnemyType.BOSS]: {
        type: EnemyType.BOSS,
        statMultiplier: EnemyConfig.BOSS_STAT_MULTIPLIER,
        color: new Color(255, 215, 0, 255),
        scale: EnemyConfig.BOSS_SCALE,
        affixWaveBonus: WaveConfig.BOSS_AFFIX_BONUS
    }
};

/**
 * 对象池键名
 */
const POOL_KEYS = {
    ENEMY: 'enemy',
    ENEMY_MINION: 'enemy_minion',
    EXP_BALL: 'expBall'
} as const;

// ========== 波次管理器 ==========

/**
 * 波次管理器
 * 负责：敌人生成、波次控制、分裂/召唤处理
 */
@ccclass('WaveManager')
export class WaveManager extends BaseComponent {
    // ========== 预制体属性 ==========
    @property(Prefab)
    enemyPrefab: Prefab | null = null;

    @property(Prefab)
    expBallPrefab: Prefab | null = null;

    @property(Node)
    player: Node | null = null;

    // ========== 波次状态 ==========
    private currentWave: number = 1;
    private waveState: 'active' | 'break' = 'active';
    private breakTimer: number = 0;

    // ========== 敌人生成计数 ==========
    private enemiesRemaining: number = 0;
    private enemiesToSpawn: number = 0;
    private normalToSpawn: number = 0;
    private eliteToSpawn: number = 0;
    private bossToSpawn: number = 0;

    // ========== 生成控制 ==========
    private spawnInterval: number = 0.5;
    private spawnCooldown: number = 0;
    private maxSpawnPerFrame: number = 1;

    // ========== 系统引用 ==========
    private affixSystem: AffixSystem | null = null;

    // ========== 生命周期 ==========

    start(): void {
        // 联机模式下禁用波次管理器
        if (this.isMultiplayerMode()) {
            this.enabled = false;
            return;
        }

        this.affixSystem = AffixSystem.getInstance();
        this.affixSystem.loadAffixes(() => {
            this.startWave();
        });

        this.bindEvents();
    }

    protected onDestroy(): void {
        this.unbindEvents();
    }

    // ========== 模式检查 ==========

    /**
     * 检查是否为联机模式
     */
    private isMultiplayerMode(): boolean {
        return GameContext.getInstance().isMultiMode();
    }

    // ========== 事件绑定 ==========

    /**
     * 绑定事件监听
     */
    private bindEvents(): void {
        EventBus.on(EventNames.ENEMY_DIED, this.onEnemyDied, this);
        EventBus.on(EventNames.GAME_PAUSE, this.onGamePause, this);
        EventBus.on(EventNames.ENEMY_SUMMON, this.onEnemySummon, this);
        EventBus.on(EventNames.ENEMY_SPLIT, this.onEnemySplit, this);
        EventBus.on(EventNames.ENEMY_EXPLOSION, this.onEnemyExplosion, this);
        EventBus.on('spawn_bonus_exp', this.onSpawnBonusExp, this);
    }

    /**
     * 解绑事件监听
     */
    private unbindEvents(): void {
        EventBus.off(EventNames.ENEMY_DIED, this.onEnemyDied, this);
        EventBus.off(EventNames.GAME_PAUSE, this.onGamePause, this);
        EventBus.off(EventNames.ENEMY_SUMMON, this.onEnemySummon, this);
        EventBus.off(EventNames.ENEMY_SPLIT, this.onEnemySplit, this);
        EventBus.off(EventNames.ENEMY_EXPLOSION, this.onEnemyExplosion, this);
        EventBus.off('spawn_bonus_exp', this.onSpawnBonusExp, this);
    }

    // ========== 波次控制 ==========

    /**
     * 获取当前波次类型
     */
    private getWaveType(wave: number): WaveType {
        if (wave % 5 === 0) return WaveType.BREATHER;
        if (wave % 4 === 0) return WaveType.THREAT;
        return WaveType.GRIND;
    }

    /**
     * 获取波次敌人数量配置
     */
    private getWaveEnemyCount(wave: number, waveType: WaveType): WaveEnemyCount {
        let baseCount = WaveConfig.BASE_ENEMY_COUNT + Math.floor(wave / WaveConfig.ENEMY_COUNT_WAVE_DIVISOR);

        switch (waveType) {
            case WaveType.THREAT:
                baseCount = Math.floor(baseCount * WaveConfig.THREAT_WAVE_MULTIPLIER);
                break;
            case WaveType.BREATHER:
                baseCount = Math.max(3, Math.floor(baseCount * WaveConfig.BREATHER_WAVE_MULTIPLIER));
                break;
        }

        let eliteCount = Math.floor(wave / WaveConfig.ELITE_SPAWN_INTERVAL);
        eliteCount = Math.min(eliteCount, Math.floor(baseCount * WaveConfig.MAX_ELITE_PERCENT));

        let bossCount = Math.floor(wave / WaveConfig.BOSS_SPAWN_INTERVAL);
        bossCount = Math.min(bossCount, Math.floor(baseCount * WaveConfig.MAX_BOSS_PERCENT));

        let normalCount = baseCount - eliteCount - bossCount;
        normalCount = Math.max(0, normalCount);

        return { normal: normalCount, elite: eliteCount, boss: bossCount };
    }

    /**
     * 开始新波次
     */
    private startWave(): void {
        const waveType = this.getWaveType(this.currentWave);
        const enemyCounts = this.getWaveEnemyCount(this.currentWave, waveType);

        this.normalToSpawn = enemyCounts.normal;
        this.eliteToSpawn = enemyCounts.elite;
        this.bossToSpawn = enemyCounts.boss;
        this.enemiesToSpawn = enemyCounts.normal + enemyCounts.elite + enemyCounts.boss;
        this.enemiesRemaining = this.enemiesToSpawn;
        this.waveState = 'active';
        this.spawnCooldown = 0;

        EventBus.emit(EventNames.WAVE_START, { wave: this.currentWave, type: waveType });
    }

    /**
     * 波次完成
     */
    private onWaveComplete(): void {
        this.waveState = 'break';
        this.breakTimer = WaveConfig.WAVE_BREAK_TIME;
        EventBus.emit(EventNames.WAVE_COMPLETE, { wave: this.currentWave });
    }

    // ========== 敌人生成 ==========

    /**
     * 获取敌人类型信息
     */
    private getEnemyTypeInfo(): EnemyTypeInfo {
        if (this.bossToSpawn > 0) {
            this.bossToSpawn--;
            return ENEMY_TYPE_CONFIG[EnemyType.BOSS];
        }

        if (this.eliteToSpawn > 0) {
            this.eliteToSpawn--;
            return ENEMY_TYPE_CONFIG[EnemyType.ELITE];
        }

        this.normalToSpawn--;
        return ENEMY_TYPE_CONFIG[EnemyType.NORMAL];
    }

    /**
     * 生成单个敌人
     */
    private spawnEnemy(): void {
        if (this.enemiesToSpawn <= 0) return;
        if (!this.enemyPrefab) return;

        const enemyTypeInfo = this.getEnemyTypeInfo();
        const spawnPos = this.calculateSpawnPosition();
        const enemyNode = this.getOrCreateEnemyNode();

        if (!enemyNode) return;

        enemyNode.setPosition(spawnPos);
        this.configureEnemy(enemyNode, enemyTypeInfo);
        this.enemiesToSpawn--;
    }

    /**
     * 获取或创建敌人节点
     */
    private getOrCreateEnemyNode(): Node | null {
        const pool = ObjectPool.getInstance();
        let enemyNode = pool.get(POOL_KEYS.ENEMY, this.node);

        if (!enemyNode) {
            if (!this.enemyPrefab) return null;
            enemyNode = instantiate(this.enemyPrefab);
            this.node.addChild(enemyNode);

            const enemyScript = enemyNode.getComponent(Enemy);
            if (enemyScript) {
                enemyScript.reset(false);
            }
        } else {
            const enemyScript = enemyNode.getComponent(Enemy);
            if (enemyScript) {
                enemyScript.reset(true);
            }
        }

        return enemyNode;
    }

    /**
     * 配置敌人属性
     */
    private configureEnemy(enemyNode: Node, typeInfo: EnemyTypeInfo): void {
        const enemyScript = enemyNode.getComponent(Enemy);
        if (!enemyScript) return;

        // 计算最终属性倍率
        const waveBonus = 1 + (this.currentWave - 1) * WaveConfig.WAVE_GROWTH_RATE;
        const finalMultiplier = waveBonus * typeInfo.statMultiplier;

        // 应用基础属性
        enemyScript.speed = EnemyConfig.NORMAL_SPEED * finalMultiplier;
        enemyScript.damage = EnemyConfig.NORMAL_DAMAGE * finalMultiplier;
        enemyScript.maxHealth = Math.floor(EnemyConfig.NORMAL_HEALTH * finalMultiplier);

        // 应用视觉样式
        this.applyEnemyVisuals(enemyNode, typeInfo);

        // 应用词条
        this.applyEnemyAffixes(enemyScript, typeInfo.affixWaveBonus);
    }

    /**
     * 应用敌人视觉样式
     */
    private applyEnemyVisuals(enemyNode: Node, typeInfo: EnemyTypeInfo): void {
        const sprite = enemyNode.getComponent(Sprite);
        if (sprite) {
            sprite.color = typeInfo.color;
        }
        enemyNode.setScale(typeInfo.scale, typeInfo.scale, 1);
    }

    /**
     * 应用敌人词条
     */
    private applyEnemyAffixes(enemyScript: Enemy, typeWaveBonus: number): void {
        if (!this.affixSystem || !this.affixSystem.isLoaded()) return;

        const waveType = this.getWaveType(this.currentWave);
        let effectiveWave = this.currentWave;

        // 喘息波次降低词条强度
        if (waveType === WaveType.BREATHER && effectiveWave > WaveConfig.BREATHER_AFFIX_REDUCTION) {
            effectiveWave = Math.max(WaveConfig.BREATHER_AFFIX_REDUCTION, effectiveWave - WaveConfig.BREATHER_AFFIX_REDUCTION);
        }

        // 威胁波次增加词条强度
        if (waveType === WaveType.THREAT) {
            effectiveWave += WaveConfig.THREAT_AFFIX_BONUS;
        }

        // 敌人类型额外加成
        effectiveWave += typeWaveBonus;

        this.affixSystem.applyRandomAffixes(enemyScript, effectiveWave);
    }

    /**
     * 生成小怪（分裂/召唤）
     */
    private spawnMinion(position: Vec3): Node | null {
        const pool = ObjectPool.getInstance();
        let minion = pool.get(POOL_KEYS.ENEMY_MINION, this.node);

        if (!minion) {
            if (!this.enemyPrefab) return null;
            minion = instantiate(this.enemyPrefab);
            this.node.addChild(minion);

            const enemyScript = minion.getComponent(Enemy);
            if (enemyScript) {
                enemyScript.reset(false);
            }
        } else {
            const enemyScript = minion.getComponent(Enemy);
            if (enemyScript) {
                enemyScript.reset(true);
            }
        }

        const spawnPos = this.calculateSpawnPosition();
        minion.setPosition(spawnPos);
        minion.setScale(EnemyConfig.MINION_SCALE, EnemyConfig.MINION_SCALE, 1);

        const enemyScript2 = minion.getComponent(Enemy);
        if (enemyScript2) {
            const waveBonus = 1;
            enemyScript2.speed = EnemyConfig.NORMAL_SPEED * waveBonus * EnemyConfig.MINION_SPEED_MULTIPLIER;
            enemyScript2.damage = EnemyConfig.NORMAL_DAMAGE * waveBonus * EnemyConfig.MINION_DAMAGE_MULTIPLIER;
        }

        return minion;
    }

    /**
     * 计算生成位置（在玩家周围随机生成）
     */
    private calculateSpawnPosition(): Vec3 {
        const playerPos = this.player?.worldPosition ?? new Vec3(0, 0, 0);

        const angle = Math.random() * Math.PI * 2;
        const distance = EnemyConfig.SPAWN_MIN_DISTANCE + Math.random() * (EnemyConfig.SPAWN_MAX_DISTANCE - EnemyConfig.SPAWN_MIN_DISTANCE);

        let spawnX = playerPos.x + Math.cos(angle) * distance;
        let spawnY = playerPos.y + Math.sin(angle) * distance;

        const halfWidth = WorldConfig.WIDTH / 2;
        const halfHeight = WorldConfig.HEIGHT / 2;
        spawnX = Math.max(-halfWidth, Math.min(halfWidth, spawnX));
        spawnY = Math.max(-halfHeight, Math.min(halfHeight, spawnY));

        return new Vec3(spawnX, spawnY, 0);
    }

    // ========== 经验球生成 ==========

    /**
     * 生成经验球
     */
    private spawnExpBall(position: Vec3): void {
        const pool = ObjectPool.getInstance();
        let expBall = pool.get(POOL_KEYS.EXP_BALL, this.node);

        if (expBall) {
            const expScript = expBall.getComponent(ExpBall);
            if (expScript) {
                expScript.setFromPool(true);
                expScript.reset();
            }
            expBall.worldPosition = position;
        } else {
            if (!this.expBallPrefab) return;
            const newExpBall = instantiate(this.expBallPrefab);
            const expScript = newExpBall.getComponent(ExpBall);
            if (expScript) {
                expScript.setFromPool(false);
            }
            newExpBall.worldPosition = position;
            this.node.addChild(newExpBall);
        }
    }

    // ========== 事件回调 ==========

    private onGamePause(pause: boolean): void {
        // 波次管理器不需要特殊处理暂停逻辑
        // 暂停由 GameStateMachine 统一处理 deltaTime=0
    }

    private onSpawnBonusExp(position: Vec3): void {
        this.spawnExpBall(position);
    }

    private onEnemyDied(pos: Vec3, enemy?: Enemy): void {
        this.spawnExpBall(pos);

        if (this.waveState === 'active') {
            this.enemiesRemaining--;
            if (this.enemiesRemaining <= 0 && this.enemiesToSpawn <= 0) {
                this.onWaveComplete();
            }
        }
    }

    private onEnemySummon(data: { position: Vec3; count: number; parentEnemy: Enemy }): void {
        for (let i = 0; i < data.count; i++) {
            this.spawnMinion(data.position);
        }
    }

    private onEnemySplit(data: { position: Vec3; count: number; healthPercent: number }): void {
        const maxSplitCount = Math.min(data.count, 5);

        for (let i = 0; i < maxSplitCount; i++) {
            const enemy = this.spawnMinion(data.position);
            if (!enemy) continue;

            const enemyScript = enemy.getComponent(Enemy);
            if (!enemyScript) continue;

            enemyScript.setAsMinion(data.healthPercent);
        }
    }

    private onEnemyExplosion(data: { position: Vec3; radius: number; damage: number }): void {
        const playerPos = this.player?.worldPosition ?? new Vec3(0, 0, 0);
        const distance = Vec3.distance(playerPos, data.position);

        if (distance < data.radius) {
            EventBus.emit(EventNames.ENEMY_HIT_PLAYER, data.damage);
        }
    }

    // ========== 公开方法 ==========

    /**
     * 获取当前波次
     */
    public getCurrentWave(): number {
        return this.currentWave;
    }

    // ========== 更新循环 ==========

    update(deltaTime: number): void {
        if (!this.isGameRunning()) return;

        if (this.waveState === 'active') {
            this.updateActiveWave(deltaTime);
        } else if (this.waveState === 'break') {
            this.updateBreakWave(deltaTime);
        }
    }

    /**
     * 更新活跃波次（生成敌人）
     */
    private updateActiveWave(deltaTime: number): void {
        if (this.spawnCooldown > 0) {
            this.spawnCooldown -= deltaTime;
        }

        if (this.enemiesToSpawn > 0 && this.spawnCooldown <= 0) {
            const spawnCount = Math.min(this.maxSpawnPerFrame, this.enemiesToSpawn);
            for (let i = 0; i < spawnCount; i++) {
                this.spawnEnemy();
            }
            this.spawnCooldown = this.spawnInterval;
        }
    }

    /**
     * 更新休息波次（等待下一波）
     */
    private updateBreakWave(deltaTime: number): void {
        this.breakTimer -= deltaTime;
        if (this.breakTimer <= 0) {
            this.currentWave++;
            this.startWave();
        }
    }
}