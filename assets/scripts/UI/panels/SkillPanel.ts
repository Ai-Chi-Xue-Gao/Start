// assets/scripts/ui/panels/SkillPanel.ts

import { _decorator, Button, instantiate, Label, Node, Prefab, Color, resources, JsonAsset, Sprite, SpriteFrame, UITransform } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { SkillManager } from '../../Managers/SkillManager';
import { SkillPanelColorConfig } from '../../configs/GameConfig';
import { ObjectPool } from '../../utils/ObjectPool';
import { ServiceLocator } from '../../core/ServiceLocator';
import { GameStateMachine } from '../../core/GameStateMachine';
import { SkillTooltip } from '../SkillTooltip';
import { IPlayer } from '../../interfaces/IPlayer';

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
    nextUpgradeDesc?: string      // 下一级升级效果说明
    nextLevelUpgrades?: string[]  // 下一级所有升级效果列表
}

/**
 * 技能选择面板
 */
@ccclass('SkillPanel')
export class SkillPanel extends BaseComponent {
    @property(Node)
    panelNode: Node = null

    @property(Node)
    contentNode: Node = null

    @property(Prefab)
    skillItemPrefab: Prefab = null

    @property(Label)
    titleLabel: Label = null

    @property(SkillTooltip)
    skillTooltip: SkillTooltip = null

    private isOpen: boolean = false
    private skillManager: SkillManager = null
    private pendingCallback: ((skillId: string) => void) | null = null

    // 存储当前活动按钮的事件处理函数，用于精确解绑
    private activeClickHandlers: Map<Node, (event: any) => void> = new Map()

    private readonly rarityColors: Record<string, Color> = {
        'common': new Color(200, 200, 200, 255),
        'rare': new Color(80, 120, 255, 255),
        'epic': new Color(160, 80, 255, 255),
        'legendary': new Color(255, 160, 50, 255),
        'mythic': new Color(255, 80, 160, 255)
    }

    start() {
        if (this.panelNode) {
            this.panelNode.active = false
        }

        this.skillManager = SkillManager.getInstance()
        EventBus.on(EventNames.PLAYER_LEVEL_UP, this.onPlayerLevelUp, this)
    }

    protected onDestroy() {
        EventBus.off(EventNames.PLAYER_LEVEL_UP, this.onPlayerLevelUp, this)
        this.clearAllButtonHandlers();
    }

    private onPlayerLevelUp(data: any) {
        if (!data || !data.fromLevelUp) return

        const player = this.getService<IPlayer>('player')
        if (!player) return

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

        const stateMachine = this.getService<GameStateMachine>('stateMachine')
        if (stateMachine) {
            stateMachine.enterLevelUp()
        }

        // 获取可学习技能
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

        if (this.panelNode) {
            this.panelNode.active = true
        }
        if (this.titleLabel) {
            this.titleLabel.string = this.getRandomTitle()
        }

        this.isOpen = true
    }

    public closePanel() {
        if (!this.isOpen) return

        const stateMachine = this.getService<GameStateMachine>('stateMachine')
        if (stateMachine) {
            stateMachine.exitLevelUp()
        }

        if (this.panelNode) {
            this.panelNode.active = false
        }

        this.isOpen = false
        this.pendingCallback = null
    }

    private getAvailableSkills(count: number): string[] {
        const playerSkills = this.skillManager.getPlayerSkills()
        const excludeIds: string[] = []

        // 收集所有已学习的技能ID（不能重复学习同一个技能）
        for (const skill of playerSkills) {
            excludeIds.push(skill.skillId)
        }

        // 获取可学习的技能（排除已学习的）
        const availableSkills = this.skillManager.getRandomSkills(count, excludeIds)
        
        return availableSkills.slice(0, count)
    }

