// assets/scripts/gameplay/enemy/Enemy.ts

import { _decorator, Animation, Collider2D, Contact2DType, IPhysics2DContact, Node, Sprite, Vec3 } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { EventBus } from '../../core/EventBus';
import { ServiceLocator } from '../../core/ServiceLocator';
import { PlayerController } from '../player/PlayerController';
import { EventNames } from '../../utils/EventNames';
import { AffixSystem } from '../managers/AffixSystem';
import { ObjectPool } from '../../utils/ObjectPool';
import { EnemyConfig } from '../../configs/GameConfig';
import { IAffixTarget } from '../../interfaces/IAffixTarget';
import { EnemyAffixData } from '../managers/AffixData';
import { TriggerSystem } from '../../Managers/TriggerSystem';  // ✅ 新增导入

const { ccclass, property } = _decorator;

/**
 * 敌人组件
 * 实现 IAffixTarget 接口，支持词条系统
 */
@ccclass('Enemy')
export class Enemy extends BaseComponent implements IAffixTarget {
    // ========== 公开属性 ==========
    @property
    speed: number = EnemyConfig.NORMAL_SPEED

    @property
    damage: number = EnemyConfig.NORMAL_DAMAGE

    @property
    maxHealth: number = EnemyConfig.NORMAL_HEALTH

    // ========== IAffixTarget 接口实现 ==========
    
    /** 当前生命值 */
    private _currentHealth: number = EnemyConfig.NORMAL_HEALTH
    get currentHealth(): number { return this._currentHealth }
    set currentHealth(value: number) { this._currentHealth = Math.max(0, Math.floor(value)) }

    /** 伤害减免比例 (0~1) */
    damageReduction: number = 0

    /** 词条运行时数据容器 */
    affixData?: EnemyAffixData

    /** 是否已死亡 */
    public isDead: boolean = false

    /** 是否为小怪（分裂/召唤产生） */
    public isMinion: boolean = false

    // ========== 私有属性 ==========
    private target: Node | null = null
    private collider: Collider2D | null = null
    private isPaused: boolean = false
    private anim: Animation | null = null
    private isMoving: boolean = false
    private affixSystem: AffixSystem | null = null

    // 对象池相关
    private poolKey: string = 'enemy'
    private isFromPool: boolean = false
    
    // 基础属性缓存
    private baseMaxHealth: number = 0
    private runtimeMaxHealth: number = 0

    // 减速相关
    private isSlowed: boolean = false
    private originalSpeedCache: number = 0
    private slowScheduleId: any = null

    // 击飞相关
    private knockbackVelocity: { x: number, y: number } = { x: 0, y: 0 }
    private knockbackTimer: number = 0

    // ========== 生命周期 ==========
    
    start() {
        this.initReferences()
    }

    protected onDestroy() {
        this.cleanup()
    }

    private initReferences(): void {
        this.anim = this.getComponent(Animation)
        this.collider = this.getComponent(Collider2D)
        this.affixSystem = AffixSystem.getInstance()

        // 获取玩家目标
        const canvas = this.getService<Node>('canvasNode')
        this.target = canvas?.getChildByName('Player') || null

        // 注册碰撞事件
        if (this.collider) {
            this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }

        // 监听全局事件
        EventBus.on(EventNames.GAME_PAUSE, this.onPause, this)
        EventBus.on('player_reflect_damage', this.onReflectDamage, this)
    }

    private cleanup(): void {
        // 解绑碰撞事件
        if (this.collider) {
            this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }

        // 解绑全局事件
        EventBus.off(EventNames.GAME_PAUSE, this.onPause, this)
        EventBus.off('player_reflect_damage', this.onReflectDamage, this)

        // 清理减速定时器
        if (this.slowScheduleId !== null) {
            this.unschedule(this.slowScheduleId)
            this.slowScheduleId = null
        }

        // 清理引用
        this.target = null
        this.anim = null
        this.collider = null
        this.affixSystem = null
    }

    // ========== 事件回调 ==========

