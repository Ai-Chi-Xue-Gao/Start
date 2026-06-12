// assets/scripts/bestiary/BestiaryManager.ts

import { BestiaryConfigLoader } from './BestiaryConfigLoader';
import { 
    BestiaryEntry, 
    BestiaryProgress, 
    BestiaryStats,
    EnemyBestiaryConfig,
    BESTIARY_STORAGE_KEY 
} from './BestiaryData';

/**
 * 图鉴管理器（单例）
 * 负责管理玩家的图鉴进度、击杀记录、词条收集
 */
export class BestiaryManager {
    private static instance: BestiaryManager;
    
    private entries: Map<string, BestiaryEntry> = new Map();
    private configLoader: BestiaryConfigLoader;
    private isInitialized: boolean = false;

    private constructor() {
        this.configLoader = BestiaryConfigLoader.getInstance();
    }

    static getInstance(): BestiaryManager {
        if (!BestiaryManager.instance) {
            BestiaryManager.instance = new BestiaryManager();
        }
        return BestiaryManager.instance;
    }

    /**
     * 初始化图鉴管理器
     */
    public init(callback?: () => void): void {
        if (this.isInitialized) {
            callback?.();
            return;
        }

        this.configLoader.loadAll(() => {
            this.loadProgress();
            this.buildEntries();
            this.isInitialized = true;
            callback?.();
        });
    }

    /**
     * 加载玩家进度数据
     */
    private loadProgress(): void {
        try {
            const json = localStorage.getItem(BESTIARY_STORAGE_KEY);
            if (json) {
                const saved = JSON.parse(json);
            }
        } catch (e) {
            console.error('[BestiaryManager] 加载进度数据失败:', e);
        }
    }

    /**
     * 构建图鉴条目
     */
    private buildEntries(): void {
        const enemies = this.configLoader.getAllEnemies();
        
        for (const enemy of enemies) {
            const progress = this.getSavedProgress(enemy.enemyId);
            const race = this.configLoader.getRace(enemy.race);
            
            this.entries.set(enemy.enemyId, {
                ...enemy,
                progress: progress,
                raceName: race?.name || enemy.race,
                forcedAffix: race?.forcedAffix || null
            });
        }
    }

    /**
     * 获取已保存的进度
     */
    private getSavedProgress(enemyId: string): BestiaryProgress {
        try {
            const json = localStorage.getItem(BESTIARY_STORAGE_KEY);
            if (json) {
                const allProgress = JSON.parse(json);
                const progress = allProgress[enemyId];
                if (progress) {
                    return {
                        isUnlocked: progress.isUnlocked || false,
                        killCount: progress.killCount || 0,
                        firstKillWave: progress.firstKillWave || 0,
                        encounteredAffixes: progress.encounteredAffixes || []
                    };
                }
            }
        } catch (e) {
            console.error('[BestiaryManager] 读取进度失败:', e);
        }
        
        return {
            isUnlocked: false,
            killCount: 0,
            firstKillWave: 0,
            encounteredAffixes: []
        };
    }

    /**
     * 保存所有进度
     */
    private saveAllProgress(): void {
        try {
            const allProgress: Record<string, BestiaryProgress> = {};
            for (const [id, entry] of this.entries) {
                allProgress[id] = entry.progress;
            }
            localStorage.setItem(BESTIARY_STORAGE_KEY, JSON.stringify(allProgress));
        } catch (e) {
            console.error('[BestiaryManager] 保存进度失败:', e);
        }
    }

    /**
     * 记录击杀
     * @param enemyId 敌人ID
     * @param currentWave 当前波次
     * @param affixIds 敌人携带的词条ID列表
     */
    public recordKill(enemyId: string, currentWave: number, affixIds: string[] = []): void {
        const entry = this.entries.get(enemyId);
        if (!entry) {
            console.warn(`[BestiaryManager] 未知敌人: ${enemyId}`);
            return;
        }

        const wasUnlocked = entry.progress.isUnlocked;
        
        // 更新击杀数
        entry.progress.killCount++;
        
        // 首次击杀解锁
        if (!wasUnlocked) {
            entry.progress.isUnlocked = true;
            entry.progress.firstKillWave = currentWave;
        }
        
        // 记录遇到的词条
        for (const affixId of affixIds) {
            this.recordAffix(enemyId, affixId);
        }
        
        this.saveAllProgress();
    }

    /**
     * 记录遇到的词条
     * @param enemyId 敌人ID
     * @param affixId 词条ID
     */
    public recordAffix(enemyId: string, affixId: string): void {
        const entry = this.entries.get(enemyId);
        if (!entry) return;
        
        if (!entry.progress.encounteredAffixes.includes(affixId)) {
            entry.progress.encounteredAffixes.push(affixId);
            const affix = this.configLoader.getAffix(affixId);
        }
    }

    /**
     * 获取所有图鉴条目
     */
    public getAllEntries(): BestiaryEntry[] {
        return Array.from(this.entries.values());
    }

    /**
     * 获取已解锁的图鉴条目
     */
    public getUnlockedEntries(): BestiaryEntry[] {
        return Array.from(this.entries.values()).filter(e => e.progress.isUnlocked);
    }

    /**
     * 获取未解锁的图鉴条目
     */
    public getLockedEntries(): BestiaryEntry[] {
        return Array.from(this.entries.values()).filter(e => !e.progress.isUnlocked);
    }

    /**
     * 按类型获取图鉴条目
     */
    public getEntriesByType(type: 'normal' | 'elite' | 'boss' | 'all'): BestiaryEntry[] {
        if (type === 'all') {
            return this.getAllEntries();
        }
        return Array.from(this.entries.values()).filter(e => e.type === type);
    }

    /**
     * 获取单个图鉴条目
     */
    public getEntry(enemyId: string): BestiaryEntry | null {
        return this.entries.get(enemyId) || null;
    }

    /**
     * 获取图鉴统计
     */
    public getStats(): BestiaryStats {
        const entries = Array.from(this.entries.values());
        const unlocked = entries.filter(e => e.progress.isUnlocked);
        const totalKills = entries.reduce((sum, e) => sum + e.progress.killCount, 0);
        
        // 计算词条统计
        let totalAffixes = 0;
        let unlockedAffixes = 0;
        
        for (const entry of entries) {
            totalAffixes += entry.possibleAffixes.length;
            unlockedAffixes += entry.progress.encounteredAffixes.length;
        }
        
        return {
            totalEnemies: entries.length,
            unlockedEnemies: unlocked.length,
            totalKills: totalKills,
            totalAffixes: totalAffixes,
            unlockedAffixes: unlockedAffixes
        };
    }

    /**
     * 获取进度百分比
     */
    public getProgressPercent(): number {
        const stats = this.getStats();
        if (stats.totalEnemies === 0) return 0;
        return (stats.unlockedEnemies / stats.totalEnemies) * 100;
    }

    /**
     * 获取词条收集进度
     */
    public getAffixCollectPercent(): number {
        const stats = this.getStats();
        if (stats.totalAffixes === 0) return 0;
        return (stats.unlockedAffixes / stats.totalAffixes) * 100;
    }

    /**
     * 重置图鉴（调试用）
     */
    public reset(): void {
        for (const entry of this.entries.values()) {
            entry.progress = {
                isUnlocked: false,
                killCount: 0,
                firstKillWave: 0,
                encounteredAffixes: []
            };
        }
        this.saveAllProgress();
    }

    /**
     * 检查是否已初始化
     */
    public isReady(): boolean {
        return this.isInitialized;
    }
}