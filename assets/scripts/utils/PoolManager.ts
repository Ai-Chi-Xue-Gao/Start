// assets/scripts/utils/PoolManager.ts

import { _decorator, Prefab } from 'cc';
import { BaseComponent } from '../core/BaseComponent';
import { ObjectPool } from '../utils/ObjectPool';

const { ccclass, property } = _decorator;

/**
 * 对象池管理器
 * 负责注册和管理所有对象池
 */
@ccclass('PoolManager')
export class PoolManager extends BaseComponent {
    private static instance: PoolManager;

    // ========== 预制体引用 ==========
    @property(Prefab)
    expBallPrefab: Prefab = null;           // 经验球

    @property(Prefab)
    skillItemPrefab: Prefab = null;         // 技能面板项

    @property(Prefab)
    enemyPrefab: Prefab = null;             // 敌人

    @property(Prefab)
    elementRingPrefab: Prefab = null;       // 五行环

    // ========== 池配置 ==========
    private readonly POOL_CONFIGS = {
        expBall: { key: 'expBall', maxSize: 200 },
        skillItem: { key: 'skillItem', maxSize: 30 },
        enemy: { key: 'enemy', maxSize: 200 },
        enemyMinion: { key: 'enemy_minion', maxSize: 100 },
        elementRing: { key: 'elementRing', maxSize: 50 }
    } as const;

    // ========== 生命周期 ==========

    start() {
        PoolManager.instance = this;
        this.registerAllPools();
    }

    // ========== 池注册 ==========

    private registerAllPools(): void {
        const pool = ObjectPool.getInstance();

        this.registerExpBallPool(pool);
        this.registerSkillItemPool(pool);
        this.registerEnemyPools(pool);
        this.registerElementRingPool(pool);

        console.log('[PoolManager] 所有对象池注册完成');
    }

    private registerExpBallPool(pool: ObjectPool): void {
        if (this.expBallPrefab) {
            pool.register(this.POOL_CONFIGS.expBall.key, this.expBallPrefab, this.POOL_CONFIGS.expBall.maxSize);
        }
    }

    private registerSkillItemPool(pool: ObjectPool): void {
        if (this.skillItemPrefab) {
            pool.register(this.POOL_CONFIGS.skillItem.key, this.skillItemPrefab, this.POOL_CONFIGS.skillItem.maxSize);
        }
    }

    private registerEnemyPools(pool: ObjectPool): void {
        if (this.enemyPrefab) {
            pool.register(this.POOL_CONFIGS.enemy.key, this.enemyPrefab, this.POOL_CONFIGS.enemy.maxSize);
            pool.register(this.POOL_CONFIGS.enemyMinion.key, this.enemyPrefab, this.POOL_CONFIGS.enemyMinion.maxSize);
        }
    }

    private registerElementRingPool(pool: ObjectPool): void {
        if (this.elementRingPrefab) {
            pool.register(this.POOL_CONFIGS.elementRing.key, this.elementRingPrefab, this.POOL_CONFIGS.elementRing.maxSize);
        }
    }

    // ========== 获取方法 ==========

    public getElementRingPrefab(): Prefab | null {
        return this.elementRingPrefab;
    }

    public getEnemyPrefab(): Prefab | null {
        return this.enemyPrefab;
    }

    public getExpBallPrefab(): Prefab | null {
        return this.expBallPrefab;
    }

    // ========== 静态方法 ==========

    static getInstance(): PoolManager {
        return PoolManager.instance;
    }
}