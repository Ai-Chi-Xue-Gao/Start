// assets/scripts/core/GameStateMachine.ts

import { _decorator, Component, director } from 'cc';
import { EventBus } from './EventBus';
import { EventNames } from '../utils/EventNames';
import { ServiceLocator } from './ServiceLocator';

const { ccclass } = _decorator;

/**
 * 游戏状态枚举
 */
export enum GameState {
    MENU,           // 主菜单
    WAITING_ROOM,   // 联机等待房间
    RUNNING,        // 游戏中
    LEVEL_UP,       // 升级选择技能（暂停状态）
    PAUSED,         // 手动暂停
    GAME_OVER       // 游戏结束
}

/**
 * 状态变更事件
 */
export interface StateChangeEvent {
    from: GameState;
    to: GameState;
}

/**
 * 游戏状态机
 * 职责：
 * - 管理游戏状态流转
 * - 自动处理 Time.timeScale（暂停相关状态）
 * - 触发状态变更事件，供其他模块监听
 * - 统一发射 GAME_PAUSE 事件，通知所有组件
 */
@ccclass('GameStateMachine')
export class GameStateMachine extends Component {
    private static instance: GameStateMachine;
    private currentState: GameState = GameState.MENU;
    private listeners: Map<GameState, Array<(event: StateChangeEvent) => void>> = new Map();
    private pausedStates: Set<GameState>;

    constructor() {
        super();
        // ✅ 在构造函数中初始化，避免为 null
        this.pausedStates = new Set([
            GameState.LEVEL_UP,
            GameState.PAUSED,
            GameState.GAME_OVER
        ]);
    }

    protected onLoad() {
        GameStateMachine.instance = this;
        
        // ✅ 注册到 ServiceLocator，确保其他组件可以获取
        ServiceLocator.getInstance().register('stateMachine', this, true);
    }

    protected onDestroy() {
        // ✅ 场景销毁时清理静态实例
        if (GameStateMachine.instance === this) {
            GameStateMachine.instance = null;
        }
        
        // ✅ 从 ServiceLocator 中移除
        ServiceLocator.getInstance().unregister('stateMachine');
    }

    protected start() {
        this.transitionTo(GameState.MENU);
    }

    static getInstance(): GameStateMachine {
        return GameStateMachine.instance;
    }

    /**
     * 获取当前状态
     */
    getState(): GameState {
        return this.currentState;
    }

    /**
     * 判断当前是否处于暂停状态（游戏逻辑不应更新）
     */
    isPaused(): boolean {
        // ✅ 添加空值保护
        if (!this.pausedStates) {
            console.warn('[GameStateMachine] pausedStates 未初始化');
            return false;
        }
        return this.pausedStates.has(this.currentState);
    }

    /**
     * 状态切换
     * @param newState 目标状态
     * @returns 是否切换成功
     */
    transitionTo(newState: GameState): boolean {
        if (this.currentState === newState) {
            return false;
        }

        // 检查状态转换是否合法
        if (!this.isValidTransition(this.currentState, newState)) {
            console.warn(`[StateMachine] 非法状态转换: ${GameState[this.currentState]} -> ${GameState[newState]}`);
            return false;
        }

        const oldState = this.currentState;
        const event: StateChangeEvent = { from: oldState, to: newState };

        // 执行状态退出逻辑
        this.onExitState(oldState, newState);

        // 切换状态
        this.currentState = newState;

        // 处理时间缩放（会同时发射 GAME_PAUSE 事件）
        this.updateTimeScale();

        // 执行状态进入逻辑
        this.onEnterState(newState, oldState);

        // 触发事件通知
        this.notifyListeners(event);

        console.log(`[StateMachine] 状态切换: ${GameState[oldState]} -> ${GameState[newState]}`);

        return true;
    }

    /**
     * 便捷方法：切换运行中
     */
    startGame() {
        this.transitionTo(GameState.RUNNING);
    }

    /**
     * 便捷方法：暂停游戏
     */
    pause() {
        if (this.currentState === GameState.RUNNING) {
            this.transitionTo(GameState.PAUSED);
        }
    }

    /**
     * 便捷方法：恢复游戏
     */
    resume() {
        if (this.currentState === GameState.PAUSED) {
            this.transitionTo(GameState.RUNNING);
        }
    }

    /**
     * 便捷方法：进入升级选技能状态
     */
    enterLevelUp() {
        if (this.currentState === GameState.RUNNING) {
            this.transitionTo(GameState.LEVEL_UP);
        }
    }

    /**
     * 便捷方法：退出升级状态
     */
    exitLevelUp() {
        if (this.currentState === GameState.LEVEL_UP) {
            this.transitionTo(GameState.RUNNING);
        }
    }

    /**
     * 便捷方法：游戏结束
     */
    gameOver() {
        this.transitionTo(GameState.GAME_OVER);
    }

    /**
     * 监听状态变更
     */
    onStateChange(state: GameState, callback: (event: StateChangeEvent) => void) {
        if (!this.listeners.has(state)) {
            this.listeners.set(state, []);
        }
        this.listeners.get(state)!.push(callback);
    }

    /**
     * 移除监听
     */
    offStateChange(state: GameState, callback: (event: StateChangeEvent) => void) {
        const callbacks = this.listeners.get(state);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * 检查状态转换合法性
     */
    private isValidTransition(from: GameState, to: GameState): boolean {
        // 定义合法转换表
        const validTransitions: Record<GameState, GameState[]> = {
            [GameState.MENU]: [GameState.WAITING_ROOM, GameState.RUNNING],
            [GameState.WAITING_ROOM]: [GameState.RUNNING, GameState.MENU],
            [GameState.RUNNING]: [GameState.LEVEL_UP, GameState.PAUSED, GameState.GAME_OVER],
            [GameState.LEVEL_UP]: [GameState.RUNNING],
            [GameState.PAUSED]: [GameState.RUNNING, GameState.MENU],
            [GameState.GAME_OVER]: [GameState.MENU]
        };

        const allowed = validTransitions[from];
        return allowed ? allowed.includes(to) : false;
    }

    /**
     * 状态退出时的处理
     */
    private onExitState(state: GameState, nextState: GameState) {
        switch (state) {
            case GameState.LEVEL_UP:
                break;
            case GameState.PAUSED:
                break;
        }
    }

    /**
     * 状态进入时的处理
     */
    private onEnterState(state: GameState, prevState: GameState) {
        switch (state) {
            case GameState.LEVEL_UP:
                break;
            case GameState.GAME_OVER:
                break;
            case GameState.MENU:
                break;
        }
    }

    /**
     * 根据状态更新时间缩放，并发射暂停事件
     */
    private updateTimeScale() {
        // ✅ 添加空值保护
        if (!this.pausedStates) {
            return;
        }
        
        const shouldPause = this.pausedStates.has(this.currentState);
        
        // 添加空值检查，防止场景销毁时 director.getScheduler() 返回 null
        const scheduler = director.getScheduler();
        if (scheduler) {
            scheduler.setTimeScale(shouldPause ? 0 : 1);
        }
        
        // 发射暂停事件，通知所有监听 GAME_PAUSE 的组件
        EventBus.emit(EventNames.GAME_PAUSE, shouldPause);
    }

    /**
     * 通知所有监听器
     */
    private notifyListeners(event: StateChangeEvent) {
        const callbacks = this.listeners.get(event.to);
        if (callbacks) {
            callbacks.forEach(cb => cb(event));
        }
    }
}