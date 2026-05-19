import { _decorator, Component, Node, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraController')
export class CameraController extends Component {
    @property(Node)
    target: Node = null // 要跟随的目标

    @property
    smoothSpeed: number = 8 // 跟随平滑度

    @property
    offsetX: number = 0 // x 轴偏移

    @property
    offsetY: number = 0 // Y 轴偏移

    @property
    limitToWorld: boolean = true // 是否限制摄像机不超出世界边界

    @property
    worldWidth: number = 3000 // 世界宽度

    @property
    worldHeight: number = 2000 // 世界高度

    start() {
        if(!this.target){
            console.warn('CameraController: 没有设置跟随目标！')
        }
    }

    // 获取当前屏幕半宽
    private getViewHalfWidth(): number {
        const canvas = this.node.scene?.getChildByName('Canvas')
        const uiTransform = canvas?.getComponent(UITransform)
        if(uiTransform){
            return uiTransform.contentSize.width / 2
        }
        return 0
    }

    // 获取当前屏幕半高
    private getViewHalfHeight(): number{
        const canvas = this.node.scene?.getChildByName('Canvas')
        const uiTransform = canvas?.getComponent(UITransform)
        if(uiTransform){
            return uiTransform.contentSize.height / 2
        }
        return 0
    }

    // 立即移动到目标位置（用于场景切换重置）
    public snapToTarget(){
        if(!this.target) return
        const targetPos = this.target.position
        this.node.setPosition(targetPos.x + this.offsetX, targetPos.y + this.offsetY, this.node.position.z)
    }

    update(deltaTime: number) {
        if(!this.target) return

        const targetPos = this.target.position
        let targetX = targetPos.x + this.offsetX
        let targetY = targetPos.y + this.offsetY

        // 限制摄像机不超出世界边界
        if(this.limitToWorld){
            const worldHalfWidth = this.worldWidth / 2
            const worldHalfHeight = this.worldHeight / 2

            // 动态获取当前屏幕尺寸
            const viewHalfWidth = this.getViewHalfWidth()
            const viewHalfHeight = this.getViewHalfHeight()

            // 计算摄像机允许移动的范围
            const minX = -worldHalfWidth + viewHalfWidth
            const maxX = worldHalfWidth - viewHalfWidth
            const minY = -worldHalfHeight + viewHalfHeight
            const maxY = worldHalfHeight - viewHalfHeight

            targetX = Math.max(minX, Math.min(maxX, targetX))
            targetY = Math.max(minY, Math.min(maxY, targetY))
        }

        // 平滑跟随
        const currentPos = this.node.position
        const t = Math.min(1, this.smoothSpeed * deltaTime)
        const newX = currentPos.x + (targetX - currentPos.x) * t;
        const newY = currentPos.y + (targetY - currentPos.y) * t;

        // 设置摄像机位置（z轴保持不变）
        this.node.setPosition(newX, newY, currentPos.z)
    }
}


