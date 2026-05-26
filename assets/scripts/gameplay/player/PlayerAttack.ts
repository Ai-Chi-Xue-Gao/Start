// assets/scripts/gameplay/player/PlayerAttack.ts

import { _decorator, Button, instantiate, Node, Prefab, Vec3 } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { PlayerAnim } from './PlayerAnim';
import { FireBall } from '../projectile/FireBall';
import { Enemy } from '../enemy/Enemy';
import { PlayerController } from './PlayerController';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { ObjectPool } from '../../utils/ObjectPool';

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
        this.spawnFireBalls(direction)
    }

    /**
     * 发射多颗火球（支持任意数量）
     * @param direction 基准发射方向
     */
    private spawnFireBalls(direction: Vec3) {
        if (!this.fireBallPrefab) return

        //  使用 getFireballCount() 获取火球数量
        const count = this.playerController.getFireballCount()
        const attackValue = this.playerController.getAttack()
        const canvas = this.canvasNode
        const pool = ObjectPool.getInstance()

        // 根据火球数量计算角度偏移和位置偏移
        const angles = this.getAnglesForCount(count)
        const positionOffsets = this.getPositionOffsetsForCount(count)

        console.log(`[PlayerAttack] 发射火球: count=${count}`);

        for (let i = 0; i < count; i++) {
            let fireball = pool.get('fireball', canvas)

            // 计算带偏移的方向
            let fireDirection = direction.clone()
            if (angles[i] !== 0) {
                const rad = angles[i] * Math.PI / 180
                const cos = Math.cos(rad)
                const sin = Math.sin(rad)
                const x = direction.x * cos - direction.y * sin
                const y = direction.x * sin + direction.y * cos
                fireDirection = new Vec3(x, y, 0).normalize()
            }

            if (!fireball) {
                fireball = instantiate(this.fireBallPrefab)
                canvas?.addChild(fireball)
                const fireballScript = fireball.getComponent(FireBall)
                if (fireballScript) {
                    fireballScript.setFromPool(false)
                    fireballScript.initWithDirection(fireDirection, attackValue)
                }
            } else {
                const fireballScript = fireball.getComponent(FireBall)
                if (fireballScript) {
                    fireballScript.reset()
                    fireballScript.setFromPool(true)
                    fireballScript.initWithDirection(fireDirection, attackValue)
                }
            }

            // 设置位置偏移
            const offsetX = positionOffsets[i]
            fireball.setWorldPosition(
                this.player.worldPosition.x + offsetX,
                this.player.worldPosition.y,
                0
            )
        }
    }

    /**
     * 根据火球数量获取角度偏移数组（度）
     */
    private getAnglesForCount(count: number): number[] {
        const angles: number[] = []

        switch (count) {
            case 1:
                angles.push(0)
                break
            case 2:
                angles.push(-5, 5)
                break
            case 3:
                angles.push(-8, 0, 8)
                break
            case 4:
                angles.push(-10, -3, 3, 10)
                break
            case 5:
                angles.push(-12, -6, 0, 6, 12)
                break
            default:
                for (let i = 0; i < count; i++) {
                    const angle = -15 + (i * 30 / (count - 1))
                    angles.push(angle)
                }
                break
        }

        return angles
    }

    /**
     * 根据火球数量获取位置偏移数组（像素）
     * 减小偏移量，提高命中率
     */
    private getPositionOffsetsForCount(count: number): number[] {
        const offsets: number[] = []

        switch (count) {
            case 1:
                offsets.push(0)
                break
            case 2:
                offsets.push(-8, 8)
                break
            case 3:
                offsets.push(-10, 0, 10)
                break
            case 4:
                offsets.push(-12, -4, 4, 12)
                break
            case 5:
                offsets.push(-15, -8, 0, 8, 15)
                break
            default:
                for (let i = 0; i < count; i++) {
                    const offset = -15 + (i * 30 / (count - 1))
                    offsets.push(Math.round(offset))
                }
                break
        }

        return offsets
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

        // 联机模式：查找网络敌人
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