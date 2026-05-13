import { _decorator, Component, Label, Node } from 'cc';
import { EventBus } from '../Enemy/EventBus';
const { ccclass, property } = _decorator;

@ccclass('LevelUI')
export class LevelUI extends Component {
    @property(Node)
    player: Node = null // 玩家节点

    @property(Label)
    levelLabel: Label = null // 等级显示文本

    private playerScript: any = null
    private currentLevel: number = 1 // 当前等级

    start() {
        if(this.player){
            this.playerScript = this.player.getComponent('PlayerController')
            // 监听升级事件
            EventBus.on('player-level-up', this.onLevelUp, this)
            // 初始更新
            this.updateLevelDisplay()
        }
    }

    protected onDestroy(): void {
        EventBus.off('player-level-up', this.onLevelUp, this)
    }

    private onLevelUp(){
        this.currentLevel++
        this.updateLevelDisplay()
    }

    private updateLevelDisplay(){
        if(this.levelLabel){
            this.levelLabel.string = `Lv.${this.currentLevel}`
        }
    }

    // 获取当前等级
    public getLevel(): number{
        return this.currentLevel
    }

    update(deltaTime: number) {
        
    }
}


