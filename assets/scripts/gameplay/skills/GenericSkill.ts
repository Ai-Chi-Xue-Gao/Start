// assets/scripts/gameplay/skills/GenericSkill.ts

import { _decorator, Node, Prefab, instantiate, Vec3, resources, Animation, UITransform } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { SkillManager } from '../../Managers/SkillManager';
import { ObjectPool } from '../../utils/ObjectPool';
import { PlayerController } from '../player/PlayerController';
import { Enemy } from '../enemy/Enemy';
import { GameStateMachine } from '../../core/GameStateMachine';
import { ServiceLocator } from '../../core/ServiceLocator';
import { EventBus } from '../../core/EventBus';
import { GenericArea } from '../effects/GenericArea';
import { ElementRing } from '../effects/ElementRing';
import { TriggerSystem } from '../../Managers/TriggerSystem';
import { SkillEffectConfig, ProjectileConfig, SkillConfig } from '../../configs/GameConfig';

const { ccclass, property } = _decorator;

// ========== 枚举定义 ==========

export enum SkillCategory {
    AREA = 'area',
    BUFF = 'buff',
    SINGLE = 'single',
    ENEMY_CLUSTER = 'enemy_cluster',
    PROJECTILE = 'projectile'
}

// ========== 常量定义 ==========

const RING_SKILLS: readonly string[] = [
    'fire_ring', 'water_ring', 'wood_ring', 'metal_ring', 'earth_ring'
] as const;

const DEFAULT_SKILL_VALUES = {
    COOLDOWN: 1.0,
    DAMAGE_PERCENT: 0,
    DURATION: 0,
    AREA_RADIUS: SkillConfig.DEFAULT_AREA_RADIUS,
    PROJECTILE_COUNT: 1
} as const;

const SKILL_CATEGORY_MAP: Record<string, SkillCategory> = {
    'area': SkillCategory.AREA,
    'buff': SkillCategory.BUFF,
    'single': SkillCategory.SINGLE,
    'enemy_cluster': SkillCategory.ENEMY_CLUSTER,
    'projectile': SkillCategory.PROJECTILE
};

const POOL_KEYS = {
    AREA: 'genericArea',
    ELEMENT_RING: 'elementRing'
} as const;

// ========== 预制体路径映射 ==========

const PREFAB_PATHS: Record<string, string> = {
    'explosion': 'prefabs/skills/SExp',
    'ice_pillar': 'prefabs/skills/SIce',
    'sandstorm': 'prefabs/skills/SSand',
    'tornado': 'prefabs/skills/STor',
    'energy_ball': 'prefabs/skills/SEBall',
    'mana_explosion': 'prefabs/skills/SMExp',
    'blue_lightning': 'prefabs/skills/SBLgt',
    'light_beam': 'prefabs/skills/SLBeam',
    'blue_slash': 'prefabs/skills/SBSlash'
};

// ========== 类型定义 ==========

interface Direction {
    x: number;
    y: number;
}

interface SkillStats {
    cooldown?: number;
    damagePercent?: number;
    duration?: number;
    areaRadius?: number;
    healPercent?: number;
    slowPercent?: number;
    stunDuration?: number;
    freezeDuration?: number;
    burnPercent?: number;
    knockback?: boolean;
    knockbackForce?: number;
    damageReduction?: number;
    shieldAmount?: number;
    regenPercent?: number;
    critBonus?: number;
    critDamageBonus?: number;
    attackSpeedBonus?: number;
    pullRadius?: number;
    chainCount?: number;
    pillarCount?: number;
    slowDuration?: number;
    projectileCount?: number;
}

// ========== 通用技能组件 ==========

@ccclass('GenericSkill')
export class GenericSkill extends BaseComponent {
    // ========== 通用预制体 ==========
    @property(Prefab)
    defaultAreaPrefab: Prefab | null = null;

