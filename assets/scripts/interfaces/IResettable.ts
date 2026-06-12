// assets/scripts/interfaces/IResettable.ts

import { Node } from 'cc';

/**
 * 可重置接口
 * 用于对象池中的对象，在回收前重置状态
 */
export interface IResettable {
    /** 重置组件状态到初始值 */
    reset(): void;
}

/**
 * 类型守卫：检查对象是否实现了 IResettable 接口
 */
export function isResettable(obj: any): obj is IResettable {
    return obj && typeof obj.reset === 'function';
}

/**
 * 从节点获取可重置组件
 * 尝试从节点上获取实现了 IResettable 接口的组件
 */
export function getResettableComponent(node: Node): IResettable | null {
    if (!node || !node.isValid) return null;
    
    // 检查 ElementRing
    const elementRing = node.getComponent('ElementRing') as any;
    if (elementRing && isResettable(elementRing)) return elementRing;
    
    // 可以继续添加其他类型
    // const genericArea = node.getComponent('GenericArea') as any;
    // if (genericArea && isResettable(genericArea)) return genericArea;
    
    return null;
}