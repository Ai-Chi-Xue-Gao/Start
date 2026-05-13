import { _decorator, Color, Component, Label, Node, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('NetworkPlayer')
export class NetworkPlayer extends Component {
    private playerId: string = ''
    private targetX: number = 0
    private targetY: number = 0
    private smoothSpeed: number = 0.3

    // 血量相关
    private currentHp: number = 100
    private maxHp: number = 100
    private hpLabel: Label = null // 血量文本
    private hpBarSprite: Sprite = null // 血条
    private originalBarWidth: number = 0

    // 等级相关
    private levelLabel: Label = null // 等级文本
    private currentLevel: number = 1 // 当前等级

    // 经验相关
    private expLabel: Label = null // 经验文本
    private currentExp: number = 0
    private expToNextLevel: number = 100

     start() {

    }

    public init(id: string, name: string, color?: Color, hp: number = 100, maxHp: number = 100, level: number = 1, exp: number = 0,expToNextLevel: number = 100){
        this.playerId = id
        this.currentHp = hp
        this.maxHp = maxHp
        this.currentLevel = level
        this.currentExp = exp
        this.expToNextLevel = expToNextLevel
        // 可以选择不同颜色区分玩家
        const sprite = this.getComponent(Sprite)
        if(sprite && color){
            sprite.color = color
        }

        // 创建血量显示
        this.createHpDisplay()

        // 创建等级显示
        this.createLevelDisplay()

        this.updateHp(hp, maxHp)
    }

    // 创建血量显示
    private createHpDisplay(){
        // 创建血量文本
        const labelNode = new Node('HpLabel')
        this.hpLabel = labelNode.addComponent(Label)
        this.hpLabel.fontSize = 14
        this.hpLabel.color = Color.RED
        this.hpLabel.string = `${this.currentHp}/${this.maxHp}`
        labelNode.setPosition(0, 70, 0)
        this.node.addChild(labelNode)

        // 创建血条
        const barNode = new Node('HpBar')
        this.hpBarSprite = barNode.addComponent(Sprite)

        // 创建一个简单的白色SpriteFrame
        const texture = new Texture2D()
        texture.reset({
            width: 1,
            height: 1,
            format: Texture2D.PixelFormat.RGBA8888
        })
        const pixels = new Uint8Array([255, 255, 255, 255])
        texture.uploadData(pixels)
        const spriteFrame = new SpriteFrame()
        spriteFrame.texture = texture
        
        this.hpBarSprite.spriteFrame = spriteFrame
        this.hpBarSprite.color = Color.GREEN

        // 设置大小和位置
        let uiTransform = barNode.getComponent(UITransform)
        if(!uiTransform){
            uiTransform = barNode.addComponent(UITransform)
        }

        uiTransform.setContentSize(50, 6)
        barNode.setPosition(0, 60, 0)
        this.originalBarWidth = 50
        this.node.addChild(barNode)
    }

    // 更新血量显示
    public updateHp(currentHp: number, maxHp: number){
        this.currentHp = currentHp
        this.maxHp = maxHp
        const percent = currentHp / maxHp

        // 更新文本
        if(this.hpLabel){
            this.hpLabel.string = `${currentHp}/${maxHp}`
        }

        // 更新血条宽度
        if(this.hpBarSprite && this.originalBarWidth > 0){
            const uiTransform = this.hpBarSprite.node.getComponent(UITransform)
            uiTransform.setContentSize(this.originalBarWidth * percent, 6)

            // 根据血量百分比改变颜色
            if(percent < 0.3){
                this.hpBarSprite.color = Color.RED
            }else if(percent < 0.6){
                this.hpBarSprite.color = Color.YELLOW
            }else{
                this.hpBarSprite.color = Color.GREEN
            }
        }
    }

    // 受伤闪烁效果
    public playHurtFlash(){
        const sprite = this.getComponent(Sprite)
        if(!sprite) return

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
            }else{
                sprite.color = originalColor
            }
            flashCount++
        }, 100)
    }

    // 创建等级显示
    private createLevelDisplay(){
        const levelNode = new Node('LevelLabel')
        this.levelLabel = levelNode.addComponent(Label)
        this.levelLabel.fontSize = 12
        this.levelLabel.color = Color.WHITE
        this.levelLabel.string = `Lv.${this.currentLevel}`

        // 位置：血条下方，y = 50
        levelNode.setPosition(0, 50, 0)
        this.node.addChild(levelNode)
    }

    // 更新等级显示
    public updateLevel(level: number){
        this.currentLevel = level
        if(this.levelLabel){
            this.levelLabel.string = `Lv.${level}`
        }
        console.log(`[NetworkPlayer]${this.playerId}等级:${level}`)
    }

    // 更新经验显示
    public updateExp(exp: number, expToNextLevel: number, level: number){
        this.currentExp = exp
        this.expToNextLevel = expToNextLevel
        if(level !== this.currentLevel){
            this.updateLevel(level)
        }
    }

     public updatePosition(x: number, y: number){
        this.targetX = x
        this.targetY = y
    }

    update(deltaTime: number) {
        const pos = this.node.position
        const newX = pos.x + (this.targetX - pos.x) * this.smoothSpeed
        const newY = pos.y + (this.targetY - pos.y) * this.smoothSpeed
        this.node.setPosition(newX, newY, 0)
    }
}


