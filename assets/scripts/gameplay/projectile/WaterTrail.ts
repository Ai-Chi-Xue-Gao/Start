// assets/scripts/gameplay/projectile/WaterTrail.ts

import { _decorator, Collider2D, Contact2DType, IPhysics2DContact, Node, UIOpacity, tween, Vec3, Sprite } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { Enemy } from '../enemy/Enemy';

const { ccclass, property } = _decorator;

/**
 * 水痕特效组件（外部图片版）
 */
@ccclass('WaterTrail')
export class WaterTrail extends BaseComponent {
    @property
    duration: number = 3.0;           // 水痕持续时间（秒）

    @property
    slowPercent: number = 0.50;       // 减速百分比

    @property
    slowDuration: number = 1.5;       // 敌人减速持续时间

    private collider: Collider2D = null;
    private affectedEnemies: Set<Node> = new Set();

    start() {
        const collisionArea = this.node.getChildByName('CollisionArea')
        if (collisionArea) {
            this.collider = collisionArea.getComponent(Collider2D)
            if (this.collider) {
                this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
            }
        }

        // 播放动画（持续时间与技能持续时间同步）
        this.playInkEffect(this.duration)

        // 定时销毁
        this.scheduleOnce(() => {
            this.destroyTrail()
        }, this.duration)
    }

    protected onDestroy() {
        if (this.collider) {
            this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }
    }

    /**
     * 播放水墨晕染动画（缩放 + 淡出 + 旋转）
     * @param totalDuration 动画总持续时间
     */
    private playInkEffect(totalDuration: number) {
        // 初始缩放
        this.node.setScale(0.6, 0.6, 1)

        // 缩放动画：缓慢持续放大
        tween(this.node)
            .to(totalDuration * 0.5, { scale: new Vec3(1.3, 1.3, 1) })
            .to(totalDuration * 0.5, { scale: new Vec3(1.8, 1.8, 1) })
            .start()

        // 淡出动画：最后30%时间开始淡出
        const uiOpacity = this.node.getComponent(UIOpacity)
        if (uiOpacity) {
            uiOpacity.opacity = 255
            tween(uiOpacity)
                .delay(totalDuration * 0.7)
                .to(totalDuration * 0.3, { opacity: 0 })
                .start()
        }

        // 缓慢旋转动画
        tween(this.node)
            .to(totalDuration * 0.5, { eulerAngles: new Vec3(0, 0, 15) })
            .to(totalDuration * 0.5, { eulerAngles: new Vec3(0, 0, -15) })
            .start()
    }

    public setParams(percent: number, duration: number = 3.0) {
        this.slowPercent = percent
        this.duration = duration
        this.affectedEnemies.clear()

        // 重置节点状态
        this.node.setScale(0.6, 0.6, 1)
        this.node.setRotationFromEuler(0, 0, 0)

        const uiOpacity = this.node.getComponent(UIOpacity)
        if (uiOpacity) {
            uiOpacity.opacity = 255
        }

        // 重新播放动画（使用新的持续时间）
        this.playInkEffect(duration)

        // 重新设置销毁定时器
        this.scheduleOnce(() => {
            this.destroyTrail()
        }, duration)
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact) {
        const enemyNode = otherCollider.node
        const enemy = enemyNode.getComponent(Enemy)

        if (enemy && !this.affectedEnemies.has(enemyNode)) {
            this.affectedEnemies.add(enemyNode)
            this.applySlowToEnemy(enemy)
        }
    }

    private applySlowToEnemy(enemy: Enemy) {
        const originalSpeed = (enemy as any).__originalSpeed
        if (originalSpeed === undefined) {
            (enemy as any).__originalSpeed = enemy.speed
        }

        const oldSpeed = enemy.speed
        const newSpeed = (enemy as any).__originalSpeed * (1 - this.slowPercent)
        enemy.speed = Math.max(20, newSpeed)

        this.scheduleOnce(() => {
            if (enemy && enemy.isValid && !enemy.isDead) {
                const origSpeed = (enemy as any).__originalSpeed
                if (origSpeed !== undefined) {
                    enemy.speed = origSpeed
                }
            }
        }, this.slowDuration)
    }

    private destroyTrail() {
        if (this.node && this.node.isValid) {
            // 停止所有动画
            tween(this.node).stop()
            const uiOpacity = this.node.getComponent(UIOpacity)
            if (uiOpacity) {
                tween(uiOpacity).stop()
            }
            this.node.destroy()
        }
    }
}