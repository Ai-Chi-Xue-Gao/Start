// assets/scripts/gameplay/skills/GenericSkill.ts

import { _decorator, Node, Prefab, instantiate, Vec3, Color } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { SkillManager } from '../../Managers/SkillManager';
import { ObjectPool } from '../../utils/ObjectPool';
import { PlayerController } from '../player/PlayerController';
import { Enemy } from '../enemy/Enemy';
import { GameStateMachine } from '../../core/GameStateMachine';
import { ServiceLocator } from '../../core/ServiceLocator';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { GenericProjectile } from '../projectile/GenericProjectile';
import { GenericArea } from '../effects/GenericArea';
import { GenericSummon } from '../summon/GenericSummon';

const { ccclass, property } = _decorator;

/**
 * 技能类型
 */
export enum SkillCategory {
    PROJECTILE = 'projectile',   // 投射物
    AREA = 'area',               // 范围
    BUFF = 'buff',               // 增益
    DEBUFF = 'debuff',           // 减益
    CONTROL = 'control',         // 控制
    HEAL = 'heal',               // 治疗
    SUMMON = 'summon',           // 召唤
    ULTIMATE = 'ultimate'        // 终极
}

/**
 * 元素颜色配置
 */
const ELEMENT_COLORS: Record<string, Color> = {
    fire: new Color(255, 87, 34, 255),
    water: new Color(33, 150, 243, 255),
    wood: new Color(76, 175, 80, 255),
    metal: new Color(255, 193, 7, 255),
    earth: new Color(121, 85, 72, 255),
    thunder: new Color(156, 39, 176, 255),
    chaos: new Color(255, 0, 255, 255),
    all: new Color(200, 200, 200, 255)
};

/**
 * 通用技能组件
 * 根据配置动态生成技能效果
 */
@ccclass('GenericSkill')
export class GenericSkill extends BaseComponent {
    @property(Prefab)
    defaultProjectilePrefab: Prefab = null;

    @property(Prefab)
    defaultAreaPrefab: Prefab = null;

    @property(Prefab)
    defaultSummonPrefab: Prefab = null;

    private skillId: string = '';
    private skillLevel: number = 0;
    private skillCategory: SkillCategory = SkillCategory.PROJECTILE;
    private element: string = '';
    private cooldown: number = 1.0;
    private damagePercent: number = 0.5;
    private duration: number = 0;
    private projectileCount: number = 1;
    private pierce: boolean = false;
    private healPercent: number = 0;
    private rootDuration: number = 0;
    private freezeDuration: number = 0;
    private slowPercent: number = 0;
    private burnPercent: number = 0;
    private poisonPercent: number = 0;
    private blindDuration: number = 0;
    private stunDuration: number = 0;
    private knockback: boolean = false;
    private knockbackForce: number = 0;
    private reflectPercent: number = 0;
    private damageReduction: number = 0;
    private shieldAmount: number = 0;
    private regenPercent: number = 0;
    private critBonus: number = 0;
    private critDamageBonus: number = 0;
    private attackSpeedBonus: number = 0;
    private defenseBonus: number = 0;
    private invincible: boolean = false;
    private projectileSpeed: number = 400;
    private areaRadius: number = 150;
    private summonHealth: number = 0;
    private summonDamage: number = 0;
    private summonDuration: number = 15;
    private summonTaunt: boolean = false;

    private timer: number = 0;
    private isActive: boolean = false;
    private playerController: PlayerController = null;
    private canvasNode: Node = null;
    private debugMode: boolean = false;
    private isRecycling: boolean = false;

    start() {
        this.playerController = this.getComponent(PlayerController);
        this.canvasNode = this.getService<Node>('canvasNode');

        if (!this.canvasNode) {
            const scene = this.node.scene;
            this.canvasNode = scene?.getChildByName('Canvas');
        }
    }

    /**
     * 初始化技能
     */
    public init(skillId: string, level: number) {
        this.skillId = skillId;
        this.skillLevel = level;
        this.loadConfig();
        this.isActive = true;
        this.timer = 0;

        console.log(`[GenericSkill] 技能已激活: ${skillId} Lv.${level}, 类型: ${this.skillCategory}, 冷却: ${this.cooldown}秒`);
    }

