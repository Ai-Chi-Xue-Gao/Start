import { _decorator, Button, Component, director, Node } from 'cc';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';
const { ccclass, property } = _decorator;

@ccclass('PauseManager')
export class PauseManager extends Component {
    @property(Button)
    pauseButton: Button = null // 暂停按钮

    @property(Node)
    pausePanel: Node = null // 暂停面板

    @property(Button)
    resumeButton: Button = null // 继续游戏按钮

    @property(Button)
    menuButton: Button = null // 返回游戏菜单

    private isPaused: boolean = false

    start() {
        // 初始隐藏暂停面板
        if(this.pausePanel){
            this.pausePanel.active = false
        }

        // 绑定暂停按钮事件
        if(this.pauseButton){
            this.pauseButton.node.on(Button.EventType.CLICK, this.onPauseClick, this)
        }

        // 绑定继续游戏按钮事件
        if(this.resumeButton){
            this.resumeButton.node.on(Button.EventType.CLICK, this.onResumeClick, this)
        }

        // 绑定返回主菜单按钮事件
        if(this.menuButton){
            this.menuButton.node.on(Button.EventType.CLICK, this.onMenuClick, this)
        }
    }

    // 点击暂停按钮
    private onPauseClick(){
        if(this.isPaused) return
        this.isPaused = true

        // 显示暂停面板
        if(this.pausePanel){
            this.pausePanel.active = true
        }

        // 发射暂停事件（通知游戏暂停）
        EventBus.emit(EventNames.GAME_PAUSE, true)
    }

    // 点击继续游戏按钮
    private onResumeClick(){
        if(!this.isPaused) return
        this.isPaused = false

        // 隐藏暂停面板
        if(this.pausePanel){
            this.pausePanel.active = false
        }

        // 发生恢复事件
        EventBus.emit(EventNames.GAME_PAUSE, false)
    }

    // 点击返回主菜单按钮
    private onMenuClick(){
        // 恢复游戏
        EventBus.emit(EventNames.GAME_PAUSE, false)

        // 加载主菜单场景
        director.loadScene('Main')
    }

    protected onDestroy(): void {
        // 解绑暂停按钮事件
        if (this.pauseButton && this.pauseButton.node && this.pauseButton.node.isValid) {
            this.pauseButton.node.off(Button.EventType.CLICK, this.onPauseClick, this)
        }

        // 解绑继续游戏按钮事件
        if (this.resumeButton && this.resumeButton.node && this.resumeButton.node.isValid) {
            this.resumeButton.node.off(Button.EventType.CLICK, this.onResumeClick, this)
        }

        // 解绑返回主菜单按钮事件
        if (this.menuButton && this.menuButton.node && this.menuButton.node.isValid) {
            this.menuButton.node.off(Button.EventType.CLICK, this.onMenuClick, this)
        }
    }

    update(deltaTime: number) {
        
    }
}


