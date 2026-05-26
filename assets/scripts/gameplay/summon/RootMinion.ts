// assets/scripts/gameplay/summon/RootMinion.ts

import { _decorator, Node, Vec3, Collider2D, Contact2DType, IPhysics2DContact, Animation, tween, UIOpacity } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { Enemy } from '../enemy/Enemy';

const { ccclass, property } = _decorator;

/**
 * 藤蔓仆从组件
 * 自动攻击附近敌人
 */
@ccclass('RootMinion')
export class RootMinion extends BaseComponent {
    @property
    damage: number = 30;           // 攻击力（从玩家同步）

    @property
    attackRange: number = 80;       // 攻击范围

    @property
    attackCooldown: number = 1.0;   // 攻击冷却（秒）

    @property
    duration: number = 15.0;         // 存在时间（秒）

    @property
    moveSpeed: number = 150;        // 移动速度（从玩家同步，默认150）

    @property
    searchRange: number = 400;      // 寻敌范围（像素）

    private targetEnemy: Node | null = null;
    private attackTimer: number = 0;
    private collider: Collider2D = null;
    private isAttacking: boolean = false;
    private isMoving: boolean = false;
    private animation: Animation = null;
    private spriteNode: Node = null;

    start() {
        // 获取动画组件
        this.animation = this.getComponent(Animation);
        if (this.animation) {
            console.log(`[藤蔓仆从] ✅ 动画组件获取成功`);
            const clips = this.animation.clips;
            if (clips && clips.length > 0) {
                console.log(`[藤蔓仆从] 可用动画剪辑: ${clips.map(c => c.name).join(', ')}`);
            } else {
                console.warn(`[藤蔓仆从] ⚠️ Animation 组件没有动画剪辑！`);
            }
        } else {
            console.error(`[藤蔓仆从] ❌ 动画组件获取失败！请检查预制体是否有 Animation 组件`);
        }

        // 获取碰撞组件
        this.collider = this.getComponent(Collider2D);

        // 设置碰撞检测
        if (this.collider) {
            this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }

        // 获取精灵节点（用于翻转）
        this.spriteNode = this.node.getChildByName('Sprite');
        if (!this.spriteNode) {
            this.spriteNode = this.node;
        }

        // 播放出现动画
        this.playSpawn();

        // 定时销毁
        this.scheduleOnce(() => {
            this.destroyMinion();
        }, this.duration);
    }

