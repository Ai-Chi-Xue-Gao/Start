// assets/scripts/ui/MainMenu.ts

import { _decorator, assetManager, Button, director, Node } from 'cc';
import { BaseComponent } from '../core/BaseComponent';
import { SettingsManager } from '../settings/SettingsManager';
import { SettingsPanelEvents } from '../ui/SettingsPanel';
import { BestiaryPanelEvents } from '../bestiary/BestiaryPanel';
import { EventBus } from '../core/EventBus';
import { BestiaryConfigLoader } from '../bestiary/BestiaryConfigLoader';
import { GameContext, GameMode } from '../core/GameContext';

const { ccclass, property } = _decorator;

@ccclass('MainMenu')
export class MainMenu extends BaseComponent {
    // ========== 按钮节点 ==========
    @property(Node)
    startButton: Node = null

    @property(Node)
    bestiaryButton: Node = null

    @property(Node)
    achievementButton: Node = null

    @property(Node)
    settingButton: Node = null

    // ========== 面板节点 ==========
    @property(Node)
    modeSelectPanel: Node = null

    @property(Node)
    settingsPanel: Node = null

    @property(Node)
    bestiaryPanel: Node = null

    // ========== 模式选择按钮 ==========
    @property(Button)
    singleButton: Button = null

    @property(Button)
    multiButton: Button = null

    @property(Button)
    cancelButton: Button = null

    // 事件绑定引用
    private boundOnSetting: () => void = null;
    private boundOnBestiary: () => void = null;
    private boundOnSettingsClose: () => void = null;
    private boundOnBestiaryClose: () => void = null;

    // 防止重复切换场景标志
    private isSwitchingScene: boolean = false;

    // 分包加载状态
    private bundlesLoading: boolean = false;
    private bundlesLoaded: boolean = false;

    start() {
        SettingsManager.getInstance();

        // 预加载图鉴配置
        BestiaryConfigLoader.getInstance().loadAll(() => {});

        this.hideAllPanels();
        this.bindEvents();
        this.bindPanelEvents();

        // 预加载分包（静默加载，不阻塞UI）
        this.preloadBundles();
    }

    /**
     * 预加载所有分包（简化版，不加载不存在的资源）
     */
    private preloadBundles() {
        if (this.bundlesLoaded || this.bundlesLoading) return;

        this.bundlesLoading = true;

        let loadedCount = 0;
        const totalBundles = 3; // gameplay, ui, network

        const onLoadComplete = () => {
            loadedCount++;
            if (loadedCount >= totalBundles) {
                this.bundlesLoading = false;
                this.bundlesLoaded = true;
            }
        };

        // 加载 gameplay 分包
        assetManager.loadBundle('gameplay', (err, bundle) => {
            onLoadComplete();
        });

        // 加载 ui 分包
        assetManager.loadBundle('ui', (err, bundle) => {
            onLoadComplete();
        });

        // 加载 network 分包
        assetManager.loadBundle('network', (err, bundle) => {
            onLoadComplete();
        });
    }

    private hideAllPanels() {
        if (this.modeSelectPanel) this.modeSelectPanel.active = false;
        if (this.settingsPanel) this.settingsPanel.active = false;
        if (this.bestiaryPanel) this.bestiaryPanel.active = false;
    }

