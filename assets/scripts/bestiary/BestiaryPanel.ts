// assets/scripts/bestiary/BestiaryPanel.ts

import { _decorator, Node, Button, ScrollView, Prefab, instantiate, Label, Color } from 'cc';
import { BaseComponent } from '../core/BaseComponent';
import { BestiaryManager } from './BestiaryManager';
import { BestiaryEntry } from './BestiaryData';
import { BestiaryItem } from '../ui/BestiaryItem';
import { EventBus } from '../core/EventBus';

const { ccclass, property } = _decorator;

type FilterType = 'all' | 'normal' | 'elite' | 'boss';

// 定义事件名称
export const BestiaryPanelEvents = {
    CLOSE: 'bestiary_panel_close'
};

/**
 * 图鉴面板（简化版 - 只负责数据展示，不控制显示/隐藏）
 */
@ccclass('BestiaryPanel')
export class BestiaryPanel extends BaseComponent {
    @property(Button)
    closeButton: Button = null;

    @property(Button)
    allButton: Button = null;
    @property(Button)
    normalButton: Button = null;
    @property(Button)
    eliteButton: Button = null;
    @property(Button)
    bossButton: Button = null;

    @property(Label)
    totalKillLabel: Label = null;
    @property(Label)
    affixCollectLabel: Label = null;
    @property(Label)
    progressLabel: Label = null;

    @property(Node)
    content: Node = null;

    @property(Prefab)
    itemPrefab: Prefab = null;

    private allLabel: Label = null;
    private normalLabel: Label = null;
    private eliteLabel: Label = null;
    private bossLabel: Label = null;

    private bestiaryManager: BestiaryManager = null;
    private currentFilter: FilterType = 'all';
    private currentItems: Node[] = [];

    private boundClosePanel: () => void = null;

    start() {
        this.bestiaryManager = BestiaryManager.getInstance();
        this.cacheButtonLabels();
        this.bindEvents();
        
        this.bestiaryManager.init(() => {
            this.updateUI();
        });
    }

    private cacheButtonLabels() {
        if (this.allButton) {
            this.allLabel = this.allButton.node.getComponentInChildren(Label);
        }
        if (this.normalButton) {
            this.normalLabel = this.normalButton.node.getComponentInChildren(Label);
        }
        if (this.eliteButton) {
            this.eliteLabel = this.eliteButton.node.getComponentInChildren(Label);
        }
        if (this.bossButton) {
            this.bossLabel = this.bossButton.node.getComponentInChildren(Label);
        }
    }

    private bindEvents() {
        // 关闭按钮 - 发送事件通知 MainMenu
        if (this.closeButton && this.closeButton.node) {
            this.boundClosePanel = this.onClose.bind(this);
            this.closeButton.node.off(Button.EventType.CLICK, this.boundClosePanel, this);
            this.closeButton.node.on(Button.EventType.CLICK, this.boundClosePanel, this);
        }

        if (this.allButton) {
            this.allButton.node.on(Button.EventType.CLICK, () => this.setFilter('all'), this);
        }
        if (this.normalButton) {
            this.normalButton.node.on(Button.EventType.CLICK, () => this.setFilter('normal'), this);
        }
        if (this.eliteButton) {
            this.eliteButton.node.on(Button.EventType.CLICK, () => this.setFilter('elite'), this);
        }
        if (this.bossButton) {
            this.bossButton.node.on(Button.EventType.CLICK, () => this.setFilter('boss'), this);
        }
    }

    private unbindEvents() {
        if (this.closeButton && this.closeButton.node && this.boundClosePanel) {
            this.closeButton.node.off(Button.EventType.CLICK, this.boundClosePanel, this);
        }
    }

    protected onDestroy() {
        this.unbindEvents();
    }

    // 关闭按钮回调 - 发送事件
    private onClose() {
        EventBus.emit(BestiaryPanelEvents.CLOSE);
    }

    private setFilter(filter: FilterType) {
        this.currentFilter = filter;
        this.updateButtonHighlights();
        this.refreshList();
    }

    private updateButtonHighlights() {
        const isAll = this.currentFilter === 'all';
        const isNormal = this.currentFilter === 'normal';
        const isElite = this.currentFilter === 'elite';
        const isBoss = this.currentFilter === 'boss';

        if (this.allLabel) {
            this.allLabel.color = isAll ? new Color(0, 210, 255, 255) : new Color(150, 150, 150, 255);
        }
        if (this.normalLabel) {
            this.normalLabel.color = isNormal ? new Color(0, 210, 255, 255) : new Color(150, 150, 150, 255);
        }
        if (this.eliteLabel) {
            this.eliteLabel.color = isElite ? new Color(0, 210, 255, 255) : new Color(150, 150, 150, 255);
        }
        if (this.bossLabel) {
            this.bossLabel.color = isBoss ? new Color(0, 210, 255, 255) : new Color(150, 150, 150, 255);
        }
    }

    private updateUI() {
        this.updateStats();
        this.refreshList();
    }

    private updateStats() {
        const stats = this.bestiaryManager.getStats();
        
        if (this.totalKillLabel) {
            this.totalKillLabel.string = `总击杀: ${stats.totalKills}`;
        }
        if (this.affixCollectLabel) {
            this.affixCollectLabel.string = `词条收集: ${stats.unlockedAffixes}/${stats.totalAffixes}`;
        }
        if (this.progressLabel) {
            const percent = Math.floor(this.bestiaryManager.getProgressPercent());
            this.progressLabel.string = `图鉴进度: ${stats.unlockedEnemies}/${stats.totalEnemies} (${percent}%)`;
        }
    }

    private refreshList() {
        if (!this.content) return;
        
        for (const item of this.currentItems) {
            if (item && item.isValid) {
                item.destroy();
            }
        }
        this.currentItems = [];
        
        const entries = this.bestiaryManager.getEntriesByType(this.currentFilter);
        
        entries.sort((a, b) => {
            if (a.progress.isUnlocked !== b.progress.isUnlocked) {
                return a.progress.isUnlocked ? -1 : 1;
            }
            return b.progress.killCount - a.progress.killCount;
        });
        
        for (const entry of entries) {
            this.createItem(entry);
        }
    }

    private createItem(entry: BestiaryEntry) {
        if (!this.itemPrefab || !this.content) return;
        
        const itemNode = instantiate(this.itemPrefab);
        itemNode.setParent(this.content);
        
        const item = itemNode.getComponent(BestiaryItem);
        if (item) {
            item.setData(entry);
        }
        
        this.currentItems.push(itemNode);
    }

    public refreshUI() {
        this.updateUI();
    }
}