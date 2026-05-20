// assets/scripts/ui/HealthBar.ts

import { _decorator, Color, Label, Node, Sprite, UITransform } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { UIColorConfig, HealthWarningColorConfig } from '../../configs/GameConfig';
import { IPlayer } from '../../interfaces/IPlayer';
import { ServiceLocator } from '../../core/ServiceLocator';

const { ccclass, property } = _decorator;

@ccclass('HealthBar')
export class HealthBar extends BaseComponent {
    @property(Sprite)
    fillSprite: Sprite = null

    @property(Node)
    player: Node = null

    @property(Label)
    healthText: Label = null

    private playerService: IPlayer | null = null
    private originalWidth: number = 0

    start() {
        this.playerService = this.getService<IPlayer>('IPlayer')

        if (this.fillSprite) {
            const uiTransform = this.fillSprite.node.getComponent(UITransform)
            this.originalWidth = uiTransform.contentSize.width
        }

        EventBus.on(EventNames.PLAYER_HEALTH_CHANGE, this.onHealthChange, this)
        this.updateHealthBar()
    }

    private onHealthChange(current: number, max: number) {
        if (!this.isValid) return
        this.updateHealthBar()
    }

    private updateHealthBar() {
        if (!this.playerService) return

        const current = this.playerService.getCurrentHealth()
        const max = this.playerService.getMaxHealth()
        const percent = Math.max(0, current / max)

        if (this.fillSprite && this.originalWidth > 0) {
            const uiTransform = this.fillSprite.node.getComponent(UITransform)
            uiTransform.setContentSize(this.originalWidth * percent, uiTransform.contentSize.height)

            if (percent < UIColorConfig.HEALTH_BAR_RED_THRESHOLD) {
                this.fillSprite.color = Color.RED
            } else if (percent < UIColorConfig.HEALTH_BAR_YELLOW_THRESHOLD) {
                this.fillSprite.color = Color.YELLOW
            } else {
                this.fillSprite.color = Color.GREEN
            }
        }

        if (this.healthText) {
            const displayCurrent = Math.floor(current)
            const displayMax = Math.floor(max)
            this.healthText.string = `${displayCurrent}/${displayMax}`

            if (percent < UIColorConfig.HEALTH_BAR_RED_THRESHOLD) {
                this.healthText.color = Color.RED
            } else if (percent < UIColorConfig.HEALTH_BAR_YELLOW_THRESHOLD) {
                this.healthText.color = new Color(
                    HealthWarningColorConfig.HEALTH_WARNING_COLOR_R,
                    HealthWarningColorConfig.HEALTH_WARNING_COLOR_G,
                    HealthWarningColorConfig.HEALTH_WARNING_COLOR_B,
                    255)
            } else {
                this.healthText.color = new Color(0, 0, 0, 255)
            }
        }
    }

    protected onDestroy(): void {
        EventBus.off(EventNames.PLAYER_HEALTH_CHANGE, this.onHealthChange, this)
    }
}