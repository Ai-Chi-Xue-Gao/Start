// assets/scripts/gameplay/enemy/ExpBall.ts

import { _decorator, Collider2D, Component, Contact2DType, IPhysics2DContact, Node, Vec3 } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { EventBus } from '../../core/EventBus';
import { PlayerController } from '../player/PlayerController';
import { EventNames } from '../../utils/EventNames';
import { ObjectPool } from '../../utils/ObjectPool';
import { ExpBallConfig } from '../../configs/GameConfig';
import { ServiceLocator } from '../../core/ServiceLocator';

const { ccclass, property } = _decorator;

@ccclass('ExpBall')
export class ExpBall extends BaseComponent {
    @property
    expValue: number = ExpBallConfig.BASE_VALUE

    @property
    magnetSpeed: number = ExpBallConfig.MAGNET_SPEED

    @property
    magnetRadius: number = ExpBallConfig.BASE_MAGNET_RADIUS

    private target: Node = null
    private collider: Collider2D = null
    private poolKey: string = 'expBall'
    private isFromPool: boolean = false

    start() {
        const canvas = this.getService<Node>('canvasNode')
        this.target = canvas?.getChildByName('Player')

        this.collider = this.getComponent(Collider2D)
        if (this.collider) {
            this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }
    }

    protected onDestroy(): void {
        if (this.collider) {
            this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }
    }

    private getCurrentMagnetRadius(): number {
        if (!this.target) return this.magnetRadius

        const pc = this.target.getComponent(PlayerController)
        if (!pc) return this.magnetRadius

        return this.magnetRadius * pc.getMagnetRangeMultiplier()
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact) {
        if (otherCollider.node === this.target) {
            EventBus.emit(EventNames.GAIN_EXP, this.expValue)
            this.recycleToPool()
        }
    }

    public setFromPool(fromPool: boolean) {
        this.isFromPool = fromPool
    }

    public reset() {
        this.expValue = ExpBallConfig.BASE_VALUE
        this.magnetSpeed = ExpBallConfig.MAGNET_SPEED
        this.magnetRadius = ExpBallConfig.BASE_MAGNET_RADIUS
        this.node.setPosition(0, 0, 0)
        this.node.setScale(1, 1, 1)
        if (this.collider) {
            this.collider.enabled = true
        }
    }

    private recycleToPool() {
        if (this.isFromPool) {
            const pool = ObjectPool.getInstance()
            pool.recycle(this.poolKey, this.node)
        } else {
            this.node.destroy()
        }
    }

    update(deltaTime: number) {
        if (!this.target) return

        const myPos = this.node.worldPosition
        const targetPos = this.target.worldPosition

        const dir = new Vec3()
        Vec3.subtract(dir, targetPos, myPos)
        const distance = dir.length()

        const currentMagnetRadius = this.getCurrentMagnetRadius()

        if (distance < currentMagnetRadius && distance > 5) {
            dir.normalize()
            const newPos = myPos.clone()
            newPos.x += dir.x * this.magnetSpeed * deltaTime
            newPos.y += dir.y * this.magnetSpeed * deltaTime
            this.node.worldPosition = newPos
        }
    }
}