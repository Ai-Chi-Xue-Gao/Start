// assets/scripts/ui/panels/GameOverPanel.ts

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
    // ========== UI 节点 ==========
    @property(Node)
    panelNode: Node = null

    @property(Label)
    statsLabel: Label = null

    @property(Button)
    restartButton: Button = null

    // ========== 统计数据 ==========
    private killCount: number = 0
    private elapsedTime: number = 0
    private finalTime: number = 0

    // ========== 状态标志 ==========
    private isPanelShowing: boolean = false  // ✅ 重命名，避免与基类 isGameOver() 混淆
    private playerService: IPlayer | null = null

    // ========== 事件绑定引用 ==========
    private boundOnEnemyDied: () => void = null
    private boundOnPlayerDied: () => void = null
    private boundOnRestart: () => void = null

    // ========== 常量配置 ==========
    private readonly TIME_FORMAT_MINUTES = 60
    private readonly DEFAULT_LEVEL = 1

    // ========== 生命周期 ==========

    start() {
        this.initPanel()
        this.resetStats()
        this.bindEvents()
    }

    protected onDestroy() {
        this.unbindEvents()
    }

    // ========== 初始化 ==========

    private initPanel(): void {
        if (this.panelNode) {
            this.panelNode.active = false
        }
    }

    private resetStats(): void {
        this.isPanelShowing = false
        this.killCount = 0
        this.elapsedTime = 0
        this.finalTime = 0
    }

    // ========== 事件绑定 ==========

    private bindEvents(): void {
        this.boundOnEnemyDied = this.onEnemyDied.bind(this)
        this.boundOnPlayerDied = this.onPlayerDied.bind(this)
        this.boundOnRestart = this.restartGame.bind(this)

        EventBus.on(EventNames.ENEMY_DIED, this.boundOnEnemyDied)
        EventBus.on(EventNames.PLAYER_DIED, this.boundOnPlayerDied)

        if (this.restartButton && this.restartButton.node) {
            this.restartButton.node.on(Button.EventType.CLICK, this.boundOnRestart, this)
        }
    }

    private unbindEvents(): void {
        if (this.boundOnEnemyDied) {
            EventBus.off(EventNames.ENEMY_DIED, this.boundOnEnemyDied)
        }
        if (this.boundOnPlayerDied) {
            EventBus.off(EventNames.PLAYER_DIED, this.boundOnPlayerDied)
        }
        if (this.restartButton && this.restartButton.node && this.boundOnRestart) {
            this.restartButton.node.off(Button.EventType.CLICK, this.boundOnRestart, this)
        }
    }

    // ========== 事件回调 ==========

    private onEnemyDied(): void {
        this.killCount++
    }

    private onPlayerDied(): void {
        this.showGameOver()
    }

    // ========== 游戏结束逻辑 ==========

    private showGameOver(): void {
        // ✅ 使用 isPanelShowing 避免重复显示
        if (this.isPanelShowing) return
        this.isPanelShowing = true

        this.finalTime = Math.floor(this.elapsedTime)
        const level = this.getPlayerLevel()
        this.updateStatsDisplay(level)
        this.showPanel()
        this.pauseGame()
    }

    private getPlayerLevel(): number {
        this.playerService = this.getService<IPlayer>('player')
        return this.playerService?.getLevel() ?? this.DEFAULT_LEVEL
    }

    private updateStatsDisplay(level: number): void {
        if (!this.statsLabel) return

        const timeString = this.formatTime(this.finalTime)
        this.statsLabel.string = `击杀数: ${this.killCount}\n生存时间: ${timeString}\n等级: ${level}`
    }

    private formatTime(seconds: number): string {
        const minutes = Math.floor(seconds / this.TIME_FORMAT_MINUTES)
        const remainingSeconds = seconds % this.TIME_FORMAT_MINUTES

        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`
        }
        return `${remainingSeconds}s`
    }

    private showPanel(): void {
        if (this.panelNode) {
            this.panelNode.active = true
        }
    }

    private pauseGame(): void {
        const stateMachine = ServiceLocator.getInstance().get<GameStateMachine>('stateMachine')
        if (stateMachine) {
            stateMachine.pause()
        }
        EventBus.emit(EventNames.GAME_PAUSE, true)
    }

    // ========== 游戏重启 ==========

    private restartGame(): void {
        this.unbindEvents()
        director.loadScene('Game')
    }

    // ========== 更新循环 ==========

    update(deltaTime: number): void {
        // ✅ 使用 isPanelShowing 判断面板是否已显示
        if (!this.isPanelShowing && this.isGameRunning()) {
            this.elapsedTime += deltaTime
        }
    }
}