// assets/scripts/settings/SettingsManager.ts

import { SettingsData, DEFAULT_SETTINGS, SettingsStorage } from './SettingsData';

export class SettingsManager {
    private static instance: SettingsManager;
    private settings: SettingsData;

    private constructor() {
        this.settings = SettingsStorage.load();
    }

    static getInstance(): SettingsManager {
        if (!SettingsManager.instance) {
            SettingsManager.instance = new SettingsManager();
        }
        return SettingsManager.instance;
    }

    // ========== Getter ==========
    getSettings(): SettingsData { return { ...this.settings }; }
    getMasterVolume(): number { return this.settings.masterVolume; }
    getSfxVolume(): number { return this.settings.sfxVolume; }
    getBgmVolume(): number { return this.settings.bgmVolume; }
    isAutoAttack(): boolean { return this.settings.autoAttack; }
    isShowDamageNumbers(): boolean { return this.settings.showDamageNumbers; }

    // ========== Setter ==========
    setMasterVolume(value: number): void {
        this.settings.masterVolume = Math.max(0, Math.min(1, value));
        this.save();
    }

    setSfxVolume(value: number): void {
        this.settings.sfxVolume = Math.max(0, Math.min(1, value));
        this.save();
    }

    setBgmVolume(value: number): void {
        this.settings.bgmVolume = Math.max(0, Math.min(1, value));
        this.save();
    }

    setAutoAttack(enabled: boolean): void {
        this.settings.autoAttack = enabled;
        this.save();
    }

    setShowDamageNumbers(enabled: boolean): void {
        this.settings.showDamageNumbers = enabled;
        this.save();
    }

    resetToDefault(): void {
        this.settings = { ...DEFAULT_SETTINGS };
        this.save();
    }

    private save(): void {
        SettingsStorage.save(this.settings);
        console.log('[Settings] 已保存');
    }
}