// assets/scripts/ui/LevelUI.ts

import { _decorator, Label, Node } from 'cc';
import { BaseComponent } from '../core/BaseComponent';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';
import { IPlayer } from '../interfaces/IPlayer';
import { ServiceLocator } from '../core/ServiceLocator';
import { GameStateMachine } from '../core/GameStateMachine';

const { ccclass, property } = _decorator;

@ccclass('LevelUI')
export class LevelUI extends BaseComponent {
    @property(Node)
    player: Node = null

    @property(Label)
    levelLabel: Label = null

    private playerService: IPlayer | null = null
    private currentLevel: number = 1

    start() {
        this.playerService = this.getService<IPlayer>('player')

        if (this.playerService) {
            this.currentLevel = this.playerService.getLevel()
        }

        EventBus.on(EventNames.PLAYER_LEVEL_UP, this.onLevelUp, this)

        this.updateLevelDisplay()
    }

    protected onDestroy(): void {
        EventBus.off(EventNames.PLAYER_LEVEL_UP, this.onLevelUp, this)
    }

    private onLevelUp() {
        if (this.playerService) {
            this.currentLevel = this.playerService.getLevel()
        } else {
            this.currentLevel++
        }
        this.updateLevelDisplay()
    }

    private updateLevelDisplay() {
        if (this.levelLabel) {
            this.levelLabel.string = `Lv.${this.currentLevel}`
        }
    }

    public getLevel(): number {
        return this.currentLevel
    }
}