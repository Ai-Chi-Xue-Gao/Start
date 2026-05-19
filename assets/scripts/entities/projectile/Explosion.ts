import { _decorator, Component, Animation } from 'cc';
import { ObjectPool } from '../../utils/ObjectPool';
const { ccclass } = _decorator;

@ccclass('Explosion')
export class Explosion extends Component {
    private poolKey: string = 'explosion'
    private isFromPool: boolean = false
    private defaultDuration: number = 0.5
    private isRecycling: boolean = false
    private isScheduled: boolean = false  // 防止重复调度

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
        // 重置后重新启动回收定时器
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
            console.log(`[爆炸] 已回收至对象池`)
        } else {
            this.node.destroy()
            console.log(`[爆炸] 直接销毁`)
        }
    }
}