    private bindEvents() {
        if (this.startButton) {
            this.startButton.on(Button.EventType.CLICK, this.onStartGame, this)
        }
        if (this.bestiaryButton) {
            this.boundOnBestiary = this.onBestiary.bind(this);
            this.bestiaryButton.on(Button.EventType.CLICK, this.boundOnBestiary, this)
        }
        if (this.achievementButton) {
            this.achievementButton.on(Button.EventType.CLICK, this.onAchievement, this)
        }
        if (this.settingButton) {
            this.boundOnSetting = this.onSetting.bind(this);
            this.settingButton.on(Button.EventType.CLICK, this.boundOnSetting, this)
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
    }

    private bindPanelEvents() {
        this.boundOnSettingsClose = this.closeSettingsPanel.bind(this);
        this.boundOnBestiaryClose = this.closeBestiaryPanel.bind(this);

        EventBus.on(SettingsPanelEvents.CLOSE, this.boundOnSettingsClose);
        EventBus.on(BestiaryPanelEvents.CLOSE, this.boundOnBestiaryClose);
    }

    private unbindPanelEvents() {
        if (this.boundOnSettingsClose) {
            EventBus.off(SettingsPanelEvents.CLOSE, this.boundOnSettingsClose);
        }
        if (this.boundOnBestiaryClose) {
            EventBus.off(BestiaryPanelEvents.CLOSE, this.boundOnBestiaryClose);
        }
    }

    private unbindEvents() {
        if (this.startButton && this.startButton.isValid) {
            this.startButton.off(Button.EventType.CLICK, this.onStartGame, this)
        }
        if (this.bestiaryButton && this.bestiaryButton.isValid && this.boundOnBestiary) {
            this.bestiaryButton.off(Button.EventType.CLICK, this.boundOnBestiary, this)
        }
        if (this.achievementButton && this.achievementButton.isValid) {
            this.achievementButton.off(Button.EventType.CLICK, this.onAchievement, this)
        }
        if (this.settingButton && this.settingButton.isValid && this.boundOnSetting) {
            this.settingButton.off(Button.EventType.CLICK, this.boundOnSetting, this)
        }
    }

    protected onDestroy() {
        this.unbindEvents();
        this.unbindPanelEvents();
    }

    // ========== 开始游戏 ==========
    private onStartGame() {
        this.openModeSelect()
    }

    private openModeSelect() {
        this.closeSettingsPanel();
        this.closeBestiaryPanel();
        if (this.modeSelectPanel) {
            this.modeSelectPanel.active = true
        }
    }

    private closeModeSelect() {
        if (this.modeSelectPanel) {
            this.modeSelectPanel.active = false
        }
    }

    // ========== 设置面板 ==========
    private onSetting() {
        if (this.settingsPanel && this.settingsPanel.active) {
            this.closeSettingsPanel();
        } else {
            this.openSettingsPanel();
        }
    }

    private openSettingsPanel() {
        this.closeModeSelect();
        this.closeBestiaryPanel();
        if (this.settingsPanel) {
            this.settingsPanel.active = true;
        }
    }

    public closeSettingsPanel() {
        if (this.settingsPanel) {
            this.settingsPanel.active = false;
        }
    }

    // ========== 图鉴面板 ==========
    private onBestiary() {
        if (this.bestiaryPanel && this.bestiaryPanel.active) {
            this.closeBestiaryPanel();
        } else {
            this.openBestiaryPanel();
        }
    }

    private openBestiaryPanel() {
        this.closeModeSelect();
        this.closeSettingsPanel();
        if (this.bestiaryPanel) {
            this.bestiaryPanel.active = true;
        }
    }

    public closeBestiaryPanel() {
        if (this.bestiaryPanel) {
            this.bestiaryPanel.active = false;
        }
    }

    // ========== 成就 ==========
    private onAchievement() {
        // 成就功能待开发
    }

    // ========== 等待分包加载完成 ==========
    private waitForBundlesLoaded(): Promise<void> {
        return new Promise((resolve) => {
            if (this.bundlesLoaded) {
                resolve();
                return;
            }

            const checkInterval = setInterval(() => {
                if (this.bundlesLoaded) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 50);
        });
    }

    // ========== 单机/联机 ==========
    private async onSinglePlayer() {
        if (this.isSwitchingScene) return;

        this.closeModeSelect();

        // 确保分包已加载
        if (!this.bundlesLoaded) {
            if (!this.bundlesLoading) {
                this.preloadBundles();
            }
            await this.waitForBundlesLoaded();
        }

        GameContext.getInstance().setGameMode(GameMode.SINGLE);

        this.isSwitchingScene = true;

        this.scheduleOnce(() => {
            director.loadScene('Game', (err) => {
                this.isSwitchingScene = false;
            });
        }, 0.05);
    }

    private async onMultiPlayer() {
        if (this.isSwitchingScene) return;

        this.closeModeSelect();

        // 确保分包已加载
        if (!this.bundlesLoaded) {
            if (!this.bundlesLoading) {
                this.preloadBundles();
            }
            await this.waitForBundlesLoaded();
        }

        GameContext.getInstance().setGameMode(GameMode.MULTI);

        this.isSwitchingScene = true;

        this.scheduleOnce(() => {
            director.loadScene('Game', (err) => {
                this.isSwitchingScene = false;
            });
        }, 0.05);
    }
}