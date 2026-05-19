import { _decorator, Collider, Collider2D, Component, Contact2DType, IPhysics2DContact, Node, Vec3 } from 'cc';
import { EventBus } from '../../core/EventBus';
import { PlayerController } from '../../entities/player/PlayerController';
import { EventNames } from '../../utils/EventNames';
import { ObjectPool } from '../../utils/ObjectPool';
import { GameConstants } from '../../utils/GameConstants';

const { ccclass, property } = _decorator;

@ccclass('ExpBall')
export class ExpBall extends Component {
    @property
    expValue: number = GameConstants.EXP_BALL_BASE_VALUE // 经验值

    @property
    magnetSpeed: number = GameConstants.EXP_BALL_MAGNET_SPEED // 向玩家移动的速度

    @property
    magnetRadius: number = GameConstants.EXP_BALL_BASE_MAGNET_RADIUS // 吸引距离，超出此范围不移动

    private target: Node = null
    private collider: Collider2D = null
    private poolKey: string = 'expBall'
    private isFromPool: boolean = false

    start() {
        // 找到玩家节点
        const canvas = this.node.scene.getChildByName('Canvas')
        this.target = canvas?.getChildByName('Player')

        // 注册碰撞事件（与玩家碰撞）
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

    // 获取当前有效的磁吸半径
    private getCurrentMagnetRadius(): number {
        if (!this.target) return this.magnetRadius

        const pc = this.target.getComponent(PlayerController)
        if (!pc) return this.magnetRadius

        return this.magnetRadius * pc.getMagnetRangeMultiplier()
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact) {
        if (otherCollider.node === this.target) {
            EventBus.emit(EventNames.GAIN_EXP, this.expValue)
            this.recycleToPool()  // 改用这个方法
        }
    }

    public setFromPool(fromPool: boolean) {
        this.isFromPool = fromPool
    }

    public reset() {
        // 重置经验球状态
        this.expValue = GameConstants.EXP_BALL_BASE_VALUE
        this.magnetSpeed = GameConstants.EXP_BALL_MAGNET_SPEED
        this.magnetRadius = GameConstants.EXP_BALL_BASE_MAGNET_RADIUS
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

        // 计算与玩家的距离
        const myPos = this.node.worldPosition
        const targetPos = this.target.worldPosition

        const dir = new Vec3()
        Vec3.subtract(dir, targetPos, myPos)
        const distance = dir.length()

        // 动态获取当前磁吸半径
        const currentMagnetRadius = this.getCurrentMagnetRadius()

        // 如果在磁吸范围内，向玩家移动
        if (distance < currentMagnetRadius && distance > 5) {
            dir.normalize()
            const newPos = myPos.clone()
            newPos.x += dir.x * this.magnetSpeed * deltaTime
            newPos.y += dir.y * this.magnetSpeed * deltaTime
            this.node.worldPosition = newPos
        }
    }
}


