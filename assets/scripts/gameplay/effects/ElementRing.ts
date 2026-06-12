// assets/scripts/gameplay/effects/ElementRing.ts

import { _decorator, Sprite, SpriteFrame, UITransform, Vec3, Node } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { Enemy } from '../enemy/Enemy';
import { ObjectPool } from '../../utils/ObjectPool';
import { ServiceLocator } from '../../core/ServiceLocator';
import { IPlayer } from '../../interfaces/IPlayer';
import { ElementRingConfig } from '../../configs/GameConfig';

const { ccclass, property } = _decorator;

// ========== 常量定义 ==========

/**
 * 技能对应的 SpriteFrame 属性名
 */
const SPRITE_FRAME_PROPERTIES: Record<string, keyof ElementRing> = {
    'fire_005': 'fireRingSprite',
    'water_005': 'waterRingSprite',
    'wood_005': 'woodRingSprite',
    'metal_004': 'metalRingSprite',
    'earth_006': 'earthRingSprite'
};

/**
 * 默认参数
 */
const DEFAULT_PARAMS = {
    RADIUS: ElementRingConfig.DEFAULT_RADIUS,
    IMAGE_SCALE_FACTOR: ElementRingConfig.IMAGE_SCALE_FACTOR,
    ROTATION_SPEED: ElementRingConfig.ROTATION_SPEED,
    DAMAGE_INTERVAL: ElementRingConfig.DAMAGE_INTERVAL
} as const;

/**
 * 五行环类型信息
 */
interface RingTypeInfo {
    /** 减速百分比（0-1） */
    slowPercent?: number;
    /** 减速持续时间（秒） */
    slowDuration?: number;
    /** 眩晕持续时间（秒） */
    stunDuration?: number;
    /** 击飞力度 */
    knockbackForce?: number;
    /** 治疗百分比（每个敌人） */
    healPercentPerEnemy?: number;
}

/**
 * 五行环技能效果配置
 */
const RING_EFFECTS: Record<string, RingTypeInfo> = {
    'fire_005': {
        // 火环：纯伤害，无额外效果
    },
    'water_005': {
        slowPercent: 0.3,
        slowDuration: 1.5
    },
    'wood_005': {
        healPercentPerEnemy: 0.03
    },
    'metal_004': {
        knockbackForce: 200
    },
    'earth_006': {
        stunDuration: 1.0
    }
};

// ========== 五行环组件 ==========

/**
 * 五行环特效组件
 * 支持：火、水、木、金、土五种元素环
 * 永久存在，定期触发伤害
 */
@ccclass('ElementRing')
export class ElementRing extends BaseComponent {
    // ========== 编辑器属性（SpriteFrame 引用）==========
    @property(SpriteFrame)
    fireRingSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    waterRingSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    woodRingSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    metalRingSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    earthRingSprite: SpriteFrame | null = null;

    // ========== 运行时数据 ==========
    private damage: number = 0;
    private radius: number = DEFAULT_PARAMS.RADIUS;
    private skillId: string = '';

    // ========== 组件引用 ==========
    private sprite: Sprite | null = null;
    private uiTransform: UITransform | null = null;

    // ========== 状态标志 ==========
    private currentTime: number = 0;
    private isActive: boolean = true;
    private isFromPool: boolean = false;
    private poolKey: string = 'elementRing';

    // ========== 动画参数 ==========
    private rotationSpeed: number = DEFAULT_PARAMS.ROTATION_SPEED;
    private currentAngle: number = 0;
    private imageScaleFactor: number = DEFAULT_PARAMS.IMAGE_SCALE_FACTOR;

    // ========== 技能效果 ==========
    private ringEffect: RingTypeInfo | null = null;

    // ========== 节点引用缓存 ==========
    private waveManagerNode: Node | null = null;

    // ========== 生命周期 ==========

    start() {
        this.initComponents();
        this.cacheWaveManagerNode();
    }

    protected onDestroy() {
        this.cleanup();
    }

    protected onEnable() {
        this.isActive = true;
        this.currentTime = 0;
        this.currentAngle = 0;
    }

    protected onDisable() {
        this.isActive = false;
        this.unscheduleAllCallbacks();
    }

    /**
     * 初始化组件引用
     */
    private initComponents(): void {
        this.sprite = this.getComponent(Sprite);
        this.uiTransform = this.getComponent(UITransform);

        if (this.sprite) {
            this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        }
    }

    /**
     * 缓存 WaveManager 节点引用
     */
    private cacheWaveManagerNode(): void {
        const canvas = this.node.scene?.getChildByName('Canvas');
        if (canvas) {
            this.waveManagerNode = canvas.getChildByName('WaveManager');
        }
    }

    /**
     * 清理资源
     */
    private cleanup(): void {
        this.unscheduleAllCallbacks();
        this.sprite = null;
        this.uiTransform = null;
        this.waveManagerNode = null;
    }

    // ========== 初始化方法 ==========

    /**
     * 初始化五行环
     * @param damage 伤害值
     * @param skillId 技能ID
     * @param radius 半径
     * @param duration 持续时间（已废弃，保留参数以兼容旧代码，但不再使用）
     */
    public init(damage: number, skillId: string, radius: number, duration: number = -1): void {
        this.damage = damage;
        this.skillId = skillId;
        this.radius = radius * DEFAULT_PARAMS.IMAGE_SCALE_FACTOR;
        this.ringEffect = RING_EFFECTS[skillId] || null;
        this.isActive = true;
        this.currentTime = 0;
        this.currentAngle = 0;

        // 重置节点变换
        this.node.setRotationFromEuler(0, 0, 0);
        this.node.setScale(1, 1, 1);

        // 设置精灵帧
        this.setSpriteFrame();

        // 注意：不再设置销毁定时器，五行环永久存在
    }

