import { _decorator, Button, Component, director, Node, sys } from 'cc';
import { EventBus } from '../core/EventBus';
const { ccclass, property } = _decorator;

@ccclass('MainMenu')
export class MainMenu extends Component {
    @property(Node)
    startButton: Node = null

    @property(Node)
    bestiaryButton: Node = null

    @property(Node)
    achievementButton: Node = null

    @property(Node)
    settingButton: Node = null

    @property(Node)
    modeSelectPanel: Node = null // 模式选择面板

    @property(Button)
    singleButton: Button = null // 单机按钮

    @property(Button)
    multiButton: Button = null // 联机按钮

    @property(Button)
    cancelButton: Button = null // 取消按钮

    start() {
        // 绑定按钮事件
        if(this.startButton){
            this.startButton.on(Button.EventType.CLICK, this.onStartGame, this)
        }

        if(this.bestiaryButton){
            this.bestiaryButton.on(Button.EventType.CLICK, this.onBestiary, this)
        }

        if(this.achievementButton){
            this.achievementButton.on(Button.EventType.CLICK, this.onAchievement, this)
        }

        if(this.settingButton){
            this.settingButton.on(Button.EventType.CLICK, this.onSetting, this)
        }

        // 绑定模式选择按钮
        if(this.singleButton){
            this.singleButton.node.on(Button.EventType.CLICK, this.onSinglePlayer, this)
        }

        if(this.multiButton){
            this.multiButton.node.on(Button.EventType.CLICK, this.onMultiPlayer, this)
        }

        if(this.cancelButton){
            this.cancelButton.node.on(Button.EventType.CLICK, this.closeModeSelect, this)
        }

        // 确保面板初始隐藏
        if(this.modeSelectPanel){
            this.modeSelectPanel.active = false
        }
    }

    // 点击开始游戏
    private onStartGame(){
        this.openModeSelect()
    }

    // 打开模式选择面板
    private openModeSelect(){
        if(this.modeSelectPanel){
            this.modeSelectPanel.active = true
        }
    }

    // 关闭模式选择面板
    private closeModeSelect(){
        if(this.modeSelectPanel){
            this.modeSelectPanel.active = false
        }
    }

    // 单机模式
    private onSinglePlayer(){
        console.log('选择单机模式');
        (window as any).gameMode = 'single'
        this.closeModeSelect()
        director.loadScene('Game')
    }

    // 联机模式
    private onMultiPlayer(){
        console.log('选择联机模式');
        (window as any).gameMode = 'multi'
        this.closeModeSelect()
        director.loadScene('Game')
    }

    private onBestiary(){

    }

    private onAchievement(){

    }

    private onSetting(){

    }
}


