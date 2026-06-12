// assets/scripts/ui/BestiaryItem.ts

import { _decorator, Node, Sprite, Label, Color, instantiate, Prefab, resources, SpriteFrame, UITransform } from 'cc';
import { BaseComponent } from '../core/BaseComponent';
import { BestiaryEntry } from '../bestiary/BestiaryData';
import { BestiaryConfigLoader } from '../bestiary/BestiaryConfigLoader';
import { BestiaryAffixTag } from './BestiaryAffixTag';
import { TYPE_NAMES, TYPE_COLORS } from '../bestiary/BestiaryData';

const { ccclass, property } = _decorator;

/**
 * 图鉴列表项
 */
@ccclass('BestiaryItem')
export class BestiaryItem extends BaseComponent {
    @property(Sprite)
    icon: Sprite = null;

    @property(Label)
    nameLabel: Label = null;
    @property(Label)
    raceLabel: Label = null;
    @property(Label)
    typeLabel: Label = null;

    @property(Label)
    hpLabel: Label = null;
    @property(Label)
    damageLabel: Label = null;
    @property(Label)
    speedLabel: Label = null;
    @property(Label)
    expLabel: Label = null;

    @property(Label)
    killLabel: Label = null;

    @property(Node)
    forcedAffixContainer: Node = null;
    @property(Node)
    affixContainer: Node = null;

    @property(Prefab)
    affixTagPrefab: Prefab = null;

    private configLoader: BestiaryConfigLoader = null;
    private currentEntry: BestiaryEntry | null = null;

    start() {
        // 确保 configLoader 正确初始化
        this.configLoader = BestiaryConfigLoader.getInstance();
        if (!this.configLoader) {
            console.error('[BestiaryItem] BestiaryConfigLoader 获取失败');
        }
    }

    /**
     * 设置图鉴数据
     */
    public setData(entry: BestiaryEntry) {
        this.currentEntry = entry;
        this.updateUI();
    }

    private updateUI() {
        if (!this.currentEntry) return;

        const entry = this.currentEntry;
        const isUnlocked = entry.progress.isUnlocked;

        // 名称
        if (this.nameLabel) {
            this.nameLabel.string = isUnlocked ? entry.name : '???';
            this.nameLabel.color = isUnlocked ? Color.WHITE : Color.GRAY;
        }

        // 种族
        if (this.raceLabel) {
            this.raceLabel.string = isUnlocked ? entry.raceName : '???';
            this.raceLabel.color = isUnlocked ? new Color(160, 160, 160, 255) : Color.GRAY;
        }

        // 类型标签
        if (this.typeLabel) {
            if (isUnlocked) {
                this.typeLabel.string = TYPE_NAMES[entry.type] || entry.type;
                this.typeLabel.color = Color.WHITE;
            } else {
                this.typeLabel.string = '???';
                this.typeLabel.color = Color.GRAY;
            }
        }

        // 属性值
        if (isUnlocked) {
            const stats = entry.baseStats;
            if (this.hpLabel) this.hpLabel.string = `❤️ ${stats.hp}`;
            if (this.damageLabel) this.damageLabel.string = `⚔️ ${stats.damage}`;
            if (this.speedLabel) this.speedLabel.string = `💨 ${stats.speed}`;
            if (this.expLabel) this.expLabel.string = `✨ ${stats.expReward}`;
        } else {
            if (this.hpLabel) this.hpLabel.string = '❤️ ???';
            if (this.damageLabel) this.damageLabel.string = '⚔️ ???';
            if (this.speedLabel) this.speedLabel.string = '💨 ???';
            if (this.expLabel) this.expLabel.string = '✨ ???';
        }

        // 击杀数
        if (this.killLabel) {
            this.killLabel.string = `🗡️ ${entry.progress.killCount}`;
            this.killLabel.color = entry.progress.killCount > 0 ? new Color(255, 200, 100, 255) : Color.GRAY;
        }

        // 图标
        if (this.icon && entry.icon) {
            this.loadIcon(entry.icon);
        }

        // 词条区域
        this.updateAffixDisplay(entry);
    }

