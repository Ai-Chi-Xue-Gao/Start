import { _decorator, Animation, Collider2D, Component, Contact2DType, IPhysics2DContact, Node, Vec3} from 'cc';
import { EventBus } from './EventBus';
const { ccclass, property } = _decorator;

@ccclass('Enemy')
export class Enemy extends Component {
    @property
    speed: number = 100 // 移动速度

    @property
    damage: number = 10 // 碰撞伤害

    @property
    maxHealth: number = 30 // 最大血量

    private currentHealth: number = 30 // 当前血量
    private target: Node = null // 目标（玩家）
    public isDead: boolean = false
    private collider: Collider2D = null
    private isPaused: boolean = false // 游戏停止标志
    private anim: Animation = null // 动画组件
    private isMoving: boolean = false // 是否移动

    start() {
        // 初始化当前血量
        this.currentHealth = this.maxHealth

        // 获取动画组件
        this.anim = this.getComponent(Animation)

        // 寻找玩家
        const canvas = this.node.scene.getChildByName('Canvas')
        this.target = canvas?.getChildByName('Player')

        // 注册碰撞事件
        this.collider = this.getComponent(Collider2D)
        if(this.collider){
            this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }

        EventBus.on('game-pause', this.onPause, this)
    }

    protected onDestroy(): void {
        if(this.collider){
            this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this)
        }

        EventBus.off('game-pause', this.onPause, this)
    }

    private onPause(pause: boolean){
        this.isPaused = pause
        // 暂停时也暂停动画
        if(this.anim){
            if(pause){
                this.anim.pause()
            }else{
                this.anim.resume()
            }
        }
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null){
        // 碰到玩家时造成伤害
        if(otherCollider.node.name == 'Player'){
            // 触发玩家受伤事件
            EventBus.emit('enemy-hit-player', this.damage)
        }

        // 碰到攻击区域时受伤
        if(otherCollider.node.name == 'AttackArea'){
            this.takeDamage(20)
        }
    }

    // 播放移动动画
    private playMoveAnim(){
        if(!this.anim) return
        const animState = this.anim.getState('enemy_move')
        if(animState && !animState.isPlaying){
            this.anim.play('enemy_move')
        }
    }

    public takeDamage(damage: number){
        if(this.isDead) return

        this.currentHealth -= damage
        console.log(`敌人受到${damage}伤害, 剩余血量：${this.currentHealth}/${this.maxHealth}`)

        if(this.currentHealth <= 0){
            this.die()
        }
    }

    public die(){
        if(this.isDead) return
        this.isDead = true

        // 触发死亡事件
        EventBus.emit('enemy-died', this.node.position)

        // 销毁敌人
        this.node.destroy()
    }

    update(deltaTime: number) {
        if(this.isPaused) return
        if(this.isDead) return
        if(!this.target) return

        // 使用世界坐标
        const enemyPos = this.node.worldPosition
        const targetPos = this.target.worldPosition

        // 向玩家移动
        const direction = new Vec3()
        Vec3.subtract(direction, targetPos, enemyPos)

        // 判断是否在移动
        const wasMoving = this.isMoving
        this.isMoving = direction.length() > 10

        // 切换动画
        if(this.isMoving){
            this.playMoveAnim()
        }

        // 如果距离太近就不移动
        if(direction.length() < 5) return
        direction.normalize()

        const newPos = enemyPos.clone()
        newPos.x += direction.x * this.speed * deltaTime
        newPos.y += direction.y * this.speed * deltaTime

        // 设置世界坐标
        this.node.worldPosition = newPos
    }
}