    // ========== 技能专用预制体 ==========
    private explosionPrefab: Prefab | null = null;
    private icePillarPrefab: Prefab | null = null;
    private sandstormPrefab: Prefab | null = null;
    private tornadoPrefab: Prefab | null = null;
    private energyBallPrefab: Prefab | null = null;
    private manaExplosionPrefab: Prefab | null = null;
    private blueLightningPrefab: Prefab | null = null;
    private lightBeamPrefab: Prefab | null = null;
    private blueSlashPrefab: Prefab | null = null;

    // ========== 技能基础信息 ==========
    private skillId: string = '';
    private skillLevel: number = 0;
    private skillCategory: SkillCategory = SkillCategory.AREA;
    private isActive: boolean = false;
    private timer: number = 0;

    // ========== 技能效果参数 ==========
    private cooldown: number = DEFAULT_SKILL_VALUES.COOLDOWN;
    private damagePercent: number = DEFAULT_SKILL_VALUES.DAMAGE_PERCENT;
    private duration: number = DEFAULT_SKILL_VALUES.DURATION;
    private areaRadius: number = DEFAULT_SKILL_VALUES.AREA_RADIUS;
    private projectileCount: number = DEFAULT_SKILL_VALUES.PROJECTILE_COUNT;

    private pullRadius: number = 0;
    private chainCount: number = 0;
    private pillarCount: number = 1;
    private slowDuration: number = 0;
    private healPercent: number = 0;
    private slowPercent: number = 0;
    private stunDuration: number = 0;
    private freezeDuration: number = 0;
    private burnPercent: number = 0;
    private knockback: boolean = false;
    private knockbackForce: number = 0;

    private damageReduction: number = 0;
    private shieldAmount: number = 0;
    private regenPercent: number = 0;
    private critBonus: number = 0;
    private critDamageBonus: number = 0;
    private attackSpeedBonus: number = 0;

    private hasCleanse: boolean = false;

    private playerController: PlayerController | null = null;
    private canvasNode: Node | null = null;
    private canvasUITransform: UITransform | null = null;
    private lastLightningTarget: Node | null = null;

    // ========== 生命周期 ==========

    start(): void {
        this.initReferences();
    }

    protected onDestroy(): void {
        this.deactivate();
    }

    private initReferences(): void {
        this.playerController = this.getComponent(PlayerController);
        this.canvasNode = this.getService<Node>('canvasNode');

        if (!this.canvasNode) {
            const scene = this.node.scene;
            this.canvasNode = scene?.getChildByName('Canvas') ?? null;
        }
        
        if (this.canvasNode) {
            this.canvasUITransform = this.canvasNode.getComponent(UITransform);
        }
    }

    // ========== 技能初始化 ==========

    public init(skillId: string, level: number): void {
        this.skillId = skillId;
        this.skillLevel = level;
        
        this.loadSkillPrefab(skillId);
        this.loadConfig();
        this.isActive = true;
        this.timer = 0;
    }

    private loadSkillPrefab(skillId: string): void {
        const path = PREFAB_PATHS[skillId];
        if (!path) return;
        
        resources.load(path, Prefab, (err, prefab) => {
            if (err) {
                console.warn(`[GenericSkill] 加载预制体失败: ${skillId}`, err);
                return;
            }
            
            switch (skillId) {
                case 'explosion': this.explosionPrefab = prefab; break;
                case 'ice_pillar': this.icePillarPrefab = prefab; break;
                case 'sandstorm': this.sandstormPrefab = prefab; break;
                case 'tornado': this.tornadoPrefab = prefab; break;
                case 'energy_ball': this.energyBallPrefab = prefab; break;
                case 'mana_explosion': this.manaExplosionPrefab = prefab; break;
                case 'blue_lightning': this.blueLightningPrefab = prefab; break;
                case 'light_beam': this.lightBeamPrefab = prefab; break;
                case 'blue_slash': this.blueSlashPrefab = prefab; break;
            }
        });
    }

    public deactivate(): void {
        this.isActive = false;
    }

    public getSkillId(): string {
        return this.skillId;
    }

    public getSkillLevel(): number {
        return this.skillLevel;
    }

