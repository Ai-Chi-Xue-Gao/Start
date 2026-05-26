// assets/scripts/ui/MainMenu.ts

import { _decorator, assetManager, Button, director, Node } from 'cc';
import { BaseComponent } from '../core/BaseComponent';
import { SettingsManager } from '../settings/SettingsManager';
import { SettingsPanelEvents } from '../ui/SettingsPanel';
import { BestiaryPanelEvents } from '../bestiary/BestiaryPanel';
import { EventBus } from '../core/EventBus';
import { BestiaryConfigLoader } from '../bestiary/BestiaryConfigLoader';

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
        console.log('[MainMenu] SettingsManager 已初始化');

        // 预加载图鉴配置
        BestiaryConfigLoader.getInstance().loadAll(() => {
            console.log('[MainMenu] 图鉴配置预加载完成');
        });

        this.hideAllPanels();
        this.bindEvents();
        this.bindPanelEvents();

        // 预加载分包（静默加载，不阻塞UI）
        this.preloadBundles();

        console.log('[MainMenu] 初始化完成');
    }

    /**
     * 预加载所有分包
     */
    private preloadBundles() {
        if (this.bundlesLoaded || this.bundlesLoading) return;

        this.bundlesLoading = true;
        console.log('[MainMenu] 开始预加载分包...');

        let loadedCount = 0;
        let hasError = false;
        const totalBundles = 3; // gameplay, ui, network

        const onLoadComplete = () => {
            loadedCount++;
            if (loadedCount >= totalBundles) {
                this.bundlesLoading = false;
                this.bundlesLoaded = true;
                console.log('[MainMenu] 所有分包预加载完成');
                this.ensureKeyScriptsLoaded();
            }
        };

        // 加载 gameplay 分包
        assetManager.loadBundle('gameplay', (err, bundle) => {
            if (err) {
                console.error('[MainMenu] 加载 gameplay 分包失败:', err);
                hasError = true;
            } else {
                console.log('[MainMenu] gameplay 分包加载成功');
            }
            onLoadComplete();
        });

        // 加载 ui 分包
        assetManager.loadBundle('ui', (err, bundle) => {
            if (err) {
                console.error('[MainMenu] 加载 ui 分包失败:', err);
                hasError = true;
            } else {
                console.log('[MainMenu] ui 分包加载成功');
            }
            onLoadComplete();
        });

        // 加载 network 分包
        assetManager.loadBundle('network', (err, bundle) => {
            if (err) {
                console.error('[MainMenu] 加载 network 分包失败:', err);
                hasError = true;
            } else {
                console.log('[MainMenu] network 分包加载成功');
            }
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
            console.log('[MainMenu] 设置按钮事件已绑定');
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
        console.log('[MainMenu] 切换设置面板');
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
            console.log('[MainMenu] 打开设置面板');
        }
    }

    public closeSettingsPanel() {
        if (this.settingsPanel) {
            this.settingsPanel.active = false;
            console.log('[MainMenu] 关闭设置面板');
        }
    }

    // ========== 图鉴面板 ==========
    private onBestiary() {
        console.log('[MainMenu] 切换图鉴面板');
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
            console.log('[MainMenu] 打开图鉴面板');
        }
    }

    public closeBestiaryPanel() {
        if (this.bestiaryPanel) {
            this.bestiaryPanel.active = false;
            console.log('[MainMenu] 关闭图鉴面板');
        }
    }

    // ========== 成就 ==========
    private onAchievement() {
        console.log('[MainMenu] 成就功能待开发');
    }

    // ========== 单机/联机 ==========
    private async onSinglePlayer() {
        if (this.isSwitchingScene) {
            console.log('[MainMenu] 正在切换场景中，忽略重复点击');
            return;
        }

        console.log('选择单机模式');
        this.closeModeSelect();

        // ✅ 确保分包已加载
        if (!this.bundlesLoaded) {
            console.log('[MainMenu] 分包尚未加载完成，等待加载...');

            // 如果还没开始加载，开始加载
            if (!this.bundlesLoading) {
                this.preloadBundles();
            }

            // 等待加载完成
            await this.waitForBundlesLoaded();
        }

        console.log('分包加载完成，进入游戏');
        (window as any).gameMode = 'single';

        this.isSwitchingScene = true;

        this.scheduleOnce(() => {
            director.loadScene('Game', (err) => {
                if (err) {
                    console.error('[MainMenu] 加载 Game 场景失败:', err);
                } else {
                    console.log('[MainMenu] Game 场景加载成功');
                }
            });
        }, 0.05);
    }

    private async onMultiPlayer() {
        if (this.isSwitchingScene) {
            console.log('[MainMenu] 正在切换场景中，忽略重复点击');
            return;
        }

        console.log('选择联机模式');
        this.closeModeSelect();

        // ✅ 确保分包已加载
        if (!this.bundlesLoaded) {
            console.log('[MainMenu] 分包尚未加载完成，等待加载...');

            if (!this.bundlesLoading) {
                this.preloadBundles();
            }

            await this.waitForBundlesLoaded();
        }

        console.log('分包加载完成，进入联机模式');
        (window as any).gameMode = 'multi';

        this.isSwitchingScene = true;

        this.scheduleOnce(() => {
            director.loadScene('Game', (err) => {
                if (err) {
                    console.error('[MainMenu] 加载 Game 场景失败:', err);
                } else {
                    console.log('[MainMenu] Game 场景加载成功');
                }
            });
        }, 0.05);
    }

    /**
    * 等待分包加载完成
    */
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

    /**
    * 确保关键脚本已注册（在分包加载完成后调用）
    */
    private ensureKeyScriptsLoaded() {
        console.log('[MainMenu] 确保关键脚本已注册...');

        this.scheduleOnce(() => {
            const gameplayBundle = assetManager.getBundle('gameplay');
            if (gameplayBundle) {
                gameplayBundle.load('player/GridBackground', (err, asset) => {
                    if (!err) {
                        console.log('[MainMenu] ✓ GridBackground 脚本已注册');
                    } else {
                        console.warn('[MainMenu] GridBackground 加载失败:', err);
                    }
                });

                gameplayBundle.load('player/CameraController', (err, asset) => {
                    if (!err) {
                        console.log('[MainMenu] ✓ CameraController 脚本已注册');
                    } else {
                        console.warn('[MainMenu] CameraController 加载失败:', err);
                    }
                });
            }
        }, 0.1);
    }
}