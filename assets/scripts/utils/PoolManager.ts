// assets/scripts/managers/PoolManager.ts

import { _decorator, Prefab } from 'cc';
import { BaseComponent } from '../core/BaseComponent';
import { ObjectPool } from '../utils/ObjectPool';

const { ccclass, property } = _decorator;

@ccclass('PoolManager')
export class PoolManager extends BaseComponent {
    // ========== 仍在使用的预制体 ==========
    @property(Prefab)
    expBallPrefab: Prefab = null;           // 经验球

    @property(Prefab)
    explosionPrefab: Prefab = null;         // 爆炸特效

    @property(Prefab)
    skillItemPrefab: Prefab = null;         // 技能面板项

    @property(Prefab)
    enemyPrefab: Prefab = null;             // 敌人

    // ========== 通用技能预制体 ==========
    @property(Prefab)
    genericProjectilePrefab: Prefab = null; // 通用投射物（火球）

    @property(Prefab)
    genericAreaPrefab: Prefab = null;       // 通用范围特效

    @property(Prefab)
    genericSummonPrefab: Prefab = null;     // 通用召唤物

    private static instance: PoolManager

    start() {
        PoolManager.instance = this
        this.registerAllPools()
    }

    private registerAllPools() {
        const pool = ObjectPool.getInstance()

        // 经验球
        if (this.expBallPrefab) {
            pool.register('expBall', this.expBallPrefab, 200)
        }

        // 爆炸特效
        if (this.explosionPrefab) {
            pool.register('explosion', this.explosionPrefab, 50)
        }

        // 技能面板项
        if (this.skillItemPrefab) {
            pool.register('skillItem', this.skillItemPrefab, 30)
        }

        // 敌人
        if (this.enemyPrefab) {
            pool.register('enemy', this.enemyPrefab, 200)
            pool.register('enemy_minion', this.enemyPrefab, 100)
        }

        // ========== 通用技能对象池注册 ==========
        if (this.genericProjectilePrefab) {
            pool.register('genericProjectile', this.genericProjectilePrefab, 100)
            console.log('[PoolManager] 通用投射物池已注册')
        }
        if (this.genericAreaPrefab) {
            pool.register('genericArea', this.genericAreaPrefab, 50)
            console.log('[PoolManager] 通用范围特效池已注册')
        }
        if (this.genericSummonPrefab) {
            pool.register('genericSummon', this.genericSummonPrefab, 30)
            console.log('[PoolManager] 通用召唤物池已注册')
        }

        console.log('[PoolManager] 所有对象池注册完成')
    }

    // ========== 获取预制体（供 SkillFactory 使用）==========
    public getGenericProjectilePrefab(): Prefab | null {
        return this.genericProjectilePrefab
    }

    public getGenericAreaPrefab(): Prefab | null {
        return this.genericAreaPrefab
    }

    public getGenericSummonPrefab(): Prefab | null {
        return this.genericSummonPrefab
    }

    static getInstance(): PoolManager {
        return PoolManager.instance
    }
}