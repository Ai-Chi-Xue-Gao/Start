// assets/scripts/gameplay/player/PlayerMovement.ts

import { _decorator, Node, Vec3 } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { Joystick } from '../../ui/widgets/Joystick';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';
import { WorldConfig } from '../../configs/GameConfig';
import { ObjectPool } from '../../utils/ObjectPool';
import { SkillManager } from '../../Managers/SkillManager';
import { WaterTrail } from '../projectile/WaterTrail';

const { ccclass, property } = _decorator;

/**
 * 玩家移动组件
 * 负责：摇杆控制、边界限制、移动逻辑、水痕特效
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

    // 水痕特效相关
    private hasWaterTrail: boolean = false
    private waterTrailSlowPercent: number = 0.5 // 水痕减速百分比
    private waterTrailDuration: number = 3.0 // 水痕持续时间
    private waterTrailTimer: number = 0
    private trailInterval: number = 0.25      // 每0.25秒生成一个水痕
    private currentWaterTrailLevel: number = 0 // 当前水痕技能等级

    start() {
        this.joystickScript = this.joystick.getComponent(Joystick)
        this.spriteNode = this.node.getChildByName('Sprite')
        this.calculateBounds()

        EventBus.on(EventNames.GAME_PAUSE, this.onPause, this)

        // 初始化水痕技能状态
        this.updateWaterTrailStatus()

        EventBus.on(EventNames.SKILL_SELECTED, this.onSkillSelected, this)
    }

    private onSkillSelected(data: { skillId: string, level: number }) {
        if (data.skillId === 'water_trail') {
            this.updateWaterTrailStatus()
        }
    }

    protected onDestroy() {
        EventBus.off(EventNames.GAME_PAUSE, this.onPause, this)
        EventBus.off(EventNames.SKILL_SELECTED, this.onSkillSelected, this)
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

    // ========== 水痕特效相关方法 ==========

    /**
     * 更新水痕技能状态（在技能学习/升级时调用）
     */
    public updateWaterTrailStatus() {
        const skillManager = SkillManager.getInstance()

        if (skillManager && skillManager.hasSkill('water_trail')) {
            const level = skillManager.getSkillLevel('water_trail')
            this.currentWaterTrailLevel = level
            this.hasWaterTrail = true

            // 根据技能等级获取减速效果和水痕持续时间
            const stats = skillManager.getSkillStat('water_trail', level)
            if (stats) {
                if (stats.slowPercent) {
                    this.waterTrailSlowPercent = stats.slowPercent
                }
                if (stats.duration) {
                    this.waterTrailDuration = stats.duration  //  获取持续时间
                }
            }

            console.log(`[PlayerMovement] 水痕技能已激活，等级 ${level}，减速 ${this.waterTrailSlowPercent * 100}%，持续 ${this.waterTrailDuration}秒`)
        } else {
            this.hasWaterTrail = false
            this.currentWaterTrailLevel = 0
            this.waterTrailSlowPercent = 0.5
            this.waterTrailDuration = 3.0
        }
    }

    /**
     * 生成水痕特效
     */
    private spawnWaterTrail() {
        if (!this.hasWaterTrail) return

        const canvas = this.node.parent
        const backgroundNode = canvas?.getChildByName('Background')

        if (!backgroundNode) {
            console.warn('[PlayerMovement] Background 节点不存在，使用 canvas 作为父节点')
            const pool = ObjectPool.getInstance()
            let trail = pool.get('waterTrail', canvas)
            if (trail) {
                const pos = this.node.worldPosition.clone()
                pos.y -= 20
                trail.setWorldPosition(pos)
                //  设置到最底层
                trail.setSiblingIndex(0)
                const trailScript = trail.getComponent(WaterTrail)
                if (trailScript) {
                    trailScript.setParams(this.waterTrailSlowPercent, this.waterTrailDuration)
                }
            }
            return
        }

        const pool = ObjectPool.getInstance()
        let trail = pool.get('waterTrail', backgroundNode)

        if (trail) {
            const pos = this.node.worldPosition.clone()
            pos.y -= 20
            trail.setWorldPosition(pos)

            // 设置到最底层
            trail.setSiblingIndex(0)

            const trailScript = trail.getComponent(WaterTrail)
            if (trailScript) {
                trailScript.setParams(this.waterTrailSlowPercent, this.waterTrailDuration)
            }
        }
    }

    /**
     * 获取水痕技能状态
     */
    public hasWaterTrailSkill(): boolean {
        return this.hasWaterTrail
    }

    /**
     * 获取水痕减速百分比
     */
    public getWaterTrailSlowPercent(): number {
        return this.waterTrailSlowPercent
    }

    update(deltaTime: number) {
        if (this.isPaused) return

        const isMoving = this.getIsMoving()

        // 水痕特效生成（移动时）
        if (this.hasWaterTrail && isMoving) {
            this.waterTrailTimer += deltaTime
            if (this.waterTrailTimer >= this.trailInterval) {
                this.waterTrailTimer = 0
                this.spawnWaterTrail()
            }
        } else {
            // 不移动时重置计时器
            this.waterTrailTimer = 0
        }
    }
}