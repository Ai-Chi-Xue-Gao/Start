// assets/scripts/network/NetworkManager.ts

import { _decorator, instantiate, Node, Prefab } from 'cc';
import { BaseComponent } from '../core/BaseComponent';
import { NetworkPlayer } from './NetworkPlayer';
import { NetworkEnemy } from './NetworkEnemy';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';
import { INetworkService } from '../interfaces/INetworkService';
import { ServiceLocator } from '../core/ServiceLocator';
import { GameService } from '../services/GameService';

const { ccclass, property } = _decorator;

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
type EnemyType = 'normal' | 'elite' | 'boss'

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
 * 网络管理器
 * 负责 WebSocket 连接、消息收发、玩家/敌人同步
 */
@ccclass('NetworkManager')
export class NetworkManager extends BaseComponent implements INetworkService {
    @property(Prefab)
    playerPrefab: Prefab = null

    @property(Prefab)
    enemyPrefab: Prefab = null

    private ws: WebSocket | null = null
    private connected: boolean = false
    private myId: string | null = null
    private networkPlayers: Map<string, Node> = new Map()
    private networkEnemies: Map<string, Node> = new Map()

    private onInitCallback: ((players: PlayerData[], myId: string) => void) | null = null
    private onPlayerJoinedCallback: ((player: PlayerData) => void) | null = null
    private onPlayerLeftCallback: ((playerId: string) => void) | null = null
    private onPlayerMovedCallback: ((playerId: string, x: number, y: number) => void) | null = null
    private onEnemySpawnCallback: ((enemy: EnemyData) => void) | null = null
    private onEnemyDeadCallback: ((enemyId: string) => void) | null = null
    private onPlayerHurtCallback: ((playerId: string, damage: number, currentHp: number, maxHp: number) => void) | null = null
    private onPlayerLevelUpCallback: ((playerId: string, level: number) => void) | null = null
    private onPlayerExpUpdateCallback: ((playerId: string, exp: number, expToNextLevel: number, level: number) => void) | null = null

    start() {
        ServiceLocator.getInstance().register('INetworkService', this)
        
        // 获取游戏服务判断是否联机模式
        const gameService = ServiceLocator.getInstance().get<GameService>('gameService');
        
        if (!gameService || !gameService.isMultiMode()) {
            console.log('[NetworkManager] 单机模式，网络管理器不启动');
            this.enabled = false;
            return;
        }
        
        console.log('[NetworkManager] 联机模式，等待连接...');
    }

    private createNetworkPlayer(playerData: PlayerData) {
        if (!this.playerPrefab) return
        const canvas = this.node.scene.getChildByName('Canvas')
        if (!canvas) return
        const playerNode = instantiate(this.playerPrefab)
        playerNode.setPosition(playerData.x, playerData.y, 0)
        playerNode.name = `NetworkPlayer_${playerData.id}`
        const networkPlayer = playerNode.getComponent(NetworkPlayer)
        if (networkPlayer) {
            networkPlayer.init(playerData.id, playerData.name, undefined, playerData.hp, playerData.maxHp, playerData.level, playerData.exp, playerData.expToNextLevel)
        }
        canvas.addChild(playerNode)
        this.networkPlayers.set(playerData.id, playerNode)
    }

    private createNetworkEnemy(enemyData: EnemyData) {
        if (!this.enemyPrefab) {
            console.warn('enemyPrefab 未设置')
            return
        }
        const canvas = this.node.scene.getChildByName('Canvas')
        if (!canvas) return
        const enemyNode = instantiate(this.enemyPrefab)
        enemyNode.name = `NetworkEnemy_${enemyData.id}`
        const networkEnemy = enemyNode.getComponent(NetworkEnemy)
        if (networkEnemy) {
            networkEnemy.init(enemyData.id, enemyData.x, enemyData.y, enemyData.type)
        }
        canvas.addChild(enemyNode)
        this.networkEnemies.set(enemyData.id, enemyNode)
    }

