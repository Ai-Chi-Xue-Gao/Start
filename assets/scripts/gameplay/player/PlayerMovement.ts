// assets/scripts/gameplay/player/PlayerMovement.ts

import { _decorator, Node, Vec3 } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { Joystick } from '../../ui/widgets/Joystick';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { WorldConfig } from '../../configs/GameConfig';

const { ccclass, property } = _decorator;

/**
 * 玩家移动组件
 * 负责：摇杆控制、边界限制、移动逻辑
 */
@ccclass('PlayerMovement')
export class PlayerMovement extends BaseComponent {
    @property(Node)
    joystick: Node = null

    private joystickScript: Joystick = null
    private spriteNode: Node = null
    private leftBound: number = 0
    private rightBound: number = 0
    private bottomBound: number = 0
    private topBound: number = 0
    private isPaused: boolean = false
    private speedMultiplier: number = 1.0

    start() {
        this.joystickScript = this.joystick.getComponent(Joystick)
        this.spriteNode = this.node.getChildByName('Sprite')
        this.calculateBounds()

        EventBus.on(EventNames.GAME_PAUSE, this.onPause, this)
    }

    protected onDestroy() {
        EventBus.off(EventNames.GAME_PAUSE, this.onPause, this)
    }

    private onPause(pause: boolean) {
        this.isPaused = pause
        if (this.joystickScript) {
            this.joystickScript.enabled = !pause
        }
    }

    private calculateBounds() {
        this.leftBound = -WorldConfig.WIDTH / 2
        this.rightBound = WorldConfig.WIDTH / 2
        this.bottomBound = -WorldConfig.HEIGHT / 2
        this.topBound = WorldConfig.HEIGHT / 2
    }

    public setSpeedMultiplier(multiplier: number) {
        this.speedMultiplier = multiplier
    }

    public getSpeedMultiplier(): number {
        return this.speedMultiplier
    }

    public getDirection(): Vec3 {
        if (!this.joystickScript) return new Vec3(0, 0, 0)
        return this.joystickScript.getDirection()
    }

    public getIsMoving(): boolean {
        const direction = this.getDirection()
        return Math.abs(direction.x) > 0.1 || Math.abs(direction.y) > 0.1
    }

    public updateSpriteDirection(direction: Vec3) {
        if (!this.spriteNode) return
        if (direction.x < 0) {
            this.spriteNode.setScale(-1, 1, 1)
        } else if (direction.x > 0) {
            this.spriteNode.setScale(1, 1, 1)
        }
    }

    public updatePosition(deltaTime: number, baseSpeed: number): Vec3 {
        const direction = this.getDirection()
        const speed = baseSpeed * this.speedMultiplier

        let newX = this.node.position.x + direction.x * speed * deltaTime
        let newY = this.node.position.y + direction.y * speed * deltaTime

        newX = Math.max(this.leftBound, Math.min(this.rightBound, newX))
        newY = Math.max(this.bottomBound, Math.min(this.topBound, newY))

        this.node.setPosition(newX, newY, 0)
        return new Vec3(newX, newY, 0)
    }

    public isMoving(): boolean {
        return this.getIsMoving()
    }

    update(deltaTime: number) {
        if (this.isPaused) return
        // 移动逻辑在 PlayerController 的 update 中调用 updatePosition
    }
}