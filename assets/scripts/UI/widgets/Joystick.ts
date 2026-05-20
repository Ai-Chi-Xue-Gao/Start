// assets/scripts/ui/Joystick.ts

import { _decorator, EventTouch, Input, input, Node, UITransform, Vec3 } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';

const { ccclass, property } = _decorator;

@ccclass('Joystick')
export class Joystick extends BaseComponent {
    @property(Node)
    Handle: Node = null

    @property(Node)
    BackGround: Node = null

    private center: Vec3 = new Vec3()
    private maxRadius: number = 0

    protected onLoad(): void {
        this.center.set(this.node.worldPosition)

        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this)
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this)
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this)

        const uiTransform = this.BackGround.getComponent(UITransform)
        const width = uiTransform.contentSize.width
        this.maxRadius = width / 2 - 10
    }

    protected onDestroy(): void {
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this)
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this)
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this)
    }

    private onTouchStart(event: EventTouch) {
        const offset = this.getOffsetFromEvent(event)
        this.Handle.setPosition(offset.x, offset.y, 0)
    }

    private onTouchMove(event: EventTouch) {
        const offset = this.getOffsetFromEvent(event)
        this.Handle.setPosition(offset.x, offset.y, 0)
    }

    private onTouchEnd(event: EventTouch) {
        this.Handle.setPosition(0, 0, 0)
    }

    private getOffsetFromEvent(event: EventTouch): Vec3 {
        const touchPos = event.getUILocation()
        const fingerPos = new Vec3(touchPos.x, touchPos.y, 0)
        const offset = new Vec3()
        Vec3.subtract(offset, fingerPos, this.center)

        const distance = offset.length()
        if (distance > this.maxRadius) {
            offset.multiplyScalar(this.maxRadius / distance)
        }

        return offset
    }

    // ========== 对外接口 ==========

    public getDirection(): Vec3 {
        const handlePos = this.Handle.position
        const direction = new Vec3()

        direction.x = handlePos.x / this.maxRadius
        direction.y = handlePos.y / this.maxRadius

        return direction
    }

    public getOffset(): Vec3 {
        return this.Handle.position.clone()
    }

    public getMagnitude(): number {
        const handlePos = this.Handle.position
        const distance = Math.sqrt(handlePos.x * handlePos.x + handlePos.y * handlePos.y)
        return Math.min(distance / this.maxRadius, 1)
    }
}