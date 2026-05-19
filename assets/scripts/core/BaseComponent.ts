import { _decorator, Component } from 'cc';
import { ServiceLocator } from './ServiceLocator';
import { GameState, GameStateMachine } from './GameStateMachine';
const { ccclass } = _decorator;

/**
 * 组件基类
 * 提供便捷的服务访问方法
 */
@ccclass('BaseComponent')
export class BaseComponent extends Component {
    /**
     * 获取服务
     */
    protected getService<T>(key: string): T | null {
        return ServiceLocator.getInstance().get<T>(key);
    }

    /**
     * 获取服务（必须存在）
     */
    protected getServiceOrThrow<T>(key: string): T {
        return ServiceLocator.getInstance().getOrThrow<T>(key);
    }

    /**
     * 获取状态机
     */
    protected getStateMachine(): GameStateMachine {
        return this.getServiceOrThrow<GameStateMachine>('stateMachine');
    }

    /**
     * 判断游戏是否运行中
     */
    protected isGameRunning(): boolean {
        const sm = this.getStateMachine();
        return sm.getState() === GameState.RUNNING
    }

    /**
     * 判断是否暂停
     */
    protected isGamePaused(): boolean {
        return this.getStateMachine().isPaused();
    }
}


