import { _decorator, Component, Label, Node } from 'cc';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';
import { ServiceLocator } from '../core/ServiceLocator';
import { PlayerController } from '../entities/player/PlayerController';
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
            this.playerScript = ServiceLocator.getInstance().get<PlayerController>('playerController')

            // 从玩家控制器获取初始等级
            if(this.playerScript){
                this.currentLevel = this.playerScript.getLevel()
            }

            // 监听升级事件
            EventBus.on(EventNames.PLAYER_LEVEL_UP, this.onLevelUp, this)
            // 初始更新
            this.updateLevelDisplay()
        }
    }

    protected onDestroy(): void {
        EventBus.off(EventNames.PLAYER_LEVEL_UP, this.onLevelUp, this)
    }

    private onLevelUp(){
        // 升级时也从玩家控制器获取最新等级
        if(this.playerScript){
            this.currentLevel = this.playerScript.getLevel()
        }else{
            this.currentLevel++
        }
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


