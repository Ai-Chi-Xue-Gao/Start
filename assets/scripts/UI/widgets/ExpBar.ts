// assets/scripts/ui/ExpBar.ts

import { _decorator, Label, Node, Sprite, UITransform } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { IPlayer } from '../../interfaces/IPlayer';

const { ccclass, property } = _decorator;

@ccclass('ExpBar')
export class ExpBar extends BaseComponent {
    @property(Sprite)
    fillSprite: Sprite = null

    @property(Node)
    player: Node = null

    @property(Label)
    expText: Label = null

    private playerService: IPlayer | null = null
    private originalWidth: number = 0

    start() {
        this.playerService = this.getService<IPlayer>('IPlayer')

        if (this.fillSprite) {
            const uiTransform = this.fillSprite.node.getComponent(UITransform)
            this.originalWidth = uiTransform.contentSize.width
        }

        EventBus.on(EventNames.EXP_CHANGED, this.onExpChange, this)
        this.updateExpBar()
    }

    protected onDestroy(): void {
        EventBus.off(EventNames.EXP_CHANGED, this.onExpChange, this)
    }

    private onExpChange(current: number, max: number) {
        this.updateExpBar()
    }

    private updateExpBar() {
        if (!this.playerService) return

        const current = this.playerService.getExp()
        const max = this.playerService.getExpToNextLevel()
        const percent = Math.min(1, current / max)

        if (this.fillSprite && this.originalWidth > 0) {
            const uiTransform = this.fillSprite.node.getComponent(UITransform)
            uiTransform.setContentSize(this.originalWidth * percent, uiTransform.contentSize.height)
        }

        if (this.expText) {
            this.expText.string = `${Math.floor(current)}/${Math.floor(max)}`
        }
    }
}