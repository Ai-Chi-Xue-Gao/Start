// assets/scripts/gameplay/summon/GenericSummon.ts

import { _decorator, Node, Vec3, Collider2D, Contact2DType, IPhysics2DContact, Sprite, Color, tween, UIOpacity, Animation } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { Enemy } from '../enemy/Enemy';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { GameStateMachine } from '../../core/GameStateMachine';
import { ServiceLocator } from '../../core/ServiceLocator';
import { ObjectPool } from '../../utils/ObjectPool';

const { ccclass, property } = _decorator;

const ELEMENT_COLORS: Record<string, Color> = {
    fire: new Color(255, 87, 34, 255),
    water: new Color(33, 150, 243, 255),
    wood: new Color(76, 175, 80, 255),
    metal: new Color(255, 193, 7, 255),
    earth: new Color(121, 85, 72, 255),
    thunder: new Color(156, 39, 176, 255),
    chaos: new Color(255, 0, 255, 255)
};

/**
 * 召唤物状态
 */
enum SummonState {
    IDLE = 'idle',
    MOVE = 'move',
    ATTACK = 'attack',
    DIE = 'die'
}

/**
 * 通用召唤物组件
 * 支持：动画、自动寻敌、攻击、嘲讽、死亡效果
 */
@ccclass('GenericSummon')
export class GenericSummon extends BaseComponent {
    @property
    moveSpeed: number = 200;

    @property
    attackRange: number = 80;

    @property
    attackCooldown: number = 1.0;

    @property
    searchRange: number = 400;

    private damage: number = 0;
    private maxHealth: number = 0;
    private currentHealth: number = 0;
    private duration: number = 0;
    private hasTaunt: boolean = false;
    private element: string = '';
    private skillId: string = '';

    private targetEnemy: Node | null = null;
    private attackTimer: number = 0;
    private collider: Collider2D = null;
    private currentState: SummonState = SummonState.IDLE;
    private isDead: boolean = false;
    private canvasNode: Node = null;
    private spriteNode: Node = null;
    private animation: Animation = null;
    private isFromPool: boolean = false;
    private poolKey: string = 'genericSummon';

    start() {
        this.canvasNode = this.node.scene?.getChildByName('Canvas');
        this.spriteNode = this.node.getChildByName('Sprite') || this.node;
        this.animation = this.node.getComponent(Animation);

        this.collider = this.getComponent(Collider2D);
        if (this.collider) {
            this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }

        // 播放出现动画
        this.playSpawnAnimation();

        // 定时销毁
        this.scheduleOnce(() => {
            this.destroySummon();
        }, this.duration);

        // 嘲讽光环（如果有）
        if (this.hasTaunt) {
            this.applyTauntAura();
        }

        console.log(`[GenericSummon] 召唤物已创建，伤害: ${this.damage}, 生命: ${this.maxHealth}, 嘲讽: ${this.hasTaunt}`);
    }