    /**
     * 加载配置
     */
    private loadConfig() {
        const skillManager = SkillManager.getInstance();
        const def = skillManager.getSkillDef(this.skillId);
        const stats = skillManager.getSkillStat(this.skillId, this.skillLevel);
        const tag = skillManager.getElementTag(this.skillId);

        if (!stats) {
            console.warn(`[GenericSkill] 技能 ${this.skillId} 等级 ${this.skillLevel} 无数值配置`);
            return;
        }

        // 确定技能类型
        if (def && def.tags) {
            if (def.tags.includes('projectile')) this.skillCategory = SkillCategory.PROJECTILE;
            else if (def.tags.includes('area')) this.skillCategory = SkillCategory.AREA;
            else if (def.tags.includes('buff')) this.skillCategory = SkillCategory.BUFF;
            else if (def.tags.includes('debuff')) this.skillCategory = SkillCategory.DEBUFF;
            else if (def.tags.includes('control')) this.skillCategory = SkillCategory.CONTROL;
            else if (def.tags.includes('heal')) this.skillCategory = SkillCategory.HEAL;
            else if (def.tags.includes('summon')) this.skillCategory = SkillCategory.SUMMON;
            else if (def.tags.includes('ultimate')) this.skillCategory = SkillCategory.ULTIMATE;
        }

        if (tag) this.element = tag.element;

        // 加载通用数值
        this.cooldown = stats.cooldown || 1.0;
        this.damagePercent = stats.damagePercent || 0;
        this.duration = stats.duration || 0;
        this.projectileCount = stats.projectileCount || 1;
        this.pierce = stats.pierce || false;

        // 治疗相关
        this.healPercent = stats.healPercent || 0;

        // 控制相关
        this.rootDuration = stats.rootDuration || 0;
        this.freezeDuration = stats.freezeDuration || 0;
        this.slowPercent = stats.slowPercent || 0;
        this.stunDuration = stats.stunDuration || 0;
        this.knockback = stats.knockback || false;
        this.knockbackForce = stats.knockbackForce || 200;

        // 减益相关
        this.burnPercent = stats.burnPercent || 0;
        this.poisonPercent = stats.poisonPercent || 0;
        this.blindDuration = stats.blindDuration || 0;

        // 增益相关
        this.reflectPercent = stats.reflectPercent || 0;
        this.damageReduction = stats.damageReduction || 0;
        this.shieldAmount = stats.shieldAmount || 0;
        this.regenPercent = stats.regenPercent || 0;
        this.critBonus = stats.critBonus || 0;
        this.critDamageBonus = stats.critDamageBonus || 0;
        this.attackSpeedBonus = stats.attackSpeedBonus || 0;
        this.defenseBonus = stats.defenseBonus || 0;
        this.invincible = stats.invincible || false;

        // 投射物相关
        this.projectileSpeed = stats.projectileSpeed || 400;

        // 范围相关
        this.areaRadius = stats.areaRadius || 150;

        // 召唤相关
        this.summonHealth = stats.health || 0;
        this.summonDamage = stats.damage || 0;
        this.summonDuration = stats.duration || 15;
        this.summonTaunt = stats.taunt || false;
    }

    /**
     * 施放技能
     */
    private cast() {
        if (!this.isActive) return;
        if (!this.playerController) return;

        const player = this.playerController;
        const attack = player.getAttack();
        const damage = attack * this.damagePercent;

        switch (this.skillCategory) {
            case SkillCategory.PROJECTILE:
                this.castProjectile(damage);
                break;
            case SkillCategory.AREA:
                this.castArea(damage);
                break;
            case SkillCategory.BUFF:
                this.castBuff();
                break;
            case SkillCategory.DEBUFF:
                this.castDebuff(damage);
                break;
            case SkillCategory.CONTROL:
                this.castControl();
                break;
            case SkillCategory.HEAL:
                this.castHeal();
                break;
            case SkillCategory.SUMMON:
                this.castSummon();
                break;
            case SkillCategory.ULTIMATE:
                this.castUltimate(damage);
                break;
        }

        if (this.debugMode) {
            console.log(`[GenericSkill] 施放技能: ${this.skillId}, 伤害: ${damage.toFixed(1)}`);
        }
    }

