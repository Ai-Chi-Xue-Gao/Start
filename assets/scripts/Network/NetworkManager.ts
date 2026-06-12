// assets/scripts/network/NetworkManager.ts

import { _decorator, instantiate, Node, Prefab } from 'cc';
import { BaseComponent } from '../core/BaseComponent';
import { NetworkPlayer } from './NetworkPlayer';
import { NetworkEnemy } from './NetworkEnemy';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';
import { INetworkService } from '../interfaces/INetworkService';
import { ServiceLocator } from '../core/ServiceLocator';
import { GameContext } from '../core/GameContext';

const { ccclass, property } = _decorator;

// ========== 类型定义 ==========

/**
 * 玩家数据结构（网络传输用）
 */
interface PlayerData {
    id: string;
    x: number;
    y: number;
    name: string;
    hp: number;
    maxHp: number;
    level: number;
    exp: number;
    expToNextLevel: number;
}

/**
 * 敌人类型
 */
type EnemyType = 'normal' | 'elite' | 'boss';

/**
 * 敌人数据结构（网络传输用）
 */
interface EnemyData {
    id: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    type: EnemyType;
    level: number;
}

/**
 * 回调函数类型定义
 */
type InitCallback = (players: PlayerData[], myId: string) => void;
type PlayerJoinedCallback = (player: PlayerData) => void;
type PlayerLeftCallback = (playerId: string) => void;
type PlayerMovedCallback = (playerId: string, x: number, y: number) => void;
type PlayerHurtCallback = (playerId: string, damage: number, currentHp: number, maxHp: number) => void;
type PlayerLevelUpCallback = (playerId: string, level: number) => void;
type PlayerExpUpdateCallback = (playerId: string, exp: number, expToNextLevel: number, level: number) => void;
type EnemySpawnCallback = (enemy: EnemyData) => void;
type EnemyDeadCallback = (enemyId: string) => void;

/**
 * 网络管理器
 * 负责 WebSocket 连接、消息收发、玩家/敌人同步
 */
@ccclass('NetworkManager')
export class NetworkManager extends BaseComponent implements INetworkService {
    @property(Prefab)
    playerPrefab: Prefab = null;

    @property(Prefab)
    enemyPrefab: Prefab = null;

    // ========== 连接状态 ==========
    private ws: WebSocket | null = null;
    private connected: boolean = false;
    private myId: string | null = null;

    // ========== 对象映射 ==========
    private networkPlayers: Map<string, Node> = new Map();
    private networkEnemies: Map<string, Node> = new Map();

    // ========== 多回调支持 ==========
    private initCallbacks: InitCallback[] = [];
    private playerJoinedCallbacks: PlayerJoinedCallback[] = [];
    private playerLeftCallbacks: PlayerLeftCallback[] = [];
    private playerMovedCallbacks: PlayerMovedCallback[] = [];
    private playerHurtCallbacks: PlayerHurtCallback[] = [];
    private playerLevelUpCallbacks: PlayerLevelUpCallback[] = [];
    private playerExpUpdateCallbacks: PlayerExpUpdateCallback[] = [];
    private enemySpawnCallbacks: EnemySpawnCallback[] = [];
    private enemyDeadCallbacks: EnemyDeadCallback[] = [];

    // ========== 重连配置 ==========
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 3;
    private reconnectDelay: number = 2;
    private reconnectTimer: any = null;

    // ========== 生命周期 ==========

    start() {
        ServiceLocator.getInstance().register('networkService', this);

        const gameContext = GameContext.getInstance();

        if (!gameContext.isMultiMode()) {
            this.enabled = false;
            return;
        }
    }

    protected onDestroy() {
        this.disconnect();
        this.clearCallbacks();
    }

    // ========== 连接管理 ==========

    /**
     * 连接到服务器
     * @param serverUrl 服务器地址
     */
    public connect(serverUrl: string = 'ws://localhost:8080'): void {
        const gameContext = GameContext.getInstance();
        if (!gameContext.isMultiMode()) {
            console.warn('[NetworkManager] 单机模式下无法连接服务器');
            return;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.warn('[NetworkManager] 已连接，无需重复连接');
            return;
        }

        this.ws = new WebSocket(serverUrl);
        this.bindWebSocketEvents();
    }

    /**
     * 绑定 WebSocket 事件
     */
    private bindWebSocketEvents(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            this.connected = true;
            this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
            this.handleMessage(event);
        };

        this.ws.onclose = () => {
            this.connected = false;
            this.handleDisconnect();
        };