    // ========== 坐标转换辅助方法 ==========

    /**
     * 将世界坐标转换为 Canvas 局部坐标
     */
    private worldToCanvasPosition(worldPos: Vec3): Vec3 {
        if (!this.canvasUITransform) return worldPos.clone();
        return this.canvasUITransform.convertToNodeSpaceAR(worldPos);
    }

    /**
     * 将 Canvas 局部坐标转换为世界坐标
     */
    private canvasToWorldPosition(localPos: Vec3): Vec3 {
        if (!this.canvasUITransform) return localPos.clone();
        return this.canvasUITransform.convertToWorldSpaceAR(localPos);
    }

    // ========== 配置加载 ==========

    private loadConfig(): void {
        const skillManager = SkillManager.getInstance();
        const def = skillManager.getSkillDef(this.skillId);
        const stats = skillManager.getSkillStat(this.skillId, this.skillLevel) as SkillStats | null;

        if (!stats) return;

        this.determineSkillCategory(def);
        this.loadCommonStats(stats);
        this.loadControlStats(stats);
        this.loadBuffStats(stats);
        this.loadAdvancedStats(stats);
        this.loadUpgradeEffects();
    }

    private determineSkillCategory(def: any): void {
        if (!def?.tags) return;

        for (const tag of def.tags) {
            if (SKILL_CATEGORY_MAP[tag]) {
                this.skillCategory = SKILL_CATEGORY_MAP[tag];
                break;
            }
        }
    }

    private loadCommonStats(stats: SkillStats): void {
        this.cooldown = stats.cooldown ?? DEFAULT_SKILL_VALUES.COOLDOWN;
        this.damagePercent = stats.damagePercent ?? DEFAULT_SKILL_VALUES.DAMAGE_PERCENT;
        this.duration = stats.duration ?? DEFAULT_SKILL_VALUES.DURATION;
        this.areaRadius = stats.areaRadius ?? DEFAULT_SKILL_VALUES.AREA_RADIUS;
        this.healPercent = stats.healPercent ?? 0;
        this.projectileCount = stats.projectileCount ?? DEFAULT_SKILL_VALUES.PROJECTILE_COUNT;
    }

    private loadControlStats(stats: SkillStats): void {
        this.slowPercent = stats.slowPercent ?? 0;
        this.stunDuration = stats.stunDuration ?? 0;
        this.freezeDuration = stats.freezeDuration ?? 0;
        this.knockback = stats.knockback ?? false;
        this.knockbackForce = stats.knockbackForce ?? 200;
        this.slowDuration = stats.slowDuration ?? 0;
        this.burnPercent = stats.burnPercent ?? 0;
    }

    private loadBuffStats(stats: SkillStats): void {
        this.damageReduction = stats.damageReduction ?? 0;
        this.shieldAmount = stats.shieldAmount ?? 0;
        this.regenPercent = stats.regenPercent ?? 0;
        this.critBonus = stats.critBonus ?? 0;
        this.critDamageBonus = stats.critDamageBonus ?? 0;
        this.attackSpeedBonus = stats.attackSpeedBonus ?? 0;
    }

    private loadAdvancedStats(stats: SkillStats): void {
        this.pullRadius = stats.pullRadius ?? 0;
        this.chainCount = stats.chainCount ?? 0;
        this.pillarCount = stats.pillarCount ?? 1;
    }

    private loadUpgradeEffects(): void {
        const skillManager = SkillManager.getInstance();
        const upgrades = skillManager.getUpgradesAtLevel(this.skillId, this.skillLevel);
        
        for (const upgrade of upgrades) {
            this.applyUpgradeEffect(upgrade);
        }
    }

