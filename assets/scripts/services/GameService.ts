// assets/scripts/services/GameService.ts

import { _decorator, Component, Node, assetManager, resources } from 'cc';
import { ServiceLocator } from '../core/ServiceLocator';
import { GameState, GameStateMachine } from '../core/GameStateMachine';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';
import { CombatService } from './CombatService';
import { SkillService } from './SkillService';
import { TriggerSystem } from '../Managers/TriggerSystem';

const { ccclass, property } = _decorator;

/**
 * 游戏模式枚举
 */
export enum GameMode {
    SINGLE = 'single',
    MULTI = 'multi'
}

/**
 * 游戏服务
 */
@ccclass('GameService')
export class GameService extends Component {
    private static instance: GameService;

    @property(Node)
    playerNode: Node = null;

    private gameStateMachine: GameStateMachine = null;
    private isInitialized: boolean = false;
    private gameMode: GameMode = GameMode.SINGLE;
    private bundlesLoaded: boolean = false;

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
     * 预加载所有分包（在游戏启动前调用）
     */
    public async preloadBundles(): Promise<boolean> {
        if (this.bundlesLoaded) {
            return true;
        }

        console.log('[GameService] 开始预加载分包...');

        return new Promise<boolean>((resolve) => {
            let loadedCount = 0;
            let hasError = false;
            const totalBundles = 3; // gameplay, ui, network

            const onLoadComplete = () => {
                loadedCount++;
                if (loadedCount >= totalBundles) {
                    this.bundlesLoaded = true;
                    console.log('[GameService] 所有分包预加载完成');
                    resolve(!hasError);
                }
            };

            // 加载 gameplay 分包
            assetManager.loadBundle('gameplay', (err, bundle) => {
                if (err) {
                    console.error('[GameService] 加载 gameplay 分包失败:', err);
                    hasError = true;
                } else {
                    console.log('[GameService] gameplay 分包加载成功');
                }
                onLoadComplete();
            });

            // 加载 ui 分包
            assetManager.loadBundle('ui', (err, bundle) => {
                if (err) {
                    console.error('[GameService] 加载 ui 分包失败:', err);
                    hasError = true;
                } else {
                    console.log('[GameService] ui 分包加载成功');
                }
                onLoadComplete();
            });

            // 加载 network 分包
            assetManager.loadBundle('network', (err, bundle) => {
                if (err) {
                    console.error('[GameService] 加载 network 分包失败:', err);
                    hasError = true;
                } else {
                    console.log('[GameService] network 分包加载成功');
                }
                onLoadComplete();
            });
        });
    }

    /**
     * 动态加载分包中的类（确保类被注册）
     */
    private async ensureClassesLoaded(): Promise<void> {
        // 动态加载脚本，确保类被注册到引擎
        const bundleNames = ['gameplay', 'ui', 'network'];
        
        for (const bundleName of bundleNames) {
            const bundle = assetManager.getBundle(bundleName);
            if (!bundle) continue;
            
            // 加载一个占位脚本，触发分包脚本初始化
            // 注意：需要分包中有这个文件，或者使用其他方式
            // 这里只是示例，实际可能需要调整
            bundle.load('scripts/index', (err, asset) => {
                if (err) {
                    // 忽略错误，只是为了让分包脚本被加载
                }
            });
        }
        
        // 等待一帧，让脚本注册完成
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    private initializeServices() {
        if (this.isInitialized) return;

        // 1. 读取游戏模式
        const mode = (window as any).gameMode;
        if (mode === 'multi') {
            this.gameMode = GameMode.MULTI;
        } else {
            this.gameMode = GameMode.SINGLE;
        }
        console.log(`[GameService] 游戏模式: ${this.gameMode}`);

        // 2. 获取或添加 GameStateMachine
        this.gameStateMachine = this.getComponent(GameStateMachine);
        if (!this.gameStateMachine) {
            this.gameStateMachine = this.addComponent(GameStateMachine);
        }

        // 3. 注册服务到 ServiceLocator
        ServiceLocator.getInstance().register('stateMachine', this.gameStateMachine);
        ServiceLocator.getInstance().register('gameService', this);

        // 4. 注册节点引用
        const canvas = this.node.scene.getChildByName('Canvas');
        if (canvas) {
            ServiceLocator.getInstance().register('canvasNode', canvas);
        }

        // 5. 注册玩家（此时玩家组件可能还未加载，延迟获取）
        if (this.playerNode) {
            ServiceLocator.getInstance().register('playerNode', this.playerNode);
            // 玩家组件会由 PlayerController 自己注册
        }

        // 6. 初始化服务
        CombatService.getInstance().init();
        SkillService.getInstance().init();

        // 7. TriggerSystem 不需要立即初始化，等玩家注册后再初始化
        
        this.isInitialized = true;
        console.log('[GameService] 服务注册完成');

        EventBus.emit(EventNames.GAME_READY);
    }

    // ========== 游戏模式查询方法 ==========

    public getGameMode(): GameMode {
        return this.gameMode;
    }

    public isSingleMode(): boolean {
        return this.gameMode === GameMode.SINGLE;
    }

    public isMultiMode(): boolean {
        return this.gameMode === GameMode.MULTI;
    }

    // ========== 游戏控制方法 ==========

    public startSinglePlayer() {
        if (!this.isInitialized) {
            console.warn('[GameService] 服务未初始化完成');
            return;
        }
        this.gameStateMachine.startGame();
        console.log('[GameService] 单机游戏开始');
    }

    public startMultiPlayer() {
        if (!this.isInitialized) {
            console.warn('[GameService] 服务未初始化完成');
            return;
        }
        this.gameStateMachine.transitionTo(GameState.WAITING_ROOM);
        console.log('[GameService] 联机模式，等待房间...');
    }

    public endGame() {
        this.gameStateMachine.gameOver();
    }

    public resetGame() {
        EventBus.emit(EventNames.GAME_RESET);
        this.gameStateMachine.transitionTo(GameState.MENU);
        console.log('[GameService] 游戏已重置');
    }

    public getStateMachine(): GameStateMachine {
        return this.gameStateMachine;
    }

    public isGameRunning(): boolean {
        const stateMachine = ServiceLocator.getInstance().get<GameStateMachine>('stateMachine');
        return stateMachine?.getState() === GameState.RUNNING;
    }
}