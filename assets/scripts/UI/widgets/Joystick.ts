import { _decorator, Component, EventTouch, Input, input, Node, UITransform, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Joystick')
export class Joystick extends Component {
    @property(Node) // 获取Handle节点（摇杆）
    Handle: Node = null

    @property(Node) // 获取Background节点（摇杆底座）
    BackGround: Node = null

    private center: Vec3 = new Vec3()
    private maxRadius: number = 0
    

    protected onLoad(): void {
        // 1.记录摇杆的坐标
        this.center.set(this.node.worldPosition)

        // 2.注册触摸事件
        input.on(Input.EventType.TOUCH_START,this.onTouchStart, this)
        input.on(Input.EventType.TOUCH_MOVE,this.onTouchMove, this)
        input.on(Input.EventType.TOUCH_END,this.onTouchEnd, this)

        // 动态获取底座半径
        const uiTransform = this.BackGround.getComponent(UITransform)
        const width = uiTransform.contentSize.width
        this.maxRadius = width / 2 - 10
        
    }

    // 释放触摸事件监听
    protected onDestroy(): void {
        input.off(Input.EventType.TOUCH_START,this.onTouchStart, this)
        input.off(Input.EventType.TOUCH_MOVE,this.onTouchMove, this)
        input.off(Input.EventType.TOUCH_END,this.onTouchEnd, this)

    }

    private onTouchStart(event: EventTouch){
        const offset = this.getOffsetFromEvent(event)
    }

    private onTouchMove(event: EventTouch){
        const offset = this.getOffsetFromEvent(event)

        this.Handle.setPosition(offset.x, offset.y, 0)
    }

    private onTouchEnd(event: EventTouch){
        // 手柄复位
        this.Handle.setPosition(0, 0, 0)
    }

    private getOffsetFromEvent(event: EventTouch): Vec3{
        const touchPos = event.getUILocation(); // 获取手指触摸的坐标
        const fingerPos = new Vec3(touchPos.x, touchPos.y, 0) // 将2D坐标转换成3D坐标
        const offset = new Vec3();
        Vec3.subtract(offset, fingerPos, this.center) // 计算偏移量

        // 限制最大半径
        const distance = offset.length()
        if(distance > this.maxRadius){
            offset.multiplyScalar(this.maxRadius / distance)
        }

        return offset
    }

    // ===对外接口===

    // 获取归一化方向
    public getDirection(): Vec3{
        const handlePos = this.Handle.position
        const direction = new Vec3()

        // 除以最大半径，得到-1到1之间的值
        direction.x = handlePos.x / this.maxRadius
        direction.y = handlePos.y / this.maxRadius

        return direction
    }

    // 获取原始偏移量
    public getOffset(): Vec3{
        return this.Handle.position.clone();
    }

    // 获取摇杆力度（0,1）
    public getMagnitude(): number{
        const handlePos = this.Handle.position
        const distance = Math.sqrt(handlePos.x * handlePos.x + handlePos.y * handlePos.y)

        return Math.min(distance / this.maxRadius, 1)
    }

    start() {

    }

    update(deltaTime: number) {
        
    }
}


