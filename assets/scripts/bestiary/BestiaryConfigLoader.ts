// assets/scripts/bestiary/BestiaryConfigLoader.ts

import { resources, JsonAsset } from 'cc';
import { 
    AffixInfo, 
    RaceConfig, 
    EnemyBestiaryConfig, 
    BESTIARY_CONFIG_KEY 
} from './BestiaryData';

/**
 * 图鉴配置加载器
 * 负责加载 bestiary_enemies.json 和 affixes.json
 */
export class BestiaryConfigLoader {
    private static instance: BestiaryConfigLoader;
    
    private affixes: Map<string, AffixInfo> = new Map();
    private races: RaceConfig[] = [];
    private enemies: EnemyBestiaryConfig[] = [];
    private isLoaded: boolean = false;
    private loadCallbacks: (() => void)[] = [];

    private constructor() {}

    static getInstance(): BestiaryConfigLoader {
        if (!BestiaryConfigLoader.instance) {
            BestiaryConfigLoader.instance = new BestiaryConfigLoader();
        }
        return BestiaryConfigLoader.instance;
    }

    /**
     * 加载所有配置
     */
    public loadAll(callback?: () => void): void {
        if (this.isLoaded) {
            callback?.();
            return;
        }

        if (callback) {
            this.loadCallbacks.push(callback);
        }

        let remaining = 2;
        const onComplete = () => {
            remaining--;
            if (remaining === 0) {
                this.isLoaded = true;
                for (const cb of this.loadCallbacks) {
                    cb();
                }
                this.loadCallbacks = [];
            }
        };

        this.loadAffixes(onComplete);
        this.loadBestiaryEnemies(onComplete);
    }

    /**
     * 加载词条配置
     */
    private loadAffixes(callback: () => void): void {
        resources.load('config/affixes', JsonAsset, (err, asset) => {
            if (err) {
                callback();
                return;
            }

            const data = asset.json as any;
            const affixesList = data.affixes || [];
            
            for (const affix of affixesList) {
                this.affixes.set(affix.id, {
                    id: affix.id,
                    name: affix.name,
                    description: affix.description,
                    rarity: affix.rarity,
                    minWave: affix.minWave || 0,
                    hasCallback: affix.hasCallback || false,
                    callbackType: affix.callbackType,
                    stats: affix.stats
                });
            }
            
            callback();
        });
    }

    /**
     * 加载图鉴敌人配置
     */
    private loadBestiaryEnemies(callback: () => void): void {
        resources.load('config/bestiary_enemies', JsonAsset, (err, asset) => {
            if (err) {
                // 使用默认配置
                this.loadDefaultEnemies();
                callback();
                return;
            }

            const data = asset.json as any;
            this.races = data.races || [];
            this.enemies = data.enemies || [];

            callback();
        });
    }

    /**
     * 加载默认敌人配置（配置加载失败时使用）
     */
    private loadDefaultEnemies(): void {
        this.races = [
            { id: 'normal', name: '普通', forcedAffix: null },
            { id: 'elite', name: '精英', forcedAffix: 'berserk' },
            { id: 'boss', name: '首领', forcedAffix: 'immortal' }
        ];

        this.enemies = [
            {
                enemyId: 'normal',
                name: '普通敌人',
                description: '基础的敌人，随着波次增强',
                race: 'normal',
                type: 'normal',
                icon: 'icon_enemy',
                baseStats: { hp: 30, damage: 10, speed: 100, expReward: 10 },
                possibleAffixes: ['fast', 'tough', 'strong', 'vampire', 'frost']
            },
            {
                enemyId: 'elite',
                name: '精英敌人',
                description: '强大的精英敌人',
                race: 'elite',
                type: 'elite',
                icon: 'icon_elite',
                baseStats: { hp: 80, damage: 20, speed: 100, expReward: 30 },
                possibleAffixes: ['fast', 'tough', 'strong', 'vampire', 'frost', 'explosive', 'armored', 'regenerate', 'teleport']
            },
            {
                enemyId: 'boss',
                name: '首领敌人',
                description: '强大的首领敌人',
                race: 'boss',
                type: 'boss',
                icon: 'icon_boss',
                baseStats: { hp: 200, damage: 50, speed: 80, expReward: 100 },
                possibleAffixes: ['fast', 'tough', 'strong', 'vampire', 'frost', 'explosive', 'armored', 'regenerate', 'teleport', 'split', 'berserk', 'shielded', 'immortal', 'mirror', 'adaptive', 'minion_master']
            }
        ];
    }

    /**
     * 获取所有词条
     */
    public getAllAffixes(): Map<string, AffixInfo> {
        return this.affixes;
    }

    /**
     * 获取词条信息
     */
    public getAffix(affixId: string): AffixInfo | null {
        return this.affixes.get(affixId) || null;
    }

    /**
     * 获取所有种族
     */
    public getRaces(): RaceConfig[] {
        return [...this.races];
    }

    /**
     * 获取种族配置
     */
    public getRace(raceId: string): RaceConfig | null {
        return this.races.find(r => r.id === raceId) || null;
    }

    /**
     * 获取所有敌人配置
     */
    public getAllEnemies(): EnemyBestiaryConfig[] {
        return [...this.enemies];
    }

    /**
     * 获取敌人配置
     */
    public getEnemy(enemyId: string): EnemyBestiaryConfig | null {
        return this.enemies.find(e => e.enemyId === enemyId) || null;
    }

    /**
     * 获取敌人配置（按类型筛选）
     */
    public getEnemiesByType(type: 'normal' | 'elite' | 'boss' | 'all'): EnemyBestiaryConfig[] {
        if (type === 'all') {
            return [...this.enemies];
        }
        return this.enemies.filter(e => e.type === type);
    }

    /**
     * 检查是否已加载
     */
    public isReady(): boolean {
        return this.isLoaded;
    }
}