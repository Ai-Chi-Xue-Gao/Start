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
        this.affixSystem = AffixSystem.getInstance()
    }

    protected onDestroy(): void {
        if (this.collider) {
            this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }
        EventBus.off(EventNames.GAME_PAUSE, this.onPause, this)
    }

    public reset(fromPool: boolean = false) {
        this.isFromPool = fromPool
        this.isMinion = false
        this.isDead = false
        this.isMoving = false
        this.isPaused = false

        this.baseMaxHealth = this.maxHealth
        this.runtimeMaxHealth = this.maxHealth
        this.currentHealth = this.runtimeMaxHealth

        this.node.setPosition(0, 0, 0)
        this.node.setScale(1, 1, 1)

        if (this.collider) {
            this.collider.enabled = true
        }

        if ((this as any).__affixData) {
            (this as any).__affixData = null
        }
    }

    public setAsMinion(healthPercent: number) {
        this.isMinion = true
        this.runtimeMaxHealth = this.baseMaxHealth * healthPercent
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

    public takeDamage(damage: number): boolean {
        if (this.isDead) return false

        if (this.affixSystem && this.affixSystem.isLoaded()) {
            damage = this.affixSystem.onEnemyHit(this, damage)
        }

        this.currentHealth -= damage
        console.log(`敌人受到${damage}伤害, 剩余血量：${this.currentHealth}/${this.runtimeMaxHealth}`)

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