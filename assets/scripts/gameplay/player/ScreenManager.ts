import { _decorator, Node, ResolutionPolicy, screen, view } from 'cc';
import { BaseComponent } from '../../core/BaseComponent';
const { ccclass, property } = _decorator;

@ccclass('ScreenManager')
export class ScreenManager extends BaseComponent {
    start() {
        // 强制设为横屏
        this.setLandscape();
    }

    private setLandscape(){
        // 设置屏幕方向为横屏
        view.setDesignResolutionSize(1280,720,ResolutionPolicy.SHOW_ALL)

        const framSize = screen.windowSize
    }
}


