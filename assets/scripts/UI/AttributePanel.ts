// assets/scripts/ui/AttributePanel.ts

import { _decorator, Node, Label, Button, ScrollView, Prefab, instantiate, Color, Sprite, UITransform } from 'cc';
import { BaseComponent } from '../core/BaseComponent';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';
import { IPlayer } from '../interfaces/IPlayer';
import { ServiceLocator } from '../core/ServiceLocator';
import { PlayerController } from '../gameplay/player/PlayerController';
import { SkillManager } from '../Managers/SkillManager';

const { ccclass, property } = _decorator;

// 定义面板关闭事件
export const AttributePanelEvents = {
    CLOSE: 'attribute_panel_close'
};

/**
 * 属性详情面板
 * 显示玩家属性和已学习技能
 * 注意：打开/关闭控制由 OpenAttributeButton 负责，本组件只负责数据显示
 */
@ccclass('AttributePanel')
export class AttributePanel extends BaseComponent {
    // ========== 面板节点 ==========
    @property(Node)
    panelNode: Node = null;              // 面板根节点

    @property(Button)
    closeButton: Button = null;          // 关闭按钮

    // ========== 属性标签（Column1）==========
    @property(Label)
    attackLabel: Label = null;
    @property(Label)
    healthLabel: Label = null;
    @property(Label)
    speedLabel: Label = null;
    @property(Label)
    expBonusLabel: Label = null;
    @property(Label)
    cooldownLabel: Label = null;

    // ========== 属性标签（Column2）==========
    @property(Label)
    magnetLabel: Label = null;
    @property(Label)
    vampireLabel: Label = null;
    @property(Label)
    critChanceLabel: Label = null;
    @property(Label)
    critDamageLabel: Label = null;
    @property(Label)
    damageReductionLabel: Label = null;

    // ========== 属性标签（Column3）==========
    @property(Label)
    thornLabel: Label = null;
    @property(Label)
    shieldLabel: Label = null;
    @property(Label)
    regenLabel: Label = null;
    @property(Label)
    killCountLabel: Label = null;
    @property(Label)
    levelLabel: Label = null;

    // ========== 技能列表 ==========
    @property(ScrollView)
    skillScrollView: ScrollView = null;
    @property(Node)
    skillContent: Node = null;
    @property(Prefab)
    skillItemPrefab: Prefab = null;

    // ========== 私有变量 ==========
    private playerService: IPlayer | null = null;
    private playerController: PlayerController | null = null;
    private skillManager: SkillManager | null = null;
    private killCount: number = 0;

    // 对外暴露的节点，供 OpenAttributeButton 控制
    public getPanelNode(): Node | null {
        return this.panelNode;
    }

