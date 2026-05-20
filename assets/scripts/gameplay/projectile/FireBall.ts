// assets/scripts/gameplay/projectile/FireBall.ts

import { _decorator, Collider2D, Contact2DType, instantiate, IPhysics2DContact, Node, Prefab, Vec3 } from 'cc';
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

    private target: Node = null
    private direction: Vec3 = new Vec3()
    private collider: Collider2D = null
    private pierceRemaining: number = 0
    private isPaused: boolean = false
    private networkService: INetworkService | null = null
    private poolKey: string = 'fireball'
    private isFromPool: boolean = false
    private canvasNode: Node = null

    public init(targetEnemy: Node, attackValue: number) {
        this.target = targetEnemy
        this.damage = attackValue

        if (!this.canvasNode) {
            this.canvasNode = this.getService<Node>('canvasNode')
        }
        const playerNode = this.canvasNode?.getChildByName('Player')
        if (playerNode) {
            const pc = playerNode.getComponent(PlayerController)
            if (pc) {
                this.speed = this.speed * pc.getFireballSpeedMultiplier()

                if (pc.getHasPierceFireball()) {
                    this.pierceRemaining = 1
                }
            }
        }

        this.networkService = this.getService<INetworkService>('INetworkService')

        if (this.target && this.target.isValid) {
            Vec3.subtract(this.direction, this.target.worldPosition, this.node.worldPosition)
            this.direction.normalize()
        }
    }

    start() {
        this.collider = this.getComponent(Collider2D)
        if (this.collider) {
            this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }

        this.canvasNode = this.getService<Node>('canvasNode')

        if (!this.target || !this.target.isValid) {
            this.findNearestEnemy()
            if (this.target && this.target.isValid) {
                Vec3.subtract(this.direction, this.target.worldPosition, this.node.worldPosition)
                this.direction.normalize()
            } else {
                this.direction.set(1, 0, 0)
            }
        }
        EventBus.on(EventNames.GAME_PAUSE, this.onPause, this)
    }

    protected onDestroy(): void {
        EventBus.off(EventNames.GAME_PAUSE, this.onPause, this)
    }

    public setFromPool(fromPool: boolean) {
        this.isFromPool = fromPool
    }

    public reset() {
        this.target = null
        this.pierceRemaining = 0
        this.isPaused = false
        this.damage = PlayerConfig.BASE_ATTACK
        this.speed = AttackConfig.FIREBALL_BASE_SPEED
        this.node.setPosition(0, 0, 0)
        this.node.setScale(1, 1, 1)
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

    private findNearestEnemy(excludeEnemy: Node = null) {
        if (!this.canvasNode) return

        let minDist = Infinity
        let nearest = null
        const isOnline = this.isOnlineMode()

        if (!isOnline) {
            const waveManager = this.canvasNode.getChildByName('WaveManager')
            if (waveManager) {
                for (const child of waveManager.children) {
                    if (excludeEnemy && child === excludeEnemy) continue

                    const enemyScript = child.getComponent(Enemy)
                    if (child.isValid && enemyScript && !enemyScript.isDead) {
                        const dist = Vec3.distance(this.node.worldPosition, child.worldPosition)
                        if (dist < minDist) {
                            minDist = dist
                            nearest = child
                        }
                    }
                }
            }
        } else {
            for (const child of this.canvasNode.children) {
                if (!child.name.startsWith('NetworkEnemy_')) continue
                if (excludeEnemy && child === excludeEnemy) continue

                const networkEnemy = child.getComponent('NetworkEnemy') as any
                if (child.isValid && networkEnemy && !networkEnemy.isDead) {
                    const dist = Vec3.distance(this.node.worldPosition, child.worldPosition)
                    if (dist < minDist) {
                        minDist = dist
                        nearest = child
                    }
                }
            }
        }

        this.target = nearest
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact) {
        const enemy = otherCollider.node.getComponent(Enemy)
        const networkEnemy = otherCollider.node.getComponent('NetworkEnemy') as any

        if (enemy && !enemy.isDead) {
            const deathPos = enemy.node.worldPosition.clone()

            enemy.takeDamage(this.damage)

            if (this.pierceRemaining > 0) {
                this.pierceRemaining--
                return
            }

            this.spawnExplosionAt(deathPos)
            this.recycleToPool()
        }
        else if (networkEnemy && !networkEnemy.isDead) {
            const deathPos = networkEnemy.node.worldPosition.clone()

            const playerNode = this.canvasNode?.getChildByName('Player')
            const playerController = playerNode?.getComponent(PlayerController)
            const attackValue = playerController?.getAttack() || this.damage

            if (this.networkService) {
                this.networkService.sendAttack(networkEnemy.enemyId, attackValue)
            }

            if (this.pierceRemaining > 0) {
                this.pierceRemaining--
                this.findNearestEnemy(otherCollider.node)
                if (this.target && this.target.isValid) {
                    Vec3.subtract(this.direction, this.target.worldPosition, this.node.worldPosition)
                    this.direction.normalize()
                }
                return
            }

            this.spawnExplosionAt(deathPos)
            this.recycleToPool()
        }
    }

    private spawnExplosionAt(position: Vec3) {
        console.log(`[火球] spawnExplosionAt 位置: (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`)

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
            console.log(`[爆炸] 动态创建爆炸特效`)
        } else {
            const expScript = explosion.getComponent(Explosion)
            if (expScript) {
                expScript.setFromPool(true)
                expScript.reset()
            }
            console.log(`[爆炸] 从对象池获取爆炸特效`)
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
        if (!this.target || !this.target.isValid) {
            this.findNearestEnemy()
            if (!this.target) {
                this.recycleToPool()
                return
            }
            Vec3.subtract(this.direction, this.target.worldPosition, this.node.worldPosition)
            this.direction.normalize()
        }

        Vec3.subtract(this.direction, this.target.worldPosition, this.node.worldPosition)
        this.direction.normalize()

        const newPos = this.node.worldPosition.clone()
        newPos.x += this.direction.x * this.speed * deltaTime
        newPos.y += this.direction.y * this.speed * deltaTime
        this.node.worldPosition = newPos
    }
}