    private applyUpgradeEffect(upgrade: any): void {
        if (!upgrade.effect) return;
        
        const effect = upgrade.effect;
        switch (effect.type) {
            case 'modifyStat':
                this.modifyStatByUpgrade(effect.stat, effect.value);
                break;
            case 'damage':
                this.damagePercent += effect.damagePercent;
                break;
            case 'createShield':
                if (this.playerController) {
                    this.shieldAmount += effect.shieldPercent * this.playerController.getMaxHealth();
                }
                break;
            case 'knockback':
                this.knockback = true;
                this.knockbackForce = effect.force;
                break;
            case 'chain':
                this.chainCount = effect.chainCount;
                break;
            case 'cleanse':
                this.hasCleanse = true;
                break;
        }
    }

    private modifyStatByUpgrade(stat: string, value: number): void {
        switch (stat) {
            case 'damagePercent': this.damagePercent += value; break;
            case 'areaRadius': this.areaRadius += value; break;
            case 'duration': this.duration += value; break;
            case 'slowPercent': this.slowPercent += value; break;
            case 'burnPercent': this.burnPercent += value; break;
            case 'freezeDuration': this.freezeDuration += value; break;
            case 'pullRadius': this.pullRadius += value; break;
            case 'chainCount': this.chainCount += value; break;
            case 'pillarCount': this.pillarCount += value; break;
            case 'stunDuration': this.stunDuration += value; break;
            case 'knockbackForce': this.knockbackForce += value; break;
            case 'projectileCount': this.projectileCount += value; break;
        }
    }

    // ========== 技能施放入口 ==========

    private cast(): void {
        if (!this.isActive) return;
        if (!this.playerController) return;

        // 获取最近的敌人
        const nearestEnemy = this.findNearestEnemy();
        if (!nearestEnemy) return;

        const attack = this.playerController.getAttack();
        const damage = attack * this.damagePercent;

        TriggerSystem.getInstance().triggerEvent('onSkillCast', {
            skillId: this.skillId,
            skillLevel: this.skillLevel
        });

        switch (this.skillId) {
            case 'explosion':
            case 'sandstorm':
            case 'tornado':
            case 'energy_ball':
            case 'mana_explosion':
                this.castRangeSkillAtEnemy(nearestEnemy, damage);
                break;
            case 'ice_pillar':
                this.castIcePillarAtEnemy(nearestEnemy, damage);
                break;
            case 'blue_lightning':
            case 'light_beam':
                this.castSingleSkillAtEnemy(nearestEnemy, damage);
                break;
            case 'blue_slash':
                this.castProjectileAtEnemy(nearestEnemy, damage);
                break;
            default:
                this.castArea(damage);
                break;
        }
    }

    // ========== 特效播放 ==========

    private playEffect(prefab: Prefab | null, worldPosition: Vec3, duration: number): void {
        if (!prefab) return;
        
        const effect = instantiate(prefab);
        
        // 转换为 Canvas 局部坐标
        const localPos = this.worldToCanvasPosition(worldPosition);
        effect.setPosition(localPos);
        
        this.canvasNode?.addChild(effect);
        this.playAnimation(effect);
        
        this.scheduleOnce(() => {
            if (effect?.isValid) effect.destroy();
        }, duration);
    }

    private playAnimation(node: Node): void {
        const animation = node.getComponent(Animation);
        if (animation && animation.defaultClip) {
            animation.play();
        }
    }

    // ========== 范围技能 ==========

    private castRangeSkillAtEnemy(enemy: Node, damage: number): void {
        const targetWorldPos = enemy.worldPosition.clone();
        const prefab = this.getPrefabForSkill();
        const duration = (this.skillId === 'sandstorm' || this.skillId === 'tornado') ? this.duration : 0.5;
        
        // 造成伤害
        this.applyAreaDamageAt(targetWorldPos, damage, this.areaRadius);
        
        // 播放特效
        this.playEffect(prefab, targetWorldPos, duration);
    }

    private getPrefabForSkill(): Prefab | null {
        switch (this.skillId) {
            case 'explosion': return this.explosionPrefab;
            case 'sandstorm': return this.sandstormPrefab;
            case 'tornado': return this.tornadoPrefab;
            case 'energy_ball': return this.energyBallPrefab;
            case 'mana_explosion': return this.manaExplosionPrefab;
            default: return null;
        }
    }

