import { _decorator, Color, Component, Label, Node, Sprite, UITransform } from 'cc';
import { EventBus } from '../Enemy/EventBus';
const { ccclass, property } = _decorator;

@ccclass('HealthBar')
export class HealthBar extends Component {
    @property(Sprite)
    fillSprite: Sprite = null // 血条填充图片

    @property(Node)
    player: Node = null // 玩家节点

    @property(Label)
    healthText: Label = null // 血量文本

    private playerScript: any = null
    private originalWidth: number = 0

    start() {
        // 获取玩家脚本
        if(this.player){
            this.playerScript = this.player.getComponent('PlayerController')

            // 记录原始宽度
            if(this.fillSprite){
                const  uiTransform = this.fillSprite.node.getComponent(UITransform)
                this.originalWidth = uiTransform.contentSize.width
            }

            // 监听血量变化事件
            EventBus.on('player-health-change', this.onHealthChange, this)

            // 初始更新
            this.updateHealthBar();
        }
    }

    private onHealthChange(current: number, max: number){
        if (!this.isValid) return
        this.updateHealthBar()
    }

    private updateHealthBar(){
        if(!this.playerScript) return

        const current = this.playerScript.getCurrentHealth()
        const max = this.playerScript.getMaxHealth()
        const percent = Math.max(0, current / max)

        // 更新血条宽度
        if(this.fillSprite && this.originalWidth > 0){
            const uiTransform = this.fillSprite.node.getComponent(UITransform)
            uiTransform.setContentSize(this.originalWidth * percent, uiTransform.contentSize.height)

            // 根据血量百分比改变颜色
            if(percent < 0.3){
                this.fillSprite.color = Color.RED // 红色 < 30%
            }else if(percent < 0.6){
                this.fillSprite.color = Color.YELLOW // 黄色 30%-60%
            }else{
                this.fillSprite.color = Color.GREEN // 绿色 > 60%
            }
        }

        // 更新血量文本
        if(this.healthText){
            this.healthText.string = `${Math.max(0, current)}/${max}`

            // 文本颜色：低血量用红色，高血量用黑色/深色（更醒目）
            if (percent < 0.3) {
                this.healthText.color = Color.RED      // 危险红色
            } else if (percent < 0.6) {
                this.healthText.color = new Color(255, 200, 0, 255)  // 警告橙色
            } else {
                this.healthText.color = new Color(0, 0, 0, 255)      // 黑色
            }
        }
    }

    protected onDestroy(): void {
        EventBus.off('player-health-change', this.onHealthChange, this)
    }

    update(deltaTime: number) {
        
    }
}


