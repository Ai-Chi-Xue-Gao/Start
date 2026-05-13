import { _decorator, Component, Node , Animation} from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Explosion')
export class Explosion extends Component {
    start() {
        const anim = this.getComponent(Animation)
        if(anim){
            // 播放动画，并监听结束事件
            anim.play('explosion_clip')
            anim.once(Animation.EventType.FINISHED, () => {
                this.node.destroy()
            })
        }else{
            // 如果没有动画组件，延迟销毁
            this.scheduleOnce(() => this.node.destroy(), 0.5)
        }
    }

    update(deltaTime: number) {
        
    }
}