    // ========== 冰柱技能 ==========

    private castIcePillarAtEnemy(enemy: Node, damage: number): void {
        const centerWorldPos = enemy.worldPosition.clone();
        
        for (let i = 0; i < this.pillarCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.areaRadius;
            const offsetX = Math.cos(angle) * distance;
            const offsetY = Math.sin(angle) * distance;
            const pillarWorldPos = new Vec3(centerWorldPos.x + offsetX, centerWorldPos.y + offsetY, 0);
            
            this.playEffect(this.icePillarPrefab, pillarWorldPos, 0.5);
            
            const affectedEnemies = this.applyAreaDamageWithFreeze(pillarWorldPos, damage, 80, this.freezeDuration);
            
            if (this.freezeDuration > 0) {
                for (const enemyComp of affectedEnemies) {
                    this.scheduleOnce(() => {
                        if (enemyComp?.node?.isValid) {
                            TriggerSystem.getInstance().triggerEvent('onControlEnd', {
                                skillId: this.skillId,
                                target: enemyComp,
                                controlType: 'freeze'
                            });
                        }
                    }, this.freezeDuration);
                }
            }
        }
    }

    // ========== 单体技能 ==========

    private castSingleSkillAtEnemy(enemy: Node, damage: number): void {
        const enemyComp = enemy.getComponent(Enemy);
        if (!enemyComp) return;

        const targetWorldPos = enemy.worldPosition;
        const prefab = this.skillId === 'blue_lightning' ? this.blueLightningPrefab : this.lightBeamPrefab;
        
        this.playEffect(prefab, targetWorldPos, 0.5);
        enemyComp.takeDamage(damage);
        
        TriggerSystem.getInstance().triggerEvent('onHit', {
            skillId: this.skillId,
            target: enemyComp,
            damage: damage
        });

        if (this.stunDuration > 0) enemyComp.applySlow(0.99, this.stunDuration);
        if (this.slowPercent > 0 && this.slowDuration > 0) enemyComp.applySlow(this.slowPercent, this.slowDuration);
    }

    // ========== 投射物技能 ==========

    private castProjectileAtEnemy(enemy: Node, damage: number): void {
        if (!this.blueSlashPrefab) return;

        const enemyWorldPos = enemy.worldPosition;
        const playerWorldPos = this.node.worldPosition;
        
        // 计算方向
        const direction = new Vec3();
        Vec3.subtract(direction, enemyWorldPos, playerWorldPos);
        direction.normalize();
        
        // 转换为 Canvas 局部坐标
        const startLocalPos = this.worldToCanvasPosition(playerWorldPos);
        
        for (let i = 0; i < this.projectileCount; i++) {
            const angleOffset = (i - (this.projectileCount - 1) / 2) * 15;
            const finalDir = this.rotateDirection({ x: direction.x, y: direction.y }, angleOffset);
            
            const projectile = instantiate(this.blueSlashPrefab);
            projectile.setPosition(startLocalPos);
            this.canvasNode?.addChild(projectile);
            
            this.playAnimation(projectile);
            
            // 飞行逻辑
            let traveled = 0;
            const speed = SkillConfig.DEFAULT_PROJECTILE_SPEED;
            const maxDistance = SkillConfig.PROJECTILE_MAX_LIFE * speed;
            
            const updateProjectile = () => {
                if (!projectile?.isValid) return;
                
                const step = speed * 0.016;
                const newPos = projectile.position.clone();
                newPos.x += finalDir.x * step;
                newPos.y += finalDir.y * step;
                projectile.setPosition(newPos);
                traveled += step;
                
                if (traveled >= maxDistance) {
                    projectile.destroy();
                    return;
                }
                
                // 碰撞检测（将局部坐标转世界坐标）
                const projectileWorldPos = this.canvasToWorldPosition(projectile.position);
                const hitEnemy = this.checkProjectileCollisionAtWorld(projectileWorldPos, damage);
                if (hitEnemy) {
                    projectile.destroy();
                    return;
                }
                
                requestAnimationFrame(updateProjectile);
            };
            
            requestAnimationFrame(updateProjectile);
        }
    }

