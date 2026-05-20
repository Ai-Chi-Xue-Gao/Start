import { _decorator, Button, instantiate, Node, Prefab, Vec3 } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { PlayerAnim } from './PlayerAnim';
import { FireBall } from '../projectile/FireBall';
import { Enemy } from '../enemy/Enemy';
import { PlayerController } from './PlayerController';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { ObjectPool } from '../../utils/ObjectPool';
import { ServiceLocator } from '../../core/ServiceLocator';

const { ccclass, property } = _decorator;

@ccclass('PlayerAttack')
export class PlayerAttack extends BaseComponent {
    @property(Node)
    player: Node = null

    @property(Prefab)
    fireBallPrefab: Prefab = null

    @property
    attackCooldown: number = 0.8

    private playerAnim: PlayerAnim = null
    private lastAttackTime: number = 0
    private playerController: PlayerController = null
    private isPaused: boolean = false
    private canvasNode: Node = null

    start() {
        this.playerAnim = this.player.getComponent(PlayerAnim)
        this.playerController = this.player.getComponent(PlayerController)

        this.canvasNode = this.getService<Node>('canvasNode')

        const button = this.node.getComponent(Button)
        button.node.on(Button.EventType.CLICK, this.onAttack, this)

        EventBus.on(EventNames.GAME_PAUSE, this.onPause, this)
    }

    protected onDestroy(): void {
        EventBus.off(EventNames.GAME_PAUSE, this.onPause, this)
    }

    private onPause(pause: boolean) {
        this.isPaused = pause
    }

    private onAttack() {
        if (this.isPaused) return

        const cdReduction = this.playerController.getAttackCooldownReduction()
        const effectiveCooldown = Math.max(0.2, this.attackCooldown - cdReduction)

        const now = Date.now() / 1000
        if (now - this.lastAttackTime < effectiveCooldown) return
        this.lastAttackTime = now

        const nearestEnemy = this.findNearestEnemy()
        if (nearestEnemy) {
            const enemyPos = nearestEnemy.worldPosition
            const playerPos = this.player.worldPosition
            const spriteNode = this.player.getChildByName('Sprite')
            if (enemyPos.x < playerPos.x) {
                spriteNode?.setScale(-1, 1, 1)
            } else {
                spriteNode?.setScale(1, 1, 1)
            }
        }

        this.playerAnim.playAttack()
        this.spawnFireBall()
    }

    private spawnFireBall() {
        if (!this.fireBallPrefab) return

        const nearest = this.findNearestEnemy()
        if (!nearest) return

        const double = this.playerController.getHasDoubleFireball()
        const count = double ? 2 : 1
        const attackValue = this.playerController.getAttack()
        const canvas = this.canvasNode
        const pool = ObjectPool.getInstance()

        for (let i = 0; i < count; i++) {
            let fireball = pool.get('fireball', canvas)

            if (!fireball) {
                fireball = instantiate(this.fireBallPrefab)
                canvas?.addChild(fireball)
                const fireballScript = fireball.getComponent(FireBall)
                if (fireballScript) {
                    fireballScript.setFromPool(false)
                    fireballScript.init(nearest, attackValue)
                }
            } else {
                const fireballScript = fireball.getComponent(FireBall)
                if (fireballScript) {
                    fireballScript.reset()
                    fireballScript.setFromPool(true)
                    fireballScript.init(nearest, attackValue)
                }
            }

            const offsetX = (count === 2) ? (i === 0 ? -15 : 15) : 0
            fireball.setWorldPosition(this.player.worldPosition.x + offsetX, this.player.worldPosition.y, 0)
        }
    }

    private findNearestEnemy(): Node | null {
        if (!this.canvasNode) return null

        let minDist = Infinity
        let nearest = null

        const waveManager = this.canvasNode.getChildByName('WaveManager')
        if (waveManager) {
            for (const child of waveManager.children) {
                const enemyScript = child.getComponent(Enemy)
                if (child.isValid && enemyScript && !enemyScript.isDead) {
                    const dist = Vec3.distance(this.player.worldPosition, child.worldPosition)
                    if (dist < minDist) {
                        minDist = dist
                        nearest = child
                    }
                }
            }
        }

        for (const child of this.canvasNode.children) {
            if (child.name.startsWith('NetworkEnemy_') && child.isValid) {
                const networkEnemy = child.getComponent('NetworkEnemy') as any
                if (networkEnemy && !networkEnemy.isDead) {
                    const dist = Vec3.distance(this.player.worldPosition, child.worldPosition)
                    if (dist < minDist) {
                        minDist = dist
                        nearest = child
                    }
                }
            }
        }

        return nearest
    }
}