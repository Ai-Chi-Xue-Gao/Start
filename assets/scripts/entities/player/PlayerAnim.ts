import { _decorator, Animation, Component, Node } from 'cc';
import { EventBus } from '../../core/EventBus';
import { EventNames } from '../../utils/EventNames';

const { ccclass, property } = _decorator;

@ccclass('PlayerAnim')
export class PlayerAnim extends Component {
    private anim: Animation = null
    private currentState: string = ''
    private isPaused: boolean = false

    start() {
        // 获取sprit子节点的Animation组件
        const spriteNode = this.node.getChildByName('Sprite')
        
        this.anim = spriteNode.getComponent(Animation)
        this.playIdle()

        // 🆕 监听游戏暂停事件
        EventBus.on(EventNames.GAME_PAUSE, this.onGamePause, this)
    }

    protected onDestroy() {
        // 🆕 移除监听
        EventBus.off(EventNames.GAME_PAUSE, this.onGamePause, this)
    }

    /**
     * 🆕 游戏暂停/恢复回调
     */
    private onGamePause(pause: boolean) {
        this.isPaused = pause
        if (pause) {
            // 暂停动画
            if (this.anim) {
                this.anim.pause()
            }
        } else {
            // 恢复动画
            if (this.anim) {
                // 根据当前状态恢复对应的动画
                if (this.currentState === 'idle') {
                    this.anim.play('idle')
                } else if (this.currentState === 'move') {
                    this.anim.play('move')
                } else if (this.currentState === 'attack') {
                    this.anim.play('attack')
                } else if (this.currentState === 'die') {
                    this.anim.play('die')
                }
            }
        }
    }

    // 播放待机动画
    public playIdle(){
        if (this.isPaused) return
        if (this.currentState == 'idle') return
        if (this.currentState == 'attack') return
        this.currentState = 'idle'
        this.anim.play('idle')
    }

    // 播放移动动画
    public playMove(){
        if (this.isPaused) return
        if (this.currentState == 'move') return
        if (this.currentState == 'attack') return

        this.currentState = 'move'
        this.anim.play('move')
    }

    // 播放攻击动画
    public playAttack(){
        if (this.isPaused) return
        if (this.currentState == 'attack') return
        this.currentState = 'attack'
        this.anim.play('attack')

        // 获取攻击动画的时长
        const attackState = this.anim.getState('attack')
        const duration = attackState ? attackState.duration : 0.5

        // 使用scheduleOnce延迟恢复待机
        this.scheduleOnce(() => {
            if(this.currentState == 'attack'){
                this.currentState = '' // 清空状态
                this.playIdle()
            }
        }, duration)
    }

    // 播放死亡动画
    public playDie(){
        if (this.isPaused) return
        if (this.currentState == 'die') return
        this.currentState = 'die'
        this.anim.play('die')
    }

    update(deltaTime: number) {
        
    }
}