import { _decorator, Component, Label, Node, Sprite, UITransform } from 'cc';
import { EventBus } from '../Enemy/EventBus';
const { ccclass, property } = _decorator;

@ccclass('ExpBar')
export class ExpBar extends Component {
    @property(Sprite)
    fillSprite: Sprite = null // 经验条填充图片

    @property(Node)
    player: Node = null // 玩家节点

    @property(Label)
    expText: Label = null // 经验值文本

    private playerScript: any = null
    private originalWidth: number = 0

    start() {
        if(this.player){
            this.playerScript = this.player.getComponent('PlayerController')

            if(this.fillSprite){
                const uiTransform = this.fillSprite.node.getComponent(UITransform)
                this.originalWidth = uiTransform.contentSize.width
            }

            // 监听经验变化事件
            EventBus.on('exp-changed', this.onExpChange, this)

            // 初始更新
            this.updateExpBar()
        }

    }

    protected onDestroy(): void {
        EventBus.off('exp-changed', this.onExpChange, this)
    }

    private onExpChange(current: number, max: number){
        this.updateExpBar()
    }

    private updateExpBar(){
        if(!this.playerScript) return

        const current = this.playerScript.getExp()
        const max = this.playerScript.getExpToNextLevel()
        const percent = Math.min(1, current / max)

        // 更新经验条宽度
        if(this.fillSprite && this.originalWidth > 0){
            const uiTransform = this.fillSprite.node.getComponent(UITransform)
            uiTransform.setContentSize(this.originalWidth * percent, uiTransform.contentSize.height
            )
        }

        // 更新经验值文本
        if(this.expText){
            this.expText.string = `${current}/${max}`
        }
    }

    update(deltaTime: number) {
        
    }
}


