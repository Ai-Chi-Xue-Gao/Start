// assets/scripts/ui/SettingsPanel.ts

import { _decorator, Node, Button, Slider, Label, Toggle, Color } from 'cc';
import { BaseComponent } from '../core/BaseComponent';
import { SettingsManager } from '../settings/SettingsManager';
import { EventBus } from '../core/EventBus';

const { ccclass, property } = _decorator;

// 定义事件名称
export const SettingsPanelEvents = {
    CLOSE: 'settings_panel_close'
};

/**
 * 设置面板（简化版 - 只负责设置管理，不控制显示/隐藏）
 */
@ccclass('SettingsPanel')
export class SettingsPanel extends BaseComponent {
    @property(Button)
    closeButton: Button = null;

    @property(Button)
    resetButton: Button = null;

    @property(Slider)
    masterVolumeSlider: Slider = null;
    @property(Slider)
    sfxVolumeSlider: Slider = null;
    @property(Slider)
    bgmVolumeSlider: Slider = null;

    @property(Label)
    masterVolumeLabel: Label = null;
    @property(Label)
    sfxVolumeLabel: Label = null;
    @property(Label)
    bgmVolumeLabel: Label = null;

    @property(Toggle)
    autoAttackToggle: Toggle = null;
    @property(Toggle)
    showDamageToggle: Toggle = null;

    private settingsManager: SettingsManager = null;

    // 事件绑定引用
    private boundClosePanel: () => void = null;
    private boundOnReset: () => void = null;
    private boundOnMasterVolumeChange: (slider: Slider) => void = null;
    private boundOnSfxVolumeChange: (slider: Slider) => void = null;
    private boundOnBgmVolumeChange: (slider: Slider) => void = null;
    private boundOnAutoAttackToggle: (toggle: Toggle) => void = null;
    private boundOnShowDamageToggle: (toggle: Toggle) => void = null;

    start() {
        this.settingsManager = SettingsManager.getInstance();
        this.bindEvents();
        this.updateUI();
    }

    private bindEvents() {
        // 🆕 关闭按钮 - 发送事件通知 MainMenu
        if (this.closeButton && this.closeButton.node) {
            this.boundClosePanel = this.onClose.bind(this);
            this.closeButton.node.off(Button.EventType.CLICK, this.boundClosePanel, this);
            this.closeButton.node.on(Button.EventType.CLICK, this.boundClosePanel, this);
        }

        // 重置按钮
        if (this.resetButton && this.resetButton.node) {
            this.boundOnReset = this.onReset.bind(this);
            this.resetButton.node.off(Button.EventType.CLICK, this.boundOnReset, this);
            this.resetButton.node.on(Button.EventType.CLICK, this.boundOnReset, this);
        }

        // 滑块事件
        if (this.masterVolumeSlider && this.masterVolumeSlider.node) {
            this.boundOnMasterVolumeChange = this.onMasterVolumeChange.bind(this);
            this.masterVolumeSlider.node.off('slide', this.boundOnMasterVolumeChange, this);
            this.masterVolumeSlider.node.on('slide', this.boundOnMasterVolumeChange, this);
        }
        if (this.sfxVolumeSlider && this.sfxVolumeSlider.node) {
            this.boundOnSfxVolumeChange = this.onSfxVolumeChange.bind(this);
            this.sfxVolumeSlider.node.off('slide', this.boundOnSfxVolumeChange, this);
            this.sfxVolumeSlider.node.on('slide', this.boundOnSfxVolumeChange, this);
        }
        if (this.bgmVolumeSlider && this.bgmVolumeSlider.node) {
            this.boundOnBgmVolumeChange = this.onBgmVolumeChange.bind(this);
            this.bgmVolumeSlider.node.off('slide', this.boundOnBgmVolumeChange, this);
            this.bgmVolumeSlider.node.on('slide', this.boundOnBgmVolumeChange, this);
        }

        // 开关事件
        if (this.autoAttackToggle && this.autoAttackToggle.node) {
            this.boundOnAutoAttackToggle = this.onAutoAttackToggle.bind(this);
            this.autoAttackToggle.node.off(Toggle.EventType.TOGGLE, this.boundOnAutoAttackToggle, this);
            this.autoAttackToggle.node.on(Toggle.EventType.TOGGLE, this.boundOnAutoAttackToggle, this);
        }
        if (this.showDamageToggle && this.showDamageToggle.node) {
            this.boundOnShowDamageToggle = this.onShowDamageToggle.bind(this);
            this.showDamageToggle.node.off(Toggle.EventType.TOGGLE, this.boundOnShowDamageToggle, this);
            this.showDamageToggle.node.on(Toggle.EventType.TOGGLE, this.boundOnShowDamageToggle, this);
        }
    }

