// assets/scripts/gameplay/projectile/FireBall.ts

import { _decorator, Collider2D, Contact2DType, instantiate, IPhysics2DContact, Node, Prefab, Vec3, UITransform, BoxCollider2D } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { Enemy } from '../enemy/Enemy';
import { PlayerController } from '../player/PlayerController';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { ObjectPool } from '../../utils/ObjectPool';
import { Explosion } from './Explosion';
import { ServiceLocator } from '../../core/ServiceLocator';
import { INetworkService } from '../../interfaces/INetworkService';
import { AttackConfig, PlayerConfig } from '../../configs/GameConfig';

const { ccclass, property } = _decorator;

@ccclass('FireBall')
export class FireBall extends BaseComponent {
    @property(Prefab)
    explosionPrefab: Prefab = null

    @property
    speed: number = AttackConfig.FIREBALL_BASE_SPEED

    @property
    damage: number = PlayerConfig.BASE_ATTACK

    // 方向模式：飞行方向
    private direction: Vec3 = new Vec3(1, 0, 0)
    
    private collider: Collider2D = null
    private pierceRemaining: number = 0      // 穿透剩余次数
    private isPaused: boolean = false
    private networkService: INetworkService | null = null
    private poolKey: string = 'fireball'
    private isFromPool: boolean = false
    private canvasNode: Node = null
    
    // 缓存原始尺寸（用于巨型火球缩放）
    private originalWidth: number = 0
    private originalHeight: number = 0
    private originalColliderSize: { width: number, height: number } = { width: 0, height: 0 }

    // 方向模式初始化
    public initWithDirection(direction: Vec3, attackValue: number) {
        this.direction = direction.clone().normalize()
        this.damage = attackValue

        if (!this.canvasNode) {
            this.canvasNode = this.getService<Node>('canvasNode')
        }
        const playerNode = this.canvasNode?.getChildByName('Player')
        if (playerNode) {
            const pc = playerNode.getComponent(PlayerController)
            if (pc) {
                this.speed = this.speed * pc.getFireballSpeedMultiplier()

                // 直接获取穿透次数，通过 pierceCount > 0 判断
                const pierceCount = pc.getPierceCount()
                if (pierceCount > 0) {
                    this.pierceRemaining = pierceCount
                    console.log(`[FireBall] 穿透次数: ${this.pierceRemaining}`);
                }
                
                // 记录原始尺寸
                if (this.originalWidth === 0) {
                    const uiTransform = this.node.getComponent(UITransform)
                    if (uiTransform) {
                        this.originalWidth = uiTransform.contentSize.width
                        this.originalHeight = uiTransform.contentSize.height
                    }
                }
                
                // 记录原始碰撞体大小
                if (this.originalColliderSize.width === 0) {
                    const boxCollider = this.getComponent(BoxCollider2D)
                    if (boxCollider) {
                        this.originalColliderSize.width = boxCollider.size.width
                        this.originalColliderSize.height = boxCollider.size.height
                    }
                }
                
                // 巨型火球：体积缩放
                const sizeMultiplier = pc.getFireballSizeMultiplier?.() || 1.0
                this.node.setScale(sizeMultiplier, sizeMultiplier, 1)
                
                const uiTransform = this.node.getComponent(UITransform)
                if (uiTransform && this.originalWidth > 0) {
                    uiTransform.setContentSize(this.originalWidth * sizeMultiplier, this.originalHeight * sizeMultiplier)
                }
                
                const boxCollider = this.getComponent(BoxCollider2D)
                if (boxCollider && this.originalColliderSize.width > 0) {
                    boxCollider.size.width = this.originalColliderSize.width * sizeMultiplier
                    boxCollider.size.height = this.originalColliderSize.height * sizeMultiplier
                }
                
                const damageBonus = pc.getFireballDamageBonus?.() || 1.0
                this.damage = this.damage * damageBonus
            }
        }

        this.networkService = this.getService<INetworkService>('INetworkService')
    }

    /**
     * @deprecated 旧版锁定目标模式，已废弃，请使用 initWithDirection
     */
    public init(targetEnemy: Node, attackValue: number) {
        console.warn('[FireBall] init(targetEnemy) 已废弃，请使用 initWithDirection');
        this.initWithDirection(new Vec3(1, 0, 0), attackValue)
    }

    start() {
        this.collider = this.getComponent(Collider2D)
        if (this.collider) {
            this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }

        this.canvasNode = this.getService<Node>('canvasNode')
        EventBus.on(EventNames.GAME_PAUSE, this.onPause, this)
    }

    protected onDestroy(): void {
        EventBus.off(EventNames.GAME_PAUSE, this.onPause, this)
    }

    public setFromPool(fromPool: boolean) {
        this.isFromPool = fromPool
    }

