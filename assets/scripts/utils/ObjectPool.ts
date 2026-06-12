// assets/scripts/utils/ObjectPool.ts

import { _decorator, Node, Prefab, instantiate } from 'cc';
import { IResettable, isResettable, getResettableComponent } from '../interfaces/IResettable';

const { ccclass, property } = _decorator;

/**
 * 池项接口
 */
interface PoolItem {
    node: Node;
    isActive: boolean;
}

/**
 * 池配置接口
 */
interface PoolConfig {
    prefab: Prefab;
    maxSize: number;
}

/**
 * 对象池（单例）
 * 支持自动扩容和组件状态重置
 */
export class ObjectPool {
    private static instance: ObjectPool;

    private pools: Map<string, PoolItem[]> = new Map();
    private prefabs: Map<string, Prefab> = new Map();
    private maxSizes: Map<string, number> = new Map();

    private readonly DEFAULT_MAX_SIZE = 100;

    private constructor() {}

    static getInstance(): ObjectPool {
        if (!ObjectPool.instance) {
            ObjectPool.instance = new ObjectPool();
        }
        return ObjectPool.instance;
    }

    // ========== 池管理 ==========

    /**
     * 注册对象池
     * @param key 池的唯一标识
     * @param prefab 预制体
     * @param maxSize 最大容量（默认 100）
     */
    public register(key: string, prefab: Prefab, maxSize: number = this.DEFAULT_MAX_SIZE): void {
        if (this.pools.has(key)) {
            console.warn(`[ObjectPool] 池已存在，将覆盖: ${key}`);
        }

        this.prefabs.set(key, prefab);
        this.maxSizes.set(key, maxSize);
        this.pools.set(key, []);
    }

    /**
     * 检查池是否已注册
     */
    public has(key: string): boolean {
        return this.pools.has(key);
    }

    /**
     * 获取池信息
     */
    public getInfo(key: string): { total: number; active: number; idle: number; maxSize: number } | null {
        const pool = this.pools.get(key);
        if (!pool) return null;

        const active = pool.filter(item => item.isActive).length;
        const maxSize = this.maxSizes.get(key) ?? this.DEFAULT_MAX_SIZE;

        return {
            total: pool.length,
            active: active,
            idle: pool.length - active,
            maxSize: maxSize
        };
    }

    // ========== 对象获取 ==========

    /**
     * 从池中获取对象
     * @param key 池标识
     * @param parent 父节点（可选）
     * @returns 节点实例，失败返回 null
     */
    public get(key: string, parent?: Node): Node | null {
        const pool = this.pools.get(key);
        if (!pool) {
            console.warn(`[ObjectPool] 池不存在: ${key}`);
            return null;
        }

        // 查找空闲对象
        const idleItem = pool.find(item => !item.isActive && item.node?.isValid);
        if (idleItem) {
            idleItem.isActive = true;
            idleItem.node.active = true;
            if (parent) {
                parent.addChild(idleItem.node);
            }
            return idleItem.node;
        }

        // 创建新对象
        return this.createNewObject(key, parent, pool);
    }

    /**
     * 创建新对象（自动扩容）
     */
    private createNewObject(key: string, parent: Node | undefined, pool: PoolItem[]): Node | null {
        const prefab = this.prefabs.get(key);
        if (!prefab) {
            console.warn(`[ObjectPool] 预制体不存在: ${key}`);
            return null;
        }

        const newNode = instantiate(prefab);
        if (parent) {
            parent.addChild(newNode);
        }

        pool.push({ node: newNode, isActive: true });
        return newNode;
    }

    // ========== 对象回收 ==========

    /**
     * 回收对象到池中
     * @param key 池标识
     * @param node 要回收的节点
     */
    public recycle(key: string, node: Node): void {
        if (!node || !node.isValid) return;

        const pool = this.pools.get(key);
        if (!pool) {
            node.destroy();
            return;
        }

        const maxSize = this.maxSizes.get(key) ?? this.DEFAULT_MAX_SIZE;
        const item = pool.find(i => i.node === node && i.isActive);

        if (item) {
            // 重置组件状态
            this.resetComponentState(node, key);

            // 重置节点状态
            item.isActive = false;
            item.node.active = false;
            item.node.removeFromParent();
            item.node.setPosition(0, 0, 0);
            item.node.setScale(1, 1, 1);
            return;
        }

        // 节点不在池中，尝试加入
        if (pool.length < maxSize) {
            this.resetComponentState(node, key);
            node.active = false;
            node.removeFromParent();
            node.setPosition(0, 0, 0);
            node.setScale(1, 1, 1);
            pool.push({ node: node, isActive: false });
        } else {
            node.destroy();
        }
    }

    /**
     * 重置组件状态（使用 IResettable 接口）
     */
    private resetComponentState(node: Node, key: string): void {
        const resettable = getResettableComponent(node);
        if (resettable) {
            resettable.reset();
            return;
        }

        // 备用：针对特定类型的重置（保持兼容）
        this.resetLegacyComponent(node, key);
    }

    /**
     * 备用重置方法（兼容旧代码）
     */
    private resetLegacyComponent(node: Node, key: string): void {
        switch (key) {
            case 'elementRing':
                const ring = node.getComponent('ElementRing');
                if (ring && typeof (ring as any).reset === 'function') {
                    (ring as any).reset();
                }
                break;
            // 其他类型可以在此添加
        }
    }

    // ========== 调试方法 ==========

    /**
     * 打印所有池状态
     */
    public printStatus(): void {
        console.log('[ObjectPool] ========== 池状态 ==========');
        for (const [key, pool] of this.pools) {
            const active = pool.filter(item => item.isActive).length;
            const maxSize = this.maxSizes.get(key) ?? this.DEFAULT_MAX_SIZE;
            console.log(`  ${key}: 总=${pool.length}, 使用中=${active}, 空闲=${pool.length - active}, 上限=${maxSize}`);
        }
    }

    /**
     * 清空所有池（场景切换时调用）
     */
    public clearAll(): void {
        for (const [key, pool] of this.pools) {
            for (const item of pool) {
                if (item.node && item.node.isValid) {
                    item.node.destroy();
                }
            }
        }
        this.pools.clear();
        this.prefabs.clear();
        this.maxSizes.clear();
    }
}