import { _decorator, Collider2D, Component, Contact2DType, instantiate, IPhysics2DContact, Node, Prefab, Vec3 } from 'cc';
const { ccclass, property } = _decorator;
import { Enemy } from '../../entities/enemy/Enemy';
import { PlayerController } from '../../entities/player/PlayerController';
import { EventBus } from '../../core/EventBus';
import { NetworkEnemy } from '../../network/NetworkEnemy';
import { NetworkManager } from '../../network/NetworkManager';
import { EventNames } from '../../utils/EventNames';
import { ObjectPool } from '../../utils/ObjectPool';
import { Explosion } from './Explosion';
import { ServiceLocator } from '../../core/ServiceLocator';

@ccclass('FireBall')
export class FireBall extends Component {
    @property(Prefab)
    explosionPrefab: Prefab = null // 爆炸预制体

    @property
    speed: number = 500 // 飞行速度

    @property
    damage: number = 20 // 伤害值

    private target: Node = null // 目标敌人
    private direction: Vec3 = new Vec3()
    private collider: Collider2D = null
    private pierceRemaining: number = 0 // 剩余可穿透次数
    private isPaused: boolean = false // 火球停止
    private networkManager: NetworkManager = null // 缓存网络管理器
    private poolKey: string = 'fireball' // 对象池标识
    private isFromPool: boolean = false // 是否来自对象池
    private canvasNode: Node = null

    // 外部调用，初始化火球，设置目标敌人
    public init(targetEnemy: Node, attackValue: number) {
        this.target = targetEnemy
        this.damage = attackValue // 使用玩家攻击力作为伤害

        // 获取玩家控制器，修正速度
        if (!this.canvasNode) {
            this.canvasNode = ServiceLocator.getInstance().get<Node>('canvasNode')
        }
        const playerNode = this.canvasNode?.getChildByName('Player')
        if (playerNode) {
            const pc = playerNode.getComponent(PlayerController)
            if (pc) {
                this.speed = this.speed * pc.getFireballSpeedMultiplier()

                if (pc.getHasPierceFireball()) {
                    this.pierceRemaining = 1; // 可弹射1次
                }
            }
        }

        // 缓存网络管理器
        if (this.canvasNode) {
            this.networkManager = this.canvasNode.getComponentInChildren(NetworkManager)
        }

        if (this.target && this.target.isValid) {
            // 计算初始方向
            Vec3.subtract(this.direction, this.target.worldPosition, this.node.worldPosition)
            this.direction.normalize()
        }
    }

    start() {
        this.collider = this.getComponent(Collider2D)
        if (this.collider) {
            this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }

        this.canvasNode = ServiceLocator.getInstance().get<Node>('canvasNode')

        // 如果没有指定目标，则自动寻找最近敌人
        if (!this.target || !this.target.isValid) {
            this.findNearestEnemy()
            if (this.target && this.target.isValid) {
                Vec3.subtract(this.direction, this.target.worldPosition, this.node.worldPosition)
                this.direction.normalize()
            } else {
                // 若无敌人，向摇杆方向发射
                this.direction.set(1, 0, 0)
            }
        }
        EventBus.on(EventNames.GAME_PAUSE, this.onPause, this)
    }

    protected onDestroy(): void {
        EventBus.off(EventNames.GAME_PAUSE, this.onPause, this)
    }

    /**
     * 设置是否来自对象池（由外部调用）
     */
    public setFromPool(fromPool: boolean) {
        this.isFromPool = fromPool
    }

    /**
     * 重置火球状态（用于对象池复用）
     */
    public reset() {
        this.target = null
        this.pierceRemaining = 0
        this.isPaused = false
        this.damage = 20
        this.speed = 500
        this.node.setPosition(0, 0, 0)
        this.node.setScale(1, 1, 1)
        // 重新启用碰撞器
        if (this.collider) {
            this.collider.enabled = true
        }
    }

    private onPause(pause: boolean) {
        this.isPaused = pause
    }

    /**
     * 获取当前游戏模式
     */
    private isOnlineMode(): boolean {
        return (window as any).gameMode === 'multi'
    }

    /**
     * 查找最近的敌人（支持单机 Enemy 和联机 NetworkEnemy）
     * @param excludeEnemy 排除的敌人节点（用于穿透后避开原目标）
     */
    private findNearestEnemy(excludeEnemy: Node = null) {
        if (!this.canvasNode) return

        let minDist = Infinity
        let nearest = null
        const isOnline = this.isOnlineMode()

        if (!isOnline) {
            // ========= 单机模式：查找 WaveManager 下的敌人 =========
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
            // ========= 联机模式：查找 Canvas 下的 NetworkEnemy_ 节点 =========
            for (const child of this.canvasNode.children) {
                if (!child.name.startsWith('NetworkEnemy_')) continue
                if (excludeEnemy && child === excludeEnemy) continue

                const networkEnemy = child.getComponent(NetworkEnemy)
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
        const networkEnemy = otherCollider.node.getComponent(NetworkEnemy)

        if (enemy && !enemy.isDead) {
            // ⚠️ 重要：在伤害之前保存位置，因为敌人死亡后位置会被重置
            const deathPos = enemy.node.worldPosition.clone()

            enemy.takeDamage(this.damage)

            if (this.pierceRemaining > 0) {
                this.pierceRemaining--
                return
            }

            this.spawnExplosionAt(deathPos)
            this.recycleToPool()
        }
        // ... 联机模式同理 ...
        else if (networkEnemy && !networkEnemy.isDead) {
            const deathPos = networkEnemy.node.worldPosition.clone()

            const playerNode = this.canvasNode?.getChildByName('Player')
            const playerController = playerNode?.getComponent(PlayerController)
            const attackValue = playerController?.getAttack() || this.damage

            if (this.networkManager) {
                this.networkManager.sendAttack(networkEnemy.enemyId, attackValue)
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

        const canvas = this.node.scene.getChildByName('Canvas')
        if (!canvas) return

        const pool = ObjectPool.getInstance()
        let explosion = pool.get('explosion', canvas)

        if (!explosion) {
            // 池中无可用，动态创建
            if (!this.explosionPrefab) return
            explosion = instantiate(this.explosionPrefab)
            canvas.addChild(explosion)
            const expScript = explosion.getComponent(Explosion)
            if (expScript) {
                expScript.setFromPool(false)
            }
        } else {
            const expScript = explosion.getComponent(Explosion)
            if (expScript) {
                expScript.setFromPool(true)
                expScript.reset()  // 重置状态（如果需要）
            }
        }

        explosion.worldPosition = position
    }

    /**
     * 回收火球到对象池
     */
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
            // 目标失效，自动寻找新目标
            this.findNearestEnemy()
            if (!this.target) {
                // 没有敌人就直接销毁/回收火球
                this.recycleToPool()
                return
            }
            Vec3.subtract(this.direction, this.target.worldPosition, this.node.worldPosition)
            this.direction.normalize()
        }

        // 向目标移动
        Vec3.subtract(this.direction, this.target.worldPosition, this.node.worldPosition)
        this.direction.normalize()

        const newPos = this.node.worldPosition.clone()
        newPos.x += this.direction.x * this.speed * deltaTime
        newPos.y += this.direction.y * this.speed * deltaTime
        this.node.worldPosition = newPos
    }
}


