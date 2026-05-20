// assets/scripts/ui/MainMenu.ts

import { _decorator, assetManager, Button, director, Node } from 'cc';
import { BaseComponent } from '../core/BaseComponent';

const { ccclass, property } = _decorator;

@ccclass('MainMenu')
export class MainMenu extends BaseComponent {
    @property(Node)
    startButton: Node = null

    @property(Node)
    bestiaryButton: Node = null

    @property(Node)
    achievementButton: Node = null

    @property(Node)
    settingButton: Node = null

    @property(Node)
    modeSelectPanel: Node = null

    @property(Button)
    singleButton: Button = null

    @property(Button)
    multiButton: Button = null

    @property(Button)
    cancelButton: Button = null

    start() {
        if (this.startButton) {
            this.startButton.on(Button.EventType.CLICK, this.onStartGame, this)
        }

        if (this.bestiaryButton) {
            this.bestiaryButton.on(Button.EventType.CLICK, this.onBestiary, this)
        }

        if (this.achievementButton) {
            this.achievementButton.on(Button.EventType.CLICK, this.onAchievement, this)
        }

        if (this.settingButton) {
            this.settingButton.on(Button.EventType.CLICK, this.onSetting, this)
        }

        if (this.singleButton) {
            this.singleButton.node.on(Button.EventType.CLICK, this.onSinglePlayer, this)
        }

        if (this.multiButton) {
            this.multiButton.node.on(Button.EventType.CLICK, this.onMultiPlayer, this)
        }

        if (this.cancelButton) {
            this.cancelButton.node.on(Button.EventType.CLICK, this.closeModeSelect, this)
        }

        if (this.modeSelectPanel) {
            this.modeSelectPanel.active = false
        }

        this.scheduleOnce(() => {
            this.loadGameplayAndUI().then(() => {
                console.log('[MainMenu] 测试加载完成')
            })
        }, 1)
    }

    private onStartGame() {
        this.openModeSelect()
    }

    private openModeSelect() {
        if (this.modeSelectPanel) {
            this.modeSelectPanel.active = true
        }
    }

    private closeModeSelect() {
        if (this.modeSelectPanel) {
            this.modeSelectPanel.active = false
        }
    }

    private async loadGameplayAndUI() {
        return new Promise<void>((resolve) => {
            let loadedCount = 0
            const onLoad = () => {
                loadedCount++
                if (loadedCount >= 2) resolve()
            }

            assetManager.loadBundle('gameplay', (err, bundle) => {
                if (err) console.error('加载 gameplay 失败:', err)
                onLoad()
            })
            assetManager.loadBundle('ui', (err, bundle) => {
                if (err) console.error('加载 ui 失败:', err)
                onLoad()
            })
        })
    }

    private async onSinglePlayer() {
        console.log('选择单机模式')
        this.closeModeSelect()

        console.log('正在加载游戏资源...')
        await this.loadGameplayAndUI()

        console.log('资源加载完成，进入游戏')
        ;(window as any).gameMode = 'single'
        director.loadScene('Game')
    }

    private onMultiPlayer() {
        console.log('选择联机模式')
        ;(window as any).gameMode = 'multi'
        this.closeModeSelect()
        director.loadScene('Game')
    }

    private onBestiary() {
        // TODO: 实现图鉴功能
    }

    private onAchievement() {
        // TODO: 实现成就功能
    }

    private onSetting() {
        // TODO: 实现设置功能
    }
}