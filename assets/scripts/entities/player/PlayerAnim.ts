import { _decorator, Animation, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlayerAnim')
export class PlayerAnim extends Component {
    private anim: Animation = null
    private currentState: string = ''

    start() {
        // 获取sprit子节点的Animation组件
        const spriteNode = this.node.getChildByName('Sprite')
        
        this.anim = spriteNode.getComponent(Animation)
        this.playIdle()
    }

    // 播放待机动画
    public playIdle(){
        if (this.currentState == 'idle') return
        if (this.currentState == 'attack') return
        this.currentState = 'idle'
        this.anim.play('idle')
    }

    // 播放移动动画
    public playMove(){
        if (this.currentState == 'move') return
        if (this.currentState == 'attack') return

        this.currentState = 'move'
        this.anim.play('move')
    }

    // 播放攻击动画
    public playAttack(){
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
        if (this.currentState == 'die') return
        this.currentState = 'die'
        this.anim.play('die')
    }

    update(deltaTime: number) {
        
    }
}


