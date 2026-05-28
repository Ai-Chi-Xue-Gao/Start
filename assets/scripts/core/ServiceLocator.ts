// assets/scripts/core/ServiceLocator.ts

/**
 * 服务定位器（依赖注入容器）
 * 职责：
 * - 注册服务实例
 * - 获取服务实例
 * - 支持懒加载工厂函数
 * 
 * 使用方式：
 * 1. 在 GameManager 或入口脚本中注册服务：
 *    ServiceLocator.register('combatService', combatServiceInstance)
 * 
 * 2. 在任何地方获取服务：
 *    const combat = ServiceLocator.get<CombatService>('combatService')
 */
export class ServiceLocator {
    private static instance: ServiceLocator;
    private services: Map<string, any> = new Map();
    private factories: Map<string, () => any> = new Map();

    private constructor() { }

    static getInstance(): ServiceLocator {
        if (!ServiceLocator.instance) {
            ServiceLocator.instance = new ServiceLocator();
        }
        return ServiceLocator.instance;
    }

    /**
     * 注册服务实例（单例模式）
     * @param key 服务唯一标识
     * @param instance 服务实例
     * @param force 是否强制覆盖（默认 false，已存在时警告但不覆盖）
     */
    register<T>(key: string, instance: T, force: boolean = true): boolean {
        if (this.services.has(key)) {
            if (force) {
                console.log(`[ServiceLocator] 服务 ${key} 已存在，强制覆盖`);
                this.services.set(key, instance);
                return true;
            } else {
                console.log(`[ServiceLocator] 服务 ${key} 已存在，跳过注册`);
                return false;
            }
        }
        this.services.set(key, instance);
        return true;
    }

    /**
     *  安全注册（仅在不存在时注册）
     * @param key 服务唯一标识
     * @param instance 服务实例
     * @returns 是否注册成功
     */
    registerIfNotExist<T>(key: string, instance: T): boolean {
        if (this.services.has(key)) {
            console.log(`[ServiceLocator] 服务 ${key} 已存在，跳过注册`);
            return false;
        }
        this.services.set(key, instance);
        console.log(`[ServiceLocator] 服务 ${key} 注册成功`);
        return true;
    }

    /**
     * 注册服务工厂函数（懒加载）
     * @param key 服务唯一标识
     * @param factory 工厂函数，首次获取时调用
     */
    registerFactory<T>(key: string, factory: () => T): void {
        if (this.factories.has(key)) {
            console.warn(`[ServiceLocator] 服务工厂 ${key} 已存在，将被覆盖`);
        }
        this.factories.set(key, factory);
    }

    /**
     * 获取服务实例
     * @param key 服务唯一标识
     * @returns 服务实例，不存在则返回 null
     */
    get<T>(key: string): T | null {
        // 优先返回已注册的实例
        if (this.services.has(key)) {
            return this.services.get(key) as T;
        }

        // 尝试通过工厂创建
        if (this.factories.has(key)) {
            const factory = this.factories.get(key)!;
            const instance = factory();
            this.services.set(key, instance);
            return instance as T;
        }

        console.error(`[ServiceLocator] 服务 ${key} 未注册`);
        return null;
    }

    /**
     * 获取服务实例（必须存在，否则抛出错误）
     * @param key 服务唯一标识
     * @returns 服务实例
     * @throws 如果服务不存在
     */
    getOrThrow<T>(key: string): T {
        const service = this.get<T>(key);
        if (!service) {
            throw new Error(`[ServiceLocator] 必需的服务 ${key} 未注册`);
        }
        return service;
    }

    /**
     * 检查服务是否已注册
     */
    has(key: string): boolean {
        return this.services.has(key) || this.factories.has(key);
    }

    /**
     * 移除服务
     */
    unregister(key: string): void {
        this.services.delete(key);
        this.factories.delete(key);
    }

    /**
     * 清空所有服务（用于测试或重新初始化）
     */
    clear(): void {
        this.services.clear();
        this.factories.clear();
    }
}