import { _decorator, Component, Label, Node, UITransform, Color, tween, UIOpacity, Vec3 } from 'cc';
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
export class SkillTooltip extends Component {
    @property(Label)
    nameLabel: Label = null           // 技能名称

    @property(Label)
    descriptionLabel: Label = null    // 技能描述

    @property(Label)
    levelLabel: Label = null          // 等级信息

    @property(Label)
    upgradeLabel: Label = null        // 下一级解锁提示

    @property(Label)
    rarityLabel: Label = null         // 稀有度标签

    @property(Node)
    fusionMark: Node = null           // 合成标记

    @property(Label)
    fusionRequireLabel: Label = null  // 合成需求

    @property(Node)
    background: Node = null           // 背景（用于透明度动画）

    // 稀有度颜色配置
    private readonly rarityColors: Record<string, Color> = {
        'common': new Color(200, 200, 200, 255),
        'rare': new Color(80, 120, 255, 255),
        'epic': new Color(160, 80, 255, 255),
        'legendary': new Color(255, 160, 50, 255),
        'mythic': new Color(255, 80, 160, 255)
    }

    // 稀有度名称
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
        // 初始隐藏
        this.node.active = false
    }

    /**
     * 显示技能提示
     * @param skillData 技能数据
     * @param worldPosition 世界坐标位置
     * @param skillId 技能ID（可选）
     */
    public show(skillData: SkillData, worldPosition: Vec3, skillId?: string) {
        if (!skillData) return

        this.currentSkillId = skillId || ''
        this.updateContent(skillData)

        // 设置位置（偏移一些，避免遮挡）
        this.node.worldPosition = new Vec3(
            worldPosition.x + 50,
            worldPosition.y - 30,
            worldPosition.z
        )

        this.node.active = true
        this.isShowing = true

        // 淡入动画
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
        // 技能名称
        if (this.nameLabel) {
            this.nameLabel.string = data.name
            this.nameLabel.color = this.rarityColors[data.rarity] || Color.WHITE
        }

        // 技能描述
        if (this.descriptionLabel) {
            this.descriptionLabel.string = data.description
        }

        // 等级信息
        if (this.levelLabel) {
            if (data.currentLevel > 0) {
                this.levelLabel.string = `等级 ${data.currentLevel}/${data.maxLevel}`
                this.levelLabel.color = new Color(200, 200, 100, 255)
            } else {
                this.levelLabel.string = `新技能`
                this.levelLabel.color = new Color(100, 200, 255, 255)
            }
        }

        // 下一级解锁提示
        if (this.upgradeLabel) {
            if (data.nextUpgradeDesc && data.currentLevel > 0) {
                this.upgradeLabel.string = `✨ 下一级: ${data.nextUpgradeDesc}`
                this.upgradeLabel.node.active = true
            } else {
                this.upgradeLabel.node.active = false
            }
        }

        // 稀有度
        if (this.rarityLabel) {
            this.rarityLabel.string = this.rarityNames[data.rarity] || ''
            this.rarityLabel.color = this.rarityColors[data.rarity] || Color.WHITE
        }

        // 合成标记和需求
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

    update(deltaTime: number) {
        // 可选：跟随鼠标/手指位置
    }
}