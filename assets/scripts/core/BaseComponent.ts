// assets/scripts/core/BaseComponent.ts

import { _decorator, Component } from 'cc';
import { ServiceLocator } from './ServiceLocator';
import { GameState, GameStateMachine } from './GameStateMachine';

const { ccclass } = _decorator;

/**
 * 组件基类
 * 提供便捷的服务访问方法
 * 
 * @example
 * @ccclass('MyComponent')
 * export class MyComponent extends BaseComponent {
 *     start() {
 *         const player = this.getService<IPlayer>('player');
 *         const isRunning = this.isGameRunning();
 *     }
 * }
 */
@ccclass('BaseComponent')
export class BaseComponent extends Component {
    
    // ========== 服务访问 ==========

    /**
     * 获取服务实例
     * @param key 服务唯一标识
     * @returns 服务实例，不存在则返回 null
     */
    protected getService<T>(key: string): T | null {
        return ServiceLocator.getInstance().get<T>(key);
    }

    /**
     * 获取服务实例（必须存在）
     * @param key 服务唯一标识
     * @returns 服务实例
     * @throws 如果服务不存在则抛出错误
     */
    protected getServiceOrThrow<T>(key: string): T {
        return ServiceLocator.getInstance().getOrThrow<T>(key);
    }

    /**
     * 检查服务是否已注册
     * @param key 服务唯一标识
     */
    protected hasService(key: string): boolean {
        return ServiceLocator.getInstance().has(key);
    }

    // ========== 状态机访问 ==========

    /**
     * 获取游戏状态机
     */
    protected getStateMachine(): GameStateMachine {
        return this.getServiceOrThrow<GameStateMachine>('stateMachine');
    }

    /**
     * 获取当前游戏状态
     */
    protected getGameState(): GameState {
        return this.getStateMachine().getState();
    }

    // ========== 状态判断 ==========

    /**
     * 判断游戏是否运行中
     */
    protected isGameRunning(): boolean {
        return this.getStateMachine().getState() === GameState.RUNNING;
    }

    /**
     * 判断游戏是否暂停
     */
    protected isGamePaused(): boolean {
        return this.getStateMachine().isPaused();
    }

    /**
     * 判断是否在菜单界面
     */
    protected isInMenu(): boolean {
        return this.getStateMachine().getState() === GameState.MENU;
    }

    /**
     * 判断游戏是否结束
     */
    protected isGameOver(): boolean {
        return this.getStateMachine().getState() === GameState.GAME_OVER;
    }

    /**
     * 判断是否在升级选择状态
     */
    protected isLevelingUp(): boolean {
        return this.getStateMachine().getState() === GameState.LEVEL_UP;
    }
}