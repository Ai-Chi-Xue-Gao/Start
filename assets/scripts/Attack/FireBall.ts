import { _decorator, Collider2D, Component, Contact2DType, instantiate, IPhysics2DContact, Node, Prefab, Vec3 } from 'cc';
const { ccclass, property } = _decorator;
import { Enemy } from '../Enemy/Enemy';
import { PlayerController } from '../TypeScript/PlayerController';
import { EventBus } from '../Enemy/EventBus';
import { NetworkEnemy } from '../Network/NetworkEnemy';
import { NetworkManager } from '../Network/NetworkManager';

@ccclass('FireBall')
export class FireBall extends Component {
    @property(Prefab)
    explosionPrefab: Prefab = null // 爆炸预制体

    @property
    speed: number = 500 // 飞行速度

    @property
    damage: number = 20 // 伤害值

    private target: Node = null // 目标敌人
    private direction: Vec3 = new Vec3()
    private collider: Collider2D = null
    private pierceRemaining: number = 0 // 剩余可穿透次数
    private isPaused: boolean = false // 火球停止

    // 外部调用，初始化火球，设置目标敌人
    public init(targetEnemy: Node, attackValue: number){
        this.target = targetEnemy
        this.damage = attackValue // 使用玩家攻击力作为伤害

        // 获取玩家控制器，修正速度
        const canvas = this.node.scene.getChildByName('Canvas')
        const playerNode = canvas?.getChildByName('Player')
        if(playerNode){
            const pc = playerNode.getComponent(PlayerController)
            if(pc){
                this.speed = this.speed * pc.getFireballSpeedMultiplier()

                if(pc.hasPierceFireball()){
                    this.pierceRemaining = 1; // 可弹射1次
                }
            }
        }
        if(this.target && this.target.isValid){
            // 计算初始方向
            Vec3.subtract(this.direction, this.target.worldPosition, this.node.worldPosition)
            this.direction.normalize()
        }
    }

    start() {
        this.collider = this.getComponent(Collider2D)
        if(this.collider){
            this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }

        // 如果没有指定目标，则自动寻找最近敌人
        if(!this.target || !this.target.isValid){
            this.findNearestEnemy()
            if(this.target && this.target.isValid){
                Vec3.subtract(this.direction, this.target.worldPosition, this.node.worldPosition)
                this.direction.normalize()
            }else{
                // 若无敌人，向摇杆方向发射
                this.direction.set(1, 0, 0)
            }
        }
        EventBus.on('game-pause', this.onPause, this)
    }

    protected onDestroy(): void {
        EventBus.off('game-pause', this.onPause, this)
    }

    private onPause(pause: boolean){
        this.isPaused = pause
    }

    private findNearestEnemy(excludeEnemy: Node = null){
        // 在EnemySpawner下查找所有敌人
        const enemySpawner = this.node.scene.getChildByName('Canvas')?.getChildByName('EnemySpawner')
        if(!enemySpawner) return

        // 筛选有效敌人（未销毁、未死亡）
        const enemies = enemySpawner.children.filter(child => {
            if(child.name !== 'Enemy') return false
            if(excludeEnemy && child === excludeEnemy) return false
            const enemyScript = child.getComponent(Enemy)
            return child.isValid && enemyScript && !enemyScript.isDead
        })

        let minDist = Infinity
        let nearest = null
        for(const enemy of enemies){
            const dist = Vec3.distance(this.node.worldPosition, enemy.worldPosition)
            if(dist < minDist){
                minDist = dist
                nearest = enemy
            }
        }
        this.target = nearest
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact)
    {
        // 尝试获取本地敌人组件（单机模式用）
        const enemy = otherCollider.node.getComponent(Enemy)
        // 尝试获取网络敌人组件（联机模式用）
        const networkEnemy = otherCollider.node.getComponent(NetworkEnemy)

        // ========= 单机模式: 本地扣血 =========
        if(enemy && !enemy.isDead){
            enemy.takeDamage(this.damage)

            if(this.pierceRemaining > 0){
                this.pierceRemaining--
                return
            }

            this.spawnExplosionAt(enemy.node.worldPosition)
            this.node.destroy()
        }
        // ========= 联机模式: 发送攻击消息到服务器 =========
        else if(networkEnemy){
            // 获取网络管理器实例
            const canvas = this.node.scene.getChildByName('Canvas')
            const networkManager = canvas?.getComponentInChildren(NetworkManager)

            // 发送攻击消息，让服务器处理扣血和同步
            if(networkManager){
                networkManager.sendAttack(networkEnemy.enemyId)
            }

            // 弹射逻辑（与单机相同）
            if(this.pierceRemaining > 0){
                this.pierceRemaining--
                return
            }

            // 产生爆炸效果并销毁火球
            this.spawnExplosionAt(otherCollider.node.worldPosition)
            this.node.destroy()
        }  
    }

    private spawnExplosionAt(position: Vec3){
        if(this.explosionPrefab){
            const explosion = instantiate(this.explosionPrefab)
            
            // 将爆炸挂载到Canvas下，避免父节点为空或异常
            const canvas = this.node.scene.getChildByName('Canvas')
            if(canvas){
                canvas.addChild(explosion)
                explosion.worldPosition = position
            }else{
                this.node.parent?.addChild(explosion)
            }
        }
    }

    update(deltaTime: number) {
        if(this.isPaused) return
        if(!this.target || !this.target.isValid){
            // 目标失效，自动寻找新目标
            this.findNearestEnemy()
            if(!this.target){
                // 没有敌人就直接销毁火球
                this.node.destroy()
                return
            }
            Vec3.subtract(this.direction, this.target.worldPosition, this.node.worldPosition)
            this.direction.normalize()
        }

        // 向目标移动
        Vec3.subtract(this.direction, this.target.worldPosition, this.node.worldPosition)
        this.direction.normalize()

        const newPos = this.node.worldPosition.clone()
        newPos.x += this.direction.x * this.speed * deltaTime
        newPos.y += this.direction.y * this.speed * deltaTime
        this.node.worldPosition = newPos
    }
}