    protected onDestroy() {
        if (this.collider) {
            this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    /**
     * 初始化仆从
     * @param damage 玩家攻击力（仆从伤害继承自玩家）
     * @param moveSpeed 玩家移动速度（仆从速度继承自玩家，额外+50%）
     * @param duration 存在时间
     */
    public init(damage: number, moveSpeed: number, duration: number = 8) {
        this.damage = damage;
        //  移动速度 = 玩家速度 × 1.5（比玩家快50%）
        this.moveSpeed = moveSpeed * 1.5;
        this.duration = duration;
        console.log(`[藤蔓仆从] 初始化，攻击力: ${this.damage}, 移动速度: ${this.moveSpeed}`);
    }

    /**
     * 播放出现动画
     */
    private playSpawn() {
        // 初始状态（透明+缩小）
        const uiOpacity = this.node.getComponent(UIOpacity);
        if (uiOpacity) {
            uiOpacity.opacity = 0;
        }
        this.node.setScale(0.5, 0.5, 1);

        // 播放动画
        if (this.animation) {
            this.animation.play('RootMinion_Spawn');
        }

        // 淡入+放大动画
        tween(this.node)
            .to(0.2, { scale: new Vec3(1, 1, 1) })
            .start();

        if (uiOpacity) {
            tween(uiOpacity)
                .to(0.2, { opacity: 255 })
                .call(() => {
                    this.playIdle();
                })
                .start();
        } else {
            this.scheduleOnce(() => {
                this.playIdle();
            }, 0.2);
        }
    }

    /**
     * 播放待机动画
     */
    private playIdle() {
        if (this.animation && !this.isMoving && !this.isAttacking) {
            const idleState = this.animation.getState('RootMinion_Idle');
            if (idleState && !idleState.isPlaying) {
                this.animation.play('RootMinion_Idle');
            }
        }
    }

    /**
     * 播放移动动画
     */
    private playMove() {
        if (this.animation && this.isMoving && !this.isAttacking) {
            const moveState = this.animation.getState('RootMinion_Move');
            if (moveState && !moveState.isPlaying) {
                this.animation.play('RootMinion_Move');
            }
        }
    }

    /**
     * 播放攻击动画
     */
    private playAttack() {
        if (this.animation && !this.isAttacking) {
            this.isAttacking = true;

            // 播放攻击动画
            this.animation.play('RootMinion_Attack');

            // 获取攻击动画时长
            const attackState = this.animation.getState('RootMinion_Attack');
            const attackDuration = attackState ? attackState.duration : 0.3;

            // 在动画播放完毕后切换回待机/移动
            this.scheduleOnce(() => {
                this.isAttacking = false;

                // 停止攻击动画（防止卡在最后一帧）
                if (this.animation) {
                    this.animation.stop();
                }

                // 根据状态切换动画
                if (!this.isMoving) {
                    this.playIdle();
                } else {
                    this.playMove();
                }
            }, attackDuration);
        }
    }

    /**
     * 播放消失动画
     */
    private playDespawn(onComplete?: () => void) {
        // 停止移动和攻击
        this.isMoving = false;
        this.isAttacking = false;

        // 播放消失动画
        if (this.animation) {
            this.animation.play('RootMinion_Despawn');
        }

        // 淡出+缩小动画
        const uiOpacity = this.node.getComponent(UIOpacity);
        tween(this.node)
            .to(0.2, { scale: new Vec3(0.5, 0.5, 1) })
            .call(() => {
                onComplete?.();
            })
            .start();

        if (uiOpacity) {
            tween(uiOpacity)
                .to(0.2, { opacity: 0 })
                .start();
        }
    }

    /**
     * 根据移动方向翻转精灵
     */
    private updateSpriteDirection(direction: Vec3) {
        if (!this.spriteNode) return;

        if (direction.x < -0.1) {
            this.spriteNode.setScale(-1, 1, 1);
        } else if (direction.x > 0.1) {
            this.spriteNode.setScale(1, 1, 1);
        }
    }

    /**
     * 寻找最近的敌人（限制寻敌范围）
     */
    private findNearestEnemy(): Node | null {
        const canvas = this.node.scene?.getChildByName('Canvas');
        if (!canvas) return null;

        const waveManager = canvas.getChildByName('WaveManager');
        let nearest: Node | null = null;
        let minDist = this.searchRange;

        if (waveManager) {
            for (const child of waveManager.children) {
                const enemy = child.getComponent(Enemy);
                if (enemy && !enemy.isDead) {
                    const dist = Vec3.distance(this.node.worldPosition, child.worldPosition);
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
     * 向敌人移动
     */
    private moveToEnemy(deltaTime: number) {
        if (!this.targetEnemy || !this.targetEnemy.isValid) {
            this.targetEnemy = this.findNearestEnemy();
            this.isMoving = false;
            return;
        }

        const enemy = this.targetEnemy.getComponent(Enemy);
        if (!enemy || enemy.isDead) {
            this.targetEnemy = null;
            this.isMoving = false;
            return;
        }

        const myPos = this.node.worldPosition;
        const enemyPos = this.targetEnemy.worldPosition;
        const distance = Vec3.distance(myPos, enemyPos);

        if (distance > this.searchRange) {
            this.targetEnemy = null;
            this.isMoving = false;
            return;
        }

        if (distance < this.attackRange) {
            this.isMoving = false;
            return;
        }

        this.isMoving = true;

        const direction = new Vec3();
        Vec3.subtract(direction, enemyPos, myPos);
        direction.normalize();

        this.updateSpriteDirection(direction);

        const newPos = myPos.clone();
        newPos.x += direction.x * this.moveSpeed * deltaTime;
        newPos.y += direction.y * this.moveSpeed * deltaTime;
        this.node.worldPosition = newPos;
    }

    /**
     * 攻击敌人
     */
    private attackEnemy() {
        if (!this.targetEnemy || !this.targetEnemy.isValid) return;

        const enemy = this.targetEnemy.getComponent(Enemy);
        if (enemy && !enemy.isDead) {
            const distance = Vec3.distance(this.node.worldPosition, this.targetEnemy.worldPosition);
            if (distance < this.attackRange) {
                enemy.takeDamage(this.damage);
                this.playAttack();
                console.log(`[藤蔓仆从] 攻击敌人，伤害 ${this.damage}`);
            }
        }
    }

    /**
     * 碰撞回调
     */
    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact) {
        const enemy = otherCollider.node.getComponent(Enemy);
        if (enemy && !this.isAttacking) {
            enemy.takeDamage(this.damage);
            this.playAttack();
            console.log(`[藤蔓仆从] 碰撞攻击，伤害 ${this.damage}`);
        }
    }

    /**
     * 销毁仆从
     */
    private destroyMinion() {
        this.playDespawn(() => {
            if (this.node && this.node.isValid) {
                this.node.destroy();
            }
        });
    }

    update(deltaTime: number) {
        if (!this.targetEnemy || !this.targetEnemy.isValid) {
            this.targetEnemy = this.findNearestEnemy();
        }

        if (this.targetEnemy) {
            this.moveToEnemy(deltaTime);
            this.playMove();

            this.attackTimer += deltaTime;
            if (this.attackTimer >= this.attackCooldown) {
                this.attackTimer = 0;
                this.attackEnemy();
            }
        } else {
            this.isMoving = false;
            this.playIdle();
        }
    }
}