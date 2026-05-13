import { _decorator, Component, Node, ResolutionPolicy, screen, view, View,  } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ScreenManager')
export class ScreenManager extends Component {
    start() {
        // 强制设为横屏
        this.setLandscape();
    }

    private setLandscape(){
        // 设置屏幕方向为横屏
        view.setDesignResolutionSize(1280,720,ResolutionPolicy.SHOW_ALL)

        const framSize = screen.windowSize
        console.log('已经切换横屏')
    }

    update(deltaTime: number) {
        
    }
}


