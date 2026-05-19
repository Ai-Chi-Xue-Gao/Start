import { _decorator, Component, Prefab } from 'cc';
import { ObjectPool } from './ObjectPool';

const { ccclass, property } = _decorator;

@ccclass('PoolManager')
export class PoolManager extends Component {
    @property(Prefab)
    fireballPrefab: Prefab = null

    @property(Prefab)
    expBallPrefab: Prefab = null

    @property(Prefab)
    explosionPrefab: Prefab = null

    @property(Prefab)
    waterTrailPrefab: Prefab = null

    @property(Prefab)
    skillItemPrefab: Prefab = null

    @property(Prefab)
    enemyPrefab: Prefab = null

    private static instance: PoolManager

    start() {
        PoolManager.instance = this
        this.registerAllPools()
    }

    private registerAllPools() {
        const pool = ObjectPool.getInstance()

        if (this.fireballPrefab) {
            pool.register('fireball', this.fireballPrefab, 100)
        }
        if (this.expBallPrefab) {
            pool.register('expBall', this.expBallPrefab, 200)
        }
        if (this.explosionPrefab) {
            pool.register('explosion', this.explosionPrefab, 50)
        }
        if (this.waterTrailPrefab) {
            pool.register('waterTrail', this.waterTrailPrefab, 50)
        }
        if (this.skillItemPrefab) {
            pool.register('skillItem', this.skillItemPrefab, 30)
        }
        if (this.enemyPrefab) {
            pool.register('enemy', this.enemyPrefab, 200)      // 大怪池
            pool.register('enemy_minion', this.enemyPrefab, 100) // 小怪独立池
        }

        console.log('[PoolManager] 所有对象池注册完成')
    }

    static getInstance(): PoolManager {
        return PoolManager.instance
    }
}