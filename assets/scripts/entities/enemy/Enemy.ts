import { _decorator, Animation, Collider2D, Component, Contact2DType, IPhysics2DContact, Node, Vec3 } from 'cc';
import { EventBus } from '../../core/EventBus';
import { ServiceLocator } from '../../core/ServiceLocator';
import { PlayerController } from '../player/PlayerController';
import { EventNames } from '../../utils/EventNames';
import { AffixSystem } from '../../managers/AffixSystem';
import { ObjectPool } from '../../utils/ObjectPool';
import { GameConstants } from '../../utils/GameConstants';
const { ccclass, property } = _decorator;

@ccclass('Enemy')
export class Enemy extends Component {
    @property
    speed: number = GameConstants.ENEMY_NORMAL_SPEED

    @property
    damage: number = GameConstants.ENEMY_NORMAL_DAMAGE

    @property
    maxHealth: number = GameConstants.ENEMY_NORMAL_HEALTH

    private currentHealth: number = GameConstants.ENEMY_NORMAL_HEALTH
    private target: Node = null
    public isDead: boolean = false
    private collider: Collider2D = null
    private isPaused: boolean = false
    private anim: Animation = null
    private isMoving: boolean = false
    private affixSystem: AffixSystem = null

    // 对象池相关
    private poolKey: string = 'enemy'
    private isFromPool: boolean = false

    // 分裂怪相关
    public isMinion: boolean = false
    private baseMaxHealth: number = 0
    private runtimeMaxHealth: number = 0

    // ========== 生命周期 ==========

    start() {
        // ⚠️ 注意：对象池复用时 start() 不会再次执行
        // 初始化工作应该放在 reset() 中
        this.initReferences()
    }

    /**
     * 一次性初始化引用（只执行一次）
     */
    private initReferences() {
        this.anim = this.getComponent(Animation)

        const canvas = ServiceLocator.getInstance().get<Node>('canvasNode')
        this.target = canvas?.getChildByName('Player')

        this.collider = this.getComponent(Collider2D)
        if (this.collider) {
            this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }

        EventBus.on(EventNames.GAME_PAUSE, this.onPause, this)
        this.affixSystem = AffixSystem.getInstance()
    }

    protected onDestroy(): void {
        if (this.collider) {
            this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }
        EventBus.off(EventNames.GAME_PAUSE, this.onPause, this)
    }

    // ========== 对象池接口 ==========

    /**
     * 重置敌人状态（对象池复用时的唯一入口）
     * @param fromPool 是否来自对象池
     */
    public reset(fromPool: boolean = false) {
        this.isFromPool = fromPool
        this.isMinion = false
        this.isDead = false
        this.isMoving = false
        this.isPaused = false  // 🆕 重置暂停状态

        // 重置血量
        this.baseMaxHealth = this.maxHealth
        this.runtimeMaxHealth = this.maxHealth
        this.currentHealth = this.runtimeMaxHealth

        // 重置位置和缩放
        this.node.setPosition(0, 0, 0)
        this.node.setScale(1, 1, 1)

        // 重新启用碰撞器
        if (this.collider) {
            this.collider.enabled = true
        }

        // 清除词条数据
        if ((this as any).__affixData) {
            (this as any).__affixData = null
        }
    }

    /**
     * 设置分裂怪的血量倍率
     */
    public setAsMinion(healthPercent: number) {
        this.isMinion = true
        this.runtimeMaxHealth = this.baseMaxHealth * healthPercent
        this.currentHealth = this.runtimeMaxHealth
    }

    // ========== 私有方法 ==========

    private onPause(pause: boolean) {
        this.isPaused = pause
        if (this.anim) {
            if (pause) {
                this.anim.pause()
            } else {
                // 🆕 恢复动画时，根据当前移动状态恢复对应的动画
                if (this.isMoving) {
                    this.anim.resume()
                } else {
                    // 如果不在移动，恢复 idle 动画
                    const animState = this.anim.getState('enemy_move')
                    if (animState && !animState.isPlaying) {
                        this.anim.play('enemy_move')
                    }
                }
            }
        }
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (otherCollider.node.name == 'Player') {
            let finalDamage = this.damage
            if (this.affixSystem && this.affixSystem.isLoaded()) {
                finalDamage = this.affixSystem.onHitPlayer(this, finalDamage)
            }
            EventBus.emit(EventNames.ENEMY_HIT_PLAYER, finalDamage)
        }

        if (otherCollider.node.name == 'AttackArea') {
            const canvas = this.node.scene.getChildByName('Canvas')
            const player = canvas?.getChildByName('Player')
            const playerController = player?.getComponent(PlayerController)
            let damage = playerController.getAttack()

            if (this.affixSystem && this.affixSystem.isLoaded()) {
                damage = this.affixSystem.onEnemyHit(this, damage)
            }
            this.takeDamage(damage)
        }
    }

    private playMoveAnim() {
        if (this.isPaused) return  // 🆕 暂停时禁止播放动画
        if (!this.anim) return
        const animState = this.anim.getState('enemy_move')
        if (animState && !animState.isPlaying) {
            this.anim.play('enemy_move')
        }
    }

    // ========== 公共方法 ==========

    public takeDamage(damage: number) {
        if (this.isDead) return

        if (this.affixSystem && this.affixSystem.isLoaded()) {
            damage = this.affixSystem.onEnemyHit(this, damage)
        }

        this.currentHealth -= damage
        console.log(`敌人受到${damage}伤害, 剩余血量：${this.currentHealth}/${this.runtimeMaxHealth}`)

        if (this.currentHealth <= 0) {
            this.die()
        }
    }

    public die() {
        if (this.isDead) return

        // 分裂怪死亡时不触发分裂词条（避免无限循环）
        let preventDeath = false
        if (!this.isMinion && this.affixSystem && this.affixSystem.isLoaded()) {
            preventDeath = this.affixSystem.onEnemyDeath(this, this.node.worldPosition)
        }

        if (preventDeath) {
            return
        }

        this.isDead = true
        EventBus.emit(EventNames.ENEMY_DIED, this.node.worldPosition, this)

        // 回收或销毁
        if (this.isFromPool) {
            const pool = ObjectPool.getInstance()
            pool.recycle(this.poolKey, this.node)
        } else {
            this.node.destroy()
        }
    }

    // ========== Getter ==========

    public getRuntimeMaxHealth(): number {
        return this.runtimeMaxHealth
    }

    update(deltaTime: number) {
        if (this.isPaused) return
        if (this.isDead) return
        if (!this.target) return

        const enemyPos = this.node.worldPosition
        const targetPos = this.target.worldPosition

        const direction = new Vec3()
        Vec3.subtract(direction, targetPos, enemyPos)

        this.isMoving = direction.length() > 10

        if (this.isMoving) {
            this.playMoveAnim()
        }

        if (direction.length() < 5) return
        direction.normalize()

        const newPos = enemyPos.clone()
        newPos.x += direction.x * this.speed * deltaTime
        newPos.y += direction.y * this.speed * deltaTime
        this.node.worldPosition = newPos

        if (this.affixSystem && this.affixSystem.isLoaded()) {
            this.affixSystem.onEnemyUpdate(this, deltaTime)
        }
    }
}