    private unbindEvents() {
        if (this.closeButton && this.closeButton.node && this.boundClosePanel) {
            this.closeButton.node.off(Button.EventType.CLICK, this.boundClosePanel, this);
        }
        if (this.resetButton && this.resetButton.node && this.boundOnReset) {
            this.resetButton.node.off(Button.EventType.CLICK, this.boundOnReset, this);
        }
    }

    protected onDestroy() {
        this.unbindEvents();
    }

    // 🆕 关闭按钮回调 - 发送事件
    private onClose() {
        console.log('[SettingsPanel] 发送关闭事件');
        EventBus.emit(SettingsPanelEvents.CLOSE);
    }

    private updateUI() {
        if (!this.settingsManager) return;
        
        const s = this.settingsManager.getSettings();

        if (this.masterVolumeSlider) this.masterVolumeSlider.progress = s.masterVolume;
        if (this.sfxVolumeSlider) this.sfxVolumeSlider.progress = s.sfxVolume;
        if (this.bgmVolumeSlider) this.bgmVolumeSlider.progress = s.bgmVolume;

        if (this.masterVolumeLabel) {
            this.masterVolumeLabel.string = `${Math.round(s.masterVolume * 100)}%`;
        }
        if (this.sfxVolumeLabel) {
            this.sfxVolumeLabel.string = `${Math.round(s.sfxVolume * 100)}%`;
        }
        if (this.bgmVolumeLabel) {
            this.bgmVolumeLabel.string = `${Math.round(s.bgmVolume * 100)}%`;
        }

        if (this.autoAttackToggle) this.autoAttackToggle.isChecked = s.autoAttack;
        if (this.showDamageToggle) this.showDamageToggle.isChecked = s.showDamageNumbers;
    }

    private onMasterVolumeChange(slider: Slider) {
        if (!this.settingsManager) return;
        const v = slider.progress;
        this.settingsManager.setMasterVolume(v);
        if (this.masterVolumeLabel) {
            this.masterVolumeLabel.string = `${Math.round(v * 100)}%`;
        }
    }

    private onSfxVolumeChange(slider: Slider) {
        if (!this.settingsManager) return;
        const v = slider.progress;
        this.settingsManager.setSfxVolume(v);
        if (this.sfxVolumeLabel) {
            this.sfxVolumeLabel.string = `${Math.round(v * 100)}%`;
        }
    }

    private onBgmVolumeChange(slider: Slider) {
        if (!this.settingsManager) return;
        const v = slider.progress;
        this.settingsManager.setBgmVolume(v);
        if (this.bgmVolumeLabel) {
            this.bgmVolumeLabel.string = `${Math.round(v * 100)}%`;
        }
    }

    private onAutoAttackToggle(toggle: Toggle) {
        if (!this.settingsManager) return;
        this.settingsManager.setAutoAttack(toggle.isChecked);
    }

    private onShowDamageToggle(toggle: Toggle) {
        if (!this.settingsManager) return;
        this.settingsManager.setShowDamageNumbers(toggle.isChecked);
    }

    private onReset() {
        if (!this.settingsManager) return;
        this.settingsManager.resetToDefault();
        this.updateUI();
    }

    public refreshUI() {
        this.updateUI();
    }
}