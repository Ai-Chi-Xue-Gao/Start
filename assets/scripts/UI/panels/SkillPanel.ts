import { _decorator, Button, Component, instantiate, Label, Node, Prefab, Color, resources, JsonAsset, Sprite, SpriteFrame, UITransform } from 'cc';
import { EventBus } from '../../core/EventBus';
import { PlayerController } from '../../entities/player/PlayerController';
import { EventNames } from '../../utils/EventNames';
import { SkillManager } from '../../managers/SkillManager';
import { GameConstants } from '../../utils/GameConstants';
import { ObjectPool } from '../../utils/ObjectPool';

const { ccclass, property } = _decorator;

/**
 * 技能项数据结构（用于UI显示）
 */
interface SkillItemData {
    skillId: string
    name: string
    description: string
    currentLevel: number
    maxLevel: number
    rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
    icon: string
    isFusion: boolean
    fusionRequires?: string[]
    nextUpgradeDesc?: string
}

/**
 * 技能选择面板
 */
@ccclass('SkillPanel')
export class SkillPanel extends Component {
    @property(Node)
    panelNode: Node = null              // 面板根节点

    @property(Node)
    contentNode: Node = null            // 技能选项容器

    @property(Prefab)
    skillItemPrefab: Prefab = null      // 技能项预制体（容器节点）

    @property(Label)
    titleLabel: Label = null            // 标题文本

    @property(Node)
    fusionHintNode: Node = null         // 合成提示节点

    @property(Label)
    fusionHintLabel: Label = null       // 合成提示文本

    private isOpen: boolean = false
    private skillManager: SkillManager = null
    private player: PlayerController = null
    private pendingCallback: ((skillId: string) => void) | null = null

    // 稀有度颜色配置
    private readonly rarityColors: Record<string, Color> = {
        'common': new Color(200, 200, 200, 255),    // 灰色
        'rare': new Color(80, 120, 255, 255),       // 蓝色
        'epic': new Color(160, 80, 255, 255),       // 紫色
        'legendary': new Color(255, 160, 50, 255),  // 橙色
        'mythic': new Color(255, 80, 160, 255)      // 粉红
    }

    start() {
        if (this.panelNode) {
            this.panelNode.active = false
        }
        if (this.fusionHintNode) {
            this.fusionHintNode.active = false
        }

        this.skillManager = SkillManager.getInstance()
        EventBus.on(EventNames.PLAYER_LEVEL_UP, this.onPlayerLevelUp, this)
    }

    protected onDestroy() {
        EventBus.off(EventNames.PLAYER_LEVEL_UP, this.onPlayerLevelUp, this)
    }

    private onPlayerLevelUp(data: any) {
        if (!data || !data.fromLevelUp) return

        const canvas = this.node.scene.getChildByName('Canvas')
        const playerNode = canvas?.getChildByName('Player')
        this.player = playerNode?.getComponent(PlayerController)

        if (!this.player) return

        if (!this.skillManager.isReady()) {
            this.skillManager.loadAll(() => {
                this.openPanel()
            })
        } else {
            this.openPanel()
        }
    }

    private openPanel() {
        if (this.isOpen) return
        if (!this.skillManager.isReady()) return

        const skillIds = this.getAvailableSkills(3)

        if (skillIds.length === 0) {
            this.closePanel()
            return
        }

        const skillItems: SkillItemData[] = []
        for (const skillId of skillIds) {
            const item = this.buildSkillItemData(skillId)
            if (item) {
                skillItems.push(item)
            }
        }

        this.clearItems()
        for (const item of skillItems) {
            this.createSkillItem(item)
        }

        this.checkFusionAvailable()

        if (this.panelNode) {
            this.panelNode.active = true
        }
        if (this.titleLabel) {
            this.titleLabel.string = this.getRandomTitle()
        }

        this.isOpen = true
        EventBus.emit(EventNames.GAME_PAUSE, true)
    }

    public closePanel() {
        if (!this.isOpen) return

        if (this.panelNode) {
            this.panelNode.active = false
        }
        if (this.fusionHintNode) {
            this.fusionHintNode.active = false
        }

        this.isOpen = false
        this.pendingCallback = null
        EventBus.emit(EventNames.GAME_PAUSE, false)
    }

    private getAvailableSkills(count: number): string[] {
        const playerSkills = this.skillManager.getPlayerSkills()
        const excludeIds: string[] = []

        // 排除已达到最大等级的技能
        for (const skill of playerSkills) {
            const maxLevel = this.skillManager.getSkillMaxLevel(skill.skillId)
            if (skill.currentLevel >= maxLevel) {
                excludeIds.push(skill.skillId)
            }
        }

        // 获取满足条件的合成技能（只有这些才能出现）
        const availableFusions = this.skillManager.getAvailableFusions()
        const fusionIds = availableFusions.map(f => f.fusionId)

        // 获取随机普通技能（排除已满级和已获得的合成技能）
        const normalSkills = this.skillManager.getRandomSkills(count, [...excludeIds, ...fusionIds])

        // 优先显示合成技能
        if (fusionIds.length > 0) {
            const result = [...fusionIds]
            const remainingCount = count - result.length
            if (remainingCount > 0) {
                result.push(...normalSkills.slice(0, remainingCount))
            }
            return result.slice(0, count)
        }

        return normalSkills.slice(0, count)
    }

