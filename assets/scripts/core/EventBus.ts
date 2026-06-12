// assets/scripts/core/EventBus.ts

import { EventTarget } from 'cc';

/**
 * 全局事件总线
 * 基于 Cocos Creator 的 EventTarget 实现
 * 
 * 使用方式：
 * // 发送事件
 * EventBus.emit(EventNames.PLAYER_LEVEL_UP, { level: 2 });
 * 
 * // 监听事件
 * EventBus.on(EventNames.PLAYER_LEVEL_UP, (data) => {
 *     console.log('玩家升级到', data.level);
 * }, this);
 * 
 * // 移除监听
 * EventBus.off(EventNames.PLAYER_LEVEL_UP, callback, this);
 */
export const EventBus = new EventTarget();