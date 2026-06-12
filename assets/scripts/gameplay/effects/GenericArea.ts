// assets/scripts/gameplay/effects/GenericArea.ts

import { _decorator, Node, Vec3, Sprite, Color, tween, UIOpacity } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { Enemy } from '../enemy/Enemy';
import { ObjectPool } from '../../utils/ObjectPool';

const { ccclass, property } = _decorator;

const ELEMENT_COLORS: Record<string, Color> = {
    fire: new Color(255, 87, 34, 180),
    water: new Color(33, 150, 243, 180),
    wood: new Color(76, 175, 80, 180),
    metal: new Color(255, 193, 7, 180),
    earth: new Color(121, 85, 72, 180),
    thunder: new Color(156, 39, 176, 180)
};

@ccclass('GenericArea')
export class GenericArea extends BaseComponent {
    private damage: number = 0;
    private element: string = '';
    private skillId: string = '';
    private duration: number = 1.0;
    private radius: number = 150;
    private slowPercent: number = 0;
    private stunDuration: number = 0;
    private rootDuration: number = 0;
    private burnPercent: number = 0;
    private poisonPercent: number = 0;
    private blindDuration: number = 0;
    private tickTimer: number = 0;
    private tickInterval: number = 0.5;
    private damageTimer: number = 0;
    private isFromPool: boolean = false;
    private poolKey: string = 'genericArea';
    private isRecycling: boolean = false;
    private destroyScheduled: boolean = false;

    // 图片原始大小（根据你的实际图片修改）
    private readonly DEFAULT_SIZE: number = 100;

    start() {
        // 重置销毁标志
        this.isRecycling = false;
        this.destroyScheduled = false;
        
        this.playAnimation();
        this.scheduleDestroy();
        this.startRotation();
    }

    private startRotation(){
        tween(this.node)
            .by(1, {eulerAngles: new Vec3(0, 0, 360)})
            .repeatForever()
            .start();
    }

    /**
     * 节点激活时调用（从对象池取出时）
     */
    protected onEnable() {
        // 重置所有状态
        this.isRecycling = false;
        this.destroyScheduled = false;
        this.damageTimer = 0;
        this.tickTimer = 0;
        
        // 重新播放动画和设置销毁定时器
        this.playAnimation();
        this.scheduleDestroy();
    }

    /**
     * 节点禁用时调用（放回对象池时）
     */
    protected onDisable() {
        // 停止所有动画
        const uiOpacity = this.node.getComponent(UIOpacity);
        if (uiOpacity) {
            tween(uiOpacity).stop();
        }
        tween(this.node).stop();
        
        // 取消所有定时器
        this.unscheduleAllCallbacks();
        
        // 重置标志
        this.isRecycling = false;
        this.destroyScheduled = false;
    }

    public init(damage: number, element: string, skillId: string, duration: number, radius: number, slowPercent: number, stunDuration: number, rootDuration: number, burnPercent: number, poisonPercent: number, blindDuration: number) {
        this.damage = damage;
        this.element = element;
        this.skillId = skillId;
        this.duration = Math.max(0.1, duration); // 确保 duration 至少 0.1 秒
        this.radius = radius;
        this.slowPercent = slowPercent;
        this.stunDuration = stunDuration;
        this.rootDuration = rootDuration;
        this.burnPercent = burnPercent;
        this.poisonPercent = poisonPercent;
        this.blindDuration = blindDuration;
        this.isRecycling = false;
        this.destroyScheduled = false;

        this.applyElementStyle();
        this.scaleToRadius();
    }

    private applyElementStyle() {
        const sprite = this.getComponent(Sprite);
        if (sprite) {
            const color = ELEMENT_COLORS[this.element] || new Color(200, 200, 200, 180);
            sprite.color = color;
        }
    }

    /**
     * 根据半径缩放图片大小
     */
    private scaleToRadius() {
        const scale = this.radius / this.DEFAULT_SIZE;
        this.node.setScale(scale, scale, 1);
    }

    private playAnimation() {
        const uiOpacity = this.node.getComponent(UIOpacity);
        if (uiOpacity) {
            uiOpacity.opacity = 0;
            tween(uiOpacity)
                .to(0.2, { opacity: 180 })
                .to(this.duration - 0.4, { opacity: 180 })
                .to(0.2, { opacity: 0 })
                .start();
        }
        
        // 脉冲缩放效果
        tween(this.node)
            .to(0.2, { scale: new Vec3(this.radius / this.DEFAULT_SIZE * 1.1, this.radius / this.DEFAULT_SIZE * 1.1, 1) })
            .to(this.duration - 0.4, { scale: new Vec3(this.radius / this.DEFAULT_SIZE, this.radius / this.DEFAULT_SIZE, 1) })
            .start();
    }

    /**
     * 调度销毁
     */
    private scheduleDestroy() {
        if (this.destroyScheduled) return;
        this.destroyScheduled = true;
        
        this.scheduleOnce(() => {
            this.destroyArea();
        }, this.duration);
    }

    private applyDamageToEnemies() {
        const canvas = this.node.scene?.getChildByName('Canvas');
        const waveManager = canvas?.getChildByName('WaveManager');
        const centerPos = this.node.worldPosition;

        if (!waveManager) return;

        for (const child of waveManager.children) {
            const enemy = child.getComponent(Enemy);
            if (enemy && !enemy.isDead) {
                const distance = Vec3.distance(centerPos, child.worldPosition);
                if (distance < this.radius) {
                    if (this.damage > 0) {
                        enemy.takeDamage(this.damage);
                    }
                    if (this.slowPercent > 0) {
                        enemy.applySlow(this.slowPercent, this.duration);
                    }
                }
            }
        }
    }

    private destroyArea() {
        if (this.isRecycling) return;
        this.isRecycling = true;
        
        if (this.isFromPool) {
            const pool = ObjectPool.getInstance();
            pool.recycle(this.poolKey, this.node);
        } else {
            this.node.destroy();
        }
    }

    public setFromPool(fromPool: boolean) {
        this.isFromPool = fromPool;
    }

    /**
     * 重置状态（供对象池调用）
     */
    public reset() {
        this.damage = 0;
        this.element = '';
        this.skillId = '';
        this.duration = 1.0;
        this.radius = 150;
        this.slowPercent = 0;
        this.stunDuration = 0;
        this.rootDuration = 0;
        this.burnPercent = 0;
        this.poisonPercent = 0;
        this.blindDuration = 0;
        this.tickTimer = 0;
        this.damageTimer = 0;
        this.isRecycling = false;
        this.destroyScheduled = false;

        // 重置缩放
        this.node.setScale(1, 1, 1);
        
        // 重置透明度
        const uiOpacity = this.node.getComponent(UIOpacity);
        if (uiOpacity) {
            uiOpacity.opacity = 255;
        }
        
        // 停止所有动画
        tween(this.node).stop();
        if (uiOpacity) {
            tween(uiOpacity).stop();
        }
        
        // 取消所有定时器
        this.unscheduleAllCallbacks();
    }

    update(deltaTime: number) {
        this.damageTimer += deltaTime;
        if (this.damageTimer >= this.tickInterval) {
            this.damageTimer = 0;
            this.applyDamageToEnemies();
        }
    }
}