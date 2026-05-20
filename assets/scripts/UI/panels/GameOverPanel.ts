// assets/scripts/ui/GameOverPanel.ts

import { _decorator, Button, director, Label, Node } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { IPlayer } from '../../interfaces/IPlayer';

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

    private onEnemyDied = () => {
        this.killCount++
    }

    private onPlayerDied = () => {
        this.showGameOver()
    }

    start() {
        if (this.panelNode) {
            this.panelNode.active = false
        }

        this.startTime = Date.now() / 1000

        EventBus.on(EventNames.ENEMY_DIED, this.onEnemyDied)
        EventBus.on(EventNames.PLAYER_DIED, this.onPlayerDied)

        if (this.restartButton) {
            this.restartButton.node.on(Button.EventType.CLICK, this.restartGame, this)
        }
    }

    private showGameOver() {
        this.finalTime = Math.floor(Date.now() / 1000 - this.startTime)

        this.playerService = this.getService<IPlayer>('IPlayer')
        let level = 1
        if (this.playerService) {
            level = this.playerService.getLevel()
        }

        if (this.statsLabel) {
            this.statsLabel.string = `击杀数: ${this.killCount}\n生存时间: ${this.finalTime} 秒\n等级: ${level}`
        }

        if (this.panelNode) {
            this.panelNode.active = true
        }

        EventBus.emit(EventNames.GAME_PAUSE, true)
    }

    private restartGame() {
        director.loadScene('Game')
    }

    protected onDestroy(): void {
        EventBus.off(EventNames.ENEMY_DIED, this.onEnemyDied)
        EventBus.off(EventNames.PLAYER_DIED, this.onPlayerDied)
        if (this.restartButton && this.restartButton.node) {
            this.restartButton.node.off(Button.EventType.CLICK, this.restartGame, this)
        }
    }
}