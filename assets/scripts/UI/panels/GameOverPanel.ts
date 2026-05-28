// assets/scripts/ui/GameOverPanel.ts

import { _decorator, Button, director, Label, Node } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { IPlayer } from '../../interfaces/IPlayer';
import { GameStateMachine } from '../../core/GameStateMachine';
import { ServiceLocator } from '../../core/ServiceLocator';

const { ccclass, property } = _decorator;

@ccclass('GameOverPanel')
export class GameOverPanel extends BaseComponent {
    @property(Node)
    panelNode: Node = null

    @property(Label)
    statsLabel: Label = null

    @property(Button)
    restartButton: Button = null

    private killCount: number = 0
    private startTime: number = 0
    private finalTime: number = 0
    private playerService: IPlayer | null = null
    private isGameOver: boolean = false

    private onEnemyDied = () => {
        this.killCount++
        console.log(`[GameOverPanel] 击杀数增加: ${this.killCount}`)
    }

    private onPlayerDied = () => {
        console.log('[GameOverPanel] 收到 PLAYER_DIED 事件！')
        this.showGameOver()
    }

    start() {
        console.log('[GameOverPanel] start() 被调用')

        // 初始隐藏面板
        if (this.panelNode) {
            this.panelNode.active = false
            console.log('[GameOverPanel] 面板初始隐藏')
        } else {
            console.warn('[GameOverPanel] panelNode 未设置！')
        }

        // 重置状态
        this.isGameOver = false
        this.killCount = 0
        this.startTime = Date.now() / 1000
        console.log(`[GameOverPanel] 开始时间: ${this.startTime}`)

        // 监听事件
        EventBus.on(EventNames.ENEMY_DIED, this.onEnemyDied)
        EventBus.on(EventNames.PLAYER_DIED, this.onPlayerDied)
        console.log('[GameOverPanel] 已监听 ENEMY_DIED 和 PLAYER_DIED 事件')

        // 绑定按钮事件
        if (this.restartButton) {
            this.restartButton.node.on(Button.EventType.CLICK, this.restartGame, this)
            console.log('[GameOverPanel] 重启按钮事件已绑定')
        } else {
            console.warn('[GameOverPanel] restartButton 未设置！')
        }
    }

    private showGameOver() {
        console.log('[GameOverPanel] showGameOver() 被调用')

        // 防止重复显示
        if (this.isGameOver) {
            console.warn('[GameOverPanel] 游戏结束面板已显示，跳过')
            return
        }
        this.isGameOver = true

        // 计算生存时间
        this.finalTime = Math.floor(Date.now() / 1000 - this.startTime)
        console.log(`[GameOverPanel] 生存时间: ${this.finalTime} 秒`)

        // 获取玩家等级
        this.playerService = this.getService<IPlayer>('IPlayer')
        let level = 1
        if (this.playerService) {
            level = this.playerService.getLevel()
            console.log(`[GameOverPanel] 玩家等级: ${level}`)
        } else {
            console.warn('[GameOverPanel] 无法获取 IPlayer 服务')
        }

        // 更新统计文本
        if (this.statsLabel) {
            this.statsLabel.string = `击杀数: ${this.killCount}\n生存时间: ${this.finalTime} 秒\n等级: ${level}`
            console.log(`[GameOverPanel] 统计文本已更新: ${this.statsLabel.string}`)
        } else {
            console.warn('[GameOverPanel] statsLabel 未设置！')
        }

        // 显示面板
        if (this.panelNode) {
            this.panelNode.active = true
            console.log('[GameOverPanel] 面板已显示')
        } else {
            console.warn('[GameOverPanel] panelNode 未设置，无法显示面板')
        }

        // 暂停游戏
        const stateMachine = ServiceLocator.getInstance().get<GameStateMachine>('stateMachine')
        if (stateMachine) {
            stateMachine.pause()
            console.log('[GameOverPanel] 游戏已暂停（通过状态机）')
        } else {
            console.warn('[GameOverPanel] 无法获取状态机')
        }
        
        EventBus.emit(EventNames.GAME_PAUSE, true)
        console.log('[GameOverPanel] GAME_PAUSE 事件已发送')
    }

    private restartGame() {
        console.log('[GameOverPanel] restartGame() 被调用，重新加载 Game 场景')
        
        // 移除事件监听
        EventBus.off(EventNames.ENEMY_DIED, this.onEnemyDied)
        EventBus.off(EventNames.PLAYER_DIED, this.onPlayerDied)
        
        director.loadScene('Game')
    }

    protected onDestroy(): void {
        console.log('[GameOverPanel] onDestroy() 被调用')
        
        EventBus.off(EventNames.ENEMY_DIED, this.onEnemyDied)
        EventBus.off(EventNames.PLAYER_DIED, this.onPlayerDied)
        
        if (this.restartButton && this.restartButton.node && this.restartButton.node.isValid) {
            this.restartButton.node.off(Button.EventType.CLICK, this.restartGame, this)
        }
    }
}