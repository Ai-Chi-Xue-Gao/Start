import { _decorator, Component, instantiate, Node, Prefab, Vec3 } from 'cc';
import { EventBus } from './EventBus';
const { ccclass, property } = _decorator;

@ccclass('EnemySpawner')
export class EnemySpawner extends Component {

    @property(Prefab)
    enemyPrefab: Prefab = null // 敌人预制体

    @property(Prefab)
    expBallPrefab: Prefab = null // 经验球预制体

    @property
    maxEnemies: number = 20 // 最大敌人数

    @property
    spawnInterval: number = 1 // 生成间隔

    @property
    spawnRadius: number = 500 // 生成半径

    private enemies: Node[] = []
    private spawnTimer: number = 0;
    private isPaused: boolean = false

    start() {
        // 检查游戏模式
        // (window as any).gameMode是在主菜单选择模式时设置的全局变量
        // 'single' = 单机模式, 'multi' = 联机模式
        const gameMode = (window as any).gameMode

        // 联机模式：敌人由服务器统一生成和同步，客户端不需要自己生成
        // 禁用当前组件，停止本地生成逻辑
        if(gameMode === 'multi'){
            console.log('联机模式，敌人生成由服务器负责，本地生成器已禁用')
            this.enabled = false // enable = false 会让update()不再执行
            return
        }

        // 单机模式：正常使用本地敌人生成器
        console.log('单机模式，本地敌人生成器已启动')
        this.spawnTimer = this.spawnInterval
        
        EventBus.on('enemy-died', this.spawnExpBall, this)
        EventBus.on('game-pause', (pause) => {this.isPaused = pause})
    }

    protected onDestroy(): void {
        // 只在单机模式下才需要解绑事件（因为联机模式根本没绑定）
        const gameMode = (window as any).gameMode
        if(gameMode !== 'multi'){
            EventBus.off('enemy-died', this.spawnExpBall, this)
            EventBus.off('game-pause')
        }
        
    }

    private spawnExpBall(pos: Vec3){
        if(!this.expBallPrefab) return
        const expBall = instantiate(this.expBallPrefab)
        expBall.worldPosition = pos
        this.node.addChild(expBall)
    }

    private spawnEnemy(){
        if(!this.enemyPrefab) return

        // 获取玩家位置（单机模式下通过Canvas获取）
        const canvas = this.node.scene.getChildByName('Canvas')
        const player = canvas?.getChildByName('Player')
        const playerPos = player?.worldPosition || new Vec3(0, 0, 0)

        // 计算相对于玩家的随机位置
        const angle = Math.random() * Math.PI * 2
        const offsetX = Math.cos(angle) * this.spawnRadius
        const offsetY = Math.sin(angle) * this.spawnRadius

        const enemy = instantiate(this.enemyPrefab)
        
        // 以玩家为中心生成敌人
        if(player){
            enemy.setPosition(
                playerPos.x + offsetX,
                playerPos.y + offsetY,
                0
            )
        }else{
            // 如果找不到玩家，使用绝对坐标
            enemy.setPosition(offsetX, offsetY, 0)
        }

        this.node.addChild(enemy)

        // 监听死亡事件
        enemy.on('enemy-died',(pos: Vec3) => {
            this.onEnemyDied(pos)
        })

        this.enemies.push(enemy)
    }

    private onEnemyDied(pos: Vec3){
        // 这里可以生成经验球
        console.log('敌人死亡于：', pos)
    }

    update(deltaTime: number) {
        if(this.isPaused) return
        // 定时生成敌人
        this.spawnTimer -= deltaTime
        if(this.spawnTimer <= 0 && this.enemies.length < this.maxEnemies){
            this.spawnEnemy()
            this.spawnTimer = this.spawnInterval
        }

        // 清理已销毁的敌人引用
        this.enemies = this.enemies.filter(e => e && e.isValid)
    }
}


