// assets/scripts/core/GameContext.ts

/**
 * 游戏模式枚举
 */
export enum GameMode {
    SINGLE = 'single',
    MULTI = 'multi'
}

/**
 * 游戏全局上下文（单例）
 * 用于存储跨场景的全局状态，替代 window 全局变量
 */
export class GameContext {
    private static instance: GameContext;
    
    private _gameMode: GameMode = GameMode.SINGLE;
    private _isInitialized: boolean = false;

    private constructor() {}

    static getInstance(): GameContext {
        if (!GameContext.instance) {
            GameContext.instance = new GameContext();
        }
        return GameContext.instance;
    }

    /**
     * 设置游戏模式
     */
    setGameMode(mode: GameMode): void {
        this._gameMode = mode;
        this._isInitialized = true;
    }

    /**
     * 获取游戏模式
     */
    getGameMode(): GameMode {
        return this._gameMode;
    }

    /**
     * 是否为单机模式
     */
    isSingleMode(): boolean {
        return this._gameMode === GameMode.SINGLE;
    }

    /**
     * 是否为联机模式
     */
    isMultiMode(): boolean {
        return this._gameMode === GameMode.MULTI;
    }

    /**
     * 是否已初始化
     */
    isInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * 重置上下文（用于测试或重新开始）
     */
    reset(): void {
        this._gameMode = GameMode.SINGLE;
        this._isInitialized = false;
    }
}