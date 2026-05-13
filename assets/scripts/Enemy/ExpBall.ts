import { _decorator, Collider, Collider2D, Component, Contact2DType, IPhysics2DContact, Node, Vec3 } from 'cc';
import { EventBus } from './EventBus';
import { PlayerController } from '../TypeScript/PlayerController';
const { ccclass, property } = _decorator;

@ccclass('ExpBall')
export class ExpBall extends Component {
    @property
    expValue: number = 10 // 经验值

    @property
    magnetSpeed: number = 200 // 向玩家移动的速度

    @property
    magnetRadius: number = 200 // 吸引距离，超出此范围不移动

    private target: Node = null
    private collider: Collider2D = null

    start() {
        // 找到玩家节点
        const canvas = this.node.scene.getChildByName('Canvas')
        this.target = canvas?.getChildByName('Player')

        if(this.target){
            const pc = this.target.getComponent(PlayerController)
            if(pc){
                this.magnetRadius = this.magnetRadius * pc.getMagnetRangeMultiplier()
            }
        }

        // 注册碰撞事件（与玩家碰撞）
        this.collider = this.getComponent(Collider2D)
        if(this.collider){
            this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }
    }

    protected onDestroy(): void {
        if(this.collider){
            this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact){
        if(otherCollider.node === this.target){
            // 触碰到玩家，给予经验值
            EventBus.emit('gain-exp', this.expValue)
            this.node.destroy() // 销毁经验球
        }
    }

    update(deltaTime: number) {
        if(!this.target) return

        // 计算与玩家的距离
        const myPos = this.node.worldPosition
        const targetPos = this.target.worldPosition

        const dir = new Vec3()
        Vec3.subtract(dir, targetPos, myPos)
        const distance = dir.length()

        // 如果在磁吸范围内，向玩家移动
        if(distance < this.magnetRadius && distance > 5){
            dir.normalize()
            const newPos = myPos.clone()
            newPos.x += dir.x * this.magnetSpeed * deltaTime
            newPos.y += dir.y * this.magnetSpeed * deltaTime
            this.node.worldPosition = newPos
        }
    }
}