    /**
     * 构建技能项数据（包含升级效果说明）
     */
    private buildSkillItemData(skillId: string): SkillItemData | null {
        const def = this.skillManager.getSkillDef(skillId)
        if (!def) return null

        const currentLevel = this.skillManager.getSkillLevel(skillId)
        const maxLevel = def.maxLevel

        // 获取下一级的升级效果说明
        let nextUpgradeDesc: string | undefined
        let nextLevelUpgrades: string[] = []

        if (currentLevel < maxLevel) {
            const upgrades = this.skillManager.getUpgradesAtLevel(skillId, currentLevel + 1)
            if (upgrades && upgrades.length > 0) {
                for (const upgrade of upgrades) {
                    if (upgrade.description) {
                        nextLevelUpgrades.push(upgrade.description)
                    }
                }
                if (nextLevelUpgrades.length > 0) {
                    nextUpgradeDesc = nextLevelUpgrades.join('；')
                }
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
            nextUpgradeDesc: nextUpgradeDesc,
            nextLevelUpgrades: nextLevelUpgrades
        }
    }

    private getSkillDescription(skillId: string, level: number): string {
        const def = this.skillManager.getSkillDef(skillId)
        if (def && def.description) {
            return def.description
        }

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
            'damagePercent': '伤害',
            'cooldown': '冷却缩减',
            'areaRadius': '范围',
            'duration': '持续时间',
            'slowPercent': '减速',
            'stunDuration': '眩晕',
            'freezeDuration': '冰冻',
            'burnPercent': '灼烧',
            'healPercent': '治疗',
            'damageReduction': '减伤',
            'shieldAmount': '护盾',
            'critBonus': '暴击率',
            'critDamageBonus': '暴击伤害'
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

    private clearAllButtonHandlers() {
        for (const [node, handler] of this.activeClickHandlers) {
            if (node && node.isValid) {
                node.off(Button.EventType.CLICK, handler, this);
            }
        }
        this.activeClickHandlers.clear();
    }

    private clearItemButtonHandlers(itemNode: Node) {
        const button = itemNode.getComponentInChildren(Button);
        if (button && button.node) {
            const handler = this.activeClickHandlers.get(button.node);
            if (handler) {
                button.node.off(Button.EventType.CLICK, handler, this);
                this.activeClickHandlers.delete(button.node);
            }
        }
    }

    private clearItems() {
        if (!this.contentNode) return
        const pool = ObjectPool.getInstance()
        const children = [...this.contentNode.children]
        for (const child of children) {
            this.clearItemButtonHandlers(child);
            pool.recycle('skillItem', child)
        }
    }

    private createSkillItem(data: SkillItemData) {
        if (!this.skillItemPrefab || !this.contentNode) return

        const pool = ObjectPool.getInstance()
        let itemNode = pool.get('skillItem', this.contentNode)

        if (!itemNode) {
            itemNode = instantiate(this.skillItemPrefab)
            this.contentNode.addChild(itemNode)
        }

        const buttonNode = itemNode.getChildByName('Button')
        if (!buttonNode) {
            console.warn('[SkillPanel] 预制体缺少 Button 子节点')
            return
        }

        const nameLabel = buttonNode.getChildByName('NameLabel')?.getComponent(Label)
        if (nameLabel) {
            nameLabel.string = data.name
            nameLabel.color = this.rarityColors[data.rarity] || Color.WHITE
        }

        const descLabel = buttonNode.getChildByName('DescLabel')?.getComponent(Label)
        if (descLabel) {
            descLabel.string = data.description
        }

        const levelLabel = buttonNode.getChildByName('LevelLabel')?.getComponent(Label)
        if (levelLabel) {
            if (data.currentLevel > 0) {
                levelLabel.string = `Lv.${data.currentLevel}/${data.maxLevel}`
                levelLabel.color = new Color(
                    SkillPanelColorConfig.SKILL_LEVEL_R,
                    SkillPanelColorConfig.SKILL_LEVEL_G,
                    SkillPanelColorConfig.SKILL_LEVEL_B,
                    255)
            } else {
                levelLabel.string = `新技能`
                levelLabel.color = new Color(
                    SkillPanelColorConfig.SKILL_NEW_R,
                    SkillPanelColorConfig.SKILL_NEW_G,
                    SkillPanelColorConfig.SKILL_NEW_B,
                    255)
            }
        }

        const upgradeLabel = buttonNode.getChildByName('UpgradeLabel')?.getComponent(Label)
        if (upgradeLabel) {
            if (data.nextUpgradeDesc && data.nextUpgradeDesc.length > 0) {
                upgradeLabel.string = `↓ 升级解锁: ${data.nextUpgradeDesc}`
                upgradeLabel.color = new Color(
                    SkillPanelColorConfig.SKILL_UPGRADE_R,
                    SkillPanelColorConfig.SKILL_UPGRADE_G,
                    SkillPanelColorConfig.SKILL_UPGRADE_B,
                    255)
                upgradeLabel.node.active = true
            } else if (data.currentLevel > 0 && data.currentLevel < data.maxLevel) {
                upgradeLabel.string = `↓ 可升级`
                upgradeLabel.color = new Color(150, 150, 150, 255)
                upgradeLabel.node.active = true
            } else {
                upgradeLabel.string = ''
                upgradeLabel.node.active = false
            }
        }

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

        const button = buttonNode.getComponent(Button)
        if (button) {
            const oldHandler = this.activeClickHandlers.get(button.node);
            if (oldHandler) {
                button.node.off(Button.EventType.CLICK, oldHandler, this);
                this.activeClickHandlers.delete(button.node);
            }
            
            const clickHandler = () => {
                this.onSkillSelected(data.skillId)
            }
            this.activeClickHandlers.set(button.node, clickHandler);
            button.node.on(Button.EventType.CLICK, clickHandler, this);

            // 工具提示绑定
            if (this.skillTooltip) {
                button.node.off(Node.EventType.MOUSE_ENTER);
                button.node.off(Node.EventType.MOUSE_LEAVE);
                
                button.node.on(Node.EventType.MOUSE_ENTER, () => {
                    this.skillTooltip.show({
                        name: data.name,
                        description: data.description,
                        currentLevel: data.currentLevel,
                        maxLevel: data.maxLevel,
                        rarity: data.rarity,
                        nextUpgradeDesc: data.nextUpgradeDesc
                    }, itemNode.worldPosition, data.skillId)
                }, this)

                button.node.on(Node.EventType.MOUSE_LEAVE, () => {
                    this.skillTooltip.hide()
                }, this)
            }
        }
    }

    private onSkillSelected(skillId: string) {
        console.log(`[SkillPanel] 选择技能: ${skillId}`)

        // 直接学习技能（融合系统已删除）
        const success = this.skillManager.learnSkill(skillId)

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