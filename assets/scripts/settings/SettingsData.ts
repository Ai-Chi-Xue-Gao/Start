// assets/scripts/settings/SettingsData.ts

export interface SettingsData {
    masterVolume: number;       // 主音量 0-1
    sfxVolume: number;          // 音效音量 0-1
    bgmVolume: number;          // 背景音乐音量 0-1
    autoAttack: boolean;        // 自动攻击
    showDamageNumbers: boolean; // 显示伤害数字
}

export const DEFAULT_SETTINGS: SettingsData = {
    masterVolume: 1.0,
    sfxVolume: 1.0,
    bgmVolume: 0.8,
    autoAttack: true,
    showDamageNumbers: true,
};

export const SETTINGS_KEY = 'game_settings';

export class SettingsStorage {
    static save(settings: SettingsData): void {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error('[Settings] 保存失败:', e);
        }
    }

    static load(): SettingsData {
        try {
            const json = localStorage.getItem(SETTINGS_KEY);
            if (json) {
                const saved = JSON.parse(json);
                return { ...DEFAULT_SETTINGS, ...saved };
            }
        } catch (e) {
            console.error('[Settings] 加载失败:', e);
        }
        return { ...DEFAULT_SETTINGS };
    }
}