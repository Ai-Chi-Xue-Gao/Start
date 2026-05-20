// assets/scripts/ui/SkillTooltip.ts

import { _decorator, Color, Label, Node, tween, UIOpacity, Vec3 } from 'cc';
import { BaseComponent } from '../core/BaseComponent';

const { ccclass, property } = _decorator;

interface SkillData {
    name: string
    description: string
    currentLevel: number
    maxLevel: number
    rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
    nextUpgradeDesc?: string
    fusionRequires?: string[]
}

/**
 * 技能提示框组件
 * 用于显示技能的详细信息
 */
@ccclass('SkillTooltip')
export class SkillTooltip extends BaseComponent {
    @property(Label)
    nameLabel: Label = null

    @property(Label)
    descriptionLabel: Label = null

    @property(Label)
    levelLabel: Label = null

    @property(Label)
    upgradeLabel: Label = null

    @property(Label)
    rarityLabel: Label = null

    @property(Node)
    fusionMark: Node = null

    @property(Label)
    fusionRequireLabel: Label = null

    @property(Node)
    background: Node = null

    private readonly rarityColors: Record<string, Color> = {
        'common': new Color(200, 200, 200, 255),
        'rare': new Color(80, 120, 255, 255),
        'epic': new Color(160, 80, 255, 255),
        'legendary': new Color(255, 160, 50, 255),
        'mythic': new Color(255, 80, 160, 255)
    }

    private readonly rarityNames: Record<string, string> = {
        'common': '普通',
        'rare': '稀有',
        'epic': '史诗',
        'legendary': '传说',
        'mythic': '神话'
    }

    private isShowing: boolean = false
    private currentSkillId: string = ''

    start() {
        this.node.active = false
    }

    /**
     * 显示技能提示
     */
    public show(skillData: SkillData, worldPosition: Vec3, skillId?: string) {
        if (!skillData) return

        this.currentSkillId = skillId || ''
        this.updateContent(skillData)

        this.node.worldPosition = new Vec3(
            worldPosition.x + 50,
            worldPosition.y - 30,
            worldPosition.z
        )

        this.node.active = true
        this.isShowing = true
        this.playFadeIn()
    }

    /**
     * 隐藏提示框
     */
    public hide() {
        if (!this.isShowing) return

        this.isShowing = false
        this.playFadeOut(() => {
            this.node.active = false
        })
    }

    /**
     * 更新内容
     */
    private updateContent(data: SkillData) {
        if (this.nameLabel) {
            this.nameLabel.string = data.name
            this.nameLabel.color = this.rarityColors[data.rarity] || Color.WHITE
        }

        if (this.descriptionLabel) {
            this.descriptionLabel.string = data.description
        }

        if (this.levelLabel) {
            if (data.currentLevel > 0) {
                this.levelLabel.string = `等级 ${data.currentLevel}/${data.maxLevel}`
                this.levelLabel.color = new Color(200, 200, 100, 255)
            } else {
                this.levelLabel.string = `新技能`
                this.levelLabel.color = new Color(100, 200, 255, 255)
            }
        }

        if (this.upgradeLabel) {
            if (data.nextUpgradeDesc && data.currentLevel > 0) {
                this.upgradeLabel.string = `✨ 下一级: ${data.nextUpgradeDesc}`
                this.upgradeLabel.node.active = true
            } else {
                this.upgradeLabel.node.active = false
            }
        }

        if (this.rarityLabel) {
            this.rarityLabel.string = this.rarityNames[data.rarity] || ''
            this.rarityLabel.color = this.rarityColors[data.rarity] || Color.WHITE
        }

        if (data.fusionRequires && data.fusionRequires.length > 0) {
            if (this.fusionMark) {
                this.fusionMark.active = true
            }
            if (this.fusionRequireLabel) {
                this.fusionRequireLabel.string = `需要: ${data.fusionRequires.join(' + ')}`
                this.fusionRequireLabel.node.active = true
            }
        } else {
            if (this.fusionMark) {
                this.fusionMark.active = false
            }
            if (this.fusionRequireLabel) {
                this.fusionRequireLabel.node.active = false
            }
        }
    }

    /**
     * 淡入动画
     */
    private playFadeIn() {
        const uiOpacity = this.background?.getComponent(UIOpacity)
        if (uiOpacity) {
            uiOpacity.opacity = 0
            tween(uiOpacity)
                .to(0.15, { opacity: 255 })
                .start()
        }
    }

    /**
     * 淡出动画
     */
    private playFadeOut(onComplete?: () => void) {
        const uiOpacity = this.background?.getComponent(UIOpacity)
        if (uiOpacity) {
            tween(uiOpacity)
                .to(0.1, { opacity: 0 })
                .call(() => {
                    onComplete?.()
                })
                .start()
        } else {
            onComplete?.()
        }
    }

    /**
     * 检查是否正在显示
     */
    public isVisible(): boolean {
        return this.isShowing && this.node.active
    }
}