    // BestiaryItem.ts - loadIcon 方法

    private loadIcon(iconPath: string) {
        resources.load(iconPath, SpriteFrame, (err, spriteFrame) => {
            // 检查节点是否仍然有效（避免 Warning 1220）
            if (!this.icon || !this.icon.node || !this.icon.node.isValid) {
                console.warn('[BestiaryItem] 节点已销毁，跳过图标加载');
                return;
            }

            if (!err && spriteFrame) {
                this.icon.spriteFrame = spriteFrame;
            }
        });
    }

    private updateAffixDisplay(entry: BestiaryEntry) {
        // 检查 configLoader 是否可用
        if (!this.configLoader) {
            console.warn('[BestiaryItem] configLoader 不可用，跳过词条显示');
            return;
        }

        const isUnlocked = entry.progress.isUnlocked;

        // 必带词条
        if (this.forcedAffixContainer) {
            this.forcedAffixContainer.removeAllChildren();

            if (isUnlocked && entry.forcedAffix) {
                const affix = this.configLoader.getAffix(entry.forcedAffix);
                if (affix) {
                    this.createAffixTag(this.forcedAffixContainer, affix, true);
                }
            } else if (!isUnlocked && entry.forcedAffix) {
                this.createAffixTag(this.forcedAffixContainer, null, false);
            }
        }

        // 可能词条
        if (this.affixContainer) {
            this.affixContainer.removeAllChildren();

            const possibleAffixes = entry.possibleAffixes;
            const encountered = entry.progress.encounteredAffixes;

            const maxDisplay = 8;
            const showCount = Math.min(possibleAffixes.length, maxDisplay);

            for (let i = 0; i < showCount; i++) {
                const affixId = possibleAffixes[i];
                const affix = this.configLoader.getAffix(affixId);
                const isEncountered = isUnlocked && encountered.includes(affixId);

                this.createAffixTag(this.affixContainer, affix, isEncountered);
            }

            if (possibleAffixes.length > maxDisplay) {
                const moreTag = this.createMoreTag();
                this.affixContainer.addChild(moreTag);
            }
        }
    }

    private createAffixTag(container: Node, affix: any, isUnlocked: boolean) {
        if (!this.affixTagPrefab) {
            // 如果没有预制体，动态创建标签
            this.createSimpleAffixTag(container, affix, isUnlocked);
            return;
        }

        const tagNode = instantiate(this.affixTagPrefab);
        const tag = tagNode.getComponent(BestiaryAffixTag);

        if (tag) {
            if (isUnlocked && affix) {
                tag.setData(affix.name, affix.rarity, true);
            } else {
                tag.setData('???', 'common', false);
            }
        }

        container.addChild(tagNode);
    }

    /**
     * 创建简单词条标签（无预制体时使用）
     */
    private createSimpleAffixTag(container: Node, affix: any, isUnlocked: boolean) {
        const tagNode = new Node('AffixTag');
        tagNode.addComponent(UITransform).setContentSize(80, 28);

        const label = tagNode.addComponent(Label);
        label.fontSize = 12;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;

        if (isUnlocked && affix) {
            label.string = affix.name;
            label.color = Color.WHITE;
            // 添加简单背景色
            const bg = tagNode.addComponent(Sprite);
            bg.color = new Color(80, 80, 100, 255);
        } else {
            label.string = '???';
            label.color = Color.GRAY;
            const bg = tagNode.addComponent(Sprite);
            bg.color = new Color(50, 50, 50, 255);
        }

        container.addChild(tagNode);
    }

    private createMoreTag(): Node {
        const tagNode = new Node('MoreTag');
        const label = tagNode.addComponent(Label);
        label.string = '...';
        label.fontSize = 12;
        label.color = Color.GRAY;
        return tagNode;
    }
}