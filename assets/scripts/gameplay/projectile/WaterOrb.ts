// assets/scripts/gameplay/projectile/WaterOrb.ts

import { _decorator, Collider2D, Contact2DType, IPhysics2DContact, Node, Vec3 } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { Enemy } from '../enemy/Enemy';

const { ccclass, property } = _decorator;

/**
 * 水灵法球组件
 * 环绕玩家旋转，自动攻击敌人
 */
@ccclass('WaterOrb')
export class WaterOrb extends BaseComponent {
    @property
    damage: number = 20;           // 伤害值
    
    @property
    rotationSpeed: number = 180;    // 旋转速度（度/秒）
    
    @property
    radius: number = 80;            // 环绕半径
    
    private angle: number = 0;       // 当前角度
    private centerNode: Node = null; // 中心点（玩家）
    private collider: Collider2D = null;
    private attackedEnemies: Set<Node> = new Set(); // 本次攻击过的敌人
    
    start() {
        this.collider = this.getComponent(Collider2D)
        if (this.collider) {
            this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }
    }
    
    protected onDestroy() {
        if (this.collider) {
            this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }
    }
    
    /**
     * 初始化法球
     * @param center 中心节点（玩家）
     * @param startAngle 起始角度
     * @param radius 环绕半径
     * @param damage 伤害值
     */
    public init(center: Node, startAngle: number, radius: number = 80, damage: number = 20) {
        this.centerNode = center
        this.angle = startAngle
        this.radius = radius
        this.damage = damage
        this.attackedEnemies.clear()
        this.updatePosition()
    }
    
    /**
     * 更新法球位置
     */
    private updatePosition() {
        if (!this.centerNode) return
        
        const centerPos = this.centerNode.worldPosition
        const rad = this.angle * Math.PI / 180
        const x = centerPos.x + Math.cos(rad) * this.radius
        const y = centerPos.y + Math.sin(rad) * this.radius
        
        this.node.setWorldPosition(x, y, 0)
    }
    
    /**
     * 设置旋转角度
     */
    public setAngle(angle: number) {
        this.angle = angle
        this.updatePosition()
    }
    
    /**
     * 更新环绕（每帧调用）
     */
    public updateOrbit(deltaTime: number) {
        if (!this.centerNode) return
        if (!this.centerNode.activeInHierarchy) return
        
        this.angle += this.rotationSpeed * deltaTime
        if (this.angle >= 360) this.angle -= 360
        
        this.updatePosition()
    }
    
    /**
     * 碰撞回调：攻击敌人
     */
    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact) {
        const enemyNode = otherCollider.node
        const enemy = enemyNode.getComponent(Enemy)
        
        if (enemy && !this.attackedEnemies.has(enemyNode)) {
            this.attackedEnemies.add(enemyNode)
            enemy.takeDamage(this.damage)
            console.log(`[水灵法球] 攻击敌人，伤害 ${this.damage}`)
            
            // 0.5秒后清除记录，允许再次攻击同一敌人
            this.scheduleOnce(() => {
                this.attackedEnemies.delete(enemyNode)
            }, 0.5)
        }
    }
    
    /**
     * 重置状态（对象池复用）
     */
    public reset() {
        this.attackedEnemies.clear()
        this.centerNode = null
        this.angle = 0
    }
    
    update(deltaTime: number) {
        this.updateOrbit(deltaTime)
    }
}