    private onPause(pause: boolean): void {
        this.isPaused = pause
        
        if (this.anim) {
            if (pause) {
                this.anim.pause()
            } else if (this.isMoving) {
                this.anim.resume()
            }
        }
    }

    private onReflectDamage(data: { damage: number }): void {
        if (!this.isDead && this.currentHealth > 0) {
            this.takeDamage(data.damage)
        }
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null): void {
        // 碰撞玩家
        if (otherCollider.node.name === 'Player') {
            let finalDamage = this.damage
            if (this.affixSystem && this.affixSystem.isLoaded()) {
                finalDamage = this.affixSystem.onHitPlayer(this, finalDamage)
            }
            EventBus.emit(EventNames.ENEMY_HIT_PLAYER, finalDamage)
        }

        // 碰撞攻击区域（玩家攻击判定）
        if (otherCollider.node.name === 'AttackArea') {
            const canvas = this.node.scene?.getChildByName('Canvas')
            const player = canvas?.getChildByName('Player')
            const playerController = player?.getComponent(PlayerController)
            
            if (playerController) {
                let damage = playerController.getAttack()
                if (this.affixSystem && this.affixSystem.isLoaded()) {
                    damage = this.affixSystem.onEnemyHit(this, damage)
                }
                this.takeDamage(damage)
            }
        }
    }

    // ========== 重置状态（对象池复用） ==========

    public reset(fromPool: boolean = false): void {
        this.isFromPool = fromPool
        this.isMinion = false
        this.isDead = false
        this.isMoving = false
        this.isPaused = false

        // 重置减速状态
        if (this.slowScheduleId !== null) {
            this.unschedule(this.slowScheduleId)
            this.slowScheduleId = null
        }
        this.isSlowed = false
        this.originalSpeedCache = 0

        // 重置击飞状态
        this.knockbackVelocity = { x: 0, y: 0 }
        this.knockbackTimer = 0

        // 重置基础属性
        this.speed = EnemyConfig.NORMAL_SPEED
        this.damage = EnemyConfig.NORMAL_DAMAGE
        this.maxHealth = EnemyConfig.NORMAL_HEALTH

        this.baseMaxHealth = this.maxHealth
        this.runtimeMaxHealth = this.maxHealth
        this._currentHealth = this.runtimeMaxHealth
        this.damageReduction = 0

        // 重置节点状态
        this.node.setPosition(0, 0, 0)
        this.node.setScale(1, 1, 1)

        if (this.collider) {
            this.collider.enabled = true
        }

        // 清除词条数据
        this.affixData = undefined

        if (this.affixSystem) {
            this.affixSystem.resetEnemyAffixRecord(this)
        }
    }

    public setAsMinion(healthPercent: number): void {
        this.isMinion = true
        this.runtimeMaxHealth = Math.floor(this.baseMaxHealth * healthPercent)
        this._currentHealth = this.runtimeMaxHealth
    }

    // ========== 伤害系统 ==========

    public takeDamage(damage: number): boolean {
        if (this.isDead) return false

        // 应用词条效果
        if (this.affixSystem && this.affixSystem.isLoaded()) {
            damage = this.affixSystem.onEnemyHit(this, damage)
        }

        damage = Math.ceil(damage)
        this._currentHealth -= damage

        if (this._currentHealth <= 0) {
            this.die()
            return true
        }
        return false
    }

    public die(): void {
        if (this.isDead) return

        // 阻止死亡检查（词条复活等效果）
        let preventDeath = false
        if (!this.isMinion && this.affixSystem && this.affixSystem.isLoaded()) {
            preventDeath = this.affixSystem.onEnemyDeath(this, this.node.worldPosition)
        }

        if (preventDeath) {
            return
        }

        // ✅ 触发击杀事件（供升级触发器使用）
        TriggerSystem.getInstance().triggerEvent('onKill', {
            target: this,
            position: this.node.worldPosition,
            enemyType: this.isMinion ? 'minion' : 'normal'
        });

        this.isDead = true
        EventBus.emit(EventNames.ENEMY_DIED, this.node.worldPosition, this)

        if (this.isFromPool) {
            const pool = ObjectPool.getInstance()
            pool.recycle(this.poolKey, this.node)
        } else {
            this.node.destroy()
        }
    }

