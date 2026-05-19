import { _decorator, Node, Prefab, instantiate } from 'cc';

const { ccclass, property } = _decorator;

interface PoolItem {
    node: Node
    isActive: boolean
}

/**
 * 对象池 - 支持自动扩容
 */
export class ObjectPool {
    private static instance: ObjectPool
    private pools: Map<string, PoolItem[]> = new Map()
    private prefabs: Map<string, Prefab> = new Map()
    private maxSizes: Map<string, number> = new Map()
    private defaultMaxSize: number = 100

    private constructor() {}

    static getInstance(): ObjectPool {
        if (!ObjectPool.instance) {
            ObjectPool.instance = new ObjectPool()
        }
        return ObjectPool.instance
    }

    /**
     * 注册对象池
     * @param key 池标识
     * @param prefab 预制体
     * @param maxSize 最大数量（超过时直接销毁，不警告）
     */
    public register(key: string, prefab: Prefab, maxSize: number = 100) {
        this.prefabs.set(key, prefab)
        this.maxSizes.set(key, maxSize)
        this.pools.set(key, [])
        console.log(`[ObjectPool] 注册池: ${key}, 最大容量: ${maxSize}`)
    }

    /**
     * 从池中获取对象
     * 如果池为空，动态创建
     * 如果池已满但有空闲对象，返回空闲对象
     */
    public get(key: string, parent?: Node): Node | null {
        const pool = this.pools.get(key)
        if (!pool) {
            console.warn(`[ObjectPool] 池不存在: ${key}`)
            return null
        }

        // 查找空闲对象
        for (let i = 0; i < pool.length; i++) {
            const item = pool[i]
            if (!item.isActive && item.node && item.node.isValid) {
                item.isActive = true
                item.node.active = true
                if (parent) {
                    parent.addChild(item.node)
                }
                return item.node
            }
        }

        // 没有空闲对象，动态创建新对象
        const prefab = this.prefabs.get(key)
        if (!prefab) {
            console.warn(`[ObjectPool] 预制体不存在: ${key}`)
            return null
        }

        const newNode = instantiate(prefab)
        if (parent) {
            parent.addChild(newNode)
        }
        
        // 加入池中（标记为使用中）
        pool.push({ node: newNode, isActive: true })
        
        return newNode
    }

    /**
     * 回收对象到池中
     * 如果池已满，直接销毁节点
     */
    public recycle(key: string, node: Node): void {
        if (!node || !node.isValid) return

        const pool = this.pools.get(key)
        if (!pool) {
            node.destroy()
            return
        }

        const maxSize = this.maxSizes.get(key) || this.defaultMaxSize
        
        // 查找并标记为空闲
        for (let i = 0; i < pool.length; i++) {
            const item = pool[i]
            if (item.node === node && item.isActive) {
                item.isActive = false
                item.node.active = false
                item.node.removeFromParent()
                
                // 重置节点状态
                item.node.setPosition(0, 0, 0)
                item.node.setScale(1, 1, 1)
                return
            }
        }

        // 节点不在池中，根据容量决定是否加入
        if (pool.length < maxSize) {
            node.active = false
            node.removeFromParent()
            node.setPosition(0, 0, 0)
            node.setScale(1, 1, 1)
            pool.push({ node: node, isActive: false })
        } else {
            // 池已满，直接销毁
            node.destroy()
        }
    }

    /**
     * 获取池信息（调试用）
     */
    public getInfo(key: string): { total: number, active: number, idle: number, maxSize: number } | null {
        const pool = this.pools.get(key)
        if (!pool) return null
        
        const active = pool.filter(item => item.isActive).length
        const maxSize = this.maxSizes.get(key) || this.defaultMaxSize
        
        return {
            total: pool.length,
            active: active,
            idle: pool.length - active,
            maxSize: maxSize
        }
    }

    /**
     * 打印所有池状态
     */
    public printStatus(): void {
        console.log('[ObjectPool] ========== 池状态 ==========')
        for (const [key, pool] of this.pools) {
            const active = pool.filter(item => item.isActive).length
            const maxSize = this.maxSizes.get(key) || this.defaultMaxSize
            console.log(`  ${key}: 总=${pool.length}, 使用中=${active}, 空闲=${pool.length - active}, 上限=${maxSize}`)
        }
    }
}