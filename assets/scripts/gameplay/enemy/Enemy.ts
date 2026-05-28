// assets/scripts/gameplay/enemy/Enemy.ts

import { _decorator, Animation, Collider2D, Contact2DType, IPhysics2DContact, Node, Vec3 } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { EventBus } from '../../core/EventBus';
import { ServiceLocator } from '../../core/ServiceLocator';
import { PlayerController } from '../player/PlayerController';
import { EventNames } from '../../utils/EventNames';
import { AffixSystem } from '../managers/AffixSystem';
import { ObjectPool } from '../../utils/ObjectPool';
import { EnemyConfig } from '../../configs/GameConfig';

const { ccclass, property } = _decorator;

@ccclass('Enemy')
export class Enemy extends BaseComponent {
    @property
    speed: number = EnemyConfig.NORMAL_SPEED

    @property
    damage: number = EnemyConfig.NORMAL_DAMAGE

    @property
    maxHealth: number = EnemyConfig.NORMAL_HEALTH

    private currentHealth: number = EnemyConfig.NORMAL_HEALTH
    private target: Node = null
    public isDead: boolean = false
    private collider: Collider2D = null
    private isPaused: boolean = false
    private anim: Animation = null
    private isMoving: boolean = false
    private affixSystem: AffixSystem = null

    private poolKey: string = 'enemy'
    private isFromPool: boolean = false

    public isMinion: boolean = false
    private baseMaxHealth: number = 0
    private runtimeMaxHealth: number = 0

    // ========== 减速相关属性 ==========
    public isSlowed: boolean = false
    private originalSpeedCache: number = 0
    private slowScheduleId: any = null

    start() {
        this.initReferences()
    }

    private initReferences() {
        this.anim = this.getComponent(Animation)

        const canvas = this.getService<Node>('canvasNode')
        this.target = canvas?.getChildByName('Player')

        this.collider = this.getComponent(Collider2D)
        if (this.collider) {
            this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }

        EventBus.on(EventNames.GAME_PAUSE, this.onPause, this)
        EventBus.on('player_reflect_damage', this.onReflectDamage, this)
        this.affixSystem = AffixSystem.getInstance()
    }

    protected onDestroy(): void {
        if (this.collider) {
            this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }
        EventBus.off(EventNames.GAME_PAUSE, this.onPause, this)
        EventBus.off('player_reflect_damage', this.onReflectDamage, this)
        
        // 清理减速定时器
        if (this.slowScheduleId !== null) {
            this.unschedule(this.slowScheduleId)
        }
    }

    // 添加反伤处理方法
    private onReflectDamage(data: { damage: number }) {
        if (!this.isDead && this.currentHealth > 0) {
            this.takeDamage(data.damage);
            console.log(`[反伤] 敌人受到 ${data.damage} 点反伤`);
        }
    }

    public reset(fromPool: boolean = false) {
        this.isFromPool = fromPool
        this.isMinion = false
        this.isDead = false
        this.isMoving = false
        this.isPaused = false
        
        // 重置减速状态
        this.isSlowed = false
        this.originalSpeedCache = 0
        if (this.slowScheduleId !== null) {
            this.unschedule(this.slowScheduleId)
            this.slowScheduleId = null
        }

        this.baseMaxHealth = this.maxHealth
        this.runtimeMaxHealth = this.maxHealth
        this.currentHealth = this.runtimeMaxHealth

        this.node.setPosition(0, 0, 0)
        this.node.setScale(1, 1, 1)

        if (this.collider) {
            this.collider.enabled = true
        }

        // 清除词条数据（重置词条记录）
        if ((this as any).__affixData) {
            (this as any).__affixData = null
        }

        // 通知词条系统清除记录
        const affixSystem = AffixSystem.getInstance()
        if (affixSystem) {
            affixSystem.resetEnemyAffixRecord(this)
        }
    }

    public setAsMinion(healthPercent: number) {
        this.isMinion = true
        // 血量取整，避免浮点精度问题
        this.runtimeMaxHealth = Math.floor(this.baseMaxHealth * healthPercent)
        this.currentHealth = this.runtimeMaxHealth
    }

    private onPause(pause: boolean) {
        this.isPaused = pause
        if (this.anim) {
            if (pause) {
                this.anim.pause()
            } else {
                if (this.isMoving) {
                    this.anim.resume()
                } else {
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
        if (this.isPaused) return
        if (!this.anim) return
        const animState = this.anim.getState('enemy_move')
        if (animState && !animState.isPlaying) {
            this.anim.play('enemy_move')
        }
    }

    /**
     * 受到伤害
     * 添加伤害取整和血量取整，避免浮点精度问题
     */
    public takeDamage(damage: number): boolean {
        if (this.isDead) return false

        if (this.affixSystem && this.affixSystem.isLoaded()) {
            damage = this.affixSystem.onEnemyHit(this, damage)
        }

        // 伤害向上取整
        damage = Math.ceil(damage);
        this.currentHealth -= damage;

        // 血量取整显示
        console.log(`敌人受到${damage}伤害, 剩余血量：${Math.floor(this.currentHealth)}/${Math.floor(this.runtimeMaxHealth)}`)

        if (this.currentHealth <= 0) {
            this.die()
            return true
        }
        return false
    }

    public die() {
        if (this.isDead) return

        let preventDeath = false
        if (!this.isMinion && this.affixSystem && this.affixSystem.isLoaded()) {
            preventDeath = this.affixSystem.onEnemyDeath(this, this.node.worldPosition)
        }

        if (preventDeath) {
            return
        }

        this.isDead = true
        EventBus.emit(EventNames.ENEMY_DIED, this.node.worldPosition, this)

        if (this.isFromPool) {
            const pool = ObjectPool.getInstance()
            pool.recycle(this.poolKey, this.node)
        } else {
            this.node.destroy()
        }
    }

    public getRuntimeMaxHealth(): number {
        // 返回取整后的最大血量
        return Math.floor(this.runtimeMaxHealth)
    }

    /**
     * 获取当前速度
     */
    public getSpeed(): number {
        return this.speed;
    }

    /**
     * 设置速度（用于减速效果）
     */
    public setSpeed(newSpeed: number) {
        this.speed = newSpeed;
    }

    /**
     * 获取原始速度
     */
    public getOriginalSpeed(): number {
        return (this as any).__originalSpeed || this.speed;
    }

    /**
     * ========== 减速效果方法 ==========
     * 应用减速效果
     * @param percent 减速百分比 (0-1)
     * @param duration 持续时间（秒）
     */
    public applySlow(percent: number, duration: number) {
        if (this.isDead) return
        
        // 保存原始速度
        if (!this.isSlowed) {
            this.originalSpeedCache = this.speed
        }
        
        this.isSlowed = true
        // 限制最大减速90%
        const finalPercent = Math.min(0.9, percent)
        const newSpeed = this.originalSpeedCache * (1 - finalPercent)
        this.speed = Math.max(20, newSpeed)
        
        // 取消之前的定时器
        if (this.slowScheduleId !== null) {
            this.unschedule(this.slowScheduleId)
        }
        
        // 设置恢复定时器
        this.slowScheduleId = this.scheduleOnce(() => {
            if (this.isValid && !this.isDead) {
                this.speed = this.originalSpeedCache
                this.isSlowed = false
                this.slowScheduleId = null
            }
        }, duration)
        
        console.log(`[Enemy] 减速 ${finalPercent * 100}%，持续 ${duration}秒，当前速度: ${this.speed}`)
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