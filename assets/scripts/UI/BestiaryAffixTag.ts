// assets/scripts/ui/BestiaryAffixTag.ts

import { _decorator, Label, Sprite, Color, UITransform } from 'cc';
import { BaseComponent } from '../core/BaseComponent';
import { RARITY_COLORS } from '../bestiary/BestiaryData';

const { ccclass, property } = _decorator;

/**
 * 图鉴词条标签
 */
@ccclass('BestiaryAffixTag')
export class BestiaryAffixTag extends BaseComponent {
    @property(Label)
    label: Label = null;

    @property(Sprite)
    background: Sprite = null;

    private currentRarity: string = 'common';

    start() {
        if (!this.label) {
            this.label = this.node.getComponent(Label);
        }
        if (!this.background) {
            this.background = this.node.getComponent(Sprite);
        }
    }

    /**
     * 设置词条标签数据
     * @param text 显示文字
     * @param rarity 稀有度 (common/rare/epic/legendary)
     * @param isUnlocked 是否已解锁
     */
    public setData(text: string, rarity: string, isUnlocked: boolean = true) {
        this.currentRarity = rarity;
        
        if (this.label) {
            this.label.string = text;
            this.label.color = isUnlocked ? Color.WHITE : new Color(120, 120, 120, 255);
        }
        
        if (this.background) {
            const colorHex = RARITY_COLORS[rarity] || '#969696';
            const color = this.hexToColor(colorHex);
            
            if (isUnlocked) {
                // 已解锁：半透明背景
                this.background.color = new Color(color.r, color.g, color.b, 80);
            } else {
                // 未解锁：深灰色背景
                this.background.color = new Color(50, 50, 50, 255);
            }
        }
    }

    /**
     * 设置仅显示问号（未解锁）
     */
    public setLocked() {
        this.setData('???', 'common', false);
    }

    /**
     * 十六进制颜色转 Color
     */
    private hexToColor(hex: string): Color {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            return new Color(
                parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16),
                255
            );
        }
        return Color.GRAY;
    }
}