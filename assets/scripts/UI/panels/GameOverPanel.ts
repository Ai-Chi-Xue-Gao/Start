import { _decorator, Button, Component, director, Label, Node } from 'cc';
import { EventBus } from '../../core/EventBus';
import { PlayerController } from '../../entities/player/PlayerController';
import { EventNames } from '../../utils/EventNames';
const { ccclass, property } = _decorator;

@ccclass('GameOverPanel')
export class GameOverPanel extends Component {
    @property(Node)
    panelNode: Node = null // 面板根节点

    @property(Label)
    statsLabel: Label = null // 统计信息标签

    @property(Button)
    restartButton: Button = null // 重新开始按钮

    private killCount: number = 0 // 击杀数
    private startTime: number = 0 // 游戏开始时间戳
    private finalTime: number = 0 // 最终生存时间

    start() {
        // 初始隐藏面板
        if(this.panelNode){
            this.panelNode.active = false
        }

        // 记录开始时间
        this.startTime = Date.now() / 1000

        // 监听敌人死亡事件，累加击杀数
        EventBus.on(EventNames.ENEMY_DIED, () => {
            this.killCount++
        })

        // 监听玩家死亡事件，弹出游戏结束面板
        EventBus.on(EventNames.PLAYER_DIED, () => {
            this.showGameOver()
        })

        // 绑定重新开始按钮事件
        if(this.restartButton){
            this.restartButton.node.on(Button.EventType.CLICK, this.restartGame, this)
        }
    }

    private showGameOver(){
        // 计算生成时间
        this.finalTime = Math.floor(Date.now() / 1000 - this.startTime)

        // 获取玩家等级
        const canvas = this.node.scene.getChildByName('Canvas')
        const player = canvas?.getChildByName('Player')
        let level = 1
        if(player){
            const playerController = player.getComponent(PlayerController)
            if(playerController && playerController.getLevel){
                level = playerController.getLevel()
            }
        }

        // 更新统计文本
        if(this.statsLabel){
            this.statsLabel.string = `击杀数: ${this.killCount}\n生存时间: ${this.finalTime} 秒\n等级: ${level}`
        }

        // 显示面板
        if(this.panelNode){
            this.panelNode.active = true
        }

        // 暂停游戏
        EventBus.emit(EventNames.GAME_PAUSE, true)
    }

    private restartGame(){
        // 重新加载当前场景
        director.loadScene('Game')
    }

    protected onDestroy(): void {
        EventBus.off(EventNames.ENEMY_DIED, null, this)
        EventBus.off(EventNames.PLAYER_DIED, null, this)
        if(this.restartButton && this.restartButton.node){
            this.restartButton.node.off(Button.EventType.CLICK, this.restartGame, this)
        }
    }

    update(deltaTime: number) {
        
    }
}


