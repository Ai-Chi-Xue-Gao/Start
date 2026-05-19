import { _decorator, Button, Component, instantiate, Node, Prefab, Vec3 } from 'cc';
import { PlayerAnim } from './PlayerAnim';
import { FireBall } from '../projectile/FireBall';
import { Enemy } from '../../entities/enemy/Enemy';
import { PlayerController } from './PlayerController';
import { EventBus } from '../../core/EventBus';
import { NetworkEnemy } from '../../network/NetworkEnemy';
import { EventNames } from '../../utils/EventNames';
import { ObjectPool } from '../../utils/ObjectPool';
const { ccclass, property } = _decorator;

@ccclass('PlayerAttack')
export class PlayerAttack extends Component {
    @property(Node)
    player: Node = null // 拖入人物节点

    @property(Prefab)
    fireBallPrefab: Prefab = null   // 拖入火球预制体

    @property
    attackCooldown: number = 0.8    // 攻击冷却时间

    private playerAnim: PlayerAnim = null
    private lastAttackTime: number = 0
    private playerController: PlayerController = null
    private isPaused: boolean = false // 游戏停止标志

    start() {
        this.playerAnim = this.player.getComponent(PlayerAnim)
        this.playerController = this.player.getComponent(PlayerController)


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

        // 获取玩家的冷却缩减
        const cdReduction = this.playerController.getAttackCooldownReduction()
        const effectiveCooldown = Math.max(0.2, this.attackCooldown - cdReduction)

        // 冷却检查
        const now = Date.now() / 1000
        if (now - this.lastAttackTime < effectiveCooldown) return
        this.lastAttackTime = now

        // 攻击时面向最近的敌人
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

        // 播放攻击动画
        this.playerAnim.playAttack()

        // 生成火球
        this.spawnFireBall()
    }

    private spawnFireBall() {
        if (!this.fireBallPrefab) return

        const nearest = this.findNearestEnemy()
        if (!nearest) return

        const double = this.playerController.getHasDoubleFireball()
        const count = double ? 2 : 1
        const attackValue = this.playerController.getAttack()
        const canvas = this.player.scene.getChildByName('Canvas')
        const pool = ObjectPool.getInstance()

        for (let i = 0; i < count; i++) {
            // 从对象池获取火球
            let fireball = pool.get('fireball', canvas)

            if (!fireball) {
                // 池中无可用，动态创建
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

            // 添加小偏移量避免完全重叠
            const offsetX = (count === 2) ? (i === 0 ? -15 : 15) : 0
            fireball.setWorldPosition(this.player.worldPosition.x + offsetX, this.player.worldPosition.y, 0)
        }
    }

    private findNearestEnemy(): Node | null {
        const canvas = this.player.scene.getChildByName('Canvas')
        if (!canvas) return null

        let minDist = Infinity
        let nearest = null

        // 1. 查找 WaveManager 下的敌人（单机模式）
        const waveManager = canvas.getChildByName('WaveManager')
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

        // 2. 查找网络敌人（联机模式）
        for (const child of canvas.children) {
            if (child.name.startsWith('NetworkEnemy_') && child.isValid) {
                const networkEnemy = child.getComponent(NetworkEnemy)
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