    /**
     * 投射物技能
     */
    private castProjectile(damage: number) {
        const prefab = this.defaultProjectilePrefab;
        if (!prefab) {
            console.warn(`[GenericSkill] 缺少投射物预制体: ${this.skillId}`);
            return;
        }

        const pool = ObjectPool.getInstance();
        const direction = this.getDirectionToNearestEnemy();

        for (let i = 0; i < this.projectileCount; i++) {
            let projectile = pool.get('genericProjectile', this.canvasNode);

            if (!projectile) {
                projectile = instantiate(prefab);
                this.canvasNode?.addChild(projectile);
            } else {
                projectile.active = true;
            }

            // 计算偏移角度
            let finalDirection = direction;
            if (this.projectileCount > 1) {
                const angleOffset = (i - (this.projectileCount - 1) / 2) * 15;
                finalDirection = this.rotateDirection(direction, angleOffset);
            }

            projectile.setWorldPosition(this.node.worldPosition);

            const projectileScript = projectile.getComponent(GenericProjectile);
            if (projectileScript) {
                projectileScript.init(
                    damage, this.element, this.skillId,
                    finalDirection, this.projectileSpeed, this.pierce,
                    this.burnPercent, this.freezeDuration, this.poisonPercent
                );
                projectileScript.setFromPool(true);
            }
        }
    }

    /**
     * 范围技能
     */
    private castArea(damage: number) {
        const prefab = this.defaultAreaPrefab;
        if (!prefab) {
            console.warn(`[GenericSkill] 缺少范围特效预制体: ${this.skillId}`);
            return;
        }

        const pool = ObjectPool.getInstance();
        let area = pool.get('genericArea', this.canvasNode);

        if (!area) {
            area = instantiate(prefab);
            this.canvasNode?.addChild(area);
        } else {
            area.active = true;
        }

        area.setWorldPosition(this.node.worldPosition);

        const areaScript = area.getComponent(GenericArea);
        if (areaScript) {
            areaScript.init(
                damage, this.element, this.skillId,
                this.duration, this.areaRadius,
                this.slowPercent, this.stunDuration, this.rootDuration,
                this.burnPercent, this.poisonPercent, this.blindDuration
            );
            areaScript.setFromPool(true);
        }
    }

    /**
     * 增益技能
     */
    private castBuff() {
        const player = this.playerController;
        if (!player) return;

        if (this.damageReduction > 0) {
            player.addDamageReduction(this.damageReduction);
            this.scheduleOnce(() => {
                if (player) player.addDamageReduction(-this.damageReduction);
            }, this.duration);
        }

        if (this.shieldAmount > 0) {
            player.getHealth()?.addShield(this.shieldAmount);
        }

        if (this.regenPercent > 0) {
            const regenAmount = player.getMaxHealth() * this.regenPercent;
            player.addPermanentRegen(regenAmount);
            this.scheduleOnce(() => {
                if (player) player.addPermanentRegen(-regenAmount);
            }, this.duration);
        }

        if (this.critBonus > 0) {
            player.addCritChance(this.critBonus);
            this.scheduleOnce(() => {
                if (player) player.addCritChance(-this.critBonus);
            }, this.duration);
        }

        if (this.critDamageBonus > 0) {
            player.addCritDamage(this.critDamageBonus);
            this.scheduleOnce(() => {
                if (player) player.addCritDamage(-this.critDamageBonus);
            }, this.duration);
        }

        if (this.attackSpeedBonus > 0) {
            EventBus.emit('attack_speed_bonus', { bonus: this.attackSpeedBonus, duration: this.duration });
        }

        if (this.defenseBonus > 0) {
            console.log(`[GenericSkill] 防御加成 ${this.defenseBonus * 100}%`);
        }

        if (this.invincible) {
            console.log(`[GenericSkill] 无敌 ${this.duration}秒`);
        }

        if (this.reflectPercent > 0) {
            console.log(`[GenericSkill] 反伤 ${this.reflectPercent * 100}%`);
        }

        if (this.debugMode) {
            console.log(`[GenericSkill] 增益技能释放: ${this.skillId}`);
        }
    }

