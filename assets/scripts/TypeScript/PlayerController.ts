import { _decorator, Canvas, Color, Component, Node, physics, Sprite, UITransform, Vec3 } from 'cc';
import { PlayerAnim } from './PlayerAnim';
import { EventBus } from '../Enemy/EventBus';
import { EnemySpawner } from '../Enemy/EnemySpawner';
import { Enemy } from '../Enemy/Enemy';
import { director } from 'cc';
import { NetworkManager } from '../Network/NetworkManager';
import { NetworkPlayer } from '../Network/NetworkPlayer';
const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
    @property(Node)
    joystick: Node = null

    @property
    speed: number = 300 // 人物移动速度

    @property
    worldWidth: number = 3000 // 世界宽度

    @property
    worldHeight: number = 2000 // 世界高度

    // 血量属性
    @property
    maxHealth: number = 100 // 最大血量

    @property
    currentHealth: number = 100 // 当前血量

    @property
    attack: number = 20 // 攻击力

    @property
    invincibleTime: number = 1 // 无敌时间（秒）

    // 经验值
    private exp: number = 0 // 当前经验值
    private expToNextLevel: number = 100 // 升级所需经验值
    private expMultiplier: number = 1.0 // 经验倍率

    
    // 私有变量
    private joystickScript: any = null // 存储摇杆脚本
    private tempPos: Vec3 = new Vec3()
    private leftBound: number = 0
    private rightBound: number = 0
    private bottomBound: number = 0
    private topBound: number = 0
    private playerAnim: PlayerAnim = null
    private spriteNode: Node = null
    private isPaused: boolean = false // 游戏暂停标志
    private currentLevel: number = 1 // 人物等级
    private networkManager: NetworkManager = null

    private isInvincible: boolean = false // 是否无敌
    private invincibleTimer: number = 0 // 无敌计时器

    // 技能状态存储
    private skill_doubleFireball: boolean = false // 双重火球
    private skill_pierceFireball: boolean = false // 火球穿透
    private skill_fireballSpeed: number = 1.0 // 火球速度倍率
    private skill_attackCooldown: number = 0 // 攻击冷却减少值
    private skill_magnetRange: number = 1.0 // 经验球吸引范围倍率
    private skill_attackBoost: number = 1.0 // 攻击力倍率

    start() {
        // 1.获取摇杆节点上的Joystick脚本
        this.joystickScript = this.joystick.getComponent('Joystick')

        // 自动获取边界
        this.calculateBounds()

        // 获取动画脚本
        this.playerAnim = this.getComponent(PlayerAnim)

        // 获取sprite节点
        this.spriteNode = this.node.getChildByName('Sprite')

        // 监听敌人伤害事件
        EventBus.on('enemy-hit-player', this.onTakeDamage, this)

        EventBus.on('gain-exp', this.onGainExp, this)

        EventBus.on('game-pause', (pause:boolean) => {
            this.isPaused = pause
            if(this.joystickScript){
                this.joystickScript.enabled = !pause
            }
        })

        // 获取NetworkManager
        const canvas = this.node.scene.getChildByName('Canvas')
        const networkNode = canvas?.getChildByName('NetworkManager')
        this.networkManager = networkNode?.getComponent(NetworkManager)

        // 模式判断
        const gameMode = (window as any).gameMode
        if(this.networkManager && gameMode === 'multi'){
            console.log('联机模式，准备连接服务器...');
            this.networkManager.connect()

            // 设置受伤回调
            this.networkManager.setOnPlayerHurt((playerId: string, damage: number, currentHp: number, maxHp: number) => {
                this.onOtherPlayerHurt(playerId, damage, currentHp, maxHp)
            })
        }else{
            console.log('单机模式，跳过网络连接')
        }

        // 玩家等级更新回调
        this.networkManager.setOnPlayerLevelUp((playerId: string, level: number) => {
            this.onOtherPlayerLevelUp(playerId, level)
        })

        // 经验值更新回调
        this.networkManager.setOnPlayerExpUpdate((playerId: string, exp: number, expToNextLevel: number, level: number) => {
            this.onOtherPlayerExpUpdate(playerId, exp, expToNextLevel, level)
        })
    }

    protected onDestroy(): void {
        // 移除事件监听
        EventBus.off('enemy-hit-player', this.onTakeDamage, this)

        EventBus.off('gain-exp', this.onGainExp, this)

        EventBus.off('game-pause', undefined, this)
    }

    // 其他玩家受伤时的处理
    private onOtherPlayerHurt(playerId: string, damage: number, currentHp: number, maxHp: number){
        // 查找对应的网络玩家节点
        const canvas = this.node.scene.getChildByName('Canvas')
        const networkPlayerNode = canvas?.getChildByName(`NetworkPlayer_${playerId}`)
        if(networkPlayerNode){
            const networkPlayer = networkPlayerNode.getComponent(NetworkPlayer)
            // 播放受伤效果（闪烁红色）
            if(networkPlayer){
                // 更新血量显示
                networkPlayer.updateHp(currentHp, maxHp)
                // 播放受伤闪烁效果
                networkPlayer.playHurtFlash()
            }
        }
    }

    // 受伤闪烁效果
    private playFlashEffectOnSelf(sprite: Sprite){
        const originalColor = sprite.color.clone()
        let flashCount = 0
        const maxFlashes = 4

        const flashInterval = setInterval(() => {
            if(flashCount >= maxFlashes){
                clearInterval(flashInterval)
                sprite.color = originalColor
                return
            }

            if(flashCount % 2 === 0){
                sprite.color = Color.RED
            } else {
                sprite.color = originalColor
            }
            flashCount++
        }, 100)
    }

    // 其他玩家升级时的处理
    private onOtherPlayerLevelUp(playerId: string, level: number){
        const canvas = this.node.scene.getChildByName('Canvas')
        const networkPlayerNode = canvas?.getChildByName(`NetworkPlayer_${playerId}`)
        if(networkPlayerNode){
            const networkPlayer = networkPlayerNode.getComponent(NetworkPlayer)
            if(networkPlayer){
                networkPlayer.updateLevel(level)
            }
        }
    }

    // 其他玩家经验更新时的处理
    private onOtherPlayerExpUpdate(playerId: string, exp: number, expToNextLevel: number, level: number){
        const canvas = this.node.scene.getChildByName('Canvas')
        const networkPlayerNode = canvas?.getChildByName(`NetworkPlayer_${playerId}`)
        if(networkPlayerNode){
            const networkPlayer = networkPlayerNode.getComponent(NetworkPlayer)
            if(networkPlayer){
                networkPlayer.updateExp(exp, expToNextLevel, level)
            }
        }
    }

    private calculateBounds(){
        this.leftBound = -this.worldWidth / 2
        this.rightBound = this.worldWidth / 2
        this.bottomBound = -this.worldHeight / 2
        this.topBound = this.worldHeight / 2
    }

    // 受伤逻辑
    private onTakeDamage(damage: number){
        // 无敌状态不受伤害
        if (this.isInvincible) return
        if(this.currentHealth <= 0) return

        // 扣血
        this.currentHealth -= damage
        console.log(`受到${damage}点伤害，剩余血量:${this.currentHealth}`)

        // 触发血量更新事件（用于UI更新）
        EventBus.emit('player-health-change', this.currentHealth, this.maxHealth)

        // 联机模式发送受伤消息
        const gameMode = (window as any).gameMode
        if(gameMode === 'multi' && this.networkManager && this.networkManager.isConnected()){
            this.networkManager.sendHurt(damage, this.currentHealth, this.maxHealth)
        }

        // 播放受伤闪烁效果
        const sprite = this.spriteNode.getComponent(Sprite)
        this.playFlashEffectOnSelf(sprite)

        // 检查死亡
        if(this.currentHealth <= 0){
            this.die()
        }else{
            // 进入无敌状态
            this.startInvincible()
        }
    }

    // 进入无敌状态
    private startInvincible(){
        this.isInvincible = true
        this.invincibleTimer = 0

        // 闪烁效果
        this.startFlashEffect()
    }

    // 无敌闪烁状态
    private startFlashEffect(){
        const sprite = this.spriteNode.getComponent('cc.Sprite') as any
        if(!sprite) return

        let flashCont = 0
        const maxFlashes = 6 //闪烁次数

        const flashInterval = setInterval(() => {
            if(flashCont >= maxFlashes || !this.isInvincible){
                clearInterval(flashInterval)
                if(sprite.color)sprite.color = new(sprite.color.constructor)(255, 255, 255, 255)
                return
            }

            // 交替变红和恢复正常
            if (flashCont % 2 === 0){
                sprite.color = new(sprite.color.constructor)(255, 100, 100, 255)
            }else{
                sprite.color = new(sprite.color.constructor)(255, 255, 255, 255)
            }
            flashCont++
        }, 100)
    }

    // 死亡逻辑
    private die(){
        console.log('玩家死亡！')
        this.playerAnim.playDie()

        // 禁用摇杆控制
        this.enabled = false

        // 触发死亡事件
        EventBus.emit('player-died')
    }

    // 修改最大经验值
    private onGainExp(value: number){
        const actualExp = Math.floor(value * this.expMultiplier)
        this.exp += actualExp
        console.log(`[经验获取] 获得 ${actualExp}，总经验 ${this.exp}/${this.expToNextLevel}`);
        console.log(`[升级检查] ${this.exp} >= ${this.expToNextLevel} ? ${this.exp >= this.expToNextLevel}`);

        // 联机模式发送经验更新
        const gameMode = (window as any).gameMode
        if(gameMode === 'multi' && this.networkManager && this.networkManager.isConnected()){
            this.networkManager.sendExpUpdate(this.exp, this.expToNextLevel, this.currentLevel)
        }

        // 检查升级
        if(this.exp >= this.expToNextLevel){
            console.log('[升级触发] 即将升级！');
            this.levelUP()
        }

        // 触发经验更新事件（用于UI）
        EventBus.emit('exp-changed', this.exp, this.expToNextLevel)
    }

    // 玩家升级
    //扣除升级所需经验，增加下一级需求，回复生命值，触发升级事件*/
    private levelUP(){
        this.exp -= this.expToNextLevel
        this.expToNextLevel = Math.floor(this.expToNextLevel * 1.2)
        this.currentLevel++ // 等级+1
        console.log(`升级！下一级需要${this.expToNextLevel}经验`)

        // 升级时回血
        this.heal(20)

        // 触发升级事件
        EventBus.emit('player-level-up')

        const gameMode = (window as any).gameMode
        if(gameMode === 'multi' && this.networkManager && this.networkManager.isConnected()){
            this.networkManager.sendLevelUp(this.currentLevel)
        }
    }

    // 回血方法（供升级系统调用）
    public heal(amount: number){
        if(this.currentHealth <= 0) return
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount)
        console.log(`回复${amount}点生命，当前血量：${this.currentHealth}`)

        // 触发血量更新事件
        EventBus.emit('player-health-change', this.currentHealth, this.maxHealth)
    }

    // 获取当前血量
    public getCurrentHealth(): number{
        return this.currentHealth
    }

    // 获取最大血量
    public getMaxHealth(): number{
        return this.maxHealth
    }

    // 暴露当前经验值给UI
    public getExp(): number {return this.exp}

    // UI显示经验条
    public getExpToNextLevel(): number{
        return this.expToNextLevel
    }

    // 获取等级
    public getLevel(): number{
        return this.currentLevel
    }

    // 设置最大生命值
    public setMaxHealth(value: number){
        this.maxHealth = value
        // 触发血量更新事件，然血条同步
        EventBus.emit('player-health-change', this.currentHealth, this.maxHealth)
    }

    // 获取移动速度
    public getSpeed(): number{
        return this.speed
    }

    // 设置移动速度
    public setSpeed(value: number){
        this.speed = value
    }

    // 获取经验倍率
    public getExpMultiplier(): number{
        return this.expMultiplier
    }

    // 设置经验倍率
    public setExpMultiplier(value: number){
        this.expMultiplier = value
    }

    // 获取最终攻击力
    public getAttack(): number{
        return this.attack * this.skill_attackBoost
    }

    // 设置攻击力倍率
    public setAttackBoost(mult: number){
        this.skill_attackBoost = mult
    }

    // 技能效果应用接口
    public setDoubleFireball(active: boolean) {this.skill_doubleFireball = active}
    public setPierceFireball(active: boolean) {this.skill_pierceFireball = active}
    public setFireballSpeedMultiplier(mult: number) {this.skill_fireballSpeed = mult}
    public setAttackCooldownReduction(reduce: number) {this.skill_attackCooldown = reduce}
    public setMagnetRangeMultiplier(mult: number) {this.skill_magnetRange = mult}

    // 获取技能状态的方法
    public hasDoubleFireball(): boolean {return this.skill_doubleFireball}
    public hasPierceFireball(): boolean {return this.skill_pierceFireball}
    public getFireballSpeedMultiplier(): number {return this.skill_fireballSpeed}
    public getAttackCooldownReduction(): number {return this.skill_attackCooldown}
    public getMagnetRangeMultiplier(): number {return this.skill_magnetRange}

    update(deltaTime: number) {
        if(this.isPaused) return
        // 无敌计时
        if(this.isInvincible){
            this.invincibleTimer += deltaTime
            if(this.invincibleTimer >= this.invincibleTime){
                this.isInvincible = false
                this.invincibleTimer = 0
                console.log('无敌状态结束')
            }
        }

        // 死亡后不处理移动
        if(this.currentHealth <= 0) return

        // // 2.调用摇杆的getDirection()方法获取方向
        const direction = this.joystickScript.getDirection();

        // // 角色镜像翻转
        if(direction.x < 0){
            this.spriteNode.setScale(-1,1,1)
        }else if(direction.x > 0){
            this.spriteNode.setScale(1,1,1)
        }

        // 判断是否在移动
        const isMoving = Math.abs(direction.x) > 0.1 || Math.abs(direction.y) > 0.1

        // 切换动画
        if (isMoving){
            this.playerAnim.playMove()
        }else{
            this.playerAnim.playIdle()
        }

        // 计算新位置
        let newX = this.node.position.x + direction.x * this.speed * deltaTime
        let newY = this.node.position.y + direction.y * this.speed * deltaTime

        // 限制边界
        newX = Math.max(this.leftBound,Math.min(this.rightBound,newX))
        newY = Math.max(this.bottomBound,Math.min(this.topBound,newY))

        this.tempPos.set(newX, newY, 0)
        // 移动角色
        this.node.setPosition(this.tempPos)

        // 移动后通知服务器
        if(this.networkManager && this.networkManager.isConnected()){
            this.networkManager.setMove(this.node.position.x, this.node.position.y)
        }
    }
}


