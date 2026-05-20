// assets/scripts/ui/PauseManager.ts

import { _decorator, Button, director, Node } from 'cc';
import { BaseComponent } from '../core/BaseComponent';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';
import { GameStateMachine } from '../core/GameStateMachine';

const { ccclass, property } = _decorator;

@ccclass('PauseManager')
export class PauseManager extends BaseComponent {
    @property(Button)
    pauseButton: Button = null

    @property(Node)
    pausePanel: Node = null

    @property(Button)
    resumeButton: Button = null

    @property(Button)
    menuButton: Button = null

    private isPaused: boolean = false

    private onPauseClick = () => {
        this.onPauseClickHandler()
    }

    private onResumeClick = () => {
        this.onResumeClickHandler()
    }

    private onMenuClick = () => {
        this.onMenuClickHandler()
    }

    start() {
        if (this.pausePanel) {
            this.pausePanel.active = false
        }

        if (this.pauseButton) {
            this.pauseButton.node.on(Button.EventType.CLICK, this.onPauseClick, this)
        }

        if (this.resumeButton) {
            this.resumeButton.node.on(Button.EventType.CLICK, this.onResumeClick, this)
        }

        if (this.menuButton) {
            this.menuButton.node.on(Button.EventType.CLICK, this.onMenuClick, this)
        }
    }

    private onPauseClickHandler() {
        if (this.isPaused) return
        this.isPaused = true

        if (this.pausePanel) {
            this.pausePanel.active = true
        }

        const stateMachine = this.getService<GameStateMachine>('stateMachine')
        if (stateMachine) {
            stateMachine.pause()
            console.log('[PauseManager] 游戏暂停')
        }
    }

    private onResumeClickHandler() {
        if (!this.isPaused) return
        this.isPaused = false

        if (this.pausePanel) {
            this.pausePanel.active = false
        }

        const stateMachine = this.getService<GameStateMachine>('stateMachine')
        if (stateMachine) {
            stateMachine.resume()
            console.log('[PauseManager] 游戏恢复')
        }
    }

    private onMenuClickHandler() {
        this.isPaused = false

        const stateMachine = this.getService<GameStateMachine>('stateMachine')
        if (stateMachine) {
            stateMachine.resume()
        }

        director.loadScene('Main')
    }

    protected onDestroy(): void {
        if (this.pauseButton && this.pauseButton.node && this.pauseButton.node.isValid) {
            this.pauseButton.node.off(Button.EventType.CLICK, this.onPauseClick, this)
        }

        if (this.resumeButton && this.resumeButton.node && this.resumeButton.node.isValid) {
            this.resumeButton.node.off(Button.EventType.CLICK, this.onResumeClick, this)
        }

        if (this.menuButton && this.menuButton.node && this.menuButton.node.isValid) {
            this.menuButton.node.off(Button.EventType.CLICK, this.onMenuClick, this)
        }
    }
}