    /**
     * 减益技能
     */
    private castDebuff(damage: number) {
        const target = this.findNearestEnemy();
        if (!target) return;

        const enemy = target.getComponent(Enemy);
        if (!enemy) return;

        if (damage > 0) {
            enemy.takeDamage(damage);
        }

        if (this.burnPercent > 0) {
            console.log(`[GenericSkill] 灼烧 ${this.burnPercent * 100}%`);
        }

        if (this.poisonPercent > 0) {
            console.log(`[GenericSkill] 中毒 ${this.poisonPercent * 100}%`);
        }

        if (this.slowPercent > 0) {
            enemy.applySlow(this.slowPercent, this.duration);
        }

        if (this.blindDuration > 0) {
            console.log(`[GenericSkill] 致盲 ${this.blindDuration}秒`);
        }

        if (this.debugMode) {
            console.log(`[GenericSkill] 减益技能释放: ${this.skillId}`);
        }
    }

    /**
     * 控制技能
     */
    private castControl() {
        const target = this.findNearestEnemy();
        if (!target) return;

        const enemy = target.getComponent(Enemy);
        if (!enemy) return;

        if (this.rootDuration > 0) {
            enemy.applySlow(0.99, this.rootDuration);
            console.log(`[GenericSkill] 定身 ${this.rootDuration}秒`);
        }

        if (this.stunDuration > 0) {
            enemy.applySlow(0.99, this.stunDuration);
            console.log(`[GenericSkill] 眩晕 ${this.stunDuration}秒`);
        }

        if (this.freezeDuration > 0) {
            enemy.applySlow(0.99, this.freezeDuration);
            console.log(`[GenericSkill] 冰冻 ${this.freezeDuration}秒`);
        }

        if (this.knockback && this.knockbackForce > 0) {
            console.log(`[GenericSkill] 击退 ${this.knockbackForce}`);
        }

        if (this.debugMode) {
            console.log(`[GenericSkill] 控制技能释放: ${this.skillId}`);
        }
    }

    /**
     * 治疗技能
     */
    private castHeal() {
        const player = this.playerController;
        if (!player) return;

        if (this.healPercent > 0) {
            const healAmount = player.getMaxHealth() * this.healPercent;
            player.heal(healAmount);
            if (this.debugMode) {
                console.log(`[GenericSkill] 治疗 ${healAmount.toFixed(1)}`);
            }
        }

        console.log(`[GenericSkill] 治疗技能释放: ${this.skillId}`);
    }

    /**
     * 召唤技能
     */
    private castSummon() {
        const prefab = this.defaultSummonPrefab;
        if (!prefab) {
            console.warn(`[GenericSkill] 缺少召唤物预制体: ${this.skillId}`);
            return;
        }

        const pool = ObjectPool.getInstance();
        let summon = pool.get('genericSummon', this.canvasNode);

        if (!summon) {
            summon = instantiate(prefab);
            this.canvasNode?.addChild(summon);
        } else {
            summon.active = true;
        }

        const playerPos = this.node.worldPosition;
        const existingSummons = this.countActiveSummons();
        const angle = (existingSummons * 72) * Math.PI / 180;
        const radius = 100;
        const offsetX = Math.cos(angle) * radius;
        const offsetY = Math.sin(angle) * radius;

        summon.setWorldPosition(playerPos.x + offsetX, playerPos.y + offsetY, 0);

        const summonScript = summon.getComponent(GenericSummon);
        if (summonScript) {
            const finalDamage = this.summonDamage > 0 ? this.summonDamage : this.playerController.getAttack() * 0.5;
            summonScript.init(
                finalDamage, this.summonHealth, this.summonDuration,
                this.summonTaunt, this.element, this.skillId
            );
            summonScript.setFromPool(true);
        }

        console.log(`[GenericSkill] 召唤技能释放: ${this.skillId}, 伤害: ${this.summonDamage}, 生命: ${this.summonHealth}`);
    }