    private buildSkillItemData(skillId: string): SkillItemData | null {
        const def = this.skillManager.getSkillDef(skillId)
        if (!def) return null

        const currentLevel = this.skillManager.getSkillLevel(skillId)
        const maxLevel = def.maxLevel
        const isFusion = this.skillManager.getFusionRule(skillId) !== null

        let nextUpgradeDesc: string | undefined
        if (currentLevel < maxLevel) {
            const upgrades = this.skillManager.getUpgradesAtLevel(skillId, currentLevel + 1)
            if (upgrades.length > 0) {
                nextUpgradeDesc = upgrades[0].effect?.description || upgrades[0].nodeId
            }
        }

        let fusionRequires: string[] | undefined
        if (isFusion) {
            const rule = this.skillManager.getFusionRule(skillId)
            if (rule) {
                fusionRequires = rule.requires.map(r => r.skillId)
            }
        }

        return {
            skillId: skillId,
            name: def.name,
            description: this.getSkillDescription(skillId, currentLevel),
            currentLevel: currentLevel,
            maxLevel: maxLevel,
            rarity: def.rarity,
            icon: def.icon,
            isFusion: isFusion,
            fusionRequires: fusionRequires,
            nextUpgradeDesc: nextUpgradeDesc
        }
    }

    private getSkillDescription(skillId: string, level: number): string {
        // 直接从技能定义中获取描述
        const def = this.skillManager.getSkillDef(skillId)
        if (def && def.description) {
            return def.description
        }

        // 没有描述时，尝试从数值生成
        const previewLevel = level === 0 ? 1 : level
        const stats = this.skillManager.getSkillStat(skillId, previewLevel)

        if (!stats) {
            return '提升相关属性'
        }

        const descParts: string[] = []
        for (const [key, value] of Object.entries(stats)) {
            let displayValue = value
            let displayKey = this.getStatDisplayName(key)

            if (typeof value === 'number') {
                if (key === 'cooldownReduction' || key === 'cooldownBonus') {
                    displayValue = `${value}秒`
                } else if (key.includes('Multiplier') || key.includes('Percent') || key.includes('Bonus')) {
                    displayValue = `${Math.round(value * 100)}%`
                }
            }

            descParts.push(`${displayKey} +${displayValue}`)
        }

        return descParts.join('，')
    }

    private getStatDisplayName(statKey: string): string {
        const nameMap: Record<string, string> = {
            'healthBonus': '生命值',
            'attackMultiplier': '攻击力',
            'speedMultiplier': '移速',
            'expBonus': '经验获取',
            'cooldownReduction': '冷却缩减',
            'magnetBonus': '拾取范围',
            'vampirePercent': '吸血',
            'damageReduction': '减伤',
            'critChance': '暴击率',
            'critDamage': '暴击伤害',
            'armorPen': '穿透',
            'fireballCount': '火球数量',
            'pierceCount': '弹射次数',
            'fireballSpeedMultiplier': '火球速度',
            'damageBonus': '伤害加成'
        }
        return nameMap[statKey] || statKey
    }

    private getRandomTitle(): string {
        const titles = [
            '⭐ 升级！选择新的力量 ⭐',
            '✨ 获得新能力 ✨',
            '🔥 选择你的进化之路 🔥',
            '💪 变得更强大 💪',
            '🌟 力量觉醒 🌟'
        ]
        return titles[Math.floor(Math.random() * titles.length)]
    }

    private clearItems() {
        if (!this.contentNode) return
        const pool = ObjectPool.getInstance()
        const children = [...this.contentNode.children]
        for (const child of children) {
            pool.recycle('skillItem', child)
        }
    }

