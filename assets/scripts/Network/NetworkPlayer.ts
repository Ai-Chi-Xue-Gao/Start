// assets/scripts/network/NetworkPlayer.ts

import { _decorator, Color, Label, Node, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
import { BaseComponent } from '../core/BaseComponent';
import { FlashEffect } from '../utils/FlashEffect';
import { UIColorConfig } from '../configs/GameConfig';

const { ccclass, property } = _decorator;

@ccclass('NetworkPlayer')
export class NetworkPlayer extends BaseComponent {
    private playerId: string = ''
    private targetX: number = 0
    private targetY: number = 0
    private smoothSpeed: number = 0.3
    private hurtFlashInterval: any = null

    private currentHp: number = 100
    private maxHp: number = 100
    private hpLabel: Label = null
    private hpBarSprite: Sprite = null
    private originalBarWidth: number = 0
    private static sharedSpriteFrame: SpriteFrame = null

    private levelLabel: Label = null
    private currentLevel: number = 1

    private expLabel: Label = null
    private currentExp: number = 0
    private expToNextLevel: number = 100

    start() {
        // 初始化由 init 方法完成
    }

    public init(id: string, name: string, color?: Color, hp: number = 100, maxHp: number = 100, level: number = 1, exp: number = 0, expToNextLevel: number = 100) {
        this.playerId = id
        this.currentHp = hp
        this.maxHp = maxHp
        this.currentLevel = level
        this.currentExp = exp
        this.expToNextLevel = expToNextLevel

        const sprite = this.getComponent(Sprite)
        if (sprite && color) {
            sprite.color = color
        }

        this.createHpDisplay()
        this.createLevelDisplay()
        this.updateHp(hp, maxHp)
    }

    private createHpDisplay() {
        const labelNode = new Node('HpLabel')
        this.hpLabel = labelNode.addComponent(Label)
        this.hpLabel.fontSize = 14
        this.hpLabel.color = Color.RED
        this.hpLabel.string = `${this.currentHp}/${this.maxHp}`
        labelNode.setPosition(0, 70, 0)
        this.node.addChild(labelNode)

        const barNode = new Node('HpBar')
        this.hpBarSprite = barNode.addComponent(Sprite)
        this.hpBarSprite.spriteFrame = NetworkPlayer.getSharedSpriteFrame()
        this.hpBarSprite.color = Color.GREEN

        let uiTransform = barNode.getComponent(UITransform)
        if (!uiTransform) {
            uiTransform = barNode.addComponent(UITransform)
        }
        uiTransform.setContentSize(50, 6)
        barNode.setPosition(0, 60, 0)
        this.originalBarWidth = 50
        this.node.addChild(barNode)
    }

    public updateHp(currentHp: number, maxHp: number) {
        this.currentHp = currentHp
        this.maxHp = maxHp
        const percent = currentHp / maxHp

        if (this.hpLabel) {
            this.hpLabel.string = `${Math.floor(currentHp)}/${Math.floor(maxHp)}`
        }

        if (this.hpBarSprite && this.originalBarWidth > 0) {
            const uiTransform = this.hpBarSprite.node.getComponent(UITransform)
            uiTransform.setContentSize(this.originalBarWidth * percent, 6)

            if (percent < UIColorConfig.HEALTH_BAR_RED_THRESHOLD) {
                this.hpBarSprite.color = Color.RED
            } else if (percent < UIColorConfig.HEALTH_BAR_YELLOW_THRESHOLD) {
                this.hpBarSprite.color = Color.YELLOW
            } else {
                this.hpBarSprite.color = Color.GREEN
            }
        }
    }

    private static getSharedSpriteFrame(): SpriteFrame {
        if (!NetworkPlayer.sharedSpriteFrame) {
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
            NetworkPlayer.sharedSpriteFrame = spriteFrame
        }
        return NetworkPlayer.sharedSpriteFrame
    }

    public playHurtFlash() {
        const sprite = this.getComponent(Sprite)
        if (!sprite) return

        if (this.hurtFlashInterval !== null) {
            FlashEffect.cancel(this.hurtFlashInterval)
            this.hurtFlashInterval = null
        }

        this.hurtFlashInterval = FlashEffect.flash(
            sprite,
            0.4,
            0.1,
            Color.RED,
            () => {
                this.hurtFlashInterval = null
            }
        ) as any
    }

    private createLevelDisplay() {
        const levelNode = new Node('LevelLabel')
        this.levelLabel = levelNode.addComponent(Label)
        this.levelLabel.fontSize = 12
        this.levelLabel.color = Color.WHITE
        this.levelLabel.string = `Lv.${this.currentLevel}`
        levelNode.setPosition(0, 50, 0)
        this.node.addChild(levelNode)
    }

    public updateLevel(level: number) {
        this.currentLevel = level
        if (this.levelLabel) {
            this.levelLabel.string = `Lv.${level}`
        }
        console.log(`[NetworkPlayer]${this.playerId}等级:${level}`)
    }

    public updateExp(exp: number, expToNextLevel: number, level: number) {
        this.currentExp = exp
        this.expToNextLevel = expToNextLevel
        if (level !== this.currentLevel) {
            this.updateLevel(level)
        }
    }

    public updatePosition(x: number, y: number) {
        this.targetX = x
        this.targetY = y
    }

    protected onDestroy(): void {
        if (this.hurtFlashInterval !== null) {
            clearInterval(this.hurtFlashInterval)
            this.hurtFlashInterval = null
        }
    }

    update(deltaTime: number) {
        const pos = this.node.position
        const newX = pos.x + (this.targetX - pos.x) * this.smoothSpeed
        const newY = pos.y + (this.targetY - pos.y) * this.smoothSpeed
        this.node.setPosition(newX, newY, 0)
    }
}