    /**
     * 设置是否来自对象池
     */
    public setFromPool(fromPool: boolean): void {
        this.isFromPool = fromPool;
    }

    /**
     * 重置状态（供对象池调用）
     */
    public reset(): void {
        this.isActive = false;
        this.damage = 0;
        this.radius = DEFAULT_PARAMS.RADIUS;
        this.skillId = '';
        this.ringEffect = null;
        this.currentTime = 0;
        this.currentAngle = 0;

        // 重置节点变换
        this.node.setScale(1, 1, 1);
        this.node.setRotationFromEuler(0, 0, 0);

        // 清空精灵帧
        if (this.sprite) {
            this.sprite.spriteFrame = null;
        }
    }

    // ========== 精灵帧设置 ==========

    /**
     * 根据技能ID设置对应的精灵帧
     */
    private setSpriteFrame(): void {
        const spriteFrame = this.getSpriteFrameBySkillId();

        if (spriteFrame && this.sprite) {
            this.sprite.spriteFrame = spriteFrame;
        }

        this.scaleImageToRadius();
    }

    /**
     * 根据技能ID获取对应的精灵帧
     */
    private getSpriteFrameBySkillId(): SpriteFrame | null {
        const propertyName = SPRITE_FRAME_PROPERTIES[this.skillId];
        if (propertyName) {
            return this[propertyName] as SpriteFrame | null;
        }
        return null;
    }

    /**
     * 根据半径缩放图片大小
     */
    private scaleImageToRadius(): void {
        if (!this.uiTransform) return;

        const targetSize = this.radius * 2;

        if (this.sprite?.spriteFrame) {
            const originalWidth = this.sprite.spriteFrame.originalSize.width;
            const originalHeight = this.sprite.spriteFrame.originalSize.height;
            const maxOriginalSize = Math.max(originalWidth, originalHeight);
            const scale = targetSize / maxOriginalSize;

            const newWidth = originalWidth * scale;
            const newHeight = originalHeight * scale;
            this.uiTransform.setContentSize(newWidth, newHeight);
        } else {
            this.uiTransform.setContentSize(targetSize, targetSize);
        }
    }

    // ========== 伤害应用 ==========

    /**
     * 对范围内的敌人造成伤害和效果
     */
    private applyDamageToEnemies(): void {
        if (!this.isActive) return;
        if (!this.waveManagerNode) return;

        const centerPos = this.node.worldPosition;
        let hitCount = 0;

        for (const child of this.waveManagerNode.children) {
            const enemy = child.getComponent(Enemy);
            if (enemy && !enemy.isDead) {
                const distance = Vec3.distance(centerPos, child.worldPosition);
                if (distance < this.radius) {
                    // 造成伤害
                    enemy.takeDamage(this.damage);
                    hitCount++;

                    // 应用技能特效
                    this.applyRingEffect(enemy);
                }
            }
        }

        // 木环：治疗友军
        if (this.skillId === 'wood_005' && hitCount > 0) {
            this.applyWoodRingHeal(hitCount);
        }
    }

    /**
     * 应用五行环特效
     */
    private applyRingEffect(enemy: Enemy): void {
        if (!this.ringEffect) return;

        // 水环：减速
        if (this.ringEffect.slowPercent && this.ringEffect.slowDuration) {
            enemy.applySlow(this.ringEffect.slowPercent, this.ringEffect.slowDuration);
        }

        // 土环：眩晕（使用 99% 减速实现）
        if (this.ringEffect.stunDuration) {
            enemy.applySlow(0.99, this.ringEffect.stunDuration);
        }

        // 金环：击飞
        if (this.ringEffect.knockbackForce && this.ringEffect.knockbackForce > 0) {
            const centerPos = this.node.worldPosition;
            const enemyPos = enemy.node.worldPosition;
            const dirX = enemyPos.x - centerPos.x;
            const dirY = enemyPos.y - centerPos.y;
            const len = Math.sqrt(dirX * dirX + dirY * dirY);

            if (len > 0.01) {
                const knockX = (dirX / len) * this.ringEffect.knockbackForce;
                const knockY = (dirY / len) * this.ringEffect.knockbackForce;
                enemy.applyKnockback(knockX, knockY);
            }
        }
    }

    /**
     * 木环治疗
     */
    private applyWoodRingHeal(hitCount: number): void {
        const player = ServiceLocator.getInstance().get<IPlayer>('player');
        if (!player) return;

        const healPercent = this.ringEffect?.healPercentPerEnemy || 0.03;
        const healAmount = player.getMaxHealth() * healPercent * hitCount;
        player.heal?.(healAmount);
    }

    // ========== 动画 ==========

    /**
     * 更新旋转
     */
    private updateRotation(deltaTime: number): void {
        this.currentAngle += this.rotationSpeed * deltaTime;

        if (this.currentAngle >= 360) {
            this.currentAngle = this.currentAngle % 360;
        }

        this.node.setRotationFromEuler(0, 0, this.currentAngle);
    }

    // ========== 销毁 ==========

    /**
     * 销毁五行环（供外部调用，如玩家死亡时）
     */
    public destroyRing(): void {
        this.isActive = false;

        if (this.isFromPool) {
            const pool = ObjectPool.getInstance();
            pool.recycle(this.poolKey, this.node);
        } else {
            this.node.destroy();
        }
    }

    // ========== 更新循环 ==========

    update(deltaTime: number): void {
        if (!this.isActive) return;

        // 更新旋转
        this.updateRotation(deltaTime);

        // 定时造成伤害
        this.currentTime += deltaTime;
        if (this.currentTime >= DEFAULT_PARAMS.DAMAGE_INTERVAL) {
            this.currentTime = 0;
            this.applyDamageToEnemies();
        }
    }
}