import { _decorator, Component, Node } from 'cc';
import { ServiceLocator } from '../core/ServiceLocator';
import { GameState, GameStateMachine } from '../core/GameStateMachine';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';
import { CombatService } from './CombatService';
import { SkillService } from './SkillService';

const { ccclass, property } = _decorator;

/**
 * 游戏服务
 * 负责：服务注册、游戏启动、模块协调
 */
@ccclass('GameService')
export class GameService extends Component {
    private static instance: GameService;

    @property(Node)
    playerNode: Node = null;

    private gameStateMachine: GameStateMachine = null;
    private isInitialized: boolean = false;

    protected onLoad() {
        GameService.instance = this;
    }

    protected start() {
        this.initializeServices();
    }

    static getInstance(): GameService {
        return GameService.instance;
    }

    /**
     * 初始化所有服务
     */
    private initializeServices() {
        if (this.isInitialized) return;

        // 1. 获取或添加 GameStateMachine
        this.gameStateMachine = this.getComponent(GameStateMachine);
        if (!this.gameStateMachine) {
            this.gameStateMachine = this.addComponent(GameStateMachine);
        }

        // 2. 注册服务到 ServiceLocator
        ServiceLocator.getInstance().register('stateMachine', this.gameStateMachine);
        ServiceLocator.getInstance().register('gameService', this);

        // 3. 注册玩家
        if (this.playerNode) {
            ServiceLocator.getInstance().register('playerNode', this.playerNode);
            const playerController = this.playerNode.getComponent('PlayerController');
            if (playerController) {
                ServiceLocator.getInstance().register('playerController', playerController);
            }
        }

        // 4. 初始化 CombatService 和 SkillService
        CombatService.getInstance().init();
        SkillService.getInstance().init();

        this.isInitialized = true;
        console.log('[GameService] 所有服务注册完成');

        // 5. 触发游戏就绪事件
        EventBus.emit(EventNames.GAME_READY);
    }

    /**
     * 开始游戏（单机模式）
     */
    public startSinglePlayer() {
        if (!this.isInitialized) {
            console.warn('[GameService] 服务未初始化完成');
            return;
        }

        this.gameStateMachine.startGame();
        console.log('[GameService] 单机游戏开始');
    }

    /**
     * 开始联机模式
     */
    public startMultiPlayer() {
        if (!this.isInitialized) {
            console.warn('[GameService] 服务未初始化完成');
            return;
        }

        this.gameStateMachine.transitionTo(GameState.WAITING_ROOM);
        console.log('[GameService] 联机模式，等待房间...');
    }

    /**
     * 结束游戏
     */
    public endGame() {
        this.gameStateMachine.gameOver();
    }

    /**
     * 重置游戏（用于重试）
     */
    public resetGame() {
        EventBus.emit(EventNames.GAME_RESET);
        this.gameStateMachine.transitionTo(GameState.MENU);
        console.log('[GameService] 游戏已重置');
    }

    /**
     * 获取游戏状态机
     */
    public getStateMachine(): GameStateMachine {
        return this.gameStateMachine;
    }

    /**
     * 检查游戏是否运行中
     */
    public isGameRunning(): boolean {
        const stateMachine = ServiceLocator.getInstance().get<GameStateMachine>('stateMachine');
        return stateMachine?.getState() === GameState.RUNNING;
    }
}