    protected onDestroy() {
        if (this.collider) {
            this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    /**
     * 初始化召唤物
     */
    public init(damage: number, health: number, duration: number, hasTaunt: boolean, element: string, skillId: string = '') {
        this.damage = damage;
        this.maxHealth = health;
        this.currentHealth = health;
        this.duration = duration;
        this.hasTaunt = hasTaunt;
        this.element = element;
        this.skillId = skillId;

        this.applyElementStyle();
        this.playStateAnimation(SummonState.IDLE);
    }

    /**
     * 应用元素样式
     */
    private applyElementStyle() {
        const sprite = this.spriteNode?.getComponent(Sprite);
        if (sprite && this.element) {
            const color = ELEMENT_COLORS[this.element] || Color.WHITE;
            sprite.color = color;
        }
    }

    /**
     * 播放状态动画
     */
    private playStateAnimation(state: SummonState) {
        if (!this.animation) return;

        let animName = '';
        switch (state) {
            case SummonState.IDLE:
                animName = 'idle';
                break;
            case SummonState.MOVE:
                animName = 'move';
                break;
            case SummonState.ATTACK:
                animName = 'attack';
                break;
            case SummonState.DIE:
                animName = 'die';
                break;
        }

        if (animName && this.animation.getState(animName)) {
            this.animation.play(animName);
        }
    }

    /**
     * 播放出现动画
     */
    private playSpawnAnimation() {
        const uiOpacity = this.node.getComponent(UIOpacity);
        if (uiOpacity) {
            uiOpacity.opacity = 0;
            tween(uiOpacity)
                .to(0.2, { opacity: 255 })
                .start();
        }

        this.node.setScale(0.5, 0.5, 1);
        tween(this.node)
            .to(0.2, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    /**
     * 播放消失动画
     */
    private playDespawnAnimation(onComplete?: () => void) {
        const uiOpacity = this.node.getComponent(UIOpacity);
        if (uiOpacity) {
            tween(uiOpacity)
                .to(0.2, { opacity: 0 })
                .start();
        }

        tween(this.node)
            .to(0.2, { scale: new Vec3(0.5, 0.5, 1) })
            .call(() => {
                onComplete?.();
            })
            .start();
    }

    /**
     * 应用嘲讽光环（吸引敌人攻击）
     */
    private applyTauntAura() {
        this.schedule(() => {
            this.tauntNearbyEnemies();
        }, 2.0);
    }

    /**
     * 嘲讽周围敌人
     */
    private tauntNearbyEnemies() {
        const canvas = this.canvasNode;
        const waveManager = canvas?.getChildByName('WaveManager');
        if (!waveManager) return;

        const centerPos = this.node.worldPosition;
        const tauntRadius = 300;

        for (const child of waveManager.children) {
            const enemy = child.getComponent(Enemy);
            if (enemy && !enemy.isDead) {
                const distance = Vec3.distance(centerPos, child.worldPosition);
                if (distance < tauntRadius) {
                    (enemy as any).target = this.node;
                    console.log(`[GenericSummon] 嘲讽敌人`);
                }
            }
        }
    }

    /**
     * 受到伤害
     */
    public takeDamage(damage: number): boolean {
        if (this.isDead) return false;

        this.currentHealth -= damage;
        
        // 受伤闪烁
        this.playHurtFlash();
        
        if (this.currentHealth <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    /**
     * 受伤闪烁
     */
    private playHurtFlash() {
        const sprite = this.spriteNode?.getComponent(Sprite);
        if (!sprite) return;

        const originalColor = sprite.color.clone();
        sprite.color = Color.RED;
        
        this.scheduleOnce(() => {
            if (sprite && sprite.isValid) {
                sprite.color = originalColor;
            }
        }, 0.1);
    }

    /**
     * 死亡
     */
    private die() {
        if (this.isDead) return;
        this.isDead = true;
        
        this.playStateAnimation(SummonState.DIE);
        
        // 等待死亡动画完成后销毁
        const dieAnim = this.animation?.getState('summon_die');
        const dieDuration = dieAnim ? dieAnim.duration : 0.3;
        
        this.scheduleOnce(() => {
            this.playDespawnAnimation(() => {
                if (this.isFromPool) {
                    const pool = ObjectPool.getInstance();
                    pool.recycle(this.poolKey, this.node);
                } else {
                    this.node.destroy();
                }
            });
        }, dieDuration);
        
        console.log(`[GenericSummon] 召唤物死亡`);
    }

    /**
     * 销毁召唤物
     */
    private destroySummon() {
        if (this.isDead) return;
        this.isDead = true;
        
        this.playStateAnimation(SummonState.DIE);
        
        const dieAnim = this.animation?.getState('summon_die');
        const dieDuration = dieAnim ? dieAnim.duration : 0.3;
        
        this.scheduleOnce(() => {
            this.playDespawnAnimation(() => {
                if (this.isFromPool) {
                    const pool = ObjectPool.getInstance();
                    pool.recycle(this.poolKey, this.node);
                } else {
                    this.node.destroy();
                }
            });
        }, dieDuration);
    }

    /**
     * 寻找最近的敌人
     */
    private findNearestEnemy(): Node | null {
        const canvas = this.canvasNode;
        const waveManager = canvas?.getChildByName('WaveManager');
        if (!waveManager) return null;

        let nearest: Node | null = null;
        let minDist = this.searchRange;

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

        return nearest;
    }

    /**
     * 向敌人移动
     */
    private moveToEnemy(deltaTime: number) {
        if (!this.targetEnemy || !this.targetEnemy.isValid) {
            this.targetEnemy = this.findNearestEnemy();
            if (!this.targetEnemy) {
                if (this.currentState !== SummonState.IDLE) {
                    this.currentState = SummonState.IDLE;
                    this.playStateAnimation(SummonState.IDLE);
                }
                return;
            }
        }

        const enemy = this.targetEnemy.getComponent(Enemy);
        if (!enemy || enemy.isDead) {
            this.targetEnemy = null;
            if (this.currentState !== SummonState.IDLE) {
                this.currentState = SummonState.IDLE;
                this.playStateAnimation(SummonState.IDLE);
            }
            return;
        }

        const myPos = this.node.worldPosition;
        const enemyPos = this.targetEnemy.worldPosition;
        const distance = Vec3.distance(myPos, enemyPos);

        if (distance > this.searchRange) {
            this.targetEnemy = null;
            if (this.currentState !== SummonState.IDLE) {
                this.currentState = SummonState.IDLE;
                this.playStateAnimation(SummonState.IDLE);
            }
            return;
        }

        if (distance < this.attackRange) {
            // 在攻击范围内，停止移动
            if (this.currentState !== SummonState.ATTACK && this.currentState !== SummonState.IDLE) {
                this.currentState = SummonState.IDLE;
                this.playStateAnimation(SummonState.IDLE);
            }
            return;
        }

        // 移动状态
        if (this.currentState !== SummonState.MOVE) {
            this.currentState = SummonState.MOVE;
            this.playStateAnimation(SummonState.MOVE);
        }

        const direction = new Vec3();
        Vec3.subtract(direction, enemyPos, myPos);
        direction.normalize();

        // 更新精灵朝向
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
                // 播放攻击动画
                if (this.currentState !== SummonState.ATTACK) {
                    this.currentState = SummonState.ATTACK;
                    this.playStateAnimation(SummonState.ATTACK);
                    
                    // 攻击动画结束后恢复待机
                    const attackAnim = this.animation?.getState('summon_attack');
                    const attackDuration = attackAnim ? attackAnim.duration : 0.3;
                    this.scheduleOnce(() => {
                        if (this.currentState === SummonState.ATTACK && !this.isDead) {
                            this.currentState = SummonState.IDLE;
                            this.playStateAnimation(SummonState.IDLE);
                        }
                    }, attackDuration);
                }
                
                enemy.takeDamage(this.damage);
                console.log(`[GenericSummon] 攻击敌人，伤害 ${this.damage}`);
            }
        }
    }

    /**
     * 更新精灵朝向
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
     * 碰撞回调
     */
    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact) {
        const enemy = otherCollider.node.getComponent(Enemy);
        if (enemy && !this.isDead) {
            enemy.takeDamage(this.damage);
            console.log(`[GenericSummon] 碰撞攻击，伤害 ${this.damage}`);
        }
    }

    /**
     * 设置是否来自对象池
     */
    public setFromPool(fromPool: boolean) {
        this.isFromPool = fromPool;
    }

    /**
     * 重置召唤物状态
     */
    public reset() {
        this.isDead = false;
        this.currentHealth = this.maxHealth;
        this.targetEnemy = null;
        this.attackTimer = 0;
        this.currentState = SummonState.IDLE;
        this.isFromPool = false;

        // 停止所有动画
        if (this.animation) {
            this.animation.stop();
        }

        // 重置位置和缩放
        this.node.setPosition(0, 0, 0);
        this.node.setScale(1, 1, 1);

        // 重置透明度
        const uiOpacity = this.node.getComponent(UIOpacity);
        if (uiOpacity) {
            uiOpacity.opacity = 255;
        }
        
        // 重置颜色
        this.applyElementStyle();
    }

    update(deltaTime: number) {
        if (this.isDead) return;

        const stateMachine = ServiceLocator.getInstance().get<GameStateMachine>('stateMachine');
        if (stateMachine && stateMachine.isPaused()) return;

        if (!this.targetEnemy || !this.targetEnemy.isValid) {
            this.targetEnemy = this.findNearestEnemy();
        }

        if (this.targetEnemy) {
            this.moveToEnemy(deltaTime);

            this.attackTimer += deltaTime;
            if (this.attackTimer >= this.attackCooldown) {
                this.attackTimer = 0;
                this.attackEnemy();
            }
        } else if (this.currentState !== SummonState.IDLE) {
            this.currentState = SummonState.IDLE;
            this.playStateAnimation(SummonState.IDLE);
        }
    }
}