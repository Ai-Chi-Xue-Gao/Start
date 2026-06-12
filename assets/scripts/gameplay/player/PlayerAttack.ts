// assets/scripts/gameplay/player/PlayerAttack.ts

import { _decorator, instantiate, Node, Prefab, Vec3 } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { PlayerAnim } from './PlayerAnim';
import { PlayerController } from './PlayerController';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { GenericProjectile } from '../projectile/GenericProjectile';
import { Enemy } from '../enemy/Enemy';
import { SkillConfig } from '../../configs/GameConfig';

const { ccclass, property } = _decorator;

@ccclass('PlayerAttack')
export class PlayerAttack extends BaseComponent {
    @property(Node)
    player: Node = null

    @property(Prefab)
    fireBallPrefab: Prefab = null

    @property
    attackCooldown: number = 0.8

    private attackRange: number = SkillConfig.AUTO_ATTACK_RANGE;
    private playerAnim: PlayerAnim = null
    private attackTimer: number = 0
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

        EventBus.on(EventNames.GAME_PAUSE, this.onPause, this)
    }

    protected onDestroy(): void {
        EventBus.off(EventNames.GAME_PAUSE, this.onPause, this)
    }

    private onPause(pause: boolean) {
        this.isPaused = pause
    }

    private performAttack() {
        const nearestEnemy = this.findNearestEnemyInRange()
        if (!nearestEnemy) return

        const enemyPos = nearestEnemy.worldPosition
        const playerPos = this.player.worldPosition
        
        let direction = new Vec3()
        Vec3.subtract(direction, enemyPos, playerPos)
        
        if (direction.length() < 20) return
        direction.normalize()

        const spriteNode = this.player.getChildByName('Sprite')
        if (spriteNode) {
            if (enemyPos.x < playerPos.x) {
                spriteNode.setScale(-1, 1, 1)
            } else {
                spriteNode.setScale(1, 1, 1)
            }
        }

        this.playerAnim.playAttack()
        this.spawnFireBall(direction)
    }

    private spawnFireBall(direction: Vec3) {
        if (!this.fireBallPrefab) return

        const attackValue = this.playerController.getAttack()
        const canvas = this.canvasNode

        const fireball = instantiate(this.fireBallPrefab)
        canvas?.addChild(fireball)

        const fireballScript = fireball.getComponent(GenericProjectile)
        if (fireballScript) {
            const dir = { x: direction.x, y: direction.y }
            fireballScript.init(
                attackValue, 'fire', 'base_attack',
                dir, SkillConfig.DEFAULT_PROJECTILE_SPEED, false, 0, 0, 0
            )
            fireballScript.setFromPool(false)
        }

        fireball.setWorldPosition(this.player.worldPosition)
    }

    private findNearestEnemyInRange(): Node | null {
        if (!this.canvasNode) return null

        let minDist = Infinity
        let nearest = null
        const maxRange = this.attackRange;

        const waveManager = this.canvasNode.getChildByName('WaveManager')
        if (waveManager) {
            const playerPos = this.player.worldPosition
            
            for (const child of waveManager.children) {
                const enemy = child.getComponent(Enemy)
                if (enemy && !enemy.isDead) {
                    const dist = Vec3.distance(playerPos, child.worldPosition)
                    if (dist < minDist && dist <= maxRange) {
                        minDist = dist
                        nearest = child
                    }
                }
            }
        }

        return nearest
    }

    public getAttackRange(): number {
        return this.attackRange
    }

    public setAttackRange(range: number): void {
        this.attackRange = range
    }

    update(deltaTime: number) {
        if (this.isPaused) return
        
        if (this.attackTimer > 0) {
            this.attackTimer -= deltaTime
        } else {
            const cooldownReduction = this.playerController.getAttackCooldownReduction()
            const actualCooldown = Math.max(0.2, this.attackCooldown - cooldownReduction)
            
            this.performAttack()
            this.attackTimer = actualCooldown
        }
    }
}