    private checkProjectileCollisionAtWorld(worldPos: Vec3, damage: number): boolean {
        const waveManager = this.canvasNode?.getChildByName('WaveManager');
        if (!waveManager) return false;
        
        for (const child of waveManager.children) {
            const enemy = child.getComponent(Enemy);
            if (enemy && !enemy.isDead) {
                const distance = Vec3.distance(worldPos, child.worldPosition);
                if (distance < 60) {
                    enemy.takeDamage(damage);
                    TriggerSystem.getInstance().triggerEvent('onHit', {
                        skillId: this.skillId,
                        target: enemy,
                        damage: damage
                    });
                    return true;
                }
            }
        }
        return false;
    }

    // ========== 五行环 ==========

    private castArea(damage: number): void {
        if (RING_SKILLS.includes(this.skillId)) {
            this.castElementRing(damage);
        } else {
            this.castGenericArea(damage);
        }
    }

    private castGenericArea(damage: number): void {
        if (!this.defaultAreaPrefab) return;

        const pool = ObjectPool.getInstance();
        let area = pool.get(POOL_KEYS.AREA, this.canvasNode);

        if (!area) {
            area = instantiate(this.defaultAreaPrefab);
            this.canvasNode?.addChild(area);
        } else {
            area.active = true;
        }

        area.setWorldPosition(this.node.worldPosition);

        const areaScript = area.getComponent(GenericArea);
        if (areaScript) {
            areaScript.init(damage, '', this.skillId, this.duration, this.areaRadius,
                this.slowPercent, this.stunDuration, 0, this.burnPercent, 0, 0);
            areaScript.setFromPool(true);
        }
    }

    private castElementRing(damage: number): void {
        const pool = ObjectPool.getInstance();
        let ring = pool.get(POOL_KEYS.ELEMENT_RING, this.canvasNode);

        if (!ring) {
            if (!this.defaultAreaPrefab) return;
            ring = instantiate(this.defaultAreaPrefab);
            this.canvasNode?.addChild(ring);
        } else {
            ring.active = true;
        }

        ring.setParent(this.node);
        ring.setPosition(0, 0, 0);

        const ringScript = ring.getComponent(ElementRing);
        if (ringScript) {
            ringScript.init(damage, this.skillId, this.areaRadius, -1);
            ringScript.setFromPool(true);
        }
    }

    // ========== 增益技能 ==========

    private castBuff(): void {
        const player = this.playerController;
        if (!player) return;

        if (this.damageReduction > 0) {
            player.addDamageReduction(this.damageReduction);
            this.scheduleOnce(() => player?.addDamageReduction(-this.damageReduction), this.duration);
        }

        if (this.shieldAmount > 0) {
            player.getHealth()?.addShield(this.shieldAmount);
        }

        if (this.critBonus > 0) {
            player.addCritChance(this.critBonus);
            this.scheduleOnce(() => player?.addCritChance(-this.critBonus), this.duration);
        }

        if (this.critDamageBonus > 0) {
            player.addCritDamage(this.critDamageBonus);
            this.scheduleOnce(() => player?.addCritDamage(-this.critDamageBonus), this.duration);
        }

        if (this.attackSpeedBonus > 0) {
            EventBus.emit('attack_speed_bonus', { bonus: this.attackSpeedBonus, duration: this.duration });
        }

        if (this.regenPercent > 0) {
            const healthComp = player.getHealth();
            if (healthComp?.addRegenPercent) {
                healthComp.addRegenPercent(this.regenPercent);
                this.scheduleOnce(() => healthComp?.addRegenPercent(-this.regenPercent), this.duration);
            }
        }

        if (this.healPercent > 0) {
            const healAmount = player.getMaxHealth() * this.healPercent;
            player.heal(healAmount);
            TriggerSystem.getInstance().triggerEvent('onHeal', { skillId: this.skillId, target: player, healAmount });
        }

        if (this.hasCleanse) {
            EventBus.emit('cleanse_player');
        }
    }