    public reset() {
        this.direction = new Vec3(1, 0, 0)
        this.pierceRemaining = 0
        this.isPaused = false
        this.damage = PlayerConfig.BASE_ATTACK
        this.speed = AttackConfig.FIREBALL_BASE_SPEED
        this.node.setPosition(0, 0, 0)
        this.node.setScale(1, 1, 1)
        
        if (this.originalWidth > 0) {
            const uiTransform = this.node.getComponent(UITransform)
            if (uiTransform) {
                uiTransform.setContentSize(this.originalWidth, this.originalHeight)
            }
        }
        
        if (this.originalColliderSize.width > 0) {
            const boxCollider = this.getComponent(BoxCollider2D)
            if (boxCollider) {
                boxCollider.size.width = this.originalColliderSize.width
                boxCollider.size.height = this.originalColliderSize.height
            }
        }
        
        if (this.collider) {
            this.collider.enabled = true
        }
    }

    private onPause(pause: boolean) {
        this.isPaused = pause
    }

    private isOnlineMode(): boolean {
        return (window as any).gameMode === 'multi'
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact) {
        const enemy = otherCollider.node.getComponent(Enemy)
        const networkEnemy = otherCollider.node.getComponent('NetworkEnemy') as any

        // ========== 普通敌人 ==========
        if (enemy && !enemy.isDead) {
            const deathPos = enemy.node.worldPosition.clone()

            // 造成伤害
            enemy.takeDamage(this.damage)
            
            // 吸血回调
            const canvas = this.canvasNode
            const playerNode = canvas?.getChildByName('Player')
            const playerController = playerNode?.getComponent(PlayerController)
            if (playerController) {
                playerController.onAttackHit(this.damage, null)
            }

            // 穿透逻辑：减少次数，继续沿原方向飞行
            if (this.pierceRemaining > 0) {
                this.pierceRemaining--
                console.log(`[FireBall] 穿透！剩余次数: ${this.pierceRemaining}`);
                
                //  穿透时也播放爆炸动画
                this.spawnExplosionAt(deathPos)
                
                return  // 继续飞行，不销毁火球
            }

            // 没有穿透次数了，产生爆炸并销毁
            this.spawnExplosionAt(deathPos)
            this.recycleToPool()
        }
        // ========== 网络敌人（联机模式）==========
        else if (networkEnemy && !networkEnemy.isDead) {
            const deathPos = networkEnemy.node.worldPosition.clone()

            const canvas = this.canvasNode
            const playerNode = canvas?.getChildByName('Player')
            const playerController = playerNode?.getComponent(PlayerController)
            const attackValue = playerController?.getAttack() || this.damage

            if (this.networkService) {
                this.networkService.sendAttack(networkEnemy.enemyId, attackValue)
            }

            if (playerController) {
                playerController.onAttackHit(attackValue, null)
            }

            // 穿透逻辑：网络敌人
            if (this.pierceRemaining > 0) {
                this.pierceRemaining--
                console.log(`[FireBall] 穿透！剩余次数: ${this.pierceRemaining}`);
                
                //  穿透时也播放爆炸动画
                this.spawnExplosionAt(deathPos)
                
                return  // 继续飞行，不销毁
            }

            this.spawnExplosionAt(deathPos)
            this.recycleToPool()
        }
    }

    private spawnExplosionAt(position: Vec3) {
        if (!this.canvasNode) return

        const pool = ObjectPool.getInstance()
        let explosion = pool.get('explosion', this.canvasNode)

        if (!explosion) {
            if (!this.explosionPrefab) return
            explosion = instantiate(this.explosionPrefab)
            this.canvasNode.addChild(explosion)
            const expScript = explosion.getComponent(Explosion)
            if (expScript) {
                expScript.setFromPool(false)
            }
        } else {
            const expScript = explosion.getComponent(Explosion)
            if (expScript) {
                expScript.setFromPool(true)
                expScript.reset()
            }
        }

        explosion.worldPosition = position
    }

    private recycleToPool() {
        if (this.isFromPool) {
            const pool = ObjectPool.getInstance()
            pool.recycle(this.poolKey, this.node)
        } else {
            this.node.destroy()
        }
    }

    update(deltaTime: number) {
        if (this.isPaused) return

        // 直线飞行（穿透模式下方向不变）
        const newPos = this.node.worldPosition.clone()
        newPos.x += this.direction.x * this.speed * deltaTime
        newPos.y += this.direction.y * this.speed * deltaTime
        this.node.worldPosition = newPos

        // 超出边界自动回收
        const pos = this.node.worldPosition
        const bound = 2000
        if (Math.abs(pos.x) > bound || Math.abs(pos.y) > bound) {
            this.recycleToPool()
        }
    }
}