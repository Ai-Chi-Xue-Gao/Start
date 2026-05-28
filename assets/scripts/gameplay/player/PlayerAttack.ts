// assets/scripts/gameplay/player/PlayerAttack.ts

import { _decorator, Button, instantiate, Node, Prefab, Vec3 } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { PlayerAnim } from './PlayerAnim';
import { PlayerController } from './PlayerController';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { ObjectPool } from '../../utils/ObjectPool';
import { GenericProjectile } from '../projectile/GenericProjectile';
import { Enemy } from '../enemy/Enemy';

const { ccclass, property } = _decorator;

/**
 * 玩家攻击组件（简化版）
 * 负责：基础火球攻击
 */
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
        if (!this.canvasNode) {
            const scene = this.node.scene;
            this.canvasNode = scene?.getChildByName('Canvas');
        }

        const button = this.node.getComponent(Button)
        if (button) {
            button.node.on(Button.EventType.CLICK, this.onAttack, this)
        }

        EventBus.on(EventNames.GAME_PAUSE, this.onPause, this)
    }

    protected onDestroy(): void {
        EventBus.off(EventNames.GAME_PAUSE, this.onPause, this)
        
        const button = this.node.getComponent(Button)
        if (button && button.node) {
            button.node.off(Button.EventType.CLICK, this.onAttack, this)
        }
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

        // 寻找最近的敌人（用于确定发射方向）
        const nearestEnemy = this.findNearestEnemy()
        let direction: Vec3 = null

        if (nearestEnemy) {
            const enemyPos = nearestEnemy.worldPosition
            const playerPos = this.player.worldPosition
            direction = new Vec3()
            Vec3.subtract(direction, enemyPos, playerPos)
            direction.normalize()

            // 更新角色朝向
            const spriteNode = this.player.getChildByName('Sprite')
            if (enemyPos.x < playerPos.x) {
                spriteNode?.setScale(-1, 1, 1)
            } else {
                spriteNode?.setScale(1, 1, 1)
            }
        } else {
            // 没有敌人时，默认向右发射
            direction = new Vec3(1, 0, 0)
        }

        this.playerAnim.playAttack()
        this.spawnFireBall(direction)
    }

    /**
     * 发射火球
     */
    private spawnFireBall(direction: Vec3) {
        if (!this.fireBallPrefab) return

        const attackValue = this.playerController.getAttack()
        const canvas = this.canvasNode
        const pool = ObjectPool.getInstance()

        let fireball = pool.get('genericProjectile', canvas)

        if (!fireball) {
            fireball = instantiate(this.fireBallPrefab)
            canvas?.addChild(fireball)
        } else {
            fireball.active = true
        }

        const fireballScript = fireball.getComponent(GenericProjectile)
        if (fireballScript) {
            const dir = { x: direction.x, y: direction.y }
            fireballScript.init(
                attackValue, 'fire', 'base_attack',
                dir, 400, false, 0, 0, 0
            )
            fireballScript.setFromPool(true)
        }

        fireball.setWorldPosition(this.player.worldPosition)
    }

    /**
     * 查找最近的敌人
     */
    private findNearestEnemy(): Node | null {
        if (!this.canvasNode) return null

        let minDist = Infinity
        let nearest = null

        const waveManager = this.canvasNode.getChildByName('WaveManager')
        if (waveManager) {
            for (const child of waveManager.children) {
                const enemy = child.getComponent(Enemy)
                if (enemy && !enemy.isDead) {
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