    start() {

        // 获取服务
        this.playerService = ServiceLocator.getInstance().get<IPlayer>('player');
        this.playerController = ServiceLocator.getInstance().get<PlayerController>('player');
        this.skillManager = SkillManager.getInstance();
        
        // 绑定关闭按钮 - 发送事件通知 OpenAttributeButton
        if (this.closeButton) {
            this.closeButton.node.on(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }

        // 监听数据变化事件
        EventBus.on(EventNames.ENEMY_DIED, this.onEnemyKilled, this);
        EventBus.on(EventNames.PLAYER_LEVEL_UP, this.onDataChange, this);
        EventBus.on(EventNames.PLAYER_HEALTH_CHANGE, this.onDataChange, this);
        EventBus.on(EventNames.SKILL_SELECTED, this.onDataChange, this);

        // 初始刷新数据
        this.refreshData();
    }

    protected onDestroy() {
        if (this.closeButton && this.closeButton.node && this.closeButton.node.isValid) {
            this.closeButton.node.off(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }

        EventBus.off(EventNames.ENEMY_DIED, this.onEnemyKilled, this);
        EventBus.off(EventNames.PLAYER_LEVEL_UP, this.onDataChange, this);
        EventBus.off(EventNames.PLAYER_HEALTH_CHANGE, this.onDataChange, this);
        EventBus.off(EventNames.SKILL_SELECTED, this.onDataChange, this);
    }

    // ========== 关闭按钮回调 - 发送事件 ==========
    private onCloseButtonClick() {
        EventBus.emit(AttributePanelEvents.CLOSE);
    }

    // ========== 事件回调 ==========
    private onEnemyKilled() {
        this.killCount++;
        this.updateKillCount();
    }

    private onDataChange() {
        this.refreshData();
    }

    // ========== 数据刷新 ==========
    public refreshData() {
        if (!this.playerService || !this.playerController) {
            return;
        }
        this.updateAttributes();
        this.updateSkillList();
        this.updateKillCount();
    }

    private updateKillCount() {
        if (!this.playerService || !this.playerController) {
            return;
        }
        if (this.killCountLabel) {
            this.killCountLabel.string = `${this.killCount}`;
        }
    }

    private updateAttributes() {
        if (!this.playerService || !this.playerController) {
            console.warn('[AttributePanel] 服务未就绪，无法更新属性');
            return;
        }

        const attack = Math.floor(this.playerController.getAttack());
        const currentHp = this.playerService.getCurrentHealth();
        const maxHp = this.playerService.getMaxHealth();
        const speed = Math.floor(this.playerController.getSpeed());
        const expBonus = (this.playerService.getExpMultiplier() - 1) * 100;
        const cooldown = this.playerController.getAttackCooldownReduction() * 100;
        const magnet = (this.playerService.getMagnetRangeMultiplier() - 1) * 100;
        const vampire = this.playerService.getVampirePercent() * 100;

        const skill = this.playerController.getSkill?.();
        const critChance = (skill?.getCritChance?.() || 0) * 100;
        const critDamage = (skill?.getCritDamage?.() || 1.5) * 100;
        const damageReduction = this.playerController.getHealth?.()?.getDamageReduction?.() || 0;
        const thornDamage = this.playerController.getHealth?.()?.getThornDamage?.() || 0;
        const shield = this.playerController.getShield?.() || 0;
        const healthComp = this.playerController.getHealth?.();
        const regen = healthComp?.getRegenPercent?.() || 0;
        const level = this.playerService.getLevel();

        if (this.attackLabel) this.attackLabel.string = `${attack}`;
        if (this.healthLabel) this.healthLabel.string = `${Math.floor(currentHp)}/${Math.floor(maxHp)}`;
        if (this.speedLabel) this.speedLabel.string = `${speed}`;
        if (this.expBonusLabel) this.expBonusLabel.string = `+${expBonus.toFixed(0)}%`;
        if (this.cooldownLabel) this.cooldownLabel.string = `-${cooldown.toFixed(0)}%`;
        if (this.magnetLabel) this.magnetLabel.string = `+${magnet.toFixed(0)}%`;
        if (this.vampireLabel) this.vampireLabel.string = `${vampire.toFixed(0)}%`;
        if (this.critChanceLabel) this.critChanceLabel.string = `${critChance.toFixed(0)}%`;
        if (this.critDamageLabel) this.critDamageLabel.string = `${critDamage.toFixed(0)}%`;
        if (this.damageReductionLabel) this.damageReductionLabel.string = `${(damageReduction * 100).toFixed(0)}%`;
        if (this.thornLabel) this.thornLabel.string = `${(thornDamage * 100).toFixed(0)}%`;
        if (this.shieldLabel) this.shieldLabel.string = `${shield}`;
        if (this.regenLabel) this.regenLabel.string = `${(regen * 100).toFixed(1)}%`;
        if (this.levelLabel) this.levelLabel.string = `${level}`;
    }

    private updateSkillList() {
        if (!this.skillManager || !this.skillContent) return;

        this.skillContent.removeAllChildren();
        const playerSkills = this.skillManager.getPlayerSkills();

        if (playerSkills.length === 0) {
            const emptyLabel = new Node('EmptyLabel');
            const label = emptyLabel.addComponent(Label);
            label.string = '暂无技能';
            label.fontSize = 16;
            label.color = new Color(150, 150, 150, 255);
            const uiTransform = emptyLabel.getComponent(UITransform);
            if (uiTransform) uiTransform.setContentSize(300, 50);
            this.skillContent.addChild(emptyLabel);
            return;
        }

        const sortedSkills = [...playerSkills].sort((a, b) => b.currentLevel - a.currentLevel);
        for (const skill of sortedSkills) {
            this.createSkillItem(skill);
        }
    }

    private createSkillItem(skill: { skillId: string, currentLevel: number }) {
        const def = this.skillManager.getSkillDef(skill.skillId);
        if (!def) return;

        let itemNode: Node;
        if (this.skillItemPrefab) {
            itemNode = instantiate(this.skillItemPrefab);
        } else {
            itemNode = this.createDynamicSkillItem();
        }

        const nameLabel = itemNode.getChildByName('NameLabel')?.getComponent(Label);
        const levelLabel = itemNode.getChildByName('LevelLabel')?.getComponent(Label);
        const descLabel = itemNode.getChildByName('DescLabel')?.getComponent(Label);
        const rarityTag = itemNode.getChildByName('RarityTag')?.getComponent(Label);

        if (nameLabel) nameLabel.string = def.name;
        if (levelLabel) levelLabel.string = `Lv.${skill.currentLevel}/${def.maxLevel}`;
        if (descLabel) descLabel.string = def.description;
        if (rarityTag) {
            rarityTag.string = this.getRarityText(def.rarity);
            rarityTag.color = this.getRarityColor(def.rarity);
        }

        this.skillContent.addChild(itemNode);
    }

    private createDynamicSkillItem(): Node {
        const itemNode = new Node('SkillItem');
        itemNode.addComponent(UITransform).setContentSize(680, 55);

        const nameNode = new Node('NameLabel');
        nameNode.addComponent(UITransform).setContentSize(300, 30);
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.fontSize = 18;
        nameLabel.color = new Color(255, 255, 255, 255);
        nameNode.setPosition(-250, 12, 0);
        itemNode.addChild(nameNode);

        const levelNode = new Node('LevelLabel');
        levelNode.addComponent(UITransform).setContentSize(100, 30);
        const levelLabel = levelNode.addComponent(Label);
        levelLabel.fontSize = 16;
        levelLabel.color = new Color(255, 200, 100, 255);
        levelNode.setPosition(280, 12, 0);
        itemNode.addChild(levelNode);

        const descNode = new Node('DescLabel');
        descNode.addComponent(UITransform).setContentSize(600, 25);
        const descLabel = descNode.addComponent(Label);
        descLabel.fontSize = 13;
        descLabel.color = new Color(170, 170, 170, 255);
        descNode.setPosition(-250, -12, 0);
        itemNode.addChild(descNode);

        return itemNode;
    }

    private getRarityText(rarity: string): string {
        const rarityMap: Record<string, string> = {
            'common': '普通',
            'rare': '稀有',
            'epic': '史诗',
            'legendary': '传说',
            'mythic': '神话'
        };
        return rarityMap[rarity] || '';
    }

    private getRarityColor(rarity: string): Color {
        const colorMap: Record<string, Color> = {
            'common': new Color(200, 200, 200, 255),
            'rare': new Color(80, 120, 255, 255),
            'epic': new Color(160, 80, 255, 255),
            'legendary': new Color(255, 160, 50, 255),
            'mythic': new Color(255, 80, 160, 255)
        };
        return colorMap[rarity] || new Color(200, 200, 200, 255);
    }
}