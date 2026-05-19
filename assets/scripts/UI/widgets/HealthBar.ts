import { _decorator, Color, Component, Label, Node, Sprite, UITransform } from 'cc';
import { EventBus } from '../../core/EventBus';
import { PlayerController } from '../../entities/player/PlayerController';
import { EventNames } from '../../utils/EventNames';
import { GameConstants } from '../../utils/GameConstants';
const { ccclass, property } = _decorator;

@ccclass('HealthBar')
export class HealthBar extends Component {
    @property(Sprite)
    fillSprite: Sprite = null // 血条填充图片

    @property(Node)
    player: Node = null // 玩家节点

    @property(Label)
    healthText: Label = null // 血量文本

    private playerScript: PlayerController = null
    private originalWidth: number = 0

    start() {
        // 获取玩家脚本
        if (this.player) {
            this.playerScript = this.player.getComponent(PlayerController)

            // 记录原始宽度
            if (this.fillSprite) {
                const uiTransform = this.fillSprite.node.getComponent(UITransform)
                this.originalWidth = uiTransform.contentSize.width
            }

            // 监听血量变化事件
            EventBus.on(EventNames.PLAYER_HEALTH_CHANGE, this.onHealthChange, this)

            // 初始更新
            this.updateHealthBar();
        }
    }

    private onHealthChange(current: number, max: number) {
        if (!this.isValid) return
        this.updateHealthBar()
    }

    private updateHealthBar() {
        if (!this.playerScript) return

        const current = this.playerScript.getCurrentHealth()
        const max = this.playerScript.getMaxHealth()
        const percent = Math.max(0, current / max)

        // 更新血条宽度
        if (this.fillSprite && this.originalWidth > 0) {
            const uiTransform = this.fillSprite.node.getComponent(UITransform)
            uiTransform.setContentSize(this.originalWidth * percent, uiTransform.contentSize.height)

            // 根据血量百分比改变颜色
            if (percent < GameConstants.HEALTH_BAR_RED_THRESHOLD) {
                this.fillSprite.color = Color.RED
            } else if (percent < GameConstants.HEALTH_BAR_YELLOW_THRESHOLD) {
                this.fillSprite.color = Color.YELLOW
            } else {
                this.fillSprite.color = Color.GREEN
            }
        }

        // 更新血量文本 - 取整显示
        if (this.healthText) {
            // 使用 Math.floor 向下取整，或者 Math.ceil 向上取整
            const displayCurrent = Math.floor(current)
            const displayMax = Math.floor(max)
            this.healthText.string = `${displayCurrent}/${displayMax}`

            // 文本颜色
            if (percent < GameConstants.HEALTH_BAR_RED_THRESHOLD) {
                this.healthText.color = Color.RED
            } else if (percent < GameConstants.HEALTH_BAR_YELLOW_THRESHOLD) {
                this.healthText.color = new Color(
                    GameConstants.HEALTH_WARNING_COLOR_R,
                    GameConstants.HEALTH_WARNING_COLOR_G,
                    GameConstants.HEALTH_WARNING_COLOR_B,
                    255)
            } else {
                this.healthText.color = new Color(0, 0, 0, 255)
            }
        }
    }

    protected onDestroy(): void {
        EventBus.off(EventNames.PLAYER_HEALTH_CHANGE, this.onHealthChange, this)
    }

    update(deltaTime: number) {

    }
}


