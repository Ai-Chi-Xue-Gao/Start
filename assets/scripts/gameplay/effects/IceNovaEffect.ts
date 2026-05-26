// assets/scripts/gameplay/effects/IceNovaEffect.ts

import { _decorator, Sprite, UIOpacity, tween, Vec3 } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';

const { ccclass, property } = _decorator;

/**
 * 冰霜新星特效组件（单图片版）
 * 使用一张图片 + Tween 动画
 */
@ccclass('IceNovaEffect')
export class IceNovaEffect extends BaseComponent {
    @property
    duration: number = 0.6;           // 动画持续时间（秒）
    
    @property
    startScale: number = 0.5;          // 起始缩放
    
    @property
    endScale: number = 2.0;            // 结束缩放
    
    @property
    startOpacity: number = 200;         // 起始透明度
    
    @property
    useRotation: boolean = true;        // 是否旋转
    
    start() {
        this.playAnimation();
        
        // 定时销毁
        this.scheduleOnce(() => {
            this.destroyEffect();
        }, this.duration);
    }
    
    /**
     * 播放动画
     */
    private playAnimation() {
        // 初始状态
        this.node.setScale(this.startScale, this.startScale, 1);
        
        // 缩放动画：从小到大
        tween(this.node)
            .to(this.duration, { scale: new Vec3(this.endScale, this.endScale, 1) })
            .start();
        
        // 淡出动画
        const uiOpacity = this.node.getComponent(UIOpacity);
        if (uiOpacity) {
            uiOpacity.opacity = this.startOpacity;
            tween(uiOpacity)
                .to(this.duration, { opacity: 0 })
                .start();
        }
        
        // 旋转动画（可选）
        if (this.useRotation) {
            tween(this.node)
                .by(this.duration, { eulerAngles: new Vec3(0, 0, 360) })
                .start();
        }
    }
    
    /**
     * 销毁特效
     */
    private destroyEffect() {
        if (this.node && this.node.isValid) {
            this.node.destroy();
        }
    }
}