    // ========== 伤害应用 ==========

    private applyAreaDamageAt(position: Vec3, damage: number, radius: number): void {
        const waveManager = this.canvasNode?.getChildByName('WaveManager');
        if (!waveManager) return;

        for (const child of waveManager.children) {
            const enemy = child.getComponent(Enemy);
            if (enemy && !enemy.isDead) {
                const distance = Vec3.distance(position, child.worldPosition);
                if (distance < radius) {
                    enemy.takeDamage(damage);
                    TriggerSystem.getInstance().triggerEvent('onHit', {
                        skillId: this.skillId, target: enemy, damage
                    });
                    this.applyAreaEffects(enemy);
                }
            }
        }
    }

    private applyAreaDamageWithFreeze(position: Vec3, damage: number, radius: number, freezeDuration: number): Enemy[] {
        const waveManager = this.canvasNode?.getChildByName('WaveManager');
        if (!waveManager) return [];

        const affectedEnemies: Enemy[] = [];

        for (const child of waveManager.children) {
            const enemy = child.getComponent(Enemy);
            if (enemy && !enemy.isDead) {
                const distance = Vec3.distance(position, child.worldPosition);
                if (distance < radius) {
                    enemy.takeDamage(damage);
                    TriggerSystem.getInstance().triggerEvent('onHit', {
                        skillId: this.skillId, target: enemy, damage
                    });
                    if (freezeDuration > 0) enemy.applySlow(0.99, freezeDuration);
                    affectedEnemies.push(enemy);
                    this.applyAreaEffects(enemy);
                }
            }
        }

        return affectedEnemies;
    }

    private applyAreaEffects(enemy: Enemy): void {
        if (this.slowPercent > 0 && this.slowDuration > 0) enemy.applySlow(this.slowPercent, this.slowDuration);
        if (this.stunDuration > 0) enemy.applySlow(0.99, this.stunDuration);
        if (this.freezeDuration > 0) enemy.applySlow(0.99, this.freezeDuration);
        if (this.knockback && this.knockbackForce > 0 && this.playerController) {
            const center = this.playerController.node.worldPosition;
            const dirX = enemy.node.worldPosition.x - center.x;
            const dirY = enemy.node.worldPosition.y - center.y;
            const len = Math.sqrt(dirX * dirX + dirY * dirY);
            if (len > 0.01) {
                enemy.applyKnockback((dirX / len) * this.knockbackForce, (dirY / len) * this.knockbackForce);
            }
        }
    }

    // ========== 敌人查找 ==========

    private findNearestEnemy(): Node | null {
        const waveManager = this.canvasNode?.getChildByName('WaveManager');
        if (!waveManager) return null;

        let minDist = Infinity;
        let nearest: Node | null = null;
        const playerPos = this.node.worldPosition;
        const maxRange = SkillConfig.CAST_RANGE;

        for (const child of waveManager.children) {
            const enemy = child.getComponent(Enemy);
            if (enemy && !enemy.isDead) {
                const dist = Vec3.distance(playerPos, child.worldPosition);
                if (dist < minDist && dist <= maxRange) {
                    minDist = dist;
                    nearest = child;
                }
            }
        }

        return nearest;
    }

    private rotateDirection(dir: Direction, angleDeg: number): Direction {
        const rad = angleDeg * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        return { x: dir.x * cos - dir.y * sin, y: dir.x * sin + dir.y * cos };
    }

    // ========== 更新循环 ==========

    update(deltaTime: number): void {
        if (!this.isActive) return;

        const stateMachine = ServiceLocator.getInstance().get<GameStateMachine>('stateMachine');
        if (stateMachine?.isPaused()) return;

        this.timer += deltaTime;
        if (this.timer >= this.cooldown) {
            this.timer = 0;
            this.cast();
        }
    }
}