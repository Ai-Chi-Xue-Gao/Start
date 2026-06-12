import { _decorator, Collider, Collider2D, Color, Contact2DType, IPhysics2DContact, Node, Sprite } from 'cc';
import { EventBus } from '../core/EventBus';
import { EventNames } from '../utils/EventNames';
import { BaseComponent } from '../core/BaseComponent';
const { ccclass, property } = _decorator;

@ccclass('NetworkEnemy')
export class NetworkEnemy extends BaseComponent {
    public enemyId: string = ''
    private targetX: number = 0
    private targetY: number = 0
    private smoothSpeed: number = 0.3
    private enemyType: 'normal' | 'elite' | 'boss' = 'normal' // 敌人类型
    private damage: number = 10 // 碰撞伤害
    private collider: Collider2D = null // 碰撞组件
    public isDead: boolean = false

    start() {
        // 注册碰撞事件
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

    // 碰撞回调
    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        // 碰到玩家时造成伤害
        if (otherCollider.node.name === 'Player') {
            EventBus.emit(EventNames.ENEMY_HIT_PLAYER, this.damage)
        }
    }

    // 敌人颜色配置
    private readonly typeColors: Record<'normal' | 'elite' | 'boss', Color> = {
        normal: new Color(255, 255, 255, 255),
        elite: new Color(51, 51, 51, 255),
        boss: new Color(255, 215, 0, 255)
    }

    // 敌人缩放配置
    private readonly typeScales: Record<'normal' | 'elite' | 'boss', number> = {
        normal: 1.0,
        elite: 1.3,
        boss: 2.0
    }

    // 敌人伤害配置
    private readonly typeDamages: Record<'normal' | 'elite' | 'boss', number> = {
        normal: 10,
        elite: 20,
        boss: 200
    }

    /**
     * 初始化网络敌人
     * @param id     敌人的唯一ID
     * @param x      初始 X 坐标
     * @param y      初始 Y 坐标
     */
    public init(id: string, x: number, y: number, type: 'normal' | 'elite' | 'boss' = 'normal') {
        this.enemyId = id
        this.targetX = x
        this.targetY = y
        this.enemyType = type
        this.damage = this.typeDamages[type]
        this.node.setPosition(x, y, 0)
        this.applyTypeStyle()
    }

    // 根据类型设置颜色和大小
    private applyTypeStyle() {
        const sprite = this.getComponent(Sprite)
        if (sprite) {
            sprite.color = this.typeColors[this.enemyType] || this.typeColors.normal
        }
        const scale = this.typeScales[this.enemyType] || 1.0
        this.node.setScale(scale, scale, 1)
    }

    /**
     * 更新敌人位置（由网络消息触发）
     * @param x 新的 X 坐标
     * @param y 新的 Y 坐标
     */
    public updatePosition(x: number, y: number) {
        this.targetX = x
        this.targetY = y
    }

    public die() {
        if (this.isDead) return
        this.isDead = true
        this.node.destroy()
    }

    /**
    * 受到伤害（网络敌人由服务端同步状态，客户端不直接扣血）
    * 但为了兼容 IDamageable 接口，保留此方法
    */
    public takeDamage(damage: number): boolean {
        // 网络敌人的血量由服务端同步，客户端不直接修改
        // 返回 false 表示未立即死亡（等待服务端同步）
        return false
    }

    /**
     * 每帧更新
     * 平滑移动敌人位置，避免闪烁/跳跃感
     * @param deltaTime 帧间隔时间（秒）
     */
    update(deltaTime: number) {
        const pos = this.node.position
        const newX = pos.x + (this.targetX - pos.x) * this.smoothSpeed
        const newY = pos.y + (this.targetY - pos.y) * this.smoothSpeed
        this.node.setPosition(newX, newY, 0)
    }
}