        this.ws.onerror = (error) => {
            console.error('[NetworkManager] WebSocket 错误:', error);
        };
    }

    /**
     * 处理断开连接
     */
    private handleDisconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
        }
    }

    /**
     * 计划重连
     */
    private scheduleReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectAttempts++;

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, this.reconnectDelay * 1000);
    }

    /**
     * 断开连接
     */
    public disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.connected = false;
        this.myId = null;
    }

    // ========== 消息处理 ==========

    /**
     * 处理接收到的消息
     */
    private handleMessage(event: MessageEvent): void {
        try {
            const msg = JSON.parse(event.data);
            this.dispatchMessage(msg);
        } catch (error) {
            console.error('[NetworkManager] 解析服务器消息失败:', error);
        }
    }

    /**
     * 分发消息到对应处理器
     */
    private dispatchMessage(msg: any): void {
        switch (msg.type) {
            case 'init':
                this.handleInit(msg.data);
                break;
            case 'player_joined':
                this.handlePlayerJoined(msg.data);
                break;
            case 'player_left':
                this.handlePlayerLeft(msg.data);
                break;
            case 'player_moved':
                this.handlePlayerMoved(msg.data);
                break;
            case 'player_hurt':
                this.handlePlayerHurt(msg.data);
                break;
            case 'player_level_up':
                this.handlePlayerLevelUp(msg.data);
                break;
            case 'player_exp_update':
                this.handlePlayerExpUpdate(msg.data);
                break;
            case 'enemy_spawn':
                this.handleEnemySpawn(msg.data);
                break;
            case 'enemies_update':
                this.handleEnemiesUpdate(msg.data);
                break;
            case 'enemy_dead':
                this.handleEnemyDead(msg.data);
                break;
            case 'enemy_exp':
                this.handleEnemyExp(msg.data);
                break;
            default:
                console.log('[NetworkManager] 未处理的消息类型:', msg.type);
        }
    }

    // ========== 消息处理器 ==========

    private handleInit(data: any): void {
        // 创建其他玩家
        for (const player of data.players) {
            if (player.id !== data.yourId) {
                this.createNetworkPlayer(player);
            }
        }

        // 创建敌人
        if (data.enemies) {
            for (const enemy of data.enemies) {
                this.createNetworkEnemy(enemy);
            }
        }

        this.myId = data.yourId;

        // 触发所有初始化回调
        this.initCallbacks.forEach(cb => cb(data.players, data.yourId));
    }

    private handlePlayerJoined(data: PlayerData): void {
        this.createNetworkPlayer(data);
        this.playerJoinedCallbacks.forEach(cb => cb(data));
    }

    private handlePlayerLeft(data: { id: string }): void {
        const playerNode = this.networkPlayers.get(data.id);
        if (playerNode) {
            playerNode.destroy();
            this.networkPlayers.delete(data.id);
        }
        this.playerLeftCallbacks.forEach(cb => cb(data.id));
    }

    private handlePlayerMoved(data: { id: string; x: number; y: number }): void {
        if (data.id === this.myId) return;

        const playerNode = this.networkPlayers.get(data.id);
        if (playerNode) {
            const networkPlayer = playerNode.getComponent(NetworkPlayer);
            networkPlayer?.updatePosition(data.x, data.y);
        }
        this.playerMovedCallbacks.forEach(cb => cb(data.id, data.x, data.y));
    }

    private handlePlayerHurt(data: { playerId: string; damage: number; currentHp: number; maxHp: number }): void {
        this.playerHurtCallbacks.forEach(cb => cb(data.playerId, data.damage, data.currentHp, data.maxHp));
    }

    private handlePlayerLevelUp(data: { playerId: string; level: number }): void {
        this.playerLevelUpCallbacks.forEach(cb => cb(data.playerId, data.level));
    }

    private handlePlayerExpUpdate(data: { playerId: string; exp: number; expToNextLevel: number; level: number }): void {
        this.playerExpUpdateCallbacks.forEach(cb => cb(data.playerId, data.exp, data.expToNextLevel, data.level));
    }

    private handleEnemySpawn(data: EnemyData): void {
        this.createNetworkEnemy(data);
        this.enemySpawnCallbacks.forEach(cb => cb(data));
    }

    private handleEnemiesUpdate(data: { enemies: EnemyData[] }): void {
        if (!data.enemies || data.enemies.length === 0) return;

        for (const enemyData of data.enemies) {
            const enemyNode = this.networkEnemies.get(enemyData.id);
            if (enemyNode) {
                const networkEnemy = enemyNode.getComponent(NetworkEnemy);
                networkEnemy?.updatePosition(enemyData.x, enemyData.y);
            }
        }
    }

    private handleEnemyDead(data: { id: string }): void {
        const enemyNode = this.networkEnemies.get(data.id);
        if (enemyNode) {
            const networkEnemy = enemyNode.getComponent(NetworkEnemy);
            if (networkEnemy) {
                networkEnemy.die();
            } else {
                enemyNode.destroy();
            }
            this.networkEnemies.delete(data.id);
        }
        this.enemyDeadCallbacks.forEach(cb => cb(data.id));
    }

    private handleEnemyExp(data: { exp: number }): void {
        EventBus.emit(EventNames.GAIN_EXP, data.exp);
    }

    // ========== 对象创建 ==========

    private createNetworkPlayer(playerData: PlayerData): void {
        if (!this.playerPrefab) return;

        const canvas = this.node.scene?.getChildByName('Canvas');
        if (!canvas) return;

        const playerNode = instantiate(this.playerPrefab);
        playerNode.setPosition(playerData.x, playerData.y, 0);
        playerNode.name = `NetworkPlayer_${playerData.id}`;

        const networkPlayer = playerNode.getComponent(NetworkPlayer);
        if (networkPlayer) {
            networkPlayer.init(
                playerData.id, playerData.name, undefined,
                playerData.hp, playerData.maxHp,
                playerData.level, playerData.exp, playerData.expToNextLevel
            );
        }

        canvas.addChild(playerNode);
        this.networkPlayers.set(playerData.id, playerNode);
    }

    private createNetworkEnemy(enemyData: EnemyData): void {
        if (!this.enemyPrefab) {
            console.warn('[NetworkManager] enemyPrefab 未设置');
            return;
        }

        const canvas = this.node.scene?.getChildByName('Canvas');
        if (!canvas) return;

        const enemyNode = instantiate(this.enemyPrefab);
        enemyNode.name = `NetworkEnemy_${enemyData.id}`;

        const networkEnemy = enemyNode.getComponent(NetworkEnemy);
        if (networkEnemy) {
            networkEnemy.init(enemyData.id, enemyData.x, enemyData.y, enemyData.type);
        }

        canvas.addChild(enemyNode);
        this.networkEnemies.set(enemyData.id, enemyNode);
    }

    // ========== 发送消息 ==========

    public setMove(x: number, y: number): void {
        if (!this.connected || !this.ws) return;
        this.ws.send(JSON.stringify({ type: 'move', data: { x, y } }));
    }

    public sendAttack(enemyId: string, damage: number): void {
        if (!this.connected || !this.ws) return;
        this.ws.send(JSON.stringify({ type: 'attack', data: { enemyId, damage } }));
    }

    public sendHurt(damage: number, currentHp: number, maxHp: number): void {
        if (!this.connected || !this.ws) return;
        if (!this.myId) {
            console.warn('[NetworkManager] myId未设置，跳过发送受伤消息');
            return;
        }
        this.ws.send(JSON.stringify({
            type: 'hurt',
            data: { playerId: this.myId, damage, currentHp, maxHp }
        }));
    }

    public sendLevelUp(level: number): void {
        if (!this.connected || !this.ws) return;
        if (!this.myId) return;
        this.ws.send(JSON.stringify({
            type: 'level_up',
            data: { playerId: this.myId, level }
        }));
    }

    public sendExpUpdate(exp: number, expToNextLevel: number, level: number): void {
        if (!this.connected || !this.ws) return;
        if (!this.myId) return;
        this.ws.send(JSON.stringify({
            type: 'player_exp_update',
            data: { playerId: this.myId, exp, expToNextLevel, level }
        }));
    }

    // ========== 回调注册（多回调支持） ==========

    public addOnInit(cb: InitCallback): void {
        this.initCallbacks.push(cb);
    }

    public addOnPlayerJoined(cb: PlayerJoinedCallback): void {
        this.playerJoinedCallbacks.push(cb);
    }

    public addOnPlayerLeft(cb: PlayerLeftCallback): void {
        this.playerLeftCallbacks.push(cb);
    }

    public addOnPlayerMoved(cb: PlayerMovedCallback): void {
        this.playerMovedCallbacks.push(cb);
    }

    public addOnPlayerHurt(cb: PlayerHurtCallback): void {
        this.playerHurtCallbacks.push(cb);
    }

    public addOnPlayerLevelUp(cb: PlayerLevelUpCallback): void {
        this.playerLevelUpCallbacks.push(cb);
    }

    public addOnPlayerExpUpdate(cb: PlayerExpUpdateCallback): void {
        this.playerExpUpdateCallbacks.push(cb);
    }

    public addOnEnemySpawn(cb: EnemySpawnCallback): void {
        this.enemySpawnCallbacks.push(cb);
    }

    public addOnEnemyDead(cb: EnemyDeadCallback): void {
        this.enemyDeadCallbacks.push(cb);
    }

    // ========== 移除回调 ==========

    public removeOnInit(cb: InitCallback): void {
        this.removeCallback(this.initCallbacks, cb);
    }

    public removeOnPlayerJoined(cb: PlayerJoinedCallback): void {
        this.removeCallback(this.playerJoinedCallbacks, cb);
    }

    public removeOnPlayerLeft(cb: PlayerLeftCallback): void {
        this.removeCallback(this.playerLeftCallbacks, cb);
    }

    private removeCallback<T>(callbacks: T[], cb: T): void {
        const index = callbacks.indexOf(cb);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }

    // ========== 清空回调 ==========

    private clearCallbacks(): void {
        this.initCallbacks = [];
        this.playerJoinedCallbacks = [];
        this.playerLeftCallbacks = [];
        this.playerMovedCallbacks = [];
        this.playerHurtCallbacks = [];
        this.playerLevelUpCallbacks = [];
        this.playerExpUpdateCallbacks = [];
        this.enemySpawnCallbacks = [];
        this.enemyDeadCallbacks = [];
    }

    // ========== 查询方法 ==========

    public getMyId(): string | null {
        return this.myId;
    }

    public isConnected(): boolean {
        return this.connected;
    }
}