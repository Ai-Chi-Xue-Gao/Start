// assets/scripts/gameplay/projectile/Explosion.ts

import { _decorator, Animation } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
import { ObjectPool } from '../../utils/ObjectPool';

const { ccclass } = _decorator;

@ccclass('Explosion')
export class Explosion extends BaseComponent {
    private poolKey: string = 'explosion'
    private isFromPool: boolean = false
    private defaultDuration: number = 0.5
    private isRecycling: boolean = false
    private isScheduled: boolean = false

    start() {
        this.startRecycleTimer();
    }

    public setFromPool(fromPool: boolean) {
        this.isFromPool = fromPool
    }

    public reset() {
        this.isRecycling = false
        this.isScheduled = false
        const anim = this.getComponent(Animation)
        if (anim) {
            anim.stop()
            anim.play('explosion_clip')
        }
        this.startRecycleTimer();
    }

    private startRecycleTimer() {
        if (this.isScheduled) return;
        
        const anim = this.getComponent(Animation)
        let duration = this.defaultDuration
        
        if (anim) {
            anim.play('explosion_clip')
            const animState = anim.getState('explosion_clip')
            if (animState) {
                duration = animState.duration
            }
        }
        
        this.isScheduled = true
        this.scheduleOnce(() => {
            this.recycleToPool()
        }, duration)
    }

    private recycleToPool() {
        if (this.isRecycling) return
        if (!this.node || !this.node.isValid) return
        
        this.isRecycling = true
        this.isScheduled = false
        
        if (this.isFromPool) {
            const pool = ObjectPool.getInstance()
            pool.recycle(this.poolKey, this.node)
        } else {
            this.node.destroy()
        }
    }
}