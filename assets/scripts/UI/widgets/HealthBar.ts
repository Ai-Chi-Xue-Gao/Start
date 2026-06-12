// assets/scripts/ui/HealthBar.ts

import { _decorator, Color, Label, Node, Sprite, UITransform } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { UIColorConfig, HealthWarningColorConfig } from '../../configs/GameConfig';
import { IPlayer } from '../../interfaces/IPlayer';

const { ccclass, property } = _decorator;

@ccclass('HealthBar')
export class HealthBar extends BaseComponent {
    @property(Sprite)
    fillSprite: Sprite = null        // 血条填充图片

    @property(Sprite)
    shieldSprite: Sprite = null      //  护盾条填充图片（灰色）

    @property(Node)
    player: Node = null

    @property(Label)
    healthText: Label = null

    private playerService: IPlayer | null = null
    private originalWidth: number = 0
    private shieldOriginalWidth: number = 0

    start() {
        this.playerService = this.getService<IPlayer>('player')

        if (this.fillSprite) {
            const uiTransform = this.fillSprite.node.getComponent(UITransform)
            this.originalWidth = uiTransform.contentSize.width
        }

        //  获取护盾条原始宽度
        if (this.shieldSprite) {
            const uiTransform = this.shieldSprite.node.getComponent(UITransform)
            this.shieldOriginalWidth = uiTransform.contentSize.width
            // 初始隐藏护盾条
            this.shieldSprite.node.active = false
        }

        EventBus.on(EventNames.PLAYER_HEALTH_CHANGE, this.onHealthChange, this)
        EventBus.on(EventNames.PLAYER_SHIELD_CHANGE, this.onShieldChange, this)  //  监听护盾变化

        this.updateHealthBar()
        this.updateShieldBar()  //  更新护盾条
    }

    private onHealthChange(current: number, max: number) {
        if (!this.isValid) return
        this.updateHealthBar()
    }

    // 护盾变化回调
    private onShieldChange(shield: number) {
        if (!this.isValid) return
        this.updateShieldBar()
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

    //  更新护盾条
    private updateShieldBar() {
        if (!this.playerService) return
        if (!this.shieldSprite || this.shieldOriginalWidth === 0) return

        const shield = this.playerService.getShield()
        const maxHealth = this.playerService.getMaxHealth()

        const percent = Math.min(1, shield / maxHealth)

        if (percent <= 0) {
            this.shieldSprite.node.active = false
            return
        }

        this.shieldSprite.node.active = true
        const uiTransform = this.shieldSprite.node.getComponent(UITransform)
        uiTransform.setContentSize(this.shieldOriginalWidth * percent, uiTransform.contentSize.height)

        this.shieldSprite.node.setPosition(0, 0, 0)
    }

    protected onDestroy(): void {
        EventBus.off(EventNames.PLAYER_HEALTH_CHANGE, this.onHealthChange, this)
        EventBus.off(EventNames.PLAYER_SHIELD_CHANGE, this.onShieldChange, this)  // 
    }
}