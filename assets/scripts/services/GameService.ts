// assets/scripts/services/GameService.ts

import { _decorator, Component, Node } from 'cc';
import { ServiceLocator } from '../core/ServiceLocator';
import { GameState, GameStateMachine } from '../core/GameStateMachine';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';
import { CombatService } from './CombatService';
import { SkillService } from './SkillService';
import { TriggerSystem } from '../Managers/TriggerSystem';
import { GameContext } from '../core/GameContext';

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

    private gameStateMachine: GameStateMachine | null = null;
    private isInitialized: boolean = false;

    // ========== 生命周期 ==========

    protected onLoad() {
        GameService.instance = this;
    }

    protected start() {
        this.initializeServices();
    }

    protected onDestroy() {
        this.unregisterServices();
    }

    static getInstance(): GameService | null {
        return GameService.instance;
    }

    // ========== 服务初始化 ==========

    private initializeServices(): void {
        if (this.isInitialized) return;

        // 1. 初始化 GameStateMachine（纯单例）
        this.initStateMachine();

        // 2. 注册服务到 ServiceLocator
        this.registerServices();

        // 3. 注册节点引用
        this.registerNodeReferences();

        // 4. 注册玩家
        this.registerPlayer();

        // 5. 初始化子系统
        this.initSubsystems();

        this.isInitialized = true;

        // 6. 触发游戏就绪事件
        EventBus.emit(EventNames.GAME_READY);

        // 7. 自动启动游戏
        this.autoStartGame();
    }

    private initStateMachine(): void {
        this.gameStateMachine = GameStateMachine.getInstance();
        this.gameStateMachine.init();
        this.gameStateMachine.reset();
    }

    private registerServices(): void {
        const serviceLocator = ServiceLocator.getInstance();
        
        serviceLocator.register('stateMachine', this.gameStateMachine);
        serviceLocator.register('gameService', this);
    }

    private registerNodeReferences(): void {
        const canvas = this.node.scene.getChildByName('Canvas');
        if (canvas) {
            ServiceLocator.getInstance().register('canvasNode', canvas);
        }
    }

    private registerPlayer(): void {
        if (!this.playerNode) return;

        const serviceLocator = ServiceLocator.getInstance();
        
        serviceLocator.register('playerNode', this.playerNode);
        
        const playerController = this.playerNode.getComponent('PlayerController');
        if (playerController) {
            serviceLocator.register('player', playerController);
        }
    }

    private initSubsystems(): void {
        const triggerSystem = TriggerSystem.getInstance();
        ServiceLocator.getInstance().register('triggerSystem', triggerSystem);

        CombatService.getInstance().init();
        SkillService.getInstance().init();
    }

    private unregisterServices(): void {
        const serviceLocator = ServiceLocator.getInstance();
        
        serviceLocator.unregister('stateMachine');
        serviceLocator.unregister('gameService');
        serviceLocator.unregister('canvasNode');
        serviceLocator.unregister('playerNode');
        serviceLocator.unregister('player');
        serviceLocator.unregister('triggerSystem');
        
        const triggerSystem = TriggerSystem.getInstance();
        triggerSystem.destroy();
    }

    // ========== 游戏启动控制 ==========

    private autoStartGame(): void {
        const gameContext = GameContext.getInstance();
        
        if (gameContext.isSingleMode()) {
            this.startSinglePlayer();
        } else if (gameContext.isMultiMode()) {
            this.startMultiPlayer();
        }
    }

    public startSinglePlayer(): void {
        if (!this.isInitialized) return;
        
        this.gameStateMachine?.startGame();
    }

    public startMultiPlayer(): void {
        if (!this.isInitialized) return;
        
        this.gameStateMachine?.transitionTo(GameState.WAITING_ROOM);
    }

    // ========== 游戏状态控制 ==========

    public endGame(): void {
        this.gameStateMachine?.gameOver();
    }

    public resetGame(): void {
        EventBus.emit(EventNames.GAME_RESET);
        this.gameStateMachine?.reset();
        this.gameStateMachine?.transitionTo(GameState.MENU);
    }

    public pauseGame(): void {
        this.gameStateMachine?.pause();
    }

    public resumeGame(): void {
        this.gameStateMachine?.resume();
    }

    // ========== 查询方法 ==========

    public getStateMachine(): GameStateMachine | null {
        return this.gameStateMachine;
    }

    public isGameRunning(): boolean {
        return this.gameStateMachine?.getState() === GameState.RUNNING;
    }

    public isGamePaused(): boolean {
        return this.gameStateMachine?.isPaused() ?? false;
    }

    public isReady(): boolean {
        return this.isInitialized;
    }
}