    public connect(serverUrl: string = 'ws://localhost:8080') {
        const gameService = ServiceLocator.getInstance().get<GameService>('gameService');
        if (!gameService || !gameService.isMultiMode()) {
            console.warn('[NetworkManager] 单机模式下无法连接服务器');
            return
        }
        
        this.ws = new WebSocket(serverUrl)
        this.ws.onopen = () => {
            console.log('WebSocket 连接成功')
            this.connected = true
        }
        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data)
                this.handleMessage(msg)
            } catch (error) {
                console.error('解析服务器消息失败:', error)
            }
        }
        this.ws.onclose = () => {
            console.log('WebSocket断开连接')
            this.connected = false
        }
        this.ws.onerror = (error) => {
            console.error('WebSocket错误:', error)
        }
    }

    private handleMessage(msg: any) {
        switch (msg.type) {
            case 'init': {
                for (const player of msg.data.players) {
                    if (player.id !== msg.data.yourId) {
                        this.createNetworkPlayer(player)
                    }
                }
                if (msg.data.enemies) {
                    for (const enemy of msg.data.enemies) {
                        this.createNetworkEnemy(enemy)
                    }
                }
                this.myId = msg.data.yourId
                if (this.onInitCallback) {
                    this.onInitCallback(msg.data.players, msg.data.yourId)
                }
                break
            }
            case 'player_joined': {
                this.createNetworkPlayer(msg.data)
                if (this.onPlayerJoinedCallback) {
                    this.onPlayerJoinedCallback(msg.data)
                }
                break
            }
            case 'player_left': {
                const playerNode = this.networkPlayers.get(msg.data.id)
                if (playerNode) {
                    playerNode.destroy()
                    this.networkPlayers.delete(msg.data.id)
                }
                if (this.onPlayerLeftCallback) {
                    this.onPlayerLeftCallback(msg.data.id)
                }
                break
            }
            case 'player_moved': {
                if (msg.data.id === this.myId) return
                const playerNode = this.networkPlayers.get(msg.data.id)
                if (playerNode) {
                    const networkPlayer = playerNode.getComponent(NetworkPlayer)
                    if (networkPlayer) {
                        networkPlayer.updatePosition(msg.data.x, msg.data.y)
                    }
                }
                if (this.onPlayerMovedCallback) {
                    this.onPlayerMovedCallback(msg.data.id, msg.data.x, msg.data.y)
                }
                break
            }
            case 'player_hurt': {
                if (this.onPlayerHurtCallback) {
                    this.onPlayerHurtCallback(msg.data.playerId, msg.data.damage, msg.data.currentHp, msg.data.maxHp)
                }
                break
            }
            case 'player_level_up': {
                if (this.onPlayerLevelUpCallback) {
                    this.onPlayerLevelUpCallback(msg.data.playerId, msg.data.level)
                }
                break
            }
            case 'player_exp_update': {
                if (this.onPlayerExpUpdateCallback) {
                    this.onPlayerExpUpdateCallback(msg.data.playerId, msg.data.exp, msg.data.expToNextLevel, msg.data.level)
                }
                break
            }
            case 'enemy_spawn': {
                this.createNetworkEnemy(msg.data)
                if (this.onEnemySpawnCallback) {
                    this.onEnemySpawnCallback(msg.data)
                }
                break
            }
            case 'enemies_update': {
                if (!msg.data.enemies || msg.data.enemies.length === 0) break
                for (const enemyData of msg.data.enemies) {
                    const enemyNode = this.networkEnemies.get(enemyData.id)
                    if (enemyNode) {
                        const networkEnemy = enemyNode.getComponent(NetworkEnemy)
                        if (networkEnemy) {
                            networkEnemy.updatePosition(enemyData.x, enemyData.y)
                        }
                    }
                }
                break
            }
            case 'enemy_dead': {
                const enemyNode = this.networkEnemies.get(msg.data.id)
                if (enemyNode) {
                    const networkEnemy = enemyNode.getComponent(NetworkEnemy)
                    if (networkEnemy) {
                        networkEnemy.die()
                    } else {
                        enemyNode.destroy()
                    }
                    this.networkEnemies.delete(msg.data.id)
                }
                if (this.onEnemyDeadCallback) {
                    this.onEnemyDeadCallback(msg.data.id)
                }
                break
            }
            case 'enemy_exp': {
                console.log(`获得${msg.data.exp}经验`)
                EventBus.emit(EventNames.GAIN_EXP, msg.data.exp)
                break
            }
            default: {
                console.log('未处理的消息类型:', msg.type)
            }
        }
    }

    public setMove(x: number, y: number) {
        if (!this.connected || !this.ws) return
        this.ws.send(JSON.stringify({
            type: 'move',
            data: { x, y }
        }))
    }

    public sendAttack(enemyId: string, damage: number) {
        if (!this.connected || !this.ws) return
        this.ws.send(JSON.stringify({
            type: 'attack',
            data: { enemyId, damage }
        }))
    }

    public setOnInit(cb: (players: PlayerData[], myId: string) => void) {
        this.onInitCallback = cb
    }

    public setOnPlayerJoined(cb: (player: PlayerData) => void) {
        this.onPlayerJoinedCallback = cb
    }

    public setOnPlayerLeft(cb: (playerId: string) => void) {
        this.onPlayerLeftCallback = cb
    }

    public setOnPlayerMoved(cb: (playerId: string, x: number, y: number) => void) {
        this.onPlayerMovedCallback = cb
    }

    public setOnPlayerHurt(cb: (playerId: string, damage: number, currentHp: number, maxHp: number) => void) {
        this.onPlayerHurtCallback = cb
    }

    public setOnPlayerLevelUp(cb: (playerId: string, level: number) => void) {
        this.onPlayerLevelUpCallback = cb
    }

    public setOnPlayerExpUpdate(cb: (playerId: string, exp: number, expToNextLevel: number, level: number) => void) {
        this.onPlayerExpUpdateCallback = cb
    }

    public disconnect() {
        if (this.ws) {
            this.ws.close()
            this.ws = null
        }
        this.connected = false
        this.myId = null
    }

    public getMyId(): string | null {
        return this.myId
    }

    public isConnected(): boolean {
        return this.connected
    }

    public sendHurt(damage: number, currentHp: number, maxHp: number) {
        if (!this.connected || !this.ws) return
        if (!this.myId) {
            console.warn('[sendHurt] myId未设置，跳过发送受伤消息')
            return
        }
        this.ws.send(JSON.stringify({
            type: 'hurt',
            data: {
                playerId: this.myId,
                damage: damage,
                currentHp: currentHp,
                maxHp: maxHp,
            }
        }))
    }

    public sendLevelUp(level: number) {
        if (!this.connected || !this.ws) return
        if (!this.myId) return
        this.ws.send(JSON.stringify({
            type: 'level_up',
            data: {
                playerId: this.myId,
                level: level,
            }
        }))
    }

    public sendExpUpdate(exp: number, expToNextLevel: number, level: number) {
        if (!this.connected || !this.ws) return
        if (!this.myId) return
        this.ws.send(JSON.stringify({
            type: 'player_exp_update',
            data: {
                playerId: this.myId,
                exp: exp,
                expToNextLevel: expToNextLevel,
                level: level,
            }
        }))
    }
}