    /**
     * 终极技能
     */
    private castUltimate(damage: number) {
        console.log(`[GenericSkill] 终极技能释放: ${this.skillId}, 伤害 ${damage.toFixed(1)}`);

        const prefab = this.defaultAreaPrefab;
        if (prefab) {
            this.castArea(damage);
        } else {
            this.damageAllNearbyEnemies(damage);
        }
    }

    /**
     * 对周围所有敌人造成伤害
     */
    private damageAllNearbyEnemies(damage: number) {
        const canvas = this.canvasNode;
        const waveManager = canvas?.getChildByName('WaveManager');
        if (!waveManager) return;

        const centerPos = this.node.worldPosition;
        const radius = this.areaRadius;

        for (const child of waveManager.children) {
            const enemy = child.getComponent(Enemy);
            if (enemy && !enemy.isDead) {
                const distance = Vec3.distance(centerPos, child.worldPosition);
                if (distance < radius) {
                    enemy.takeDamage(damage);
                }
            }
        }
    }

    /**
     * 统计当前存在的召唤物数量
     */
    private countActiveSummons(): number {
        if (!this.canvasNode) return 0;

        let count = 0;
        for (const child of this.canvasNode.children) {
            if (child.getComponent(GenericSummon) && child.active && child.isValid) {
                const summonScript = child.getComponent(GenericSummon);
                if (summonScript && !(summonScript as any).isDead) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * 获取指向最近敌人的方向
     */
    private getDirectionToNearestEnemy(): { x: number, y: number } {
        const canvas = this.canvasNode;
        const waveManager = canvas?.getChildByName('WaveManager');

        let minDist = Infinity;
        let nearestPos = { x: 1, y: 0 };

        if (waveManager) {
            for (const child of waveManager.children) {
                const enemy = child.getComponent(Enemy);
                if (enemy && !enemy.isDead) {
                    const dx = child.worldPosition.x - this.node.worldPosition.x;
                    const dy = child.worldPosition.y - this.node.worldPosition.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < minDist && dist > 10) {
                        minDist = dist;
                        nearestPos = { x: dx / dist, y: dy / dist };
                    }
                }
            }
        }

        return nearestPos;
    }

    /**
     * 查找最近的敌人
     */
    private findNearestEnemy(): Node | null {
        const canvas = this.canvasNode;
        const waveManager = canvas?.getChildByName('WaveManager');

        let minDist = Infinity;
        let nearest: Node | null = null;

        if (waveManager) {
            for (const child of waveManager.children) {
                const enemy = child.getComponent(Enemy);
                if (enemy && !enemy.isDead) {
                    const dx = child.worldPosition.x - this.node.worldPosition.x;
                    const dy = child.worldPosition.y - this.node.worldPosition.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < minDist) {
                        minDist = dist;
                        nearest = child;
                    }
                }
            }
        }

        return nearest;
    }

    /**
     * 旋转方向向量
     */
    private rotateDirection(dir: { x: number, y: number }, angleDeg: number): { x: number, y: number } {
        const rad = angleDeg * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        return {
            x: dir.x * cos - dir.y * sin,
            y: dir.x * sin + dir.y * cos
        };
    }

    /**
     * 获取技能信息
     */
    public getSkillId(): string {
        return this.skillId;
    }

    public getSkillLevel(): number {
        return this.skillLevel;
    }

    public getSkillCategory(): SkillCategory {
        return this.skillCategory;
    }

    /**
     * 停用技能
     */
    public deactivate() {
        this.isActive = false;
        console.log(`[GenericSkill] 技能已停用: ${this.skillId}`);
    }

    update(deltaTime: number) {
        if (!this.isActive) return;

        const stateMachine = ServiceLocator.getInstance().get<GameStateMachine>('stateMachine');
        if (stateMachine && stateMachine.isPaused()) return;

        this.timer += deltaTime;
        if (this.timer >= this.cooldown) {
            this.timer = 0;
            this.cast();
        }
    }
}