    /**
    * 创建技能项UI
    * 注意：预制体结构是 SkillItem(容器) -> Button(带Button组件)
    */
    private createSkillItem(data: SkillItemData) {
        if (!this.skillItemPrefab || !this.contentNode) return

        // 从对象池获取或实例化预制体
        const pool = ObjectPool.getInstance()
        let itemNode = pool.get('skillItem', this.contentNode)

        if (!itemNode) {
            // 池中无可用，动态创建
            itemNode = instantiate(this.skillItemPrefab)
            this.contentNode.addChild(itemNode)
        }

        // 找到 Button 子节点（按钮区域）
        const buttonNode = itemNode.getChildByName('Button')
        if (!buttonNode) {
            console.warn('[SkillPanel] 预制体缺少 Button 子节点')
            return
        }

        // 设置技能名称
        const nameLabel = buttonNode.getChildByName('NameLabel')?.getComponent(Label)
        if (nameLabel) {
            nameLabel.string = data.name
            nameLabel.color = this.rarityColors[data.rarity] || Color.WHITE
        }

        // 设置技能描述
        const descLabel = buttonNode.getChildByName('DescLabel')?.getComponent(Label)
        if (descLabel) {
            descLabel.string = data.description
        }

        // 设置等级信息
        const levelLabel = buttonNode.getChildByName('LevelLabel')?.getComponent(Label)
        if (levelLabel) {
            if (data.currentLevel > 0) {
                levelLabel.string = `Lv.${data.currentLevel}/${data.maxLevel}`
                levelLabel.color = new Color(
                    GameConstants.SKILL_LEVEL_COLOR_R,
                    GameConstants.SKILL_LEVEL_COLOR_G,
                    GameConstants.SKILL_LEVEL_COLOR_B,
                    255)
            } else {
                levelLabel.string = `新技能`
                levelLabel.color = new Color(
                    GameConstants.SKILL_NEW_COLOR_R,
                    GameConstants.SKILL_NEW_COLOR_G,
                    GameConstants.SKILL_NEW_COLOR_B,
                    255)
            }
        }

        // 设置下一级解锁提示
        const upgradeLabel = buttonNode.getChildByName('UpgradeLabel')?.getComponent(Label)
        if (upgradeLabel && data.nextUpgradeDesc && data.currentLevel > 0) {
            upgradeLabel.string = `↓ 升级解锁: ${data.nextUpgradeDesc}`
            upgradeLabel.color = new Color(
                GameConstants.SKILL_UPGRADE_COLOR_R,
                GameConstants.SKILL_UPGRADE_COLOR_G,
                GameConstants.SKILL_UPGRADE_COLOR_B,
                255)
        } else if (upgradeLabel) {
            upgradeLabel.string = ''
        }

        // 设置稀有度标签
        const rarityLabel = buttonNode.getChildByName('RarityLabel')?.getComponent(Label)
        if (rarityLabel) {
            const rarityNames: Record<string, string> = {
                'common': '普通',
                'rare': '稀有',
                'epic': '史诗',
                'legendary': '传说',
                'mythic': '神话'
            }
            rarityLabel.string = rarityNames[data.rarity] || ''
            rarityLabel.color = this.rarityColors[data.rarity] || Color.WHITE
        }

        // 设置合成标记
        const fusionMark = buttonNode.getChildByName('FusionMark')
        if (fusionMark) {
            fusionMark.active = data.isFusion
            if (data.isFusion && data.fusionRequires) {
                const fusionLabel = fusionMark.getComponent(Label)
                if (fusionLabel) {
                    fusionLabel.string = `⚡ 合成 ⚡`
                }
            }
        }

        // 绑定按钮事件（先移除旧的避免重复绑定）
        const button = buttonNode.getComponent(Button)
        if (button) {
            button.node.off(Button.EventType.CLICK, this.onSkillSelected, this)
            button.node.on(Button.EventType.CLICK, () => {
                this.onSkillSelected(data.skillId)
            }, this)
        }
    }

    private checkFusionAvailable() {
        const fusions = this.skillManager.getAvailableFusions()

        if (fusions.length > 0 && this.fusionHintNode && this.fusionHintLabel) {
            this.fusionHintNode.active = true
            const names = fusions.map(f => f.rule.name).join('、')
            this.fusionHintLabel.string = `✨ 可合成新技能: ${names} ✨`
        } else if (this.fusionHintNode) {
            this.fusionHintNode.active = false
        }
    }

    private onSkillSelected(skillId: string) {
        console.log(`[SkillPanel] 选择技能: ${skillId}`)

        const isFusion = this.skillManager.getFusionRule(skillId) !== null

        let success = false
        if (isFusion) {
            success = this.skillManager.fuseSkill(skillId)
        } else {
            success = this.skillManager.learnSkill(skillId)
        }

        if (success) {
            if (this.pendingCallback) {
                this.pendingCallback(skillId)
            }
            this.closePanel()
        } else {
            console.warn(`[SkillPanel] 学习技能失败: ${skillId}`)
            this.showError('无法学习该技能！')
        }
    }

    private showError(message: string) {
        const errorLabel = this.node.getChildByName('ErrorLabel')?.getComponent(Label)
        if (errorLabel) {
            errorLabel.string = message
            errorLabel.node.active = true
            this.scheduleOnce(() => {
                errorLabel.node.active = false
            }, 2)
        }
    }

    public setOnSkillSelected(callback: (skillId: string) => void) {
        this.pendingCallback = callback
    }
}