    // ========== IAffixTarget 接口实现 ==========

    public getRuntimeMaxHealth(): number {
        return Math.floor(this.runtimeMaxHealth)
    }

    public getOriginalSpeed(): number {
        return this.originalSpeedCache > 0 ? this.originalSpeedCache : this.speed
    }

    public getOriginalDamage(): number {
        return this.damage
    }

    public setSpeed(newSpeed: number): void {
        this.speed = newSpeed
    }

    public setMaxHealth(value: number): void {
        this.runtimeMaxHealth = Math.floor(value)
        if (this._currentHealth > this.runtimeMaxHealth) {
            this._currentHealth = this.runtimeMaxHealth
        }
    }

    public setCurrentHealth(value: number): void {
        this._currentHealth = Math.max(0, Math.min(this.runtimeMaxHealth, Math.floor(value)))
    }

    public addDamageReduction(value: number): void {
        this.damageReduction += value
    }

    /**
     * 设置目标（用于嘲讽效果）
     */
    public setTarget(target: Node): void {
        this.target = target
    }

    // ========== 控制效果 ==========

    /**
     * 应用减速效果
     * @param percent 减速百分比 (0-1)
     * @param duration 持续时间（秒）
     */
    public applySlow(percent: number, duration: number): void {
        if (this.isDead) return

        // 清除已有的减速定时器
        if (this.slowScheduleId !== null) {
            this.unschedule(this.slowScheduleId)
            this.slowScheduleId = null
        }

        // 保存原始速度（只在第一次减速时保存）
        if (!this.isSlowed) {
            this.originalSpeedCache = this.speed
            this.isSlowed = true
        }

        // 计算新速度（取最慢的减速效果）
        const finalPercent = Math.min(0.9, percent)
        const newSpeed = this.originalSpeedCache * (1 - finalPercent)
        this.speed = Math.max(20, newSpeed)

        // 设置恢复定时器
        this.slowScheduleId = this.scheduleOnce(() => {
            if (this.isValid && !this.isDead) {
                this.speed = this.originalSpeedCache
                this.isSlowed = false
                this.slowScheduleId = null
            }
        }, duration)
    }

    /**
     * 应用击飞效果
     * @param forceX X方向力度
     * @param forceY Y方向力度
     */
    public applyKnockback(forceX: number, forceY: number): void {
        if (this.isDead) return
        this.knockbackVelocity = { x: forceX, y: forceY }
        this.knockbackTimer = 0.2
    }

    // ========== 动画 ==========

    private playMoveAnim(): void {
        if (this.isPaused || !this.anim) return
        
        const animState = this.anim.getState('enemy_move')
        if (animState && !animState.isPlaying) {
            this.anim.play('enemy_move')
        }
    }

    // ========== 更新逻辑 ==========

    update(deltaTime: number): void {
        if (this.isPaused || this.isDead) return
        if (!this.target) return

        // 速度下限保护
        if (this.speed < 20) {
            this.speed = 20
        }

        // 击飞优先处理
        if (this.knockbackTimer > 0) {
            this.updateKnockback(deltaTime)
            return
        }

        // 正常移动逻辑
        this.updateMovement(deltaTime)

        // 词条更新回调
        if (this.affixSystem && this.affixSystem.isLoaded()) {
            this.affixSystem.onEnemyUpdate(this, deltaTime)
        }
    }

    private updateKnockback(deltaTime: number): void {
        this.knockbackTimer -= deltaTime
        const newPos = this.node.worldPosition.clone()
        newPos.x += this.knockbackVelocity.x * deltaTime
        newPos.y += this.knockbackVelocity.y * deltaTime
        this.node.worldPosition = newPos

        if (this.knockbackTimer <= 0) {
            this.knockbackVelocity = { x: 0, y: 0 }
        }
    }

    private updateMovement(deltaTime: number): void {
        const enemyPos = this.node.worldPosition
        const targetPos = this.target!.worldPosition

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
    }
}